/* Advisor Booking v7: nav, config, UTM capture and attribution, tracking (off until IDs are set), Calendly embed and booking conversion,
   smooth anchors, and the motion module (reveal on scroll, header state, active anchor, count-up, illustrative conversation threads in LinkedIn, email and text skins, the pinned before/after, FAQ). No dependencies. */
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
    if (navigator.globalPrivacyControl) return;   /* honor GPC: no advertising pixels for this visit */
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
  /* The booking page embeds whichever provider config.js names. iClosed uses its own inline widget built from the event
     link, with campaign tags passed through (a plain iframe if the widget script is blocked); the event's confirmation
     page (the site's /booked page) records the booking. */
  function schedulerUrl() {
    if (CFG.scheduler !== 'iclosed') return calendlyUrl();
    var base = String(CFG.iclosedUrl || '').trim();
    if (!base) return '';
    var u;
    try { u = new URL(base); } catch (e) { return ''; }
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
    var url = schedulerUrl();
    var email = CFG.email || 'info@advisorbooking.com';
    if (!url) {
      var n = doc.createElement('p');
      n.className = 'notice';
      n.appendChild(doc.createTextNode('The calendar is not connected yet. Email '));
      var a = doc.createElement('a');
      a.href = 'mailto:' + email; a.textContent = email;
      n.appendChild(a);
      n.appendChild(doc.createTextNode(' and we will send you times for the 20-minute call.'));
      mount.appendChild(n);
      return;
    }
    if (CFG.scheduler !== 'iclosed' && CFG.calendlyMode === 'link') {
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
    if (CFG.scheduler === 'iclosed') { mountIclosed(mount, url); return; }
    var frame = doc.createElement('iframe');
    frame.className = 'calendly-frame';
    frame.title = 'Pick a time for your call';
    frame.setAttribute('loading', 'lazy');
    frame.src = url;
    mount.appendChild(frame);
  }
  /* iClosed's inline embed code, built in place so campaign tags ride along: the widget div, then widget.js. */
  function mountIclosed(mount, url) {
    var w = doc.createElement('div');
    w.className = 'iclosed-widget';
    w.setAttribute('data-url', url);
    w.setAttribute('title', 'Pick a time for your call');
    w.style.width = '100%'; w.style.height = '620px';
    mount.appendChild(w);
    var settled = false, waited = 0, iv;
    function fallback() {
      if (settled) return; settled = true;
      clearInterval(iv);
      if (mount.querySelector('iframe')) return;
      mount.innerHTML = '';
      if (window.__AB_PREVIEW) {
        /* Previews block iClosed; offer the real calendar in a new tab instead. */
        var n = doc.createElement('p');
        n.className = 'notice';
        n.textContent = 'Previews block the calendar. On the live site it shows right here.';
        mount.appendChild(n);
        var o = doc.createElement('a');
        o.className = 'pill pill--accent mt-16';
        o.href = url; o.target = '_blank'; o.rel = 'noopener noreferrer';
        o.textContent = 'Open the real calendar in a new tab';
        mount.appendChild(o);
        return;
      }
      /* Widget script blocked (ad blocker or network): embed the event link directly, with a plain link under it. */
      var frame = doc.createElement('iframe');
      frame.className = 'calendly-frame';
      frame.title = 'Pick a time for your call';
      frame.src = url;
      mount.appendChild(frame);
      var p = doc.createElement('p');
      p.className = 'small mt-16 center';
      var a = doc.createElement('a');
      a.href = url; a.textContent = 'Calendar not showing? Open it here.';
      p.appendChild(a);
      mount.appendChild(p);
    }
    var s = doc.createElement('script');
    s.type = 'text/javascript'; s.async = true; s.src = 'https://app.iclosed.io/assets/widget.js';
    s.onerror = fallback;
    doc.body.appendChild(s);
    iv = setInterval(function () {
      if (mount.querySelector('iframe')) { settled = true; clearInterval(iv); return; }
      if ((waited += 250) >= 8000) fallback();
    }, 250);
  }

  /* 6. Booking confirmed (Calendly postMessage) --------------------------- */
  function initCalendlyListener() {
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      var fromCalendly = d.event === 'calendly.event_scheduled' && (!e.origin || /(^|\.)calendly\.com$/.test(String(e.origin).replace(/^https?:\/\//, '')));
      var fromBookedPage = d.event === 'iclosed.booked' && e.origin === location.origin;
      if (!fromCalendly && !fromBookedPage) return;
      if (typeof window.fbq === 'function') { try { window.fbq('track', 'Schedule'); } catch (err) { /* ignore */ } }
      if (typeof window.lintrk === 'function' && CFG.linkedinConversionId) {
        try { window.lintrk('track', { conversion_id: CFG.linkedinConversionId }); } catch (err) { /* ignore */ }
      }
      postWebhook({ event: 'booked', scheduler: fromCalendly ? 'calendly' : 'iclosed', booking: (fromBookedPage && d.payload && d.payload.forwarded) || null, source: source, utm: utm, page: location.pathname, ts: new Date().toISOString() });
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

  /* 9. Conversation player: illustrative threads, rendered in LinkedIn, email, and text skins ---------- */
  var SCENARIOS = {
    'li-new': {
      skin: 'li', out: 'Marcus', inn: 'Dana A.',
      caption: 'A short note about something true in their world. No pitch, no deck. The ask is 20 minutes.',
      thread: [
        ['sys', 'Connected. Dana accepted the invite'],
        ['out', 'Hi Dana, congrats on the Apex sale. Most owners tell me the tax and succession questions show up in the two years after. Open to a 20-minute call?'],
        ['typing'],
        ['in', 'That is exactly where my head is. Thursday at 2 works.'],
        ['out', 'Booked: Thursday 2:00 PM. The invite is in your inbox.'],
        ['sys', 'Fits your rules: business owner, recent sale']
      ]
    },
    'mail-crm': {
      skin: 'mail', subject: 'Where did the buyout land?', out: 'Marcus to Dana A.', inn: 'Dana A. to Marcus',
      caption: 'We start with your own list, because those names answer fastest. One line, no attachment, a reply the same day.',
      thread: [
        ['out', 'Hi Dana, we spoke in 2023 about the buyout. Where did that land?'],
        ['typing'],
        ['in', 'Closed in March. Happy to catch up.'],
        ['out', 'Great. Here is my calendar. 20 minutes, your pick.'],
        ['sys', 'From your CRM: a contact from 2023']
      ]
    },
    'li-reply': {
      skin: 'li', out: 'Marcus', inn: 'Dana A.',
      caption: 'Not-nows and objections get a human answer, in wording you approved. Nobody gets nagged.',
      thread: [
        ['in', 'Not now. Maybe Q1.'],
        ['out', 'Understood. I will check back on January 12 and nothing before then.'],
        ['sys', 'Follow-up set for Jan 12. No messages until then'],
        ['in', 'Appreciate that.'],
        ['sys', 'January 12'],
        ['out', 'Hi Dana, it is January 12. Still a good time to talk?'],
        ['typing'],
        ['in', 'Yes. Let’s do it.']
      ]
    },
    'sms-book': {
      skin: 'sms', out: 'Marcus', inn: 'Dana A.',
      caption: 'Confirmation and reminders by text, so the meeting we booked is a meeting that actually happens.',
      thread: [
        ['out', 'Hi Dana, this is Marcus’s office. You are booked for Thursday at 2:00 PM ET. The Google Meet link is in your email. Reply C to confirm.'],
        ['in', 'C'],
        ['sys', 'Confirmed. Reminder set'],
        ['out', 'Reminder: your call with Marcus is today at 2:00 PM ET. See you then.'],
        ['typing'],
        ['in', 'Thanks, see you at 2.'],
        ['sys', 'Meeting happened. It counts toward your monthly goal']
      ]
    },
    'mail-nurture': {
      skin: 'mail', subject: 'Three decisions owners face the year after a sale', out: 'From Marcus', inn: 'From Dana A.',
      caption: 'Weekly or every-other-week emails that bring value and show the benefits of working with you, so the list warms up before anyone asks for a meeting.',
      thread: [
        ['out', 'Three decisions owners face in the year after a sale: when to take the cash, what to do about the key people who stayed, and the tax move most owners miss. Two minutes to read.'],
        ['sys', 'Opened'],
        ['typing'],
        ['in', 'This was useful. Can we talk about the second one?'],
        ['out', 'Of course. Here is my calendar.'],
        ['sys', 'Booked from a nurture email']
      ]
    },
    'mail-report': {
      skin: 'mail', subject: 'Monday report: week 6', out: 'Advisor Booking to you', inn: 'You to Advisor Booking',
      caption: 'Every Monday, one page: messages sent, replies, meetings booked, meetings attended, and what each one cost.',
      thread: [
        ['report', [['Messages sent', 92], ['Replies', 34], ['Meetings booked', 18], ['Meetings attended', 15], ['Cost per meeting', 24]]],
        ['sys', 'Sent every Monday at 8:00 AM'],
        ['typing'],
        ['in', 'Clear. Thanks.']
      ]
    }
  };

  function initThreads() {
    var hosts = $all('[data-thread]');
    if (!hosts.length) return;
    hosts.forEach(function (host) {
      var thread = $('.thread', host);
      if (!thread) return;
      var timer = null, token = 0, started = false;
      function clear() { if (timer) clearTimeout(timer); timer = null; thread.innerHTML = ''; }
      /* Keep the newest message in view, like a real chat, when the thread is taller than the screen. */
      function pin() { if (thread.scrollHeight > thread.clientHeight) { if (noMotion || !thread.scrollTo) thread.scrollTop = thread.scrollHeight; else thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }); } }
      function make(m, sc) {
        var b = doc.createElement('div');
        if (m[0] === 'report') {
          b.className = 'bub bub--out bub--report';
          var t = doc.createElement('b'); t.textContent = sc.subject || 'Monday report'; b.appendChild(t);
          var rep = doc.createElement('div'); rep.className = 'rep';
          m[1].forEach(function (r) {
            var row = doc.createElement('div'); var l = doc.createElement('span'); l.textContent = r[0];
            var bar = doc.createElement('i'); bar.style.setProperty('--w', r[1] + '%');
            row.appendChild(l); row.appendChild(bar); rep.appendChild(row);
          });
          b.appendChild(rep);
          if (sc.out) b.setAttribute('data-from', sc.out);
          return b;
        }
        b.className = 'bub bub--' + m[0];
        b.textContent = m[1];
        if (m[0] === 'out' && sc.out) b.setAttribute('data-from', sc.out);
        if (m[0] === 'in' && sc.inn) b.setAttribute('data-from', sc.inn);
        return b;
      }
      function play(k) {
        token++;
        var my = token;
        clear();
        var sc = SCENARIOS[k] || SCENARIOS['li-new'];
        var script = sc.thread;
        var typing = doc.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>';
        if (noMotion) {
          script.forEach(function (m) { if (m[0] === 'typing') return; var b = make(m, sc); b.classList.add('show'); thread.appendChild(b); });
          pin();
          return;
        }
        var i = 0;
        function next() {
          if (my !== token) return;
          if (i >= script.length) {
            /* Played through. With auto-advance on, hand over after a hold (polling while paused by hover, focus or being off-screen); otherwise rest on the final state. */
            timer = setTimeout(function wait() {
              if (my !== token || !host._onEnd) return;
              if (host._onEnd()) return;
              timer = setTimeout(wait, 1500);
            }, 5200);
            return;
          }
          var m = script[i++];
          if (m[0] === 'typing') { thread.appendChild(typing); typing.classList.add('show'); pin(); timer = setTimeout(function () { typing.classList.remove('show'); if (typing.parentNode) typing.parentNode.removeChild(typing); next(); }, 1100); return; }
          var b = make(m, sc);
          thread.appendChild(b);
          requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('show'); pin(); }); });
          timer = setTimeout(next, m[0] === 'sys' ? 1300 : (m[0] === 'report' ? 2400 : 1700));
        }
        timer = setTimeout(next, 500);
      }
      /* A pick made before the device has scrolled into view only records the choice; the observer starts it once visible. */
      host._play = function (k) { if (started) play(k); };
      function start() { if (started) return; started = true; play(host.getAttribute('data-thread') || 'li-new'); }
      if (!('IntersectionObserver' in window)) start();
      else {
        var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { start(); io.unobserve(host); } }); }, { threshold: 0.3 });
        io.observe(host);
      }
    });
  }

  /* "See it in action": the menu picks a scenario; the device swaps skin, caption, and thread. Cycles on its own until the visitor picks one. */
  function initAction() {
    var wrap = $('[data-action]');
    if (!wrap) return;
    var tabs = $all('[role="tab"]', wrap);
    var device = $('[data-device]', wrap);
    var caption = $('[data-caption]', wrap);
    var subject = $('[data-subject]', wrap);
    if (!tabs.length || !device) return;
    var keys = tabs.map(function (t) { return t.getAttribute('data-key'); });
    var current = keys[0], touched = false, visible = false, hover = false, focused = false, switching = null;
    var panel = $('[role="tabpanel"]', wrap);

    function apply(k, sc) {
      device.setAttribute('data-skin', sc.skin);
      device.setAttribute('data-thread', k);
      if (subject) subject.textContent = sc.subject || '';
      if (caption) { caption.textContent = sc.caption || ''; requestAnimationFrame(function () { caption.classList.add('show'); }); }
      if (device._play) device._play(k);
      device.classList.remove('is-switching');
    }
    function show(k, fromUser) {
      var sc = SCENARIOS[k];
      if (!sc) return;
      current = k;
      tabs.forEach(function (t) { var on = t.getAttribute('data-key') === k; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
      if (panel) panel.setAttribute('aria-labelledby', 'tab-' + k);
      /* On a phone the menu is a swipeable row: keep the active chip centered in it (the row scrolls, not the page). */
      var list = $('.action__list', wrap), active = tabs[keys.indexOf(k)];
      if (list && active && list.scrollWidth > list.clientWidth + 4) {
        var left = Math.max(0, active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2);
        try { list.scrollTo({ left: left, behavior: noMotion ? 'auto' : 'smooth' }); } catch (e) { list.scrollLeft = left; }
      }
      /* Once the visitor picks, auto-advance stops for good and the caption may announce (never during the self-running cycle). */
      if (fromUser) { touched = true; stopAuto(); if (caption) caption.setAttribute('aria-live', 'polite'); }
      if (caption) caption.classList.remove('show');
      if (switching) clearTimeout(switching);
      if (noMotion) { apply(k, sc); return; }
      device.classList.add('is-switching');
      switching = setTimeout(function () { apply(k, sc); }, 240);
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(t.getAttribute('data-key'), true); });
      t.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(t), n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); n.focus(); show(n.getAttribute('data-key'), true); }
      });
    });
    /* Auto-advance happens when a conversation finishes (the player asks via _onEnd), never on a clock, and waits while the visitor is hovering, focused inside, or away. */
    function stopAuto() { device._onEnd = null; }
    function startAuto() {
      if (noMotion || touched) return;
      device._onEnd = function () {
        if (touched || !visible || hover || focused || doc.hidden) return false;
        show(keys[(keys.indexOf(current) + 1) % keys.length], false);
        return true;
      };
    }
    wrap.addEventListener('mouseenter', function () { hover = true; });
    wrap.addEventListener('mouseleave', function () { hover = false; });
    wrap.addEventListener('focusin', function () { focused = true; });
    wrap.addEventListener('focusout', function () { focused = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.25 }).observe(wrap);
    else visible = true;
    var first = SCENARIOS[current];
    if (first) {
      if (subject) subject.textContent = first.subject || '';
      if (caption) { caption.textContent = first.caption || ''; caption.classList.add('show'); }
    }
    startAuto();
  }

  /* Pinned before/after: while the track is pinned, scroll progress (--p) carries the green pane up and over the grey one into place. */
  function initPin() {
    var pin = $('[data-pin]');
    if (!pin) return;
    var stick = $('.pin__stick', pin);
    var mq = window.matchMedia ? window.matchMedia('(min-width: 861px)') : { matches: true };
    var ticking = false;
    function measure() {
      if (!stick) return;
      pin.style.setProperty('--ph', stick.offsetHeight + 'px');
      pin.classList.toggle('pin--static', stick.offsetHeight + 96 > window.innerHeight);
    }
    function update() {
      ticking = false;
      if (noMotion || !mq.matches || !stick || pin.classList.contains('pin--static')) { pin.style.setProperty('--p', '1'); return; }
      var total = pin.offsetHeight - stick.offsetHeight;
      if (total <= 0) { pin.style.setProperty('--p', '1'); return; }
      var travelled = stick.getBoundingClientRect().top - pin.getBoundingClientRect().top;
      var p = Math.min(1, Math.max(0, travelled / total));
      pin.style.setProperty('--p', p.toFixed(4));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); update(); });
    measure(); update();
    setTimeout(function () { measure(); update(); }, 600);
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
    initTicker(); initReveal(); initHeader(); initActiveAnchor(); initCountUp(); initThreads(); initAction(); initPin(); initFaq(); initSticky();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
