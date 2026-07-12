(function () {
  var TYPES = {
    shambler: { r: 12, speed: 55,  hp: 2,  score: 100, color: '#6fae5c' },
    sprinter: { r: 12, speed: 165, hp: 1,  score: 250, color: '#c95d63' },
    swarmer:  { r: 9,  speed: 100, hp: 1,  score: 50,  color: '#5bc8d6' },
    brute:    { r: 20, speed: 37,  hp: 10, score: 500, color: '#9b6bb3' },
    boomer:   { r: 14, speed: 73,  hp: 3,  score: 300, color: '#e8843c' },
    stalker:  { r: 11, speed: 78,  hp: 2,  score: 350, color: '#6c5b9e' },
    spitter:  { r: 13, speed: 50,  hp: 3,  score: 400, color: '#a8b83c' },
    gusher:   { r: 16, speed: 40,  hp: 6,  score: 650, color: '#79a832' }
  };
  // Spitters hold this range and lob bile globs instead of closing in —
  // the only non-boss ranged threat, so "walk backwards forever" stops working.
  var SPIT_RANGE = 340, SPIT_WINDUP = 0.5;
  // Stalkers cycle: 1.2s visible, 0.8s near-invisible — and they sprint while faint.
  DA.stalkerFaint = function (e) { return (e.phaseT || 0) > 1.2; };
  // 4 spawn doors, one per wall; dir names match room exit directions
  DA.DOORS = [
    { dir: 'N', x: DA.W / 2, y: 20 }, { dir: 'S', x: DA.W / 2, y: DA.H - 20 },
    { dir: 'W', x: 20, y: DA.H / 2 }, { dir: 'E', x: DA.W - 20, y: DA.H / 2 }
  ];
  // nearest player that's still on their feet (falls back to the first)
  DA.nearestPlayer = function (players, x, y) {
    var best = players[0], bd = Infinity;
    for (var i = 0; i < players.length; i++) {
      if (players[i].downed) continue;
      var d = DA.dist2(players[i].x, players[i].y, x, y);
      if (d < bd) { bd = d; best = players[i]; }
    }
    return best;
  };
  DA.doorByDir = function (dir) {
    for (var i = 0; i < DA.DOORS.length; i++) if (DA.DOORS[i].dir === dir) return DA.DOORS[i];
    return null;
  };
  // How fast each type can change direction (radians/second). Low = staggers
  // past a dodging player, Smash TV style, instead of pivoting on a dime.
  var TURN = { shambler: 1.7, sprinter: 3.2, swarmer: 3.8, brute: 1.1, boomer: 2.0, stalker: 2.6, spitter: 1.5, gusher: 1.2 };
  // Shortest-way angle steering, clamped to a max change. Pure and testable.
  DA.turnToward = function (heading, target, maxDelta) {
    var d = target - heading;
    while (d > Math.PI) d -= 6.28318;
    while (d < -Math.PI) d += 6.28318;
    return heading + DA.clamp(d, -maxDelta, maxDelta);
  };
  DA.makeEnemy = function (type, x, y, speed) {
    var t = TYPES[type];
    return { id: DA.newId(), type: type, x: x, y: y, r: t.r, speed: speed || t.speed, hp: t.hp,
             score: t.score, color: t.color, wobble: Math.random() * 6.28,
             heading: null, flank: DA.rand(-0.4, 0.4) };
  };
  // doors: optional array of door objects to spawn from (staggered-door waves)
  // Fresh spawns get a short "emerging" grace: they can be shot but can't hurt
  // the player, so walking past a door isn't an instant ambush.
  DA.SPAWN_GRACE = 0.6;
  // Elites: rare gold-ringed champions — triple hp and score, and the
  // audience ALWAYS throws a gift when one goes down (see DA.onKill).
  var ELITE_CHANCE = 0.02;
  DA.spawnAtDoor = function (arr, type, speed, doors) {
    var pool = (doors && doors.length) ? doors : DA.DOORS;
    var d = pool[Math.floor(Math.random() * pool.length)];
    var e = DA.makeEnemy(type, d.x + DA.rand(-30, 30), d.y + DA.rand(-30, 30), speed);
    e.grace = DA.SPAWN_GRACE;
    if (Math.random() < ELITE_CHANCE) {
      e.elite = true;
      e.hp *= 3;
      e.score *= 3;
      e.r = Math.round(e.r * 1.15);
    }
    arr.push(e);
  };
  // enemyBullets is optional (older tests omit it) — spitters need it to fire
  DA.updateEnemies = function (arr, player, dt, enemyBullets) {
    var players = player.length != null ? player : [player];   // object or array
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      var player = DA.nearestPlayer(players, e.x, e.y);
      if (e.grace > 0) e.grace -= dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.isBoss) continue; // the boss moves itself (js/boss.js)
      var sp = e.speed;
      if (e.grace > 0) sp *= 0.5;             // still stepping through the door
      if (e.type === 'stalker') {
        e.phaseT = ((e.phaseT == null ? Math.random() * 2 : e.phaseT) + dt) % 2;
        if (DA.stalkerFaint(e)) sp *= 1.5;
      }
      if (e.type === 'spitter' || e.type === 'gusher') {
        if (e.spitT == null) e.spitT = 2 + Math.random() * 1.5;
        if (!(e.grace > 0) && DA.dist2(e.x, e.y, player.x, player.y) < SPIT_RANGE * SPIT_RANGE) {
          sp = 0;                             // in range: plant feet and lob bile
          e.spitT -= dt;
          if (e.spitT <= 0) {
            e.spitT = (e.type === 'gusher' ? 3.4 : 2.6) + Math.random() * 1.2;
            if (enemyBullets) {
              var sa = Math.atan2(player.y - e.y, player.x - e.x);
              var fanOffs = e.type === 'gusher' ? [-0.24, 0, 0.24] : [0];  // gushers hose a fan
              for (var fo = 0; fo < fanOffs.length; fo++) {
                DA.fireEnemyBullet(enemyBullets,
                                   e.x + Math.cos(sa) * e.r, e.y + Math.sin(sa) * e.r,
                                   Math.cos(sa + fanOffs[fo]), Math.sin(sa + fanOffs[fo]),
                                   { speed: 150, color: '#b8d44a', r: e.type === 'gusher' ? 8 : 7 });
              }
              if (DA.audio) (DA.audio.spit || DA.audio.groan)();
            }
          }
        } else if (e.spitT < SPIT_WINDUP) {
          e.spitT = SPIT_WINDUP;              // target broke range: cancel the windup
        }
      }
      e.wobble += dt * 5;
      // each zombie wants the player PLUS its own flanking angle, which fades
      // out as it closes in — so the horde converges from spread directions
      var dist = Math.sqrt(DA.dist2(e.x, e.y, player.x, player.y));
      var want = Math.atan2(player.y - e.y, player.x - e.x) +
                 e.flank * DA.clamp(dist / 420, 0, 1);
      if (e.heading == null) e.heading = want;
      e.heading = DA.turnToward(e.heading, want, (TURN[e.type] || 2) * dt);
      if (e.type === 'shambler' || e.type === 'boomer') {   // lurching gait
        sp *= 0.55 + 0.75 * Math.max(0, Math.sin(e.wobble * 1.4));
      }
      e.x += Math.cos(e.heading) * sp * dt;
      e.y += Math.sin(e.heading) * sp * dt;
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
    // player wall: zombies press against each player's edge but can never merge
    // with them (a merged zombie would sit behind the bullet spawn point and be unhittable)
    for (var k = 0; k < arr.length; k++) {
      var ez = arr[k];
      for (var pw = 0; pw < players.length; pw++) {
        var pl = players[pw];
        var minD = pl.r + ez.r;
        var out = DA.norm(ez.x - pl.x, ez.y - pl.y);
        if (out.len >= minD) continue;
        if (out.len === 0) { out.x = Math.cos(ez.wobble); out.y = Math.sin(ez.wobble); }
        ez.x = pl.x + out.x * minD;
        ez.y = pl.y + out.y * minD;
        DA.clampToArena(ez);
      }
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
        var near = DA.nearestPlayer(st.players || [st.player], e.x, e.y);
        if (!(e.grace > 0) && !near.downed &&
            DA.dist2(e.x, e.y, near.x, near.y) < FUSE_RANGE * FUSE_RANGE) {
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
    var ps = st.players || [st.player];
    for (var pb = 0; pb < ps.length; pb++) {
      var p = ps[pb];
      if (p.downed) continue;
      if (DA.dist2(x, y, p.x, p.y) < BLAST_RADIUS * BLAST_RADIUS &&
          p.invuln <= 0 && !(p.shieldT > 0)) {
        p.hearts--;
        p.invuln = 1.5;
        if (!p.bot && DA.comboHit) DA.comboHit(st);   // the bot tanking doesn't cost the streak
        if (DA.onPlayerHurt) DA.onPlayerHurt({ player: p }, x, y);
      }
    }
    for (var i = st.enemies.length - 1; i >= 0; i--) {   // chain damage
      var e = st.enemies[i];
      if (e.isBoss) continue;
      if (DA.dist2(x, y, e.x, e.y) >= BLAST_RADIUS * BLAST_RADIUS) continue;
      e.hp -= BLAST_DMG;
      e.hitFlash = 0.12;
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;                               // blast kills: no combo bump
      if (DA.onKill) DA.onKill(st, e);
      if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y); // chain reaction!
    }
  };
  // Zombies render from pre-baked sprite sheets (js/sprites.js): one drawImage
  // per body instead of ~15 live canvas ops, which is what pays for the
  // sprite-level detail. Dynamic effects stay live on top of the stamp.
  DA.drawEnemies = function (ctx, arr) {
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      if (e.isBoss) {
        if (e.type === 'algorithm' && DA.drawAlgorithm) DA.drawAlgorithm(ctx, e);
        else if (DA.drawBoss) DA.drawBoss(ctx, e);
        continue;
      }
      if (e.grace > 0) ctx.globalAlpha = 0.45; // emerging from the door, harmless
      else if (e.type === 'stalker' && DA.stalkerFaint(e)) ctx.globalAlpha = 0.18;
      var h = e.heading != null ? e.heading : 0;      // face where it walks (bestiary: face right)
      var ch = Math.cos(h), sh = Math.sin(h);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';             // grounding shadow
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.85, e.r * 0.34, 0, 0, 7); ctx.fill();
      if (e.elite) {                                  // gold champion ring, always pulsing
        ctx.strokeStyle = 'rgba(232, 212, 77, ' + (0.55 + Math.sin(performance.now() / 150) * 0.25).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, 7); ctx.stroke();
      }
      if (e.type === 'stalker') {                     // wisps trailing off the back
        ctx.fillStyle = '#584a80';
        var keepA = ctx.globalAlpha;
        for (var w = 1; w <= 2; w++) {
          ctx.globalAlpha *= 0.55;
          ctx.beginPath();
          ctx.arc(e.x - ch * e.r * 0.7 * w, e.y - sh * e.r * 0.7 * w, e.r * (1 - w * 0.3), 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = keepA;
      }
      var sheet = DA.sprite && DA.sprite(e.type);
      if (sheet && sheet.world) {
        var frame = Math.floor((((e.wobble % 6.283) + 6.283) / 6.283) * DA.SPRITE_FRAMES) % DA.SPRITE_FRAMES;
        var img = e.hitFlash > 0 ? sheet.flash[frame] : sheet.frames[frame];
        var wsz = sheet.world * (e.r / sheet.baseR);  // elites stamp bigger
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(h);
        ctx.drawImage(img, -wsz / 2, -wsz / 2, wsz, wsz);
        ctx.restore();
      } else {                                        // headless / unknown type fallback
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
      }
      if (e.elite) {                                  // gold body outline on champions
        ctx.strokeStyle = '#e8d44d';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.stroke();
      }
      var lit = e.fuse != null && Math.floor(e.fuse * 12) % 2 === 0;
      if (lit) {                                      // fuse strobe washes over the body
        ctx.fillStyle = 'rgba(255, 243, 176, 0.6)';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.05, 0, 7); ctx.fill();
      }
      if (e.type === 'spitter' || e.type === 'gusher') {   // live jaw bulge while a glob winds up
        var wind = e.spitT != null && e.spitT < SPIT_WINDUP ? 1 - e.spitT / SPIT_WINDUP : 0;
        if (wind > 0) {
          var hr = e.r * 0.55;
          var hx = e.x + ch * e.r * 0.5, hy = e.y + sh * e.r * 0.5;
          ctx.fillStyle = '#b8d44a';
          ctx.beginPath();
          ctx.arc(hx + ch * hr * 0.6, hy + sh * hr * 0.6, hr * (0.35 + wind * 0.55), 0, 7);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  };
})();
