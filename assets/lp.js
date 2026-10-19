/* Advisor Booking /meetings landing page (hidden). The gated booking flow:
   phone + first + last reveal the rest of the form, two qualifying questions decide the tier, every tier can book,
   ad pixels fire only for tier "qualified". IDs and the Calendly URL come from assets/config.js (window.AB_CONFIG),
   so this file only holds lander-specific settings. No dependencies. */
(function () {
  'use strict';

  var AB = window.AB_CONFIG || {};
  var doc = document;

  /* ============================================================
     LP CONFIG. Page-specific settings live here; account-wide IDs
     (Calendly URL, GHL webhook, pixel IDs, email) stay in config.js.
     ============================================================ */
  var LP = {
    // GoHighLevel inbound webhook. Every stage (contact, qualified/disqualified/low_intent, booked) POSTs here as JSON.
    // Empty (the config.js default) = nothing is sent; the visitor still books.
    WEBHOOK_URL: AB.ghlWebhookUrl || '',
    // Stamped on every payload so a CRM record can be traced to the page build that sent it.
    FORM_VERSION: 'ab-meetings-2026-10-19-v1',
    SOURCE: 'advisorbooking-meetings-lp',

    // Calendly: the 20-minute Pipeline Audit event from config.js.
    CALENDLY_URL: AB.calendlyUrl || '',
    CALENDLY_EMBED_PARAMS: 'hide_gdpr_banner=1&hide_event_type_details=1&primary_color=0f7a62&text_color=0e0e0e',
    // Scheduling provider and the iClosed event link, both from config.js. iClosed is embedded with its own inline widget
    // (the event's embed code, built here so the visitor's details can be prefilled); if the widget script is blocked, a
    // plain iframe of the same link is used instead. The event's confirmation page must be the site's /booked page
    // (forwarding on), which records the booking whether it opens inside the calendar or as its own page.
    SCHEDULER: AB.scheduler || 'iclosed',
    ICLOSED_URL: AB.iclosedUrl || '',
    // The iClosed event's own questions, prefilled from this form so the visitor does not answer twice. Keys are each
    // question's Identifier in iClosed. The answers are sent word for word, so the iClosed answer options must be the same
    // as this form's ("Yes, that works" / "Not right now", "Yes" / "No").
    ICLOSED_QUESTIONS: { company: 'company', budget: 'budget', ready: 'ready' },
    // The event's one optional question ("Please share anything...") is prefilled with firm + answers so Nick
    // sees them on the booking. The visitor can edit or clear it.
    PREFILL_NOTES: true,

    // Video slot. Empty (both) = the slot and nothing else is removed; the headline, description and CTA stay.
    // Paste a YouTube/Vimeo/Wistia/.mp4 URL or a full player embed (single string) to bring the video back.
    VSL_OPENER_URL: '',
    VSL_OPENER_EMBED_HTML: '',

    // How-it-works images (3 URLs, in step order). Empty = the image frame is removed (typography-only column).
    HOW_IMAGES: ['', '', ''],

    // THE TWO QUALIFYING QUESTIONS. Single source of truth for text, options and sub-copy.
    QUESTIONS: {
      budget: {
        question: 'Getting started takes about $5K to invest in marketing. Does that work for you?',
        affirmative: 'Yes, that works',
        negative: 'Not right now',
        subcopy: 'Setup is $5,000 to $10,000 depending on your list. Exact numbers on the call.'
      },
      ready: {
        question: 'Are you ready to start today?',
        affirmative: 'Yes',
        negative: 'No',
        subcopy: ''
      }
    },

    // Qualification rule:
    //   Budget "Not right now"  -> tier "disqualified": the exit panel below, no ad pixels, can still book.
    //   Ready "No" (budget ok)  -> tier "low_intent": books normally, no ad pixels.
    //   Both affirmative        -> tier "qualified": Meta Lead fires on submit, Schedule on booking.
    EXIT_COPY: {
      title: 'Not a fit just yet.',
      body: 'The system needs about $5K to start: that covers your list, your messages, the email setup and the message pack for your compliance officer to review. If the budget opens up later, we should talk then. You can also book the call now and we will tell you what to do in the meantime, free.',
      cta: 'Book the call anyway'
    },

    // SMS consent. true = the box must be checked to Continue. The label text lives in each page's HTML and is captured into consent_text.
    CONSENT_SMS_REQUIRED: true,
    CONSENT_TEXT_VERSION: '2026-10-19-b',

    // Bot gate: a Continue faster than this many seconds after page load proceeds visually but the POST is
    // tagged bot_flag=true (same for the honeypot). The CRM decides what to do with flagged records.
    MIN_SECONDS_TO_SUBMIT: 3,
    TEST_MODE: false
  };
  /* ============================================================ */
  /* Per-page overrides: a page may define window.AB_LP before this script (the /pilot page sets its own
     questions, exit copy, form version and source). Objects merge two levels deep; anything else replaces. */
  (function merge(target, over, depth) {
    if (!over || typeof over !== 'object') return;
    for (var k in over) {
      if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
      var v = over[k];
      if (depth < 2 && v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) merge(target[k], v, depth + 1);
      else target[k] = v;
    }
  })(LP, window.AB_LP, 0);

  var WEBHOOK_TIMEOUT_MS = 4000;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var PARAMS = (function () { var o = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { o[k] = v; }); } catch (e) {} return o; })();
  var EVENT_ID = 'ab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  var T0 = Date.now();
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(id) { return doc.getElementById(id); }
  function text(el, s) { if (el) el.textContent = s; }
  function cookie(n) { var m = doc.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; }
  function announce(msg) { var l = $('live'); if (!l) return; l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 40); }
  function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }
  function uuid() {
    try { if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID(); } catch (e) {}
    return 'ab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  /* ---------- attribution (same sessionStorage key the rest of the site uses) ---------- */
  var utm = (function () {
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('ab_utm') || '{}') || {}; } catch (e) { stored = {}; }
    var found = false;
    UTM_KEYS.forEach(function (k) { if (PARAMS[k]) { stored[k] = PARAMS[k]; found = true; } });
    if (found) { try { sessionStorage.setItem('ab_utm', JSON.stringify(stored)); } catch (e) {} }
    return stored;
  })();

  /* ---------- tracking (loaded only when the IDs exist in config.js) ----------
     Meta events use trackSingle so a second pixel added to the site later never receives lander events. */
  function bootstrapPixels() {
    if (navigator.globalPrivacyControl) return;   /* honor GPC: no advertising pixels for this visit */
    if (AB.metaPixelId) {
      try {
        if (typeof window.fbq !== 'function') {
          !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        }
        window.fbq('init', String(AB.metaPixelId));
        window.fbq('trackSingle', String(AB.metaPixelId), 'PageView');
      } catch (e) {}
    }
    if (AB.linkedinPartnerId) {
      try {
        window._linkedin_partner_id = String(AB.linkedinPartnerId);
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
        if (!window.lintrk) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
        var s0 = doc.getElementsByTagName('script')[0];
        var b0 = doc.createElement('script');
        b0.type = 'text/javascript'; b0.async = true;
        b0.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
        s0.parentNode.insertBefore(b0, s0);
      } catch (e) {}
    }
  }
  function fbqSingle(evt, opts) {
    if (!AB.metaPixelId || typeof window.fbq !== 'function') return;
    try { window.fbq('trackSingle', String(AB.metaPixelId), evt, {}, opts || {}); } catch (e) {}
  }

  /* ---------- state ---------- */
  var answers = {};      // first, last, name, phone, email, consent, budget, ready, company
  var sid = null;        // submission id, created the first time anything is persisted
  var tier = null;       // "qualified" | "low_intent" | "disqualified"
  var stage = null;      // "contact" | "answered" | "answered_exit" | "booked"
  var bookedFlag = false;
  var firstName = '';
  var botFlag = false, botReason = '';
  var resumed = false;
  var contactSent = false;
  var moreShown = false;
  var unlocked = false;
  var calIv = null;

  /* ---------- persistence (localStorage, 7 days) ---------- */
  var KEY = 'ab_lp_v1', TTL = 7 * 24 * 60 * 60 * 1000;
  function load() {
    try {
      var raw = localStorage.getItem(KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.ts || (Date.now() - o.ts) > TTL) { localStorage.removeItem(KEY); return null; }
      return o;
    } catch (e) { return null; }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ sid: sid, stage: stage, answers: answers, tier: tier, booked: bookedFlag, firstName: firstName, contactSent: contactSent, ts: Date.now() }));
    } catch (e) {}
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- webhook (JSON to the GHL inbound webhook, site.js pattern, per-stage dedupe) ---------- */
  var attemptedPosts = Object.create(null);
  function consentText() {
    var l = $('consentText');
    return l ? (l.innerText || l.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }
  function payload(st, extra) {
    var A = answers, k;
    var p = {
      submission_id: sid, stage: st, tier: tier || null, event_id: EVENT_ID,
      source: LP.SOURCE, form_version: LP.FORM_VERSION, ts_iso: new Date().toISOString(),
      page_url: location.href, referrer: doc.referrer, user_agent: navigator.userAgent,
      utm_source: utm.utm_source || '', utm_medium: utm.utm_medium || '', utm_campaign: utm.utm_campaign || '',
      utm_term: utm.utm_term || '', utm_content: utm.utm_content || '',
      gclid: utm.gclid || '', fbclid: utm.fbclid || '', fbp: cookie('_fbp'), fbc: cookie('_fbc'),
      sms_consent: !!A.consent, consent_text: consentText(), consent_text_version: LP.CONSENT_TEXT_VERSION,
      consent_timestamp: new Date().toISOString(),
      bot_flag: botFlag ? 'true' : 'false', bot_reason: botReason,
      test_mode: LP.TEST_MODE ? 'true' : 'false'
    };
    if (A.first !== undefined || A.name !== undefined) {
      p.first_name = A.first || ''; p.last_name = A.last || ''; p.full_name = A.name || '';
      p.phone = String(A.phone || '').replace(/\D/g, ''); p.phone_display = A.phone || ''; p.phone_e164 = phoneE164(A.phone);
      p.email = A.email || '';
    }
    if (A.budget !== undefined) {
      p.budget_answer = A.budget || ''; p.ready_answer = A.ready || ''; p.company = A.company || '';
      p.dq_reason = (tier === 'disqualified') ? 'budget' : '';
    }
    if (extra) for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) p[k] = extra[k];
    return p;
  }
  function send(st, extra) {
    var url = LP.WEBHOOK_URL;
    if (!url || typeof fetch !== 'function') return;
    if (!sid) return;
    var key = sid + ':' + st;
    if (attemptedPosts[key]) return;
    attemptedPosts[key] = true;
    var body = JSON.stringify(payload(st, extra));
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, WEBHOOK_TIMEOUT_MS) : null;
    function done() { if (timer) clearTimeout(timer); }
    try {
      fetch(url, { method: 'POST', keepalive: true, body: body, headers: { 'Content-Type': 'application/json' }, signal: controller ? controller.signal : undefined })
        .then(done).catch(function (err) {
          done();
          if (err && err.name === 'AbortError') return;
          /* CORS or network failure: resend as an opaque request. The UI never waits on this. */
          try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {}); } catch (e) {}
        });
    } catch (e) {}
  }

  /* ---------- video slot (empty for now: the slot is removed; set LP.VSL_OPENER_URL to bring it back) ---------- */
  function vslSource(url) {
    url = (url || '').trim(); if (!url) return null;
    var m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)))
      return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1';
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/)))
      return 'https://player.vimeo.com/video/' + m[1] + '?dnt=1' + (m[2] ? '&h=' + m[2] : '');
    if ((m = url.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([A-Za-z0-9]+)/)))
      return 'https://fast.wistia.net/embed/iframe/' + m[1];
    return url;
  }
  function renderVsl() {
    var host = $('vslOpener'); if (!host) return;
    var embed = String(LP.VSL_OPENER_EMBED_HTML || '').trim();
    if (embed) {
      host.className += ' lp-vsl--embed';
      host.innerHTML = embed;
      var olds = host.querySelectorAll('script');
      for (var i = 0; i < olds.length; i++) {
        var old = olds[i], s = doc.createElement('script');
        for (var a = 0; a < old.attributes.length; a++) s.setAttribute(old.attributes[a].name, old.attributes[a].value);
        s.text = old.text || old.textContent || '';
        old.parentNode.replaceChild(s, old);
      }
      return;
    }
    var url = String(LP.VSL_OPENER_URL || '').trim();
    if (!url) { host.parentNode.removeChild(host); return; }
    if (/\.(mp4|webm|m3u8)(\?[^#]*)?$/i.test(url)) {
      var v = doc.createElement('video');
      v.controls = true; v.setAttribute('playsinline', ''); v.preload = 'metadata'; v.src = url;
      host.appendChild(v); return;
    }
    var f = doc.createElement('iframe');
    f.setAttribute('loading', 'lazy');
    f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.title = 'Advisor Booking overview video';
    f.src = vslSource(url);
    host.appendChild(f);
  }

  /* ---------- how-it-works images ---------- */
  function renderHowImages() {
    var figs = doc.querySelectorAll('.lp-step__img');
    for (var i = 0; i < figs.length; i++) {
      var idx = parseInt(figs[i].getAttribute('data-how'), 10) || 0;
      var src = (LP.HOW_IMAGES || [])[idx] || '';
      if (src) {
        var img = doc.createElement('img'); img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
        figs[i].appendChild(img);
      } else if (figs[i].parentNode) { figs[i].parentNode.removeChild(figs[i]); }
    }
  }

  /* ---------- the two questions render from LP.QUESTIONS ---------- */
  function renderQuestions() {
    var Q = LP.QUESTIONS;
    text($('budgetQ'), Q.budget.question); text($('budgetSub'), Q.budget.subcopy);
    text($('readyQ'), Q.ready.question); text($('readySub'), Q.ready.subcopy);
    [['in-budget', Q.budget], ['in-ready', Q.ready]].forEach(function (pair) {
      var sel = $(pair[0]); if (!sel) return;
      [pair[1].affirmative, pair[1].negative].forEach(function (v) {
        if (!v) return;
        var o = doc.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
      });
    });
    var sub = $('budgetSub'); if (sub && !LP.QUESTIONS.budget.subcopy) sub.parentNode.removeChild(sub);
    var sub2 = $('readySub'); if (sub2 && !LP.QUESTIONS.ready.subcopy) sub2.parentNode.removeChild(sub2);
  }

  /* ---------- legal links: new tab, never lose the form ---------- */
  function initLinks() {
    var as = doc.querySelectorAll('a[data-link]');
    for (var i = 0; i < as.length; i++) {
      as[i].target = '_blank'; as[i].rel = 'noopener noreferrer';
      as[i].addEventListener('click', function (ev) { ev.stopPropagation(); });
    }
  }

  /* ---------- DOM refs ---------- */
  var glass, calLock, sched, booked, form, more, restartWrap, stp1, stp2, stepsLine, exitEl;

  /* ---------- validation ---------- */
  function setInvalid(id, bad) {
    var el = $(id); if (!el) return;
    el.classList[bad ? 'add' : 'remove']('invalid');
    var ctl = el.querySelector('input,select'), err = el.querySelector('.lp-err');
    if (!ctl) return;
    ctl.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (!err || !err.id) return;
    var base = ctl.getAttribute('data-desc');
    if (base === null) { base = ctl.getAttribute('aria-describedby') || ''; ctl.setAttribute('data-desc', base); }
    var desc = (base + (bad ? ' ' + err.id : '')).trim();
    if (desc) ctl.setAttribute('aria-describedby', desc); else ctl.removeAttribute('aria-describedby');
  }
  function firstErrorText(scope) {
    var e = scope.querySelector('.invalid .lp-err');
    return e ? (e.textContent || '').trim() : 'Check the highlighted fields.';
  }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function phoneOk(v) { return v.replace(/\D/g, '').length === 10; }
  function phoneE164(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d.length === 10 ? '+1' + d : ''; }
  function formatPhoneInput() {
    var el = $('in-phone'); if (!el) return;
    var d = el.value.replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length > 10) d = d.slice(0, 10);
    var f = d;
    if (d.length > 6) f = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    else if (d.length > 3) f = '(' + d.slice(0, 3) + ') ' + d.slice(3);
    else if (d.length > 0) f = '(' + d;
    if (el.value !== f) { el.value = f; try { el.setSelectionRange(f.length, f.length); } catch (e) {} }
  }
  function consentChecked() { var c = $('in-consent'); return !!(c && c.checked); }
  function focusFirstInvalid(scope) { var bad = scope.querySelector('.invalid input, .invalid select'); if (bad) bad.focus(); }

  /* ---------- progress header + button label ---------- */
  function setDots(step, line) {
    if (step >= 2) { stp2.classList.add('on'); stp2.setAttribute('aria-current', 'step'); stp1.removeAttribute('aria-current'); }
    else { stp2.classList.remove('on'); stp2.removeAttribute('aria-current'); stp1.setAttribute('aria-current', 'step'); }
    text(stepsLine, line || (step >= 2 ? 'Pick a time that works. 20 minutes, on Google Meet.' : 'Two quick steps, then you pick a time.'));
  }
  function updateBtnLabel() {
    var q = LP.QUESTIONS;
    var good = val('in-budget') === q.budget.affirmative && val('in-ready') === q.ready.affirmative;
    text($('btnGoLabel'), good ? 'Continue to pick your time' : 'Continue');
  }

  /* ---------- the reveal: #more opens once phone + first + last are in ---------- */
  function contactTrigger() { return phoneOk(val('in-phone')) && !!val('in-first') && !!val('in-last'); }
  function revealMore(animate, focusEmail) {
    if (moreShown) return; moreShown = true;
    more.hidden = false;
    if (animate && !REDUCED) more.classList.add('show');
    if (restartWrap) restartWrap.hidden = false;
    updateBtnLabel();
    if (focusEmail) focusEl($('in-email'));
  }
  function onContactInput() {
    if (bookedFlag || !contactTrigger()) return;
    readContact();
    if (!sid) sid = uuid();
    if (stage !== 'answered' && stage !== 'answered_exit') stage = 'contact';
    save();
    if (!moreShown) { revealMore(true, false); announce('A few more questions appeared below.'); }
  }

  /* ---------- partial contact capture (fires once, on focusout / page exit) ---------- */
  function readContact() {
    answers.first = val('in-first'); answers.last = val('in-last');
    answers.name = (answers.first + ' ' + answers.last).trim();
    answers.phone = val('in-phone'); answers.email = val('in-email'); answers.consent = consentChecked();
  }
  function contactComplete() { return contactTrigger() && emailOk(val('in-email')); }
  function tooFast() { return !resumed && (Date.now() - T0) / 1000 < (LP.MIN_SECONDS_TO_SUBMIT || 0); }
  function maybeContact() {
    if (bookedFlag || !contactComplete()) return;
    readContact();
    if (!sid) sid = uuid();
    if (stage !== 'answered' && stage !== 'answered_exit') stage = 'contact';
    save();
    if (contactSent || tooFast()) return;
    var hp = $('in-hpx'); if (hp && hp.value.trim()) { botFlag = true; botReason = botReason || 'honeypot'; }
    contactSent = true;
    send('contact', { partial: true });
    save();
  }

  /* ---------- tier ---------- */
  function computeTier(a) {
    var Q = LP.QUESTIONS;
    if (a.budget === Q.budget.negative) return 'disqualified';
    if (a.ready === Q.ready.negative) return 'low_intent';
    return 'qualified';
  }

  /* ---------- Continue (the only button) ---------- */
  function onContinue() {
    var ok = true;
    if (!phoneOk(val('in-phone'))) { setInvalid('f-phone', true); ok = false; } else setInvalid('f-phone', false);
    if (!val('in-first')) { setInvalid('f-first', true); ok = false; } else setInvalid('f-first', false);
    if (!val('in-last')) { setInvalid('f-last', true); ok = false; } else setInvalid('f-last', false);
    if (!moreShown) {
      if (!ok) { announce(firstErrorText(form)); focusFirstInvalid(form); return; }
      revealMore(true, true);
      announce('A few more questions. Then you pick a time.');
      return;
    }

    var email = val('in-email'), budget = val('in-budget'), ready = val('in-ready'), company = val('in-company');
    if (!emailOk(email)) { setInvalid('f-email', true); ok = false; } else setInvalid('f-email', false);
    if (!budget) { setInvalid('f-budget', true); ok = false; } else setInvalid('f-budget', false);
    if (!ready) { setInvalid('f-ready', true); ok = false; } else setInvalid('f-ready', false);
    if (!company) { setInvalid('f-company', true); ok = false; } else setInvalid('f-company', false);
    if (LP.CONSENT_SMS_REQUIRED && !consentChecked()) { $('f-consent').classList.add('invalid'); ok = false; } else $('f-consent').classList.remove('invalid');
    if (!ok) { announce(firstErrorText(form)); focusFirstInvalid(form); return; }

    var hp = $('in-hpx');
    if (hp && hp.value.trim()) { botFlag = true; botReason = botReason || 'honeypot'; }
    if (tooFast()) { botFlag = true; botReason = botReason || 'too_fast'; }

    maybeContact();
    readContact();
    answers.budget = budget; answers.ready = ready; answers.company = company;
    if (!sid) sid = uuid();
    tier = computeTier(answers); stage = 'answered'; save();

    send(tier);                                              // one record per completed form; stage = the tier
    if (!botFlag && tier === 'qualified') fbqSingle('Lead', { eventID: EVENT_ID });

    if (tier === 'disqualified') showExit(); else unlock(false);
  }

  /* ---------- exit panel (budget "Not right now") ---------- */
  function showExit(immediate) {
    var E = LP.EXIT_COPY;
    text($('exitH'), E.title); text($('exitP'), E.body); text($('exitCta'), E.cta);
    var finish = function () {
      glass.hidden = true; calLock.hidden = true;
      exitEl.hidden = false; exitEl.classList.add('show');
      announce(E.title + ' ' + E.body);
      focusEl($('exitH'));
    };
    if (immediate || REDUCED) { finish(); return; }
    glass.style.transition = 'opacity .3s, transform .3s'; glass.style.opacity = '0'; glass.style.transform = 'scale(.98)';
    calLock.style.transition = 'opacity .3s'; calLock.style.opacity = '0';
    setTimeout(finish, 300);
  }
  function hideExit() { if (!exitEl) return; exitEl.classList.remove('show'); exitEl.hidden = true; }

  /* ---------- unlock the calendar (every tier books the same call) ---------- */
  function unlock(immediate) {
    if (unlocked) return; unlocked = true;
    var first = answers.first || (answers.name || '').split(/\s+/)[0] || '';
    text($('schedHi'), first ? 'Pick a time, ' + first : 'Pick a time');
    text($('schedAvatar'), (first.charAt(0) || 'A').toUpperCase());
    setDots(2);
    var finish = function () {
      glass.hidden = true; calLock.hidden = true;
      sched.classList.add('show');
      announce('Calendar unlocked. Pick a time that works.');
      focusEl($('schedHi'));
      openScheduler();
    };
    if (immediate || REDUCED) { finish(); return; }
    glass.style.transition = 'opacity .3s, transform .3s'; glass.style.opacity = '0'; glass.style.transform = 'scale(.98)';
    calLock.style.transition = 'opacity .3s'; calLock.style.opacity = '0';
    setTimeout(finish, 300);
  }

  function showBooked(first) {
    text($('bookedName'), first ? 'You’re booked, ' + first + '.' : 'You’re booked.');
    glass.hidden = true; calLock.hidden = true;
    sched.classList.remove('show'); sched.hidden = true;
    booked.classList.add('show');
    setDots(2, 'Done. Check your email for the invite.');
    announce('You are booked. Check your email for the invite.');
    focusEl($('bookedName'));
  }

  function startOver() {
    wipe();
    if (calIv) { clearInterval(calIv); calIv = null; }
    var host = $('scheduler'); if (host) host.innerHTML = '';
    answers = {}; sid = null; tier = null; stage = null; bookedFlag = false; botFlag = false; botReason = '';
    firstName = ''; resumed = false; contactSent = false; moreShown = false; unlocked = false; T0 = Date.now();
    attemptedPosts = Object.create(null);
    try { form.reset(); } catch (e) {}
    var wraps = glass.querySelectorAll('.lp-field'); for (var i = 0; i < wraps.length; i++) if (wraps[i].id) setInvalid(wraps[i].id, false);
    $('f-consent').classList.remove('invalid');
    updateBtnLabel();
    more.hidden = true; more.classList.remove('show'); if (restartWrap) restartWrap.hidden = true;
    sched.classList.remove('show'); sched.hidden = false; booked.classList.remove('show'); hideExit();
    glass.hidden = false; glass.style.opacity = ''; glass.style.transform = '';
    calLock.hidden = false; calLock.style.opacity = '';
    setDots(1);
    announce('Form cleared. Start with your mobile number.');
    var n = $('in-phone'); if (n) n.focus();
  }

  /* ---------- Calendly (assets load only when needed) ---------- */
  var calAssets = false;
  function loadCalendlyAssets() {
    if (calAssets) return; calAssets = true;
    var l = doc.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://assets.calendly.com/assets/external/widget.css'; doc.head.appendChild(l);
    var s = doc.createElement('script'); s.async = true;
    s.src = 'https://assets.calendly.com/assets/external/widget.js'; doc.head.appendChild(s);
  }
  function calendlyBase() {
    var u = LP.CALENDLY_URL, p = LP.CALENDLY_EMBED_PARAMS || '';
    if (!u) return '';
    return p ? u + (u.indexOf('?') > -1 ? '&' : '?') + p : u;
  }
  function notesA1() {
    if (!LP.PREFILL_NOTES) return '';
    var bits = [];
    if (answers.company) bits.push('Firm: ' + answers.company);
    if (answers.ready) bits.push('Ready to start today: ' + answers.ready);
    return bits.join(' · ');
  }
  function prefillUrl() {
    var base = calendlyBase();
    if (!base) return '';
    var u = base + (base.indexOf('?') > -1 ? '&' : '?');
    u += 'name=' + encodeURIComponent(answers.name || '') + '&email=' + encodeURIComponent(answers.email || '');
    var a1 = notesA1();
    if (a1) u += '&a1=' + encodeURIComponent(a1);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (utm[k]) u += '&' + k + '=' + encodeURIComponent(utm[k]);
    });
    return u;
  }
  function iclosedUrl() {
    var base = String(LP.ICLOSED_URL || '').trim();
    if (!base) return '';
    var u = base + (base.indexOf('?') > -1 ? '&' : '?');
    u += 'iclosedName=' + encodeURIComponent(answers.name || '') + '&iclosedEmail=' + encodeURIComponent(answers.email || '');
    u += '&iclosedPhone=' + encodeURIComponent(phoneE164(answers.phone) || answers.phone || '');
    var IQ = LP.ICLOSED_QUESTIONS || {};
    ['company', 'budget', 'ready'].forEach(function (k) {
      if (IQ[k] && answers[k]) u += '&' + IQ[k] + '=' + encodeURIComponent(answers[k]);
    });
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (utm[k]) u += '&' + k + '=' + encodeURIComponent(utm[k]);
    });
    return u;
  }
  function openScheduler() {
    if (LP.SCHEDULER === 'iclosed') { openIclosed(); return; }
    openCalendly();
  }
  /* iClosed's inline embed code, built in place: <div class="iclosed-widget" data-url="..."> plus widget.js. The script is
     added after the div exists so it finds it; a fresh script tag runs it again after "Start over". */
  var ICLOSED_WIDGET_JS = 'https://app.iclosed.io/assets/widget.js';
  function iclosedFrame(host, url) {
    host.innerHTML = '';
    var f = doc.createElement('iframe');
    f.className = 'lp-sched-frame';
    f.title = 'Pick a time for your call';
    f.setAttribute('loading', 'eager');
    f.setAttribute('allow', 'payment *; clipboard-write');
    f.src = url;
    host.appendChild(f);
    var p = doc.createElement('p');
    p.className = 'lp-sched-alt';
    var a = doc.createElement('a');
    a.href = url; a.textContent = 'Calendar not showing? Open it here.';
    p.appendChild(a);
    host.appendChild(p);
  }
  /* Artifact previews block iClosed's script. Load the same prefilled link straight into a frame instead; if the preview
     blocks frames too, swap in a note. A button opens the real calendar in a new tab either way. */
  function iclosedPreview(host, url) {
    host.innerHTML = '';
    var f = doc.createElement('iframe');
    f.className = 'lp-sched-frame';
    f.title = 'Pick a time for your call';
    f.src = url;
    host.appendChild(f);
    function onBlock(e) {
      if (String(e.blockedURI || '').indexOf('iclosed.io') === -1) return;
      doc.removeEventListener('securitypolicyviolation', onBlock);
      if (!f.parentNode) return;
      var n = doc.createElement('p');
      n.className = 'notice';
      n.textContent = 'This preview blocks the iClosed calendar. On the live site it shows right here.';
      f.parentNode.replaceChild(n, f);
    }
    doc.addEventListener('securitypolicyviolation', onBlock);
    var a = doc.createElement('a');
    a.className = 'pill pill--accent lp-btn-block lp-sched-open';
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = 'Open the real calendar in a new tab';
    host.appendChild(a);
  }
  function openIclosed() {
    var host = $('scheduler');
    if (!host) return;
    var url = iclosedUrl();
    if (!url) { host.innerHTML = '<p class="notice">The calendar is not connected yet. Email ' + (AB.email || 'info@advisorbooking.com') + ' and we will send you times.</p>'; return; }
    host.innerHTML = '';
    host.classList.add('is-iclosed');
    if (window.__AB_PREVIEW) { iclosedPreview(host, url); return; }
    var w = doc.createElement('div');
    w.className = 'iclosed-widget';
    w.setAttribute('data-url', url);
    w.setAttribute('title', 'Pick a time for your call');
    w.style.width = '100%'; w.style.height = '620px';
    host.appendChild(w);
    /* The widget puts an iframe on the page within moments. If the script fails or no iframe appears (ad blocker,
       network), embed the link directly. Skip if "Start over" removed this widget in the meantime. */
    var settled = false;
    function fallback() {
      if (settled) return; settled = true;
      if (calIv) { clearInterval(calIv); calIv = null; }
      if (!w.isConnected || host.querySelector('iframe')) return;
      iclosedFrame(host, url);
    }
    var s = doc.createElement('script');
    s.type = 'text/javascript'; s.async = true; s.src = ICLOSED_WIDGET_JS;
    s.onerror = fallback;
    doc.body.appendChild(s);
    var waited = 0;
    if (calIv) { clearInterval(calIv); calIv = null; }
    calIv = setInterval(function () {
      if (host.querySelector('iframe')) { settled = true; clearInterval(calIv); calIv = null; return; }
      if ((waited += 250) >= 8000) fallback();
    }, 250);
  }
  function openCalendly() {
    loadCalendlyAssets();
    var host = $('scheduler');
    var waited = 0;
    if (calIv) { clearInterval(calIv); calIv = null; }
    calIv = setInterval(function () {
      if (window.Calendly && host) {
        clearInterval(calIv); calIv = null;
        var a1 = notesA1();
        window.Calendly.initInlineWidget({
          url: calendlyBase(),
          parentElement: host,
          prefill: { name: answers.name || '', email: answers.email || '', customAnswers: a1 ? { a1: a1 } : {} },
          utm: { utmSource: utm.utm_source || '', utmMedium: utm.utm_medium || '', utmCampaign: utm.utm_campaign || '', utmTerm: utm.utm_term || '', utmContent: utm.utm_content || '' }
        });
      } else if ((waited += 250) >= 10000) {
        clearInterval(calIv); calIv = null;
        if (window.__AB_PREVIEW) {
          /* preview build: the sandbox blocks the scheduler's script, so show a note instead of redirecting */
          if (host) host.innerHTML = '<p class="notice">The calendar loads right here on the live site. It is blocked inside this preview.</p>';
          return;
        }
        /* ad blocker or CDN blocked: hosted booking page with the same prefill */
        var url = prefillUrl();
        if (url) window.location.href = url;
      }
    }, 250);
  }

  /* ---------- booking confirmed ---------- */
  function initBookedListener() {
    window.addEventListener('message', function (e) {
      if (!e) return;
      var d = e.data || {};
      var fromCalendly = e.origin === 'https://calendly.com' && typeof d.event === 'string' && d.event === 'calendly.event_scheduled';
      var fromBookedPage = e.origin === location.origin && d && d.event === 'iclosed.booked';
      if (!fromCalendly && !fromBookedPage) return;
      if (bookedFlag) return;
      var extra = { scheduler: fromCalendly ? 'calendly' : 'iclosed' };
      if (fromCalendly) {
        var p = d.payload || {};
        extra.calendly_event_uri = (p.event && p.event.uri) || '';
        extra.calendly_invitee_uri = (p.invitee && p.invitee.uri) || '';
      } else if (d.payload && d.payload.forwarded) {
        extra.booking = d.payload.forwarded;   /* what iClosed forwarded to /booked: event, host, time zone, UTMs */
      }
      send('booked', extra);
      if (!botFlag && tier === 'qualified') {
        fbqSingle('Schedule', { eventID: (sid || EVENT_ID) + '-booked' });
        if (typeof window.lintrk === 'function' && AB.linkedinConversionId) {
          try { window.lintrk('track', { conversion_id: AB.linkedinConversionId }); } catch (err) {}
        }
      }
      firstName = answers.first || (answers.name || '').split(/\s+/)[0] || '';
      bookedFlag = true; stage = 'booked'; answers = {};   // keep only the first name; drop everything else typed
      save();
      showBooked(firstName);
    });
  }
  /* Labels beside the calendar come from config.js (event name and length). */
  function fillEventLabels() {
    var els = doc.querySelectorAll('[data-config]');
    for (var i = 0; i < els.length; i++) { var k = els[i].getAttribute('data-config'); if (AB[k]) els[i].textContent = String(AB[k]); }
  }

  /* ---------- returning visitor ---------- */
  function resume() {
    var s = load(); if (!s) return;
    sid = s.sid || null; answers = s.answers || {}; tier = s.tier || null; stage = s.stage || null; bookedFlag = !!s.booked;
    firstName = s.firstName || ''; contactSent = s.contactSent === true;
    resumed = true;
    if (bookedFlag) { showBooked(firstName); return; }
    if (!answers.first && !answers.phone) { answers = {}; return; }
    var set = function (id, v) {
      var el = $(id); if (!el || v === undefined || v === null) return;
      el.value = v;
      if (el.tagName === 'SELECT' && el.selectedIndex < 0) el.selectedIndex = 0;
    };
    set('in-phone', answers.phone); set('in-first', answers.first); set('in-last', answers.last); set('in-email', answers.email);
    var c = $('in-consent'); if (c) c.checked = !!answers.consent;
    set('in-budget', answers.budget || ''); set('in-ready', answers.ready || ''); set('in-company', answers.company || '');
    updateBtnLabel();
    if (stage === 'answered' && tier === 'disqualified') { showExit(true); return; }
    if ((stage === 'answered' || stage === 'answered_exit') && tier) { unlock(true); return; }
    if (contactTrigger()) revealMore(false, false);
  }

  /* ---------- boot ---------- */
  function init() {
    glass = $('formGlass'); calLock = $('calLock'); sched = $('sched'); booked = $('booked');
    form = $('leadForm'); more = $('more'); restartWrap = $('restartWrap');
    stp1 = $('stp1'); stp2 = $('stp2'); stepsLine = $('stepsLine'); exitEl = $('exit');
    if (!form) return;

    bootstrapPixels();
    renderVsl();
    renderHowImages();
    renderQuestions();
    initLinks();
    initBookedListener(); fillEventLabels();

    form.addEventListener('input', function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      var f = t.closest('.lp-field'); if (f && f.id) setInvalid(f.id, false);
      if (t.id === 'in-consent') $('f-consent').classList.remove('invalid');
    });
    form.addEventListener('change', function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      var f = t.closest('.lp-field'); if (f && f.id) setInvalid(f.id, false);
      if (t.id === 'in-consent') $('f-consent').classList.remove('invalid');
      if (t.id === 'in-budget' || t.id === 'in-ready') updateBtnLabel();
    });
    $('in-phone').addEventListener('input', formatPhoneInput);
    $('in-phone').addEventListener('input', onContactInput);
    $('in-first').addEventListener('input', onContactInput);
    $('in-last').addEventListener('input', onContactInput);
    form.addEventListener('focusout', function (ev) {
      var t = ev.target; if (!t || !t.id) return;
      if (t.id === 'in-phone' || t.id === 'in-first' || t.id === 'in-last' || t.id === 'in-email') maybeContact();
    });
    $('in-consent').addEventListener('change', maybeContact);
    window.addEventListener('pagehide', maybeContact);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') maybeContact(); });

    form.addEventListener('submit', function (ev) { ev.preventDefault(); onContinue(); });
    $('startOver').addEventListener('click', startOver);
    $('startOver2').addEventListener('click', startOver);
    $('startOver3').addEventListener('click', startOver);
    $('startOver4').addEventListener('click', startOver);
    $('exitCta').addEventListener('click', function () {
      send('exit_book_anyway');                          // flagged in the CRM: booked despite the budget answer
      stage = 'answered_exit'; save();
      hideExit(); unlock(true);
    });
    $('exitBack').addEventListener('click', function () {
      hideExit();
      glass.hidden = false; glass.style.opacity = ''; glass.style.transform = '';
      calLock.hidden = false; calLock.style.opacity = '';
      revealMore(false, false);
      var b = $('in-budget'); if (b) b.focus();
      announce('Back to your answers.');
    });

    resume();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
