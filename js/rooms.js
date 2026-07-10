(function () {
  // A wave = list of spawn groups. interval = seconds between single spawns.
  DA.ROOMS = {
    testRoom: {
      name: 'STUDIO 1',
      waves: [
        [{ type: 'shambler', count: 72,  interval: 0.08 }],
        [{ type: 'shambler', count: 90,  interval: 0.06 }, { type: 'sprinter', count: 9,  interval: 2.0, speed: 130 }],
        [{ type: 'shambler', count: 126, interval: 0.05 }, { type: 'sprinter', count: 18, interval: 1.2, speed: 180 }]
      ]
    }
  };
  DA.makeWaveManager = function (room) {
    return { room: room, wave: 0, spawners: null, betweenTimer: 2, done: false };
  };
  function startWave(wm) {
    wm.spawners = wm.room.waves[wm.wave].map(function (g) {
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
      if (s.timer <= 0) { s.timer = s.interval; s.left--; DA.spawnAtDoor(enemies, s.type, s.speed); }
    });
    if (pending === 0 && enemies.length === 0) {   // wave cleared
      wm.wave++;
      wm.spawners = null;
      wm.betweenTimer = 2.5;
      if (wm.wave >= wm.room.waves.length) wm.done = true;
    }
  };
})();
