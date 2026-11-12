'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEnv } = require('./gas-mock');
const fx = require('./fixtures/sources');

function setupEnv(fetchHandler) {
  const env = createEnv({ fetchHandler });
  env.run('setup()');
  return env;
}

function post(env, body) {
  env.ctx.__body = JSON.stringify(body);
  return JSON.parse(env.run('doPost({postData:{contents:__body}}).getContent()'));
}

const fullEnquiry = {
  name: 'Amina Test', country: 'Kenya', email: 'amina.test@example.com', phone: '+254 700 000 001', preferredContact: 'WhatsApp',
  qualification: 'KCSE (secondary school certificate)', level: "Bachelor's", course: 'Business Administration',
  intake: 'September ' + (new Date().getFullYear() + 1), budget: 'USD 6,000 per year', accommodation: 'Yes', pickup: 'Yes', visaHelp: 'Yes',
  message: 'I would like help choosing a university.', consent: true, source: 'Website form'
};

test('setup creates every sheet, default sources and 4 triggers', () => {
  const env = setupEnv();
  for (const n of ['Students', 'Discovered Opportunities', 'Discovery Sources', 'Commission (Private)', 'Dashboard', 'System Log', 'System Status', 'Deletion Requests']) {
    assert.ok(env.ss.getSheetByName(n), 'missing sheet ' + n);
  }
  assert.ok(env.rows('Discovery Sources').length >= 10);
  assert.deepEqual(env.triggers.map(t => t.getHandlerFunction()).sort(), ['healthCheck', 'onStudentSheetEdit', 'runDiscovery', 'sendDailyDigest']);
  assert.ok(env.props.ADMIN_KEY && env.props.ADMIN_KEY.length >= 32);
  env.run('setup()'); // idempotent
  assert.equal(env.triggers.length, 4);
});

test('full enquiry → CRM row, score 100, READY TO APPLY, qualified email + student confirmation', () => {
  const env = setupEnv();
  const res = post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 60000 });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.match(res.ref, /^QM-\d{6}-[A-Z2-9]{5}$/);
  const [s] = env.rows('Students');
  assert.equal(s['Student Name'], 'Amina Test');
  assert.equal(s['Country'], 'Kenya');
  assert.equal(s['Lead Score'], 100);
  assert.equal(s['Score Band'], 'Very high potential');
  assert.equal(s['Status'], 'READY TO APPLY');
  assert.equal(s['Consent Status'], 'GIVEN');
  assert.match(s['Score Explanation'], /contact details provided/);
  const toOwner = env.mails.find(m => m.to === 'owner@example.com');
  assert.ok(toOwner, 'owner notified');
  assert.match(toOwner.body, /^NEW QUALIFIED STUDENT/);
  assert.match(toOwner.body, /Name: Amina Test\nCountry: Kenya\nInterested in: Bachelor's\nPreferred course: Business Administration/);
  assert.match(toOwner.body, /Lead score: 100\/100/);
  assert.match(toOwner.body, /Recommended next action: Contact student personally/);
  assert.match(toOwner.body, /https:\/\/wa\.me\/254700000001/);
  const toStudent = env.mails.find(m => m.to === 'amina.test@example.com');
  assert.ok(toStudent, 'student confirmation sent');
  assert.match(toStudent.body, /virtual assistant supporting Ismail Hassan/);
  assert.match(toStudent.body, /never guaranteed/);
  assert.doesNotMatch(toStudent.body, /500|commission/i, 'commission never shown to students');
});

test('partial enquiry gets a lower, explained score and missing fields are NOT invented', () => {
  const env = setupEnv();
  const res = post(env, { action: 'enquiry', data: { name: 'Bilal Test', country: 'pakistan', email: 'bilal@example.com', consent: true }, elapsedMs: 9000 });
  assert.equal(res.ok, true);
  const [s] = env.rows('Students');
  assert.equal(s['Country'], 'Pakistan');
  assert.equal(s['Course'], '');
  assert.equal(s['Budget'], '');
  assert.equal(s['Lead Score'], 40);
  assert.equal(s['Score Band'], 'Moderate potential');
  assert.equal(s['Status'], 'ENQUIRY SUBMITTED');
  assert.match(s['Score Explanation'], /course not provided/);
  assert.match(s['Score Explanation'], /budget not provided/);
  const owner = env.mails.find(m => m.to === 'owner@example.com');
  assert.match(owner.subject, /^New student enquiry/);
});

test('validation: consent and contact are required; nothing stored without consent', () => {
  const env = setupEnv();
  const res = post(env, { action: 'enquiry', data: { name: 'X', country: 'Ghana', email: 'x@example.com' }, elapsedMs: 9000 });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => /consent/i.test(e)));
  const res2 = post(env, { action: 'enquiry', data: { name: 'X', country: 'Ghana', consent: true }, elapsedMs: 9000 });
  assert.ok(res2.errors.some(e => /email address or WhatsApp/i.test(e)));
  assert.equal(env.rows('Students').length, 0);
});

test('spam protection: honeypot silently dropped, too-fast refused, rate limit enforced', () => {
  const env = setupEnv();
  assert.equal(post(env, { action: 'enquiry', data: fullEnquiry, hp: 'bot', elapsedMs: 9000 }).ok, true);
  assert.equal(post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 500 }).ok, false);
  assert.equal(env.rows('Students').length, 0);
  env.run('CONFIG.ENQUIRY_RATE_LIMIT_PER_10_MIN = 2');
  post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  const third = post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  assert.equal(third.ok, false);
  assert.equal(env.rows('Students').length, 2);
});

test('duplicates are detected by email, phone, or name+country', () => {
  const env = setupEnv();
  const a = post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { email: 'AMINA.TEST@example.com', phone: '' }), elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { email: 'other@example.com', phone: '254700000001' }), elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { email: 'third@example.com', phone: '' }), elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { name: 'Different Person', email: 'diff@example.com', phone: '' }), elapsedMs: 9000 });
  const rows = env.rows('Students');
  assert.match(rows[1]['Duplicate Of'], new RegExp(a.ref + ' \\(same email\\)'));
  assert.match(rows[2]['Duplicate Of'], /same phone/);
  assert.match(rows[3]['Duplicate Of'], /same name and country/);
  assert.equal(rows[4]['Duplicate Of'], '');
});

test('sensitive data and formula injection are neutralised', () => {
  const env = setupEnv();
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { name: '=HYPERLINK("http://evil")', message: 'my passport number: A1234567 and card 4111 1111 1111 1111' }), elapsedMs: 9000 });
  const [s] = env.rows('Students');
  assert.ok(s['Student Name'].startsWith('='), 'stored as text');
  env.ctx.__n = '=HYPERLINK("x")';
  assert.equal(env.run('cell_(__n)'), "'=HYPERLINK(\"x\")", 'apostrophe forces Sheets to treat it as text, not a formula');
  assert.doesNotMatch(s['Student Message'], /A1234567|4111 1111/);
});

test('data deletion requires matching reference + email and removes all records', () => {
  const env = setupEnv();
  const a = post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { name: 'Other', email: 'keep@example.com', phone: '' }), elapsedMs: 9000 });
  let r = post(env, { action: 'delete_request', ref: a.ref, email: 'wrong@example.com' });
  assert.equal(r.deleted, 0);
  assert.equal(env.rows('Students').length, 2);
  r = post(env, { action: 'delete_request', ref: a.ref.toLowerCase(), email: 'Amina.Test@example.com' });
  assert.equal(r.deleted, 1);
  const left = env.rows('Students');
  assert.equal(left.length, 1);
  assert.equal(left[0]['Email'], 'keep@example.com');
  const del = env.rows('Deletion Requests');
  assert.equal(del.length, 2);
  assert.doesNotMatch(JSON.stringify(del), /amina/i, 'deletion log must not keep the email');
});

test('post classifier: genuine seekers score high, adverts and off-topic score low', () => {
  const env = setupEnv();
  env.ctx.__p = { title: 'Is Malaysia a good option for an affordable bachelor in computer science?', body: 'I just finished high school in Kenya and want to study abroad. Any advice?', created: new Date() };
  const hi = env.run('classifyPost_(__p)');
  assert.ok(hi.score >= 80, 'score ' + hi.score);
  assert.equal(hi.country, 'Kenya');
  assert.equal(hi.level, "Bachelor's");
  assert.equal(hi.course, 'Computer Science');
  assert.equal(hi.malaysia, true);
  assert.equal(hi.invites, true);
  env.ctx.__p = { title: 'ADMISSIONS OPEN! Study in Malaysia, 100% visa guaranteed', body: 'We offer admission. Contact us. Apply now!', created: new Date() };
  assert.ok(env.run('classifyPost_(__p)').score < 20);
  env.ctx.__p = { title: 'How to respond to referee report', body: 'my advisor and the journal', created: new Date() };
  assert.ok(env.run('classifyPost_(__p)').score < 20);
});

test('intake parsing', () => {
  const env = setupEnv();
  const y = new Date().getFullYear();
  assert.equal(env.run('parseIntakeMonths_("asap")'), 3);
  assert.equal(env.run('parseIntakeMonths_("not sure")'), null);
  assert.equal(env.run(`parseIntakeMonths_("January ${y + 3}")`) > 12, true);
});

function discoveryFetch(url) {
  if (url.includes('api.stackexchange.com')) return { code: 200, body: fx.stackExchangeResponse() };
  if (url.includes('/api/v1/access_token')) return { code: 200, body: { access_token: 'tok', expires_in: 3600 } };
  if (url.includes('oauth.reddit.com')) return { code: 200, body: fx.redditApiJson() };
  if (url.includes('alerts/feeds/1')) return { code: 200, body: fx.redditAtom() };
  if (url.includes('alerts/feeds/2')) return { code: 200, body: fx.googleAlertsAtom() };
  return { code: 404, body: '' };
}

/** Enables Google Alerts feeds (and optionally Reddit with approved API keys) like Ismail would in the sheet. */
function enableSources(env, { reddit = false } = {}) {
  const rss = env.rows('Discovery Sources').filter(s => s['Type'] === 'rss');
  env.ctx.__r1 = rss[0]._row; env.ctx.__r2 = rss[1]._row;
  env.run(`updateRow_('Discovery Sources', __r1, {'Enabled':'TRUE','Target':'https://www.google.com/alerts/feeds/1/111'})`);
  env.run(`updateRow_('Discovery Sources', __r2, {'Enabled':'TRUE','Target':'https://www.google.com/alerts/feeds/2/222'})`);
  if (reddit) {
    env.props.REDDIT_CLIENT_ID = 'id'; env.props.REDDIT_CLIENT_SECRET = 'secret';
    env.rows('Discovery Sources').filter(s => s['Type'] === 'reddit_search').forEach(s => { env.ctx.__rr = s._row; env.run(`updateRow_('Discovery Sources', __rr, {'Enabled':'TRUE'})`); });
  }
}

test('Reddit is never scraped: disabled by default, and refuses to run without approved API keys', () => {
  const env = setupEnv(discoveryFetch);
  assert.ok(env.rows('Discovery Sources').filter(s => s['Type'] === 'reddit_search').every(s => s['Enabled'] === 'FALSE'));
  env.run('runDiscovery()');
  assert.equal(env.fetchLog.filter(f => f.url.includes('reddit.com')).length, 0);
  assert.throws(() => env.run("fetchReddit_('studyAbroad','malaysia')"), /approved REDDIT_CLIENT_ID/);
});

test('discovery: fetches, scores, filters, de-duplicates, strips contact details, alerts, logs', () => {
  const env = setupEnv(discoveryFetch);
  enableSources(env, { reddit: true });

  const r1 = env.run('runDiscovery()');
  assert.equal(r1.status, 'OK', JSON.stringify(r1.errors));
  const opps = env.rows('Discovered Opportunities');
  const links = opps.map(o => o['Link']);
  // Each unique post saved once even though several sources return the same feed.
  assert.equal(new Set(links).size, links.length, 'no duplicates');
  assert.ok(links.includes('https://academia.stackexchange.com/questions/1001/is-malaysia-a-good-option'));
  assert.ok(links.includes('https://www.reddit.com/r/studyAbroad/comments/aa1/post_aa1/'));
  assert.ok(links.includes('https://forum.example.org/t/apply-malaysia-from-somalia/55'), 'google redirect unwrapped');
  assert.ok(links.includes('https://www.reddit.com/r/studyAbroad/comments/rr1/x/'), 'official Reddit API result saved');
  assert.ok(!links.some(l => l.includes('rr2')), 'off-topic Reddit API post rejected');
  assert.equal(env.fetchLog.filter(f => f.url.includes('access_token')).length, 1, 'OAuth token cached');
  assert.ok(!links.some(l => l.includes('aa2')), 'advert rejected');
  assert.ok(!links.some(l => l.includes('aa3')), 'off-topic rejected');
  assert.ok(!links.some(l => l.includes('aa5')), 'old post rejected');
  assert.ok(!links.some(l => l.includes('1002')), 'academic career post rejected');
  const aa1 = opps.find(o => o['Link'].includes('aa1'));
  assert.doesNotMatch(aa1['Excerpt'], /test@example\.com|someone_aa1/);
  assert.match(aa1['Suggested Public Reply (review before posting)'], /Disclosure: I am a student recruitment consultant/);
  assert.equal(aa1['Review Status'], 'NEW');
  const somali = opps.find(o => o['Link'].includes('somalia'));
  assert.equal(somali['Detected Country'], 'Somalia');

  const alerts = env.mails.filter(m => /Promising student post/.test(m.subject));
  assert.ok(alerts.length >= 1 && alerts.length <= 3);
  assert.ok(env.props.LAST_DISCOVERY_SUCCESS);
  assert.equal(env.props.SE_QUOTA_REMAINING, '287');
  const log = env.rows('System Log').filter(l => l['Job'] === 'discovery');
  assert.equal(log[0]['Status'], 'OK');

  // Second run: same data → nothing new.
  const before = env.rows('Discovered Opportunities').length;
  const r2 = env.run('runDiscovery()');
  assert.equal(r2.created, 0);
  assert.equal(env.rows('Discovered Opportunities').length, before);
});

test('discovery: failing source is retried, then paused after 3 failures; total failure alerts once', () => {
  let calls = 0;
  const env = setupEnv(url => { calls++; return url.includes('reddit') ? { code: 429, body: 'Too Many Requests' } : { code: 200, body: fx.stackExchangeResponse() }; });
  enableSources(env, { reddit: true });
  const r = env.run('runDiscovery()');
  assert.equal(r.status, 'PARTIAL');
  assert.ok(calls > 10);
  env.run('runDiscovery()'); env.run('runDiscovery()');
  const reddit = env.rows('Discovery Sources').filter(s => s['Type'] === 'reddit_search');
  assert.ok(reddit.every(s => s['Paused Until'] instanceof Date || String(s['Paused Until']).length > 0), 'paused');
  const callsBefore = calls;
  env.run('runDiscovery()');
  const redditCallsAfter = env.fetchLog.slice(callsBefore).filter(f => f.url.includes('reddit')).length;
  assert.equal(redditCallsAfter, 0, 'paused sources are skipped');

  const env2 = setupEnv(() => new Error('DNS failure'));
  enableSources(env2);
  const r2 = env2.run('runDiscovery()');
  assert.equal(r2.status, 'FAILED');
  env2.run('runDiscovery()');
  assert.equal(env2.mails.filter(m => /problem/.test(m.subject)).length, 1, 'error email throttled');
  assert.match(env2.run('healthSnapshot_().status'), /FAILING/);
});

test('status change in sheet: READY TO APPLY alerts; ENROLLED opens commission row (not counted as received)', () => {
  const env = setupEnv();
  post(env, { action: 'enquiry', data: Object.assign({}, fullEnquiry, { budget: '' }), elapsedMs: 9000 });
  const s = env.rows('Students')[0];
  const statusCol = env.run("HEADERS.Students.indexOf('Status') + 1");
  const edit = (value) => {
    env.ss.getSheetByName('Students').getRange(s._row, statusCol).setValue(value);
    env.ctx.__e = { range: env.ss.getSheetByName('Students').getRange(s._row, statusCol), value };
    env.run('onStudentSheetEdit(__e)');
  };
  env.mails.length = 0;
  edit('READY TO APPLY');
  assert.match(env.mails[0].body, /NEW QUALIFIED STUDENT!/);
  assert.match(env.mails[0].body, /Status: Ready to apply/);
  edit('ENROLLED');
  const c = env.rows('Commission (Private)');
  assert.equal(c.length, 1);
  assert.equal(c[0]['Commission Amount (USD)'], 500);
  assert.equal(c[0]['Eligibility Confirmed by QETC'], 'NOT YET');
  let d = env.run('getDashboardData_()');
  assert.equal(d.kpis.enrolments, 1);
  assert.equal(d.kpis.commissionReceived, 0, 'not earned until confirmed + paid');
  assert.equal(d.kpis.potentialCommission, 500);
  edit('COMMISSION PENDING');
  assert.equal(env.rows('Commission (Private)').length, 1, 'no duplicate commission row');
  env.run(`updateRow_('Commission (Private)', 2, {'Eligibility Confirmed by QETC':'YES','Payment Status':'PAID'})`);
  d = env.run('getDashboardData_()');
  assert.equal(d.kpis.commissionReceived, 500);
});

test('dashboard: KPIs, conversion, breakdowns, sheet + private web page', () => {
  const env = setupEnv(discoveryFetch);
  enableSources(env);
  post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  post(env, { action: 'enquiry', data: { name: 'Bilal Test', country: 'Pakistan', email: 'bilal@example.com', consent: true, course: 'MBA' }, elapsedMs: 9000 });
  env.run('runDiscovery()');
  const d = env.run('getDashboardData_()');
  assert.equal(d.kpis.totalLeads, 2);
  assert.equal(d.kpis.newEnquiries, 2);
  assert.equal(d.kpis.readyToApply, 1);
  assert.equal(d.kpis.qualified, 1);
  assert.equal(d.conversion.enquiryToQualified, 50);
  assert.deepEqual(d.byCountry.map(x => x.key).sort(), ['Kenya', 'Pakistan']);
  assert.ok(d.byPlatform.some(x => x.key === 'Reddit'));
  assert.ok(d.kpis.opportunitiesTotal > 0);
  env.run('refreshDashboard()');
  const sheetText = JSON.stringify(env.ss.getSheetByName('Dashboard').rows);
  for (const label of ['TOTAL STUDENT LEADS', 'NEW ENQUIRIES', 'QUALIFIED STUDENTS', 'READY TO APPLY', 'APPLICATIONS SUBMITTED', 'SUCCESSFUL ENROLMENTS', 'POTENTIAL COMMISSION', 'COMMISSION RECEIVED', 'LEADS BY COUNTRY', 'LEADS BY PLATFORM', 'MOST POPULAR COURSES', 'FOLLOW-UP REMINDERS', 'RECENT ENQUIRIES']) {
    assert.ok(sheetText.includes(label), label);
  }
  // Web dashboard: denied without key, works with key.
  assert.match(env.run("doGet({parameter:{page:'dashboard', key:'wrong'}}).getContent()"), /Access denied/);
  const html = env.run(`doGet({parameter:{page:'dashboard', key:${JSON.stringify(env.props.ADMIN_KEY)}}}).getContent()`);
  assert.match(html, /Recruitment Dashboard/);
  assert.match(html, /"totalLeads":2/);
  assert.doesNotMatch(html, /<\/script><script>alert/);
  assert.equal(JSON.parse(env.run("doGet({parameter:{action:'health'}}).getContent()")).ok, true);
});

test('health check reports status and next run; daily digest summarises', () => {
  const env = setupEnv(discoveryFetch);
  enableSources(env);
  assert.match(env.run('healthSnapshot_().status'), /WAITING FOR FIRST RUN/);
  env.run('runDiscovery()');
  const h = env.run('healthCheck()');
  assert.equal(h.status, 'HEALTHY');
  assert.match(h.nextRun, /≈/);
  const status = JSON.stringify(env.ss.getSheetByName('System Status').rows);
  assert.match(status, /Last successful discovery run/);
  assert.match(status, /Next scheduled discovery run/);
  assert.match(status, /Total public posts discovered/);
  post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  env.mails.length = 0;
  env.run('sendDailyDigest()');
  assert.equal(env.mails.length, 1);
  assert.match(env.mails[0].body, /NEW ENQUIRIES \(24h\): 1/);
  assert.match(env.mails[0].body, /NEW PUBLIC POSTS FOUND/);
});

test('converting a discovered post creates a NEW LEAD without inventing personal details', () => {
  const env = setupEnv(discoveryFetch);
  enableSources(env);
  env.run('runDiscovery()');
  const o = env.rows('Discovered Opportunities')[0];
  env.ctx.__o = o;
  const ref = env.run('createLeadFromOpportunity_(__o)');
  const s = env.rows('Students').find(x => x['Ref'] === ref);
  assert.equal(s['Status'], 'NEW LEAD');
  assert.equal(s['Email'], '');
  assert.match(s['Student Name'], /name not collected/);
  assert.match(s['Consent Status'], /NOT GIVEN/);
  assert.equal(env.rows('Discovered Opportunities')[0]['Review Status'], 'CONVERTED');
});

test('mail quota exhaustion does not break enquiries', () => {
  const env = setupEnv();
  env.setMailQuota(0);
  const r = post(env, { action: 'enquiry', data: fullEnquiry, elapsedMs: 9000 });
  assert.equal(r.ok, true);
  assert.equal(env.rows('Students').length, 1);
});

test('the single-file bundle (dist/Code.gs) is up to date and complete', () => {
  const fs = require('fs'); const path = require('path'); const vm = require('vm');
  const dir = path.join(__dirname, '..');
  const bundle = fs.readFileSync(path.join(dir, 'dist', 'Code.gs'), 'utf8');
  for (const f of fs.readdirSync(path.join(dir, 'apps-script')).filter(f => f.endsWith('.gs'))) {
    assert.ok(bundle.includes(fs.readFileSync(path.join(dir, 'apps-script', f), 'utf8')), f + ' changed – run node scripts/build.js');
  }
  new vm.Script(bundle);
});
