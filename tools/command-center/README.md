# Advisor Booking Command Center

One private page: the five prospects to talk to today, with a drafted email for each, above the
numbers. Built from the Advisor Booking GoHighLevel sub-account and (once connected) Gmail for
nick@advisorbooking.com. Read only, everywhere.

| File | What it is |
| --- | --- |
| `build_data.py` | Pulls GoHighLevel (and the Gmail bridge), writes `data.json`. GET requests only. |
| `config.json` | Location ID, your own test contacts to leave out, the 14-day rule, founding seats. |
| `dashboard/index.html` | The page. It loads `data.json` next to it. |
| `gmail-bridge/` | The read-only Apps Script for nick@advisorbooking.com, plus `GMAIL-SETUP.md`. |
| `PROMPTS.md` | The three prompts, rewritten for independent RIA prospects and your compliance rules. |
| `STANDING-ORDER.md` | What the weekday 7am refresh does. |

The page is a private Claude artifact. Prospect data and drafts are never committed here: this repo
is public. The GoHighLevel key lives only as a network secret on the `advisorbooking` cloud
environment; the scripts send the placeholder `proxy-injected` and the proxy adds the key.

Run by hand: `python3 -I build_data.py --out /tmp/cc --drafts /tmp/cc/drafts.json`
(set `GMAIL_BRIDGE_URL` and `GMAIL_BRIDGE_KEY` for that one command to include Gmail).
