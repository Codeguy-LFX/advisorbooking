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
| `ria-meetings.html` | `/ria-meetings` | The landing page for all paid traffic (Google Search, LinkedIn): a full sales page. The headline follows `?v=` (appt, leads, mktg, alt, playbook; anything else is appt). The quiz sits on the first screen, AUM question first. `noindex`. See "The paid landing page" below. |
| `ria-meetings-direct.html` | `/ria-meetings-direct` | Hidden V2 of the paid landing page (same sales page, same `?v=` headlines). No quiz: every button goes straight to the iClosed event (`iclosedUrlDirect` in `assets/config.js`, else `iclosedUrlFit5`) with the campaign tags and click id added, and the screening questions are asked inside iClosed. Not linked, `noindex`. Google Ads conversions are NOT sent from it (the booking happens on iClosed). Styles: `assets/rm-direct.css`. |
| `ria-meetings-embed.html` | `/ria-meetings-embed` | Hidden V3 of the paid landing page: the V2 page (no quiz) with the iClosed calendar embedded in a section under the hero. Every button scrolls to it. A booking made in the frame is saved to the CRM through `/booked`. `noindex`. Styles: `assets/rm-embed.css`. |
| `ria-playbook.html` | `/ria-playbook` | Hidden V4: a centered lead-magnet page (the Past Prospect Playbook). The visitor gives an email, the page saves it for the quiz, posts one `email_capture` record to the CRM and sends them to the quiz at `AB_CONFIG.playbookNext` (default `/preview/a/`, which does NOT post to the CRM yet). `noindex`. Styles `assets/v4.css`, script `assets/v4.js`. |
| `qualified.html` | `/qualified` | Where a QUALIFIED lead from `/ria-meetings` lands: the calendar on the first screen, the lead's own AUM and advisor answers, and what happens on the call. It is the page that sends the one Google Ads conversion event ("Submit lead form", see `assets/gads.js`), so it sends anyone who has not just passed the quiz as qualified back to `/ria-meetings`. No name, email, phone or photo is shown on it. `noindex`, linked from nowhere, not in the sitemap. |
| `not-a-fit.html` | `/not-a-fit` | Where a not-qualified lead from `/ria-meetings` lands. No calendar. Says why (under $50M AUM, or not a financial advisor), what is in the Playbook they still get, and how to come back. `noindex`. |
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
- The paid funnel: `/ria-meetings` runs the same quiz engine and settings as `/L1/` with four extra settings
  (`SCROLL_TO`, `VARIANT`, `CARRY_QUERY`, `QUALIFIED_FLAG` in `assets/funnel.js`). It sends the CRM the same record
  plus `v` (the headline variant), carries the whole query string (click id, `utm_`, `v`) to `/qualified` or
  `/not-a-fit`, and sets `sessionStorage ab_qualified = 1` for a qualified lead. `lander.js` and `funnel.js` also keep
  the ad click id (`gclid`, `gbraid`, `wbraid`) for 90 days (`ab_click`). The pages are built on `assets/kit.css` (the
  home page's design as reusable classes), `assets/rm.css` and `assets/rm-after.css`.
- CRM: `ghlWebhookUrl` gets two form-encoded posts per lead: `stage=complete` (all answers, contact details,
  qualified, dq_reasons, consent text and time, campaign tags) and `stage=booked` (from `/booked`).
- Landers (`/v2/`): the email-first button goes to `landerNext` (`L1/`) with the email prefilled. The v2 pages load
  `assets/lander-lite.css` (the 2 KB of `lp.css` they use) instead of `lp.css`. v2 copy rules (Nov 8, 2026): say
  "Compliance Team", never CCO; no pricing anywhere; only what we do (nothing against ads or other channels); the
  generator's lint fails the build on any of these.
- Settings in `assets/config.js`: `ghlWebhookUrl`, `metaPixelLeadId`, `gtmId`, `iclosedUrlFit5`.

## The paid landing page

`/ria-meetings` runs in this order: the first screen (who it is for, the headline for the visit, the commitment, the quiz),
the call-out, the Past Prospect Playbook, a week once it is running, why the calendar is not full, the Advisor Pipeline
System, what makes it different, everything included, the four extras, the 90-day commitment, pricing, who it is for,
FAQ, the founder with his photo, the closing button. Three buttons and two text links lead to the quiz, nowhere else.

- **The Playbook section describes the real guide** ("Advisor Booking: Past Prospect Playbook"): its 7-day schedule,
  six emails, call scripts, tracker and compliance checklist. Change the section when the guide changes. The site does
  not send the guide: the CRM must email it to every lead who finishes the quiz, qualified or not, because all three
  pages promise it.
- **Prices are written in the page**, in the Pricing section and one FAQ answer: the founding rate ($5,000 every 4
  weeks, no setup fee, 3 billing cycles), standard pricing ($10,000 setup, then $7,500 every 4 weeks) and the math
  ($15,000 over 15 meetings). Change all of them together when the offer changes.
- **The commitment is word for word** the owner's sentence. The word "guarantee" is not used on these three pages.
- **Proof**: there are no client results yet, so none are shown. Four places are marked in the HTML with a
  `PROOF SLOT` comment (sample weekly report, a compliance team's comment, a results table, a client line). Fill them
  with real material only.
- **The founder's photo** is `assets/nick-panel.jpg` (with `.webp` and 600px copies): a crop of his panel photo with
  his name badge and the second panelist left out, and no camera data in the file.
- The buttons and links to the quiz move the page without changing the address (a `#book` address would add a history
  entry the quiz reads as "back to question 1").

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
