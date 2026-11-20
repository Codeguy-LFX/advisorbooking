/* Advisor Booking preview, route A (route-a.js). Optional: the page works the same without it.
   The quiz engine moves the progress bar by setting a width, which jumps. This mirrors that width onto a
   copy of the fill as a transform, so the bar glides (260ms) and only a transform ever animates. */
(function () {
  'use strict';
  var body = document.getElementById('apBody');
  if (body) {   // a corrected field drops its red ring and message at once; the next Continue checks everything again
    body.addEventListener('input', function (e) { var t = e.target, f = t && t.closest ? t.closest('.lp-field.invalid') : null; if (f) { f.classList.add('ra-ok'); t.setAttribute('aria-invalid', 'false'); } });
    body.addEventListener('submit', function () { var l = body.querySelectorAll('.ra-ok'), i; for (i = 0; i < l.length; i++) l[i].classList.remove('ra-ok'); }, true);
  }
  var bar = document.getElementById('apBar');
  if (!bar || !window.MutationObserver) return;
  var track = bar.parentNode, fill = document.createElement('div');
  fill.className = 'ra-fill';
  function sync() { fill.style.transform = 'scaleX(' + (parseFloat(bar.style.width) || 0) / 100 + ')'; }
  sync();
  track.appendChild(fill);
  track.classList.add('ra-glide');
  new MutationObserver(sync).observe(bar, { attributes: true, attributeFilter: ['style'] });
})();
