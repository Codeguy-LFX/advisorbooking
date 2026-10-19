# AdvisorBooked.com

Static marketing site for Advisor Booked (De Jesus Ventures LLC). No build step — plain HTML, CSS, and JS, served from the repository root by GitHub Pages.

## Pages

- `index.html` — one-page home
- `book.html` — booking page (Calendly inline embed)
- `privacy.html`, `terms.html` — legal (drafts pending counsel review)
- `404.html` — not-found page

## Editing the site

All numbers, IDs, and contact details live in **`assets/config.js`** — it is the only file to edit for:

- Calendly URL and mode (`embed` shows the calendar inline on book.html)
- GoHighLevel inbound webhook URL (empty = bookings are not posted to the CRM)
- Meta Pixel / LinkedIn tag IDs (empty = tags are not loaded)
- Pilot seat counters and "as of" date
- Contact email / phone

## Hosting

Deployed free on GitHub Pages from the `main` branch root. The `CNAME` file pins the custom domain `advisorbooked.com`.

### Connecting the domain

At the DNS provider for advisorbooked.com:

1. Apex (`advisorbooked.com`) — four **A records**:
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153
2. `www` — **CNAME record** pointing to `codeguy-lfx.github.io`
3. In the repo: Settings → Pages → Custom domain should read `advisorbooked.com`; tick **Enforce HTTPS** once the certificate is issued (can take up to an hour after DNS propagates).
