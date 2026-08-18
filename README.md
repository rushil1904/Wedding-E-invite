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

## Two invitations, one site

The bride's side and the groom's side get different subdomains, and each sees
a different invitation:

| | Bride's link | Groom's link |
|---|---|---|
| Names | Rithika weds Rushil | Rushil weds Rithika |
| Parents | Nair line first | Deshwal line first |
| Events | Haldi, Mehendi, Sangeet, The Wedding | all eight |

**Both links are paths on the one deployment:**

```
https://<your-railway-domain>/rithika    →  bride's side
https://<your-railway-domain>/rushil     →  groom's side
https://<your-railway-domain>/           →  everything, bride first
```

Paths rather than subdomains because Railway issues a single
`*.up.railway.app` domain per service — two subdomains would need a domain you
own, or a second service, which would mean two copies of the invitation to
keep in step.

Caddy serves `index.html` for any path that is not a file (`try_files`), and
the page picks its side from `location.pathname`. Nothing else needs setting
up: no DNS, no second service.

If you later put this on a domain of your own, fill in the `hosts` arrays and
add both subdomains to the same Railway service — the code already checks the
hostname and nothing else changes.

The paths live in `sides` in `config.js`; rename them there if you want
different words. `?side=bride` / `?side=groom` also works on any URL.

Deliberately **one deployment, not two builds.** Two copies of the invitation
would drift apart the first time a time or a venue changed, and this is a live
document. It also means one RSVP sheet: each submission records which
invitation the guest used, in a `Side` column.

This is curation, not access control — anyone can type the other side's URL or
add `?side=`. It shapes what each family is invited to, and is not a secret.

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
| Sightseeing | Four landmarks glow faintly on a map of the town — tap each to open a medallion of the sight itself, "X of 4 found" |
| DJ Night | Tap the disc to layer the track, or hold it two seconds to build to the drop |
| Mangalya Sutra | Press and hold each of the three knots — a ring fills as you hold, the cord cinches tighter and the thali settles on the third |
| The Wedding | Tap or flick to shower akshata over the couple, who take on colour as the blessings land |

To turn one off, set that event's `game` to `null` — the card then opens
straight away. A thumbnail appears whenever an event has a `thumbLabel`, so
set that to `null` instead if you want no card at all for an event.

## Artwork on the reveal cards

Each ceremony card shows an illustration from `assets/web/`, named by the
event's `image` field in `config.js`.

`assets/*.png` are the full-size originals (~2.5 MB each). They are **not**
deployed — `.dockerignore` keeps them out of the image. What ships is
`assets/web/`, regenerated from the originals with:

```sh
cd assets
for f in *.png; do
  sips -Z 900 -s format jpeg -s formatOptions 78 "$f" --out "web/${f%.png}.jpg"
  cwebp -q 78 -resize 900 0 "$f" -o "web/${f%.png}.webp"
done
```

WebP is served to anything modern and JPEG to older phones, via `<picture>`.
The card's `src` is set when the modal opens rather than up front, so a guest
downloads only the one illustration they are looking at — not all eight.

## Background music

`assets/web/music.m4a` (361 KB) with `music.mp3` (528 KB) as a fallback — a
45-second seamless loop cut from the source track in `assets/`, which is 11 MB
and is **not** deployed (`.dockerignore` keeps it out).

Regenerate the loop with:

```sh
cd assets
ffmpeg -y -ss 180 -t 48 -i "SOURCE.mp3" -c:a pcm_s16le /tmp/seg.wav
F="[0:a]atrim=start=3:end=48,asetpts=N/SR/TB[rest];\
[1:a]atrim=start=0:end=3,asetpts=N/SR/TB[head];\
[rest][head]acrossfade=d=3:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11[out]"
ffmpeg -y -i /tmp/seg.wav -i /tmp/seg.wav -filter_complex "$F" -map "[out]" \
  -c:a aac -b:a 64k web/music.m4a
ffmpeg -y -i /tmp/seg.wav -i /tmp/seg.wav -filter_complex "$F" -map "[out]" \
  -c:a libmp3lame -b:a 96k web/music.mp3
```

The crossfade is what makes it loop without a seam: the clip's tail is blended
into the three seconds that preceded its start, so the end runs straight back
into the beginning.

**There is no play button.** Browsers refuse to start audio before the guest
interacts, so the page tries immediately and otherwise starts on the first
tap — which on this page is "tap to reveal". A guest never has to press
anything to hear it.

The toggle at bottom-left stops it. That is not optional politeness: audio
that starts on its own needs a way to stop it, for anyone who opens the
invitation somewhere they would rather it stayed quiet. The choice is
remembered, and the music pauses when the tab is hidden.

`music` in `config.js` sets the levels, or `null` turns it off:

| Field | |
|---|---|
| `volume` | resting level, 0.18 |
| `ducked` | level while a ceremony card is open, 0.035 |

It ducks rather than stopping, so the games' own sounds are always clearly on
top without the music restarting every time a card closes.

## The browser icon

`assets/rr.svg` is the source. Modern browsers take the SVG directly; the PNGs
in `assets/web/` cover the rest and give a phone a proper icon when a guest
adds the invitation to their home screen. Regenerate them after editing the
SVG with:

```sh
# with the dev server running
for s in 180 32; do
  printf '<!doctype html><body style="margin:0;background:transparent">\
<img src="/assets/rr.svg" width="%s" height="%s" style="display:block">' $s $s > _icon.html
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --default-background-color=00000000 --window-size=$s,$s --virtual-time-budget=2500 \
    --screenshot=assets/web/icon-$s.png http://localhost:8000/_icon.html
done
rm _icon.html
```

## Line artwork

The garland strip, the timeline thumbnails and the seal are inline SVG
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
3. Settings → Networking → Generate Domain. That one domain serves both
   invitations at `/rithika` and `/rushil` — see "Two invitations, one site"

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
