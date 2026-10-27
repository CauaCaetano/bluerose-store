// ============================================================
//  BOOKING PAGE · edit this file only
//  Open index.html in your browser after saving to see changes.
// ============================================================
window.BOOKING = {
  // --- your business -----------------------------------------
  business: 'Bright Paws Grooming',
  tagline: 'Book your visit in under a minute',
  address: '120 Main Street, Springfield',
  logo: '',                        // e.g. 'logo.png' (put the file next to index.html). Leave '' for initials.

  // --- where each request goes -------------------------------
  //  'email'    → opens the client's email app with the request filled in, addressed to `email`
  //  'sms'      → opens the client's text messages addressed to `phone`
  //  'whatsapp' → opens WhatsApp addressed to `phone`
  //  'form'     → sends silently to a form service (Formspree, Basin, Getform...) at `formEndpoint`
  sendTo: 'email',
  email: 'bookings@example.com',
  phone: '+15555550100',           // with country code, digits only after the +
  formEndpoint: '',                // e.g. 'https://formspree.io/f/yourcode' (only for sendTo: 'form')

  // --- what clients can book ---------------------------------
  services: [
    { name: 'Bath & brush', minutes: 60, price: '$45' },
    { name: 'Full groom', minutes: 90, price: '$75' },
    { name: 'Nail trim', minutes: 15, price: '$15' },
    { name: 'Puppy first groom', minutes: 60, price: '$40' },
  ],

  // --- when ---------------------------------------------------
  // [open, close] in 24h time, or null when closed
  hours: { mon: ['09:00', '18:00'], tue: ['09:00', '18:00'], wed: ['09:00', '18:00'], thu: ['09:00', '18:00'], fri: ['09:00', '18:00'], sat: ['09:00', '13:00'], sun: null },
  slotMinutes: 30,                 // spacing between start times
  daysAhead: 21,                   // how far ahead clients can book
  minNoticeHours: 2,               // no bookings sooner than this
  closedDates: ['2026-12-25', '2027-01-01'],   // holidays (YYYY-MM-DD)
  timeFormat: '12h',               // '12h' (2:30 PM) or '24h' (14:30)
  locale: 'en-US',                 // language for day and month names, e.g. 'en-GB', 'es', 'fr', 'de'

  // --- extra fields -------------------------------------------
  askFor: { email: true, notes: true, extraLabel: "Pet's name", extraRequired: true }, // extraLabel: '' to hide

  // --- look ---------------------------------------------------
  colors: { primary: '#214e45', soft: '#dfeae2', background: '#f6f3ea', text: '#1d2b27' },
  font: 'system',                  // 'system' or any Google Font name, e.g. 'Poppins'

  // --- texts (translate freely) ------------------------------
  text: {
    step1: 'What would you like to book?', step2: 'Pick a day', step3: 'Pick a time', step4: 'Your details',
    name: 'Your name', phoneLabel: 'Mobile number', emailLabel: 'Email', notes: 'Anything we should know? (optional)',
    button: 'Request this time', noTimes: 'No times left this day. Please pick another one.',
    sent: 'Request sent!', sentNote: 'We will confirm your appointment shortly.', footer: 'Your time is reserved once we confirm it.',
  },
};
