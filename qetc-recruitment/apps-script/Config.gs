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
  NOTIFY_EMAIL: '',

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
