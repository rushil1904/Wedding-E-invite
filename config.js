/* ==========================================================================
   THE ONLY FILE YOU NEED TO EDIT.
   Everything in [brackets] below is a placeholder — replace it with the real
   details. Every screen, the countdown, the WhatsApp message and the calendar
   files all read from here.
   ========================================================================== */

window.WEDDING = {
  bride: {
    name: 'Rithika Sunil Nair',
    short: 'Rithika',
    initial: 'R',
    parents: "D/o [Bride's Parents]",
  },
  groom: {
    name: 'Rushil Deshwal',
    short: 'Rushil',
    initial: 'R',
    parents: 'S/o [Groom’s Parents]',
  },

  hashtag: '[COUPLEHASHTAG]',

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

  // Digits only, with country code and no "+" — e.g. '919876543210'.
  // Leave empty and the button opens WhatsApp's "choose a contact" screen.
  whatsappNumber: '',

  // Shown as "Call the family".
  phone: '+910000000000',

  /* The celebrations, in order. `date` is the local start time and drives the
     countdown, the timeline and the .ics calendar files.

     Optional per-event fields:
       venue          overrides the default venue above
       note           a plain practical line (logistics, not poetry)
       dressCode      shown as "Dress code: …"
       durationHours  overrides eventDurationHours for the calendar file
       dayLabel       overrides the weekday/date line, which is otherwise
                      derived from `date` so the two can never disagree

     `game` is one of 'scratch' | 'trace' | 'dhol' | null (null = no game,
     the card opens straight away).

     NOTE: every time in [brackets] is a guess from "morning" / "evening" /
     "early morning" and needs confirming. The bracketed labels are what the
     guest sees, so they stay obviously provisional until you set them. */
  events: [
    {
      id: 'haldi',
      title: 'Haldi',
      subtitle: 'Manjal Neerattu Vizha',
      date: '2026-12-26T10:00:00',
      timeLabel: '[10:00 AM] onwards',
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
      title: 'Mehendi',
      subtitle: 'Where henna meets hearts',
      date: '2026-12-26T16:00:00',
      timeLabel: '[4:00 PM] onwards',
      dressCode: 'Pastel & floral',
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
      title: 'Sangeet',
      subtitle: 'An evening of song, following the Mehendi',
      date: '2026-12-26T19:00:00',
      timeLabel: '[7:00 PM] onwards',
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
      thumbLabel: 'View card',
      cta: null,
      game: null,
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
      thumbLabel: 'View card',
      cta: null,
      game: null,
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
