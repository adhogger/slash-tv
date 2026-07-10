# DEAD AIR 🧟📺

*America's #1 post-apocalyptic game show!*

A browser twin-stick shooter in the spirit of Smash TV. You're a contestant clearing
single-screen studios of zombies for cash while the announcer eggs you on.

## Play

Open `index.html` in any browser. No install, no build step, no server needed.

**Gamepad (recommended):** left stick moves, right stick aims + fires (right trigger also fires).
**Keyboard + mouse:** WASD moves, mouse aims, click (hold) fires.
Whichever you touched last wins.

## Tests

Open `tests.html` — every pure-logic function (collision, input mapping, waves, combo)
is asserted there. Green ✅ means healthy; the tab title shows the verdict.

## Project layout

- `js/util.js` — the `DA` namespace + math helpers
- `js/input.js` — unified gamepad / keyboard+mouse input
- `js/player.js`, `js/enemies.js`, `js/bullets.js` — the actors
- `js/combat.js` — collision resolution, score, combo
- `js/rooms.js` — rooms and waves as plain data (add content here)
- `js/effects.js` — particles, screen shake, splats, announcer
- `js/main.js` — game loop, states, rendering, HUD
- `docs/plans/` — design doc and implementation plan

## Roadmap

v0.1 (this): single test studio, 3 waves ✅ →
Episode 1: 6–8 rooms, exit doors, "The Producer" boss →
Endless Arena (unlocked by beating Episode 1) → more episodes.
