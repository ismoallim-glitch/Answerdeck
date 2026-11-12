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
