/* Advisor Booking form engine: one question per screen, every answer saved as it is given, then routed.
   Used by /apply (the master form) and by the study clones in /lab. Each page defines window.AB_APPLY before this
   script: its questions, routing rules and destinations. A new form is a copy of a page with a different block.

   Question types
     choice   options: [...], multi: true for "check all" (then a Continue button), auto-advances otherwise
     fields   fields: [{ id, label, type: text|email|tel|url|textarea|checkbox, optional, required (checkbox), hint, srLabel }]

   Routing (RULES): an ordered list. The first rule with a matching answer wins; DEFAULT_ROUTE if none match.
     { route: 'dq', any: [['question_id', 'Answer'], ...] }
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
  function focusEl(h) { if (!h) return; try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var TICK = '<span class="lp-tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.2L4.6 9 10 3" stroke="#0F7A62" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  /* ---------- state ---------- */
  var TTL = 7 * 24 * 60 * 60 * 1000;
  function fresh() { return { sid: '', answers: {}, step: 0, route: '', started: Date.now(), consent_text: '' }; }
  var S = fresh();
  try {
    var saved = STORE && JSON.parse(STORE.getItem(F.STORE_KEY) || 'null');
    if (saved && saved.form_version === F.FORM_VERSION && Date.now() - (saved.started || 0) < TTL && !saved.done) S = saved;
  } catch (e) {}
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
    if (!url || typeof fetch !== 'function') return;
    var bot = botFlag();
    var p = {
      submission_id: S.sid, stage: stage, route: S.route || '', source: F.SOURCE, form_version: F.FORM_VERSION,
      answers: S.answers, sms_consent: !!S.answers.sms_optin, consent_text: S.consent_text,
      consent_text_version: F.CONSENT_TEXT_VERSION, utm: utm, page_url: location.href, referrer: doc.referrer,
      started_iso: new Date(S.started).toISOString(), ts_iso: new Date().toISOString(),
      bot_flag: bot ? 'true' : 'false', bot_reason: bot, test_mode: F.TEST_MODE ? 'true' : 'false'
    };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    var body = JSON.stringify(p);
    try {
      fetch(url, { method: 'POST', keepalive: true, body: body, headers: { 'Content-Type': 'application/json' } })
        .catch(function () { try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: body }).catch(function () {}); } catch (e) {} });
    } catch (e) {}
  }

  /* ---------- routing ---------- */
  function has(id, val) {
    var a = S.answers[id];
    return Array.isArray(a) ? a.indexOf(val) > -1 : a === val;
  }
  function route() {
    for (var i = 0; i < F.RULES.length; i++) {
      var r = F.RULES[i], any = r.any || [];
      for (var j = 0; j < any.length; j++) if (has(any[j][0], any[j][1])) return { route: r.route, reason: any[j][0] + '=' + any[j][1] };
    }
    return { route: F.DEFAULT_ROUTE, reason: '' };
  }

  /* ---------- rendering ---------- */
  var body = $('apBody'), bar = $('apBar'), count = $('apCount'), back = $('apBack'), meta = $('apMeta');
  var total = F.PROGRESS_TOTAL || Q.length;

  function progress(i) {
    if (bar) bar.style.width = Math.round((Math.min(i, total) / total) * 100) + '%';
    if (count) count.innerHTML = i < total ? F.PROGRESS_LABEL.replace('{n}', '<b>' + (i + 1) + '</b>').replace('{t}', total) : F.PROGRESS_AFTER;
    if (back) back.disabled = i === 0;
    if (meta) meta.hidden = false;
  }

  function render(i, focus) {
    S.step = i; save(); progress(i);
    var q = Q[i];
    var screen = el('div', { class: 'ap-screen', 'data-q': q.id });
    var h = el('h2', { class: 'ap-q', id: 'apQ', tabindex: '-1', html: q.q });
    screen.appendChild(h);
    if (q.sub) screen.appendChild(el('p', { class: 'ap-sub', html: q.sub }));
    screen.appendChild(q.type === 'choice' ? renderChoice(q, i) : renderFields(q, i));
    if (q.note) screen.appendChild(el('div', { class: 'ap-note', html: q.note }));
    body.innerHTML = ''; body.appendChild(screen);
    if (focus !== false) { focusEl(h); keepInView(); }
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
      var on = picked.indexOf(opt) > -1;
      var b = el('button', { type: 'button', class: 'ap-opt' + (q.multi ? ' ap-opt--multi' : ''), 'aria-pressed': on ? 'true' : 'false' }, [
        el('span', { class: 'ap-key', 'aria-hidden': 'true', text: String.fromCharCode(65 + n) }),
        el('span', { text: opt })
      ]);
      b.addEventListener('click', function () {
        if (tap) { answer(q, opt, i); return; }
        if (!q.multi) {
          picked = [opt];
          Array.prototype.forEach.call(wrap.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        } else {
          var k = picked.indexOf(opt);
          if (k > -1) picked.splice(k, 1); else picked.push(opt);
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

  function fieldBad(f, inp) {
    if (f.type === 'checkbox') return !!f.required && !inp.checked;
    var v = String(inp.value || '').trim();
    if (!v) return !f.optional;
    if (f.type === 'email') return !emailOk(v);
    if (f.type === 'tel') return !phoneOk(v);
    if (f.type === 'url') return !urlOk(v);
    return false;
  }
  function screenValid(q) {
    return (q.fields || []).every(function (f) { var inp = $('ap-' + f.id); return inp && !fieldBad(f, inp); });
  }

  function renderFields(q, i) {
    var form = el('form', { novalidate: 'novalidate' });
    var btn;
    (q.fields || []).forEach(function (f) {
      if (f.type === 'checkbox') {
        var cb = el('input', { type: 'checkbox', id: 'ap-' + f.id });
        cb.checked = !!S.answers[f.id];
        if (f.required && f.gate) cb.addEventListener('change', function () { if (btn) btn.disabled = !cb.checked; });
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
      var label = el('label', { class: 'lp-lbl' + (f.srLabel ? ' sr-only' : ''), for: 'ap-' + f.id, html: f.label + (f.optional ? ' <span class="ap-optional">(optional)</span>' : '') });
      var ctl = f.type === 'tel' ? el('div', { class: 'lp-tel' }, [el('span', { class: 'lp-tel__cc', 'aria-hidden': 'true', text: '+1' }), input]) : input;
      form.appendChild(el('div', { class: 'lp-field', id: 'apf-' + f.id }, [
        label, ctl,
        f.hint ? el('p', { class: 'lp-hint', html: f.hint }) : null,
        el('div', { class: 'lp-err', text: f.error || 'Fill this in.' })
      ]));
    });
    btn = el('button', { type: 'submit', class: 'btn btn--accent lp-btn-block ap-next', html: '<span>' + (q.cta || 'Next') + '</span><span class="btn__chip">' + ARROW + '</span>' });
    (q.fields || []).forEach(function (f) { if (f.type === 'checkbox' && f.required && f.gate && !S.answers[f.id]) btn.disabled = true; });
    form.appendChild(btn);
    if (F.LOCK_CONTINUE) {
      var relock = function () { btn.disabled = !screenValid(q); };
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
      if (!ok) { var first = form.querySelector('.invalid input, .invalid textarea'); if (first) first.focus(); announce('Check the highlighted field.'); return; }
      Object.keys(vals).forEach(function (k) { S.answers[k] = vals[k]; });
      (q.fields || []).forEach(function (f) {
        if (f.type === 'checkbox') { var l = $('apl-' + f.id); S.consent_text = l ? (l.innerText || l.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
      });
      answer(q, null, i);
    });
    return form;
  }

  /* ---------- moving through the form ---------- */
  function answer(q, value, i) {
    if (!S.sid) S.sid = uuid();
    if (value !== null) S.answers[q.id] = value;
    save();
    send('step', { step_id: q.id, step_index: i + 1, step_total: Q.length });
    // A rule can end the form early (Typeform-style jump): set "early: true" on it.
    var r = route(), rule = F.RULES.filter(function (x) { return x.route === r.route; })[0];
    if (rule && rule.early) { finish(r); return; }
    if (i + 1 < Q.length) { history.pushState({ ap: i + 1 }, ''); render(i + 1); }
    else finish(r);
  }

  function finish(r) {
    S.route = r.route; S.route_reason = r.reason;
    // /booked reads tier: only the route named in QUALIFIED_ROUTE counts as a qualified ad conversion.
    S.tier = r.route === (F.QUALIFIED_ROUTE || 'main') ? 'qualified' : r.route;
    save();
    send('complete', { route: r.route, route_reason: r.reason });
    var dest = F.ROUTES[r.route];
    if (dest && typeof dest === 'object' && dest.inline) { showInline(dest.inline); return; }
    S.done = true; save();
    if (bar) bar.style.width = '100%';
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

  if (back) back.addEventListener('click', function () { if (S.step > 0) history.back(); });
  window.addEventListener('popstate', function (e) {
    var to = e.state && typeof e.state.ap === 'number' ? e.state.ap : 0;
    render(Math.max(0, Math.min(to, Q.length - 1)));
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

  var start = Math.max(0, Math.min(S.step || 0, Q.length - 1));
  history.replaceState({ ap: start }, '');
  render(start, false);

  /* Shared reader for the pages after the form (booking, booked): window.AB_FORM_STATE(key). */
})();

/* Read a saved form state from a page after the form. */
window.AB_FORM_STATE = function (key, storage) {
  try { return JSON.parse((storage === 'session' ? sessionStorage : localStorage).getItem(key || 'ab_apply_v1') || 'null'); } catch (e) { return null; }
};
