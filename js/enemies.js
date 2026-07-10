(function () {
  var TYPES = {
    shambler: { r: 12, speed: 60,  hp: 2,  score: 100, color: '#6fae5c' },
    sprinter: { r: 12, speed: 180, hp: 1,  score: 250, color: '#c95d63' },
    swarmer:  { r: 7,  speed: 110, hp: 1,  score: 50,  color: '#5bc8d6' },
    brute:    { r: 20, speed: 40,  hp: 10, score: 500, color: '#9b6bb3' },
    boomer:   { r: 14, speed: 80,  hp: 3,  score: 300, color: '#e8843c' },
    stalker:  { r: 11, speed: 85,  hp: 2,  score: 350, color: '#6c5b9e' }
  };
  // Stalkers cycle: 1.2s visible, 0.8s near-invisible — and they sprint while faint.
  DA.stalkerFaint = function (e) { return (e.phaseT || 0) > 1.2; };
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
      var sp = e.speed;
      if (e.type === 'stalker') {
        e.phaseT = ((e.phaseT == null ? Math.random() * 2 : e.phaseT) + dt) % 2;
        if (DA.stalkerFaint(e)) sp *= 1.5;
      }
      var v = DA.norm(player.x - e.x, player.y - e.y);
      e.wobble += dt * 5;
      e.x += (v.x + Math.cos(e.wobble) * 0.25) * sp * dt;
      e.y += (v.y + Math.sin(e.wobble) * 0.25) * sp * dt;
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
  // Boomers light a 0.8s fuse near the player, then detonate. Called from the
  // main loop (needs the full game state for score/combo/effects).
  var FUSE_RANGE = 80, BLAST_RADIUS = 95, FUSE_TIME = 0.8, BLAST_DMG = 3;
  DA.updateBoomers = function (st, dt) {
    var due = [];
    for (var i = 0; i < st.enemies.length; i++) {
      var e = st.enemies[i];
      if (e.type !== 'boomer') continue;
      if (e.fuse == null) {
        if (!(e.grace > 0) &&
            DA.dist2(e.x, e.y, st.player.x, st.player.y) < FUSE_RANGE * FUSE_RANGE) {
          e.fuse = FUSE_TIME;
        }
      } else {
        e.fuse -= dt;
        if (e.fuse <= 0) due.push(e);
      }
    }
    for (var d = 0; d < due.length; d++) {
      var idx = st.enemies.indexOf(due[d]);
      if (idx === -1) continue;                 // already chain-detonated
      st.enemies.splice(idx, 1);
      DA.boomerBlast(st, due[d].x, due[d].y);
    }
  };
  DA.boomerBlast = function (st, x, y) {
    if (DA.burst) DA.burst(x, y, '#e8843c', 26);
    if (DA.splat) DA.splat(x, y);
    if (DA.addShake) DA.addShake(12);
    if (DA.audio) DA.audio.roar();
    var p = st.player;
    if (DA.dist2(x, y, p.x, p.y) < BLAST_RADIUS * BLAST_RADIUS &&
        p.invuln <= 0 && !(p.shieldT > 0)) {
      p.hearts--;
      p.invuln = 1.5;
      if (DA.resetCombo) DA.resetCombo(st);
      if (DA.onPlayerHurt) DA.onPlayerHurt(st);
    }
    for (var i = st.enemies.length - 1; i >= 0; i--) {   // chain damage
      var e = st.enemies[i];
      if (e.isBoss) continue;
      if (DA.dist2(x, y, e.x, e.y) >= BLAST_RADIUS * BLAST_RADIUS) continue;
      e.hp -= BLAST_DMG;
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;                               // blast kills: no combo bump
      if (DA.onKill) DA.onKill(st, e);
      if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y); // chain reaction!
    }
  };
  DA.drawEnemies = function (ctx, arr) {
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (e.isBoss) { if (DA.drawBoss) DA.drawBoss(ctx, e); continue; }
      if (e.grace > 0) ctx.globalAlpha = 0.45; // emerging from the door, harmless
      else if (e.type === 'stalker' && DA.stalkerFaint(e)) ctx.globalAlpha = 0.18;
      var lit = e.fuse != null && Math.floor(e.fuse * 12) % 2 === 0;
      ctx.fillStyle = lit ? '#fff3b0' : e.color; // fuse lit: strobe warning
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; // dead eyes, scaled to body size
      var eye = e.r * 0.28, off = e.r * 0.38;
      ctx.fillRect(e.x - off - eye / 2, e.y - e.r * 0.25, eye, eye);
      ctx.fillRect(e.x + off - eye / 2, e.y - e.r * 0.25, eye, eye);
      ctx.globalAlpha = 1;
    }
  };
})();
