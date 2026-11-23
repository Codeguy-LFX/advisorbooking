#!/usr/bin/env python3
"""Advisor Booking Command Center: pull facts, READ ONLY, and write data.json.

Sources
  GoHighLevel  services.leadconnectorhq.com, sub-account key injected by the session proxy
               (send the literal word proxy-injected; never put a real key in this file).
  Gmail        optional. The Apps Script bridge in gmail-bridge/ (POST, read only).
               Set GMAIL_BRIDGE_URL and GMAIL_BRIDGE_KEY in the environment of the command.

Usage
  python3 -I build_data.py --out DIR [--drafts drafts.json]

Every request here is a GET, except the Gmail bridge POST, which only reads mail.
Nothing is created, updated, moved or deleted anywhere.
"""
import argparse, datetime as dt, html, json, os, re, subprocess, sys  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "config.json")))
for _x in filter(None, (os.environ.get("CC_INTERNAL") or "").split(",")):
    _x = _x.strip().lower()
    (CFG["internalEmails"] if "@" in _x else CFG["internalPhones"]).append(_x if "@" in _x else re.sub(r"[^\d+]", "", _x))
GHL = "https://services.leadconnectorhq.com"
LOC = CFG["locationId"]
NOW = dt.datetime.now(dt.timezone.utc)

STOP_RE = re.compile(r"\b(stop|unsubscribe|remove me|take me off|opt ?out|do not (?:contact|email|text) me|don'?t (?:contact|email|text) me|not interested|quit|cancel)\b", re.I)
AUTO_SUBJ_RE = re.compile(r"^(invitation|updated invitation|cancell?ed|accepted|declined|new ab lead|your call is confirmed|here is why you may want)", re.I)
AUTO_SOURCES = {"workflow", "campaign", "bulk_actions", "bulk_action", "automation", "trigger_link", "review_request"}


def curl(args):
    r = subprocess.run(["curl", "-sS", "-m", "40"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:300])
    return r.stdout


def ghl(path, version="2021-07-28"):
    out = curl(["-H", "Authorization: Bearer proxy-injected", "-H", f"Version: {version}",
                "-H", "Accept: application/json", GHL + path])
    d = json.loads(out)
    if isinstance(d, dict) and d.get("statusCode") in (401, 403):
        raise RuntimeError(f"GoHighLevel refused {path.split('?')[0]}: {d.get('message')}")
    return d


def ts(v):
    """GHL dates come as ISO strings or epoch milliseconds."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return dt.datetime.fromtimestamp(v / 1000, dt.timezone.utc)
    try:
        return dt.datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None


def plain(body):
    t = re.sub(r"(?is)<(script|style).*?</\1>", "", body or "")
    t = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


SIG_CUT = re.compile(r"(?im)^(--\s*$|thank you,?$|thanks,?$|best( regards)?,?$|regards,?$|sent from my|this e-?mail|confidentiality notice|important notice|the statements contained herein)")


def own_words(text):
    """The writer's own words: drop quoted history and the signature block."""
    t = re.split(r"(?m)^On .{6,120}wrote:\s*$|^-{2,} ?Original Message", text)[0]
    lines = [l.strip() for l in t.splitlines()]
    keep = []
    for i, l in enumerate(lines):
        if i > 0 and SIG_CUT.match(l):
            break
        if l.startswith(">"):
            continue
        keep.append(l)
    return " ".join(x for x in keep if x).strip()


QUOTE_RE = re.compile(r"On (?P<when>[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2}\s?[AP]M)[^\n]*?(?:&lt;|<)(?P<email>[^>&\s]+@[^>&\s]+)(?:&gt;|>)\s*wrote:\s*\n(?P<body>.*)", re.S)


def quoted_inbound(text_with_breaks, tzname):
    """Their words, as quoted at the bottom of an email we sent. Returns (iso_date, email, words)."""
    m = QUOTE_RE.search(text_with_breaks)
    if not m:
        return None
    try:
        from zoneinfo import ZoneInfo
        when = dt.datetime.strptime(m.group("when").replace(" ", " "), "%a, %b %d, %Y at %I:%M %p").replace(tzinfo=ZoneInfo(tzname))
    except Exception:
        when = None
    words = own_words(m.group("body"))
    return (when, m.group("email").lower(), words)


def is_internal(contact):
    em = (contact.get("email") or "").lower()
    ph = re.sub(r"[^\d+]", "", contact.get("phone") or "")
    if em and (em in CFG["internalEmails"] or any(em.endswith("@" + d) for d in CFG["internalEmailDomains"])):
        return True
    if em.startswith("nick+"):
        return True
    return bool(ph) and ph in CFG["internalPhones"]


def all_pages(path, key, limit=100, max_pages=100):
    out, page = [], 1
    while page <= max_pages:
        sep = "&" if "?" in path else "?"
        d = ghl(f"{path}{sep}limit={limit}&page={page}")
        rows = d.get(key, [])
        out += rows
        if len(rows) < limit:
            break
        page += 1
    return out


def gmail_bridge(emails):
    url, key = os.environ.get("GMAIL_BRIDGE_URL"), os.environ.get("GMAIL_BRIDGE_KEY")
    if not (url and key):
        return None, "not set up yet (GMAIL_BRIDGE_URL and GMAIL_BRIDGE_KEY are empty)"
    payload = json.dumps({"key": key, "emails": emails, "days": CFG["gmailBridgeDays"]})
    try:
        out = curl(["-L", "-H", "Content-Type: application/json", "--data-binary", payload, url])
        d = json.loads(out)
    except Exception as e:
        return None, f"bridge call failed: {e}"
    if not d.get("ok"):
        return None, f"bridge said: {d.get('error')}"
    return d, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--drafts")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    notes = []

    # ---------- GoHighLevel ----------
    loc = ghl(f"/locations/{LOC}").get("location", {})
    tzname = loc.get("timezone") or CFG["ownerTimezone"]
    contacts = all_pages(f"/contacts/?locationId={LOC}", "contacts")
    pipes = ghl(f"/opportunities/pipelines?locationId={LOC}").get("pipelines", [])
    stage_name = {s["id"]: (p["name"], s["name"]) for p in pipes for s in p.get("stages", [])}
    opps = all_pages(f"/opportunities/search?location_id={LOC}", "opportunities")
    convs, after = [], None
    for _ in range(50):
        q = f"/conversations/search?locationId={LOC}&limit=100&sort=desc&sortBy=last_message_date" + (f"&startAfterDate={after}" if after else "")
        rows = ghl(q).get("conversations", [])
        convs += rows
        if len(rows) < 100:
            break
        after = rows[-1].get("lastMessageDate")

    msgs_by_contact = {}
    for c in convs:
        d = ghl(f"/conversations/{c['id']}/messages?limit=100", version="2021-04-15").get("messages", {})
        for m in (d.get("messages", []) if isinstance(d, dict) else []):
            msgs_by_contact.setdefault(c.get("contactId"), []).append(m)

    opp_by_contact = {}
    for o in opps:
        opp_by_contact.setdefault(o.get("contactId"), []).append(o)

    prospects = [c for c in contacts if not is_internal(c)]
    emails = sorted({(c.get("email") or "").lower() for c in prospects if c.get("email")})

    # ---------- Gmail (optional) ----------
    gm, gm_err = gmail_bridge(emails)
    gmail_by_email = {}
    if gm:
        for t in gm.get("threads", []):
            for e in t.get("participants", []):
                gmail_by_email.setdefault(e.lower(), []).append(t)
    else:
        notes.append(f"Gmail: {gm_err}. Their replies that only live in Gmail are not counted.")

    people = []
    for c in prospects:
        cid, em = c.get("id"), (c.get("email") or "").lower()
        events = []  # (when, direction, channel, words, source)
        quoted = []
        for m in msgs_by_contact.get(cid, []):
            mt, src = m.get("messageType", ""), (m.get("source") or "").lower()
            if mt.startswith("TYPE_ACTIVITY"):
                continue
            when = ts(m.get("dateAdded"))
            body_html = m.get("body") or ""
            if mt == "TYPE_EMAIL" and not body_html:
                ids = ((m.get("meta") or {}).get("email") or {}).get("messageIds") or []
                if ids:
                    em_d = ghl(f"/conversations/messages/email/{ids[0]}")
                    body_html = (em_d.get("emailMessage") or em_d).get("body") or ""
                    subj = (em_d.get("emailMessage") or em_d).get("subject") or ""
                else:
                    subj = ""
            else:
                subj = m.get("subject") or ""
            automated = src in AUTO_SOURCES or bool(AUTO_SUBJ_RE.match(subj or ""))
            text = plain(re.sub(r"(?i)<br\s*/?>", "\n", body_html))
            if m.get("direction") == "outbound" and mt == "TYPE_EMAIL":
                q = quoted_inbound(text, tzname)
                if q and q[1] == em:
                    quoted.append(q)
            if automated:
                continue
            events.append((when, m.get("direction"), mt.replace("TYPE_", "").lower(), own_words(text), "GoHighLevel", subj))
        for q in quoted:  # their message, seen only as a quote inside our reply
            events.append((q[0], "inbound", "email", q[2], "GoHighLevel (quoted in your reply)", ""))
        for t in gmail_by_email.get(em, []):
            for gmsg in t.get("messages", []):
                when = ts(gmsg.get("date"))
                direction = "outbound" if gmsg.get("fromMe") else "inbound"
                if any(e[0] and when and abs((e[0] - when).total_seconds()) < 180 and e[1] == direction for e in events):
                    continue
                events.append((when, direction, "email", own_words(gmsg.get("body") or ""), "Gmail", t.get("subject") or ""))
        events = [e for e in events if e[0]]
        events.sort(key=lambda e: e[0])
        last = events[-1] if events else None
        last_in = next((e for e in reversed(events) if e[1] == "inbound"), None)
        stop_hit = next((e for e in events if e[1] == "inbound" and STOP_RE.search(e[3] or "")), None)
        o = sorted(opp_by_contact.get(cid, []), key=lambda x: x.get("monetaryValue") or 0, reverse=True)
        open_o = [x for x in o if x.get("status") == "open"]
        name = " ".join(x for x in [c.get("firstName"), c.get("lastName")] if x) or c.get("contactName") or ""
        if "@" in name:
            name = ""
        domain = em.split("@")[-1] if "@" in em else ""
        people.append({
            "id": cid,
            "name": name or "not in CRM",
            "email": c.get("email") or "",
            "phone": c.get("phone") or "",
            "domain": domain,
            "timezone": c.get("timezone") or "",
            "tags": c.get("tags") or [],
            "dnd": bool(c.get("dnd")),
            "added": (c.get("dateAdded") or "")[:10],
            "dealValue": (open_o[0].get("monetaryValue") if open_o else None),
            "stage": (" / ".join(stage_name.get(open_o[0].get("pipelineStageId"), ("?", "?"))) if open_o else None),
            "lastContact": last[0].isoformat() if last else None,
            "daysQuiet": (NOW - last[0]).days if last else None,
            "spokeLast": ("them" if last and last[1] == "inbound" else "us") if last else None,
            "lastChannel": last[2] if last else None,
            "lastSubject": next((e[5] for e in reversed(events) if e[5]), ""),
            "theirLastWords": (last_in[3] if last_in else None),
            "theirLastWordsDate": (last_in[0].isoformat() if last_in else None),
            "theirLastWordsSource": (last_in[4] if last_in else None),
            "ourLastWords": next((e[3][:400] for e in reversed(events) if e[1] == "outbound"), None),
            "humanMessages": len(events),
            "outsideUs": any(domain.endswith(t) for t in CFG["outsideIcpCountryTlds"]),
            "skip": ("do not contact flag in CRM" if c.get("dnd") else (f'replied "{stop_hit[3][:60]}"' if stop_hit else None)),
        })

    stale = [p for p in people if p["daysQuiet"] is not None and p["daysQuiet"] >= CFG["staleDays"] and not p["skip"]]
    active = [p for p in people if p["lastContact"] and not p["skip"]]

    # One-sentence rule: client spoke last beats us; then deal value; then a real reply in their own words;
    # then most days quiet; out-of-US domains last.
    def rank_key(p):
        real_words = bool(p["theirLastWords"]) and len(p["theirLastWords"]) > 6
        return (p["outsideUs"], p["spokeLast"] != "them", -(p["dealValue"] or 0), not real_words,
                not bool(p["theirLastWords"]), -(p["daysQuiet"] or 0), p["email"])
    pool = stale if len(stale) >= 5 else stale + [p for p in sorted(active, key=rank_key) if p not in stale]
    five = sorted(pool, key=rank_key)[:5] if len(stale) < 5 else sorted(stale, key=rank_key)[:5]

    drafts = json.load(open(a.drafts)) if a.drafts and os.path.exists(a.drafts) else {}
    for p in five:
        p["draft"] = drafts.get(p["id"])

    added_week = {}
    for c in prospects:
        d = ts(c.get("dateAdded"))
        if d:
            wk = (d - dt.timedelta(days=d.weekday())).date().isoformat()
            added_week[wk] = added_week.get(wk, 0) + 1
    weeks = []
    start = (NOW - dt.timedelta(days=NOW.weekday())).date()
    for i in range(7, -1, -1):
        w = (start - dt.timedelta(weeks=i)).isoformat()
        weeks.append({"week": w, "count": added_week.get(w, 0)})

    stage_counts = {}
    for o in opps:
        if o.get("status") == "open":
            k = " / ".join(stage_name.get(o.get("pipelineStageId"), ("?", "?")))
            stage_counts[k] = stage_counts.get(k, 0) + 1

    data = {
        "builtAt": NOW.isoformat(),
        "timezone": tzname,
        "business": CFG["businessName"],
        "sources": {
            "GoHighLevel": "live",
            "Gmail": "live" if gm else "not connected",
            "Google Ads": "not connected", "LinkedIn Ads": "not connected", "Meta Ads": "not connected",
        },
        "counts": {
            "contacts": len(contacts), "prospects": len(prospects),
            "prospectsWithConversation": len(active),
            "openOpportunities": sum(1 for o in opps if o.get("status") == "open"),
            "openPipelineValue": sum((o.get("monetaryValue") or 0) for o in opps if o.get("status") == "open"),
            "staleCount": len(stale),
            "staleValue": sum((p["dealValue"] or 0) for p in stale),
            "newProspectsThisWeek": weeks[-1]["count"],
        },
        "pipelines": [{"name": p["name"], "stages": [s["name"] for s in p.get("stages", [])]} for p in pipes],
        "stageCounts": stage_counts,
        "foundingSeats": {"total": CFG["foundingSeatsTotal"], "sold": CFG["foundingSeatsSold"], "asOf": CFG["foundingSeatsAsOf"], "source": CFG["foundingSeatsSource"]},
        "weeklyNewProspects": weeks,
        "five": five,
        "stale": sorted(stale, key=rank_key),
        "skipped": [{"name": p["name"] or p["email"], "email": p["email"], "why": p["skip"]} for p in people if p["skip"]],
        "staleDays": CFG["staleDays"],
        "notes": notes,
    }
    json.dump(data, open(os.path.join(a.out, "data.json"), "w"), indent=1, default=str)
    json.dump(people, open(os.path.join(a.out, "people.json"), "w"), indent=1, default=str)
    print(f"built {a.out}/data.json: {len(prospects)} prospects, {len(stale)} quiet {CFG['staleDays']}+ days, five={[p['email'] for p in five]}")
    for n in notes:
        print("NOTE", n)


if __name__ == "__main__":
    main()
