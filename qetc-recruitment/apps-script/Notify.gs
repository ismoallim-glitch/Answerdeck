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
