/* ==========================================================================
   THE ONLY FILE YOU NEED TO EDIT.
   Everything in [brackets] below is a placeholder — replace it with the real
   details. Every screen, the countdown, the WhatsApp message and the calendar
   files all read from here.
   ========================================================================== */

/* The 26th's functions (Haldi, Mehendi, Sangeet) are NOT at the wedding hall.
   Set the venue here once and all three pick it up. Until `map` is filled in
   they render as plain text with no directions link, rather than sending
   guests to the wedding hall by mistake. */
const DAY_ONE_VENUE = {
  name: 'Udaya Resort',
  map: 'https://maps.app.goo.gl/PEdy7KchtdPQugru6',
};

window.WEDDING = {
  bride: {
    name: 'Rithika Sunil Nair',
    short: 'Rithika',
    initial: 'R',
    parents: 'D/o Mr. Sunil & Mrs. Pravita Nair',
  },
  groom: {
    name: 'Rushil Deshwal',
    short: 'Rushil',
    initial: 'R',
    parents: 'S/o Dr. Rajesh & Dr. Kusum Deshwal',
  },

  hashtag: 'R&R',

  // Countdown target + the date shown on the invitation. Local time, 24h clock.
  // Points at the Mangalya Sutra, which is the ceremony that actually ties the knot.
  weddingDate: '2026-12-28T06:00:00',
  weddingDateLabel: '28 December 2026',

  // Default venue. An event can override it with its own `venue` (the temple
  // does). `mapUrl` turns the venue into a directions link wherever it appears;
  // an event can override that too.
  venue: 'Prasannalakshmi Kalyana Mandapam & Auditorium',
  venueShort: 'Prasannalakshmi Kalyana Mandapam',
  city: 'Palakkad',
  mapUrl: 'https://maps.app.goo.gl/44ULdVCSmp6FC4zDA',

  /* Where RSVPs are saved. Paste the /exec URL of the Apps Script web app
     deployed from rsvp-sheet.gs (see the README). While this is empty the
     WhatsApp button stays the primary action, so the page never breaks. */
  rsvpEndpoint: 'https://script.google.com/macros/s/AKfycbytkApSKmCVIxySgxok_z7Vpj-g3jEyfHIDbf65dH6UlL1T8de-Orx14U6WfJE6YxWGpQ/exec',

  /* Deliberately empty: with no number set, the WhatsApp button opens the
     contact picker, so each guest sends their RSVP to whoever they actually
     know — the bride's family, the groom's father, a friend of the groom.
     Set it (digits only, country code, no "+") only if you would rather every
     RSVP landed in one chat. */
  whatsappNumber: '',

  /* "Prefer to call?" — list as many people as you like and the guest picks.
     While this is empty the line is hidden altogether, which is better than
     offering a number that dials nowhere. */
  contacts: [
    // { label: 'Bride’s family', phone: '+91XXXXXXXXXX' },
    // { label: 'Groom’s family', phone: '+91XXXXXXXXXX' },
  ],

  /* The celebrations, in order. `date` is the local start time and drives the
     countdown, the timeline and the .ics calendar files.

     Optional per-event fields:
       venue          overrides the default venue above
       note           a plain practical line (logistics, not poetry)
       dressCode      shown as "Dress code: …"
       durationHours  overrides eventDurationHours for the calendar file
       dayLabel       overrides the weekday/date line, which is otherwise
                      derived from `date` so the two can never disagree

     `game` is one of 'thaal' | 'scratch' | 'trace' | 'dhol' | 'knots' | 'akshata'
     | null (null = no game,
     the card opens straight away).

     NOTE: every time in [brackets] is a guess from "morning" / "evening" /
     "early morning" and needs confirming. The bracketed labels are what the
     guest sees, so they stay obviously provisional until you set them. */
  events: [
    {
      id: 'bhaat',
      title: 'Bhaat',
      subtitle: 'Mayra · the mama’s welcome',
      date: '2026-12-26T09:30:00',
      timeLabel: '9:30 AM onwards',
      // its own venue — not the resort the rest of the 26th is at
      venue: 'Riverscapes by Noorjehan',
      mapUrl: 'https://maps.app.goo.gl/P4KH13UhaWHwoKDCA',
      quote: 'A brother arrives, arms full, love fuller.',
      thumbLabel: 'Fill the thaal',
      cta: 'Fill the thaal',
      game: 'thaal',
      accent: '#C0623F',
      tint: '#C97A4E',
      art: 'thaal',
    },
    {
      id: 'haldi',
      venue: DAY_ONE_VENUE.name,
      mapUrl: DAY_ONE_VENUE.map,
      title: 'Haldi',
      subtitle: 'Manjal Neerattu Vizha',
      date: '2026-12-26T10:30:00',
      timeLabel: '10:30 AM onwards',
      quote: 'Turmeric, laughter and the very first blessings.',
      thumbLabel: 'Rub to reveal',
      cta: 'Rub off the turmeric',
      game: 'scratch',
      accent: '#E8A33D',
      tint: '#E8A33D',
      art: 'haldi',
    },
    {
      id: 'mehendi',
      venue: DAY_ONE_VENUE.name,
      mapUrl: DAY_ONE_VENUE.map,
      title: 'Mehendi',
      subtitle: 'Where henna meets hearts',
      date: '2026-12-26T10:30:00',
      timeLabel: '10:30 AM onwards',
      quote: 'The deeper the mehendi, the deeper the love.',
      thumbLabel: 'Trace the henna',
      cta: 'Trace the henna',
      game: 'trace',
      accent: '#6E7B3C',
      tint: '#8FA24E',
      art: 'mehndi',
    },
    {
      id: 'sangeet',
      venue: DAY_ONE_VENUE.name,
      mapUrl: DAY_ONE_VENUE.map,
      title: 'Sangeet',
      subtitle: 'An evening of song',
      date: '2026-12-26T17:30:00',
      timeLabel: '5:30 PM – 10:00 PM',
      durationHours: 4.5,
      quote: 'Music, dance and the whole family on its feet.',
      thumbLabel: 'Tap the dhol',
      cta: 'Tap the dhol to the beat',
      game: 'dhol',
      accent: '#B23A48',
      tint: '#C85A66',
      art: 'sangeet',
    },
    {
      id: 'mangalyasutra',
      title: 'Mangalya Sutra',
      subtitle: 'The sacred thread, at the temple',
      date: '2026-12-28T06:00:00',
      timeLabel: 'Early morning, [6:00 AM]',
      venue: '[Temple Name]',
      mapUrl: null,          // ← add the temple's Google Maps link here
      durationHours: 2,
      quote: 'The knot that binds two families.',
      thumbLabel: 'Tie the knots',
      cta: 'Tie the three knots',
      game: 'knots',
      accent: '#BE9034',
      tint: '#D9B15C',
      art: 'temple',
    },
    {
      id: 'wedding',
      title: 'The Wedding',
      subtitle: 'The Muhurtham',
      date: '2026-12-28T11:00:00',
      timeLabel: '[11:00 AM] onwards',
      dressCode: 'Traditional',
      note: 'After the temple ceremony everyone returns to their rooms to get ready.',
      quote: 'The sacred vows — with your blessings.',
      thumbLabel: 'Shower akshata',
      cta: 'Shower the akshata',
      game: 'akshata',
      accent: '#8E2436',
      tint: '#D98A5E',
      art: 'wedding',
    },
  ],

  // Default block of time each event takes in the calendar file, in hours.
  eventDurationHours: 4,

  // Toggles
  showPetals: true,
  showCountdown: true,
};
