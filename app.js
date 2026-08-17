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

  // An event can sit somewhere other than the default venue — the temple
  // ceremony and the wedding hall are different places on the same day.
  function placeOf(ev) { return (ev && ev.venue ? ev.venue : W.venue) + ', ' + W.city; }

  // null on an event means "no map for this one"; undefined means "inherit"
  function mapOf(ev) {
    if (ev && Object.prototype.hasOwnProperty.call(ev, 'mapUrl')) return ev.mapUrl;
    return W.mapUrl || null;
  }

  /* Renders the venue, as a directions link when there is a map for it.
     `short` uses venueShort where the full hall name would swamp the line —
     the timeline repeats the venue on every event, so it earns the shorter
     form; the roomier modal card keeps the full name. */
  function fillPlace(el, ev, short) {
    const name = short && !((ev && ev.venue)) && W.venueShort
      ? W.venueShort
      : (ev && ev.venue ? ev.venue : W.venue);
    const text = name + ', ' + W.city;
    const url = mapOf(ev);

    el.textContent = '';
    if (!url) { el.textContent = text; return; }

    const a = document.createElement('a');
    a.className = 'map-link';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Open in Google Maps';
    a.textContent = text;

    // nbsp keeps the arrow welded to the last word instead of orphaning it
    const pin = document.createElement('span');
    pin.className = 'map-pin';
    pin.setAttribute('aria-hidden', 'true');
    pin.textContent = '\u00A0↗';
    a.appendChild(pin);

    el.appendChild(a);
  }

  /* The invitation's "Where" cell is a narrow column, so it uses venueShort
     when the full hall name is too long to sit in it. */
  (function fillInvitationWhere() {
    const el = $('[data-where]');
    if (!el) return;
    const name = W.venueShort || W.venue;
    if (!W.mapUrl) {
      el.append(name + ',', document.createElement('br'), W.city);
      return;
    }
    const a = document.createElement('a');
    a.className = 'map-link';
    a.href = W.mapUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Open in Google Maps';
    const pin = document.createElement('span');
    pin.className = 'map-pin';
    pin.setAttribute('aria-hidden', 'true');
    pin.textContent = '\u00A0↗';
    a.append(name + ',', document.createElement('br'), W.city, pin);
    el.append(a);
  })();

  // Derived from `date`, so the weekday can never contradict the date itself.
  function dayLabelOf(ev) {
    if (ev.dayLabel) return ev.dayLabel;
    return new Date(ev.date).toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  const COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

  // "Two days of celebration" — counted from the schedule rather than hard-coded,
  // so adding or dropping a function keeps the heading honest.
  function paintDaysHeading() {
    const el = $('[data-days-label]');
    if (!el) return;
    const days = new Set(W.events.map((e) => new Date(e.date).toDateString())).size;
    const word = COUNT_WORDS[days] || days;
    el.textContent = word + ' day' + (days === 1 ? '' : 's') + ' of celebration';
  }

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
      row.className = 'event reveal-item';
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
        (ev.note ? '<p class="event-note"></p>' : '') +
        '<p class="event-quote"></p>';

      $('.event-day', main).textContent = dayLabelOf(ev);
      $('.event-title', main).textContent = ev.title;
      $('.event-sub', main).textContent = ev.subtitle;
      $('.event-when b', main).textContent = ev.timeLabel;
      fillPlace($('.event-when span', main), ev, true);
      if (ev.dressCode) $('.event-dress', main).textContent = 'Dress code: ' + ev.dressCode;
      if (ev.note) $('.event-note', main).textContent = ev.note;
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

      // a thumbnail is driven by having a label, not by having a game — the
      // ceremony-only events open their card straight away
      if (ev.thumbLabel) {
        const thumb = document.createElement('button');
        thumb.className = 'event-thumb';
        thumb.type = 'button';
        thumb.dataset.eventId = ev.id;
        thumb.setAttribute('aria-label', ev.game
          ? ev.thumbLabel + ' — open the ' + ev.title + ' card'
          : 'Open the ' + ev.title + ' card');
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
    // the tick means "you got past the game", so it only applies where there is one
    const open = !!(ev.game && state.unlocked[ev.id]);
    thumb.classList.toggle('is-unlocked', open);
    $('.event-thumb-lock', thumb).textContent = open ? '✓' : '';
  }

  function refreshThumbs() {
    $$('.event-thumb').forEach((thumb) => {
      const ev = W.events.find((e) => e.id === thumb.dataset.eventId);
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
    const hours = ev.durationHours || W.eventDurationHours;
    const end = new Date(start.getTime() + hours * 3600e3);
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
      'LOCATION:' + icsEscape(placeOf(ev)),
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
   * Saving the RSVP to the sheet
   * ---------------------------------------------------------------- */
  const submitBtn = $('[data-submit]');
  const statusEl = $('[data-status]');
  const hpEl = $('[data-hp]');
  const ENDPOINT = String(W.rsvpEndpoint || '').trim();

  function setStatus(kind, text) {
    statusEl.hidden = !text;
    statusEl.textContent = text || '';
    statusEl.className = 'rsvp-status' + (kind ? ' is-' + kind : '');
  }

  // stable per browser, so an updated RSVP replaces its row instead of
  // adding a second one under the same name
  function rsvpId() {
    if (!state.rsvpId) {
      state.rsvpId = 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      save();
    }
    return state.rsvpId;
  }

  function payload() {
    return {
      id: rsvpId(),
      name: state.name.trim(),
      guests: state.guests,
      celebrations: W.events.map((e) => e.title).filter((t) => state.cels[t]),
      team: state.team || '',
      hp: hpEl ? hpEl.value : '',
      submittedAt: new Date().toISOString(),
    };
  }

  const againBtn = $('[data-again]');

  function paintSubmitted() {
    if (!ENDPOINT) return;
    submitBtn.textContent = state.sent ? 'Update my RSVP' : 'Send RSVP';
    againBtn.hidden = !state.sent;
    if (state.sent && !statusEl.textContent) {
      setStatus('ok', 'Your RSVP is with us — thank you.');
    }
  }

  /* One phone gets passed around a family. Without this, the second person's
     RSVP would overwrite the first, because the submission id is per browser
     and the sheet updates the row it matches. */
  againBtn.addEventListener('click', () => {
    state.rsvpId = null;
    state.sent = false;
    state.name = '';
    state.cels = {};
    state.guests = 1;
    state.team = null;
    save();

    nameInput.value = '';
    renderChips();
    paintSides();
    paintGuests();
    paintWhatsapp();
    setStatus('', '');
    paintSubmitted();
    nameInput.focus();
  });

  async function sendRsvp() {
    if (!state.name.trim()) {
      setStatus('error', 'Please add your name first.');
      nameInput.focus();
      return;
    }
    if (hpEl && hpEl.value) return;   // a bot filled the trap

    submitBtn.disabled = true;
    setStatus('busy', 'Sending…');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        // text/plain avoids the CORS preflight, which an Apps Script web app
        // cannot answer; the script reads the raw body itself
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload()),
        signal: ctrl.signal,
      });

      /* fetch only rejects on network failure, so a mistyped endpoint would
         come back 404 and still look like success. Check the status, and the
         script's own {ok:false} for a payload it refused. */
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let body = null;
      try { body = await res.json(); } catch (_) { /* non-JSON: treat as sent */ }
      if (body && body.ok === false) throw new Error(body.error || 'rejected');

      state.sent = true;
      save();
      setStatus('ok', 'Thank you — your RSVP is with us.');
      paintSubmitted();
    } catch (_) {
      /* The row may well have been written and only the reply lost. Sending
         again is safe: the sheet matches on id and overwrites. */
      setStatus('error', 'Could not send just now — please try again, or use WhatsApp below.');
      waBtn.classList.remove('wa-btn--secondary');
    } finally {
      clearTimeout(timer);
      submitBtn.disabled = false;
    }
  }

  function initRsvpMode() {
    if (!ENDPOINT) return;          // no endpoint yet: WhatsApp stays primary
    submitBtn.hidden = false;
    waBtn.classList.add('wa-btn--secondary');
    waBtn.innerHTML = 'or send it on WhatsApp instead';
    submitBtn.addEventListener('click', sendRsvp);
    paintSubmitted();
  }

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
    // "At 6:00 PM", but not "At Early morning, 6:00 AM" — only prefix a label
    // that actually starts with a clock time
    const time = ev.timeLabel.replace(' onwards', '');
    $('[data-card-time]').textContent = (/^[[\d]/.test(time) ? 'At ' : '') + time;
    const where = $('[data-card-where]');
    where.textContent = fmtDate(ev.date) + ' · ';
    const tail = document.createElement('span');
    fillPlace(tail, ev);
    where.appendChild(tail);
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
    // "Play again" lives on the card underneath — scratching the veil away
    // would otherwise expose it right on top of the skip link
    replayBtn.hidden = true;
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
  const STAGGER_MS = 90;
  const STAGGER_CAP = 8; // past this the tail feels laggy rather than choreographed

  function markIn(section) {
    $$('.reveal-item', section).forEach((el, n) => {
      el.style.transitionDelay = (Math.min(n, STAGGER_CAP) * STAGGER_MS) + 'ms';
    });
    section.classList.add('is-in');
  }

  function watchReveals() {
    const targets = $$('.reveal');

    // JS is running, so it is now safe to let CSS hide things pre-reveal
    document.documentElement.classList.add('js-reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(markIn);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        markIn(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -14% 0px' });

    targets.forEach((t) => io.observe(t));

    /* Safety net. Opening a deep link like /#invitation lands the guest
       mid-page, and if the observer's first delivery is missed there, that
       section stays blank forever. One timed sweep reveals anything already
       on screen; sections further down still animate on scroll as normal. */
    setTimeout(() => {
      const h = window.innerHeight;
      targets.forEach((t) => {
        if (t.classList.contains('is-in')) return;
        const r = t.getBoundingClientRect();
        if (r.top < h && r.bottom > 0) { markIn(t); io.unobserve(t); }
      });
    }, 1200);
  }

  /* ---------------------------------------------------------------- *
   * Go
   * ---------------------------------------------------------------- */
  paintDaysHeading();
  renderTimeline();
  renderChips();
  paintSides();
  paintGuests();
  paintWhatsapp();
  initRsvpMode();
  startCountdown();
  watchReveals();
  sowPetals();
})();
