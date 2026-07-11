# Handoff: chat session -> Claude Code (11 Jul 2026)

Two sessions touched this tree today; this file is the baton. Read this before
editing anything.

## Conventions (settled, do not change)
Entity ids via `DA.newId()` (reset per run in `newGame`). Fixed 60 Hz tick in
`main.js frame()` with a 4-step catch-up guard. Seeded randomness only through
`DA.makeRng(seed)` and `DA.hashSeed(str)`. Combo: step 6, window 4 s, hits
halve via `DA.comboHit` (bot hits exempt). Map rule: doors only E/S to the
adjacent grid cell; boss is the only sink; the tests enforce it.

## Done and committed
Phase 0 (tick, ids, rng) - Phase 1 via CAM-BOT (players array, input-shaped
bot, downed/revive, co-op waves x1.4) - Phase 4 Syndication (js/procgen.js,
seeded monotone-lattice episodes, gift rooms, daily + ?seed= URLs, dynamic
minimap; 120-seed invariant + determinism validation passed) - death scene,
heartbeat music, broadcast FX layer, top-5 board, forward-grid map rewire -
Phase 2a: relay (server/relay.js Node, tested pattern) + server/worker.js
Durable Object deploy target + server/README.md.

## DONE (11 Jul, Claude Code local session): Phase 2b wired and packet-tested
All 8 steps below are complete. Verified against `node server/relay.js` with
the browser as host and a scripted 30Hz Node guest (`ws` client) standing in
for a focused second browser (hidden Chrome tabs throttle the guest's input
timer to ~1/min, which made two-background-tabs testing impossible — a real
guest with a focused tab has no such problem). Evidence: host code CFMS
issued; guest paired, received 200 snapshots + 23 events; guest input drove
seat 2 across the arena (x 710 -> 1228), aim matched the commanded (1,0),
fired (7 concurrent bullets) and scored 20 kills; guest disconnect handed the
seat back to CAM-BOT; ping 2ms. Browser suite 49/49 and headless smoke green.

Still open for a human: the 150ms-throttle interpolation feel test (needs two
focused windows), then Phase 3 (binary snapshots, reconnect grace, ping HUD).

Original checklist, all landed:

1. index.html: add `<script src="js/net.js"></script>` AFTER main.js.
2. main.js update(), player loop: route input for remote seats:
   `if (pl.remote) inp = (DA.net && DA.net.freshGuestInput()) || {moveX:0,moveY:0,aimX:pl.aimX,aimY:pl.aimY,firing:false};`
   before the existing bot/human branch.
3. main.js update(), end of the playing branch: `if (DA.net) DA.net.hostTick(st);`
4. main.js newGame(): after players are built, `if (DA.net) DA.net.onHostNewGame(st, startRoom);`
   (net attaches the remote seat itself when a guest is already paired).
5. main.js enterRoom(): `if (DA.net) DA.net.onEnterRoom(roomId, entryDir);`
6. main.js title: `H` (keydown, title mode only) calls `DA.net.host()`; add a
   title line showing `ROOM <code> - waiting` from `DA.net.code`/`status`.
   Guests need nothing: `?join=CODE` auto-joins on load (already in net.js).
7. player.js drawPlayer: remote seats draw with body `#f2e2b0`.
8. Test: `node server/relay.js` locally, two browser tabs,
   `?relay=ws://localhost:8787` (host tab presses H; open the join URL with the
   code in tab two). Then throttle to 150 ms and check interpolation.
   `node tests/headless-smoke.js` must stay green throughout.

## Watch items
Co-op wave multiplier (1.4x) and bot lethality both need a feel pass. Phase 3
(binary snapshots, reconnect grace, ping HUD) starts after 1-8 land.
