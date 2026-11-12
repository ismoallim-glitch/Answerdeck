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
