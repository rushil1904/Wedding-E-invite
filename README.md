# Wedding E-Invite

A mobile-first, single-page interactive Indian wedding invitation. Static site —
no build step, no backend, no dependencies. Built from the design mockup
`Wedding E-Invite.dc.html` and its build spec.

```
index.html    markup + inline SVG artwork (garland, ceremony illustrations)
styles.css    all styling and design tokens
config.js     ← the only file you need to edit
app.js        page logic: bindings, timeline, countdown, RSVP, modal
games.js      the three ceremony mini-games
netlify.toml  deploy config
```

## Making it yours

Everything in `[brackets]` lives in **`config.js`** — names, parents, dates,
venue, hashtag, phone numbers, the four events. Nothing else needs touching.

The two you must not forget:

| Field | What it does |
|---|---|
| `whatsappNumber` | Digits only, with country code, no `+` (e.g. `919876543210`). Left empty, the RSVP button opens WhatsApp's contact picker instead of the family's chat. |
| `weddingDate` | Drives the countdown. Local time, `YYYY-MM-DDTHH:MM:SS`. |

`weddingDateLabel` is the human-readable date shown on the invitation, kept
separate so you can write it however you like ("11 December 2026", "11.12.26").

## Sections

Cover → Invitation → The Festivities → Pick your side → Countdown → RSVP →
Blessing footer, plus a reveal modal.

- **Countdown** ticks every second to `weddingDate` and clamps at zero.
- **Pick your side** is single-select; tapping the active side clears it.
- **RSVP** collects name, celebrations and guest count (1–20) and builds a
  `https://wa.me/…` deep link. Guest input is remembered in `localStorage`.
- **+ Add to calendar** on each event downloads an `.ics` file.

## The mini-games

The first three ceremonies open a card that is hidden behind a game. Winning
fades the cover away and reveals the ceremony card underneath; unlocked cards
get a ✓ on their thumbnail and stay unlocked. Every game has a
**Skip & reveal** link, so nobody is ever locked out of the details.

| Ceremony | Game |
|---|---|
| Haldi | Rub the turmeric off a canvas scratch layer (reveals at 60% cleared) |
| Mehndi | Trace the henna vine with your finger — the path fills as you go |
| Sangeet | Tap the dhol eight times to the beat, with a WebAudio drum hit |

To turn one off, set that event's `game` to `null` in `config.js` — the
thumbnail disappears and the card opens directly.

## Artwork

The garland strip, the four ceremony illustrations and the seal are inline SVG
in `index.html` (`<symbol id="art-haldi">` and friends) — no image files, so the
page stays fast and crisp at any density. To swap in real illustrations,
replace the contents of each `<symbol>`, or point the `<use href>` at an
`<img>`-based markup instead.

## Running it

Any static server:

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

## Deploying

Netlify, publish directory `.`, no build command (`netlify.toml` sets this).
Drag-and-drop the folder onto Netlify or connect the repo. Any static host
works — GitHub Pages, Cloudflare Pages, Vercel.

## Notes

- Designed at 430px; scales down to 320px phones and centers on desktop.
- Respects `prefers-reduced-motion` — petals, the seal glow and scroll reveals
  all stand down.
- Keyboard accessible: the modal traps focus and closes on `Esc`.
