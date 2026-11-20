/* The Google tag for Google Ads, and the one conversion.

   AB_CONFIG.googleTagId (assets/config.js) is the Google tag ID: "AW-18586476573", the Google Ads account. This file
   does what Google's own snippet does (load gtag.js, gtag('js', new Date()), gtag('config', ID)) on every page that
   includes it. A "GTM-" ID, the form Google's newer snippet uses, loads gtm.js with no config line. Empty = nothing loads.

   AB_CONFIG.googleAdsConversion is the send_to value of the "Submit lead form" event snippet. The event is sent in one
   place only: on /qualified, when that page's own check has passed AND the quiz's flag (sessionStorage ab_qualified)
   was set for this submission. /qualified turns the flag to "sent" before anything is sent, so a reload, Back and
   Forward or a later visit can never send it again. A not-qualified lead, a stranger who opens /qualified, the
   not-found page and every other page never send it.

   The tag never starts:
   - when the browser sends a Global Privacy Control signal;
   - when a page sets window.AB_ADS_OFF = true;
   - at an address containing "/qualified" other than the real page after its check has passed;
   - at an address that carries a person's details (a prefilled link with ?email=, the booking confirmation the scheduler
     forwards to), or when the page before this one had such an address: Google must never be sent a name, an email or
     a phone number.

   Included in the <head> with async and started once the page is parsed (after the page's own scripts, which is when the
   quiz has already taken a prefilled email out of the address), so it can never hold up anything else on the page. */
(function () {
  'use strict';
  var started = false;
  /* An email address anywhere in an address (path, query string or hash, also when it is encoded twice), or a parameter
     whose NAME says it holds a person's name, email or phone. A bare "@" is not an email: a click id or a campaign tag
     that happens to contain one must not switch the tag off for a real ad click. */
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
    var C = window.AB_CONFIG || {}, id = String(C.googleTagId || '').trim(), conv = String(C.googleAdsConversion || '').trim();
    if (!/^(GTM|AW|GT|G)-[A-Z0-9]{6,}$/.test(id) || navigator.globalPrivacyControl || window.AB_ADS_OFF || strayQualified() || personal()) return;
    var viaGtm = /^GTM-/.test(id);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    if (!viaGtm) window.gtag('config', id);
    /* The event snippet from Google Ads for a qualified submission only (AB_CONVERT is set by /qualified). send_to and
       nothing else: the owner's final snippet carries no value and no currency, on purpose. */
    if (window.AB_QUALIFIED_OK === true && window.AB_CONVERT === true && /^AW-[0-9]{6,}\/[A-Za-z0-9_-]{6,}$/.test(conv)) {
      window.gtag('event', 'conversion', { 'send_to': conv });
    }
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/' + (viaGtm ? 'gtm.js' : 'gtag/js') + '?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  function go() {
    if (window.AB_CONFIG) { start(); return; }
    /* A page that does not load the settings file itself: fetch it, then start. */
    var c = document.createElement('script'); c.src = '/assets/config.js'; c.onload = start; document.head.appendChild(c);
  }
  /* After the page's own scripts (DOMContentLoaded), also when this file arrives between the end of parsing and the
     deferred quiz script: "interactive" alone does not say that those have run. */
  var nav = null; try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) {}
  if (document.readyState === 'loading' || (document.readyState === 'interactive' && nav && !nav.domContentLoadedEventStart)) document.addEventListener('DOMContentLoaded', go); else go();
})();
