# Publishing SLASH TV on itch.io

This doc is everything needed to list the game — the parts I (Claude) can't
do for you are the account and the upload, both flagged below.

## What's already prepared

- `build-itch-zip.sh` — packages a clean HTML5 build (`index.html` at the
  zip root, as itch.io requires). Run it any time after a code change:
  ```
  ./build-itch-zip.sh
  ```
  Produces `slash-tv-itch.zip` (~76KB). Verified standalone: loads with zero
  console errors, all weapons/systems present, served from a plain static
  file server (the closest local approximation of itch.io's sandboxed
  "run in browser" iframe).
- Icon: `icon.png` (already used as the site favicon) doubles as a itch.io
  thumbnail candidate if you don't want to make a dedicated one.
- Cover/screenshot: `preview.png` (the Open Graph share image) works as a
  itch.io screenshot too, or grab a fresh one from a real play session.

## What only you can do (account + upload — ~10 minutes)

1. **Create an itch.io account** at itch.io (free) — this is account
   creation, so it has to be you.
2. **New Project** → *Kind of project*: **HTML**.
3. Upload `slash-tv-itch.zip`. Check **"This file will be played in the
   browser"** next to it.
4. Under *Embed options*: set viewport to **1280 × 720**, tick **"Click to
   launch in fullscreen"** (nice-to-have), leave "Mobile friendly" off (the
   game has its own touch controls but the canvas expects a real viewport).
5. Paste in the listing copy below.
6. **Pricing** — see "Monetising" below; this is the itch.io-native lever
   and needs no code at all.
7. Publish (itch.io lets you preview privately first via "Save & view page"
   before making it public).

## Listing copy

**Title:** SLASH TV: The Final Broadcast

**Short description / tagline:**
> A Smash TV-style twin-stick shooter. Fight through a zombie-infested TV
> network for the season finale. Free, browser-based, gamepad or keyboard.

**Genre/tags:** `action`, `arcade`, `shooter`, `twin-stick`, `zombies`,
`survival`, `co-op`, `browser`, `html5`

**Full description** (paste into the itch.io page body):

> For twelve years, SLASH TV was the most-watched entertainment program on
> the planet. Tonight it's being cancelled — so the producers decided to go
> out with a bang. Every monster the show ever built has been let loose in
> one building, and you're the only contestant left.
>
> **Fight through 3 full episodes** across 24 hand-built rooms, each with
> its own set dressing, enemy mix, and a boss at the end — from a
> game-show host with a shotgun-mic to a hovering AI camera-drone that
> predicts where you're running.
>
> **A new episode every night.** Syndication mode procedurally generates a
> fresh, fair studio from tonight's date — the same seed for everyone on
> Earth, with a live global leaderboard so you're racing the world, not
> just your own best.
>
> **Play with a friend, anywhere.** Press H to host, send the link — real
> peer-to-peer co-op with downed/revive, no install required on either end.
>
> **An arsenal that keeps growing:** pistol, SMG, shotgun, minigun, a
> piercing railgun, a flamethrower, and a splash-damage rocket launcher —
> all dropped in by an audience that's rooting for you (or isn't).
>
> Gamepad, keyboard + mouse, keyboard-only (arrow keys), or touch — the
> whole game is built to work on whatever you've got open.
>
> No install. No signup. No ads. Just press fire.

## Monetising

The itch.io-native, single most common approach for a free indie HTML5
game — and the one I'd recommend starting with — is itch.io's own
**"Pay what you want"** pricing model:

- On the project page, under *Pricing*: choose **"$0 or donate"** (itch.io's
  exact wording is "No payments required" + a suggested/optional amount).
  Players can download or play for free, and a **"support this project"**
  prompt appears with an amount they can choose — including $0.
- This needs no code, no third-party account, no payment integration on my
  end. itch.io handles the entire transaction; you just connect a payout
  method (PayPal or bank) in your itch.io account settings when you're
  ready to receive anything.

**Optional extra — an in-game donate link:** I've wired a small, inert hook
for this. In `index.html`, uncomment and fill in:
```html
<script>window.SLASHTV_DONATE_URL = 'https://ko-fi.com/yourname';</script>
```
Once set, the title screen shows a small **"D — 💛 SUPPORT THE SHOW"** line
(pressing D opens the link in a new tab). Leave it unset and that line
never appears — nobody sees a broken placeholder. This is a nice
complement to itch.io's own pricing model if you'd rather point people at
a Ko-fi/Buy Me a Coffee/Patreon page you already run, but it needs *you* to
create that account first (I can't sign up for payment services on your
behalf — see the safety note below).

**What I deliberately did not build:** ads, paywalled content, or any
in-game purchase flow. Those all need a real payment processor account and
credential handling that has to be done by you, not me — entering payment
credentials or setting up a merchant/payment account is outside what I can
do even if asked directly. "Pay what you want" on itch.io is the standard,
low-friction path that sidesteps all of that.
