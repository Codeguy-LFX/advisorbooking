// Advisor Booking: owner-editable settings. This is the ONLY file to edit for numbers and IDs.
window.AB_CONFIG = {
  // Scheduling provider: "iclosed" (iClosed.io) or "calendly". The matching URL below must be filled in.
  scheduler: "iclosed",
  // iClosed: the event link from the event's inline embed code (the data-url value). The booking pages build iClosed's
  // inline widget from it, with the visitor's name, email and mobile added so they do not type them twice.
  iclosedUrl: "https://app.iclosed.io/e/advisorbooking/strategy-call",
  // iClosed: the 15-minute fit-check event for edge cases routed by /apply (/book?call=short). Empty = the main event above.
  iclosedUrlShort: "",
  // Funnel 5 (/fit5) books into its own iClosed event, with the extra fit questions as dropdowns. Paste its link here.
  // iclosedUrlShortFit5 is for Funnel 5's 15-minute fit checks; empty = iclosedUrlFit5. Both empty = the events above.
  iclosedUrlFit5: "https://app.iclosed.io/e/advisorbooking/advisor-booking-meeting",
  iclosedUrlShortFit5: "",
  // iClosed: set the event's confirmation page to this URL with forwarding on, so bookings are detected and reported.
  bookedUrl: "https://advisorbooking.com/booked",
  // Where the landers' email-first "Book intro call" sends people (relative to the site root). "fit5/" is the
  // qualifying form (Funnel 5) with the email prefilled; "fit/" is Funnel 4; "book.html" skips the form.
  landerNext: "fit5/",
  // Calendly (legacy): the 20-minute event URL, and whether book.html embeds it or links out to it.
  calendlyUrl: "",
  calendlyMode: "embed",
  // Shown beside the calendar on the booking pages.
  eventName: "Pipeline Audit",
  eventLength: "20 min",
  // GoHighLevel inbound webhook URL. Empty = submissions are not sent anywhere (they still route the visitor).
  ghlWebhookUrl: "",
  // Tracking. Empty = the tag is not loaded.
  // Google Tag Manager container for the funnel pages (/apply, /book, /booked...), e.g. "GTM-ABC1234". See assets/gtm.js for the events.
  gtmId: "",
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
