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
