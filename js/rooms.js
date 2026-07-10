(function () {
  // A wave = list of spawn groups. interval = seconds between single spawns.
  DA.ROOMS = {
    testRoom: {
      name: 'STUDIO 1',
      waves: [
        [{ type: 'shambler', count: 8,  interval: 0.8 }],
        [{ type: 'shambler', count: 10, interval: 0.6 }, { type: 'sprinter', count: 3, interval: 2.0 }],
        [{ type: 'shambler', count: 14, interval: 0.5 }, { type: 'sprinter', count: 6, interval: 1.2 }]
      ]
    }
  };
  DA.makeWaveManager = function (room) {
    return { room: room, wave: 0, spawners: null, betweenTimer: 2, done: false };
  };
  function startWave(wm) {
    wm.spawners = wm.room.waves[wm.wave].map(function (g) {
      return { type: g.type, left: g.count, interval: g.interval, timer: 0.5 };
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
      if (s.timer <= 0) { s.timer = s.interval; s.left--; DA.spawnAtDoor(enemies, s.type); }
    });
    if (pending === 0 && enemies.length === 0) {   // wave cleared
      wm.wave++;
      wm.spawners = null;
      wm.betweenTimer = 2.5;
      if (wm.wave >= wm.room.waves.length) wm.done = true;
    }
  };
})();
