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
