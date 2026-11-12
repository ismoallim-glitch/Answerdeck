// GENERATED FILE – edit the files in apps-script/ and run `node scripts/build.js`.
// Paste this whole file into Code.gs in the Apps Script editor.

// ===================== Config.gs =====================
/**
 * ============================================================
 *  QETC MALAYSIA STUDENT RECRUITMENT SYSTEM — SETTINGS
 *  Ismail Hassan · International Student Recruitment Consultant
 * ============================================================
 *
 *  This is the ONLY file you normally need to edit.
 *  Secrets (API keys, admin key) are NOT stored here — they live in
 *  Project Settings → Script Properties (see docs/DEPLOY.md).
 */
const CONFIG = {
  CONSULTANT_NAME: 'Ismail Hassan',
  BUSINESS_TITLE: 'International Student Recruitment Consultant',
  PARTNER_LINE: 'QETC Malaysia Recruitment Partner',

  // Where alerts go. Leave '' to use the Google account that owns the script.
  NOTIFY_EMAIL: 'ismoallim@gmail.com',

  // Your public website address (used in emails and draft replies).
  WEBSITE_URL: '',

  // ---------- Lead scoring ----------
  SCORE_BANDS: [
    { min: 90, label: 'Very high potential' },
    { min: 70, label: 'High potential' },
    { min: 40, label: 'Moderate potential' },
    { min: 0, label: 'Low potential' }
  ],
  QUALIFIED_SCORE: 70,          // enquiries at/above this trigger "NEW QUALIFIED STUDENT!"
  OPPORTUNITY_MIN_SCORE: 45,    // discovered public posts below this are not saved
  OPPORTUNITY_ALERT_SCORE: 80,  // discovered posts at/above this are emailed immediately
  MAX_IMMEDIATE_ALERTS_PER_RUN: 3,
  MAX_POST_AGE_DAYS: 45,        // ignore public posts older than this

  // ---------- Private commission (never shown to students) ----------
  COMMISSION_PER_ENROLMENT_USD: 500,

  // ---------- Automation ----------
  DISCOVERY_EVERY_HOURS: 2,     // must be 1, 2, 4, 6, 8 or 12 (Apps Script rule)
  DIGEST_HOUR: 8,               // daily summary email hour (script time zone)
  MAX_RUN_MS: 4.5 * 60 * 1000,  // stop discovery safely before Apps Script's 6-minute limit
  ERROR_EMAIL_COOLDOWN_MIN: 180,
  SOURCE_BACKOFF_FAILURES: 3,   // after N consecutive failures a source pauses...
  SOURCE_BACKOFF_HOURS: 12,     // ...for this many hours
  ENQUIRY_RATE_LIMIT_PER_10_MIN: 30,

  // ---------- Markets ----------
  PRIORITY_COUNTRIES: [
    'Kenya', 'Somalia', 'Tanzania', 'Ethiopia', 'Uganda', 'Rwanda', 'Nigeria', 'Ghana', 'South Africa',
    'Egypt', 'Sudan', 'Djibouti', 'Algeria',
    'Bangladesh', 'Pakistan', 'India', 'Nepal', 'Sri Lanka', 'Indonesia',
    'Saudi Arabia', 'United Arab Emirates', 'Yemen', 'Oman', 'Lebanon', 'Jordan', 'Palestine',
    'United Kingdom', 'Germany', 'France', 'Switzerland', 'Austria',
    'United States', 'Canada'
  ],

  // ---------- CRM statuses (order matters for the funnel) ----------
  STATUSES: [
    'NEW LEAD', 'INTERESTED', 'ENQUIRY SUBMITTED', 'CONSENT RECEIVED', 'QUALIFIED', 'READY TO APPLY',
    'REFERRED TO QETC', 'APPLICATION SUBMITTED', 'ADMISSION OFFERED', 'ENROLLED',
    'COMMISSION PENDING', 'COMMISSION PAID', 'NOT INTERESTED'
  ],

  SHEETS: {
    STUDENTS: 'Students',
    OPPORTUNITIES: 'Discovered Opportunities',
    SOURCES: 'Discovery Sources',
    COMMISSION: 'Commission (Private)',
    DASHBOARD: 'Dashboard',
    LOG: 'System Log',
    STATUS: 'System Status',
    DELETIONS: 'Deletion Requests'
  }
};

/** Column layout of each sheet. Do not rename headers once data exists. */
const HEADERS = {
  Students: [
    'Ref', 'Created', 'Student Name', 'Country', 'Email', 'WhatsApp / Phone', 'Preferred Contact',
    'Highest Qualification', 'Study Level', 'Course', 'Preferred University', 'Budget', 'Intake',
    'Needs Accommodation', 'Needs Airport Pickup', 'Needs Admission/Visa Guidance',
    'Discovery Source', 'Source Link', 'Enquiry Date', 'Consent Status', 'Consent Time',
    'Lead Score', 'Score Band', 'Score Explanation', 'Status', 'Last Communication', 'Next Action',
    'Next Action Due', 'Duplicate Of', 'Student Message', 'Notes', 'Last Updated'
  ],
  'Discovered Opportunities': [
    'ID', 'Found', 'Platform', 'Community', 'Title', 'Excerpt', 'Link', 'Posted', 'Relevance Score',
    'Score Band', 'Why', 'Detected Country', 'Detected Level', 'Detected Course', 'Malaysia Mentioned',
    'Invites Recommendations', 'Suggested Public Reply (review before posting)', 'Review Status', 'Student Ref', 'Notes'
  ],
  'Discovery Sources': ['Enabled', 'Type', 'Target', 'Query', 'Notes', 'Last Run', 'Last Result', 'Consecutive Failures', 'Paused Until'],
  'Commission (Private)': [
    'Student Ref', 'Student Name', 'Enrolment Status', 'Commission Amount (USD)', 'Eligibility Confirmed by QETC',
    'Payment Status', 'Date Received', 'Notes', 'Created'
  ],
  'System Log': ['Time', 'Job', 'Status', 'Duration (s)', 'Checked', 'New', 'Message'],
  'Deletion Requests': ['Time', 'Ref', 'Email', 'Result']
};

/** Default discovery sources written by setup(). Edit them in the "Discovery Sources" sheet afterwards. */
const DEFAULT_SOURCES = [
  // 1) Google Alerts RSS feeds — the main source. Covers search-engine-indexed public pages (forums, Q&A sites,
  //    public pages). Create alerts at google.com/alerts, choose "Deliver to: RSS feed", paste the feed URL in "Target"
  //    and set Enabled to TRUE. See docs/DEPLOY.md step 7 for the exact phrases.
  ['FALSE', 'rss', 'PASTE_GOOGLE_ALERTS_RSS_URL_HERE', '', 'Google Alert: "study in Malaysia"'],
  ['FALSE', 'rss', 'PASTE_GOOGLE_ALERTS_RSS_URL_HERE', '', 'Google Alert: "universities in Malaysia" international students'],
  ['FALSE', 'rss', 'PASTE_GOOGLE_ALERTS_RSS_URL_HERE', '', 'Google Alert: "want to study abroad" affordable'],
  ['FALSE', 'rss', 'PASTE_GOOGLE_ALERTS_RSS_URL_HERE', '', 'Google Alert: "apply to Malaysian universities"'],
  // 2) Stack Exchange official API — automated access explicitly permitted. Works immediately.
  ['TRUE', 'stackexchange', 'academia', 'malaysia', 'Academia Stack Exchange'],
  ['TRUE', 'stackexchange', 'academia', 'undergraduate abroad', 'Academia Stack Exchange'],
  ['TRUE', 'stackexchange', 'academia', 'international student admission', 'Academia Stack Exchange'],
  ['TRUE', 'stackexchange', 'expatriates', 'student visa', 'Expatriates Stack Exchange'],
  ['TRUE', 'stackexchange', 'expatriates', 'malaysia', 'Expatriates Stack Exchange'],
  // 3) Reddit — ONLY via Reddit's official API after Reddit approves your access (Reddit does not allow unapproved bots).
  //    Add REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET in Script Properties, then switch these to TRUE.
  ['FALSE', 'reddit_search', 'studyAbroad', 'malaysia', 'r/studyAbroad (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'studyAbroad', 'affordable university', 'r/studyAbroad (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'malaysia', 'international student university', 'r/malaysia (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'Kenya', 'study abroad', 'r/Kenya (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'Nigeria', 'study abroad', 'r/Nigeria (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'pakistan', 'study abroad', 'r/pakistan (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'bangladesh', 'study abroad', 'r/bangladesh (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'Nepal', 'study abroad', 'r/Nepal (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'Somalia', 'university abroad', 'r/Somalia (needs Reddit API approval)'],
  ['FALSE', 'reddit_search', 'all', '"study in malaysia"', 'All of Reddit (needs Reddit API approval)']
];


// ===================== Utils.gs =====================
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


// ===================== Scoring.gs =====================
/**
 * Rule-based "AI" qualification engine. 100% free: no paid APIs.
 * Every score comes with a plain-English explanation. Missing data is reported
 * as "not provided" — nothing is ever guessed or invented.
 */

const COUNTRY_ALIASES = {
  'Kenya': ['kenya', 'kenyan', 'nairobi', 'mombasa', 'kcse'],
  'Somalia': ['somalia', 'somali', 'mogadishu', 'hargeisa', 'somaliland', 'puntland'],
  'Tanzania': ['tanzania', 'tanzanian', 'dar es salaam', 'zanzibar'],
  'Ethiopia': ['ethiopia', 'ethiopian', 'addis ababa'],
  'Uganda': ['uganda', 'ugandan', 'kampala'],
  'Rwanda': ['rwanda', 'rwandan', 'kigali'],
  'Nigeria': ['nigeria', 'nigerian', 'lagos', 'abuja', 'waec', 'jamb', 'neco'],
  'Ghana': ['ghana', 'ghanaian', 'accra', 'wassce'],
  'South Africa': ['south africa', 'south african', 'johannesburg', 'cape town', 'matric'],
  'Egypt': ['egypt', 'egyptian', 'cairo', 'alexandria', 'thanaweya'],
  'Sudan': ['sudan', 'sudanese', 'khartoum'],
  'Djibouti': ['djibouti'],
  'Algeria': ['algeria', 'algerian', 'algiers', 'baccalaureat algerie'],
  'Bangladesh': ['bangladesh', 'bangladeshi', 'dhaka', 'chittagong', 'hsc exam'],
  'Pakistan': ['pakistan', 'pakistani', 'karachi', 'lahore', 'islamabad', 'fsc', 'matric pakistan'],
  'India': ['india', 'indian student', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'cbse', '12th board'],
  'Nepal': ['nepal', 'nepali', 'nepalese', 'kathmandu', 'neb exam'],
  'Sri Lanka': ['sri lanka', 'sri lankan', 'colombo'],
  'Indonesia': ['indonesia', 'indonesian', 'jakarta'],
  'Saudi Arabia': ['saudi', 'riyadh', 'jeddah', 'ksa'],
  'United Arab Emirates': ['uae', 'united arab emirates', 'emirati', 'dubai', 'abu dhabi', 'sharjah'],
  'Yemen': ['yemen', 'yemeni', "sana'a", 'sanaa', 'aden'],
  'Oman': ['oman', 'omani', 'muscat'],
  'Lebanon': ['lebanon', 'lebanese', 'beirut'],
  'Jordan': ['jordan', 'jordanian', 'amman', 'tawjihi'],
  'Palestine': ['palestine', 'palestinian', 'gaza', 'west bank', 'ramallah'],
  'United Kingdom': ['united kingdom', ' uk ', 'britain', 'british', 'england', 'scotland', 'london'],
  'Germany': ['germany', 'german student', 'berlin', 'munich', 'abitur'],
  'France': ['france', 'french student', 'paris', 'baccalaureat'],
  'Switzerland': ['switzerland', 'swiss', 'zurich', 'geneva'],
  'Austria': ['austria', 'austrian', 'vienna'],
  'United States': ['united states', ' usa ', ' us citizen', 'american student'],
  'Canada': ['canada', 'canadian', 'toronto', 'vancouver']
};

const LEVEL_PATTERNS = [
  ['PhD', /\b(ph\.?d|doctorate|doctoral)\b/i],
  ["Master's", /\b(master'?s?|msc|m\.sc|mba|ma degree|postgrad(uate)?|post-?graduate|meng)\b/i],
  ["Bachelor's", /\b(bachelor'?s?|undergrad(uate)?|bsc|b\.sc|b\.a\.?|beng|degree program+e?|first degree)\b/i],
  ['Diploma', /\b(diploma|hnd)\b/i],
  ['Foundation', /\b(foundation (year|program+e?|course|studies)|a-?levels? equivalent|pre-?university)\b/i]
];

const COURSE_PATTERNS = [
  ['Medicine (MBBS)', /\b(mbbs|medicine|medical school|doctor of medicine)\b/i],
  ['Dentistry', /\b(dentistry|dental)\b/i],
  ['Pharmacy', /\bpharmac(y|eutical)/i],
  ['Nursing', /\bnursing\b/i],
  ['Computer Science', /\b(computer science|comp ?sci|\bcs degree)\b/i],
  ['Software Engineering', /\bsoftware engineering\b/i],
  ['Information Technology', /\b(information technology|\bit degree|\bit course|ict)\b/i],
  ['Data Science / AI', /\b(data science|artificial intelligence|machine learning|\bai degree)\b/i],
  ['Cyber Security', /\bcyber ?security\b/i],
  ['Business Administration', /\b(business admin(istration)?|bba|business management|business studies)\b/i],
  ['MBA', /\bmba\b/i],
  ['Accounting & Finance', /\b(accounting|accountancy|finance|acca)\b/i],
  ['Economics', /\beconomics\b/i],
  ['Marketing', /\bmarketing\b/i],
  ['Mechanical Engineering', /\bmechanical engineering\b/i],
  ['Civil Engineering', /\bcivil engineering\b/i],
  ['Electrical & Electronic Engineering', /\b(electrical|electronic)s? engineering\b/i],
  ['Chemical Engineering', /\bchemical engineering\b/i],
  ['Petroleum Engineering', /\bpetroleum engineering\b/i],
  ['Engineering (general)', /\bengineering\b/i],
  ['Architecture', /\barchitecture\b/i],
  ['Law', /\b(law degree|llb|studying law|study law|\blaw\b)\b/i],
  ['Psychology', /\bpsychology\b/i],
  ['Hospitality & Tourism', /\b(hospitality|tourism|hotel management|culinary)\b/i],
  ['Mass Communication', /\b(mass comm(unication)?|journalism|media studies)\b/i],
  ['Biotechnology', /\bbiotech(nology)?\b/i],
  ['Education', /\b(education degree|teaching degree|tesl)\b/i],
  ['Islamic Studies', /\bislamic (studies|finance|banking)\b/i],
  ['Aviation', /\b(aviation|pilot training)\b/i]
];

const PROMO_PATTERNS = /\b(we offer|our agency|our consultancy|contact us|admissions? (are )?open|apply now|call now|whatsapp (us|now|\+)|dm (us|me) for admission|limited seats|100% (visa|admission)|guaranteed (visa|admission)|free consultation|our services|education consultancy|visit our (website|office)|%\s*(off|discount)|scholarship available.*contact)\b/i;
const ACADEMIC_JOB_PATTERNS = /\b(postdoc|post-doc|tenure|faculty position|hiring committee|referee report|peer review|journal|publish(ing)? (a )?paper|my advisor|my supervisor|grant proposal|teaching load)\b/i;
const STRONG_INTENT = [
  /\bi('?m| am)? ?(want|wanna|plan(ning)?|hoping|trying|thinking( of| about)?|looking|considering|interested|keen|deciding) (to )?(study|go|apply|do (my|a))/i,
  /\blooking for (a |an |good |affordable |cheap )?(universit|college|course|program|degree|bachelor|master|diploma|scholarship)/i,
  /\bwhich (country|universit|college|course)/i,
  /\b(should|can|could) i (study|apply|go|do)/i,
  /\bhow (can|do|should) i (apply|get admission|get into|study)/i,
  /\b(just )?(finished|completed|graduated|done with) (high school|secondary|a-?levels?|o-?levels?|kcse|waec|igcse|hsc|12th|my bachelor|my degree|class 12|matric)/i,
  /\bafter (high school|12th|a-?levels|my bachelor|graduation|secondary school)\b/i,
  /\b(any|need|seeking|want) (advice|recommendations?|suggestions?|guidance|help)\b/i,
  /\b(study(ing)?|studies) (abroad|overseas|in malaysia|in asia)\b/i,
  /\bwant(s)? to (do|pursue|start) (my |a )?(bachelor|master|degree|diploma|undergrad|postgrad|mba)/i
];
const INVITE_PATTERNS = /\b(any (advice|recommendations?|suggestions?|tips|help)|please (help|advise|suggest|recommend)|recommend (me|a|any)|suggest (me|a|any|some)|need (advice|help|guidance)|what do you (think|suggest|recommend)|can (anyone|someone) (help|recommend|advise|suggest)|feel free to dm|dm me|open to suggestions|help me (choose|decide|find))\b/i;
const AFFORDABLE_PATTERNS = /\b(affordable|cheap(est|er)?|low[- ]cost|budget|tuition fees?|cost of (living|study)|scholarships?|financial aid|can'?t afford|inexpensive)\b/i;
const ASIA_PATTERNS = /\b(asia|asian|singapore|thailand|china|japan|korea|turkey|cyprus|dubai|middle east)\b/i;

function lowerPad_(text) { return ' ' + String(text || '').toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ') + ' '; }

function detectCountry_(text) {
  const t = lowerPad_(text);
  for (const country in COUNTRY_ALIASES) {
    for (const alias of COUNTRY_ALIASES[country]) {
      const a = ' ' + alias.trim() + ' ';
      const plural = ' ' + alias.trim() + 's ';
      if (t.indexOf(a) !== -1 || t.indexOf(plural) !== -1) return country;
    }
  }
  return '';
}

function detectLevel_(text) {
  for (const [label, re] of LEVEL_PATTERNS) if (re.test(text || '')) return label;
  return '';
}

function detectCourse_(text) {
  for (const [label, re] of COURSE_PATTERNS) if (re.test(text || '')) return label;
  return '';
}

/**
 * Scores a public post/discussion for recruitment relevance (0–100).
 * post: {title, body, created (Date), platform}
 */
function classifyPost_(post, now) {
  now = now || new Date();
  const text = (post.title || '') + '\n' + (post.body || '');
  const reasons = [];
  let score = 0;

  const strongHits = STRONG_INTENT.filter(re => re.test(text)).length;
  if (strongHits >= 2) { score += 35; reasons.push('+35 clearly asking about their own study plans'); }
  else if (strongHits === 1) { score += 25; reasons.push('+25 expresses personal study intent'); }
  else if (/\?/.test(text) && /\b(study|universit|college|degree|admission)/i.test(text)) { score += 10; reasons.push('+10 study-related question'); }
  else { reasons.push('+0 no personal study intent detected'); }

  const malaysia = /\bmalaysia(n)?\b|\bkuala lumpur\b|\b(kl|klia)\b|\bpenang\b|\bjohor\b|\bselangor\b|\bcyberjaya\b|\bputrajaya\b/i.test(text);
  if (malaysia) { score += 20; reasons.push('+20 mentions Malaysia'); }
  else if (ASIA_PATTERNS.test(text)) { score += 8; reasons.push('+8 considering Asia / nearby destinations'); }

  const affordable = AFFORDABLE_PATTERNS.test(text);
  if (affordable) { score += 8; reasons.push('+8 cost/affordability is a concern (Malaysia is often a lower-cost option)'); }

  const level = detectLevel_(text);
  if (level) { score += 10; reasons.push('+10 study level: ' + level); }
  const course = detectCourse_(text);
  if (course) { score += 5; reasons.push('+5 course interest: ' + course); }

  const country = detectCountry_(text);
  if (country && CONFIG.PRIORITY_COUNTRIES.indexOf(country) !== -1) { score += 7; reasons.push('+7 priority market: ' + country); }
  else if (country) { score += 3; reasons.push('+3 country mentioned: ' + country); }

  const invites = INVITE_PATTERNS.test(text);
  if (invites) { score += 10; reasons.push('+10 publicly asks for advice/recommendations'); }

  if (post.created instanceof Date && !isNaN(post.created)) {
    const days = (now - post.created) / 86400000;
    if (days <= 7) { score += 5; reasons.push('+5 posted in the last 7 days'); }
    else if (days > 30) { score -= 10; reasons.push('-10 older than 30 days'); }
  }

  if (PROMO_PATTERNS.test(text)) { score -= 50; reasons.push('-50 looks like an advert / another agent (not a student)'); }
  if (ACADEMIC_JOB_PATTERNS.test(text) && !/\b(apply|admission|study)\b/i.test(post.title || '')) { score -= 25; reasons.push('-25 academic career/research topic, not a prospective student'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score, band: scoreBand_(score), reasons, malaysia, invites, level, course, country,
    seeking: strongHits > 0
  };
}

// ---------------------------------------------------------------- Enquiries

function parseIntakeMonths_(intake, now) {
  if (!intake) return null;
  now = now || new Date();
  const t = String(intake).toLowerCase();
  if (/\b(asap|as soon as possible|immediately|next intake|this year|soon)\b/.test(t)) return 3;
  if (/\bnext year\b/.test(t)) return 12;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let m = -1;
  months.forEach((mm, i) => { if (m === -1 && new RegExp('\\b' + mm).test(t)) m = i; });
  const y = (t.match(/\b(20\d\d)\b/) || [])[1];
  if (m === -1 && !y) return null;
  let year = y ? parseInt(y, 10) : now.getFullYear();
  let month = m === -1 ? 0 : m;
  if (!y && month < now.getMonth()) year += 1; // "September" → next September if already past
  return (year - now.getFullYear()) * 12 + (month - now.getMonth());
}

function isYes_(v) { return v === true || /^(yes|y|true|1|please|yes please|sure)$/i.test(String(v || '').trim()); }

/**
 * Scores a voluntary student enquiry (0–100) with an explanation per component.
 * e: normalised enquiry object (see Api.gs normaliseEnquiry_)
 */
function scoreEnquiry_(e, now) {
  const parts = [];
  let score = 0;
  function add(points, ok, label, missing) {
    if (ok) { score += points; parts.push('+' + points + ' ' + label); }
    else parts.push('+0 ' + missing);
  }
  add(10, !!e.consent, 'consent to be contacted', 'no consent recorded');
  add(15, !!(e.email || e.phone), 'contact details provided', 'no contact details provided');
  add(5, !!e.country, 'country: ' + e.country, 'country not provided');
  add(5, CONFIG.PRIORITY_COUNTRIES.indexOf(e.country) !== -1, 'priority market', 'not a priority market (still welcome)');
  add(10, !!e.qualification, 'qualification: ' + e.qualification, 'qualification not provided');
  add(10, !!e.level, 'study level: ' + e.level, 'study level not chosen');
  add(10, !!e.course, 'course: ' + e.course, 'course not provided');
  add(5, !!e.intake, 'intake: ' + e.intake, 'intake not provided');
  const months = parseIntakeMonths_(e.intake, now);
  add(5, months !== null && months >= 0 && months <= 12, 'wants to start within 12 months', months === null ? 'start date unclear' : 'start date more than 12 months away');
  add(10, !!e.budget, 'budget: ' + e.budget, 'budget not provided');
  add(5, true, 'chose to enquire about studying in Malaysia', '');
  const services = [isYes_(e.accommodation), isYes_(e.pickup), isYes_(e.visaHelp)].filter(Boolean).length;
  add(10, services > 0, 'asked for help with ' + services + ' arrangement service(s)', 'no arrangement services requested yet');
  score = Math.max(0, Math.min(100, score));
  return { score, band: scoreBand_(score), explanation: parts.join('; ') };
}

/** Status suggested by the data (Ismail can always override in the sheet). */
function suggestedStatus_(e, scored) {
  if (!e.consent) return 'INTERESTED';
  if (scored.score >= 90 && e.level && e.course && e.qualification && (e.email || e.phone)) return 'READY TO APPLY';
  if (scored.score >= CONFIG.QUALIFIED_SCORE) return 'QUALIFIED';
  return 'ENQUIRY SUBMITTED';
}

function nextActionFor_(status) {
  return ({
    'NEW LEAD': 'Review the public post and decide whether to reply publicly',
    'INTERESTED': 'Invite them to submit the enquiry form',
    'ENQUIRY SUBMITTED': 'Reply within 24h and ask for missing details',
    'CONSENT RECEIVED': 'Reply within 24h and ask for missing details',
    'QUALIFIED': 'Contact student personally within 24h',
    'READY TO APPLY': 'Contact student personally TODAY and prepare QETC referral',
    'REFERRED TO QETC': 'Confirm QETC has received the referral',
    'APPLICATION SUBMITTED': 'Follow up on the university decision',
    'ADMISSION OFFERED': 'Help student accept offer, visa (EMGS) and arrival plan',
    'ENROLLED': 'Confirm commission eligibility with QETC',
    'COMMISSION PENDING': 'Follow up on commission payment',
    'COMMISSION PAID': 'Ask for (genuine) feedback / referral',
    'NOT INTERESTED': 'No action'
  })[status] || 'Review';
}

/** Draft public reply for a discovered post. Ismail reviews and posts it himself — never auto-posted. */
function draftReply_(cls) {
  const lines = [];
  lines.push('Hi! ' + (cls.malaysia
    ? 'Malaysia is worth a serious look'
    : 'If you are open to Asia, Malaysia might be worth comparing') +
    ' — many universities there teach in English and overall costs are often lower than in the UK, US or Australia.');
  if (cls.level || cls.course) {
    lines.push('There are ' + (cls.level ? cls.level + ' ' : '') + (cls.course ? cls.course + ' ' : '') +
      'programmes at a range of universities, so it is worth comparing entry requirements, total fees and intakes before deciding.');
  }
  lines.push('Disclosure: I am a student recruitment consultant working with QETC Malaysia. We help international students compare universities and courses and coordinate admission, accommodation and airport pickup. Happy to answer questions here' +
    (CONFIG.WEBSITE_URL ? ', or you can send a free enquiry at ' + CONFIG.WEBSITE_URL : '') + '. No admission or visa is ever guaranteed — always check with the university and official channels.');
  lines.push('— Ismail');
  return lines.join('\n\n');
}


// ===================== Crm.gs =====================
/** Student CRM: create, de-duplicate, update, delete. */

/** Normalises raw enquiry input from the website form or chat. Never invents values. */
function normaliseEnquiry_(raw) {
  raw = raw || {};
  const yn = v => (v === undefined || v === null || v === '' ? '' : (isYes_(v) ? 'Yes' : (/^(no|n|false|0|no thanks)$/i.test(String(v).trim()) ? 'No' : clean_(v, 60))));
  const e = {
    name: clean_(raw.name, 120),
    country: clean_(raw.country, 80),
    email: normEmail_(raw.email),
    phone: clean_(raw.phone, 40),
    preferredContact: clean_(raw.preferredContact, 30),
    qualification: clean_(raw.qualification, 150),
    level: clean_(raw.level, 40),
    course: clean_(raw.course, 150),
    university: clean_(raw.university, 150),
    intake: clean_(raw.intake, 60),
    budget: clean_(raw.budget, 80),
    accommodation: yn(raw.accommodation),
    pickup: yn(raw.pickup),
    visaHelp: yn(raw.visaHelp),
    message: clean_(raw.message, 1500),
    source: clean_(raw.source, 80) || 'Website',
    sourceLink: clean_(raw.sourceLink, 300),
    consent: raw.consent === true || raw.consent === 'true' || raw.consent === 'on' || raw.consent === 'yes'
  };
  // Never store passport numbers or card numbers that a student might paste in by mistake.
  ['message', 'qualification', 'course', 'budget', 'name'].forEach(k => { e[k] = redactSensitive_(e[k]); });
  if (e.phone && !normPhone_(e.phone)) e.phone = '';
  // Match country to our canonical list when possible (e.g. "kenyan" → "Kenya").
  if (e.country) {
    const canon = CONFIG.PRIORITY_COUNTRIES.find(c => c.toLowerCase() === e.country.toLowerCase()) || detectCountry_(e.country);
    if (canon) e.country = canon;
  }
  return e;
}

/** Removes card-number-like and passport-number-like strings. */
function redactSensitive_(s) {
  if (!s) return s;
  return String(s)
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[removed: possible card number]')
    .replace(/\b(passport( no\.?| number| #)?:?\s*)[A-Z0-9]{6,12}\b/gi, '$1[removed]');
}

function validateEnquiry_(e) {
  const errors = [];
  if (!e.name) errors.push('Please tell us your name.');
  if (!e.country) errors.push('Please tell us your country.');
  if (!e.email && !normPhone_(e.phone)) errors.push('Please give an email address or WhatsApp number so Ismail can reply.');
  if (!e.consent) errors.push('Please tick the consent box so we can store your enquiry and contact you.');
  return errors;
}

/** Looks for an existing student with the same email, phone, or name+country. */
function findDuplicate_(e, students) {
  const email = e.email;
  const phone = normPhone_(e.phone);
  const nameKey = (e.name + '|' + e.country).toLowerCase().replace(/\s+/g, ' ');
  for (const s of students) {
    if (email && normEmail_(s['Email']) === email) return { ref: s['Ref'], row: s._row, why: 'same email' };
    if (phone && normPhone_(s['WhatsApp / Phone']) === phone) return { ref: s['Ref'], row: s._row, why: 'same phone' };
    if (e.name && (String(s['Student Name']) + '|' + String(s['Country'])).toLowerCase().replace(/\s+/g, ' ') === nameKey) {
      return { ref: s['Ref'], row: s._row, why: 'same name and country' };
    }
  }
  return null;
}

/**
 * Saves a voluntary enquiry. Returns {ok, ref, score, status, duplicateOf, errors}.
 * Duplicates are still recorded (the student may have new info) but linked to the original.
 */
function saveEnquiry_(raw) {
  const e = normaliseEnquiry_(raw);
  const errors = validateEnquiry_(e);
  if (errors.length) return { ok: false, errors };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const students = readObjects_(CONFIG.SHEETS.STUDENTS);
    const dup = findDuplicate_(e, students);
    const scored = scoreEnquiry_(e);
    const status = suggestedStatus_(e, scored);
    const ref = newRef_();
    const now = new Date();
    appendObject_(CONFIG.SHEETS.STUDENTS, {
      'Ref': ref, 'Created': now, 'Student Name': e.name, 'Country': e.country, 'Email': e.email,
      'WhatsApp / Phone': e.phone, 'Preferred Contact': e.preferredContact || (e.phone ? 'WhatsApp' : 'Email'),
      'Highest Qualification': e.qualification, 'Study Level': e.level, 'Course': e.course,
      'Preferred University': e.university, 'Budget': e.budget, 'Intake': e.intake,
      'Needs Accommodation': e.accommodation, 'Needs Airport Pickup': e.pickup, 'Needs Admission/Visa Guidance': e.visaHelp,
      'Discovery Source': e.source, 'Source Link': e.sourceLink, 'Enquiry Date': now,
      'Consent Status': e.consent ? 'GIVEN' : 'NOT GIVEN', 'Consent Time': e.consent ? now : '',
      'Lead Score': scored.score, 'Score Band': scored.band, 'Score Explanation': scored.explanation,
      'Status': status, 'Last Communication': 'Enquiry received via ' + e.source, 'Next Action': nextActionFor_(status),
      'Next Action Due': new Date(now.getTime() + 24 * 3600 * 1000), 'Duplicate Of': dup ? dup.ref + ' (' + dup.why + ')' : '',
      'Student Message': e.message, 'Notes': '', 'Last Updated': now
    });
    if (dup) {
      updateRow_(CONFIG.SHEETS.STUDENTS, dup.row, { 'Last Communication': 'Sent another enquiry (' + ref + ') on ' + fmtDate_(now), 'Last Updated': now });
    }
    return { ok: true, ref, score: scored.score, band: scored.band, status, duplicateOf: dup ? dup.ref : '', enquiry: e, explanation: scored.explanation };
  } finally {
    lock.releaseLock();
  }
}

/** Deletes every record of a student. Requires matching reference AND email (prevents abuse). */
function deleteStudentData_(ref, email) {
  ref = clean_(ref, 40).toUpperCase();
  email = normEmail_(email);
  if (!ref || !email) return { ok: false, message: 'Please provide both your reference number and the email you used.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const students = readObjects_(CONFIG.SHEETS.STUDENTS).filter(s => String(s['Ref']).toUpperCase() === ref && normEmail_(s['Email']) === email);
    let deleted = 0;
    if (students.length) {
      // Also remove other enquiries from the same email, and commission rows for those refs.
      const all = readObjects_(CONFIG.SHEETS.STUDENTS).filter(s => normEmail_(s['Email']) === email);
      const refs = all.map(s => String(s['Ref']));
      all.map(s => s._row).sort((a, b) => b - a).forEach(r => { sheet_(CONFIG.SHEETS.STUDENTS).deleteRow(r); deleted++; });
      readObjects_(CONFIG.SHEETS.COMMISSION).filter(c => refs.indexOf(String(c['Student Ref'])) !== -1)
        .map(c => c._row).sort((a, b) => b - a).forEach(r => sheet_(CONFIG.SHEETS.COMMISSION).deleteRow(r));
      readObjects_(CONFIG.SHEETS.OPPORTUNITIES).filter(o => refs.indexOf(String(o['Student Ref'])) !== -1)
        .forEach(o => updateRow_(CONFIG.SHEETS.OPPORTUNITIES, o._row, { 'Student Ref': '', 'Notes': 'Linked student deleted on request' }));
    }
    // Log the request without keeping the email in plain text.
    appendObject_(CONFIG.SHEETS.DELETIONS, { 'Time': new Date(), 'Ref': ref, 'Email': 'hash:' + hash_(email), 'Result': deleted ? 'Deleted ' + deleted + ' record(s)' : 'No matching record' });
    return { ok: true, deleted, message: deleted ? 'Your enquiry data has been deleted.' : 'We could not find a record with that reference and email. If you think this is wrong, contact Ismail directly.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Called by the installable onEdit trigger when Ismail changes a cell in the Students sheet.
 * Keeps "Last Updated"/"Next Action" in sync, alerts on READY TO APPLY, and opens a commission row on ENROLLED.
 */
function handleStudentEdit_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== CONFIG.SHEETS.STUDENTS || e.range.getRow() < 2) return;
  const { map } = headerMap_(sh);
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (col === map['Last Updated']) return;
  const patch = { 'Last Updated': new Date() };
  if (col === map['Status']) {
    const status = String(e.value || '').trim();
    patch['Next Action'] = nextActionFor_(status);
    const student = readObjects_(CONFIG.SHEETS.STUDENTS).find(s => s._row === row);
    if (student) {
      if (status === 'READY TO APPLY') notifyReadyToApply_(student);
      if (['ENROLLED', 'COMMISSION PENDING', 'COMMISSION PAID'].indexOf(status) !== -1) ensureCommissionRow_(student, status);
    }
  }
  updateRow_(CONFIG.SHEETS.STUDENTS, row, patch);
}


// ===================== Commission.gs =====================
/**
 * PRIVATE commission tracker. Never exposed to students or the public website.
 * A row is only opened when YOU set a student's status to ENROLLED (or later).
 * Nothing is counted as earned until you tick "Eligibility Confirmed by QETC" = YES
 * AND set "Payment Status" = PAID.
 */

function ensureCommissionRow_(student, status) {
  const ref = String(student['Ref']);
  const existing = readObjects_(CONFIG.SHEETS.COMMISSION).find(c => String(c['Student Ref']) === ref);
  if (existing) {
    updateRow_(CONFIG.SHEETS.COMMISSION, existing._row, { 'Enrolment Status': status });
    return existing._row;
  }
  return appendObject_(CONFIG.SHEETS.COMMISSION, {
    'Student Ref': ref, 'Student Name': student['Student Name'], 'Enrolment Status': status,
    'Commission Amount (USD)': CONFIG.COMMISSION_PER_ENROLMENT_USD,
    'Eligibility Confirmed by QETC': 'NOT YET', 'Payment Status': 'NOT DUE YET', 'Date Received': '',
    'Notes': 'Confirm eligibility with QETC under your agreement before counting this.', 'Created': new Date()
  });
}

function commissionSummary_() {
  const rows = readObjects_(CONFIG.SHEETS.COMMISSION);
  let confirmedPending = 0, received = 0, unconfirmed = 0;
  rows.forEach(r => {
    const amt = Number(r['Commission Amount (USD)']) || 0;
    const eligible = /^yes$/i.test(String(r['Eligibility Confirmed by QETC']).trim());
    const paid = /^paid$/i.test(String(r['Payment Status']).trim());
    if (eligible && paid) received += amt;
    else if (eligible) confirmedPending += amt;
    else unconfirmed += amt;
  });
  return { received, confirmedPending, unconfirmed, rows: rows.length };
}


// ===================== Discovery.gs =====================
/**
 * AUTONOMOUS STUDENT DISCOVERY ENGINE
 * Searches permitted public sources for people publicly asking about studying abroad,
 * scores them, de-duplicates them and saves promising ones for Ismail to review.
 *
 * Rules built in:
 *  - Only official APIs or feeds meant for automated reading (Stack Exchange API, Google Alerts RSS, approved Reddit API, public RSS).
 *  - No CAPTCHA bypass, no private groups, no profile scraping, no contact-detail harvesting.
 *    We store the post's public link and text excerpt only — not usernames, emails or phone numbers.
 *  - Nothing is ever posted or messaged automatically. Draft replies are for Ismail to review and post himself.
 */

const SOURCE_TYPES = ['stackexchange', 'reddit_search', 'rss'];

/** Time-driven trigger entry point. */
function runDiscovery() {
  const started = Date.now();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { log_('discovery', 'SKIPPED', started, 0, 0, 'Previous run still in progress'); return; }
  const props = PropertiesService.getScriptProperties();
  let checked = 0, created = 0, okSources = 0, failedSources = 0;
  const errors = [], alerts = [];
  try {
    props.setProperty('LAST_DISCOVERY_START', new Date().toISOString());
    const sources = readObjects_(CONFIG.SHEETS.SOURCES);
    const existing = readObjects_(CONFIG.SHEETS.OPPORTUNITIES);
    const seen = {};
    existing.forEach(o => { seen[String(o['ID'])] = true; });
    const now = new Date();

    for (const src of sources) {
      if (Date.now() - started > CONFIG.MAX_RUN_MS) { errors.push('Stopped early to stay inside the 6-minute limit; remaining sources run next time.'); break; }
      if (!/^(true|yes)$/i.test(String(src['Enabled']))) continue;
      const type = String(src['Type']).trim();
      if (SOURCE_TYPES.indexOf(type) === -1) continue;
      if (src['Paused Until'] && new Date(src['Paused Until']) > now) continue;
      if (type === 'rss' && !/^https:\/\//.test(String(src['Target']))) continue;

      let items;
      try {
        items = fetchSource_(type, String(src['Target']).trim(), String(src['Query'] || '').trim());
        okSources++;
      } catch (err) {
        failedSources++;
        const fails = (Number(src['Consecutive Failures']) || 0) + 1;
        const patch = { 'Last Run': new Date(), 'Last Result': 'ERROR: ' + clean_(err.message, 200), 'Consecutive Failures': fails };
        if (fails >= CONFIG.SOURCE_BACKOFF_FAILURES) patch['Paused Until'] = new Date(Date.now() + CONFIG.SOURCE_BACKOFF_HOURS * 3600000);
        updateRow_(CONFIG.SHEETS.SOURCES, src._row, patch);
        errors.push(type + ' ' + src['Target'] + ': ' + err.message);
        continue;
      }

      let newHere = 0;
      for (const item of items) {
        checked++;
        const id = hash_(item.platform + '|' + canonicalLink_(item.link));
        if (seen[id]) continue;
        seen[id] = true;
        if (item.created && (now - item.created) / 86400000 > CONFIG.MAX_POST_AGE_DAYS) continue;
        const cls = classifyPost_(item, now);
        if (cls.score < CONFIG.OPPORTUNITY_MIN_SCORE) continue;
        appendObject_(CONFIG.SHEETS.OPPORTUNITIES, {
          'ID': id, 'Found': new Date(), 'Platform': item.platform, 'Community': item.community,
          'Title': clean_(item.title, 300), 'Excerpt': clean_(stripContactDetails_(item.body), 600),
          'Link': item.link, 'Posted': item.created || '', 'Relevance Score': cls.score, 'Score Band': cls.band,
          'Why': cls.reasons.join('; '), 'Detected Country': cls.country, 'Detected Level': cls.level,
          'Detected Course': cls.course, 'Malaysia Mentioned': cls.malaysia ? 'Yes' : 'No',
          'Invites Recommendations': cls.invites ? 'Yes' : 'No',
          'Suggested Public Reply (review before posting)': draftReply_(cls), 'Review Status': 'NEW', 'Student Ref': '', 'Notes': ''
        });
        created++; newHere++;
        if (cls.score >= CONFIG.OPPORTUNITY_ALERT_SCORE) alerts.push({ item, cls });
      }
      updateRow_(CONFIG.SHEETS.SOURCES, src._row, {
        'Last Run': new Date(), 'Last Result': 'OK: ' + items.length + ' checked, ' + newHere + ' new', 'Consecutive Failures': 0, 'Paused Until': ''
      });
    }

    alerts.sort((a, b) => b.cls.score - a.cls.score).slice(0, CONFIG.MAX_IMMEDIATE_ALERTS_PER_RUN).forEach(a => notifyOpportunity_(a.item, a.cls));

    const status = okSources === 0 && failedSources > 0 ? 'FAILED' : (failedSources ? 'PARTIAL' : 'OK');
    if (status !== 'FAILED') props.setProperty('LAST_DISCOVERY_SUCCESS', new Date().toISOString());
    props.setProperty('LAST_DISCOVERY_STATUS', status);
    log_('discovery', status, started, checked, created, errors.join(' | ') || 'All sources OK');
    if (status === 'FAILED') notifyError_('discovery-all-failed', 'Every discovery source failed this run.\n\n' + errors.join('\n'));
    refreshDashboardSafe_();
    return { status, checked, created, errors };
  } catch (err) {
    props.setProperty('LAST_DISCOVERY_STATUS', 'CRASHED');
    log_('discovery', 'CRASHED', started, checked, created, err.stack || err.message);
    notifyError_('discovery-crash', 'Discovery crashed: ' + (err.stack || err.message));
    return { status: 'CRASHED', checked, created, errors: [err.message] };
  } finally {
    lock.releaseLock();
  }
}

function fetchSource_(type, target, query) {
  if (type === 'stackexchange') return fetchStackExchange_(target, query);
  if (type === 'reddit_search') return fetchReddit_(target, query);
  if (type === 'rss') return fetchRss_(target, 'Web (RSS)', target.replace(/^https:\/\/([^/]+).*/, '$1'));
  throw new Error('Unknown source type ' + type);
}

// ------------------------------------------------------------- Stack Exchange
function fetchStackExchange_(site, query) {
  const props = PropertiesService.getScriptProperties();
  const backoffUntil = Number(props.getProperty('SE_BACKOFF_UNTIL') || 0);
  if (Date.now() < backoffUntil) return [];
  const from = Math.floor(Date.now() / 1000) - CONFIG.MAX_POST_AGE_DAYS * 86400;
  let url = 'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&pagesize=30&filter=withbody' +
    '&site=' + encodeURIComponent(site) + '&q=' + encodeURIComponent(query) + '&fromdate=' + from;
  const key = props.getProperty('STACKEXCHANGE_KEY');
  if (key) url += '&key=' + encodeURIComponent(key);
  const res = fetchWithRetry_(url, {}, 2);
  if (res.code !== 200) throw new Error('Stack Exchange HTTP ' + res.code + ' ' + clean_(res.text, 120));
  const data = JSON.parse(res.text);
  if (data.backoff) props.setProperty('SE_BACKOFF_UNTIL', String(Date.now() + data.backoff * 1000));
  if (typeof data.quota_remaining === 'number') props.setProperty('SE_QUOTA_REMAINING', String(data.quota_remaining));
  return (data.items || []).map(q => ({
    platform: 'Stack Exchange', community: site, title: decodeEntities_(q.title || ''),
    body: htmlToText_(q.body || ''), link: q.link, created: new Date(q.creation_date * 1000)
  }));
}

// ------------------------------------------------------------- Reddit
function fetchReddit_(subreddit, query) {
  const props = PropertiesService.getScriptProperties();
  const sub = subreddit.replace(/^r\//i, '');
  const community = sub === 'all' ? 'Reddit (all)' : 'r/' + sub;
  if (!props.getProperty('REDDIT_CLIENT_ID') || !props.getProperty('REDDIT_CLIENT_SECRET')) {
    // Reddit's robots.txt and Data API terms do not allow unapproved automated access, so we never scrape it.
    throw new Error('Reddit source skipped: add approved REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET first (docs/DEPLOY.md, optional step)');
  }
  return fetchRedditApi_(sub, query, community);
}

/** Official Reddit API (application-only OAuth). Used automatically when you add REDDIT_CLIENT_ID/SECRET. */
function fetchRedditApi_(sub, query, community) {
  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  let token = cache.get('REDDIT_TOKEN');
  if (!token) {
    const auth = Utilities.base64Encode(props.getProperty('REDDIT_CLIENT_ID') + ':' + props.getProperty('REDDIT_CLIENT_SECRET'));
    const res = fetchWithRetry_('https://www.reddit.com/api/v1/access_token', {
      method: 'post', payload: { grant_type: 'client_credentials' }, headers: { Authorization: 'Basic ' + auth }
    }, 2);
    if (res.code !== 200) throw new Error('Reddit OAuth HTTP ' + res.code);
    const t = JSON.parse(res.text);
    token = t.access_token;
    cache.put('REDDIT_TOKEN', token, Math.min(3000, (t.expires_in || 3600) - 60));
  }
  const base = 'https://oauth.reddit.com';
  const url = !query ? base + '/r/' + encodeURIComponent(sub) + '/new?limit=25'
    : (sub === 'all' ? base + '/search?sort=new&t=month&limit=25&q=' + encodeURIComponent(query)
      : base + '/r/' + encodeURIComponent(sub) + '/search?restrict_sr=1&sort=new&t=month&limit=25&q=' + encodeURIComponent(query));
  const res = fetchWithRetry_(url, { headers: { Authorization: 'Bearer ' + token } }, 2);
  if (res.code !== 200) throw new Error('Reddit API HTTP ' + res.code);
  const data = JSON.parse(res.text);
  return ((data.data && data.data.children) || []).map(c => c.data).map(p => ({
    platform: 'Reddit', community: p.subreddit ? 'r/' + p.subreddit : community, title: p.title || '',
    body: p.selftext || '', link: 'https://www.reddit.com' + p.permalink, created: new Date(p.created_utc * 1000)
  }));
}

// ------------------------------------------------------------- RSS / Atom (Reddit feeds, Google Alerts, forums)
function fetchRss_(url, platform, community) {
  const res = fetchWithRetry_(url, {}, 2);
  if (res.code !== 200) throw new Error(platform + ' feed HTTP ' + res.code + (res.code === 403 || res.code === 429 ? ' (the site is limiting automated access; will retry later)' : ''));
  if (!/<(feed|rss|rdf)/i.test(res.text.slice(0, 2000))) throw new Error(platform + ' did not return a feed (maybe a login/consent page) — skipped');
  return parseFeed_(res.text).map(it => ({
    platform: platform === 'Web (RSS)' ? hostPlatform_(it.link) : platform,
    community, title: it.title, body: it.body, link: it.link, created: it.created
  }));
}

/** Small, dependency-free RSS 2.0 / Atom parser. */
function parseFeed_(xml) {
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks.map(b => {
    const tag = name => {
      const m = b.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
      return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() : '';
    };
    let link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || tag('link');
    link = unwrapGoogleUrl_(decodeEntities_(link));
    const dateStr = tag('published') || tag('updated') || tag('pubDate') || tag('dc:date');
    const d = dateStr ? new Date(dateStr) : null;
    return {
      title: htmlToText_(decodeEntities_(tag('title'))),
      body: htmlToText_(decodeEntities_(tag('content') || tag('description') || tag('summary'))),
      link, created: d && !isNaN(d) ? d : null
    };
  }).filter(it => /^https?:\/\//.test(it.link));
}

function unwrapGoogleUrl_(link) {
  const m = link.match(/^https:\/\/www\.google\.[^/]+\/url\?.*?[?&]url=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : link;
}

function canonicalLink_(link) {
  return String(link || '').replace(/^http:/, 'https:').replace(/#.*$/, '')
    .replace(/([?&])(utm_[^=&]+|ref|fbclid|gclid)=[^&]*/gi, '$1').replace(/[?&]+$/, '').replace(/\/+$/, '')
    .replace('//old.reddit.com', '//www.reddit.com').toLowerCase();
}

function hostPlatform_(link) {
  const h = (String(link).match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || 'Web';
  if (/reddit\.com$/.test(h)) return 'Reddit';
  if (/quora\.com$/.test(h)) return 'Quora';
  if (/facebook\.com$/.test(h)) return 'Facebook (public page)';
  if (/stackexchange\.com$|stackoverflow\.com$/.test(h)) return 'Stack Exchange';
  return h;
}

function decodeEntities_(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function htmlToText_(html) {
  return decodeEntities_(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/submitted by\s+\/u\/\S+/gi, ' ').replace(/\[link\]|\[comments\]/gi, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

/** We never store contact details found in public posts. */
function stripContactDetails_(text) {
  return String(text || '')
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '[email removed]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[number removed]')
    .replace(/\/?u\/[A-Za-z0-9_-]+/g, '[user]');
}

/** Spreadsheet menu: turns the selected opportunity row into a CRM lead (status NEW LEAD). */
function convertSelectedOpportunity() {
  const sh = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (sh.getName() !== CONFIG.SHEETS.OPPORTUNITIES || sh.getActiveRange().getRow() < 2) {
    ui.alert('Select a row in the "' + CONFIG.SHEETS.OPPORTUNITIES + '" sheet first.'); return;
  }
  const row = sh.getActiveRange().getRow();
  const o = readObjects_(CONFIG.SHEETS.OPPORTUNITIES).find(x => x._row === row);
  if (o['Student Ref']) { ui.alert('Already linked to ' + o['Student Ref']); return; }
  const ref = createLeadFromOpportunity_(o);
  ui.alert('Created student lead ' + ref + ' (status NEW LEAD). Add their name/contact only if they share it with you voluntarily.');
}

function createLeadFromOpportunity_(o) {
  const ref = newRef_();
  const now = new Date();
  appendObject_(CONFIG.SHEETS.STUDENTS, {
    'Ref': ref, 'Created': now, 'Student Name': '(public post — name not collected)', 'Country': o['Detected Country'],
    'Study Level': o['Detected Level'], 'Course': o['Detected Course'], 'Discovery Source': o['Platform'] + ' ' + o['Community'],
    'Source Link': o['Link'], 'Enquiry Date': '', 'Consent Status': 'NOT GIVEN (public post only)',
    'Lead Score': o['Relevance Score'], 'Score Band': o['Score Band'], 'Score Explanation': 'Discovery relevance: ' + o['Why'],
    'Status': 'NEW LEAD', 'Next Action': nextActionFor_('NEW LEAD'), 'Next Action Due': new Date(now.getTime() + 48 * 3600000),
    'Last Updated': now
  });
  updateRow_(CONFIG.SHEETS.OPPORTUNITIES, o._row, { 'Student Ref': ref, 'Review Status': 'CONVERTED' });
  return ref;
}


// ===================== Notify.gs =====================
/** Free email notifications via MailApp (consumer Gmail: ~100 recipients/day). */

function sendMail_(to, subject, body, htmlBody) {
  try {
    if (MailApp.getRemainingDailyQuota() < 2) { console.warn('Mail quota exhausted; skipped: ' + subject); return false; }
    const msg = { to, subject, body, name: CONFIG.CONSULTANT_NAME + ' – Student Recruitment System' };
    if (htmlBody) msg.htmlBody = htmlBody;
    MailApp.sendEmail(msg);
    return true;
  } catch (e) {
    console.error('sendMail_ failed: ' + e.message);
    log_('email', 'ERROR', null, 0, 0, 'Could not send "' + subject + '": ' + e.message);
    return false;
  }
}

function waLink_(phone, text) {
  const digits = normPhone_(phone);
  return digits ? 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text || '') : '';
}

function studentCard_(s) {
  return [
    'Name: ' + (s.name || 'not provided'),
    'Country: ' + (s.country || 'not provided'),
    'Interested in: ' + (s.level || 'not provided'),
    'Preferred course: ' + (s.course || 'not provided'),
    'Highest qualification: ' + (s.qualification || 'not provided'),
    'Budget: ' + (s.budget || 'not provided'),
    'Intake: ' + (s.intake || 'not provided'),
    'Needs accommodation: ' + (s.accommodation || '-') + ' | Airport pickup: ' + (s.pickup || '-') + ' | Admission/visa guidance: ' + (s.visaHelp || '-'),
    'Email: ' + (s.email || '-'),
    'WhatsApp/Phone: ' + (s.phone || '-') + (s.preferredContact ? ' (prefers ' + s.preferredContact + ')' : '')
  ].join('\n');
}

/** Sent for every new enquiry. Uses the "NEW QUALIFIED STUDENT!" format when the score is high. */
function notifyNewEnquiry_(result) {
  const e = result.enquiry;
  const qualified = result.score >= CONFIG.QUALIFIED_SCORE;
  const heading = result.status === 'READY TO APPLY' ? 'NEW QUALIFIED STUDENT – READY TO APPLY!' : (qualified ? 'NEW QUALIFIED STUDENT!' : 'New student enquiry');
  const wa = waLink_(e.phone, 'Hello ' + (e.name || '') + ', this is Ismail Hassan. Thank you for your enquiry about studying in Malaysia (ref ' + result.ref + ').');
  const body = [
    heading, '',
    studentCard_(e),
    'Lead score: ' + result.score + '/100 (' + result.band + ')',
    'Status: ' + result.status,
    result.duplicateOf ? 'POSSIBLE DUPLICATE of ' + result.duplicateOf : '',
    '', 'Source: ' + e.source + (e.sourceLink ? ' – ' + e.sourceLink : ''),
    e.message ? '\nStudent message:\n' + e.message : '',
    '', 'Why this score: ' + result.explanation,
    '', 'Recommended next action: ' + (qualified ? 'Contact student personally.' : nextActionFor_(result.status)),
    wa ? 'WhatsApp them: ' + wa : '',
    'Reference: ' + result.ref
  ].filter(l => l !== '').join('\n');
  return sendMail_(notifyEmail_(), (qualified ? '🎓 ' : '') + heading + ' – ' + (e.name || '') + ' (' + (e.country || '?') + ') ' + result.score + '/100', body);
}

/** Confirmation to the student (they asked for contact by submitting). */
function sendStudentConfirmation_(result) {
  const e = result.enquiry;
  if (!e.email) return false;
  const body = [
    'Hello ' + e.name + ',', '',
    'Thank you for your enquiry about studying in Malaysia. This is an automatic confirmation from the virtual assistant supporting Ismail Hassan.',
    'Ismail helps international students explore university opportunities in Malaysia through QETC Malaysia. He will review your details and reply personally, usually within 1–2 working days.',
    '', 'Your reference number: ' + result.ref,
    '', 'Please note: admission and visa decisions are made by universities and the Malaysian authorities, and are never guaranteed. Please do not send passport scans or bank details by email until Ismail explains the official, secure process.',
    '', 'If you want your enquiry deleted at any time, use the "Delete my data" form on our privacy page' + (CONFIG.WEBSITE_URL ? ' (' + CONFIG.WEBSITE_URL.replace(/\/$/, '') + '/privacy.html)' : '') + ' with your reference number, or simply reply to this email.',
    '', 'Best wishes,', 'Virtual assistant for Ismail Hassan', CONFIG.BUSINESS_TITLE + ' · ' + CONFIG.PARTNER_LINE
  ].join('\n');
  return sendMail_(e.email, 'Your Malaysia study enquiry – reference ' + result.ref, body);
}

function notifyReadyToApply_(s) {
  const body = [
    'NEW QUALIFIED STUDENT!', '',
    'Name: ' + s['Student Name'], 'Country: ' + s['Country'], 'Interested in: ' + s['Study Level'],
    'Preferred course: ' + s['Course'], 'Budget: ' + s['Budget'], 'Intake: ' + s['Intake'],
    'Lead score: ' + s['Lead Score'] + '/100', 'Status: Ready to apply', '',
    'Source: ' + s['Discovery Source'] + (s['Source Link'] ? ' – ' + s['Source Link'] : ''), '',
    'Recommended next action: Contact student personally and prepare the QETC referral.', 'Reference: ' + s['Ref']
  ].join('\n');
  return sendMail_(notifyEmail_(), '🎓 READY TO APPLY – ' + s['Student Name'] + ' (' + s['Country'] + ')', body);
}

function notifyOpportunity_(item, cls) {
  const body = [
    'PROMISING STUDENT DISCOVERED (public post)', '',
    'Platform: ' + item.platform + ' – ' + item.community,
    'Title: ' + item.title,
    'Posted: ' + (item.created ? fmtDate_(item.created) : 'unknown'),
    'Relevance: ' + cls.score + '/100 (' + cls.band + ')',
    'Country: ' + (cls.country || 'not stated') + ' | Level: ' + (cls.level || 'not stated') + ' | Course: ' + (cls.course || 'not stated'),
    'Asks for recommendations publicly: ' + (cls.invites ? 'YES' : 'no'),
    '', 'Why: ' + cls.reasons.join('; '),
    '', 'Link: ' + item.link,
    '', 'Recommended next action: Read the post. If replying is allowed by the community rules, post a helpful public reply (a draft is in the "' + CONFIG.SHEETS.OPPORTUNITIES + '" sheet). Do not send unsolicited private messages.'
  ].join('\n');
  return sendMail_(notifyEmail_(), '🔎 Promising student post (' + cls.score + '/100): ' + clean_(item.title, 70), body);
}

/** Error alerts, throttled so a broken source can't flood your inbox. */
function notifyError_(key, message) {
  const props = PropertiesService.getScriptProperties();
  const k = 'ERRMAIL_' + key;
  const last = Number(props.getProperty(k) || 0);
  if (Date.now() - last < CONFIG.ERROR_EMAIL_COOLDOWN_MIN * 60000) return false;
  props.setProperty(k, String(Date.now()));
  return sendMail_(notifyEmail_(), '⚠️ Recruitment system problem: ' + key, message + '\n\nOpen the "System Log" sheet for details. The system will keep retrying automatically.');
}

/** Daily summary (time-driven trigger). */
function sendDailyDigest() {
  const started = Date.now();
  try {
    const since = Date.now() - 24 * 3600000;
    const opps = readObjects_(CONFIG.SHEETS.OPPORTUNITIES).filter(o => new Date(o['Found']).getTime() >= since)
      .sort((a, b) => b['Relevance Score'] - a['Relevance Score']);
    const students = readObjects_(CONFIG.SHEETS.STUDENTS);
    const newEnq = students.filter(s => new Date(s['Created']).getTime() >= since && s['Consent Status'] === 'GIVEN');
    const due = students.filter(s => s['Next Action Due'] && new Date(s['Next Action Due']).getTime() <= Date.now() &&
      ['NOT INTERESTED', 'COMMISSION PAID', 'NEW LEAD'].indexOf(s['Status']) === -1);
    const h = healthSnapshot_();
    if (!opps.length && !newEnq.length && !due.length) { log_('digest', 'OK', started, 0, 0, 'Nothing new – no email sent'); return; }
    const lines = ['DAILY RECRUITMENT SUMMARY – ' + fmtDate_(new Date(), 'EEE d MMM yyyy'), '',
      'System status: ' + h.status + ' | Last successful discovery: ' + h.lastSuccess, '',
      'NEW ENQUIRIES (24h): ' + newEnq.length];
    newEnq.forEach(s => lines.push('  • ' + s['Student Name'] + ' (' + s['Country'] + ') – ' + s['Course'] + ' – ' + s['Lead Score'] + '/100 – ' + s['Status']));
    lines.push('', 'FOLLOW-UPS DUE: ' + due.length);
    due.slice(0, 15).forEach(s => lines.push('  • ' + s['Ref'] + ' ' + s['Student Name'] + ' – ' + s['Status'] + ' – ' + s['Next Action']));
    lines.push('', 'NEW PUBLIC POSTS FOUND (24h): ' + opps.length);
    opps.slice(0, 10).forEach(o => lines.push('  • [' + o['Relevance Score'] + '] ' + o['Title'] + '\n    ' + o['Link']));
    sendMail_(notifyEmail_(), '📋 Daily recruitment summary: ' + newEnq.length + ' enquiries, ' + opps.length + ' posts, ' + due.length + ' follow-ups', lines.join('\n'));
    log_('digest', 'OK', started, opps.length, newEnq.length, 'Digest sent');
  } catch (e) {
    log_('digest', 'ERROR', started, 0, 0, e.message);
    notifyError_('digest', e.message);
  }
}


// ===================== Dashboard.gs =====================
/** Admin dashboard data (used by the Dashboard sheet and the web dashboard). */

function statusIndex_(s) { return CONFIG.STATUSES.indexOf(String(s || '').trim()); }

function countBy_(rows, fn) {
  const m = {};
  rows.forEach(r => { const k = fn(r); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.keys(m).map(k => ({ key: k, count: m[k] })).sort((a, b) => b.count - a.count);
}

function pct_(a, b) { return b ? Math.round((a / b) * 1000) / 10 : 0; }

function getDashboardData_() {
  const students = readObjects_(CONFIG.SHEETS.STUDENTS);
  const opps = readObjects_(CONFIG.SHEETS.OPPORTUNITIES);
  const active = students.filter(s => s['Status'] !== 'NOT INTERESTED');
  const reached = st => active.filter(s => statusIndex_(s['Status']) >= statusIndex_(st)).length;
  const weekAgo = Date.now() - 7 * 86400000;

  const enquiries = students.filter(s => s['Consent Status'] === 'GIVEN');
  const qualified = reached('QUALIFIED');
  const applied = reached('APPLICATION SUBMITTED');
  const enrolled = reached('ENROLLED');
  const offered = active.filter(s => s['Status'] === 'ADMISSION OFFERED').length;
  const comm = commissionSummary_();
  const enrolledWithoutPaid = active.filter(s => ['ENROLLED', 'COMMISSION PENDING'].indexOf(s['Status']) !== -1).length;

  const followUps = active.filter(s => s['Next Action Due'] && new Date(s['Next Action Due']).getTime() <= Date.now() + 86400000 &&
    ['COMMISSION PAID', 'NEW LEAD'].indexOf(s['Status']) === -1)
    .sort((a, b) => new Date(a['Next Action Due']) - new Date(b['Next Action Due'])).slice(0, 20)
    .map(s => ({ ref: s['Ref'], name: s['Student Name'], status: s['Status'], action: s['Next Action'], due: fmtDate_(new Date(s['Next Action Due'])) }));

  const recent = enquiries.slice().sort((a, b) => new Date(b['Created']) - new Date(a['Created'])).slice(0, 10)
    .map(s => ({ ref: s['Ref'], date: fmtDate_(new Date(s['Created'])), name: s['Student Name'], country: s['Country'], course: s['Course'], level: s['Study Level'], score: s['Lead Score'], status: s['Status'], dup: s['Duplicate Of'] }));

  const topOpps = opps.filter(o => o['Review Status'] === 'NEW').sort((a, b) => b['Relevance Score'] - a['Relevance Score']).slice(0, 10)
    .map(o => ({ score: o['Relevance Score'], title: o['Title'], link: o['Link'], platform: o['Platform'], community: o['Community'] }));

  return {
    generated: fmtDate_(new Date()),
    kpis: {
      totalLeads: students.length,
      newEnquiries: enquiries.filter(s => new Date(s['Created']).getTime() >= weekAgo).length,
      qualified, readyToApply: active.filter(s => s['Status'] === 'READY TO APPLY').length,
      applicationsSubmitted: applied, enrolments: enrolled,
      potentialCommission: (offered + enrolledWithoutPaid) * CONFIG.COMMISSION_PER_ENROLMENT_USD,
      commissionReceived: comm.received, commissionConfirmedPending: comm.confirmedPending,
      opportunitiesTotal: opps.length, opportunitiesToReview: opps.filter(o => o['Review Status'] === 'NEW').length
    },
    conversion: {
      enquiryToQualified: pct_(qualified, enquiries.length),
      qualifiedToApplied: pct_(applied, qualified),
      appliedToEnrolled: pct_(enrolled, applied),
      enquiryToEnrolled: pct_(enrolled, enquiries.length)
    },
    byCountry: countBy_(students, s => s['Country']).slice(0, 15),
    byPlatform: countBy_(students.map(s => ({ p: String(s['Discovery Source'] || '').split(' ')[0] })).concat(opps.map(o => ({ p: o['Platform'] }))), r => r.p).slice(0, 10),
    byCourse: countBy_(students, s => s['Course']).slice(0, 10),
    byStatus: CONFIG.STATUSES.map(st => ({ key: st, count: students.filter(s => s['Status'] === st).length })),
    recent, followUps, topOpps,
    health: healthSnapshot_()
  };
}

/** Writes the Dashboard sheet (readable in the Google Sheets phone app). */
function refreshDashboard() {
  const d = getDashboardData_();
  const sh = sheet_(CONFIG.SHEETS.DASHBOARD);
  sh.clearContents();
  const k = d.kpis;
  const rows = [
    ['RECRUITMENT DASHBOARD – ' + CONFIG.CONSULTANT_NAME, 'Updated ' + d.generated],
    ['', ''],
    ['TOTAL STUDENT LEADS', k.totalLeads],
    ['NEW ENQUIRIES (last 7 days)', k.newEnquiries],
    ['QUALIFIED STUDENTS', k.qualified],
    ['READY TO APPLY', k.readyToApply],
    ['APPLICATIONS SUBMITTED', k.applicationsSubmitted],
    ['SUCCESSFUL ENROLMENTS', k.enrolments],
    ['POTENTIAL COMMISSION (USD, not earned yet)', k.potentialCommission],
    ['COMMISSION RECEIVED (USD, confirmed + paid)', k.commissionReceived],
    ['Public posts discovered (total)', k.opportunitiesTotal],
    ['Public posts waiting for your review', k.opportunitiesToReview],
    ['', ''],
    ['CONVERSION RATES', ''],
    ['Enquiry → Qualified %', d.conversion.enquiryToQualified],
    ['Qualified → Application %', d.conversion.qualifiedToApplied],
    ['Application → Enrolled %', d.conversion.appliedToEnrolled],
    ['Enquiry → Enrolled %', d.conversion.enquiryToEnrolled],
    ['', ''],
    ['SYSTEM STATUS', d.health.status],
    ['Last successful discovery run', d.health.lastSuccess],
    ['Next scheduled discovery run', d.health.nextRun],
    ['', '']
  ];
  const block = (title, list) => { rows.push([title, 'Count']); list.forEach(x => rows.push([x.key, x.count])); rows.push(['', '']); };
  block('LEADS BY COUNTRY', d.byCountry);
  block('LEADS BY PLATFORM', d.byPlatform);
  block('MOST POPULAR COURSES', d.byCourse);
  rows.push(['FOLLOW-UP REMINDERS (due within 24h)', '']);
  if (!d.followUps.length) rows.push(['None', '']);
  d.followUps.forEach(f => rows.push([f.ref + ' ' + f.name + ' – ' + f.action, 'Due ' + f.due]));
  rows.push(['', '']);
  rows.push(['RECENT ENQUIRIES', '']);
  if (!d.recent.length) rows.push(['None yet', '']);
  d.recent.forEach(r => rows.push([r.date + ' ' + r.name + ' (' + r.country + ') ' + (r.course || ''), r.score + '/100 ' + r.status]));
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold');
  return d;
}

/** Refreshes at most once every 2 minutes so enquiries stay fast. */
function refreshDashboardSafe_() {
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get('DASH_FRESH')) return;
    cache.put('DASH_FRESH', '1', 120);
    refreshDashboard();
    writeStatusSheet_();
  } catch (e) {
    console.error('dashboard refresh failed: ' + e.message);
  }
}


// ===================== Health.gs =====================
/** Health monitoring: last/next run, totals, status and stale-run alerts. */

function healthSnapshot_() {
  const p = PropertiesService.getScriptProperties();
  const lastSuccess = p.getProperty('LAST_DISCOVERY_SUCCESS');
  const lastStart = p.getProperty('LAST_DISCOVERY_START');
  const lastStatus = p.getProperty('LAST_DISCOVERY_STATUS') || '';
  const installed = p.getProperty('TRIGGERS_INSTALLED') === 'yes';
  const intervalMs = CONFIG.DISCOVERY_EVERY_HOURS * 3600000;
  let status;
  if (!installed) status = 'NOT DEPLOYED – automation triggers not installed (run setup)';
  else if (!lastStart) status = 'WAITING FOR FIRST RUN';
  else if (!lastSuccess) status = 'FAILING – no successful run yet (' + lastStatus + ')';
  else if (Date.now() - new Date(lastSuccess).getTime() > 2 * intervalMs + 3600000) status = 'WARNING – discovery has not succeeded recently';
  else if (lastStatus === 'PARTIAL') status = 'RUNNING – some sources failing (see Discovery Sources sheet)';
  else status = 'HEALTHY';
  const next = lastStart ? new Date(new Date(lastStart).getTime() + intervalMs) : null;
  return {
    status, lastStatus,
    lastSuccess: lastSuccess ? fmtDate_(new Date(lastSuccess)) : 'never',
    lastStart: lastStart ? fmtDate_(new Date(lastStart)) : 'never',
    nextRun: installed ? (next ? '≈ ' + fmtDate_(next) : 'within ' + CONFIG.DISCOVERY_EVERY_HOURS + 'h of setup') : 'not scheduled',
    stackExchangeQuotaRemaining: p.getProperty('SE_QUOTA_REMAINING') || 'unknown',
    mailQuotaRemaining: (function () { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return 'unknown'; } })()
  };
}

/** Time-driven trigger (every 6 hours): alerts you if automation has stalled. */
function healthCheck() {
  const started = Date.now();
  const h = healthSnapshot_();
  writeStatusSheet_();
  if (/^(WARNING|FAILING)/.test(h.status)) {
    notifyError_('health', 'Health check: ' + h.status + '\nLast successful discovery: ' + h.lastSuccess + '\nLast attempt: ' + h.lastStart +
      '\n\nCommon fixes: open Extensions → Apps Script → Executions to see errors; check the "Discovery Sources" sheet "Last Result" column.');
  }
  log_('health', /^HEALTHY|RUNNING|WAITING/.test(h.status) ? 'OK' : 'WARNING', started, 0, 0, h.status);
  return h;
}

function writeStatusSheet_() {
  const h = healthSnapshot_();
  const students = readObjects_(CONFIG.SHEETS.STUDENTS).length;
  const opps = readObjects_(CONFIG.SHEETS.OPPORTUNITIES).length;
  const url = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL') || '';
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '';
  const rows = [
    ['Current system status', h.status],
    ['Last successful discovery run', h.lastSuccess],
    ['Last discovery attempt', h.lastStart + ' (' + (h.lastStatus || '-') + ')'],
    ['Next scheduled discovery run', h.nextRun],
    ['Total public posts discovered', opps],
    ['Total student leads in CRM', students],
    ['Stack Exchange API requests left today', h.stackExchangeQuotaRemaining],
    ['Emails left today (Google limit)', h.mailQuotaRemaining],
    ['Private dashboard link (do not share)', url && key ? url + '?page=dashboard&key=' + key : 'Deploy the web app, then run "Save web app URL" from the menu'],
    ['Status checked at', fmtDate_(new Date())]
  ];
  const sh = sheet_(CONFIG.SHEETS.STATUS);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
}


// ===================== Api.gs =====================
/**
 * Web app endpoints (Deploy → New deployment → Web app, Execute as: Me, Access: Anyone).
 * The public website posts enquiries here. The admin dashboard is protected by ADMIN_KEY.
 */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isAdmin_(key) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return !!real && !!key && String(key) === real;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'health') {
    return json_({ ok: true, service: 'qetc-recruitment', time: new Date().toISOString() });
  }
  if (p.page === 'dashboard' || p.action === 'dashboard_data') {
    if (!isAdmin_(p.key)) return HtmlService.createHtmlOutput('<h3>Access denied</h3><p>Open the dashboard link from the "System Status" sheet.</p>');
    if (p.action === 'dashboard_data') return json_(getDashboardData_());
    const t = HtmlService.createTemplateFromFile('Dashboard');
    t.data = JSON.stringify(getDashboardData_()).replace(/</g, '\\u003c');
    return t.evaluate().setTitle('Recruitment Dashboard – Ismail Hassan').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return json_({ ok: true, message: 'Ismail Hassan student enquiry service is running. Use the website to send an enquiry.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, errors: ['Invalid request.'] });
  }
  try {
    if (req.action === 'enquiry') return json_(handleEnquiry_(req));
    if (req.action === 'delete_request') return json_(deleteStudentData_(req.ref, req.email));
    return json_({ ok: false, errors: ['Unknown action.'] });
  } catch (err) {
    log_('api', 'ERROR', null, 0, 0, (req && req.action) + ': ' + (err.stack || err.message));
    notifyError_('api', 'A website request failed: ' + err.message);
    return json_({ ok: false, errors: ['Sorry, something went wrong on our side. Please try again in a few minutes or contact Ismail on WhatsApp.'] });
  }
}

function handleEnquiry_(req) {
  // Spam protection: hidden honeypot field + minimum time on page + global rate limit.
  if (req.hp) return { ok: true, ref: 'QM-RECEIVED' }; // silently drop bots
  if (typeof req.elapsedMs === 'number' && req.elapsedMs < 3000) return { ok: false, errors: ['Please take a moment to complete the form.'] };
  const cache = CacheService.getScriptCache();
  const bucket = 'rate_' + Math.floor(Date.now() / 600000);
  const count = Number(cache.get(bucket) || 0) + 1;
  cache.put(bucket, String(count), 900);
  if (count > CONFIG.ENQUIRY_RATE_LIMIT_PER_10_MIN) {
    notifyError_('rate-limit', 'More than ' + CONFIG.ENQUIRY_RATE_LIMIT_PER_10_MIN + ' enquiries in 10 minutes – possible spam. Extra enquiries were refused temporarily.');
    return { ok: false, errors: ['We are receiving a lot of enquiries right now. Please try again in 10 minutes or contact Ismail on WhatsApp.'] };
  }

  const started = Date.now();
  const result = saveEnquiry_(req.data || {});
  if (!result.ok) return result;
  notifyNewEnquiry_(result);
  sendStudentConfirmation_(result);
  log_('enquiry', 'OK', started, 1, 1, result.ref + ' score ' + result.score + ' ' + result.status + (result.duplicateOf ? ' dup of ' + result.duplicateOf : ''));
  refreshDashboardSafe_();
  return { ok: true, ref: result.ref, status: result.status };
}


// ===================== Setup.gs =====================
/**
 * ONE-CLICK SETUP. In the Apps Script editor choose "setup" in the function list and press ▶ Run.
 * Safe to run again: it never deletes your data.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('ADMIN_KEY')) props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, ''));

  Object.keys(HEADERS).forEach(name => ensureSheet_(ss, name, HEADERS[name]));
  ensureSheet_(ss, CONFIG.SHEETS.DASHBOARD, null);
  ensureSheet_(ss, CONFIG.SHEETS.STATUS, null);

  // Default discovery sources (only if the sheet is empty).
  const src = ss.getSheetByName(CONFIG.SHEETS.SOURCES);
  if (src.getLastRow() < 2) {
    src.getRange(2, 1, DEFAULT_SOURCES.length, 5).setValues(DEFAULT_SOURCES);
  }

  // Drop-down lists so you can change statuses without typing.
  const students = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
  const statusCol = HEADERS.Students.indexOf('Status') + 1;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.STATUSES, true).setAllowInvalid(false).build();
  students.getRange(2, statusCol, students.getMaxRows() - 1, 1).setDataValidation(rule);
  const opp = ss.getSheetByName(CONFIG.SHEETS.OPPORTUNITIES);
  const revCol = HEADERS['Discovered Opportunities'].indexOf('Review Status') + 1;
  opp.getRange(2, revCol, opp.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['NEW', 'REVIEWED', 'REPLIED PUBLICLY', 'STUDENT CONTACTED US', 'CONVERTED', 'IGNORED'], true).build());
  const com = ss.getSheetByName(CONFIG.SHEETS.COMMISSION);
  com.getRange(2, 5, com.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['NOT YET', 'YES', 'NO'], true).build());
  com.getRange(2, 6, com.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['NOT DUE YET', 'INVOICED / AWAITING', 'PAID', 'NOT ELIGIBLE'], true).build());

  installTriggers_();
  writeStatusSheet_();
  refreshDashboard();
  log_('setup', 'OK', null, 0, 0, 'Setup completed');
  try {
    SpreadsheetApp.getUi().alert('Setup complete ✅\n\nNext: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). Then use the menu "🎓 Recruitment → Save web app URL".');
  } catch (e) { /* running without UI */ }
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && sh.getMaxColumns() < headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns()); // new sheets only have 26 columns
  }
  if (headers) {
    const existing = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    if (!existing.filter(String).length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0b3d2e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    } else {
      // Add any new columns introduced by an update, at the end.
      const missing = headers.filter(h => existing.indexOf(h) === -1);
      if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  }
  return sh;
}

function installTriggers_() {
  const keep = ['runDiscovery', 'sendDailyDigest', 'healthCheck', 'onStudentSheetEdit'];
  ScriptApp.getProjectTriggers().forEach(t => { if (keep.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('runDiscovery').timeBased().everyHours(CONFIG.DISCOVERY_EVERY_HOURS).create();
  ScriptApp.newTrigger('sendDailyDigest').timeBased().everyDays(1).atHour(CONFIG.DIGEST_HOUR).create();
  ScriptApp.newTrigger('healthCheck').timeBased().everyHours(6).create();
  ScriptApp.newTrigger('onStudentSheetEdit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  PropertiesService.getScriptProperties().setProperty('TRIGGERS_INSTALLED', 'yes');
}

/** Installable onEdit trigger (can send email, unlike a simple trigger). */
function onStudentSheetEdit(e) {
  try { handleStudentEdit_(e); } catch (err) { log_('onEdit', 'ERROR', null, 0, 0, err.message); }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎓 Recruitment')
    .addItem('Run discovery now', 'runDiscovery')
    .addItem('Refresh dashboard', 'menuRefresh')
    .addItem('Convert selected post → student lead', 'convertSelectedOpportunity')
    .addItem('Delete a student’s data…', 'menuDeleteStudent')
    .addSeparator()
    .addItem('Save web app URL', 'saveWebAppUrl')
    .addItem('Send test notification email', 'sendTestNotification')
    .addItem('Re-run setup', 'setup')
    .addItem('Stop all automation', 'stopAutomation')
    .addToUi();
}

function menuRefresh() { refreshDashboard(); writeStatusSheet_(); }

function saveWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Paste your Web app URL (ends with /exec):');
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const url = r.getResponseText().trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) { ui.alert('That does not look like a web app URL ending in /exec.'); return; }
  PropertiesService.getScriptProperties().setProperty('WEB_APP_URL', url);
  writeStatusSheet_();
  ui.alert('Saved. Your private dashboard link is in the "System Status" sheet.\n\nNow put this same URL into website/assets/config.js (API_URL).');
}

function sendTestNotification() {
  const ok = sendMail_(notifyEmail_(), 'Test: recruitment system notifications work ✅', 'If you can read this, email alerts are working.\n\nThis is a TEST – no student was created.');
  try { SpreadsheetApp.getUi().alert(ok ? 'Test email sent to ' + notifyEmail_() : 'Email failed – see System Log.'); } catch (e) { /* no UI */ }
}

function menuDeleteStudent() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Student reference (e.g. QM-261112-AB3CD):'); if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('Email address on that record:'); if (b.getSelectedButton() !== ui.Button.OK) return;
  ui.alert(deleteStudentData_(a.getResponseText(), b.getResponseText()).message);
}

function stopAutomation() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  PropertiesService.getScriptProperties().setProperty('TRIGGERS_INSTALLED', 'no');
  try { SpreadsheetApp.getUi().alert('All automation stopped. Run setup again to restart.'); } catch (e) { /* no UI */ }
}
