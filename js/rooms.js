(function () {
  // Episode 1: 8 rooms. Each wave = { doors: how many spawn doors are active,
  // groups: [{ type, count, interval, speed? }] }. interval = seconds between
  // single spawns; speed overrides the type's base speed for that group.
  DA.START_ROOM = 'studio1';
  DA.ROOMS = {
    studio1: {
      map: { x: 0, y: 0 },
      name: 'STUDIO 1', floor: '#30303a', decor: 'stage',
      exits: { E: 'greenroom', S: 'makeup' },
      waves: [
        { doors: 1, groups: [{ type: 'shambler', count: 85, interval: 1.1, burst: 7 }] },
        { doors: 2, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'boomer',   count: 2,   interval: 9 }] }
      ]
    },
    greenroom: {
      map: { x: 1, y: 0 },
      name: 'THE GREEN ROOM', floor: '#2e352d', decor: 'lounge',
      exits: { S: 'cafeteria' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 85, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 24, interval: 1.3, burst: 5 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 40, interval: 1.3, burst: 5 }] }
      ]
    },
    makeup: {
      map: { x: 0, y: 1 },
      name: 'MAKEUP', floor: '#362e34', decor: 'mirrors',
      exits: { E: 'cafeteria', S: 'props' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 95, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 12, interval: 2.0, speed: 110 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 18, interval: 1.6, speed: 130 }] }
      ]
    },
    props: {
      map: { x: 0, y: 2 },
      name: 'PROP DEPARTMENT', floor: '#34342e', decor: 'crates',
      exits: { E: 'controlroom' },
      waves: [
        { doors: 3, groups: [{ type: 'swarmer',  count: 60, interval: 1.3, burst: 5 },
                             { type: 'sprinter', count: 16, interval: 1.8, speed: 130 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 50, interval: 1.3, burst: 5 },
                             { type: 'sprinter', count: 16, interval: 1.5, speed: 140 }] }
      ]
    },
    cafeteria: {
      map: { x: 1, y: 1 },
      name: 'STAFF CAFETERIA', floor: '#2e3336', decor: 'tables',
      exits: { E: 'editing', S: 'controlroom' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 4,  interval: 8 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 7,  interval: 6 }] }
      ]
    },
    editing: {
      map: { x: 2, y: 1 },
      name: 'EDITING BAY', floor: '#312e36', decor: 'desks',
      exits: { S: 'stage' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 100, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 55, interval: 1.3, burst: 5 },
                             { type: 'sprinter', count: 22, interval: 1.4, speed: 155 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 7,  interval: 6 },
                             { type: 'sprinter', count: 26, interval: 1.2, speed: 155 }] }
      ]
    },
    controlroom: {
      map: { x: 1, y: 2 },
      name: 'CONTROL ROOM', floor: '#36312e', decor: 'monitors',
      exits: { E: 'stage' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 85, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 34, interval: 1.3, burst: 5 },
                             { type: 'sprinter', count: 22, interval: 1.3, speed: 165 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 6,  interval: 5 },
                             { type: 'sprinter', count: 26, interval: 1.1, speed: 170 }] }
      ]
    },
    stage: {
      map: { x: 2, y: 2 },
      name: 'SOUND STAGE 5', floor: '#382e2e', decor: 'bossfloor',
      exits: {},
      boss: 'producer',
      waves: []
    },

    // ---- EPISODE 2: SWEEPS WEEK (unlocked by beating Episode 1) ----
    writers: {
      ep: 2, map: { x: 0, y: 0 },
      name: 'WRITERS ROOM', floor: '#323038', decor: 'papers',
      exits: { E: 'wardrobe', S: 'catering' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 100, interval: 1.1, burst: 7 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 4,  interval: 2.5 }] }
      ]
    },
    wardrobe: {
      ep: 2, map: { x: 1, y: 0 },
      name: 'WARDROBE', floor: '#383230', decor: 'racks',
      exits: { S: 'gallery' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 90, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 30, interval: 1.3, burst: 5 },
                             { type: 'stalker',  count: 4,  interval: 2.2 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 40, interval: 1.3, burst: 5 },
                             { type: 'stalker',  count: 4,  interval: 2.0 }] }
      ]
    },
    catering: {
      ep: 2, map: { x: 0, y: 1 },
      name: 'CRAFT SERVICES', floor: '#303834', decor: 'tables',
      exits: { E: 'gallery' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'boomer',   count: 3,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'sprinter', count: 16, interval: 1.4, speed: 170 }] }
      ]
    },
    backlot: {
      ep: 2, map: { x: 2, y: 1 },
      name: 'THE BACKLOT', floor: '#36342e', decor: 'crates', hazard: 'pyro',
      exits: { S: 'suite' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 6 },
                             { type: 'stalker',  count: 4,  interval: 2.2 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 125, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 6,  interval: 5 },
                             { type: 'sprinter', count: 20, interval: 1.2, speed: 175 }] }
      ]
    },
    gallery: {
      ep: 2, map: { x: 1, y: 1 },
      name: 'THE GALLERY', floor: '#303438', decor: 'monitors',
      exits: { E: 'backlot', S: 'serverroom' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 40, interval: 1.3, burst: 5 },
                             { type: 'boomer',   count: 3,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 4,  interval: 1.8 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'spitter',  count: 2,  interval: 7 }] }
      ]
    },
    serverroom: {
      ep: 2, map: { x: 1, y: 2 },
      name: 'SERVER ROOM', floor: '#2c323a', decor: 'servers', hazard: 'crane',
      exits: { E: 'suite' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 125, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 22, interval: 1.1, speed: 180 },
                             { type: 'stalker',  count: 4,  interval: 1.8 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 135, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'sprinter', count: 24, interval: 1.0, speed: 180 },
                             { type: 'spitter',  count: 3,  interval: 6 }] }
      ]
    },
    suite: {
      ep: 2, map: { x: 2, y: 2 },
      name: 'EXECUTIVE SUITE', floor: '#3a3442', decor: 'bossfloor',
      exits: {},
      boss: 'executive',
      waves: []
    },
    endless: {
      name: 'ENDLESS ARENA', floor: '#2a3130', decor: 'stage',
      exits: {},
      endless: true,   // waves are generated forever by DA.endlessWave(n)
      waves: []
    },

    // ---- EPISODE 3: LIVE FINALE (unlocked by beating Episode 2) ----
    // The show has run out of monsters, so the studio itself is repurposed
    // as one: camera cranes sweep the floor, pyro rigs meant for the finale
    // number fire early. DA.updateHazards/drawHazards (js/hazards.js) run
    // whenever room.hazard is set, alongside the usual zombie waves.
    controlbooth: {
      ep: 3, map: { x: 0, y: 0 },
      name: 'THE CONTROL BOOTH', floor: '#242830', decor: 'lighting',
      exits: { E: 'catwalks', S: 'greenscreen' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 100, interval: 1.1, burst: 7 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 5,  interval: 2.0 }] }
      ]
    },
    catwalks: {
      ep: 3, map: { x: 1, y: 0 },
      name: 'THE CATWALKS', floor: '#262424', decor: 'catwalk', hazard: 'crane',
      exits: { S: 'cranebay' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 95, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 30, interval: 1.3, burst: 5 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 16, interval: 1.4, speed: 175 }] }
      ]
    },
    greenscreen: {
      ep: 3, map: { x: 0, y: 1 },
      name: 'THE GREEN SCREEN STAGE', floor: '#1e3226', decor: 'stage',
      exits: { E: 'cranebay', S: 'pyrobay' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 35, interval: 1.3, burst: 5 },
                             { type: 'boomer',   count: 3,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 130, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 5,  interval: 1.9 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'spitter',  count: 3,  interval: 6 }] }
      ]
    },
    cranebay: {
      ep: 3, map: { x: 1, y: 1 },
      name: 'THE CRANE BAY', floor: '#2c2620', decor: 'cranebay', hazard: 'crane',
      exits: { E: 'corebay', S: 'lastlook' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 130, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 6,  interval: 5 },
                             { type: 'sprinter', count: 18, interval: 1.3, speed: 180 }] }
      ]
    },
    pyrobay: {
      ep: 3, map: { x: 0, y: 2 },
      name: 'THE PYROTECHNICS BAY', floor: '#301e1e', decor: 'pyrobay', hazard: 'pyro',
      exits: { E: 'lastlook' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'boomer',   count: 5,  interval: 5 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 125, interval: 1.1, burst: 7 },
                             { type: 'boomer',   count: 6,  interval: 4.5 },
                             { type: 'swarmer',  count: 30, interval: 1.2, burst: 5 }] }
      ]
    },
    corebay: {
      ep: 3, map: { x: 2, y: 1 },
      name: 'THE BROADCAST RELAY', floor: '#20262e', decor: 'corebay', hazard: 'crane_pyro',
      exits: { S: 'broadcastcore' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 6,  interval: 1.7 },
                             { type: 'sprinter', count: 18, interval: 1.2, speed: 185 },
                             { type: 'spitter',  count: 3,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 140, interval: 1.05, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'stalker',  count: 7,  interval: 1.5 },
                             { type: 'gusher',   count: 2,  interval: 9 }] }
      ]
    },
    lastlook: {
      ep: 3, map: { x: 1, y: 2 },
      name: 'LAST LOOKS', floor: '#2a2430', decor: 'monitors', hazard: 'pyro',
      exits: { E: 'broadcastcore' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 35, interval: 1.2, burst: 5 },
                             { type: 'boomer',   count: 4,  interval: 5 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 135, interval: 1.05, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'sprinter', count: 18, interval: 1.2, speed: 185 },
                             { type: 'boomer',   count: 5,  interval: 5 },
                             { type: 'spitter',  count: 3,  interval: 5 },
                             { type: 'gusher',   count: 2,  interval: 9 }] }
      ]
    },
    broadcastcore: {
      ep: 3, map: { x: 2, y: 2 },
      name: 'THE BROADCAST CORE', floor: '#1c2828', decor: 'bossfloor', hazard: 'crane_pyro',
      exits: {},
      boss: 'algorithm',
      waves: []
    }
  };
  for (var _rid in DA.ROOMS) DA.ROOMS[_rid].id = _rid;   // self-reference, used by DA.roomDeaths
  // deaths-per-room this session (main.js increments on startDying) — the
  // one bit of difficulty that reacts to how the run is actually going,
  // deliberately small and bounded (see startWave below)
  DA.roomDeaths = {};

  // Procedural wave for the Endless Arena. n starts at 0 and never stops.
  // Pure-linear ramps flatten into arithmetic after wave ~8, so the format
  // now breaks: every 10th wave is a boss RERUN ("a cancelled episode,
  // re-aired"), and every 4th a themed interrupt segment that changes the
  // SHAPE of the fight, not just its size. Everything else stays the ramp.
  DA.endlessWave = function (n) {
    if (n > 0 && n % 10 === 0) {                       // rerun night: a boss is back
      return { doors: 2, boss: ['producer', 'executive', 'algorithm'][((n / 10) - 1) % 3],
               groups: [{ type: 'shambler', count: 30 + n * 3, interval: 2.0, burst: 5 }] };
    }
    if (n >= 4 && n % 4 === 0) {                       // a themed format break
      var k = Math.floor(n / 4) % 4;
      if (k === 1) return { doors: 2, announce: 'SEGMENT: THE WALL', elite: 1,
        groups: [{ type: 'brute',   count: 3 + Math.floor(n / 3), interval: 4 },
                 { type: 'boomer',  count: 2 + Math.floor(n / 4), interval: 5 },
                 { type: 'shambler', count: 30 + n * 3, interval: 1.4, burst: 6 }] };
      if (k === 2) return { doors: 3, announce: 'SEGMENT: STALKER NIGHT',
        groups: [{ type: 'stalker', count: 4 + Math.floor(n / 2), interval: 2.0 },
                 { type: 'shambler', count: 35 + n * 3, interval: 1.3, burst: 6 }] };
      if (k === 3) return { doors: 1, announce: 'SEGMENT: THE FLOOD',
        groups: [{ type: 'shambler', count: 70 + n * 8, interval: 0.8, burst: 12 },
                 { type: 'swarmer',  count: 20 + n * 3, interval: 1.2, burst: 8 }] };
      return { doors: 3, announce: 'SEGMENT: RUSH HOUR',
        groups: [{ type: 'sprinter', count: 20 + n * 3, interval: 1.0, speed: Math.min(130 + n * 4, 185) },
                 { type: 'swarmer',  count: 30 + n * 4, interval: 1.0, burst: 6 }] };
    }
    var groups = [{ type: 'shambler', count: 45 + n * 9,
                    interval: Math.max(0.8, 1.6 - n * 0.05), burst: 7 }];
    if (n >= 1) groups.push({ type: 'swarmer', count: 10 + n * 4, interval: 1.3, burst: 5 });
    if (n >= 2) groups.push({ type: 'sprinter', count: 4 + n * 2, interval: 1.5,
                              speed: Math.min(120 + n * 5, 180) });
    if (n >= 3) groups.push({ type: 'boomer', count: 1 + Math.floor(n / 3), interval: 6 });
    if (n >= 4) groups.push({ type: 'brute', count: Math.floor(n / 2), interval: 7 });
    if (n >= 5) groups.push({ type: 'spitter', count: 1 + Math.floor(n / 4), interval: 6 });
    if (n >= 8) groups.push({ type: 'gusher', count: 1 + Math.floor(n / 8), interval: 9 });
    return { doors: Math.min(1 + Math.floor(n / 3), 4), groups: groups };
  };

  DA.oppositeDir = function (dir) {
    return { N: 'S', S: 'N', E: 'W', W: 'E' }[dir];
  };

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // NOTE: an earlier version of this merged every sub-wave's groups into
  // one spawner set with the widest door count from the start. That made
  // rooms meaningfully harder, not just differently paced — more doors
  // active simultaneously plus both waves' full enemy counts overlapping
  // from the very start front-loaded far more concurrent pressure than
  // either wave alone was tuned for (confirmed via headless test: enemy
  // count snowballed to 260+ where the old sequential version stayed
  // under 30). Waves stay sequential — same pacing/difficulty per room as
  // before — this only removes the VISIBLE pause and "next wave" reset so
  // it reads as one continuous fight instead of two with a gap.
  function waveFor(wm) {
    return wm.room.endless ? DA.endlessWave(wm.wave) : wm.room.waves[wm.wave];
  }
  var SIREN_LEAD = 2.2;   // a door's lamp lights this long before its own next pack — 2s ask + a hair of buffer
  DA.makeWaveManager = function (room) {
    return { room: room, wave: 0, spawners: null, activeDoors: null, currentSpawnDoors: [],
             sirens: {}, nextDoors: null, betweenTimer: 2,
             done: !room.endless && room.waves.length === 0 };
  };
  // prime the FIRST wave so its doors are known during the room countdown:
  // sirens flash through the 3-2-1, and zombies release the moment it hits 0
  DA.primeWave = function (wm) {
    if (wm.done) return;
    var wave = waveFor(wm);
    if (!wave) return;
    wm.nextDoors = shuffled(DA.DOORS).slice(0, DA.clamp(wave.doors || 4, 1, 4));
    wm.sirens = {};
    wm.nextDoors.forEach(function (d) { wm.sirens[d.dir] = SIREN_LEAD; });
    wm.betweenTimer = 0.05;
    wm.primed = true;
  };
  function startWave(wm) {
    var wave = waveFor(wm);
    wm.activeDoors = wm.nextDoors || shuffled(DA.DOORS).slice(0, DA.clamp(wave.doors || 4, 1, 4));
    wm.nextDoors = null;
    // co-op: two guns double the clear rate, so the show sends a bigger cast
    // AND feeds them through the doors faster
    var coop = DA.state && DA.state.players && DA.state.players.length > 1;
    var countMult = coop ? 3.6 : 1, paceMult = coop ? 0.8 : 1;
    var BURST_MULT = 1.2;   // bigger packs, in every mode — a wave should hit like a wave
    // a small, bounded ease for a room the player keeps failing THIS
    // session — pacing only, never count or burst size, so the fight
    // stays the same size and shape, just a little less relentless.
    // Capped at +30% spacing so it can never compound indefinitely.
    var deaths = (wm.room.id && DA.roomDeaths[wm.room.id]) || 0;
    if (deaths >= 2) paceMult *= Math.min(1.3, 1 + (deaths - 1) * 0.1);
    wm.spawners = wave.groups.map(function (g) {
      return { type: g.type, left: Math.round(g.count * countMult),
               interval: g.interval * paceMult, speed: g.speed,
               burst: Math.round((g.burst || 1) * BURST_MULT), burstLeft: 0, burstDoor: null,
               timer: wm.primed ? 0.1 : 0.5 };
    });
    wm.primed = false;
    // directed elites: a wave can guarantee champions (wave.elite budget)
    // on top of a base chance that RAMPS with endless depth instead of
    // staying a flat 2% forever
    wm.eliteBudget = wave.elite || 0;
    wm.eliteChance = wm.room.endless ? Math.min(0.08, 0.02 + wm.wave * 0.002) : 0.02;
    if (wave.announce && DA.announce) DA.announce(wave.announce);
    if (wave.boss && DA.spawnRerunBoss) DA.spawnRerunBoss(wave.boss);
    if (DA.onWaveStart) DA.onWaveStart(wm.wave + 1);
  }
  DA.updateWaves = function (wm, enemies, dt) {
    // siren ledger: every entry decays; anything still spawning gets topped
    // back to 3s each tick, so a lamp burns from 3s BEFORE a door's first
    // zombie until 3s after its last one steps through
    wm.sirens = wm.sirens || {};
    for (var sd in wm.sirens) {
      wm.sirens[sd] -= dt;
      if (wm.sirens[sd] <= 0) delete wm.sirens[sd];
    }
    if (wm.done) { wm.currentSpawnDoors = []; return; }
    if (!wm.spawners) {                   // between waves: nothing is coming through any door
      wm.currentSpawnDoors = [];
      wm.betweenTimer -= dt;
      if (wm.betweenTimer <= SIREN_LEAD && !wm.nextDoors) {   // warn: light next wave's doors early
        var nw = waveFor(wm);
        if (nw) {
          wm.nextDoors = shuffled(DA.DOORS).slice(0, DA.clamp(nw.doors || 4, 1, 4));
        }
      }
      if (wm.nextDoors) {
        wm.nextDoors.forEach(function (d) { wm.sirens[d.dir] = Math.max(wm.sirens[d.dir] || 0, SIREN_LEAD); });
      }
      if (wm.betweenTimer <= 0) startWave(wm);
      return;
    }
    var pending = 0;
    function pickDoor() {
      var doors = wm.activeDoors || DA.DOORS;
      // never open a pack in the player's face if any other door is live
      var p = DA.state && DA.state.player;
      if (p) {
        var far = doors.filter(function (dd) {
          return DA.dist2(dd.x, dd.y, p.x, p.y) > 240 * 240;
        });
        if (far.length > 0) doors = far;
      }
      return doors[Math.floor(Math.random() * doors.length)];
    }
    wm.spawners.forEach(function (s) {
      pending += s.left;
      if (s.left <= 0) return;
      s.timer -= dt;
      // a door lights up SIREN_LEAD seconds before its own next pack, so the
      // warning always tracks a real, specific upcoming spawn instead of
      // blazing for the whole wave regardless of what's actually due
      if (s.burstLeft <= 0 && !s.nextDoor && s.timer <= SIREN_LEAD) s.nextDoor = pickDoor();
      if (s.nextDoor) wm.sirens[s.nextDoor.dir] = Math.max(wm.sirens[s.nextDoor.dir] || 0, Math.max(s.timer, 0));
      if (s.timer <= 0) {
        // zombies arrive in PACKS: a burst pours from one door, then that
        // group goes quiet before the next pack picks a (maybe different)
        // door — no steady conveyor feeding one big blob
        if (s.burstLeft <= 0) {
          s.burstLeft = Math.min(s.burst, s.left);
          s.burstDoor = s.nextDoor || pickDoor();
          s.nextDoor = null;
          // an immediate, stronger puff right as a pack starts — the ambient
          // trickle (main.js) alone can get outrun by a fast type (a
          // sprinter clears it before it reads as "smoke happened")
          if (DA.onBurstStart) DA.onBurstStart(s.burstDoor);
        }
        s.burstLeft--; s.left--;
        var makeElite;
        if (wm.eliteBudget > 0 && Math.random() < 0.12) { makeElite = true; wm.eliteBudget--; }
        else makeElite = Math.random() < (wm.eliteChance != null ? wm.eliteChance : 0.02);
        DA.spawnAtDoor(enemies, s.type, s.speed, [s.burstDoor], makeElite);
        // packs pour out fast (was 0.12s/zombie) and the quiet gap between
        // packs is much shorter (was 0.7-1.3x interval) — bigger, faster,
        // more relentless waves instead of a slow trickle
        s.timer = s.burstLeft > 0 ? 0.08 : s.interval * DA.rand(0.55, 0.85);
      }
      // keep the lamp lit exactly while this door is still actively pouring;
      // it decays on its own (top of this function) the instant that stops
      if (s.burstLeft > 0) wm.sirens[s.burstDoor.dir] = Math.max(wm.sirens[s.burstDoor.dir] || 0, 0.3);
    });
    // doors currently mid-pack — used to flash ONLY the doors zombies are
    // actually coming through right now, not the whole wave's door pool
    wm.currentSpawnDoors = wm.spawners.filter(function (s) { return s.burstLeft > 0; })
                                       .map(function (s) { return s.burstDoor; });
    if (pending === 0 && enemies.length === 0) {   // wave cleared
      wm.wave++;
      wm.spawners = null;
      wm.activeDoors = null;
      // cut way down so the next wave picks up almost immediately instead of
      // a visible dead-air gap. Still nonzero: the siren-warn check above
      // fires as soon as this is <= SIREN_LEAD, so a short beat still
      // telegraphs "more incoming" before it hits.
      wm.betweenTimer = 0.5;
      if (!wm.room.endless && wm.wave >= wm.room.waves.length) wm.done = true;
      // the crowd pops for every wave, not just the last one — the
      // room-clear cheer (main.js) already covers wm.done, so skip here
      // to avoid firing twice back to back on the room's final wave
      if (!wm.done && DA.audio && DA.audio.cheer) DA.audio.cheer();
    }
  };
})();
