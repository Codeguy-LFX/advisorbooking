/* Advisor Booking landers (/v2/): the email-first CTA, the rotating hero word, the blog topic filter, and campaign
   tag capture. No dependencies; pilot.js handles the nav, smooth scrolling, reveals and the FAQ.

   Email-first CTA ("Ready to talk?"): the visitor gives a work email, then "Book intro call" takes them to the
   qualifying form with that email already filled in. Before leaving it:
     - saves the email for the form (sessionStorage ab_prefill, this tab only; never put in the URL)
     - posts { event: 'email_capture', email, page, utm } to AB_CONFIG.ghlWebhookUrl when it is set
     - pushes ab_email_capture to window.dataLayer for GTM (no email in the event)
   Where it goes: AB_CONFIG.landerNext (default "fit/", the Funnel 4 form), relative to the site root. */
(function () {
  'use strict';
  var doc = document, CFG = window.AB_CONFIG || {};
  doc.documentElement.classList.remove('no-js');
  var ROOT = (doc.body && doc.body.getAttribute('data-root')) || '';

  /* ---------- campaign tags for the visit (same store as site.js and the form) ---------- */
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('ab_utm') || '{}') || {}; } catch (e) {}
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^(gclid|fbclid|src|ref)$/.test(k)) utm[k] = v; }); } catch (e) {}
  try { sessionStorage.setItem('ab_utm', JSON.stringify(utm)); } catch (e) {}

  /* Nothing is pushed for someone the qualifying form's tracking gate turned off (Funnel 4: under $50M AUM). */
  function trackOff() { try { var s = JSON.parse(localStorage.getItem('ab_apply_v1') || 'null'); return !!(s && s.track === 'off'); } catch (e) { return false; } }
  function push(ev) { if (trackOff()) return; try { (window.dataLayer = window.dataLayer || []).push(ev); } catch (e) {} }
  push({ event: 'ab_lander_view', ab_lander: doc.body.getAttribute('data-lander') || location.pathname });

  /* ---------- the email-first form ---------- */
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function post(payload) {
    var url = String(CFG.ghlWebhookUrl || '').trim();
    if (!url) return;
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
      fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {});
    } catch (e) {}
  }
  var T0 = Date.now();
  Array.prototype.forEach.call(doc.querySelectorAll('form[data-ec]'), function (form) {
    var input = form.querySelector('input[type=email]'), btn = form.querySelector('button[type=submit]');
    var err = form.parentNode.querySelector('.ec__err');
    function bad(on) { form.classList.toggle('is-bad', on); if (err) err.hidden = !on; input.setAttribute('aria-invalid', on ? 'true' : 'false'); }
    input.addEventListener('input', function () { if (form.classList.contains('is-bad') && emailOk(input.value.trim())) bad(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!emailOk(v)) { bad(true); input.focus(); return; }
      bad(false);
      var hp = form.querySelector('input[name=website]');
      var bot = (hp && hp.value) ? 'honeypot' : ((Date.now() - T0) < 2000 ? 'too_fast' : '');
      var pre = {}; try { pre = JSON.parse(sessionStorage.getItem('ab_prefill') || '{}') || {}; } catch (x) {}
      pre.email = v; try { sessionStorage.setItem('ab_prefill', JSON.stringify(pre)); } catch (x) {}
      post({ event: 'email_capture', stage: 'email_capture', email: v, page: location.pathname, cta: form.getAttribute('data-ec') || '',
             utm: utm, referrer: doc.referrer, bot_flag: bot ? 'true' : 'false', bot_reason: bot, ts_iso: new Date().toISOString() });
      var next = String(CFG.landerNext || 'fit/');
      var lander = doc.body.getAttribute('data-lander') || location.pathname, cta = form.getAttribute('data-ec') || '';
      if (/^fit[0-9]*\//.test(next)) {   // fit/ (Funnel 4) or fit5/ (Funnel 5)
        /* Going to the qualifying form: its tracking gate decides whether this event fires (AUM $50M+ only). */
        try { sessionStorage.setItem('ab_email_capture_pending', JSON.stringify({ lander: lander, cta: cta })); } catch (x) {}
      } else {
        push({ event: 'ab_email_capture', ab_lander: lander, ab_cta: cta });
      }
      if (btn) { btn.classList.add('is-wait'); var l = btn.querySelector('span'); if (l) l.textContent = 'One moment...'; }
      setTimeout(function () { location.href = /^https?:/.test(next) ? next : ROOT + next; }, 250);
    });
  });

  /* Nav and other "Book intro call" links that point at a form: scroll there (pilot.js), then put the cursor in it. */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-ec-focus]') : null;
    if (!a) return;
    var id = (a.getAttribute('href') || '').replace(/^#/, ''), box = id && doc.getElementById(id);
    var input = box && box.querySelector('input[type=email]');
    if (input) setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); } }, 700);
  });

  /* ---------- rotating word in the hero ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(doc.querySelectorAll('.rot'), function (rot) {
    var words = rot.querySelectorAll('.rot__w');
    if (!words.length) return;
    var i = 0; words[0].classList.add('is-on');
    if (reduce || words.length < 2) { rot.classList.add('rot--static'); return; }
    setInterval(function () {
      var cur = words[i]; i = (i + 1) % words.length; var nx = words[i];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      nx.classList.remove('is-out'); nx.classList.add('is-on');
      setTimeout(function () { cur.classList.remove('is-out'); }, 650);
    }, 2400);
  });

  /* ---------- blog topic filter ---------- */
  var bar = doc.querySelector('.bl-filter');
  if (bar) bar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-topic]'); if (!b) return;
    var t = b.getAttribute('data-topic');
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    Array.prototype.forEach.call(doc.querySelectorAll('.bl-card'), function (c) { c.hidden = !(t === 'all' || c.getAttribute('data-topic') === t); });
  });
})();
