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
