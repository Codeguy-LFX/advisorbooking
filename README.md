# AdvisorBooking.com

Static marketing site for Advisor Booking (De Jesus Ventures LLC). No build step: plain HTML, CSS, and JS served from the repository root by GitHub Pages.

## Pages

| File | URL | Purpose |
| --- | --- | --- |
| `index.html` | `/` | Home page |
| `book.html` | `/book` | Booking page (Calendly inline embed) |
| `pilot.html` | `/pilot` | Hidden founding-offer landing page for email and LinkedIn outreach (gated form, then Calendly). `noindex`, not linked from the nav. |
| `meetings.html` | `/meetings` | Hidden v1 landing page, kept for later use. `noindex`. |
| `privacy.html`, `terms.html` | `/privacy`, `/terms` | Privacy Policy and Terms of Use |
| `404.html` | | Not-found page |

GitHub Pages serves `page.html` at `/page`, so the clean URLs above work without redirects.

## Editing the site

Numbers, IDs, and contact details live in **`assets/config.js`**. It is the only file to edit for:

- the Calendly event URL and mode (`embed` shows the calendar inline)
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

The booking pages embed whichever provider `assets/config.js` names. Set it up for iClosed:

1. In iClosed, create the event (20 minutes, Google Meet, hosted on the `info@advisorbooking.com` Google Calendar).
2. **AI Scheduler → Events → the event → Embed**: copy the scheduler link (the `https://app.iclosed.io/e/...` URL). In `assets/config.js` set `scheduler: "iclosed"` and paste it into `iclosedUrl`. Update `eventName` and `eventLength` if they differ.
3. **Confirmation page**: set the event's confirmation to redirect to `https://advisorbooking.com/booked` with forwarding **on**. That page records the booking (CRM webhook, ad conversions) and shows the confirmation. Without this step bookings still happen but are not detected by the site.
4. **Prefill**: the booking pages pass the visitor's name, email, and mobile as `iclosedName`, `iclosedEmail`, `iclosedPhone` plus the UTM tags. Confirm those parameter names in the event's settings; if your account uses `iclosed_name`-style names instead, change the three names in `assets/lp.js` (`function iclosedUrl`).
5. **Webhook (optional, recommended)**: Settings → Developers → add a webhook for `call.booked`, `call.rescheduled`, `call.cancelled` pointing at the GoHighLevel inbound webhook URL, so the CRM also hears about reschedules and cancellations.

Calendly remains available as a fallback (`scheduler: "calendly"`, `calendlyUrl`).

### 5. Before driving traffic

- Set `ghlWebhookUrl` in `assets/config.js` so bookings and landing-page submissions reach the CRM.
- Add the Meta Pixel and LinkedIn IDs only when ads are running.
- Register the SMS sending number for 10DLC through your texting provider; the Privacy Policy already carries the consent, STOP/HELP, and no-sharing language that registration asks for.
- Have counsel read `privacy.html` and `terms.html` once. They are complete and have no placeholders, but a lawyer's review is still the right final step.
