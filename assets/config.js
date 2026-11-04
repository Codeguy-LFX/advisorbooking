// Advisor Booking: owner-editable settings. This is the ONLY file to edit for numbers and IDs.
window.AB_CONFIG = {
  // Scheduling provider: "iclosed" (iClosed.io) or "calendly". The matching URL below must be filled in.
  scheduler: "iclosed",
  // iClosed: the event link from the event's inline embed code (the data-url value). The booking pages build iClosed's
  // inline widget from it, with the visitor's name, email and mobile added so they do not type them twice.
  iclosedUrl: "https://app.iclosed.io/e/advisorbooking/strategy-call",
  // iClosed: set the event's confirmation page to this URL with forwarding on, so bookings are detected and reported.
  bookedUrl: "https://advisorbooking.com/booked",
  // Calendly (legacy): the 20-minute event URL, and whether book.html embeds it or links out to it.
  calendlyUrl: "",
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
