/* Advisor Booking preview, route B: fills the "Your call" panel with the answers given so far.
   Optional. It only reads what the quiz engine saves (localStorage "ab_preview_b") each time the engine
   shows a screen; it never touches the engine. Without this file the panel shows the host and nothing else. */
(function () {
  'use strict';
  var KEY = 'ab_preview_b', doc = document;
  var notes = doc.getElementById('bNotes'), sheet = doc.getElementById('bSheet'), body = doc.getElementById('apBody');
  if (!notes || !sheet || !body) return;
  var rows = sheet.children;
  function paint() {
    var st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var labels = (st && st.labels) || {}, step = (st && st.step) || 0, shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var li = rows[i], v = li.lastElementChild, t = labels[li.getAttribute('data-q')];
      t = t === undefined || t === null ? '' : String(t);
      if (v.textContent !== t) { v.textContent = t; v.title = t; }
      li.classList.toggle('is-set', !!t);            // desktop: the row holds its answer
      li.classList.toggle('is-past', !!t && i < step); // phone: a chip for each screen already passed
      li.classList.toggle('is-now', i === step);
      if (t && i < step) shown++;
    }
    notes.hidden = false;
    if (shown) sheet.scrollLeft = sheet.scrollWidth;   // phone: keep the newest chip in view
    fade();
  }
  function fade() {   // the chip cut by the left edge fades out over its own width
    var x = sheet.getBoundingClientRect().left, f = 16;
    for (var i = 0; i < rows.length; i++) { var r = rows[i].getBoundingClientRect(); if (r.width && r.left - x < 15.5 && r.right - x > 16) f = r.right - x; }
    sheet.style.setProperty('--b-fl', Math.round(f) + 'px');
  }
  sheet.addEventListener('scroll', fade, { passive: true });
  paint();
  if ('MutationObserver' in window) new MutationObserver(paint).observe(body, { childList: true });
})();
