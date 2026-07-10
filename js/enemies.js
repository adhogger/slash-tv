(function () {
  var TYPES = {
    shambler: { r: 12, speed: 60,  hp: 2,  score: 100, color: '#6fae5c' },
    sprinter: { r: 12, speed: 180, hp: 1,  score: 250, color: '#c95d63' },
    swarmer:  { r: 7,  speed: 110, hp: 1,  score: 50,  color: '#5bc8d6' },
    brute:    { r: 20, speed: 40,  hp: 10, score: 500, color: '#9b6bb3' }
  };
  // 4 spawn doors, one per wall; dir names match room exit directions
  DA.DOORS = [
    { dir: 'N', x: DA.W / 2, y: 20 }, { dir: 'S', x: DA.W / 2, y: DA.H - 20 },
    { dir: 'W', x: 20, y: DA.H / 2 }, { dir: 'E', x: DA.W - 20, y: DA.H / 2 }
  ];
  DA.doorByDir = function (dir) {
    for (var i = 0; i < DA.DOORS.length; i++) if (DA.DOORS[i].dir === dir) return DA.DOORS[i];
    return null;
  };
  DA.makeEnemy = function (type, x, y, speed) {
    var t = TYPES[type];
    return { type: type, x: x, y: y, r: t.r, speed: speed || t.speed, hp: t.hp,
             score: t.score, color: t.color, wobble: Math.random() * 6.28 };
  };
  // doors: optional array of door objects to spawn from (staggered-door waves)
  // Fresh spawns get a short "emerging" grace: they can be shot but can't hurt
  // the player, so walking past a door isn't an instant ambush.
  DA.SPAWN_GRACE = 0.6;
  DA.spawnAtDoor = function (arr, type, speed, doors) {
    var pool = (doors && doors.length) ? doors : DA.DOORS;
    var d = pool[Math.floor(Math.random() * pool.length)];
    var e = DA.makeEnemy(type, d.x + DA.rand(-30, 30), d.y + DA.rand(-30, 30), speed);
    e.grace = DA.SPAWN_GRACE;
    arr.push(e);
  };
  DA.updateEnemies = function (arr, player, dt) {
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (e.grace > 0) e.grace -= dt;
      if (e.isBoss) continue; // the boss moves itself (js/boss.js)
      var v = DA.norm(player.x - e.x, player.y - e.y);
      e.wobble += dt * 5;
      e.x += (v.x + Math.cos(e.wobble) * 0.25) * e.speed * dt;
      e.y += (v.y + Math.sin(e.wobble) * 0.25) * e.speed * dt;
      DA.clampToArena(e);
    }
    // separation: overlapping zombies push each other apart so hordes stay readable
    for (var a = 0; a < arr.length; a++) {
      for (var b = a + 1; b < arr.length; b++) {
        var ea = arr[a], eb = arr[b];
        if (ea.isBoss || eb.isBoss) continue;
        if (!DA.circleHit(ea.x, ea.y, ea.r, eb.x, eb.y, eb.r)) continue;
        var away = DA.norm(eb.x - ea.x, eb.y - ea.y);
        if (away.len === 0) { away.x = Math.cos(ea.wobble); away.y = Math.sin(ea.wobble); }
        var push = (ea.r + eb.r - away.len) / 2;
        ea.x -= away.x * push; ea.y -= away.y * push;
        eb.x += away.x * push; eb.y += away.y * push;
        DA.clampToArena(ea); DA.clampToArena(eb);
      }
    }
    // player wall: zombies press against the player's edge but can never merge
    // with it (a merged zombie would sit behind the bullet spawn point and be unhittable)
    for (var k = 0; k < arr.length; k++) {
      var ez = arr[k];
      var minD = player.r + ez.r;
      var out = DA.norm(ez.x - player.x, ez.y - player.y);
      if (out.len >= minD) continue;
      if (out.len === 0) { out.x = Math.cos(ez.wobble); out.y = Math.sin(ez.wobble); }
      ez.x = player.x + out.x * minD;
      ez.y = player.y + out.y * minD;
      DA.clampToArena(ez);
    }
  };
  DA.drawEnemies = function (ctx, arr) {
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (e.isBoss) { if (DA.drawBoss) DA.drawBoss(ctx, e); continue; }
      if (e.grace > 0) ctx.globalAlpha = 0.45; // emerging from the door, harmless
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; // dead eyes, scaled to body size
      var eye = e.r * 0.28, off = e.r * 0.38;
      ctx.fillRect(e.x - off - eye / 2, e.y - e.r * 0.25, eye, eye);
      ctx.fillRect(e.x + off - eye / 2, e.y - e.r * 0.25, eye, eye);
      ctx.globalAlpha = 1;
    }
  };
})();
