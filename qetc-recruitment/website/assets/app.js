/* Website behaviour: settings, enquiry form, chat assistant, privacy deletion form. */
(function () {
  'use strict';
  var C = window.SITE_CONFIG || {};
  var loadedAt = Date.now();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function waUrl(text) { return 'https://wa.me/' + String(C.WHATSAPP_NUMBER).replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : ''); }

  // ---------- Settings-driven content
  if (C.WHATSAPP_NUMBER) {
    $$('[data-wa]').forEach(function (a) { a.href = waUrl('Hello Ismail, I would like to study in Malaysia.'); a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; });
    $$('[data-wa-card]').forEach(function (c) { c.hidden = false; });
  }
  if (C.CONTACT_EMAIL) {
    $$('[data-email]').forEach(function (a) { a.href = 'mailto:' + C.CONTACT_EMAIL; a.textContent = C.CONTACT_EMAIL; });
    $$('[data-email-card]').forEach(function (c) { c.hidden = false; });
  }
  var uni = $('#uni-list');
  if (uni) {
    var list = C.CONFIRMED_UNIVERSITIES || [];
    uni.innerHTML = list.length ? list.map(function (u) {
      return '<div class="card"><h3>' + esc(u.name) + '</h3><p class="muted small">' + esc([u.type, u.city].filter(Boolean).join(' · ')) + '</p>' +
        (u.url ? '<a href="' + esc(u.url) + '" target="_blank" rel="noopener">Official website</a>' : '') + '</div>';
    }).join('') : ['Public universities', 'Private universities', 'International branch campuses'].map(function (t, i) {
      return '<div class="card"><h3>' + t + '</h3><p class="muted small">' + [
        'Government-funded universities, some of which admit international students to selected programmes.',
        'A wide range of private universities and university colleges with English-taught programmes and several intakes a year.',
        'Malaysian campuses of foreign universities, offering degrees awarded by the home university.'][i] + '</p></div>';
    }).join('');
  }
  var pk = $('#packages');
  if (pk) {
    pk.innerHTML = C.PACKAGES_VERIFIED && (C.PACKAGES || []).length
      ? '<h3>QETC service packages</h3><div class="grid g3">' + C.PACKAGES.map(function (p) {
        return '<div class="card"><h3>' + esc(p.name) + '</h3><p style="font-size:24px;font-weight:700">' + esc(p.price) + '</p><p class="muted small">' + esc(p.notes || '') + '</p></div>';
      }).join('') + '</div><p class="muted small">Package prices are QETC service charges only and do not include tuition, accommodation, visa, insurance, flights or other university/government fees. Confirmed with you in writing before you commit.</p>'
      : '<p class="note"><b>QETC service packages:</b> QETC Malaysia offers service packages (for example Silver, Golden and Diamond) covering different levels of support. Package contents and prices can change, so I’ll send you the current, confirmed details before you decide. Package charges are separate from tuition and other costs above.</p>';
  }

  // ---------- Mobile menu
  var mb = $('.menu-btn'), nav = $('#nav');
  if (mb && nav) {
    mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); }); });
  }

  // ---------- API
  function api(payload) {
    if (!C.API_URL) return Promise.reject(new Error('not-configured'));
    return fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function fallbackText(err) {
    var base = err && err.message === 'not-configured'
      ? 'The online enquiry system is not connected yet.'
      : 'Sorry, we could not send your enquiry right now (connection problem).';
    return base + (C.WHATSAPP_NUMBER ? ' Please message Ismail on WhatsApp instead.' : (C.CONTACT_EMAIL ? ' Please email ' + C.CONTACT_EMAIL + ' instead.' : ' Please try again later.'));
  }

  // ---------- Enquiry form
  var form = $('#enquiry-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = $('#form-msg');
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      data.consent = !!form.consent.checked;
      ['accommodation', 'pickup', 'visaHelp'].forEach(function (k) { data[k] = form[k].checked ? 'Yes' : ''; });
      data.source = 'Website form';
      var errs = [];
      if (!data.name) errs.push('your name');
      if (!data.country) errs.push('your country');
      if (!data.email && !data.phone) errs.push('an email or WhatsApp number');
      if (!data.consent) errs.push('your consent (tick the box)');
      if (errs.length) { msg.className = 'form-msg err'; msg.textContent = 'Please add ' + errs.join(', ') + '.'; return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      var hp = data.website; delete data.website;
      api({ action: 'enquiry', data: data, hp: hp || '', elapsedMs: Date.now() - loadedAt }).then(function (res) {
        if (res.ok) {
          msg.className = 'form-msg ok';
          msg.innerHTML = '<b>Thank you, ' + esc(data.name.split(' ')[0]) + '!</b> Your enquiry has been received. Your reference is <b>' + esc(res.ref) + '</b>. Ismail will reply personally, usually within 1–2 working days.';
          form.reset();
        } else {
          msg.className = 'form-msg err'; msg.textContent = (res.errors || ['Something went wrong.']).join(' ');
        }
      }).catch(function (err) {
        msg.className = 'form-msg err'; msg.textContent = fallbackText(err);
      }).then(function () { btn.disabled = false; btn.textContent = 'Send my enquiry'; });
    });
  }

  // ---------- Chat assistant
  var chatEl = $('#chat');
  if (chatEl && window.ChatEngine) {
    var log = $('#chat-log'), quick = $('#chat-quick'), input = $('#chat-input'), engine = null;
    var add = function (text, who) { var d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    var setQuick = function (opts) {
      quick.innerHTML = '';
      (opts || []).forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', function () { send(q); }); quick.appendChild(b); });
    };
    var render = function (r) {
      r.messages.forEach(function (m, i) { setTimeout(function () { add(m, 'bot'); }, 250 * i); });
      setQuick(r.quick);
      if (r.submit) {
        api({ action: 'enquiry', data: r.submit, hp: '', elapsedMs: r.submit.elapsedMs }).then(function (res) {
          setTimeout(function () {
            add(res.ok ? 'Done! ✅ Your reference is ' + res.ref + '. Ismail will contact you personally, usually within 1–2 working days.'
              : 'Sorry, there was a problem: ' + (res.errors || []).join(' '), 'bot');
          }, 400);
        }).catch(function (err) { setTimeout(function () { add(fallbackText(err), 'bot'); }, 400); });
      }
    };
    var send = function (text) {
      text = String(text || '').trim(); if (!text) return;
      add(text, 'me'); input.value = ''; setQuick(null);
      render(engine.reply(text));
    };
    var open = function () {
      chatEl.classList.add('open'); $('.chat-launch').hidden = true;
      if (!engine) { engine = window.ChatEngine.create(); render(engine.start()); }
      setTimeout(function () { input.focus(); }, 50);
    };
    $$('[data-open-chat]').forEach(function (b) { b.addEventListener('click', open); });
    $('#chat-close').addEventListener('click', function () { chatEl.classList.remove('open'); $('.chat-launch').hidden = false; });
    $('#chat-form').addEventListener('submit', function (ev) { ev.preventDefault(); send(input.value); });
  }

  // ---------- Privacy page: deletion request
  var del = $('#delete-form');
  if (del) {
    del.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var m = $('#delete-msg');
      api({ action: 'delete_request', ref: del.ref.value.trim(), email: del.email.value.trim() }).then(function (res) {
        m.className = 'form-msg ' + (res.ok && res.deleted ? 'ok' : 'err'); m.textContent = res.message || (res.errors || []).join(' ');
      }).catch(function (err) { m.className = 'form-msg err'; m.textContent = fallbackText(err); });
    });
  }
})();
