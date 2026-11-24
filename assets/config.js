// Advisor Booking: owner-editable settings. This is the ONLY file to edit for numbers and IDs.
window.AB_CONFIG = {
  // Scheduling provider: "iclosed" (iClosed.io) or "calendly". The matching URL below must be filled in.
  scheduler: "iclosed",
  // iClosed: the event link from the event's inline embed code (the data-url value). The booking pages build iClosed's
  // inline widget from it, with the visitor's name, email and mobile added so they do not type them twice.
  iclosedUrl: "https://app.iclosed.io/e/advisorbooking/strategy-call",
  // iClosed: a 15-minute event for /book?call=short. Empty = the main event above.
  iclosedUrlShort: "",
  // The /L1 funnel books into its own iClosed event ("Advisor Booking Meeting", with the extra fit questions).
  // iclosedUrlShortFit5 is for its edge-case leads; empty = iclosedUrlFit5. Both empty = the events above.
  iclosedUrlFit5: "https://app.iclosed.io/e/advisorbooking/advisor-booking-meeting",
  iclosedUrlShortFit5: "",
  // The paid landing pages. iclosedUrlDirect: the iClosed event the buttons of /ria-meetings-direct go to and the
  // calendar of /ria-meetings-embed shows. Empty = iclosedUrlFit5 above. playbookNext: where the email box of
  // /ria-playbook sends people. Empty = "/fit-check".
  iclosedUrlDirect: "",
  playbookNext: "",
  // iClosed: set the event's confirmation page to this URL with forwarding on, so bookings are detected and reported.
  bookedUrl: "https://advisorbooking.com/booked",
  // Where the landers' email-first box sends people (relative to the site root): "L1/" is the older qualifying form
  // with the email prefilled; "book.html" skips the form. A page with its own <body data-next> (the home page:
  // "fit-check", the quiz of the paid pages) goes there instead.
  landerNext: "L1/",
  // Calendly (legacy): the 20-minute event URL, and whether book.html embeds it or links out to it.
  calendlyUrl: "",
  calendlyMode: "embed",
  // Shown beside the calendar on the booking pages.
  eventName: "Pipeline Audit",
  eventLength: "20 min",
  // GoHighLevel inbound webhook URL (Workflow trigger "Inbound Webhook"). Gets one post when an /L1 lead finishes
  // the form (stage=complete) and one when they book (stage=booked). Empty = nothing is saved anywhere.
  // funnel_entry sent on every GHL post from the /L1 funnel (the home page email boxes, the form, and its bookings).
  // Must match a GHL Funnel_Entry dropdown option exactly. Bookings that did not come through /L1 send none.
  funnelEntry: "Quiz Funnel",
  ghlWebhookUrl: "https://services.leadconnectorhq.com/hooks/OlHSy0ie2GEU9CN03QfE/webhook-trigger/wxtAuWUMbK3oQ9rq2Ubz",
  // Tracking. Empty = the tag is not loaded. On /L1 both start only for qualified leads, after the contact screen.
  // Google Ads. googleTagId: the global Google tag, the Google Ads account ID. assets/gads.js loads it on every page
  // (not /contact, /about, /privacy, /terms, /booked).
  // googleAdsConversion: the send_to value of the "Submit lead form" event snippet. It is sent in ONE place: on
  // /qualified, for a qualified lead who submitted the quiz on /ria-meetings or /fit-check, once for each submission. Not-qualified
  // leads go to /not-a-fit and never send it. Either value empty = that part is off.
  googleTagId: "AW-18586476573",
  googleAdsConversion: "AW-18586476573/Xc55CKqVoLwdEJ3A3J5F",
  // Google Tag Manager container, e.g. "GTM-ABC1234" (events: see assets/gtm.js). Not needed for Google Ads above.
  gtmId: "",
  // Meta Pixel. ONE event on the whole site: "Lead", fired once for each qualified submission on the booking page a
  // qualified lead lands on: /qualified (the quiz at /fit-check and /ria-meetings) and /L1/Q/ (the older form /L1/).
  // No PageView, nothing on /not-a-fit, /L1/DQ/ or any other page. metaPixelLeadId is read only by those two pages.
  metaPixelLeadId: "1446221323631843",
  // Legacy site-wide pixel (PageView on every page). Leave empty so Meta only ever sees the Lead event above.
  metaPixelId: "",
  // LinkedIn Insight Tag (assets/li.js): loaded only on /vg and its sitelink copies, /fit-check and /qualified.
  linkedinPartnerId: "10161178",
  // The ONE LinkedIn conversion, a qualified lead: sent by assets/li.js on /qualified, on the same condition as the
  // Google Ads conversion. Nothing on /not-a-fit or any booking page.
  linkedinQualifiedConversionId: "32508642",
  // Old booking-based LinkedIn conversion. No longer read by any page. Leave empty.
  linkedinConversionId: "",
  // Hand-updated counters shown on the site.
  pilotSeatsTotal: 5,
  pilotSeatsRemaining: 5,
  pilotFirmsSigned: 0,
  firstCaseStudyMonth: "Q1 2027",
  countersAsOf: "2026-10-18",
  announceEnabled: true,
  // Contact
  email: "info@advisorbooking.com",
  entity: "De Jesus Ventures LLC",
  city: "Boca Raton, FL",
  phone: ""
};
