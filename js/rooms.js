(function () {
  // Episode 1: 8 rooms. Each wave = { doors: how many spawn doors are active,
  // groups: [{ type, count, interval, speed? }] }. interval = seconds between
  // single spawns; speed overrides the type's base speed for that group.
  DA.START_ROOM = 'studio1';
  DA.ROOMS = {
    studio1: {
      name: 'STUDIO 1', floor: '#1c1c26',
      exits: { E: 'greenroom', S: 'makeup' },
      waves: [
        { doors: 1, groups: [{ type: 'shambler', count: 120,  interval: 0.08 }] },
        { doors: 2, groups: [{ type: 'shambler', count: 165, interval: 0.07 }] }
      ]
    },
    greenroom: {
      name: 'THE GREEN ROOM', floor: '#1a2119',
      exits: { E: 'props', S: 'cafeteria' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 120,  interval: 0.08 },
                             { type: 'swarmer',  count: 24, interval: 0.5 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 150, interval: 0.07 },
                             { type: 'swarmer',  count: 40, interval: 0.35 }] }
      ]
    },
    makeup: {
      name: 'MAKEUP', floor: '#221a20',
      exits: { E: 'cafeteria', S: 'props' },
      waves: [
        { doors: 2, groups: [{ type: 'shambler', count: 135,  interval: 0.08 },
                             { type: 'sprinter', count: 12, interval: 2.0, speed: 110 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 165, interval: 0.06 },
                             { type: 'sprinter', count: 18, interval: 1.6, speed: 130 }] }
      ]
    },
    props: {
      name: 'PROP DEPARTMENT', floor: '#20201a',
      exits: { S: 'controlroom', E: 'editing' },
      waves: [
        { doors: 3, groups: [{ type: 'swarmer',  count: 60, interval: 0.25 },
                             { type: 'sprinter', count: 16, interval: 1.8, speed: 130 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 150, interval: 0.06 },
                             { type: 'swarmer',  count: 50, interval: 0.3 },
                             { type: 'sprinter', count: 16, interval: 1.5, speed: 140 }] }
      ]
    },
    cafeteria: {
      name: 'STAFF CAFETERIA', floor: '#1a1f22',
      exits: { E: 'controlroom', N: 'editing' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 150, interval: 0.07 },
                             { type: 'brute',    count: 4,  interval: 8 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 160, interval: 0.07 },
                             { type: 'brute',    count: 6,  interval: 7 },
                             { type: 'sprinter', count: 16, interval: 1.5, speed: 145 }] }
      ]
    },
    editing: {
      name: 'EDITING BAY', floor: '#1d1a22',
      exits: { E: 'stage', S: 'controlroom' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 140, interval: 0.07 },
                             { type: 'swarmer',  count: 50, interval: 0.3 },
                             { type: 'sprinter', count: 20, interval: 1.4, speed: 155 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 170, interval: 0.06 },
                             { type: 'brute',    count: 6,  interval: 6 },
                             { type: 'sprinter', count: 24, interval: 1.2, speed: 155 }] }
      ]
    },
    controlroom: {
      name: 'CONTROL ROOM', floor: '#221d1a',
      exits: { E: 'stage', N: 'editing' },
      waves: [
        { doors: 3, groups: [{ type: 'shambler', count: 120, interval: 0.08 },
                             { type: 'swarmer',  count: 30, interval: 0.35 },
                             { type: 'sprinter', count: 20, interval: 1.3, speed: 165 }] },
        { doors: 3, groups: [{ type: 'shambler', count: 150, interval: 0.07 },
                             { type: 'brute',    count: 5,  interval: 5 },
                             { type: 'sprinter', count: 24, interval: 1.1, speed: 170 }] }
      ]
    },
    stage: {
      name: 'SOUND STAGE 5', floor: '#241a1a',
      exits: {},
      boss: true,
      waves: []
    }
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
             betweenTimer: 2, done: room.waves.length === 0 };
  };
  function startWave(wm) {
    var wave = wm.room.waves[wm.wave];
    wm.activeDoors = shuffled(DA.DOORS).slice(0, DA.clamp(wave.doors || 4, 1, 4));
    wm.spawners = wave.groups.map(function (g) {
      return { type: g.type, left: g.count, interval: g.interval, speed: g.speed, timer: 0.5 };
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
      if (s.timer <= 0) { s.timer = s.interval; s.left--; DA.spawnAtDoor(enemies, s.type, s.speed, wm.activeDoors); }
    });
    if (pending === 0 && enemies.length === 0) {   // wave cleared
      wm.wave++;
      wm.spawners = null;
      wm.activeDoors = null;
      wm.betweenTimer = 2.5;
      if (wm.wave >= wm.room.waves.length) wm.done = true;
    }
  };
})();
