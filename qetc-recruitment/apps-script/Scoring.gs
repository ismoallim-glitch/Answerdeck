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
