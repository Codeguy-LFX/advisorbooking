/* /ria-playbook: the email box. Saves the email for the quiz (sessionStorage ab_prefill, this tab only, never in the
   address), posts one email_capture record to the CRM, then goes to the quiz (AB_CONFIG.playbookNext, default the
   preview route A quiz). The "Get the Playbook" buttons move the cursor into the box at the top. */
(function () {
  'use strict';
  var d = document, C = window.AB_CONFIG || {}, T0 = Date.now(), utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('ab_utm') || '{}') || {}; } catch (e) {}
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^(gclid|gbraid|wbraid|fbclid|src|ref)$/.test(k)) utm[k] = v; }); sessionStorage.setItem('ab_utm', JSON.stringify(utm)); } catch (e) {}
  try { var ck = {}, qs = new URLSearchParams(location.search); ['gclid', 'gbraid', 'wbraid'].forEach(function (k) { var v = qs.get(k); if (v) ck[k] = v; }); if (ck.gclid || ck.gbraid || ck.wbraid) { ck.t = Date.now(); localStorage.setItem('ab_click', JSON.stringify(ck)); } } catch (e) {}
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function post(p) {
    var url = String(C.ghlWebhookUrl || '').trim(); if (!url) return;
    var b = new URLSearchParams(); Object.keys(p).forEach(function (k) { b.append(k, p[k] == null ? '' : String(p[k])); });
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, b)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: b }).catch(function () {}); } catch (e) {}
  }
  var sent = false;
  Array.prototype.forEach.call(d.querySelectorAll('form.v4-ec'), function (form) {
    var input = form.querySelector('input[type=email]'), err = form.parentNode.querySelector('.k-ec__err') || form.querySelector('.k-ec__err'), btn = form.querySelector('button');
    function bad(on) { form.classList.toggle('is-bad', on); var box = form.querySelector('.k-ec'); if (box) box.classList.toggle('is-bad', on); if (err) err.hidden = !on; input.setAttribute('aria-invalid', on ? 'true' : 'false'); }
    input.addEventListener('input', function () { if (err && !err.hidden && emailOk(input.value.trim())) bad(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (sent) return;
      var v = input.value.trim();
      if (!emailOk(v)) { bad(true); input.focus(); return; }
      bad(false); sent = true;
      var hp = form.querySelector('input[name=website]'), bot = hp && hp.value ? 'honeypot' : (Date.now() - T0 < 2000 ? 'too_fast' : '');
      var pre = {}; try { pre = JSON.parse(sessionStorage.getItem('ab_prefill') || '{}') || {}; } catch (x) {}
      if (pre.email !== v) pre.at = Date.now(); pre.email = v; try { sessionStorage.setItem('ab_prefill', JSON.stringify(pre)); } catch (x) {}
      post({ stage: 'email_capture', email: v, page_url: location.href, cta: 'playbook-' + (form.getAttribute('data-ec') || ''),
        utm_source: utm.utm_source || '', utm_medium: utm.utm_medium || '', utm_campaign: utm.utm_campaign || '', utm_term: utm.utm_term || '', utm_content: utm.utm_content || '', gclid: utm.gclid || '', fbclid: utm.fbclid || '',
        referrer: d.referrer, bot_flag: bot ? 'true' : 'false', bot_reason: bot, submitted_at: new Date().toISOString(), funnel_entry: String(C.funnelEntry || ''), lead_magnet: 'Past Prospect Playbook' });
      if (btn) { btn.disabled = true; btn.classList.add('is-busy'); var l = btn.querySelector('span'); if (l) l.textContent = 'One moment...'; }
      var next = String(C.playbookNext || '/preview/a/'), q = location.search;
      setTimeout(function () { location.href = next + (q && next.indexOf('?') < 0 ? q : ''); }, 250);
    });
  });
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) location.reload(); });
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-focus]') : null; if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var i = d.getElementById('v4Email'); if (!i) return; e.preventDefault();
    var r = i.getBoundingClientRect(); try { window.scrollTo({ top: Math.max(0, r.top + window.pageYOffset - Math.round(window.innerHeight * 0.3)), behavior: 'smooth' }); } catch (x) { window.scrollTo(0, 0); }
    setTimeout(function () { try { i.focus({ preventScroll: true }); } catch (x) { i.focus(); } }, 450);
  });
})();
