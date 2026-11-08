/* Advisor Booking landers (/v2/): the email-first CTA, the rotating hero word, the blog topic filter, and campaign
   tag capture. No dependencies; pilot.js handles the nav, smooth scrolling, reveals and the FAQ.

   Email-first CTA ("Ready to talk?"): the visitor gives a work email, then "Book intro call" takes them to the
   qualifying form with that email already filled in. Before leaving it:
     - saves the email for the form (sessionStorage ab_prefill, this tab only; never put in the URL)
     - posts stage=email_capture, email, page and campaign tags (form-encoded) to AB_CONFIG.ghlWebhookUrl when set
     - pushes ab_email_capture to window.dataLayer for GTM (no email in the event)
   Where it goes: AB_CONFIG.landerNext (default "L1/", the qualifying form), relative to the site root. */
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
  /* Form-encoded: a simple cross-site request (no preflight), so the CRM gets it without CORS headers. */
  function post(p) {
    var url = String(CFG.ghlWebhookUrl || '').trim();
    if (!url) return;
    var body = new URLSearchParams();
    Object.keys(p).forEach(function (k) { body.append(k, p[k] === undefined || p[k] === null ? '' : String(p[k])); });
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, body)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {}); } catch (e) {}
  }
  var T0 = Date.now();
  Array.prototype.forEach.call(doc.querySelectorAll('form[data-ec]'), function (form) {
    var input = form.querySelector('input[type=email]'), btn = form.querySelector('button[type=submit]');
    var err = form.parentNode.querySelector('.ec__err');
    function bad(on) { form.classList.toggle('is-bad', on); if (err) err.hidden = !on; input.setAttribute('aria-invalid', on ? 'true' : 'false'); }
    input.addEventListener('input', function () { if (form.classList.contains('is-bad') && emailOk(input.value.trim())) bad(false); });
    var sent = false;
    window.addEventListener('pageshow', function (ev) { if (ev.persisted && sent) { sent = false; if (btn) { btn.disabled = false; btn.classList.remove('is-wait'); var l0 = btn.querySelector('span'); if (l0) l0.textContent = 'Book intro call'; } } });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sent) return;   // a second Enter or tap while the page is leaving
      var v = input.value.trim();
      if (!emailOk(v)) { bad(true); input.focus(); return; }
      bad(false); sent = true;
      var hp = form.querySelector('input[name=website]');
      var bot = (hp && hp.value) ? 'honeypot' : ((Date.now() - T0) < 2000 ? 'too_fast' : '');
      var pre = {}; try { pre = JSON.parse(sessionStorage.getItem('ab_prefill') || '{}') || {}; } catch (x) {}
      pre.email = v; try { sessionStorage.setItem('ab_prefill', JSON.stringify(pre)); } catch (x) {}
      post({ stage: 'email_capture', email: v, page_url: location.href, cta: form.getAttribute('data-ec') || '',
             utm_source: utm.utm_source || '', utm_medium: utm.utm_medium || '', utm_campaign: utm.utm_campaign || '',
             utm_term: utm.utm_term || '', utm_content: utm.utm_content || '', gclid: utm.gclid || '', fbclid: utm.fbclid || '',
             referrer: doc.referrer, bot_flag: bot ? 'true' : 'false', bot_reason: bot, submitted_at: new Date().toISOString() });
      var next = String(CFG.landerNext || 'L1/');
      var lander = doc.body.getAttribute('data-lander') || location.pathname, cta = form.getAttribute('data-ec') || '';
      if (/^(L[0-9]+|fit[0-9]*)\//.test(next)) {   // the qualifying form (L1/)
        /* Going to the qualifying form: its tracking gate decides whether this event fires (AUM $50M+ only). */
        try { sessionStorage.setItem('ab_email_capture_pending', JSON.stringify({ lander: lander, cta: cta })); } catch (x) {}
      } else {
        push({ event: 'ab_email_capture', ab_lander: lander, ab_cta: cta });
      }
      if (btn) { btn.disabled = true; btn.classList.add('is-wait'); var l = btn.querySelector('span'); if (l) l.textContent = 'One moment...'; }
      setTimeout(function () { location.href = /^https?:/.test(next) ? next : ROOT + next; }, 250);
    });
  });

  /* Nav and other "Book intro call" links that point at a form: scroll there (pilot.js), then put the cursor in it. */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-ec-focus]') : null;
    if (!a) return;
    var id = (a.getAttribute('href') || '').replace(/^#/, ''), box = id && doc.getElementById(id);
    var input = box && box.querySelector('input[type=email]');
    if (!input) return;
    Array.prototype.forEach.call(box.querySelectorAll('[data-rv]'), function (x) { x.classList.remove('pre'); });   // no fade-in to wait for
    if (box.hasAttribute('data-rv')) box.classList.remove('pre');
    var last = -1, still = 0, t0 = Date.now();
    (function settle() {   // focus once the page has stopped moving (smooth scroll), or after 2.5 s at most
      var y = window.scrollY;
      if (y === last) still++; else { still = 0; last = y; }
      if (still >= 3 || Date.now() - t0 > 2500) { try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); } return; }
      requestAnimationFrame(settle);
    })();
  });

  /* ---------- rotating word in the hero ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(doc.querySelectorAll('.rot'), function (rot) {
    var extra = [];
    try { extra = JSON.parse(rot.getAttribute('data-words') || '[]') || []; } catch (x) {}
    extra.forEach(function (w) { var s = doc.createElement('span'); s.className = 'rot__w'; s.setAttribute('aria-hidden', 'true'); s.textContent = w; rot.appendChild(s); });
    var words = rot.querySelectorAll('.rot__w');
    if (!words.length) return;
    var i = 0; words[0].classList.add('is-on');
    if (reduce || words.length < 2) { rot.classList.add('rot--static'); return; }
    var visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(rot);
    setInterval(function () {
      if (doc.hidden || !visible) return;   // nothing to animate when nobody can see it
      var cur = words[i]; i = (i + 1) % words.length; var nx = words[i];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      nx.classList.remove('is-out'); nx.classList.add('is-on');
      setTimeout(function () { cur.classList.remove('is-out'); }, 650);
    }, 2400);
  });

  /* ---------- journey strip: a highlight walks from first message to booked meeting while it is on screen ---------- */
  var jr = doc.querySelector('.journey');
  if (jr && 'IntersectionObserver' in window) {
    var steps = jr.querySelectorAll('.jstep'), ji = -1, jv = false, jt = null;
    var jnext = function () { if (doc.hidden || !jv) return; ji = (ji + 1) % steps.length; Array.prototype.forEach.call(steps, function (s, k) { s.classList.toggle('is-on', k === ji); }); };
    new IntersectionObserver(function (es) {
      jv = es[0].isIntersecting;
      if (jv && !jr.classList.contains('is-in')) {
        jr.classList.add('is-in');
        if (!reduce && steps.length) setTimeout(function () { jnext(); jt = setInterval(jnext, 2200); }, 1200);
      }
    }, { threshold: 0.25 }).observe(jr);
  }

  /* ---------- blog topic filter ---------- */
  var bar = doc.querySelector('.bl-filter');
  if (bar) bar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-topic]'); if (!b) return;
    var t = b.getAttribute('data-topic');
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    Array.prototype.forEach.call(doc.querySelectorAll('.bl-card'), function (c) { c.hidden = !(t === 'all' || c.getAttribute('data-topic') === t); });
  });
})();
