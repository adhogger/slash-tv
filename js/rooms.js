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
        { doors: 2, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 }] }
      ]
    },
    greenroom: {
      map: { x: 1, y: 0 },
      name: 'THE GREEN ROOM', floor: '#2e352d', decor: 'lounge',
      exits: { E: 'props', S: 'cafeteria' },
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
      exits: { E: 'cafeteria' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 95, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 12, interval: 2.0, speed: 110 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 115, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 18, interval: 1.6, speed: 130 }] }
      ]
    },
    props: {
      map: { x: 2, y: 0 },
      name: 'PROP DEPARTMENT', floor: '#34342e', decor: 'crates',
      exits: { S: 'controlroom', E: 'editing' },
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
      exits: { E: 'controlroom' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 4,  interval: 8 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 6,  interval: 7 },
                             { type: 'boomer',   count: 2,  interval: 8 },
                             { type: 'sprinter', count: 16, interval: 1.5, speed: 145 }] }
      ]
    },
    editing: {
      map: { x: 3, y: 0 },
      name: 'EDITING BAY', floor: '#312e36', decor: 'desks',
      exits: { S: 'stage' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 100, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 50, interval: 1.3, burst: 5 },
                             { type: 'boomer',   count: 2,  interval: 7 },
                             { type: 'sprinter', count: 20, interval: 1.4, speed: 155 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 6,  interval: 6 },
                             { type: 'boomer',   count: 3,  interval: 6 },
                             { type: 'sprinter', count: 24, interval: 1.2, speed: 155 }] }
      ]
    },
    controlroom: {
      map: { x: 2, y: 1 },
      name: 'CONTROL ROOM', floor: '#36312e', decor: 'monitors',
      exits: { E: 'stage' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 85, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 30, interval: 1.3, burst: 5 },
                             { type: 'boomer',   count: 3,  interval: 6 },
                             { type: 'sprinter', count: 20, interval: 1.3, speed: 165 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 105, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'sprinter', count: 24, interval: 1.1, speed: 170 }] }
      ]
    },
    stage: {
      map: { x: 3, y: 1 },
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
      exits: { E: 'backlot', S: 'gallery' },
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
      ep: 2, map: { x: 2, y: 0 },
      name: 'THE BACKLOT', floor: '#36342e', decor: 'crates',
      exits: { S: 'serverroom' },
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
      exits: { E: 'serverroom' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 110, interval: 1.1, burst: 7 },
                             { type: 'swarmer',  count: 40, interval: 1.3, burst: 5 },
                             { type: 'boomer',   count: 3,  interval: 6 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 1.1, burst: 7 },
                             { type: 'stalker',  count: 4,  interval: 1.8 },
                             { type: 'boomer',   count: 4,  interval: 5 }] }
      ]
    },
    serverroom: {
      ep: 2, map: { x: 2, y: 1 },
      name: 'SERVER ROOM', floor: '#2c323a', decor: 'servers',
      exits: { E: 'suite' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 125, interval: 1.1, burst: 7 },
                             { type: 'sprinter', count: 22, interval: 1.1, speed: 180 },
                             { type: 'stalker',  count: 4,  interval: 1.8 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 135, interval: 1.1, burst: 7 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'boomer',   count: 4,  interval: 5 },
                             { type: 'sprinter', count: 24, interval: 1.0, speed: 180 }] }
      ]
    },
    suite: {
      ep: 2, map: { x: 3, y: 1 },
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
    }
  };

  // Procedural wave for the Endless Arena. n starts at 0 and never stops.
  DA.endlessWave = function (n) {
    var groups = [{ type: 'shambler', count: 45 + n * 9,
                    interval: Math.max(0.8, 1.6 - n * 0.05), burst: 7 }];
    if (n >= 1) groups.push({ type: 'swarmer', count: 10 + n * 4, interval: 1.3, burst: 5 });
    if (n >= 2) groups.push({ type: 'sprinter', count: 4 + n * 2, interval: 1.5,
                              speed: Math.min(120 + n * 5, 180) });
    if (n >= 3) groups.push({ type: 'boomer', count: 1 + Math.floor(n / 3), interval: 6 });
    if (n >= 4) groups.push({ type: 'brute', count: Math.floor(n / 2), interval: 7 });
    return { doors: Math.min(1 + Math.floor(n / 3), 3), groups: groups };
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

  DA.makeWaveManager = function (room) {
    return { room: room, wave: 0, spawners: null, activeDoors: null,
             betweenTimer: 2, done: !room.endless && room.waves.length === 0 };
  };
  function startWave(wm) {
    var wave = wm.room.endless ? DA.endlessWave(wm.wave) : wm.room.waves[wm.wave];
    wm.activeDoors = shuffled(DA.DOORS).slice(0, DA.clamp(wave.doors || 4, 1, 4));
    var coop = DA.state && DA.state.players && DA.state.players.length > 1 ? 1.4 : 1;
    wm.spawners = wave.groups.map(function (g) {
      return { type: g.type, left: Math.round(g.count * coop), interval: g.interval, speed: g.speed,
               burst: g.burst || 1, burstLeft: 0, burstDoor: null, timer: 0.5 };
    });
    if (DA.onWaveStart) DA.onWaveStart(wm.wave + 1);
  }
  DA.updateWaves = function (wm, enemies, dt) {
    if (wm.done) return;
    if (!wm.spawners) {                   // between waves
      wm.betweenTimer -= dt;
      if (wm.betweenTimer <= 0) startWave(wm);
      return;
    }
    var pending = 0;
    wm.spawners.forEach(function (s) {
      pending += s.left;
      if (s.left <= 0) return;
      s.timer -= dt;
      if (s.timer <= 0) {
        // zombies arrive in PACKS: a burst pours from one door, then that
        // group goes quiet before the next pack picks a (maybe different)
        // door — no steady conveyor feeding one big blob
        if (s.burstLeft <= 0) {
          s.burstLeft = Math.min(s.burst, s.left);
          var doors = wm.activeDoors || DA.DOORS;
          // never open a pack in the player's face if any other door is live
          var p = DA.state && DA.state.player;
          if (p) {
            var far = doors.filter(function (dd) {
              return DA.dist2(dd.x, dd.y, p.x, p.y) > 240 * 240;
            });
            if (far.length > 0) doors = far;
          }
          s.burstDoor = doors[Math.floor(Math.random() * doors.length)];
        }
        s.burstLeft--; s.left--;
        DA.spawnAtDoor(enemies, s.type, s.speed, [s.burstDoor]);
        s.timer = s.burstLeft > 0 ? 0.12 : s.interval * DA.rand(0.7, 1.3);
      }
    });
    if (pending === 0 && enemies.length === 0) {   // wave cleared
      wm.wave++;
      wm.spawners = null;
      wm.activeDoors = null;
      wm.betweenTimer = 2.5;
      if (!wm.room.endless && wm.wave >= wm.room.waves.length) wm.done = true;
    }
  };
})();
