/* Google Tag Manager for the funnel pages and landers. Loads only when AB_CONFIG.gtmId is set ("GTM-XXXXXXX"), never when
   the browser sends a Global Privacy Control signal (same rule as the Meta and LinkedIn tags in site.js), and never
   for someone the form's tracking gate turned off (under $50M AUM on Funnel 4: saved state track === 'off').
   On a form page with a tracking gate (window.AB_APPLY.TRACK_GATE), GTM waits until the gate passes: funnel.js
   then calls window.AB_LOAD_GTM().
   The funnel pushes these events to window.dataLayer (held until the gate passes, dropped if it fails):
     ab_form_view, ab_step (ab_step_id, ab_step_index, ab_answer, ab_value), ab_email_capture (from a lander),
     ab_lead + ab_part1_complete (contact step), ab_part2_start, ab_complete + ab_route_<route>
     (ab_route: priority | main | triage | nurture | dq), ab_outcome_view_dq / ab_outcome_view_nurture,
     ab_booking_view (ab_call), ab_booked. Contact details are never pushed. */
(function () {
  var A = window.AB_APPLY || null;
  var id = String((window.AB_CONFIG || {}).gtmId || '').trim();
  var loaded = false;
  window.dataLayer = window.dataLayer || [];
  function state() { try { return JSON.parse(localStorage.getItem((A && A.STORE_KEY) || 'ab_apply_v1') || 'null'); } catch (e) { return null; } }
  function blocked() { var s = state(); return !!(s && s.track === 'off'); }
  function load() {
    if (loaded || !/^GTM-[A-Z0-9]+$/.test(id) || navigator.globalPrivacyControl || blocked()) return;
    loaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  window.AB_LOAD_GTM = load;
  window.AB_TRACKING_OFF = blocked;
  if (A && A.TRACK_GATE) {
    var s = state();
    if (s && s.form_version === A.FORM_VERSION && !s.done && s.track === 'on') load();   // a returning visitor who already passed
    return;                                                                              // otherwise wait for the gate
  }
  load();
})();
