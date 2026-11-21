/* Advisor Booking: the animated product card (see pd.css).
   The motion itself is CSS. This script only decides which scene is on and whether its timeline runs:
   it plays while the card is on screen and the page is in front, holds where it stands otherwise, and moves
   on when the bar of the current step has filled. Pausing rests the scene complete. With reduced motion nothing plays:
   the last scene is shown complete and the steps switch scenes at once. One timer, a safety net only: if the end of a
   scene is ever not reported, the card moves on by itself a moment later instead of standing empty. */
(function () {
  'use strict';
  var OUT = 0.28; /* a card at rest starts with the end of its scene (the fade) and then runs that scene from the top: no cut from a complete picture to an empty one */

  function init(root) {
    if (root.pd) return;
    var tabs = [].slice.call(root.querySelectorAll('.pd-tab')),
        scenes = [].slice.call(root.querySelectorAll('.pd-scene')),
        caps = [].slice.call(root.querySelectorAll('.pd-cap')),
        pp = root.querySelector('.pd-pp'),
        say = root.querySelector('.pd-say'),
        story = root.querySelectorAll('.pd-sr li'),
        body = root.querySelector('.pd-mail__body'),
        mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null,
        still = !!(mq && mq.matches),
        scene = 0, user = false, inView = false, started = false, again = false, full = false, wd = 0;
    if (!tabs.length || scenes.length !== tabs.length) return;
    /* how much of the card must be in the window for it to play: 30%, or the page's own figure (data-pd-on) where less of it shows in the first screen */
    var ON = Math.min(0.6, Math.max(0.05, parseFloat(root.getAttribute('data-pd-on')) || 0.3));

    /* the draft email is written word by word: one span a word */
    if (body && !body.firstElementChild) {
      var words = body.textContent.replace(/^\s+|\s+$/g, '').split(/\s+/);
      /* the last two words stay together, so the email never ends on a line of one word */
      if (words.length > 3) words.push(words.splice(-2).join(' '));
      body.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.style.setProperty('--w', i);
        s.textContent = w;
        if (i) body.appendChild(document.createTextNode(' '));
        body.appendChild(s);
      });
    }

    function show(i) {
      scene = i;
      root.setAttribute('data-s', i);
      tabs.forEach(function (t, k) {
        if (k === i) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
        t.classList.toggle('is-done', k < i);
      });
      scenes.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      caps.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
    }
    function len() { return parseFloat(getComputedStyle(root).getPropertyValue('--T')) || 5; }
    /* the safety net: a scene's end that is never reported must not leave the stage empty */
    function arm(left) { clearTimeout(wd); wd = setTimeout(function () { if (started && !still && !root.classList.contains('pd--hold')) step(); }, (left + 1.5) * 1000); }
    function step() { var next = again ? scene : (scene + 1) % scenes.length; again = false; restart(next, 0); }
    /* take the timeline off, switch, and put it back on: every animation of the scene starts again */
    function restart(i, from) {
      root.classList.remove('pd--run');
      show(i);
      root.style.setProperty('--o', (from || 0) + 's');
      void root.offsetWidth;
      root.classList.add('pd--run');
      started = true;
      arm(len() - (from || 0));
    }
    function rest(i) { clearTimeout(wd); root.classList.remove('pd--run'); show(i); started = false; again = false; }
    function sync() {
      if (still) return;
      var hold = user || !inView || document.hidden;
      root.classList.toggle('pd--hold', hold);
      if (hold) clearTimeout(wd);
      else if (started) arm(len());   /* back from a hold: how far the scene had come is not known, so allow its whole length */
      else {
        /* a card at rest shows its scene complete: play only the end of that scene (its fade), then the scene from the top */
        again = true;
        restart(scene, len() - OUT);
      }
    }
    /* a scene that cannot play right now is shown complete; it starts from the top once it can */
    function go(i) {
      i = Math.max(0, Math.min(scenes.length - 1, parseInt(i, 10) || 0));
      again = false; full = true;   /* a step the visitor chose is not thrown away when the card first comes into full view */
      if (still || user || !inView || document.hidden) rest(i); else restart(i, 0);
    }
    function setUser(v) {
      user = v; full = true;   /* nor is a card the visitor has paused or started */
      if (pp) { pp.classList.toggle('is-paused', v); pp.setAttribute('aria-label', v ? 'Play animation' : 'Pause animation'); }
      /* a card the visitor has paused always shows its scene complete: never half drawn, fading or blank */
      if (v && !still) rest(scene);
      sync();
    }
    function mode() {
      still = !!(mq && mq.matches);
      if (pp) pp.disabled = still;
      if (still) { root.classList.remove('pd--hold'); rest(scenes.length - 1); }
      else { started = false; sync(); }
    }

    tabs.forEach(function (t, i) {
      t.disabled = false;
      t.addEventListener('click', function () {
        go(i);
        /* the pictures are hidden from screen readers, so a step that is chosen is read out instead */
        if (say && story[i]) say.textContent = story[i].textContent;
      });
    });
    if (pp) pp.addEventListener('click', function () { setUser(!user); });
    root.addEventListener('animationend', function (e) {
      /* !started: the card was put to rest in this very frame (paused, or a step chosen while held); the bar that was
         running can still report its end once before the browser drops it, and that must not start a scene */
      if (e.animationName !== 'pd-bar' || still || !started) return;
      step();
    });
    document.addEventListener('visibilitychange', sync);
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', mode); else if (mq.addListener) mq.addListener(mode); }

    root.pd = {
      go: go,
      play: function () { setUser(false); },
      pause: function () { setUser(true); },
      get scene() { return scene; }
    };

    if (pp) pp.disabled = still;
    if (still) rest(scenes.length - 1);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var e = es[es.length - 1], r = e.isIntersecting ? e.intersectionRatio : 0;
        /* starts once 30% of the card is in the window (about what the first screen of most laptops and phones
           shows of it), and holds when less than 15% is left */
        inView = r >= (inView ? ON / 2 : ON);
        sync();
        /* the first time most of the card is in view the story starts again from the top, so whoever scrolls down
           to it sees it from the beginning (unless it is still in its first scene, is resting, or the visitor has
           already chosen a step or pressed pause) */
        if (!full && r >= 0.75) {
          full = true;
          if (!still && !user && !document.hidden && started && !again && scene !== 0) restart(0, 0);
        }
      }, { threshold: [0, ON / 2, ON, 0.75] }).observe(root);
    } else { inView = true; sync(); }
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-pd]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
