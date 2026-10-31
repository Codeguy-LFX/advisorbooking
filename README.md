# AdvisorBooking.com

Static marketing site for Advisor Booking (De Jesus Ventures LLC). No build step: plain HTML, CSS, and JS served from the repository root by GitHub Pages.

## Pages

| File | URL | Purpose |
| --- | --- | --- |
| `index.html` | `/` | Home page |
| `book.html` | `/book` | Booking page for every home-page button: the logo and the iClosed scheduler full width, nothing else (the pilot lander is the other path to test) |
| `pilot.html` | `/pilot` | Hidden founding-offer landing page for email and LinkedIn outreach (gated form, then the iClosed calendar). `noindex`, not linked from the nav. |
| `meetings.html` | `/meetings` | Hidden v1 landing page, kept for later use. `noindex`. |
| `founding-sprint.html` | `/founding-sprint` | Founding Sprint sales page (hidden lander for outreach). `noindex`, not linked from the nav, not in the sitemap. |
| `booked.html` | `/booked` | Booking confirmation. iClosed sends people here after they book; it records the booking. `noindex`. |
| `privacy.html`, `terms.html` | `/privacy`, `/terms` | Privacy Policy and Terms of Use |
| `404.html` | | Not-found page |

GitHub Pages serves `page.html` at `/page`, so the clean URLs above work without redirects.

## Editing the site

Numbers, IDs, and contact details live in **`assets/config.js`**. It is the only file to edit for:

- the scheduler (`iclosed` or `calendly`) and its event link
- the GoHighLevel inbound webhook URL (empty = bookings and form submissions are not posted anywhere)
- Meta Pixel and LinkedIn tag IDs (empty = the tags are not loaded; they are also never loaded when a browser sends a Global Privacy Control signal)
- the contact email (`info@advisorbooking.com`), entity, city

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
3. **Event questions** (same wording as the `/pilot` form, so the prefill lands): Firm/Company name (short text, Identifier `company`); "The founding rate is $3,500 every 4 weeks, with no setup fee. Does that work for you?" (Identifier `budget`, answers `Yes, that works` / `Not right now`); "Are you ready to start today?" (Identifier `ready`, answers `Yes` / `No`). The landing pages send their answers word for word under those Identifiers (`LP.ICLOSED_QUESTIONS` in `assets/lp.js`).
   **Prefill check**: after filling the form on `/pilot`, the calendar should open with name, email, mobile, and the three answers already filled. If the contact fields are empty, your account uses `iclosed_name`-style names; change the three names in `assets/lp.js` (`function iclosedUrl`).
4. **CRM notifications for reschedules and cancellations (optional)**: native webhooks may not be on the Startup plan. Zapier (included on Startup) has Call Booked, Call Rescheduled, and Call Cancelled triggers that can update GoHighLevel.

Testing the booking end to end needs the site live on `advisorbooking.com`, because the confirmation page must be on the same domain as the booking page.

Calendly remains available as a fallback (`scheduler: "calendly"`, `calendlyUrl`).

### 5. Before driving traffic

- Set `ghlWebhookUrl` in `assets/config.js` so bookings and landing-page submissions reach the CRM.
- Add the Meta Pixel and LinkedIn IDs only when ads are running.
- Register the SMS sending number for 10DLC through your texting provider; the Privacy Policy already carries the consent, STOP/HELP, and no-sharing language that registration asks for.
- Have counsel read `privacy.html` and `terms.html` once. They are complete and have no placeholders, but a lawyer's review is still the right final step.
