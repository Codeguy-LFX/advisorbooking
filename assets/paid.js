/* Advisor Booking: the paid landing pages (paid.js). Loaded with defer by /ria-meetings, /ria-meetings-direct,
   /ria-meetings-embed and /ria-playbook. Each part looks for its own markup and does nothing when it is not there.
   The pages read and work without this file: links are plain anchors, the Playbook pages are all open, and the
   email box does nothing (its form has method="dialog", so the browser never puts the email in the address). */
(function () {
  'use strict';
  var d = document, w = window, C = w.AB_CONFIG || {};
  function $(id) { return d.getElementById(id); }
  var MAC = /Mac|iP(hone|ad|od)/.test(navigator.platform || '');
  var REDUCE = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Campaign tags and the ad click id, kept as the quiz engine keeps them ----------
     ab_utm for the visit (this tab), ab_click for 90 days (this browser). */
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('ab_utm') || '{}') || {}; } catch (e) {}
  try {
    var qs0 = new URLSearchParams(location.search), ck = {};
    qs0.forEach(function (v, k) { if (/^utm_|^(gclid|gbraid|wbraid|fbclid|src|ref)$/.test(k)) utm[k] = v; });
    sessionStorage.setItem('ab_utm', JSON.stringify(utm));
    ['gclid', 'gbraid', 'wbraid'].forEach(function (k) { var v = qs0.get(k); if (v) ck[k] = v; });
    if (ck.gclid || ck.gbraid || ck.wbraid) { ck.t = Date.now(); localStorage.setItem('ab_click', JSON.stringify(ck)); }
  } catch (e) {}

  /* ---------- 2. Links inside the page ----------
     They move the page without changing the address: on the quiz page a #book address would add a history entry that
     the quiz reads as "back to question 1". A target more than three screens away is jumped to at once (a glide through
     the whole page takes over a second); a near one glides. #book puts the cursor on the question, #get in the email
     box. A click with Ctrl, Shift or Alt (and Cmd on a Mac) is left to the browser. */
  var settle = 0;
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null; if (!a) return;
    var id = a.getAttribute('href').slice(1), s = id ? $(id) : null, f;
    if (!s || e.defaultPrevented || e.button || e.ctrlKey || e.shiftKey || e.altKey || (e.metaKey && MAC)) return;
    e.preventDefault();
    /* a jump to the action itself lands where it always does: the bar is about to step aside (part 9) */
    if (s.hasAttribute('data-bar-from') || s.hasAttribute('data-bar-hide')) d.documentElement.classList.remove('p-bar-on');
    /* a jump to a section below the first screen's action: the bar will be up when the page lands, so land clear of it */
    else if (bar && from && 'IntersectionObserver' in w && (from.compareDocumentPosition(s) & 4) && !from.contains(s) && !s.closest('[data-bar-hide]')) d.documentElement.classList.add('p-bar-on');
    /* a jump the visitor cuts short can leave that class out of step with the bar: once the glide is over it follows the bar again */
    if (bar) { clearTimeout(settle); settle = setTimeout(function () { d.documentElement.classList.toggle('p-bar-on', bar.classList.contains('is-on')); }, 1600); }
    try { s.scrollIntoView({ behavior: Math.abs(s.getBoundingClientRect().top) > 3 * w.innerHeight ? 'instant' : 'auto', block: 'start' }); } catch (x) { s.scrollIntoView(); }
    f = id === 'book' ? $('apQ') : id === 'get' ? $('getEmail') : s;
    if (f) { try { f.focus({ preventScroll: true }); } catch (x) {} }
  });

  /* ---------- 3. The quiz page only (V1) ---------- */
  if ($('apBody') && $('book')) {
    /* The quiz answers to the letter keys A to G. That must only happen while the quiz is on screen and the focus is
       inside it (it is, after the first answer and after every jump to the quiz); otherwise a stray key, or a word
       spoken to voice control, would answer a question. */
    d.addEventListener('keydown', function (e) {
      var b = $('book'), a = d.activeElement, r;
      if (!b || !e.key || e.key.length !== 1) return;
      r = b.getBoundingClientRect();
      if (!a || !b.contains(a) || a.tagName === 'A' || r.bottom < 0 || r.top > w.innerHeight) e.stopImmediatePropagation();   /* a link in the card (the first Tab stop) is not the quiz */
    }, true);
    /* The quiz engine turns the browser's own scroll restoring off. Put a reload back where the reader was. */
    try {
      w.addEventListener('pagehide', function () { try { sessionStorage.setItem('ab_y', String(Math.round(w.pageYOffset || 0))); } catch (x) {} });
      var nav = performance.getEntriesByType('navigation')[0], y0 = +sessionStorage.getItem('ab_y') || 0;
      if (nav && nav.type === 'reload' && y0 > 0) {
        var back = function () { if ((w.pageYOffset || 0) > 4) return; try { w.scrollTo({ top: y0, left: 0, behavior: 'instant' }); } catch (x) { w.scrollTo(0, y0); } };
        if (d.readyState === 'complete') back(); else w.addEventListener('load', back);
      }
    } catch (e) {}
  }

  /* ---------- 4. The email box (V4) ----------
     Saves the email for the quiz (sessionStorage ab_prefill, this tab only, never in the address), sends one
     email_capture record to the CRM, then goes to the quiz (AB_CONFIG.playbookNext, default /fit-check) with the
     page's own query string. */
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function post(p) {
    var url = String(C.ghlWebhookUrl || '').trim(); if (!url) return;
    var b = new URLSearchParams(); Object.keys(p).forEach(function (k) { b.append(k, p[k] === undefined || p[k] === null ? '' : String(p[k])); });
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, b)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: b }).catch(function () {}); } catch (e) {}
  }
  var T0 = Date.now(), sent = false;
  Array.prototype.forEach.call(d.querySelectorAll('form.p-ec'), function (form) {
    var input = form.querySelector('input[type=email]'), box = form.querySelector('.k-ec'), err = form.querySelector('.k-ec__err'), btn = form.querySelector('button[type=submit]');
    if (!input || !btn) return;
    var label = btn.querySelector('span'), words = label ? label.textContent : '';
    /* the error sentence is in the box only while there is an error: hidden text is still read out as a description */
    var msg = err ? err.textContent : ''; if (err) err.textContent = '';
    function bad(on) { form.classList.toggle('is-err', on); if (box) box.classList.toggle('is-bad', on); if (err) { err.textContent = on ? msg : ''; err.hidden = !on; } input.setAttribute('aria-invalid', on ? 'true' : 'false'); }
    input.addEventListener('input', function () { if (err && !err.hidden && emailOk(input.value.trim())) bad(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (sent) return;
      var v = input.value.trim();
      if (!emailOk(v)) { bad(true); input.focus(); return; }
      bad(false); sent = true;
      var hp = form.querySelector('input[name=website]'), bot = hp && hp.value ? 'honeypot' : (Date.now() - T0 < 2000 ? 'too_fast' : '');
      var pre = {}; try { pre = JSON.parse(sessionStorage.getItem('ab_prefill') || '{}') || {}; } catch (x) {}
      if (pre.email !== v) pre.at = Date.now(); pre.email = v;
      var told = pre.sent === v; pre.sent = v;   // this email is already with the CRM (Back from the quiz, then the button again)
      try { sessionStorage.setItem('ab_prefill', JSON.stringify(pre)); } catch (x) {}
      if (!told) post({ stage: 'email_capture', email: v, page_url: location.href, cta: 'playbook-' + (form.getAttribute('data-ec') || ''),
        utm_source: utm.utm_source || '', utm_medium: utm.utm_medium || '', utm_campaign: utm.utm_campaign || '', utm_term: utm.utm_term || '',
        utm_content: utm.utm_content || '', gclid: utm.gclid || '', fbclid: utm.fbclid || '', referrer: d.referrer,
        bot_flag: bot ? 'true' : 'false', bot_reason: bot, submitted_at: new Date().toISOString(), funnel_entry: String(C.funnelEntry || ''),
        lead_magnet: 'Past Prospect Playbook', v: String(w.AB_V || '') });
      btn.disabled = true; btn.classList.add('is-busy'); if (label) label.textContent = 'One moment...';
      var next = String(C.playbookNext || '/fit-check'), q = location.search;
      setTimeout(function () { location.href = next + (q && next.indexOf('?') < 0 ? q : ''); }, 250);
    });
    /* Back from the quiz out of the browser's page cache: the box is ready again, with the email still in it. (A page
       loaded afresh starts ready; the first pageshow of a load must not re-arm a box that is on its way to the quiz.) */
    w.addEventListener('pageshow', function (e) { if (!e.persisted) return; sent = false; btn.disabled = false; btn.classList.remove('is-busy'); if (label) label.textContent = words; });
  });

  /* ---------- 5. Buttons that go straight to the scheduler (V2) ----------
     The link in the markup is the plain event address, so it works without this. Here the campaign tags and the ad
     click id are added, and utm_content always ends with the page and the headline ("direct-v2-appt"; after the
     ad's own value and a dot when it has one: "ad_17.direct-v2-appt"), so iClosed and the CRM can tell the versions
     apart whatever the ad link carries. */
  function iclosed(fallbackSource) {
    var base = String(C.iclosedUrlDirect || C.iclosedUrlFit5 || C.iclosedUrl || '').trim();
    try {
      var u = new URL(base);
      Object.keys(utm).forEach(function (k) { var v = utm[k]; if (/^(utm_[a-z_]+|gclid|gbraid|wbraid)$/.test(k) && typeof v === 'string' && v) u.searchParams.set(k, v); });
      var mark = fallbackSource + '-' + String(w.AB_V || 'appt'), uc = u.searchParams.get('utm_content');
      u.searchParams.set('utm_content', uc ? uc + '.' + mark : mark);
      if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', fallbackSource);
      return /^https:\/\/app\.iclosed\.io\//.test(u.href) ? u.toString() : '';
    } catch (e) { return ''; }
  }
  var direct = d.querySelectorAll('a[data-iclosed]');
  if (direct.length) { var du = iclosed('direct-v2'); if (du) Array.prototype.forEach.call(direct, function (a) { a.href = du; }); }

  /* ---------- 6. The calendar on the page (V3) ----------
     iClosed's inline widget, set up as soon as this script runs (it is deferred, so the page is parsed; waiting for
     the load event would let one slow outside file hold the calendar back). If no calendar frame is in place after 8 seconds (or
     the widget script is blocked) a plain frame of the same event and a link to open it take its place. A booking
     made in the frame is reported by /booked and saved to the CRM, once. */
  var cal = d.querySelector('#calendar[data-embed]');
  if (cal) (function () {
    var mount = cal.querySelector('.k-cal__mount'), url = iclosed('embed-v3'), open = cal.querySelector('a[data-cal-open]');
    if (!mount || !url) return;
    if (open) open.href = url;   /* the plain link in the loading sentence carries the same tags as the calendar */
    function start() {
      var wd = d.createElement('div'); wd.className = 'iclosed-widget'; wd.setAttribute('data-url', url); wd.setAttribute('title', 'Pick a time for your call'); wd.style.width = '100%';
      mount.appendChild(wd);
      var settled = false, waited = 0, iv;
      function live(f) { cal.classList.add('is-live'); if (!f.getAttribute('title')) f.setAttribute('title', 'Pick a time for your call'); var done = function () { cal.classList.add('is-ready'); }; f.addEventListener('load', done); setTimeout(done, 3000); }
      function fallback() {
        if (settled) return; settled = true; clearInterval(iv);
        var have = mount.querySelector('iframe'); if (have) { live(have); return; }
        mount.innerHTML = '';
        var p = d.createElement('p'); p.className = 'af-open'; var l = d.createElement('a'); l.href = url; l.target = '_blank'; l.rel = 'noopener'; l.textContent = 'Calendar not showing? Open it here.'; p.appendChild(l); mount.appendChild(p);
        var f = d.createElement('iframe'); f.title = 'Pick a time for your call'; f.src = url; mount.appendChild(f);
        cal.classList.add('is-fallback'); live(f);
      }
      var sc = d.createElement('script'); sc.async = true; sc.src = 'https://app.iclosed.io/assets/widget.js'; sc.onerror = fallback; d.body.appendChild(sc);
      iv = setInterval(function () { var f = mount.querySelector('iframe'); if (f) { settled = true; clearInterval(iv); live(f); return; } if ((waited += 250) >= 8000) fallback(); }, 250);
      var once = false;
      w.addEventListener('message', function (e) {
        var m = e.data || {}; if (e.origin !== location.origin || m.event !== 'iclosed.booked' || !m.payload || once) return; once = true;
        var p = {}; Object.keys(m.payload).forEach(function (k) { if (k !== 'forwarded') p[k] = m.payload[k]; });
        post(p);
      });
    }
    start();
  })();

  /* ---------- 7. A look inside the Playbook ----------
     One title open at a time. Enter and Space work because the titles are buttons; the arrow keys move between them. */
  Array.prototype.forEach.call(d.querySelectorAll('[data-look]'), function (look) {
    var items = look.querySelectorAll('.p-look__item'), tabs = look.querySelectorAll('.p-look__tab');
    if (!items.length) return;
    function open(i) {
      Array.prototype.forEach.call(items, function (it, n) { it.classList.toggle('is-on', n === i); tabs[n].setAttribute('aria-expanded', n === i ? 'true' : 'false'); });
    }
    Array.prototype.forEach.call(tabs, function (t, i) {
      t.addEventListener('click', function () {
        var wasOn = items[i].classList.contains('is-on'), wide = w.matchMedia && w.matchMedia('(min-width:960px)').matches;
        if (wasOn && !wide) { open(-1); return; }   // a phone can close the open one; a desktop always shows a page
        open(i);
        if (!wide) {   // keep the tapped title in view when the panel above it closes
          var r = t.getBoundingClientRect(); if (r.top < 8) { try { w.scrollBy({ top: r.top - 12, left: 0, behavior: 'instant' }); } catch (x) { w.scrollBy(0, r.top - 12); } }
        }
      });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = k === 'ArrowDown' ? i + 1 : k === 'ArrowUp' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : -1;
        if (n < 0 || n >= tabs.length || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault(); tabs[n].focus(); if (w.matchMedia && w.matchMedia('(min-width:960px)').matches) open(n);
      });
    });
    look.classList.add('is-js'); open(0);
    /* a phone can close every title; when the window becomes wide (a tablet turned on its side) one page must show */
    if (w.matchMedia) { var wide = w.matchMedia('(min-width:960px)'), fill = function () { if (wide.matches && !look.querySelector('.p-look__item.is-on')) open(0); };
      if (wide.addEventListener) wide.addEventListener('change', fill); else if (wide.addListener) wide.addListener(fill); }
  });

  /* ---------- 8. A quiet entrance for what is below the first screen ----------
     Nothing is hidden unless this runs, the browser can observe, and the visitor has not asked for less motion.
     Anything already on screen is simply shown. A check when scrolling stops catches whatever the observer missed. */
  var rv = d.querySelectorAll('[data-rv]');
  if (rv.length && !REDUCE && 'IntersectionObserver' in w) {
    var vh = w.innerHeight || 800, late = [];
    Array.prototype.forEach.call(rv, function (el) { if (el.getBoundingClientRect().top < vh * 0.92) el.setAttribute('data-rv', 'in'); else late.push(el); });
    if (late.length) {
      d.documentElement.classList.add('p-rv');
      Array.prototype.forEach.call(rv, function (el) { if (el.getAttribute('data-rv') === 'in') el.classList.add('is-in'); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
      late.forEach(function (el) { io.observe(el); });
      /* jumps (a far in-page link, the browser restoring a position) can skip the observer's callbacks for a frame: check on scroll end */
      var tick; w.addEventListener('scroll', function () { clearTimeout(tick); tick = setTimeout(function () {
        late.forEach(function (el) { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < (w.innerHeight || vh)) el.classList.add('is-in'); });
      }, 120); }, { passive: true });
      w.addEventListener('beforeprint', function () { late.forEach(function (el) { el.classList.add('is-in'); }); });
    }
  }
  /* ---------- 9. The bar ----------
     Shown once the first screen's action ([data-bar-from]) is wholly above the window; hidden again while a part of
     the page that carries the action itself ([data-bar-hide]: the calendar, the closing section) is on screen.
     Hidden means visibility:hidden, so it is out of the tab order too. While it is up the page keeps keyboard focus
     and in-page jumps clear of it (p-bar-on on the html element). */
  var bar = d.querySelector('[data-bar]'), from = d.querySelector('[data-bar-from]');
  if (bar && from && 'IntersectionObserver' in w) (function () {
    var past = false, near = 0;
    function set() { var on = past && !near; bar.classList.toggle('is-on', on); d.documentElement.classList.toggle('p-bar-on', on); }
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1]; past = !e.isIntersecting && e.boundingClientRect.bottom <= 0; set();
    }).observe(from);
    var zones = d.querySelectorAll('[data-bar-hide]');
    if (zones.length) {
      var seen = [], zo = new IntersectionObserver(function (es) {
        es.forEach(function (e) { var i = seen.indexOf(e.target); if (e.isIntersecting && i < 0) seen.push(e.target); else if (!e.isIntersecting && i >= 0) seen.splice(i, 1); });
        near = seen.length; set();
      });
      Array.prototype.forEach.call(zones, function (z) { zo.observe(z); });
    }
  })();
})();
