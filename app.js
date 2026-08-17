/* ==========================================================================
   Wedding E-Invite — page logic
   Reads everything from config.js (window.WEDDING).
   ========================================================================== */

(function () {
  'use strict';

  const W = window.WEDDING;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, '0');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- *
   * Guest state — kept in localStorage so a reload doesn't lose it
   * ---------------------------------------------------------------- */
  const KEY = 'wedding-invite-v1';
  const state = Object.assign(
    { name: '', team: null, cels: {}, guests: 1, unlocked: {} },
    load()
  );

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode */ }
  }

  /* ---------------------------------------------------------------- *
   * Text bindings — every [data-w="…"] slot in the markup
   * ---------------------------------------------------------------- */
  const SLOTS = {
    brideName: W.bride.name,
    groomName: W.groom.name,
    brideShort: W.bride.short,
    groomShort: W.groom.short,
    brideInitial: W.bride.initial,
    groomInitial: W.groom.initial,
    brideParents: W.bride.parents,
    groomParents: W.groom.parents,
    hashtag: W.hashtag,
    weddingDateLabel: W.weddingDateLabel,
    venue: W.venue,
    city: W.city,
  };
  $$('[data-w]').forEach((el) => {
    const v = SLOTS[el.dataset.w];
    if (v != null) el.textContent = v;
  });

  document.title = W.bride.short + ' & ' + W.groom.short + ' — Wedding Invitation';

  const place = W.venue + ', ' + W.city;

  /* ---------------------------------------------------------------- *
   * Petals
   * ---------------------------------------------------------------- */
  const PETAL_COLOURS = ['#E7A6AE', '#E8A33D', '#D98BA0'];
  const PETAL_COLOURS_DARK = ['#C96B7A', '#C98A3D'];

  function sowPetals() {
    if (!W.showPetals || reduceMotion) {
      $$('[data-petals]').forEach((n) => n.remove());
      return;
    }
    $$('[data-petals]').forEach((field) => {
      const dark = field.classList.contains('petals--dark');
      const count = dark ? 5 : 8;
      const drop = Math.max(360, field.parentElement.offsetHeight + 80);
      const palette = dark ? PETAL_COLOURS_DARK : PETAL_COLOURS;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        const size = 9 + Math.random() * 5;
        p.className = 'petal';
        p.style.left = (4 + (i * 92) / count + Math.random() * 6) + '%';
        p.style.width = size.toFixed(1) + 'px';
        p.style.height = (size * 1.16).toFixed(1) + 'px';
        p.style.background = palette[i % palette.length];
        p.style.animationDuration = (8 + Math.random() * 4).toFixed(1) + 's';
        p.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
        p.style.setProperty('--fall', drop + 'px');
        field.appendChild(p);
      }
    });
  }

  /* ---------------------------------------------------------------- *
   * Festivities timeline
   * ---------------------------------------------------------------- */
  function renderTimeline() {
    const host = $('[data-timeline]');
    host.innerHTML = '';

    W.events.forEach((ev, i) => {
      const row = document.createElement('div');
      row.className = 'event';
      row.style.setProperty('--accent', ev.accent);

      const dot = document.createElement('span');
      dot.className = 'event-dot';

      const main = document.createElement('div');
      main.className = 'event-main';
      main.innerHTML =
        '<p class="event-day"></p>' +
        '<h3 class="event-title"></h3>' +
        '<p class="event-sub"></p>' +
        '<p class="event-when"><b></b> · <span></span></p>' +
        (ev.dressCode ? '<p class="event-dress"></p>' : '') +
        '<p class="event-quote"></p>';

      $('.event-day', main).textContent = ev.dayLabel;
      $('.event-title', main).textContent = ev.title;
      $('.event-sub', main).textContent = ev.subtitle;
      $('.event-when b', main).textContent = ev.timeLabel;
      $('.event-when span', main).textContent = place;
      if (ev.dressCode) $('.event-dress', main).textContent = 'Dress code: ' + ev.dressCode;
      $('.event-quote', main).textContent = '“' + ev.quote + '”';

      const cal = document.createElement('button');
      cal.className = 'cal-btn';
      cal.type = 'button';
      cal.textContent = '+ Add to calendar';
      cal.addEventListener('click', () => {
        downloadIcs(ev);
        cal.classList.add('is-done');
        cal.textContent = '✓ Added to calendar';
        setTimeout(() => {
          cal.classList.remove('is-done');
          cal.textContent = '+ Add to calendar';
        }, 2600);
      });
      main.appendChild(cal);

      row.append(dot, main);

      if (ev.game) {
        const thumb = document.createElement('button');
        thumb.className = 'event-thumb';
        thumb.type = 'button';
        thumb.setAttribute('aria-label', ev.thumbLabel + ' — open the ' + ev.title + ' card');
        thumb.innerHTML =
          '<svg viewBox="0 0 120 120" aria-hidden="true"><use href="#art-' + ev.art + '"></use></svg>' +
          '<span class="event-thumb-label"></span>' +
          '<span class="event-thumb-lock" aria-hidden="true"></span>';
        $('.event-thumb-label', thumb).textContent = ev.thumbLabel;
        markThumb(thumb, ev);
        thumb.addEventListener('click', () => openModal(i));
        row.appendChild(thumb);
      }

      host.appendChild(row);
    });
  }

  function markThumb(thumb, ev) {
    const open = !!state.unlocked[ev.id];
    thumb.classList.toggle('is-unlocked', open);
    $('.event-thumb-lock', thumb).textContent = open ? '✓' : '';
  }

  function refreshThumbs() {
    $$('.event-thumb').forEach((thumb, n) => {
      const ev = W.events.filter((e) => e.game)[n];
      if (ev) markThumb(thumb, ev);
    });
  }

  /* ---------------------------------------------------------------- *
   * Calendar files (.ics)
   * ---------------------------------------------------------------- */
  // Event times are written as "floating" local time — 6pm at the venue stays
  // 6pm whichever timezone the guest's phone is in.
  function icsStamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  // DTSTAMP, by contrast, must be UTC (RFC 5545).
  function icsStampUtc(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function icsEscape(s) {
    return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  }

  function downloadIcs(ev) {
    const start = new Date(ev.date);
    const end = new Date(start.getTime() + W.eventDurationHours * 3600e3);
    const couple = W.bride.short + ' & ' + W.groom.short;
    const now = new Date();

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//wedding-e-invite//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + ev.id + '-' + start.getTime() + '@wedding-invite',
      'DTSTAMP:' + icsStampUtc(now),
      'DTSTART:' + icsStamp(start),
      'DTEND:' + icsStamp(end),
      'SUMMARY:' + icsEscape(ev.title + ' — ' + couple),
      'LOCATION:' + icsEscape(place),
      'DESCRIPTION:' + icsEscape(ev.subtitle + '. ' + ev.quote),
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ev.id + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------------------------------------------------------------- *
   * Pick your side
   * ---------------------------------------------------------------- */
  const teamMsg = $('[data-team-msg]');

  function paintSides() {
    $$('.side').forEach((b) => {
      b.setAttribute('aria-pressed', String(state.team === b.dataset.side));
    });
    teamMsg.textContent = state.team
      ? 'You’re cheering for Team ' +
        (state.team === 'bride' ? 'Bride — ' + W.bride.short + '!' : 'Groom — ' + W.groom.short + '!')
      : 'Tap a side to join the fun.';
  }

  $$('.side').forEach((b) => {
    b.addEventListener('click', () => {
      state.team = state.team === b.dataset.side ? null : b.dataset.side;
      save();
      paintSides();
      paintWhatsapp();
    });
  });

  /* ---------------------------------------------------------------- *
   * Countdown
   * ---------------------------------------------------------------- */
  function startCountdown() {
    const section = $('#countdown');
    if (!W.showCountdown) { section.remove(); return; }
    section.hidden = false;

    const target = new Date(W.weddingDate).getTime();
    const out = {
      days: $('[data-days]'), hours: $('[data-hours]'),
      mins: $('[data-mins]'), secs: $('[data-secs]'),
    };
    const note = $('[data-clock-note]');

    function tick() {
      let diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 864e5); diff -= days * 864e5;
      const hours = Math.floor(diff / 36e5); diff -= hours * 36e5;
      const mins = Math.floor(diff / 6e4); diff -= mins * 6e4;
      const secs = Math.floor(diff / 1e3);

      out.days.textContent = pad(days);
      out.hours.textContent = pad(hours);
      out.mins.textContent = pad(mins);
      out.secs.textContent = pad(secs);

      if (days + hours + mins + secs === 0) {
        note.hidden = false;
        clearInterval(timer);
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------- *
   * RSVP
   * ---------------------------------------------------------------- */
  const nameInput = $('[data-name]');
  const guestOut = $('[data-guest-count]');
  const waBtn = $('[data-whatsapp]');

  function renderChips() {
    const host = $('[data-chips]');
    host.innerHTML = '';
    W.events.forEach((ev) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = ev.title;
      chip.setAttribute('aria-pressed', String(!!state.cels[ev.title]));
      chip.addEventListener('click', () => {
        state.cels[ev.title] = !state.cels[ev.title];
        chip.setAttribute('aria-pressed', String(!!state.cels[ev.title]));
        save();
        paintWhatsapp();
      });
      host.appendChild(chip);
    });
  }

  nameInput.value = state.name || '';
  nameInput.addEventListener('input', () => {
    state.name = nameInput.value;
    save();
    paintWhatsapp();
  });

  $$('[data-guests]').forEach((b) => {
    b.addEventListener('click', () => {
      const delta = Number(b.dataset.guests);
      state.guests = Math.min(20, Math.max(1, state.guests + delta));
      save();
      paintGuests();
      paintWhatsapp();
    });
  });

  function paintGuests() {
    guestOut.textContent = state.guests;
    $('[data-guests="-1"]').disabled = state.guests <= 1;
    $('[data-guests="1"]').disabled = state.guests >= 20;
  }

  function paintWhatsapp() {
    const chosen = W.events.map((e) => e.title).filter((t) => state.cels[t]);
    const parts = [
      'Hi! RSVP from ' + (state.name.trim() || '[name]') + ' — ' + state.guests + ' guest(s).',
    ];
    if (chosen.length) parts.push('Attending: ' + chosen.join(', ') + '.');
    if (state.team) parts.push('Cheering for Team ' + (state.team === 'bride' ? 'Bride' : 'Groom') + '!');

    const num = String(W.whatsappNumber || '').replace(/[^0-9]/g, '');
    waBtn.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(parts.join(' '));
  }

  const tel = $('[data-tel]');
  tel.href = 'tel:' + String(W.phone || '').replace(/[^0-9+]/g, '');

  /* ---------------------------------------------------------------- *
   * Reveal modal + games
   * ---------------------------------------------------------------- */
  const backdrop = $('[data-backdrop]');
  const modal = $('[data-modal]');
  const card = $('[data-card]');
  const veil = $('[data-veil]');
  const veilStage = $('[data-veil-stage]');
  const veilHint = $('[data-veil-hint]');
  const skipBtn = $('[data-skip]');
  const closeBtn = $('[data-close]');
  const replayBtn = $('[data-replay]');

  let game = null;
  let current = null;
  let lastFocus = null;

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function openModal(index) {
    const ev = W.events[index];
    current = ev;
    lastFocus = document.activeElement;

    card.style.setProperty('--tint', ev.tint);
    $('[data-card-title]').textContent = ev.title;
    $('[data-card-time]').textContent = 'At ' + ev.timeLabel.replace(' onwards', '');
    $('[data-card-where]').textContent = fmtDate(ev.date) + ' · ' + place;
    $('[data-card-cta]').textContent = ev.cta || '';
    $('[data-card-art] use').setAttribute('href', '#art-' + ev.art);

    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    if (hasGame(ev) && !state.unlocked[ev.id]) {
      mountGame(ev);
    } else {
      teardownGame();
      veil.hidden = true;
      veil.classList.remove('is-clearing');
    }
    paintReplay(ev);

    closeBtn.focus();
  }

  function hasGame(ev) { return !!(ev && ev.game && window.Games[ev.game]); }

  function mountGame(ev) {
    teardownGame();
    veil.hidden = false;
    veil.classList.remove('is-clearing');
    game = window.Games[ev.game]({
      veil, stage: veilStage, hint: veilHint, event: ev, complete: unlock,
    });
  }

  // The replay link only makes sense once the card is already open — including
  // for guests who used "Skip & reveal" and never actually played.
  function paintReplay(ev) {
    replayBtn.hidden = !(hasGame(ev) && state.unlocked[ev.id]);
  }

  replayBtn.addEventListener('click', () => {
    // deliberately does NOT clear the unlock flag: abandoning a replay must
    // never take the ceremony details away again
    if (hasGame(current)) mountGame(current);
  });

  function unlock() {
    if (!current) return;
    state.unlocked[current.id] = true;
    save();
    refreshThumbs();

    // hold on to which event this fade belongs to — if the guest closes and
    // opens another card before it finishes, the stale timer must not tear
    // down the game that has just been mounted
    const fading = current;
    veil.classList.add('is-clearing');
    setTimeout(() => {
      if (current !== fading) return;
      veil.hidden = true;
      teardownGame();
      paintReplay(fading);
    }, reduceMotion ? 0 : 560);
  }

  function teardownGame() {
    if (game) { game.destroy(); game = null; }
    veilStage.innerHTML = '';
    veilHint.textContent = '';
  }

  function closeModal() {
    backdrop.hidden = true;
    document.body.style.overflow = '';
    teardownGame();
    veil.hidden = true;
    current = null;
    if (lastFocus) lastFocus.focus();
  }

  skipBtn.addEventListener('click', unlock);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) closeModal();
  });
  // keep focus inside the dialog while it is open
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = $$('button, [href], input', modal).filter((n) => !n.disabled && n.offsetParent);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------------------------------------------------------------- *
   * Scroll reveal
   * ---------------------------------------------------------------- */
  function watchReveals() {
    const targets = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------------------------------------------------------------- *
   * Go
   * ---------------------------------------------------------------- */
  renderTimeline();
  renderChips();
  paintSides();
  paintGuests();
  paintWhatsapp();
  startCountdown();
  watchReveals();
  sowPetals();
})();
