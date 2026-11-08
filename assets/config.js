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
  // iClosed: set the event's confirmation page to this URL with forwarding on, so bookings are detected and reported.
  bookedUrl: "https://advisorbooking.com/booked",
  // Where the landers' email-first "Book intro call" sends people (relative to the site root): "L1/" is the
  // qualifying form with the email prefilled; "book.html" skips the form.
  landerNext: "L1/",
  // Calendly (legacy): the 20-minute event URL, and whether book.html embeds it or links out to it.
  calendlyUrl: "",
  calendlyMode: "embed",
  // Shown beside the calendar on the booking pages.
  eventName: "Pipeline Audit",
  eventLength: "20 min",
  // GoHighLevel inbound webhook URL (Workflow trigger "Inbound Webhook"). Gets one post when an /L1 lead finishes
  // the form (stage=complete) and one when they book (stage=booked). Empty = nothing is saved anywhere.
  ghlWebhookUrl: "https://services.leadconnectorhq.com/hooks/gk6KvBgga36JSqc48jhA/webhook-trigger/aa71cc07-560d-4c08-9236-9d13bd7b1c73",
  // Tracking. Empty = the tag is not loaded. On /L1 both start only for qualified leads, after the contact screen.
  // Google Tag Manager container, e.g. "GTM-ABC1234" (events: see assets/gtm.js).
  gtmId: "",
  // Meta Pixel ID (numbers only). /L1 fires Lead (qualified leads only); /booked fires Schedule.
  metaPixelId: "",
  linkedinPartnerId: "",
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
