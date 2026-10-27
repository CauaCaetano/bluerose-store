// ============================================================
//  LOCAL BUSINESS PAGE · edit this file only
//  Save, then refresh index.html in your browser.
// ============================================================
window.SITE = {
  // --- basics -------------------------------------------------
  business: 'Northside Auto Care',
  kind: 'Auto repair shop',                       // used in the page title and for Google
  headline: 'Honest repairs, done right the first time.',
  intro: 'Family-owned shop serving Northside since 2009. Free estimates, clear prices and a 12-month warranty on every repair.',
  logo: '',                                       // e.g. 'logo.png' next to index.html; '' shows initials
  heroImage: '',                                  // e.g. 'photos/shop.jpg'; '' shows a soft color panel

  // --- contact ------------------------------------------------
  phone: '+15555550100',                          // used for Call and Text buttons
  phoneDisplay: '',                               // how the number is shown; '' formats US numbers as (555) 555-0100
  showText: true,                                 // show a "Text us" button
  whatsapp: '',                                   // '+15555550100' to show a WhatsApp button
  email: 'hello@example.com',
  bookingLink: '',                                // e.g. your booking page or Calendly; '' hides "Book online"
  address: '480 Industrial Way, Springfield, IL 62701',
  mapsLink: 'https://maps.google.com/?q=480+Industrial+Way+Springfield+IL',

  // --- services (price is free text) --------------------------
  services: [
    { name: 'Oil change', price: 'from $49', text: 'Synthetic or conventional, filter and 21-point check included.' },
    { name: 'Brakes', price: 'from $129', text: 'Pads, rotors and fluid. We show you the old parts.' },
    { name: 'Diagnostics', price: '$89', text: 'Check-engine light, noises, electrical issues. Credited toward the repair.' },
    { name: 'A/C service', price: 'from $99', text: 'Leak test, recharge and cabin filter.' },
    { name: 'Tires', price: 'from $25', text: 'Mounting, balancing, rotation and flat repair.' },
    { name: 'State inspection', price: '$35', text: 'Same-day inspections, no appointment needed before 3 PM.' },
  ],

  // --- trust --------------------------------------------------
  highlights: ['12-month warranty', 'Free estimates', 'Same-day service', 'ASE-certified mechanics'],
  reviews: [],
  reviewsDemo: [
    { name: 'Maria G.', stars: 5, text: 'They found the real problem after two other shops guessed. Fair price and done the same day.' },
    { name: 'Tom R.', stars: 5, text: 'Explained everything with photos before touching the car. Will be back.' },
    { name: 'Alicia P.', stars: 5, text: 'Honest people. They told me a repair could wait instead of upselling me.' },
  ],
  gallery: [],                                    // e.g. ['photos/1.jpg', 'photos/2.jpg', 'photos/3.jpg']; [] hides the section

  // --- about --------------------------------------------------
  aboutTitle: 'About us',
  about: 'We started in a two-bay garage with one rule: treat every car like it belongs to our own family. Fifteen years later the rule hasn\'t changed. You get a clear estimate before any work, and we call you if anything changes.',

  // --- hours (free text per line) -----------------------------
  hours: [['Mon – Fri', '7:30 AM – 6:00 PM'], ['Saturday', '8:00 AM – 1:00 PM'], ['Sunday', 'Closed']],

  // --- questions ----------------------------------------------
  faq: [
    ['Do I need an appointment?', 'Not for oil changes, tires or inspections. For bigger repairs, call or text so we can order parts.'],
    ['Do you work on all makes?', 'Yes, domestic and imported cars, SUVs and light trucks.'],
    ['How do I pay?', 'Cards, cash and contactless. Financing available on repairs over $500.'],
  ],

  // --- look ---------------------------------------------------
  colors: { primary: '#1f3a5f', accent: '#e8a33d', background: '#ffffff', soft: '#eef2f7', text: '#16202c' },
  font: 'system',                                 // 'system' or a Google Font name, e.g. 'Inter', 'Poppins'
  locale: 'en',                                   // page language code, e.g. 'en', 'es', 'pt'

  // --- labels (translate freely) ------------------------------
  text: { call: 'Call now', textUs: 'Text us', whatsapp: 'WhatsApp', book: 'Book online', directions: 'Get directions', services: 'Services', reviews: 'What customers say', gallery: 'Our work', hours: 'Hours', faq: 'Questions', contact: 'Visit us', emailUs: 'Email us' },
};
