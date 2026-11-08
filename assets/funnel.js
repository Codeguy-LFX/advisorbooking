/* Advisor Booking form engine: one question per screen, every answer saved as it is given, then routed.
   Used by /apply (the master form) and by the study clones in /lab. Each page defines window.AB_APPLY before this
   script: its questions, routing rules and destinations. A new form is a copy of a page with a different block.

   Question types
     choice   options: ['Label', ...] or [{ label: 'Shown', value: 100000000 }, ...] (the value is what is stored and
              routed on, so ranges store an integer floor, never the label). multi: true for "check all" (Continue).
     fields   fields: [{ id, label, type: text|email|tel|url|textarea|checkbox, optional, required (checkbox), hint, srLabel }]

     loader   a checklist loading screen between parts (no answer): q (heading), sub, stages: [{label, active, done}],
              beat_ms, min_ms. It is not counted in the progress bar, and Back skips over it.

   Routing (RULES): an ordered list. The first rule with a matching answer wins; DEFAULT_ROUTE if none match.
     { route: 'dq', any: [['question_id', value], ...] }      any one condition matches
     { route: 'priority', all: [['aum', [50000000, 100000000]], ['role', 'owner'], ...] }   every condition matches
     A condition's value can be a list (any of those values). reason: 'compliance' names the rule for the outcome page.
     early: true        checked after every answer (Typeform-style jump)
     early: 'step_id'   checked once, right after that step (e.g. the end of Part 1); otherwise only at the end

   Tracking: every step pushes to window.dataLayer for GTM (see track() below for the event names).
   ROUTES maps a route to a page URL, or to { inline: { title, body, bullets, cta } } to show the result in the card.

   Answers go to AB_CONFIG.ghlWebhookUrl after every screen (stage "step") and at the end (stage "complete").
   A page sets WEBHOOK_URL: '' to never send (the /lab clones do). */
(function () {
  'use strict';
  var doc = document;
  var AB = window.AB_CONFIG || {};

  /* ============================================================ */
  var F = {
    FORM_VERSION: 'ab-form-v0',
    SOURCE: 'advisorbooking-form',
    WEBHOOK_URL: AB.ghlWebhookUrl || '',
    CONSENT_TEXT_VERSION: 'v0',
    STORE_KEY: 'ab_apply_v1',
    STORAGE: 'local',            // 'local' (7 days) or 'session' (this tab only)
    QUESTIONS: [],
    RULES: [],
    DEFAULT_ROUTE: 'main',
    ROUTES: {},
    PROGRESS_TOTAL: 0,           // 0 = number of questions. Lower it to stop counting early ("Step X of 7").
    PROGRESS_LABEL: 'Step {n} of {t}',
    PROGRESS_AFTER: 'Almost done',
    REDIRECT_DELAY_MS: 450,
    // 'tap': a single-choice screen moves on as soon as an answer is tapped (Typeform style).
    // 'continue': the tap selects, then Continue moves on (AAM style). A question can set its own "advance".
    ADVANCE: 'tap',
    // true: Continue stays disabled until the screen is valid ("each screen validates before Continue unlocks").
    LOCK_CONTINUE: false,
    // 'qf': the LendFax-style questionnaire layout (assets/qf.css). Previous sits under the answers, no step
    // animation, labels become placeholders, the page jumps to the top on each step.
    LAYOUT: '',
    SHOW_COUNT: false,           // qf only: show the "Step X of Y" line above the bar (desktop)
    // Prefill from the lander's email capture (sessionStorage ab_prefill) and from ?email=&first=&last=&firm= links
    // (e.g. a cold email). URL values are removed from the address bar at once, so they never sit in history.
    PREFILL: false,
    // Tracking gate: { id: 'aum', min: 50000000 } or a list of such conditions. Every dataLayer event (and GTM itself,
    // see gtm.js) waits until all of them are answered. All at or above min: released in order. Any below: dropped,
    // and tracking stays off for this person (S.track = 'off', which gtm.js, site.js and /booked also respect).
    TRACK_GATE: null,
    // Which stages are posted to AB_CONFIG.ghlWebhookUrl: null = every screen ('step') and the end ('complete');
    // ['complete', 'booked'] = once when the form is finished and once when a call is booked.
    WEBHOOK_STAGES: null,
    PREFILL_KEYS: ['email', 'first', 'last', 'firm'],
    // true: a route that leaves the page goes at once, with no "Thanks. One moment." screen.
    REDIRECT_QUIET: false,
    // Hosts to connect to early (from the last two screens), so the next page's calendar appears faster.
    WARM_HOSTS: [],
    TEST_MODE: false
  };
  var over = window.AB_APPLY || {};
  Object.keys(over).forEach(function (k) { F[k] = over[k]; });
  var Q = F.QUESTIONS;
  if (!Q.length) return;
  var STORE = (function () { try { return F.STORAGE === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; } })();

  /* ---------- helpers ---------- */
  function $(id) { return doc.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];          // page config copy only, never visitor input
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'ab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function urlOk(v) { return /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v); }
  function digits(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d; }
  function phoneOk(v) { return digits(v).length === 10; }
  function phoneFmt(v) { var d = digits(v).slice(0, 10); if (d.length < 4) return d; if (d.length < 7) return '(' + d.slice(0, 3) + ') ' + d.slice(3); return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); }
  function announce(msg) { var l = $('apLive'); if (!l) return; l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 40); }
  function toTop() { try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); } }
  function focusEl(h) { if (!h) return; try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var TICK = '<span class="lp-tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.2L4.6 9 10 3" stroke="#0F7A62" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  /* ---------- state ---------- */
  var TTL = 7 * 24 * 60 * 60 * 1000;
  function fresh() { return { sid: '', answers: {}, labels: {}, step: 0, route: '', started: Date.now(), consent_text: '' }; }
  var S = fresh();
  var resumed = false;
  try {
    var saved = STORE && JSON.parse(STORE.getItem(F.STORE_KEY) || 'null');
    var same = saved && saved.form_version === F.FORM_VERSION && Date.now() - (saved.started || 0) < TTL;
    if (same && !saved.done) S = saved;
    // "Change my answer" on an outcome page links back with ?resume=1: reopen the last question answered.
    else if (same && saved.done && /[?&]resume=1(&|$)/.test(location.search)) {
      S = saved; S.done = false; S.route = ''; S.route_reason = ''; S.tier = ''; resumed = true;
    }
  } catch (e) {}
  if (!S.labels) S.labels = {};
  if (!S.track) S.track = F.TRACK_GATE ? 'pending' : 'on';
  var pending = [];   // events held while the tracking gate is unanswered
  (function cleanUrl() {
    try {
      var u = new URL(location.href), changed = false, pre = {};
      try { pre = JSON.parse(sessionStorage.getItem('ab_prefill') || '{}') || {}; } catch (e) {}
      ['resume'].concat(F.PREFILL_KEYS).forEach(function (k) {
        var v = u.searchParams.get(k);
        if (v === null) return;
        if (k !== 'resume') pre[k] = v;
        u.searchParams.delete(k); changed = true;
      });
      if (changed) history.replaceState(history.state, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash);
      if (!F.PREFILL) return;
      F.PREFILL_KEYS.forEach(function (k) {
        var v = String(pre[k] || '').trim().slice(0, 200);
        if (!v || S.answers[k]) return;
        if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
        S.answers[k] = v;
      });
    } catch (e) {}
  })();
  function save() { S.form_version = F.FORM_VERSION; try { if (STORE) STORE.setItem(F.STORE_KEY, JSON.stringify(S)); } catch (e) {} }

  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('ab_utm') || '{}') || {}; } catch (e) {}
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^(gclid|fbclid|src|ref)$/.test(k)) utm[k] = v; }); } catch (e) {}
  try { sessionStorage.setItem('ab_utm', JSON.stringify(utm)); } catch (e) {}

  /* ---------- save each answer as it is given ---------- */
  function botFlag() {
    var hp = $('apHp');
    if (hp && hp.value.trim()) return 'honeypot';
    if ((Date.now() - (S.started || Date.now())) / 1000 < 3) return 'too_fast';
    return '';
  }
  function send(stage, extra) {
    var url = F.WEBHOOK_URL;
    if (!url) return;
    if (F.WEBHOOK_STAGES && F.WEBHOOK_STAGES.indexOf(stage) === -1) return;
    var bot = botFlag(), a = S.answers, L = S.labels || {}, d = digits(a.phone), q = qualified();
    var p = {
      stage: stage, submission_id: S.sid, form: F.SOURCE, form_version: F.FORM_VERSION,
      first_name: a.first || '', last_name: a.last || '', full_name: [a.first, a.last].filter(Boolean).join(' '),
      email: a.email || '', phone: d.length === 10 ? '+1' + d : (a.phone || ''),
      qualified: q === null ? '' : (q ? 'yes' : 'no'), dq_reasons: dqReasons().join(', '),
      route: S.route || '', route_reason: S.route_reason || '',
      sms_consent: a.sms_optin ? 'yes' : 'no', consent_text: S.consent_text || '', consent_version: F.CONSENT_TEXT_VERSION,
      consent_at: S.consent_at || '',
      page_url: location.href, referrer: doc.referrer, user_agent: navigator.userAgent || '',
      started_at: new Date(S.started).toISOString(), submitted_at: new Date().toISOString(),
      bot_flag: bot ? 'true' : 'false', bot_reason: bot, test_mode: F.TEST_MODE ? 'true' : 'false'
    };
    // every choice answer by question id, as the words the person picked (firm_type, role, aum, advisors, growth...)
    Q.forEach(function (x) { if (x.type === 'choice') p[x.id] = L[x.id] === undefined ? '' : [].concat(L[x.id]).join(', '); });
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) { p[k] = utm[k] || ''; });
    p.answers_json = JSON.stringify(a);
    if (extra) Object.keys(extra).forEach(function (k) { var v = extra[k]; p[k] = v && typeof v === 'object' ? JSON.stringify(v) : v; });
    postForm(url, p);
  }
  /* Form-encoded POST: a "simple" cross-site request (no preflight), so it is delivered even though the CRM sends no
     CORS headers, and sendBeacon lets it finish while the page changes. */
  function postForm(url, p) {
    var body = new URLSearchParams();
    Object.keys(p).forEach(function (k) { body.append(k, p[k] === undefined || p[k] === null ? '' : String(p[k])); });
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, body)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {}); } catch (e) {}
  }

  /* ---------- routing ---------- */
  function has(id, val) {
    var a = S.answers[id];
    return Array.isArray(a) ? a.indexOf(val) > -1 : a === val;
  }
  function cond(c) {
    var allowed = Array.isArray(c[1]) ? c[1] : [c[1]];
    for (var k = 0; k < allowed.length; k++) if (has(c[0], allowed[k])) return true;
    return false;
  }
  function ruleHit(r) {
    if (r.all && r.all.length) {
      for (var k = 0; k < r.all.length; k++) if (!cond(r.all[k])) return null;
      return { route: r.route, reason: r.reason || r.route };
    }
    var any = r.any || [];
    for (var j = 0; j < any.length; j++) if (cond(any[j])) return { route: r.route, reason: r.reason || (any[j][0] + '=' + any[j][1]), qid: any[j][0] };
    return null;
  }
  /* Qualified = every TRACK_GATE condition passes. dq_reasons = every 'dq' rule that matches (all of them, not only
     the first). */
  function qualified() {
    var list = F.TRACK_GATE ? [].concat(F.TRACK_GATE) : []; if (!list.length) return null;
    var st = list.map(condState);
    if (st.indexOf('fail') > -1) return false;
    return st.indexOf('wait') > -1 ? null : true;
  }
  function dqReasons() {
    var out = [];
    F.RULES.forEach(function (r) { if (r.route === 'dq') { var hit = ruleHit(r); if (hit && out.indexOf(hit.reason) === -1) out.push(hit.reason); } });
    return out;
  }
  function route() {
    for (var i = 0; i < F.RULES.length; i++) { var hit = ruleHit(F.RULES[i]); if (hit) return hit; }
    return { route: F.DEFAULT_ROUTE, reason: '' };
  }
  function optLabel(o) { return o && typeof o === 'object' ? String(o.label) : String(o); }
  function optValue(o) { return o && typeof o === 'object' ? o.value : o; }
  function labelFor(q, v) {
    if (Array.isArray(v)) return v.map(function (x) { return labelFor(q, x); });
    var o = (q.options || []).filter(function (x) { return optValue(x) === v; })[0];
    return o === undefined ? v : optLabel(o);
  }

  /* ---------- rendering ---------- */
  var body = $('apBody'), bar = $('apBar'), count = $('apCount'), back = $('apBack'), meta = $('apMeta');
  function counted(i) { var n = 0; for (var k = 0; k < i; k++) if (Q[k].type !== 'loader') n++; return n; }
  var total = F.PROGRESS_TOTAL || counted(Q.length);
  var QF = F.LAYOUT === 'qf' || doc.body.classList.contains('qf');
  var maxPct = 0;   // the bar never moves backward

  function progress(i) {
    i = counted(i);
    // qf counts the step you are on (LendFax: current / total); the classic card counts finished steps.
    var pct = Math.round((Math.min(QF ? i + 1 : i, total) / total) * 100);
    if (pct > maxPct) maxPct = pct;
    if (bar) bar.style.width = maxPct + '%';
    if (count) {
      count.innerHTML = i < total ? F.PROGRESS_LABEL.replace('{n}', '<b>' + (i + 1) + '</b>').replace('{t}', total) : F.PROGRESS_AFTER;
      if (QF) count.classList.toggle('is-on', !!F.SHOW_COUNT && i < total);
    }
    if (back) back.disabled = i === 0;
    if (meta) meta.hidden = false;
  }

  function render(i, focus) {
    S.step = i; save(); progress(i);
    if (i >= Q.length - 2) warm();
    var q = Q[i];
    if (q.type === 'loader') { renderLoader(q, i); return; }
    if (i === 0 && !S.viewed) { S.viewed = true; save(); track('form_view', { step_id: q.id }); }
    var screen = el('div', { class: 'ap-screen', 'data-q': q.id });
    var h = el('h2', { class: 'ap-q', id: 'apQ', tabindex: '-1', html: q.q });
    screen.appendChild(h);
    if (q.sub) screen.appendChild(el('p', { class: 'ap-sub', html: q.sub }));
    screen.appendChild(q.type === 'choice' ? renderChoice(q, i) : renderFields(q, i));
    if (q.note) screen.appendChild(el('div', { class: 'ap-note', html: q.note }));
    if (QF && i > 0) screen.appendChild(prevBtn());
    body.innerHTML = ''; body.appendChild(screen);
    if (focus !== false) {
      if (QF) { toTop(); focusEl(h); }   // heading only: never autofocus a field
      else { focusEl(h); keepInView(); }
    }
  }
  function prevBtn() {
    var b = el('button', { type: 'button', class: 'qf-prev', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg><span>Previous</span>' });
    b.addEventListener('click', function () { if (S.step > 0) history.back(); });
    return b;
  }

  /* After a screen change, bring the top of the card back under the floating nav if it scrolled away. */
  function keepInView() {
    var card = $('apCard'); if (!card) return;
    var nav = doc.getElementById('nav'), off = (nav ? nav.offsetHeight + 12 : 0) + 16;
    var top = card.getBoundingClientRect().top;
    if (top < off || top > window.innerHeight * 0.5) {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, top + window.scrollY - off), behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function renderChoice(q, i) {
    var wrap = el('div', { class: 'ap-opts' + (q.options.length === 2 && !q.multi ? ' ap-opts--2' : ''), role: 'group', 'aria-labelledby': 'apQ' });
    var tap = !q.multi && (q.advance || F.ADVANCE) === 'tap';
    var picked = q.multi ? (S.answers[q.id] || []).slice() : (S.answers[q.id] ? [S.answers[q.id]] : []);
    q.options.forEach(function (opt, n) {
      var val = optValue(opt);
      var on = picked.indexOf(val) > -1;
      var b = el('button', { type: 'button', class: 'ap-opt' + (q.multi ? ' ap-opt--multi' : ''), 'aria-pressed': on ? 'true' : 'false' }, [
        el('span', { class: 'ap-key', 'aria-hidden': 'true', text: String.fromCharCode(65 + n) }),
        el('span', { text: optLabel(opt) })
      ]);
      b.addEventListener('click', function () {
        if (tap) { answer(q, val, i); return; }
        if (!q.multi) {
          picked = [val];
          Array.prototype.forEach.call(wrap.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        } else {
          var k = picked.indexOf(val);
          if (k > -1) picked.splice(k, 1); else picked.push(val);
          b.setAttribute('aria-pressed', k > -1 ? 'false' : 'true');
        }
        if (err) err.hidden = true;
        if (F.LOCK_CONTINUE && next) next.disabled = !picked.length;
      });
      wrap.appendChild(b);
    });
    if (tap) return wrap;
    var errText = q.multi ? 'Pick at least one.' : 'Pick one.';
    var err = el('div', { class: 'lp-err ap-err', text: errText }); err.hidden = true;
    var next = el('button', { type: 'button', class: 'btn btn--accent lp-btn-block ap-next', html: '<span>' + (q.cta || 'Continue') + '</span><span class="btn__chip">' + ARROW + '</span>' });
    if (F.LOCK_CONTINUE) next.disabled = !picked.length;
    next.addEventListener('click', function () {
      if (!picked.length) { err.hidden = false; err.style.display = 'block'; announce(errText); return; }
      answer(q, q.multi ? picked.slice() : picked[0], i);
    });
    return el('div', null, [wrap, err, next]);
  }

  function fieldBad(f, inp, loose) {
    if (f.type === 'checkbox') return !!f.required && !inp.checked;
    var v = String(inp.value || '').trim();
    if (!v) return !f.optional;
    if (loose) return false;
    if (f.type === 'email') return !emailOk(v);
    if (f.type === 'tel') return !phoneOk(v);
    if (f.type === 'url') return !urlOk(v);
    return false;
  }
  function screenValid(q) {
    var loose = F.LOCK_CONTINUE === 'filled';
    // A required checkbox (without gate) doesn't lock Continue: it is checked when Continue is pressed and shows its message.
    return (q.fields || []).every(function (f) { if (f.type === 'checkbox' && !f.gate) return true; var inp = $('ap-' + f.id); return inp && !fieldBad(f, inp, loose); });
  }

  function renderFields(q, i) {
    var form = el('form', { novalidate: 'novalidate' });
    var btn;
    (q.fields || []).forEach(function (f) {
      if (f.type === 'checkbox') {
        var cb = el('input', { type: 'checkbox', id: 'ap-' + f.id });
        cb.checked = !!S.answers[f.id];
        if (f.required && f.gate) cb.addEventListener('change', function () { if (btn) btn.disabled = !cb.checked; });
        cb.addEventListener('change', function () { if (cb.checked) { var w = $('apf-' + f.id); if (w) w.classList.remove('invalid'); } });
        form.appendChild(el('div', { class: 'lp-consent', id: 'apf-' + f.id }, [
          el('div', { class: 'lp-consent__row' }, [cb, el('label', { for: 'ap-' + f.id, id: 'apl-' + f.id, html: f.label })]),
          el('div', { class: 'lp-err', text: f.error || 'Check the box to continue.' })
        ]));
        return;
      }
      var input = f.type === 'textarea'
        ? el('textarea', { id: 'ap-' + f.id, rows: '4', placeholder: f.placeholder || '' })
        : el('input', { type: f.type === 'url' ? 'text' : (f.type || 'text'), id: 'ap-' + f.id, autocomplete: f.autocomplete || 'off', placeholder: f.placeholder || '', inputmode: f.type === 'url' ? 'url' : null });
      if (f.type === 'tel') { input.setAttribute('inputmode', 'tel'); input.addEventListener('input', function () { input.value = phoneFmt(input.value); }); }
      input.value = S.answers[f.id] || '';
      // qf: the label becomes the placeholder (LendFax shows "First Name", "Email Address" inside the box).
      var srOnly = f.srLabel || (QF && !f.showLabel);
      if (QF && !f.placeholder && !f.srLabel) input.setAttribute('placeholder', String(f.label).replace(/<[^>]+>/g, '') + (f.optional ? ' (optional)' : ''));
      var label = el('label', { class: 'lp-lbl' + (srOnly ? ' sr-only' : ''), for: 'ap-' + f.id, html: f.label + (f.optional ? ' <span class="ap-optional">(optional)</span>' : '') });
      var ctl = f.type === 'tel' ? el('div', { class: 'lp-tel' }, [el('span', { class: 'lp-tel__cc', 'aria-hidden': 'true', text: '+1' }), input]) : input;
      var fieldEl = el('div', { class: 'lp-field', id: 'apf-' + f.id }, [
        label, ctl,
        f.hint ? el('p', { class: 'lp-hint', html: f.hint }) : null,
        el('div', { class: 'lp-err', text: f.error || 'Fill this in.' })
      ]);
      // "half: true" on two fields in a row puts them side by side (First Name | Last Name).
      var last = form.lastElementChild;
      if (f.half && last && last.classList.contains('qf-pair') && last.children.length === 1) last.appendChild(fieldEl);
      else if (f.half) form.appendChild(el('div', { class: 'qf-pair' }, [fieldEl]));
      else form.appendChild(fieldEl);
    });
    btn = el('button', { type: 'submit', class: 'btn btn--accent lp-btn-block ap-next', html: '<span>' + (q.cta || 'Next') + '</span><span class="btn__chip">' + ARROW + '</span>' });
    (q.fields || []).forEach(function (f) { if (f.type === 'checkbox' && f.required && f.gate && !S.answers[f.id]) btn.disabled = true; });
    form.appendChild(btn);
    if (F.LOCK_CONTINUE) {
      var relock = function () { btn.disabled = !screenValid(q); };   // 'filled': unlock when filled; true: when valid
      form.addEventListener('input', relock); form.addEventListener('change', relock);
      setTimeout(relock, 0);
    }
    if (q.fine) form.appendChild(el('p', { class: 'lp-priv', html: q.fine }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, vals = {};
      (q.fields || []).forEach(function (f) {
        var inp = $('ap-' + f.id), wrap = $('apf-' + f.id), bad = false;
        if (f.type === 'checkbox') {
          vals[f.id] = inp.checked; bad = !!f.required && !inp.checked;
        } else {
          var v = String(inp.value || '').trim();
          if (!v && !f.optional) bad = true;
          else if (v && f.type === 'email' && !emailOk(v)) bad = true;
          else if (v && f.type === 'tel' && !phoneOk(v)) bad = true;
          else if (v && f.type === 'url' && !urlOk(v)) bad = true;
          vals[f.id] = v;
        }
        wrap.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) {
        var first = form.querySelector('.invalid input, .invalid textarea'); if (first) first.focus();
        var msg = form.querySelector('.invalid .lp-err'); announce(msg ? msg.textContent : 'Check the highlighted field.'); return;
      }
      Object.keys(vals).forEach(function (k) { S.answers[k] = vals[k]; });
      (q.fields || []).forEach(function (f) {
        if (f.type === 'checkbox') { var l = $('apl-' + f.id); S.consent_text = l ? (l.innerText || l.textContent || '').replace(/\s+/g, ' ').trim() : ''; S.consent_at = vals[f.id] ? new Date().toISOString() : ''; }
      });
      answer(q, null, i);
    });
    return form;
  }

  /* ---------- moving through the form ---------- */
  function answer(q, value, i) {
    if (!S.sid) S.sid = uuid();
    if (value !== null) { S.answers[q.id] = value; if (q.type === 'choice') S.labels[q.id] = labelFor(q, value); }
    gate();
    save();
    send('step', { step_id: q.id, step_index: i + 1, step_total: Q.length });
    track('step', { step_id: q.id, step_index: counted(i) + 1,
                    answer: q.type === 'choice' ? S.labels[q.id] : undefined, value: q.type === 'choice' ? value : undefined });
    if (q.track) [].concat(q.track).forEach(function (t) { track(t, { step_id: q.id }); });   // one name or a list
    var hit = earlyHit(q);
    if (hit) { finish(hit); return; }
    if (i + 1 < Q.length) { history.pushState({ ap: i + 1 }, ''); render(i + 1); }
    else finish(route());
  }
  function earlyHit(q) {
    for (var k = 0; k < F.RULES.length; k++) {
      var r = F.RULES[k];
      if (r.early !== true && r.early !== q.id) continue;
      var hit = ruleHit(r); if (hit) return hit;
    }
    return null;
  }

  /* ---------- the loading screen between Part 1 and Part 2 ---------- */
  var loaderTimer = null;
  function renderLoader(q, i) {
    if (loaderTimer) clearInterval(loaderTimer);
    track(q.track || 'loader', { step_id: q.id });
    var stages = q.stages || [];
    var screen = el('div', { class: 'ap-screen qf-loader', 'data-q': q.id }, [
      el('div', { class: 'qf-ring', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]),
      el('h2', { class: 'ap-q', id: 'apQ', tabindex: '-1', html: q.q })
    ]);
    if (q.sub) screen.appendChild(el('p', { class: 'ap-sub', html: q.sub }));
    var list = el('ul', { class: 'qf-stages', role: 'list' });
    var rows = stages.map(function (st) {
      var row = el('li', { class: 'qf-stage is-pending' }, [
        el('span', { class: 'qf-stage__ic', 'aria-hidden': 'true' }), el('span', { class: 'qf-stage__label', text: st.label }),
        el('span', { class: 'qf-stage__status', text: '' })
      ]);
      list.appendChild(row); return row;
    });
    screen.appendChild(list);
    screen.appendChild(el('div', { class: 'sr-only', 'aria-live': 'polite', id: 'apLoaderLive' }));
    body.innerHTML = ''; body.appendChild(screen);
    if (QF) toTop();
    var beat = q.beat_ms || 900, minMs = q.min_ms || beat * stages.length, t0 = Date.now(), at = 0;
    function paint() {
      rows.forEach(function (row, n) {
        var state = n < at ? 'done' : n === at ? 'running' : 'pending';
        row.className = 'qf-stage is-' + state;
        row.lastChild.textContent = state === 'done' ? stages[n].done : state === 'running' ? stages[n].active : '';
      });
      var live = $('apLoaderLive'); if (live && stages[at]) live.textContent = stages[at].label;
    }
    paint();
    loaderTimer = setInterval(function () {
      if (at < stages.length) { at++; paint(); }
      if (at >= stages.length && Date.now() - t0 >= minMs) {
        clearInterval(loaderTimer); loaderTimer = null;
        // Replace the loader in history, so Back from the next step returns to the step before the loader.
        history.replaceState({ ap: i + 1 }, ''); render(i + 1);
      }
    }, beat);
  }

  /* ---------- tracking: window.dataLayer events for GTM ----------
     ab_form_view      first screen shown                 ab_step       every answer (step_id, step_index, answer for choices)
     <q.track>         a step can name its own event (e.g. ab_lead on the contact step)
     ab_loader / <loader.track>  the loading screen starts (end of Part 1)
     ab_complete       the form ends (route, route_reason)  ab_route_<route>  one event per route (ab_route_main, ab_route_dq...)
     Contact details are never pushed: only step ids, choice answers and the route. */
  function track(name, data) {
    if (F.TRACK === false || S.track === 'off') return;
    var ev = { event: name.indexOf('ab_') === 0 ? name : 'ab_' + name, ab_form: F.SOURCE, ab_form_version: F.FORM_VERSION, ab_submission_id: S.sid || '' };
    if (data) Object.keys(data).forEach(function (k) { if (data[k] !== undefined) ev['ab_' + k] = data[k]; });
    if (S.track === 'pending') { pending.push(ev); return; }
    emit(ev);
  }
  /* The tracking gate (TRACK_GATE): a list of conditions, each { id, min } (a number at or above min), { id, in: [...] }
     (one of these values) or { id, present: true } (answered at all, e.g. the contact step's consent box). Every event
     (and GTM) waits until all of them are answered. All pass: the held events are released in order and GTM
     loads. Any fails: nothing is sent for this person from here on (S.track = 'off'). Checked after every answer, so a
     corrected answer (Back) can still turn it on. */
  function condState(g) {
    var a = S.answers[g.id];
    if (a === undefined || a === null || a === '') return 'wait';
    if (g.present) return 'pass';
    if (g.in) return g.in.indexOf(a) > -1 ? 'pass' : 'fail';
    if (typeof g.min === 'number') return typeof a === 'number' && a >= g.min ? 'pass' : 'fail';
    return 'pass';
  }
  function gate() {
    if (!F.TRACK_GATE) return;
    var st = [].concat(F.TRACK_GATE).map(condState);
    if (st.indexOf('fail') > -1) { S.track = 'off'; save(); return; }   // held events stay held: a corrected answer releases them
    if (st.indexOf('wait') > -1) { if (S.track === 'off') S.track = 'pending'; save(); return; }
    var was = S.track; S.track = 'on'; save();
    var held = pending; pending = [];
    held.forEach(function (ev) { if (!ev.ab_submission_id) ev.ab_submission_id = S.sid || ''; emit(ev); });
    if (was !== 'on' && typeof window.AB_LOAD_GTM === 'function') window.AB_LOAD_GTM();
  }
  function emit(ev) { try { (window.dataLayer = window.dataLayer || []).push(ev); } catch (e) {} }
  function finish(r) {
    S.route = r.route; S.route_reason = r.reason; S.route_q = r.qid || '';
    // /booked reads tier: only the route named in QUALIFIED_ROUTE counts as a qualified ad conversion.
    var qr = F.QUALIFIED_ROUTE || 'main';
    S.tier = (Array.isArray(qr) ? qr.indexOf(r.route) > -1 : r.route === qr) ? 'qualified' : r.route;
    save();
    send('complete', { route: r.route, route_reason: r.reason });
    track('complete', { route: r.route, route_reason: r.reason });
    track('route_' + r.route.replace(/[^a-z0-9]+/gi, '_'), { route: r.route });
    var dest = F.ROUTES[r.route];
    if (dest && typeof dest === 'object' && dest.inline) { showInline(dest.inline); return; }
    S.done = true; save();
    if (bar) bar.style.width = '100%';
    if (F.REDIRECT_QUIET) {
      var nb = body.querySelector('.ap-next'); if (nb) { nb.disabled = true; nb.classList.add('is-busy'); }
      location.href = dest || '#'; return;
    }
    body.innerHTML = '';
    body.appendChild(el('div', { class: 'ap-sending' }, [el('h2', { class: 'ap-q', text: 'Thanks. One moment.' }), el('p', { text: 'Taking you to the next step.' })]));
    setTimeout(function () { location.href = dest || '#'; }, F.REDIRECT_DELAY_MS);
  }

  function showInline(x) {
    if (meta) meta.hidden = true;
    var box = el('div', { class: 'ap-screen ap-inline' }, [el('h2', { class: 'ap-q', id: 'apQ', tabindex: '-1', html: x.title })]);
    if (x.body) box.appendChild(el('div', { class: 'ap-sub', html: x.body }));
    if (x.bullets && x.bullets.length) box.appendChild(el('ul', { class: 'lp-plist', html: x.bullets.map(function (b) { return '<li>' + TICK + '<span>' + b + '</span></li>'; }).join('') }));
    if (x.cta) box.appendChild(el('a', { class: 'btn btn--accent lp-btn-block', href: x.cta.href, html: '<span>' + x.cta.label + '</span><span class="btn__chip">' + ARROW + '</span>' }));
    var links = el('div', { class: 'lp-exit__links' });
    var ch = el('button', { type: 'button', class: 'lp-linkbtn', html: '&larr; Change my answer' });
    ch.addEventListener('click', function () { render(S.step); });
    links.appendChild(ch);
    box.appendChild(links);
    body.innerHTML = ''; body.appendChild(box);
    focusEl($('apQ')); keepInView();
  }

  /* Connect early to the hosts the next page needs (e.g. the scheduler), once, from the last two screens. */
  var warmed = false;
  function warm() {
    if (warmed || !(F.WARM_HOSTS || []).length) return; warmed = true;
    F.WARM_HOSTS.forEach(function (h) { var k = doc.createElement('link'); k.rel = 'preconnect'; k.href = h; doc.head.appendChild(k); });
  }

  if (back) back.addEventListener('click', function () { if (S.step > 0) history.back(); });
  window.addEventListener('popstate', function (e) {
    var to = e.state && typeof e.state.ap === 'number' ? e.state.ap : 0;
    to = Math.max(0, Math.min(to, Q.length - 1));
    if (Q[to].type === 'loader') to = Math.max(0, to - 1);   // never replay the loader on Back
    render(to);
  });
  var restart = $('apRestart');
  if (restart) restart.addEventListener('click', function () {
    try { if (STORE) STORE.removeItem(F.STORE_KEY); } catch (e) {}
    S = fresh(); history.replaceState({ ap: 0 }, ''); render(0);
  });

  /* Letter keys pick an answer on single-choice screens (A, B, C...): same as tapping it. */
  doc.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || t === 'BUTTON') return;
    var q = Q[S.step]; if (!q || q.type !== 'choice' || q.multi || !$('apQ') || !body.querySelector('.ap-opts')) return;
    var n = (e.key || '').toUpperCase().charCodeAt(0) - 65;
    if (e.key && e.key.length === 1 && n >= 0 && n < q.options.length) { e.preventDefault(); var bs = body.querySelectorAll('.ap-opt'); if (bs[n]) bs[n].click(); }
  });

  /* A lander's email-first CTA leaves its event here, so it obeys the tracking gate like every other event. */
  try {
    var ecp = sessionStorage.getItem('ab_email_capture_pending');
    if (ecp) { sessionStorage.removeItem('ab_email_capture_pending'); var ecd = JSON.parse(ecp) || {}; track('email_capture', { lander: ecd.lander, cta: ecd.cta }); }
  } catch (e) {}

  var start = Math.max(0, Math.min(S.step || 0, Q.length - 1));
  /* "Change my answer" reopens the question that decided the outcome, not the screen where it was checked. */
  if (resumed && S.route_q) { for (var qi = 0; qi < Q.length; qi++) if (Q[qi].id === S.route_q) { start = qi; break; } }
  if (resumed) track('resume', { step_id: Q[start].id });
  if (Q[start].type === 'loader') start = Math.min(start + 1, Q.length - 1);   // a refresh mid-loader resumes after it
  history.replaceState({ ap: start }, '');
  render(start, false);

  /* Shared reader for the pages after the form (booking, booked): window.AB_FORM_STATE(key). */
})();

/* Read a saved form state from a page after the form. */
window.AB_FORM_STATE = function (key, storage) {
  try { return JSON.parse((storage === 'session' ? sessionStorage : localStorage).getItem(key || 'ab_apply_v1') || 'null'); } catch (e) { return null; }
};
