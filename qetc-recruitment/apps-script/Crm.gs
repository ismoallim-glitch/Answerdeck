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
