/**
 * Advisor Booking Gmail bridge. READ ONLY.
 *
 * Runs inside nick@advisorbooking.com's own Google account. When the Command Center
 * POSTs a list of prospect email addresses plus the shared key, it returns the recent
 * threads with those addresses: date, who sent each message, subject, and plain text.
 * It never sends, drafts, labels, archives, moves or deletes anything.
 *
 * Setup: see GMAIL-SETUP.md. The key lives in Script Properties as BRIDGE_KEY,
 * never in this file.
 */
var MAX_EMAILS = 50;          // addresses per request
var MAX_THREADS_EACH = 10;    // threads per address
var MAX_BODY = 3000;          // characters of text per message

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var key = PropertiesService.getScriptProperties().getProperty('BRIDGE_KEY');
    if (!key || key.length < 24 || req.key !== key) return out_({ ok: false, error: 'bad key' });
    var emails = (req.emails || []).filter(function (x) {
      return typeof x === 'string' && /^[^\s@()"]+@[^\s@()"]+\.[a-z]{2,}$/i.test(x);
    }).slice(0, MAX_EMAILS);
    var days = Math.min(Math.max(parseInt(req.days, 10) || 120, 1), 365);
    var me = (Session.getEffectiveUser().getEmail() || 'nick@advisorbooking.com').toLowerCase();
    var seen = {}, threads = [];
    emails.forEach(function (addr) {
      var q = '(from:' + addr + ' OR to:' + addr + ' OR cc:' + addr + ') newer_than:' + days + 'd -in:chats';
      GmailApp.search(q, 0, MAX_THREADS_EACH).forEach(function (t) {
        if (seen[t.getId()]) return;
        seen[t.getId()] = true;
        var parts = {};
        var msgs = t.getMessages().map(function (m) {
          var from = (m.getFrom() || '').toLowerCase();
          [m.getFrom(), m.getTo(), m.getCc()].join(',').toLowerCase().replace(/[^,]*<([^>]+)>|([^,\s<>]+@[^,\s<>]+)/g, function (_, a, b) {
            var x = (a || b || '').trim(); if (x && x !== me) parts[x] = true; return _;
          });
          return {
            date: m.getDate().toISOString(),
            from: m.getFrom(),
            fromMe: /@advisorbooking\.com/.test(from),
            to: m.getTo(),
            body: (m.getPlainBody() || '').slice(0, MAX_BODY)
          };
        });
        threads.push({ id: t.getId(), subject: t.getFirstMessageSubject(), participants: Object.keys(parts), messages: msgs });
      });
    });
    return out_({ ok: true, account: me, threads: threads, asOf: new Date().toISOString() });
  } catch (err) {
    return out_({ ok: false, error: String(err).slice(0, 200) });
  }
}

function doGet() {
  return out_({ ok: false, error: 'POST only' });
}

/** Run once from the editor to confirm Gmail access. It prints counts only. */
function testRead() {
  var n = GmailApp.search('newer_than:7d', 0, 5).length;
  Logger.log('Gmail read works. Threads in the last 7 days (first page, max 5): ' + n);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
