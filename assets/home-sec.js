/* Advisor Booking: the marker of "Three steps" follows the scroll (home-sec.js). The home page's own function, lifted
   from index.html with the helpers it uses. Optional: without it all three steps simply show. */
(function () {
  'use strict';
  var doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  (function how() {
    var sec = $('#how'), steps = $$('.step'), wrap = $('#steps'), track = $('#track'), done = $('#trackDone'), mark = $('#mark'), glow = $('#markGlow'), tags = $$('.loop__tag'), loopEl = $('#loop');
    if (!sec || !track || !track.getTotalLength) return;
    var L = track.getTotalLength(), names = ['Build', 'Launch', 'Grow'], target = 0, curP = 0, raf = 0, active = -1;
    var live = true, lastP = -1, lit = -1, loopN = $('#loopN'), loopL = $('#loopL');
    var at = tags.map(function (t) { return +t.getAttribute('data-at'); });
    done.style.strokeDasharray = L; done.style.strokeDashoffset = L;
    function pointAt(p) { var q = track.getPointAtLength(clamp(p, 0, 0.9999) * L); return [q.x, q.y]; }
    function placeTags() {
      var W = loopEl.clientWidth, H = loopEl.clientHeight;
      tags.forEach(function (t, i) {
        var pt = pointAt(at[i]), w = t.offsetWidth;
        t.style.left = clamp(pt[0] / 520 * W, w / 2 + 2, W - w / 2 - 2) + 'px'; t.style.top = (pt[1] / 360 * H) + 'px';
      });
    }
    placeTags(); window.addEventListener('resize', placeTags);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeTags);
    function place(p) {
      if (p === lastP) return;   // nothing moved since the last frame
      lastP = p;
      var pt = pointAt(p);
      mark.setAttribute('cx', pt[0]); mark.setAttribute('cy', pt[1]); glow.setAttribute('cx', pt[0]); glow.setAttribute('cy', pt[1]);
      done.style.strokeDashoffset = L * (1 - p);
      var n = 0;
      for (var i = 0; i < at.length; i++) if (p + 0.001 >= at[i]) n |= 1 << i;
      if (n !== lit) { lit = n; tags.forEach(function (t, k) { t.classList.toggle('on', !!(n & (1 << k))); }); }
      var s = clamp(Math.floor(p * 3 - 0.0001), 0, 2);
      if (p <= 0) s = 0;
      if (s !== active) { active = s; steps.forEach(function (st, k) { st.classList.toggle('on', k === s); }); loopN.textContent = '0' + (s + 1); loopL.textContent = names[s]; }
    }
    function measure() {
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      target = clamp((vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.35), 0, 1);
    }
    function tick() {
      raf = 0; curP += (target - curP) * (reduce ? 1 : 0.12);
      if (Math.abs(target - curP) < 0.0005) curP = target;
      place(curP);
      if (curP !== target) raf = requestAnimationFrame(tick);
    }
    /* Where the section sits on the page. While it is off screen the loop simply rests at one end (the start while the
       section is still below, the finish once it has gone past), so scrolling elsewhere needs no measuring at all. */
    var top0 = 0, bot0 = 0;
    function span() { var r = sec.getBoundingClientRect(), y = window.scrollY; top0 = r.top + y; bot0 = r.bottom + y; }
    function onScroll() {
      if (!live) {
        var y = window.scrollY;
        if (y + window.innerHeight < top0 || y > bot0) {
          var end = y > bot0 ? 1 : 0;
          if (end !== target) { target = end; if (!raf) raf = requestAnimationFrame(tick); }
          return;
        }
      }
      measure(); if (!raf) raf = requestAnimationFrame(tick);
    }
    sec.classList.add('is-live');
    span();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { span(); onScroll(); });
    measure(); curP = target; place(curP);
    if ('IntersectionObserver' in window) {
      live = false;
      new IntersectionObserver(function (es) {
        var on = es[es.length - 1].isIntersecting;
        if (on === live) return;
        live = on; span();
        if (on) onScroll();   // back near the screen: measure again and carry on from where the loop was resting
      }, { rootMargin: '300px 0px' }).observe(sec);
    }
  })();
})();
