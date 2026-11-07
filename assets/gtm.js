/* Google Tag Manager for the funnel pages. Loads only when AB_CONFIG.gtmId is set ("GTM-XXXXXXX"), and never when the
   browser sends a Global Privacy Control signal (same rule as the Meta and LinkedIn tags in site.js).
   The funnel pushes these events to window.dataLayer whether or not GTM loads:
     ab_form_view, ab_step (ab_step_id, ab_step_index, ab_answer), ab_lead (contact step done), ab_part1_complete (loader),
     ab_part2_start, ab_complete + ab_route_<route> (ab_route: main | triage | nurture | dq), ab_booking_view (ab_call),
     ab_booked. Contact details are never pushed. */
(function () {
  var id = String((window.AB_CONFIG || {}).gtmId || '').trim();
  window.dataLayer = window.dataLayer || [];
  if (!/^GTM-[A-Z0-9]+$/.test(id) || navigator.globalPrivacyControl) return;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
})();
