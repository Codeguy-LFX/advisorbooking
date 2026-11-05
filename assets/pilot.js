/* /pilot motion, matching the home page: nav shadow once the page moves, Lenis smooth scrolling for wheel and
   trackpad (touch keeps native scrolling), eased in-page links, reveal on scroll for items below the first screen,
   count-up on two stats, and a smooth open and close for the FAQ. The booking card logic stays in assets/lp.js. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function ready(fn) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function () {
    /* Nav: a stronger shadow once the page moves */
    var nav = $('#nav');
    function onNav() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', onNav, { passive: true }); onNav();

    /* Smooth scrolling */
    var lenis = null;
    if (window.Lenis && !reduce) {
      try {
        lenis = new window.Lenis({ duration: 0.9, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
        var lr = function (t) { lenis.raf(t); requestAnimationFrame(lr); }; requestAnimationFrame(lr);
      } catch (err) { lenis = null; }
    }
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null; if (!a) return;
      var id = a.getAttribute('href').slice(1), t = id ? doc.getElementById(id) : null; if (!t) return;
      e.preventDefault();
      var off = id === 'top' ? 0 : -((nav ? nav.offsetHeight : 64) + 24);
      if (lenis) lenis.scrollTo(id === 'top' ? 0 : t, { offset: off });
      else window.scrollTo({ top: id === 'top' ? 0 : t.getBoundingClientRect().top + window.scrollY + off, behavior: reduce ? 'auto' : 'smooth' });
    });

    /* Reveal: only items below the first screen start hidden */
    var rv = $$('[data-rv]');
    if ('IntersectionObserver' in window && !reduce) {
      var vh0 = window.innerHeight;
      rv.forEach(function (el) { if (el.getBoundingClientRect().top > vh0 * 0.92) el.classList.add('pre'); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rv.forEach(function (el) { if (el.classList.contains('pre')) io.observe(el); });
    }

    /* Count up two of the stats once */
    var counts = $$('[data-count]');
    if ('IntersectionObserver' in window && !reduce) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; cio.unobserve(e.target);
          var el = e.target, to = +el.getAttribute('data-count'), t0 = null, D = 1400;
          (function step(t) { if (!t0) t0 = t; var k = clamp((t - t0) / D, 0, 1); k = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(step); })(performance.now());
        });
      }, { threshold: 0.6 });
      counts.forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.textContent = '0'; cio.observe(el); } });
    }

    /* FAQ: smooth open and close */
    $$('.qa details').forEach(function (d) {
      var sum = $('summary', d), body = $('.qa__a', d), anim = null;
      if (!sum || !body) return;
      sum.addEventListener('click', function (e) {
        if (reduce || !body.animate) return;
        e.preventDefault();
        if (anim) anim.cancel();
        if (d.open) {
          var h = body.offsetHeight;
          anim = body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
          anim.onfinish = function () { d.open = false; anim = null; };
        } else {
          d.open = true; var h2 = body.offsetHeight;
          anim = body.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
          anim.onfinish = function () { anim = null; };
        }
      });
    });
  });
})();
