/* Google Tag Manager. Loads only when AB_CONFIG.gtmId is set ("GTM-XXXXXXX"), never when the browser sends a Global
   Privacy Control signal, and never for someone the /L1 form labeled DQ (saved state track === 'off').
   Where it is included: /L1/Q/ (pushes ab_lead once per qualified submission), /booked (pushes ab_booked for qualified
   leads), the landers (/v2/) and the older pages. The /L1 form page and /L1/DQ/ do not include it at all.
   On a form page with a tracking gate (window.AB_APPLY.TRACK_GATE), GTM waits until the gate passes (funnel.js then
   calls window.AB_LOAD_GTM()); the form's own ab_* events are listed in funnel.js. */
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
    if (s && (s.state_version || s.form_version) === (A.STATE_VERSION || A.FORM_VERSION) && !s.done && s.track === 'on') load();   // a returning visitor who already passed
    return;                                                                              // otherwise wait for the gate
  }
  load();
})();
