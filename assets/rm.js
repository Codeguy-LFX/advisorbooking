/* Advisor Booking: /ria-meetings (rm.js). Optional: the page and the quiz work the same without it.
   Runs after the quiz engine (funnel.js) has drawn the first question. */
(function () {
  'use strict';
  var d = document, body = d.getElementById('apBody'), bar = d.getElementById('apBar');
  if (!body) return;
  var quiz = body.parentNode;

  /* A corrected field drops its red ring and message at once; the next Continue checks everything again. */
  body.addEventListener('input', function (e) {
    var t = e.target, f = t && t.closest ? t.closest('.lp-field.invalid') : null;
    if (f) { f.classList.add('rm-ok'); t.setAttribute('aria-invalid', 'false'); }
  });
  body.addEventListener('submit', function () {
    var l = body.querySelectorAll('.rm-ok'), i; for (i = 0; i < l.length; i++) l[i].classList.remove('rm-ok');
  }, true);

  /* Each new screen fades in (220ms, opacity and transform). The first question is simply there: no entrance. */
  if (!window.MutationObserver) return;
  new MutationObserver(function () {
    quiz.classList.add('k-quiz--enter');
    /* Desktop: when a screen's Continue button would sit below the window (the contact step on a 768px laptop), bring
       the card to the top, the rule the quiz already follows on phones. */
    var n = body.querySelector('.ap-next'), c = quiz.parentNode, y;
    if (n && window.matchMedia && window.matchMedia('(min-width:960px)').matches && n.getBoundingClientRect().bottom > window.innerHeight) {
      y = Math.max(0, Math.round(c.getBoundingClientRect().top + window.pageYOffset - 12));
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
    }
  }).observe(body, { childList: true });

  /* The engine moves the progress bar by setting a width, which jumps. This mirrors that width onto a copy of
     the fill as a transform, so the bar glides (260ms) and only a transform ever animates. */
  if (!bar) return;
  var track = bar.parentNode, fill = d.createElement('div'), cnt = d.getElementById('apCount');
  fill.className = 'rm-fill';
  /* Follow the step the count shows ("Step 2 of 6"), so the bar steps back with Previous; the engine's own bar never does. */
  function sync() { var m = cnt && /(\d+)\D+(\d+)/.exec(cnt.textContent || ''), w = m && +m[2] ? 100 * m[1] / m[2] : (parseFloat(bar.style.width) || 0); fill.style.transform = 'scaleX(' + Math.min(100, w) / 100 + ')'; }
  sync();
  track.appendChild(fill);
  track.classList.add('rm-glide');
  new MutationObserver(sync).observe(bar, { attributes: true, attributeFilter: ['style'] });
  if (cnt) new MutationObserver(sync).observe(cnt, { childList: true, characterData: true, subtree: true });
})();
