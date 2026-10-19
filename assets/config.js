// Advisor Booking: owner-editable settings. This is the ONLY file to edit for numbers and IDs.
window.AB_CONFIG = {
  // Scheduling provider: "iclosed" (iClosed.io) or "calendly". The matching URL below must be filled in.
  scheduler: "calendly",
  // iClosed: the event's scheduler link (AI Scheduler -> Events -> the event -> Embed). Visitors book inside it.
  iclosedUrl: "",
  // iClosed: set the event's confirmation page to this URL with forwarding on, so bookings are detected and reported.
  bookedUrl: "https://advisorbooking.com/booked",
  // Calendly (legacy): the 20-minute event URL, and whether book.html embeds it or links out to it.
  calendlyUrl: "https://calendly.com/meridianleads/pipeline-audit",
  calendlyMode: "embed",
  // Shown beside the calendar on the booking pages.
  eventName: "Pipeline Audit",
  eventLength: "20 min",
  // GoHighLevel inbound webhook URL. Empty = submissions are not sent anywhere (they still route the visitor).
  ghlWebhookUrl: "",
  // Tracking. Empty = the tag is not loaded.
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
