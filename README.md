# SLASH TV: THE FINAL BROADCAST 🧟📺

*The most-watched — and most-banned — show on Earth.*

(The project folder is `dead-air`; the repo is `slash-tv` — the show has been renamed three times mid-season. Such is television.)

A browser twin-stick shooter in the spirit of Smash TV. You're a contestant fighting
through the studios of a zombie-infested TV network — 8 connected rooms with exit-door
choices, audience power-up drops, and **The Producer** waiting on Sound Stage 5.

## Play

**Online: https://adhogger.github.io/slash-tv/**

Or open `index.html` in any browser. No install, no build step, no server needed.

**Esc / P / 🎮 Start** pauses. Beat Episode 1 to unlock **Episode 2: Sweeps Week**
(press 2 or 🎮 X) — seven harder rooms, phasing **stalker** zombies, and **The
Executive**, a teleporting boss with bullet fans and a phase-2 spiral — plus the
**Endless Arena** (E or 🎮 Y): infinite waves, audience heart every 3rd wave. High
scores and run stats (kills, accuracy, favorite gun) are saved in your browser.

**Gamepad (recommended):** left stick moves; push the right stick in any direction to fire
that way (right trigger also fires). Press **G** for a raw controller readout if inputs act oddly.
**Keyboard:** WASD moves; mouse aims and click fires — or go keyboard-only,
SNES-style: hold the **arrow keys** to aim and fire in that direction (diagonals work).
**Phone / tablet:** floating twin thumbsticks — left half of the screen moves, right half
aims & fires; tap the top-right corner to pause. Rotate to landscape.
Whichever you touched last wins. **M** mutes sound and music.

Clear a room and the exit doors glow green — walk into one to pick your route (+1 heart,
+$1000). The audience throws gifts: **gun crates** (TRIPLE, SMG, SHOTGUN, MINIGUN, and the
piercing RAILGUN — each lasts 30 combat-seconds, then back to your pistol), speed boots,
**shields** (8s of total protection), **bombs** (instantly clear the set — no multiplier
credit), and extra hearts (never when your 5-heart meter is full). Your current gun shows
under the heart meter.

Watch for orange **boomers**: get close and they light a fuse and explode, hurting you and
everything near them. Shooting one detonates it too — snipe them inside the horde for
chain reactions. The **multiplier** is earned now: every 8 chained kills raise it one step
(x9 max), a 3-second gap breaks the chain, and taking any hit resets it to x1.

## Tests

Open `tests.html` — every pure-logic function (collision, input mapping, waves, combo)
is asserted there. Green ✅ means healthy; the tab title shows the verdict.

## Publishing to itch.io

`./build-itch-zip.sh` packages a clean HTML5 build for upload. Full walkthrough,
listing copy, and monetisation notes: [docs/itch-io-listing.md](docs/itch-io-listing.md).

## Project layout

- `js/util.js` — the `DA` namespace + math helpers
- `js/input.js` — unified gamepad / keyboard+mouse input (auto-detects odd right-stick axes)
- `js/player.js`, `js/enemies.js`, `js/bullets.js` — the actors + projectiles
- `js/combat.js` — collision resolution, score, combo
- `js/rooms.js` — the episode: rooms, exits, and waves as plain data (add content here)
- `js/boss.js` — The Producer
- `js/powerups.js` — audience drops
- `js/audio.js` — all-synthesized WebAudio sound (no audio files)
- `js/effects.js` — particles, screen shake, splats, announcer
- `js/main.js` — game loop, states, room transitions, rendering, HUD
- `devserver.py` — optional no-cache dev server (`python3 devserver.py`)
- `docs/plans/` — design docs and implementation plans

## Roadmap

v0.1: single test studio ✅ → v0.2 (this): Episode 1 — 8 rooms, exit choices, swarmers &
brutes, power-ups, sound, The Producer ✅ → Endless Arena (unlock) → more episodes.
