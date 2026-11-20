# AdvisorBooking.com

Static marketing site for Advisor Booking (De Jesus Ventures LLC). No build step: plain HTML, CSS, and JS served from the repository root by GitHub Pages.

## Pages

| File | URL | Purpose |
| --- | --- | --- |
| `index.html` | `/` | Home page |
| `book.html` | `/book` | Booking page for every home-page button: the logo and the iClosed scheduler full width, nothing else (the pilot lander is the other path to test) |
| `pilot.html` | `/pilot` | Hidden founding-offer landing page for email and LinkedIn outreach (gated form, then the iClosed calendar). `noindex`, not linked from the nav. |
| `meetings.html` | `/meetings` | Hidden v1 landing page, kept for later use. `noindex`. |
| `L1/index.html` | `/L1/` | The qualifying funnel: six screens, then `/L1/Q/` or `/L1/DQ/`. `noindex`. See below. |
| `ria-meetings.html` | `/ria-meetings` | **V1.** The landing page for paid traffic (Google Search, LinkedIn) with the quiz on the first screen, AUM question first, then the full sales page. The headline follows `?v=` (appt, leads, mktg, alt, playbook; anything else is appt). `noindex`. Built: see "The paid landing pages" below. |
| `ria-meetings-direct.html` | `/ria-meetings-direct` | **V2.** The same sales page with no quiz: a centered first screen, the animated product card, and every button goes straight to the iClosed event (`iclosedUrlDirect` in `assets/config.js`, else `iclosedUrlFit5`) with the campaign tags and click id added. The screening questions are asked inside iClosed. No Google Ads conversion is sent from it. `noindex`. Built. |
| `ria-meetings-embed.html` | `/ria-meetings-embed` | **V3.** As V2, but the iClosed calendar is on the page, straight under the first screen; every button scrolls to it. A booking made in the frame is saved to the CRM through `/booked`. `noindex`. Built. |
| `ria-playbook.html` | `/ria-playbook` | **V4.** The lead-magnet page, modeled on the home page: a centered first screen with an email box, the animated product card, a look inside the Past Prospect Playbook, how it works, the commitment, the founder. The email is saved for the quiz, sent to the CRM as one `email_capture` record, and the visitor goes to `/fit-check`. No prices on this page. `noindex`. Built. |
| `fit-check.html` | `/fit-check` | The quiz of V4: the "route A" design from `/preview/a/`, live. The production quiz word for word (RIA question first), the email from the box already filled in. Sends the same CRM record as the other quizzes with `v` = `v4-` plus the headline variant. Qualified leads go to `/qualified`, the others to `/not-a-fit`. `noindex`. |
| `qualified.html` | `/qualified` | Where a QUALIFIED lead from `/ria-meetings` or `/fit-check` lands: the calendar on the first screen, the lead's own AUM and advisor answers, and what happens on the call. It is the page that sends the one Google Ads conversion event ("Submit lead form", see `assets/gads.js`), so it sends anyone who has not just passed a quiz as qualified back to `/ria-meetings`. No name, email, phone or photo is shown on it. `noindex`, linked from nowhere, not in the sitemap. |
| `not-a-fit.html` | `/not-a-fit` | Where a NOT-qualified lead from either paid quiz lands. They may still book (owner's decision, Nov 20, 2026: he cancels the calls he does not want): an honest line about fit (under $50M AUM, or not a financial advisor), the calendar, the Playbook they get either way, and a link back that opens the quiz at the question that decided it. Never sends a conversion. `noindex`. |
| `L1/Q/index.html`, `L1/DQ/index.html` | `/L1/Q/`, `/L1/DQ/` | The booking pages of the home-page quiz (`/L1/`): iClosed calendar, prefilled. Identical, except `Q/` carries the Meta pixel and fires one `Lead` event. `noindex`. |
| `booked.html` | `/booked` | Booking confirmation with next steps. iClosed sends people here after they book; it records the booking (CRM post, GTM `ab_booked` for qualified leads). `noindex`. |
| `fit/`, `fit5/` | `/fit/`, `/fit5/` | Old funnel links: forward to `/L1/` with the query string (campaign tags) intact. |
| `v2/index.html` | `/v2/` | The home lander (hero with the rotating word, email-first "Book intro call" box). `noindex`: a variant of `/`. Generated. |
| `v2/blog/` | `/v2/blog/` + 3 posts | Value-only posts from Nick's emails (no CTA in the text, no pricing, no claims), indexable, with BlogPosting, FAQPage and BreadcrumbList data and sitemap entries. Generated. |
| `v2/methodology.html` | `/v2/methodology` | Retired Nov 8, 2026: forwards to `/v2/`. The three original post URLs forward to `/v2/blog/`. |
| `privacy.html`, `terms.html` | `/privacy`, `/terms` | Privacy Policy and Terms of Use |
| `404.html` | | Not-found page |

GitHub Pages serves `page.html` at `/page`, so the clean URLs above work without redirects.

## The /L1 funnel

One funnel (Funnels 1 to 4 were retired on Nov 8, 2026). Engine: `assets/funnel.js`; layout: `assets/qf.css`; questions,
rules and settings: the `window.AB_APPLY` block at the top of `L1/index.html`.

- Six screens: RIA status, role, AUM, advisors' calendars, new assets in the last 12 months, contact (with the required
  calls/texts/voicemail consent box). Then the booking page: `/L1/Q/` for a qualified lead, `/L1/DQ/` for a DQ lead.
  Both show the iClosed event (`iclosedUrlFit5`), prefilled.
- Nobody is turned away: every lead gets the same screens and the calendar. Two labels only: `qualified` (a
  financial advisor, including broker-dealer and wirehouse, at a firm with $50M+ AUM) or `dq` (not a financial
  advisor, or AUM under $50M), with `dq_reasons`. New assets is asked but never decides it.
- Meta: ONE event on the whole site, `Lead`, fired on `/L1/Q/` once per submission (`metaPixelLeadId`). No PageView,
  no automatic events, nothing on `/L1/DQ/` or any other page (`metaPixelId` stays empty). The pixel code exists only
  in `L1/Q/index.html`.
- GTM (when `gtmId` is set): same rule. `gtm.js` is included only on `/L1/Q/` (one event, `ab_lead`, once per
  submission) and `/booked` (`ab_booked`, qualified leads only). The form page and `/L1/DQ/` do not include it. Not
  needed for Google Ads.
- Google Ads: `assets/gads.js` loads the Google tag (`googleTagId`, the snippet from Google Ads > Data manager >
  Google tag) on every page except `/contact`, `/about`, `/privacy`, `/terms` and `/booked` (its address carries the
  booker's name and email). The ONE conversion is the "Submit lead form" event snippet (`googleAdsConversion`), sent
  only on `/qualified` after that page's check has passed and the quiz's `ab_qualified` flag was set, once for each
  qualified submission (do not also count `/qualified` by address in Google Ads, or each lead counts twice). A booking is not a conversion on
  purpose: not every qualified lead books. The tag never starts for a browser that sends Global Privacy Control, at an
  address that carries a person's details, or at any other address that merely contains "/qualified".
- The paid funnel: `/ria-meetings` and `/fit-check` run the same quiz engine and settings as `/L1/` with extra settings
  (`SCROLL_TO`, `VARIANT`, `CARRY_QUERY`, `QUALIFIED_FLAG` in `assets/funnel.js`). They send the CRM the same record
  plus `v` (the headline variant; `v4-` in front for `/fit-check`), carry the whole query string (click id, `utm_`,
  `v`) to `/qualified` or `/not-a-fit`, and set `sessionStorage ab_qualified = 1` for a qualified lead. `lander.js`,
  `funnel.js` and `paid.js` also keep the ad click id (`gclid`, `gbraid`, `wbraid`) for 90 days (`ab_click`).
- CRM: `ghlWebhookUrl` gets two form-encoded posts per lead: `stage=complete` (all answers, contact details,
  qualified, dq_reasons, consent text and time, campaign tags) and `stage=booked` (from `/booked`).
- Landers (`/v2/`): the email-first button goes to `landerNext` (`L1/`) with the email prefilled. The v2 pages load
  `assets/lander-lite.css` (the 2 KB of `lp.css` they use) instead of `lp.css`. v2 copy rules (Nov 8, 2026): say
  "Compliance Team", never CCO; no pricing anywhere; only what we do (nothing against ads or other channels); the
  generator's lint fails the build on any of these.
- Settings in `assets/config.js`: `ghlWebhookUrl`, `metaPixelLeadId`, `gtmId`, `iclosedUrlFit5`.

## The paid landing pages

Four versions of one landing page, to test against each other from the same ads. All take the same five headlines
from `?v=`, all are `noindex` and linked from nowhere.

| | Address | What the visitor does |
| --- | --- | --- |
| V1 | `/ria-meetings` | answers the quiz on the first screen, then picks a time |
| V2 | `/ria-meetings-direct` | presses a button and goes to iClosed |
| V3 | `/ria-meetings-embed` | picks a time in the calendar on the page |
| V4 | `/ria-playbook` | gives a work email for the Playbook, then takes the quiz at `/fit-check` |

**They are built, not written by hand.** The sections live once in `tools/paid/*.html`; `tools/build_paid.py` stamps
them into the four pages (which sections, in which order, and the few words that differ per page are in the `PAGES`
table at the top of the script). To change copy: edit the part, run `python3 tools/build_paid.py`, commit the part and
the pages. `python3 tools/build_paid.py --check` fails when a page no longer matches its parts. Never edit the four
built pages directly. `fit-check.html`, `qualified.html` and `not-a-fit.html` are ordinary files.

Files: `assets/paid.css` (the shared design: centered first screen, sections, cards, the look inside the Playbook,
pricing, the founder, questions, the closing band), `assets/paid.js` (in-page links, the email box, the iClosed
links, the calendar on the page, the Playbook titles, the entrance of sections), `assets/rm.css` and `assets/rm.js`
(the first screen of V1 only), `assets/pd.css` and `assets/pd.js` (the animated product card), `assets/route-a.css`
and `assets/route-a.js` (`/fit-check`), `assets/rm-after.css` (the two pages after a quiz, and the calendar card).

- **The look inside the Playbook shows the real guide** ("Advisor Booking: Past Prospect Playbook"): six pages taken
  from it word for word. Change the part `sec-look` when the guide changes. The site does not send the guide: the CRM
  must email it to every lead who gives an email or finishes a quiz, because every page promises it.
- **Prices are written in the part `sec-pricing` and one answer in `sec-faq-long`** (V1 to V3 only): the founding rate
  ($5,000 every 4 weeks, no setup fee, 3 billing cycles), standard pricing ($10,000 setup, then $7,500 every 4 weeks)
  and the math ($15,000 over 15 meetings). Change them together when the offer changes. V4 shows no price.
- **The commitment is word for word** the owner's sentence (part `sec-commitment`). The word "guarantee" is not used
  on any paid page.
- **Proof.** No client results exist yet, so none are shown. What is shown: the founder's photo
  (`assets/nick-panel.jpg`, a crop of his panel photo with his name badge and the second panelist left out, no camera
  data) and one of his own Ads Manager screenshots (`assets/proof-ads*.{png,webp}`, a plain crop, nothing redrawn),
  labelled as past work in another channel and not a result to expect. `PROOF SLOT` comments in the parts mark where
  real client proof goes later.
- **The animated product card** tells one example (fictional prospect, labelled "Example") in four scenes. Its text is
  in the part `pd`. It plays only when on screen, stops for visitors who ask for less motion, and has a pause button.
- **Links inside the page** move the page without changing the address (on V1 a `#book` address would add a history
  entry the quiz reads as "back to question 1"). On V1 the quiz answers to the letter keys only while it is on screen.
- **Tracking.** The one Google Ads conversion is still the qualified lead on `/qualified` (V1 and V4). V2 and V3 send
  none: the booking happens on iClosed. `email_capture` (V4) and `booked` (V3, through `/booked`) reach the CRM.

## Editing the site

Numbers, IDs, and contact details live in **`assets/config.js`**. It is the only file to edit for:

- the scheduler (`iclosed` or `calendly`) and its event link
- the GoHighLevel inbound webhook URL (empty = bookings and form submissions are not posted anywhere)
- Meta Pixel and LinkedIn tag IDs (empty = the tags are not loaded; they are also never loaded when a browser sends a Global Privacy Control signal)
- the contact email (`info@advisorbooking.com`), entity, city

The home page (`index.html`) carries its own styles and script inline. Scrolling is the browser's own (the Lenis smooth-scroll library was removed on Nov 8, 2026: it made the wheel lag; `assets/vendor/lenis.min.js` is no longer loaded). It keeps the same attribution rules as `assets/site.js`: campaign tags are stored for the visit and added, with a `src` label, to every link to `book.html`, and ad tags load only when their IDs are set. The other pages still use `assets/styles.css` and `assets/site.js`.

The landing pages read page-specific settings (fit questions, exit copy, form version) from a `window.AB_LP` block at the top of each page; `assets/lp.js` merges it over its defaults.

## Launch checklist

### 1. Create the GitHub repository and publish

1. Create a **public** repository named `advisorbooking` under the Codeguy-LFX account (public is required for free GitHub Pages).
2. Push this repository to it: `git remote add origin https://github.com/Codeguy-LFX/advisorbooking.git && git push -u origin main`.
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.**
4. Within a couple of minutes the site is live at `https://codeguy-lfx.github.io/advisorbooking/`. Because the `CNAME` file is in the repo, the Custom domain field under Settings → Pages fills in with `advisorbooking.com` automatically.

### 2. Point advisorbooking.com at GitHub Pages (Namecheap)

In Namecheap: **Domain List → Manage → Advanced DNS**. Delete the parking records Namecheap adds by default (the `CNAME www → parkingpage.namecheap.com` and the `URL Redirect` record), then add:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A Record | `@` | `185.199.108.153` | Automatic |
| A Record | `@` | `185.199.109.153` | Automatic |
| A Record | `@` | `185.199.110.153` | Automatic |
| A Record | `@` | `185.199.111.153` | Automatic |
| CNAME Record | `www` | `codeguy-lfx.github.io.` | Automatic |

Then back in GitHub: Settings → Pages → Custom domain `advisorbooking.com` → Save. GitHub checks the DNS (usually within minutes, sometimes up to an hour), issues the certificate, and the **Enforce HTTPS** box becomes available. Tick it. `www.advisorbooking.com` redirects to the apex automatically.

### 3. Email at the domain (Google Workspace)

`info@advisorbooking.com` is on every page, so the mailbox must exist before launch. Sign up for Google Workspace with `advisorbooking.com`, create `info@advisorbooking.com`, and add Google's records in Namecheap Advanced DNS: the single `MX` record Google now issues (host `@`, value `smtp.google.com.`, priority 1) plus the `TXT` verification record Google shows during setup. MX and TXT records sit alongside the A and CNAME records above; they do not conflict. Namecheap also has a one-click "Google Workspace" preset under Mail Settings that adds the MX record for you.

### 4. Scheduling (iClosed)

The booking pages are connected to the iClosed event `https://app.iclosed.io/e/advisorbooking/strategy-call` (`assets/config.js`: `scheduler: "iclosed"`, `iclosedUrl`). They build iClosed's own inline widget (the event's embed code: a `div.iclosed-widget` with that link as `data-url`, plus `https://app.iclosed.io/assets/widget.js`). On `/pilot` and `/meetings` the link carries the visitor's name, email, and mobile (`iclosedName`, `iclosedEmail`, `iclosedPhone`) and their UTM tags; on `/book` it carries the UTM tags. If the widget script is blocked, the pages fall back to a plain iframe of the same link with an "Open it here" link under it.

Still to do in iClosed:

1. **Confirmation page**: on the event, set the confirmation to **External URL** `https://advisorbooking.com/booked` and turn **Forward Parameters to External URL** on. That page records the booking (CRM webhook, ad conversions) whether iClosed opens it inside the calendar or as the whole page. Without this step bookings still happen but the site does not see them.
2. **Event name and length**: the pages show `eventName` and `eventLength` from `assets/config.js` beside the calendar ("Pipeline Audit", "20 min"). Rename the iClosed event to match, or change those two values.
3. **Event questions** (same wording as the `/pilot` form, so the prefill lands): Firm/Company name (short text, Identifier `company`); "The founding rate is $5,000 every 4 weeks, with no setup fee. Does that work for you?" (Identifier `budget`, answers `Yes, that works` / `Not right now`); "Are you ready to start today?" (Identifier `ready`, answers `Yes` / `No`). The landing pages send their answers word for word under those Identifiers (`LP.ICLOSED_QUESTIONS` in `assets/lp.js`).
   **Prefill check**: after filling the form on `/pilot`, the calendar should open with name, email, mobile, and the three answers already filled. If the contact fields are empty, your account uses `iclosed_name`-style names; change the three names in `assets/lp.js` (`function iclosedUrl`).
4. **CRM notifications for reschedules and cancellations (optional)**: native webhooks may not be on the Startup plan. Zapier (included on Startup) has Call Booked, Call Rescheduled, and Call Cancelled triggers that can update GoHighLevel.

Testing the booking end to end needs the site live on `advisorbooking.com`, because the confirmation page must be on the same domain as the booking page.

Calendly remains available as a fallback (`scheduler: "calendly"`, `calendlyUrl`).

### 5. Before driving traffic

- Set `ghlWebhookUrl` in `assets/config.js` so bookings and landing-page submissions reach the CRM.
- Add the Meta Pixel and LinkedIn IDs only when ads are running.
- Register the SMS sending number for 10DLC through your texting provider; the Privacy Policy already carries the consent, STOP/HELP, and no-sharing language that registration asks for.
- Have counsel read `privacy.html` and `terms.html` once. They are complete and have no placeholders, but a lawyer's review is still the right final step.
