'use strict';
// End-to-end: real Chromium loads the real website; its API calls are routed into the
// real Apps Script backend code (running against the in-memory Sheets mock).
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { createEnv } = require('./gas-mock');

const ROOT = path.join(__dirname, '..', 'website');
const API = 'https://script.google.com/macros/s/TEST/exec';
const SHOTS = process.env.SHOTS_DIR || '';

function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'text/plain' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function wire(page, env, cfg) {
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/assets/config.js', async r => {
    const src = fs.readFileSync(path.join(ROOT, 'assets', 'config.js'), 'utf8');
    await r.fulfill({ status: 200, contentType: 'application/javascript', body: src + '\nObject.assign(window.SITE_CONFIG,' + JSON.stringify(cfg) + ');' });
  });
  await page.route(API, async r => {
    const req = r.request();
    assert.equal(req.method(), 'POST');
    assert.match(req.headers()['content-type'], /text\/plain/, 'simple request avoids CORS preflight');
    env.ctx.__body = req.postData();
    const out = env.run('doPost({postData:{contents:__body}}).getContent()');
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: out });
  });
}

let srv, browser, base;
test.before(async () => { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port; browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.close(); });

test('enquiry form submits to backend, creates CRM row and shows reference', async () => {
  const env = createEnv(); env.run('setup()');
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await wire(page, env, { API_URL: API, WHATSAPP_NUMBER: '60123456789' });
  await page.goto(base + '/index.html');
  await page.waitForTimeout(3100); // human-like time on page (anti-bot rule is 3s)
  await page.fill('#f-name', 'Amina Test');
  await page.fill('#f-country', 'Kenya');
  await page.selectOption('#f-level', "Bachelor's");
  await page.fill('#f-email', 'amina.e2e@example.com');
  await page.fill('#f-qual', 'KCSE');
  await page.fill('#f-course', 'Business Administration');
  await page.fill('#f-intake', 'September ' + (new Date().getFullYear() + 1));
  await page.fill('#f-budget', 'USD 6,000');
  await page.check('input[name=accommodation]');
  await page.check('input[name=pickup]');
  // Submitting without consent is blocked on the page.
  await page.click('#enquiry-form button[type=submit]');
  await assert.doesNotReject(page.waitForSelector('#form-msg.err'));
  assert.match(await page.textContent('#form-msg'), /consent/);
  await page.check('input[name=consent]');
  await page.click('#enquiry-form button[type=submit]');
  await page.waitForSelector('#form-msg.ok');
  const text = await page.textContent('#form-msg');
  assert.match(text, /reference is QM-\d{6}-[A-Z2-9]{5}/);
  const rows = env.rows('Students');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Student Name'], 'Amina Test');
  assert.equal(rows[0]['Needs Accommodation'], 'Yes');
  assert.equal(rows[0]['Needs Admission/Visa Guidance'], '');
  assert.equal(rows[0]['Discovery Source'], 'Website form');
  assert.ok(env.mails.some(m => /NEW QUALIFIED STUDENT/.test(m.body)));
  assert.equal(await page.getAttribute('.fab-wa', 'href'), 'https://wa.me/60123456789?text=Hello%20Ismail%2C%20I%20would%20like%20to%20study%20in%20Malaysia.');
  assert.deepEqual(errors, []);
  await page.close();
});

test('chat assistant runs the full conversation and submits after consent', async () => {
  const env = createEnv(); env.run('setup()');
  const page = await browser.newPage();
  await wire(page, env, { API_URL: API });
  await page.goto(base + '/index.html');
  await page.click('.chat-launch');
  await page.waitForSelector('.msg.bot');
  assert.match(await page.textContent('#chat-log'), /I'm the virtual assistant supporting Ismail Hassan/);
  const say = async t => { await page.fill('#chat-input', t); await page.press('#chat-input', 'Enter'); await page.waitForTimeout(150); };
  await say('Omar Test');
  await say('Somalia');
  await say('Is my visa guaranteed?');
  await page.waitForFunction(() => /nobody can guarantee/.test(document.querySelector('#chat-log').textContent));
  await say('High school / secondary');
  await page.click('#chat-quick button:has-text("Bachelor\'s")');
  await page.waitForTimeout(150);
  await say('Computer Science');
  await say('Next year');
  await say('skip');
  await say('yes'); await say('yes'); await say('yes');
  await say('+252 61 234 5678');
  await page.waitForSelector('#chat-quick button:has-text("Yes, I agree")');
  await page.waitForTimeout(3000);
  await page.click('#chat-quick button:has-text("Yes, I agree")');
  await page.waitForFunction(() => /Your reference is QM-/.test(document.querySelector('#chat-log').textContent), null, { timeout: 5000 });
  const [s] = env.rows('Students');
  assert.equal(s['Student Name'], 'Omar Test');
  assert.equal(s['Country'], 'Somalia');
  assert.equal(s['Study Level'], "Bachelor's");
  assert.equal(s['WhatsApp / Phone'], '+252612345678');
  assert.equal(s['Discovery Source'], 'Website chat assistant');
  assert.match(s['Student Message'], /visa guaranteed/);
  await page.close();
});

test('without API_URL the site says so honestly instead of pretending', async () => {
  const page = await browser.newPage();
  await wire(page, createEnv(), { API_URL: '', WHATSAPP_NUMBER: '', CONTACT_EMAIL: 'hello@example.com' });
  await page.goto(base + '/index.html');
  await page.fill('#f-name', 'X'); await page.fill('#f-country', 'Ghana'); await page.fill('#f-email', 'x@example.com'); await page.check('input[name=consent]');
  await page.click('#enquiry-form button[type=submit]');
  await page.waitForSelector('#form-msg.err');
  assert.match(await page.textContent('#form-msg'), /not connected yet.*hello@example\.com/);
  // Packages are NOT shown with prices until verified.
  assert.doesNotMatch(await page.textContent('#packages'), /USD 299|USD 499/);
  await page.close();
});

test('privacy page deletion form deletes the record', async () => {
  const env = createEnv(); env.run('setup()');
  env.ctx.__b = JSON.stringify({ action: 'enquiry', elapsedMs: 9999, data: { name: 'Del Test', country: 'Nepal', email: 'del@example.com', consent: true } });
  const ref = JSON.parse(env.run('doPost({postData:{contents:__b}}).getContent()')).ref;
  const page = await browser.newPage();
  await wire(page, env, { API_URL: API });
  await page.goto(base + '/privacy.html');
  await page.fill('#d-ref', ref); await page.fill('#d-email', 'del@example.com');
  await page.click('#delete-form button');
  await page.waitForSelector('#delete-msg.ok');
  assert.equal(env.rows('Students').length, 0);
  await page.close();
});

test('mobile layout: no horizontal scroll, menu works', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await wire(page, createEnv(), { API_URL: API, WHATSAPP_NUMBER: '60123456789' });
  await page.goto(base + '/index.html');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, 'horizontal overflow ' + overflow + 'px');
  await page.click('.menu-btn');
  assert.ok(await page.isVisible('#nav a[href="#faq"]'));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'mobile.png'), fullPage: false });
  await ctx.close();
  if (SHOTS) {
    const d = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
    await wire(d, createEnv(), { API_URL: API, WHATSAPP_NUMBER: '60123456789' });
    await d.goto(base + '/index.html');
    await d.screenshot({ path: path.join(SHOTS, 'desktop.png') });
    await d.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
    await d.close();
  }
});
