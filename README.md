# Wedding E-Invite

A mobile-first, single-page interactive Indian wedding invitation. Static site —
no build step, no backend, no dependencies. Built from the design mockup
`Wedding E-Invite.dc.html` and its build spec. Deployed on Railway.

```
index.html    markup + inline SVG artwork (garland, ceremony illustrations)
styles.css    all styling and design tokens
config.js     ← the only file you need to edit
app.js        page logic: bindings, timeline, countdown, RSVP, modal
games.js      the three ceremony mini-games
Dockerfile    Railway build — Caddy serving the files as-is
Caddyfile     server config: ports, caching, security headers
devserver.py  local dev server (no-cache + live reload); not deployed
```

## Making it yours

Everything in `[brackets]` lives in **`config.js`** — names, parents, dates,
venue, hashtag, phone numbers, the four events. Nothing else needs touching.

The two you must not forget:

| Field | What it does |
|---|---|
| `whatsappNumber` | Left empty **on purpose**: WhatsApp then opens its contact picker, so each guest sends their RSVP to whoever they actually know. Set it (digits only, country code, no `+`) only if every RSVP should land in one chat. |
| `contacts` | Optional list of `{ label, phone }` for "Prefer to call?". Guests pick who to ring. Empty hides the line entirely, rather than offering a number that dials nowhere. |
| `weddingDate` | Drives the countdown. Local time, `YYYY-MM-DDTHH:MM:SS`. |
| `mapUrl` | Google Maps link. Turns every mention of the venue into a directions link. |
| `venueShort` | Used where the full venue name would swamp the line — the invitation's narrow "Where" column and the timeline, which repeats it on every event. |

`weddingDateLabel` is the human-readable date shown on the invitation, kept
separate so you can write it however you like ("28 December 2026", "28.12.26").

Each event takes these optional fields:

| Field | Effect |
|---|---|
| `venue` | Overrides the default venue — the temple ceremony uses this |
| `mapUrl` | Overrides the map link. `null` means "no map for this one" |
| `note` | A plain practical line, set apart from the ceremonial copy |
| `dressCode` | Rendered as "Dress code: …" |
| `durationHours` | Overrides `eventDurationHours` for that calendar file |
| `dayLabel` | Overrides the weekday line, which is otherwise derived from `date` |

The weekday line and the "N days of celebration" heading are both derived from
the event dates, so they cannot drift out of step with the schedule.

## Sections

Cover → Invitation → The Festivities → Pick your side → Countdown → RSVP →
Blessing footer, plus a reveal modal.

- **Countdown** ticks every second to `weddingDate` and clamps at zero.
- **Pick your side** is single-select; tapping the active side clears it.
- **RSVP** collects name, celebrations and guest count (1–20) and saves them
  to a Google Sheet. See below. Both the WhatsApp fallback and the call line
  let the guest choose who to contact, rather than routing everyone to one
  person. Guest input is remembered in `localStorage`.
- **+ Add to calendar** on each event downloads an `.ics` file.

## RSVPs

Responses go to a Google Sheet through an Apps Script web app — no database,
no backend service, and the people who need the numbers (family, caterer) can
read the answers without anyone's help.

Setup instructions are at the top of [`rsvp-sheet.gs`](rsvp-sheet.gs). Paste
that file into the sheet's Apps Script editor, deploy it as a web app with
access set to **Anyone**, and put the `/exec` URL into `rsvpEndpoint` in
`config.js`.

Until that URL is set, the WhatsApp button stays the primary action, so the
page works throughout. Once it is set:

- **Send RSVP** becomes the primary button and writes a row to the sheet.
- WhatsApp drops to a quiet secondary link, and is promoted back to a button
  if a submission fails — a failed RSVP always has somewhere to go.
- Guests can correct a submission. Each browser keeps a submission id, and the
  script overwrites that row rather than adding a second one. **"RSVP for
  someone else"** clears that id, so a phone passed around a family records
  each person on their own row instead of overwriting the last one.
- Rows land in a tab named `RSVPs`, which the script creates. A spreadsheet
  opens on `Sheet1`, which stays empty — check the tabs before concluding
  nothing was saved.
- A hidden honeypot field is discarded by the script. The endpoint is
  publicly writable by design, as any unauthenticated endpoint is; at this
  scale the remedy for a junk row is deleting it.

## The mini-games

Each ceremony opens a card that is hidden behind a game. Winning
fades the cover away and reveals the ceremony card underneath; unlocked cards
get a ✓ on their thumbnail and stay unlocked. Every game has a
**Skip & reveal** link, so nobody is ever locked out of the details. In the
newer games that link stays hidden until about three seconds of inactivity,
so it never competes with the interaction; once shown it stays, since a
control that flickers in and out is worse than one that is simply there.

| Ceremony | Game |
|---|---|
| Bhaat | Tap or drag each gift — bangles, a sari, sweets, a cash envelope, a garland — onto the mama's thaal until it is full |
| Haldi | Rub the turmeric off a canvas scratch layer (reveals at 60% cleared) |
| Mehendi | Trace the henna vine with your finger — the path fills as you go |
| Sangeet | Tap the dhol eight times to the beat, with a WebAudio drum hit |
| Sightseeing | Four landmarks glow faintly on a map of the town — tap each to name it, "X of 4 found" |
| DJ Night | Tap the disc to layer the track, or hold it two seconds to build to the drop |
| Mangalya Sutra | Press and hold each of the three knots — a ring fills as you hold, the cord cinches tighter and the thali settles on the third |
| The Wedding | Tap or flick to shower akshata over the couple, who take on colour as the blessings land |

To turn one off, set that event's `game` to `null` — the card then opens
straight away. A thumbnail appears whenever an event has a `thumbLabel`, so
set that to `null` instead if you want no card at all for an event.

## Artwork

The garland strip, the four ceremony illustrations and the seal are inline SVG
in `index.html` (`<symbol id="art-haldi">` and friends) — no image files, so the
page stays fast and crisp at any density. To swap in real illustrations,
replace the contents of each `<symbol>`, or point the `<use href>` at an
`<img>`-based markup instead.

## Running it locally

```sh
python3 devserver.py           # http://localhost:8000
PORT=3000 python3 devserver.py
```

Use this rather than `python3 -m http.server`. It sends `Cache-Control:
no-store` and injects a live-reload snippet into `index.html`, so an edited
stylesheet shows up immediately instead of being served from the browser
cache. The snippet is added to the response only — the file on disk stays
clean, and nothing is injected in production. The page keeps its URL hash on
reload, so `#invitation` stays where it is.

## Deploying to Railway

Railway detects the `Dockerfile` and builds it — no configuration needed in
the dashboard, and no build step, since Caddy serves the files as they are.

1. New Project → Deploy from GitHub repo → pick this repo
2. Railway builds the `Dockerfile` and starts the service
3. Settings → Networking → Generate Domain

Railway injects `PORT`; the `Caddyfile` binds to it via `:{$PORT:8080}` and
falls back to 8080 for a plain `docker run -p 8080:8080 …` locally.

`index.html` and `config.js` are served `must-revalidate` so a guest never
sees a stale invitation after the names, dates or venues change; the other
static assets are cached for an hour.

## Notes

- Designed at 430px; scales down to 320px phones and centers on desktop.
- Respects `prefers-reduced-motion` — petals, the seal glow and scroll reveals
  all stand down.
- Keyboard accessible: the modal traps focus and closes on `Esc`.
