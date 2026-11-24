/* The LinkedIn Insight Tag, and the one LinkedIn conversion.

   AB_CONFIG.linkedinPartnerId (assets/config.js) is the LinkedIn partner ID. This file does what LinkedIn's own snippet
   does (set _linkedin_partner_id, add it to _linkedin_data_partner_ids, define the lintrk queue, load insight.min.js),
   and only on the pages that include it: /vg and its sitelink copies, /fit-check and /qualified. Never /not-a-fit.
   LinkedIn's <noscript> image is left out on purpose: an image cannot honor Global Privacy Control. Empty ID = nothing loads.

   AB_CONFIG.linkedinQualifiedConversionId is the conversion_id of the "qualified lead" conversion. It is sent in one
   place only: here, on /qualified, on the same condition as the Google Ads conversion (window.AB_QUALIFIED_OK and
   window.AB_CONVERT, both set in that page's head: the quiz's flag for this submission, turned to "sent" before
   anything is sent, so a reload, Back and Forward or a later visit can never send it again). It is put in lintrk's
   queue before insight.min.js arrives, so it is not lost. Nothing here needs assets/gads.js or gtag: either tag may be
   blocked and the other still works.

   The tag never starts, and lintrk is never defined (the same rules as assets/gads.js):
   - when the browser sends a Global Privacy Control signal;
   - when a page sets window.AB_ADS_OFF = true;
   - at an address containing "/qualified" other than the real page after its check has passed;
   - at an address that carries a person's details (a prefilled link with ?email=), or when the page before this one had
     such an address: LinkedIn must never be sent a name, an email or a phone number.

   Nothing here reads or changes the address, so the li_fat_id LinkedIn adds to an ad click stays for its tag to read.

   Included in the <head> with async and started once the page is parsed (after the page's own scripts), like gads.js. */
(function () {
  'use strict';
  var started = false;
  var EMAIL = /[^\s@\/?&=#]+@[^\s@\/?&=#]+\.[a-z]{2,}/i;
  function plain(s) { for (var i = 0, d; i < 3; i++) { try { d = decodeURIComponent(s); } catch (e) { break; } if (d === s) break; s = d; } return s; }
  function named(query) {
    var hit = false;
    try {
      new URLSearchParams(query).forEach(function (v, k) {
        var n = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!/^utm/.test(n) && (/email|phone/.test(n) || /^(invitee|iclosed)?(first|last|full|given|family|sur|f|l)?name$/.test(n) || /^(first|last|tel|mobile|cell)$/.test(n))) hit = true;
      });
    } catch (e) {}
    return hit;
  }
  function carries(u) {
    var h = u.hash.replace(/^#[!\/?]*/, '');
    return EMAIL.test(plain(u.pathname + ' ' + u.search + ' ' + u.hash)) || named(u.search) || (h.indexOf('=') > -1 && named(h));
  }
  function personal() {
    var here = false, before = false, r;
    try { here = carries(new URL(location.href)); } catch (e) {}
    try { r = new URL(document.referrer); before = r.origin === location.origin ? carries(r) : EMAIL.test(plain(document.referrer)); } catch (e) {}
    return here || before;
  }
  function strayQualified() {
    var where = location.href; try { where += ' ' + decodeURIComponent(location.href); } catch (e) {}
    return /\/qualified/i.test(where) && window.AB_QUALIFIED_OK !== true;
  }
  function start() {
    if (started) return; started = true;
    var C = window.AB_CONFIG || {}, id = String(C.linkedinPartnerId || '').trim(), conv = String(C.linkedinQualifiedConversionId || '').trim();
    if (!/^[0-9]{4,}$/.test(id) || navigator.globalPrivacyControl || window.AB_ADS_OFF || strayQualified() || personal()) return;
    window._linkedin_partner_id = id;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(id);
    if (!window.lintrk) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
    /* The one conversion: a qualified submission, on /qualified only (AB_CONVERT is set by that page's head). */
    if (window.AB_QUALIFIED_OK === true && window.AB_CONVERT === true && /^[0-9]{4,}$/.test(conv)) {
      try { window.lintrk('track', { conversion_id: Number(conv) }); } catch (e) {}
    }
    var s = document.getElementsByTagName('script')[0], b = document.createElement('script');
    b.type = 'text/javascript'; b.async = true; b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode.insertBefore(b, s);
  }
  function go() {
    if (window.AB_CONFIG) { start(); return; }
    var c = document.createElement('script'); c.src = '/assets/config.js'; c.onload = start; document.head.appendChild(c);
  }
  var nav = null; try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) {}
  if (document.readyState === 'loading' || (document.readyState === 'interactive' && nav && !nav.domContentLoadedEventStart)) document.addEventListener('DOMContentLoaded', go); else go();
})();
