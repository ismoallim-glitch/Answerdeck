// In-memory mock of the Google Apps Script services used by the backend.
// Lets us run the real .gs code under Node and test the whole flow end-to-end.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

// Google Sheets stores a leading apostrophe as "force text" and hides it when read back.
const sheetsValue = v => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);

function chainable(target) {
  // Returns target, but any unknown method becomes a chainable no-op (formatting calls etc.).
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'symbol') return undefined;
      return () => chainable(t);
    }
  });
}

class Sheet {
  constructor(name, ss) { this.name = name; this.rows = []; this.ss = ss; this.validations = []; this.frozen = 0; this.maxRows = 1000; this.maxCols = 26; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(after, n) { this.maxCols += n; }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.rows.length - 1; r >= 0; r--) if (this.rows[r] && this.rows[r].some(v => v !== '' && v !== undefined && v !== null)) return r + 1;
    return 0;
  }
  getLastColumn() { return this.rows.reduce((m, r) => { let c = 0; (r || []).forEach((v, i) => { if (v !== '' && v != null) c = i + 1; }); return Math.max(m, c); }, 0); }
  ensure(r, c) { while (this.rows.length < r) this.rows.push([]); for (let i = 0; i < r; i++) while (this.rows[i].length < c) this.rows[i].push(''); }
  getRange(row, col, nr, nc) {
    nr = nr || 1; nc = nc || 1;
    if (row < 1 || col < 1 || row + nr - 1 > this.maxRows || col + nc - 1 > this.maxCols) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet (' + this.name + ': ' + row + ',' + col + ' ' + nr + 'x' + nc + ' vs ' + this.maxRows + 'x' + this.maxCols + ')');
    }
    return chainable(new Range(this, row, col, nr, nc));
  }
  appendRow(values) { const r = this.getLastRow() + 1; this.maxRows = Math.max(this.maxRows, r); this.maxCols = Math.max(this.maxCols, values.length); this.ensure(r, values.length); this.rows[r - 1] = values.map(sheetsValue); while (this.rows[r - 1].length < this.getLastColumn()) this.rows[r - 1].push(''); return this; }
  deleteRow(r) { this.rows.splice(r - 1, 1); this.maxRows--; }
  deleteRows(r, n) { this.rows.splice(r - 1, n); this.maxRows -= n; }
  clearContents() { this.rows = []; return this; }
  setFrozenRows(n) { this.frozen = n; }
  getActiveRange() { return this.ss._activeRange; }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
}

class Range {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) { const row = []; for (let c = 0; c < this.nc; c++) { const v = (this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c]; row.push(v === undefined ? '' : v); } out.push(row); }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error(`setValues dimension mismatch: range ${this.nr}x${this.nc} vs data ${vals.length}x${vals[0] && vals[0].length}`);
    this.sheet.ensure(this.row - 1 + this.nr, this.col - 1 + this.nc);
    vals.forEach((r, i) => r.forEach((v, j) => { this.sheet.rows[this.row - 1 + i][this.col - 1 + j] = sheetsValue(v); }));
    return chainable(this);
  }
  setValue(v) { return this.setValues([[v]]); }
  getValue() { return this.getValues()[0][0]; }
  getRow() { return this.row; }
  getColumn() { return this.col; }
  getSheet() { return this.sheet; }
  setDataValidation(rule) { this.sheet.validations.push({ row: this.row, col: this.col, rule }); return chainable(this); }
}

class Spreadsheet {
  constructor() { this.sheets = {}; this.id = 'SS_TEST'; this._activeRange = null; }
  getId() { return this.id; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { this.sheets[n] = new Sheet(n, this); return this.sheets[n]; }
  getSheets() { return Object.values(this.sheets); }
}

function createEnv(opts = {}) {
  const ss = new Spreadsheet();
  const props = {};
  const cache = {};
  const mails = [];
  const triggers = [];
  const fetchLog = [];
  const consoleLogs = [];
  let fetchHandler = opts.fetchHandler || (() => ({ code: 404, body: 'not mocked' }));
  let mailQuota = 100;

  const builder = () => {
    const b = { list: null, requireValueInList(l) { b.list = l; return b; }, setAllowInvalid() { return b; }, build() { return { list: b.list }; } };
    return b;
  };
  const triggerBuilder = (fn) => {
    const t = { fn, type: null };
    const api = chainable({
      timeBased() { t.type = 'time'; return api; },
      everyHours(h) { if (![1, 2, 4, 6, 8, 12].includes(h)) throw new Error('everyHours must be 1,2,4,6,8,12 — got ' + h); t.hours = h; return api; },
      everyDays(d) { t.days = d; return api; },
      atHour(h) { t.atHour = h; return api; },
      forSpreadsheet() { t.type = 'spreadsheet'; return api; },
      onEdit() { t.event = 'edit'; return api; },
      create() { const tr = { getHandlerFunction: () => fn, spec: t }; triggers.push(tr); return tr; }
    });
    return api;
  };

  const ctx = {
    console: { log: (...a) => consoleLogs.push(a.join(' ')), error: (...a) => consoleLogs.push('ERR ' + a.join(' ')), warn: (...a) => consoleLogs.push('WARN ' + a.join(' ')) },
    Date, Math, JSON, String, Number, Object, Array, RegExp, Error, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, Boolean, Promise,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
      getActiveSheet: () => ss._activeSheet,
      newDataValidation: builder,
      getUi: () => { throw new Error('No UI in tests'); }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    MailApp: {
      sendEmail: (o) => { if (mailQuota <= 0) throw new Error('quota'); mailQuota--; mails.push(o); },
      getRemainingDailyQuota: () => mailQuota
    },
    Session: { getScriptTimeZone: () => 'Asia/Kuala_Lumpur', getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(String(s), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)),
      formatDate: (d, tz, pattern) => {
        const p = n => String(n).padStart(2, '0');
        const dt = new Date(d);
        const s = { yyyy: dt.getUTCFullYear(), yy: String(dt.getUTCFullYear()).slice(2), MM: p(dt.getUTCMonth() + 1), dd: p(dt.getUTCDate()), HH: p(dt.getUTCHours()), mm: p(dt.getUTCMinutes()) };
        return pattern.replace(/yyyy|yy|MM|dd|HH|mm/g, m => s[m]).replace(/EEE|MMM|\bd\b/g, m => m);
      },
      sleep: () => {},
      getUuid: () => crypto.randomUUID(),
      base64Encode: s => Buffer.from(String(s)).toString('base64')
    },
    UrlFetchApp: {
      fetch: (url, o) => {
        fetchLog.push({ url, o });
        const r = fetchHandler(url, o);
        if (r instanceof Error) throw r;
        return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)), getHeaders: () => r.headers || {} };
      }
    },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: t => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }, newTrigger: triggerBuilder },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ _text: s, setMimeType() { return this; }, getContent() { return this._text; } }) },
    HtmlService: {
      createHtmlOutput: h => ({ _html: h, getContent() { return this._html; } }),
      createTemplateFromFile: name => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'apps-script', name + '.html'), 'utf8');
        const t = { evaluate() { const html = src.replace(/<\?!= data \?>/g, t.data); return chainable({ getContent: () => html }); } };
        return t;
      }
    }
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'apps-script');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort();
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  return {
    ctx, ss, props, cache, mails, triggers, fetchLog, consoleLogs, run,
    setFetch(fn) { fetchHandler = fn; },
    setMailQuota(n) { mailQuota = n; },
    rows(name) { return run(`readObjects_(${JSON.stringify(name)})`); }
  };
}

module.exports = { createEnv };
