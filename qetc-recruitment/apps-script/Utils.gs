/** Shared helpers: sheets, text, hashing, HTTP with retry, logging. */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('No spreadsheet found. Run setup() from the script editor first.');
  return active;
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet "' + name + '". Run setup() again.');
  return sh;
}

/** Reads a sheet into [{_row, Header: value, ...}] */
function readObjects_(name) {
  const sh = sheet_(name);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const o = { _row: r + 1 };
    headers.forEach((h, c) => { if (h) o[h] = values[r][c]; });
    out.push(o);
  }
  return out;
}

function headerMap_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { if (h) map[h] = i + 1; });
  return { headers, map };
}

/** Appends an object as a row, matching keys to header names. */
function appendObject_(name, obj) {
  const sh = sheet_(name);
  const { headers } = headerMap_(sh);
  const row = headers.map(h => (h in obj ? cell_(obj[h]) : ''));
  sh.appendRow(row);
  return sh.getLastRow();
}

/** Updates selected columns of one row. */
function updateRow_(name, rowNumber, patch) {
  const sh = sheet_(name);
  const { map } = headerMap_(sh);
  Object.keys(patch).forEach(k => {
    if (!map[k]) throw new Error('Unknown column "' + k + '" in ' + name);
    sh.getRange(rowNumber, map[k]).setValue(cell_(patch[k]));
  });
}

/** Prevents spreadsheet formula injection from untrusted text and trims size. */
function cell_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return v;
  let s = String(v).replace(/\u0000/g, '').trim();
  if (s.length > 2000) s = s.slice(0, 1997) + '...';
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function clean_(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 300);
}

function normEmail_(e) {
  e = clean_(e, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : '';
}

function normPhone_(p) {
  const digits = String(p || '').replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}

function hash_(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, 16);
}

function tz_() {
  try { return Session.getScriptTimeZone() || 'Etc/UTC'; } catch (e) { return 'Etc/UTC'; }
}

function fmtDate_(d, pattern) {
  return Utilities.formatDate(d || new Date(), tz_(), pattern || 'yyyy-MM-dd HH:mm');
}

function newRef_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'QM-' + Utilities.formatDate(new Date(), 'Etc/UTC', 'yyMMdd') + '-' + s;
}

function notifyEmail_() {
  const fromProps = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  return CONFIG.NOTIFY_EMAIL || fromProps || Session.getEffectiveUser().getEmail();
}

function scoreBand_(score) {
  for (const b of CONFIG.SCORE_BANDS) if (score >= b.min) return b.label;
  return 'Low potential';
}

function escapeHtml_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP GET with retries. Retries on network errors, 429 and 5xx with exponential backoff.
 * Returns {code, text, headers}. Never throws for HTTP status codes; throws after final network failure.
 */
function fetchWithRetry_(url, options, maxAttempts) {
  const opts = Object.assign({ muteHttpExceptions: true, followRedirects: true }, options || {});
  opts.headers = Object.assign({ 'User-Agent': 'QETC-Malaysia-StudentEnquiryBot/1.0 (education outreach research; contact via website)' }, opts.headers || {});
  const attempts = maxAttempts || 3;
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = UrlFetchApp.fetch(url, opts);
      const code = res.getResponseCode();
      if ((code === 429 || code >= 500) && i < attempts - 1) {
        const hdrs = res.getHeaders() || {};
        const ra = parseInt(hdrs['Retry-After'] || hdrs['retry-after'] || '0', 10);
        Utilities.sleep(Math.min(ra > 0 ? ra * 1000 : 1000 * Math.pow(2, i + 1), 20000));
        continue;
      }
      return { code, text: res.getContentText(), headers: res.getHeaders() || {} };
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) Utilities.sleep(1000 * Math.pow(2, i + 1));
    }
  }
  throw new Error('Network failure for ' + url.split('?')[0] + ': ' + (lastErr && lastErr.message));
}

function log_(job, status, startedMs, checked, created, message) {
  try {
    const dur = startedMs ? Math.round((Date.now() - startedMs) / 100) / 10 : '';
    appendObject_(CONFIG.SHEETS.LOG, {
      'Time': new Date(), 'Job': job, 'Status': status, 'Duration (s)': dur,
      'Checked': checked || 0, 'New': created || 0, 'Message': clean_(message, 1500)
    });
    trimLog_();
  } catch (e) {
    console.error('log_ failed: ' + e.message);
  }
}

/** Keeps the log sheet from growing forever (Sheets has a 10M cell limit). */
function trimLog_() {
  const sh = sheet_(CONFIG.SHEETS.LOG);
  const max = 3000;
  const last = sh.getLastRow();
  if (last > max + 200) sh.deleteRows(2, last - max);
}
