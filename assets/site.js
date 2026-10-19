/* Advisor Booked v7: nav, config, UTM capture and attribution, tracking (off until IDs are set), Calendly embed and booking conversion,
   smooth anchors, and the motion module (reveal on scroll, header state, active anchor, count-up, illustrative phone threads, tabs, FAQ, ticker). No dependencies. */
(function () {
  'use strict';

  var CFG = window.AB_CONFIG || {};
  var doc = document;
  var WEBHOOK_TIMEOUT_MS = typeof CFG.formWebhookTimeoutMs === 'number' ? CFG.formWebhookTimeoutMs : 4000;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];

  var utm = {};          // the stored attribution params for this session
  var source = '';       // src=<data-src> read from the URL on book.html

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* 1. Nav ---------------------------------------------------------------- */
  function initNav() {
    var nav = $('.nav');
    var toggle = $('.nav__toggle');
    var panel = $('.nav__panel');
    if (!nav || !toggle || !panel) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    doc.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
    panel.addEventListener('focusout', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.relatedTarget)) setOpen(false);
    });
  }

  /* 2. Config values ------------------------------------------------------ */
  function renderConfig() {
    $all('[data-config]').forEach(function (el) {
      var key = el.getAttribute('data-config');
      if (!Object.prototype.hasOwnProperty.call(CFG, key)) return;
      var val = CFG[key];
      if (val === null || val === undefined || val === '') return;
      el.textContent = String(val);
      if (key === 'email' && el.tagName === 'A') el.setAttribute('href', 'mailto:' + val);
    });
  }

  /* 3. Attribution -------------------------------------------------------- */
  function readUtmStore() {
    try {
      var raw = sessionStorage.getItem('ab_utm');
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
  }
  function captureUtm() {
    var params = new URLSearchParams(location.search);
    var stored = readUtmStore();
    var found = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { stored[k] = v; found = true; }
    });
    if (found) { try { sessionStorage.setItem('ab_utm', JSON.stringify(stored)); } catch (e) { /* storage blocked */ } }
    return stored;
  }
  /* src=<data-src> on book.html. Letters, digits, dash and underscore only, 32 chars max. */
  function readSource() {
    var raw = new URLSearchParams(location.search).get('src') || '';
    raw = String(raw).trim().toLowerCase();
    return /^[a-z0-9_-]{1,32}$/.test(raw) ? raw : '';
  }
  function isBookHref(href) {
    if (!href || /^(mailto:|tel:|#|javascript:)/i.test(href)) return null;
    var url;
    try { url = new URL(href, location.href); } catch (e) { return null; }
    return /(^|\/)book\.html$/.test(url.pathname) ? url : null;
  }
  /* Appends the stored UTM params and, when the link carries data-src, src=<value>
     to every link to book.html. Existing query params on the link win. */
  function decorateBookLinks() {
    var keys = Object.keys(utm);
    $all('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      var url = isBookHref(href);
      if (!url) return;
      var changed = false;
      keys.forEach(function (k) {
        if (!url.searchParams.has(k)) { url.searchParams.set(k, utm[k]); changed = true; }
      });
      var src = (a.getAttribute('data-src') || '').trim();
      if (src && !url.searchParams.has('src')) { url.searchParams.set('src', src); changed = true; }
      if (!changed) return;
      var hashAt = href.indexOf('#');
      var hash = hashAt > -1 ? href.slice(hashAt) : '';
      var base = (hashAt > -1 ? href.slice(0, hashAt) : href).split('?')[0];
      a.setAttribute('href', base + '?' + url.searchParams.toString() + hash);
    });
  }
  function utmOnly() {
    var out = {};
    Object.keys(utm).forEach(function (k) { if (k.indexOf('utm_') === 0) out[k] = utm[k]; });
    return out;
  }

  /* 4. Tracking ----------------------------------------------------------- */
  function initTracking() {
    if (CFG.metaPixelId) {
      /* Standard Meta Pixel base code */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', String(CFG.metaPixelId));
      window.fbq('track', 'PageView');
    }
    if (CFG.linkedinPartnerId) {
      /* LinkedIn Insight Tag */
      window._linkedin_partner_id = String(CFG.linkedinPartnerId);
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
      if (!window.lintrk) {
        window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
        window.lintrk.q = [];
      }
      var s = doc.getElementsByTagName('script')[0];
      var b = doc.createElement('script');
      b.type = 'text/javascript'; b.async = true;
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      s.parentNode.insertBefore(b, s);
    }
  }

  /* Webhook (used only for the "booked" event in v5) ----------------------- */
  function postWebhook(payload) {
    var url = CFG.ghlWebhookUrl;
    if (!url || typeof fetch !== 'function') return;
    var body = JSON.stringify(payload);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, WEBHOOK_TIMEOUT_MS) : null;
    function done() { if (timer) clearTimeout(timer); }
    try {
      fetch(url, {
        method: 'POST', keepalive: true, body: body,
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined
      }).then(done).catch(function (err) {
        done();
        if (err && err.name === 'AbortError') return;
        /* CORS or network failure: resend as an opaque request. The UI never waits on this. */
        try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {}); } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  }

  /* 5. Calendly ----------------------------------------------------------- */
  function calendlyUrl() {
    var base = String(CFG.calendlyUrl || '').trim();
    if (!base) return '';
    var u;
    try { u = new URL(base); } catch (e) { return ''; }
    u.searchParams.set('hide_gdpr_banner', '1');
    var extra = utmOnly();
    Object.keys(extra).forEach(function (k) { u.searchParams.set(k, extra[k]); });
    if (source) u.searchParams.set('utm_content', source);
    return u.toString();
  }
  function renderCalendly() {
    var panel = $('#calendar');
    if (!panel) return;
    var mount = $('.calendly-mount', panel);
    if (!mount) return;
    mount.innerHTML = '';
    var url = calendlyUrl();
    var email = CFG.email || 'hello@advisorbooked.com';
    if (!url) {
      var n = doc.createElement('p');
      n.className = 'notice';
      n.appendChild(doc.createTextNode('The calendar is not connected yet. Email '));
      var a = doc.createElement('a');
      a.href = 'mailto:' + email; a.textContent = email;
      n.appendChild(a);
      n.appendChild(doc.createTextNode(' and we will send you times for the 20-minute audit.'));
      mount.appendChild(n);
      return;
    }
    if (CFG.calendlyMode === 'link') {
      var btn = doc.createElement('a');
      btn.className = 'pill pill--hero'; btn.href = url; btn.target = '_blank'; btn.rel = 'noopener';
      btn.appendChild(doc.createTextNode('Open the calendar to pick a time'));
      btn.rel = 'noopener noreferrer';
      var sr = doc.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = ' (opens in a new window)';
      btn.appendChild(sr);
      mount.appendChild(btn);
      return;
    }
    var frame = doc.createElement('iframe');
    frame.className = 'calendly-frame';
    frame.title = 'Pick a time for your 20-minute call';
    frame.setAttribute('loading', 'lazy');
    frame.src = url;
    mount.appendChild(frame);
  }

  /* 6. Booking confirmed (Calendly postMessage) --------------------------- */
  function initCalendlyListener() {
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.event !== 'calendly.event_scheduled') return;
      if (e.origin && !/(^|\.)calendly\.com$/.test(String(e.origin).replace(/^https?:\/\//, ''))) return;
      if (typeof window.fbq === 'function') { try { window.fbq('track', 'Schedule'); } catch (err) { /* ignore */ } }
      if (typeof window.lintrk === 'function' && CFG.linkedinConversionId) {
        try { window.lintrk('track', { conversion_id: CFG.linkedinConversionId }); } catch (err) { /* ignore */ }
      }
      postWebhook({ event: 'booked', source: source, utm: utm, page: location.pathname, ts: new Date().toISOString() });
    });
  }

  /* 7. Smooth anchor scroll ------------------------------------------------- */
  function initAnchors() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.pathname !== location.pathname || url.origin !== location.origin || !url.hash || url.hash === '#') return;
      var id = decodeURIComponent(url.hash.slice(1));
      var target = doc.getElementById(id);
      if (!target) return;
      e.preventDefault();
      try { target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (err) { target.scrollIntoView(); }
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (history.pushState) history.pushState(null, '', url.hash); else location.hash = url.hash;
    });
  }


  /* 8. Motion: reveal on scroll, header state, active anchor, count-up ------- */
  var noMotion = reducedMotion();
  if (noMotion) doc.documentElement.classList.add('no-motion');

  function initReveal() {
    var els = $all('.rv, .hero, .scene-wrap, .ul');
    if (!els.length) return;
    if (noMotion || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  function initHeader() {
    var h = $('.header');
    if (!h) return;
    var tick = false;
    function update() { h.classList.toggle('is-stuck', window.scrollY > 8); tick = false; }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  function initActiveAnchor() {
    var links = $all('.nav__links a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { var id = a.getAttribute('href').slice(1); var t = doc.getElementById(id); if (t) map[id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { links.forEach(function (a) { a.classList.remove('is-active'); }); var a = map[en.target.id]; if (a) a.classList.add('is-active'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    Object.keys(map).forEach(function (id) { io.observe(doc.getElementById(id)); });
  }

  function initCountUp() {
    var nums = $all('[data-count]');
    if (!nums.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      if (noMotion) { el.textContent = prefix + target + suffix; return; }
      var start = null, durMs = 1400;
      el.textContent = prefix + '0' + suffix;
      function step(ts) {
        if (!start) start = ts;
        var t = Math.min(1, (ts - start) / durMs);
        var e = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(target * e) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* 9. Phone thread player (illustrative conversations; names are fictional) --- */
  var THREADS = {
    outbound: [
      ['out', 'Hi Dana, Marcus at _____ Advisors. I work with owners in the two years after a sale, when succession and tax questions show up. Open to a 20-minute call?'],
      ['typing'],
      ['in', 'Not familiar with your firm. But that is on my mind. Thursday works.'],
      ['out', 'Booked: Thursday 2:00 PM. Invite is in your inbox.'],
      ['sys', 'Fits your rules: business owner, sold a company recently']
    ],
    reactivation: [
      ['out', 'Hi Dana, Marcus at _____. We spoke in 2023 about the buyout. Where did that land?'],
      ['typing'],
      ['in', 'Closed in March. Happy to catch up.'],
      ['out', 'Great. Here is my calendar. 20 minutes, your pick.'],
      ['sys', 'From your own CRM: a contact from 2023']
    ],
    replies: [
      ['in', 'Not now. Maybe Q1.'],
      ['out', 'Understood. I will check back on January 12 and nothing before then.'],
      ['sys', 'Follow-up set for Jan 12. No more messages until then.'],
      ['in', 'Appreciate that.']
    ],
    booking: [
      ['out', 'Confirmed for Thursday 2:00 PM. You will get a reminder before the call.'],
      ['sys', 'Note sent to your advisor: who they are and why they replied'],
      ['typing'],
      ['in', 'Thanks. See you Thursday.'],
      ['sys', 'Meeting happened. It counts toward your monthly goal.']
    ]
  };

  function initPhones() {
    var phones = $all('[data-thread]');
    if (!phones.length) return;
    phones.forEach(function (ph) {
      var thread = $('.thread', ph);
      if (!thread) return;
      var key = ph.getAttribute('data-thread') || 'outbound';
      var timer = null, token = 0, started = false;
      function clear() { if (timer) clearTimeout(timer); timer = null; thread.innerHTML = ''; }
      /* Keep the newest message in view, like a real chat, when the thread is taller than the screen. */
      function pin() { if (thread.scrollHeight > thread.clientHeight) { if (noMotion || !thread.scrollTo) thread.scrollTop = thread.scrollHeight; else thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }); } }
      function play(k) {
        token++;
        var my = token;
        clear();
        var script = THREADS[k] || THREADS.outbound;
        var typing = doc.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>';
        if (noMotion) {
          script.forEach(function (m) { if (m[0] === 'typing') return; var b = doc.createElement('div'); b.className = 'bub bub--' + m[0] + ' show'; b.textContent = m[1]; thread.appendChild(b); });
          pin();
          return;
        }
        var i = 0;
        function next() {
          if (my !== token) return;
          if (i >= script.length) { timer = setTimeout(function () { if (my === token) play(k); }, 5200); return; }
          var m = script[i++];
          if (m[0] === 'typing') { thread.appendChild(typing); typing.classList.add('show'); pin(); timer = setTimeout(function () { typing.classList.remove('show'); if (typing.parentNode) typing.parentNode.removeChild(typing); next(); }, 1100); return; }
          var b = doc.createElement('div'); b.className = 'bub bub--' + m[0]; b.textContent = m[1];
          thread.appendChild(b);
          requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('show'); pin(); }); });
          timer = setTimeout(next, m[0] === 'sys' ? 1300 : 1700);
        }
        timer = setTimeout(next, 500);
      }
      ph._play = play;
      function start() { if (started) return; started = true; play(key); }
      if (!('IntersectionObserver' in window)) start();
      else {
        var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { start(); io.unobserve(ph); } }); }, { threshold: 0.3 });
        io.observe(ph);
      }
    });
  }

  function initHowTabs() {
    var list = $('.howlist');
    if (!list) return;
    var phone = $('.stage [data-thread]');
    var btns = $all('button', list);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var k = b.getAttribute('data-key');
        if (phone && phone._play) { phone.setAttribute('data-thread', k); phone._play(k); }
      });
    });
  }

  /* 10. FAQ: animate open/close height on native details ---------------------- */
  function initFaq() {
    var items = $all('.faq details');
    if (!items.length) return;
    items.forEach(function (d) {
      var sum = $('summary', d), a = $('.a', d);
      if (!sum || !a) return;
      if (noMotion) return;
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open) {
          a.style.height = a.scrollHeight + 'px';
          requestAnimationFrame(function () { a.style.transition = 'height .35s cubic-bezier(.2,.7,.2,1)'; a.style.height = '0px'; });
          a.addEventListener('transitionend', function h() { a.removeEventListener('transitionend', h); d.open = false; a.style.height = ''; a.style.transition = ''; });
        } else {
          d.open = true;
          var hgt = a.scrollHeight;
          a.style.height = '0px';
          requestAnimationFrame(function () { a.style.transition = 'height .35s cubic-bezier(.2,.7,.2,1)'; a.style.height = hgt + 'px'; });
          a.addEventListener('transitionend', function h() { a.removeEventListener('transitionend', h); a.style.height = ''; a.style.transition = ''; });
        }
      });
    });
  }

  /* 11. Sticky mobile CTA: shows after the hero, hides at the last booking button ----- */
  function initSticky() {
    var bar = $('[data-sticky]');
    var hero = $('.hero');
    var ends = document.querySelectorAll('main a[href^="book.html"]');
    var foot = $('.ctabar') || ends[ends.length - 1] || null;  /* hide when the page's last booking button is on screen */
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    bar.hidden = false;
    var heroVisible = true, footVisible = false;
    function update() { bar.classList.toggle('is-on', !heroVisible && !footVisible); }
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
    if (foot) new IntersectionObserver(function (en) { footVisible = en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(foot);
  }

  /* 12. Ticker: duplicate the track once so the loop is seamless ------------- */
  function initTicker() {
    var t = $('.ticker__track');
    if (!t || t.getAttribute('data-dup')) return;
    t.innerHTML = t.innerHTML + t.innerHTML;
    t.setAttribute('data-dup', '1');
  }

  /* Boot -------------------------------------------------------------------- */
  function init() {
    utm = captureUtm();
    source = readSource();
    initNav();
    renderConfig();
    decorateBookLinks();
    initTracking();
    renderCalendly();
    initCalendlyListener();
    initAnchors();
    initTicker(); initReveal(); initHeader(); initActiveAnchor(); initCountUp(); initPhones(); initHowTabs(); initFaq(); initSticky();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
