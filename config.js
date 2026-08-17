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
  weddingDate: '2026-12-11T18:00:00',
  weddingDateLabel: '[11 December 2026]',

  venue: '[Venue]',
  city: '[City]',

  // Digits only, with country code and no "+" — e.g. '919876543210'.
  // Leave empty and the button opens WhatsApp's "choose a contact" screen.
  whatsappNumber: '',

  // Shown as "Call the family".
  phone: '+910000000000',

  /* The four celebrations, in order. `date` is the local start time and drives
     both the countdown-free timeline copy and the .ics calendar files.
     `game` is one of 'scratch' | 'trace' | 'dhol' | null (null = no reveal card). */
  events: [
    {
      id: 'haldi',
      title: 'Haldi',
      subtitle: 'Manjal Neerattu Vizha',
      date: '2026-12-08T18:00:00',
      dayLabel: 'Tuesday, 8 December 2026',
      timeLabel: '6:00 PM onwards',
      dressCode: null,
      quote: 'Turmeric, laughter and the very first blessings.',
      thumbLabel: 'Rub to reveal',
      cta: 'Rub off the turmeric',
      game: 'scratch',
      accent: '#E8A33D',
      tint: '#E8A33D',
      art: 'haldi',
    },
    {
      id: 'mehndi',
      title: 'Mehndi',
      subtitle: 'Where henna meets hearts',
      date: '2026-12-09T17:30:00',
      dayLabel: 'Wednesday, 9 December 2026',
      timeLabel: '5:30 PM onwards',
      dressCode: 'Pastel & floral',
      quote: 'The deeper the mehndi, the deeper the love.',
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
      subtitle: 'An evening of song',
      date: '2026-12-10T18:00:00',
      dayLabel: 'Thursday, 10 December 2026',
      timeLabel: '6:00 PM onwards',
      dressCode: null,
      quote: 'Music, dance and the whole family on its feet.',
      thumbLabel: 'Tap the dhol',
      cta: 'Tap the dhol to the beat',
      game: 'dhol',
      accent: '#B23A48',
      tint: '#C85A66',
      art: 'sangeet',
    },
    {
      id: 'wedding',
      title: 'The Wedding',
      subtitle: 'The Muhurtham',
      date: '2026-12-11T18:00:00',
      dayLabel: 'Friday, 11 December 2026',
      timeLabel: '6:00 PM onwards',
      dressCode: 'Traditional',
      quote: 'The sacred vows — with your blessings.',
      thumbLabel: null,
      cta: null,
      game: null,
      accent: '#8E2436',
      tint: '#D98A5E',
      art: 'wedding',
    },
  ],

  // How long each event blocks out in the calendar file, in hours.
  eventDurationHours: 4,

  // Toggles
  showPetals: true,
  showCountdown: true,
};
