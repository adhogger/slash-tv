(function () {
  // THE PRODUCER — struts along the top of the stage barking orders.
  // Phase 1: radial flash bursts + shambler minions.
  // Phase 2 (under 50% hp): faster bursts, aimed 3-shot spreads, sprinter minions.
  DA.makeBoss = function () {
    return { id: DA.newId(), type: 'producer', isBoss: true, name: 'THE PRODUCER',
             x: DA.W / 2, y: 190, r: 38,
             speed: 80, hp: 320, maxHp: 320, score: 10000, color: '#d4a017',
             wobble: 0, burstT: 2.5, aimedT: 2, minionT: 6 };
  };

  // EPISODE 2 BOSS: THE EXECUTIVE — teleports around the suite, arrives with a
  // bullet ring, snipes 5-shot fans; phase 2 adds a rotating spiral + stalkers.
  DA.makeExecutive = function () {
    return { id: DA.newId(), type: 'executive', isBoss: true, name: 'THE EXECUTIVE',
             x: DA.W / 2, y: 200, r: 34, hp: 380, maxHp: 380, score: 20000,
             color: '#7a8aff', wobble: 0, teleportT: 3.5, fanT: 2.2,
             spiralT: 0, spiralA: 0, minionT: 7 };
  };
  DA.updateExecutive = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    b.wobble += dt;
    b.x += Math.sin(b.wobble * 0.9) * 40 * dt;
    b.teleportT -= dt;
    if (b.teleportT <= 0) {
      b.teleportT = phase === 2 ? 2.8 : 4;
      if (DA.burst) DA.burst(b.x, b.y, b.color, 18);   // vanish puff
      b.x = DA.rand(220, DA.W - 220);
      b.y = DA.rand(140, 320);
      if (DA.burst) DA.burst(b.x, b.y, b.color, 18);   // arrival puff
      if (DA.audio) DA.audio.roar();
      for (var i = 0; i < 10; i++) {                   // arrival ring
        var a = (i / 10) * 6.283;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
      }
    }
    b.fanT -= dt;
    if (b.fanT <= 0) {
      b.fanT = phase === 2 ? 1.6 : 2.2;
      var at = Math.atan2(tp.y - b.y, tp.x - b.x);
      [-0.3, -0.15, 0, 0.15, 0.3].forEach(function (off) {
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at + off), Math.sin(at + off));
      });
    }
    if (phase === 2) {
      b.spiralT -= dt;
      if (b.spiralT <= 0) {                            // rotating bullet spiral
        b.spiralT = 0.15;
        b.spiralA += 0.55;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(b.spiralA), Math.sin(b.spiralA));
      }
      b.minionT -= dt;
      if (b.minionT <= 0) {
        b.minionT = 8;
        DA.spawnAtDoor(st.enemies, 'stalker');
        DA.spawnAtDoor(st.enemies, 'stalker');
        if (DA.announce) DA.announce('LEGAL WILL HEAR ABOUT THIS!');
      }
    } else {
      b.minionT -= dt;
      if (b.minionT <= 0) {
        b.minionT = 9;
        for (var m = 0; m < 3; m++) DA.spawnAtDoor(st.enemies, 'shambler');
      }
    }
    DA.clampToArena(b);
  };
  // EPISODE 3 BOSS: THE ALGORITHM — no human left to fire. A hovering
  // camera-drone that predicts where you're running and lasers the line,
  // while the studio's own hazards keep burning around it.
  DA.makeAlgorithm = function () {
    return { id: DA.newId(), type: 'algorithm', isBoss: true, name: 'THE ALGORITHM',
             x: DA.W / 2, y: 200, r: 36, hp: 460, maxHp: 460, score: 35000, color: '#2fd7c4',
             wobble: Math.random() * 6.283, driftT: 0,
             laserPhase: 'idle', laserT: 2.5, laserAngle: 0,
             ringT: 4, spiralT: 0, spiralA: 0, minionT: 6 };
  };
  var ALGO_LASER_LEN = 1100, ALGO_LASER_HALF_WIDTH = 0.05;
  DA.updateAlgorithm = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    // erratic hover: drifts toward a fresh random point every couple of seconds
    b.driftT -= dt;
    if (b.driftT <= 0) {
      b.driftT = 1.6 + Math.random() * 1.4;
      b.tx = DA.rand(180, DA.W - 180); b.ty = DA.rand(120, 340);
    }
    b.x += DA.clamp((b.tx || b.x) - b.x, -1, 1) * 70 * dt;
    b.y += DA.clamp((b.ty || b.y) - b.y, -1, 1) * 70 * dt;
    b.wobble += dt * 3;
    DA.clampToArena(b);

    // predictive laser: telegraphs where the target IS HEADING, not where they are
    b.laserT -= dt;
    if (b.laserPhase === 'idle' && b.laserT <= 0) {
      b.laserPhase = 'warn'; b.laserT = phase === 2 ? 0.6 : 0.9;
      var lead = 0.5;
      var px = tp.x + (tp.vx || 0) * lead, py = tp.y + (tp.vy || 0) * lead;
      b.laserAngle = Math.atan2(py - b.y, px - b.x);
    } else if (b.laserPhase === 'warn' && b.laserT <= 0) {
      b.laserPhase = 'fire'; b.laserT = 0.35;
      if (DA.audio) DA.audio.roar();
    } else if (b.laserPhase === 'fire') {
      if (b.laserT > 0) {
        var la = b.laserAngle;
        var ps = st.players || [st.player];
        for (var i = 0; i < ps.length; i++) {
          var pl = ps[i];
          if (!pl || pl.hearts <= 0 || pl.downed || pl.invuln > 0) continue;
          var d = Math.sqrt(DA.dist2(b.x, b.y, pl.x, pl.y));
          if (d > ALGO_LASER_LEN) continue;
          var a = Math.atan2(pl.y - b.y, pl.x - b.x);
          var diff = a - la;
          while (diff > Math.PI) diff -= 6.28318;
          while (diff < -Math.PI) diff += 6.28318;
          if (Math.abs(diff) < ALGO_LASER_HALF_WIDTH) {
            pl.hearts--; pl.invuln = 1.2;
            if (DA.resetCombo) DA.resetCombo(st);
            if (DA.onPlayerHurt) DA.onPlayerHurt(st, b.x, b.y);
          }
        }
      }
      if (b.laserT <= 0) { b.laserPhase = 'idle'; b.laserT = phase === 2 ? 1.8 : 2.6; }
    }

    b.ringT -= dt;
    if (b.ringT <= 0) {
      b.ringT = phase === 2 ? 3 : 4.5;
      var n = phase === 2 ? 14 : 9;
      for (var r = 0; r < n; r++) {
        var ra = (r / n) * 6.283;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(ra), Math.sin(ra));
      }
    }
    if (phase === 2) {
      b.spiralT -= dt;
      if (b.spiralT <= 0) {
        b.spiralT = 0.14;
        b.spiralA += 0.5;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(b.spiralA), Math.sin(b.spiralA));
      }
    }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      b.minionT = phase === 2 ? 6 : 8;
      DA.spawnAtDoor(st.enemies, 'stalker');
      if (phase === 2) DA.spawnAtDoor(st.enemies, 'swarmer');
      if (DA.announce) DA.announce('NO NOTES. JUST MORE EXTRAS.');
    }
  };
  DA.drawAlgorithm = function (ctx, b) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 46, b.r * 0.8, b.r * 0.28, 0, 0, 7); ctx.fill();
    // predictive-laser telegraph / beam, drawn before the drone so it reads as "from" it
    if (b.laserPhase === 'fire') {
      ctx.fillStyle = 'rgba(120, 255, 235, 0.4)';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, ALGO_LASER_LEN, b.laserAngle - ALGO_LASER_HALF_WIDTH, b.laserAngle + ALGO_LASER_HALF_WIDTH);
      ctx.closePath(); ctx.fill();
    } else if (b.laserPhase === 'warn') {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.laserAngle);
      ctx.strokeStyle = 'rgba(120, 255, 235, ' + (0.3 + Math.sin(performance.now() / 50) * 0.25) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ALGO_LASER_LEN, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(b.wobble) * 6);
    ctx.fillStyle = '#181c22';                        // drone chassis
    ctx.beginPath(); ctx.ellipse(0, 0, b.r, b.r * 0.72, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(47, 215, 196, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = b.color;                          // the lens — always watching
    ctx.beginPath(); ctx.arc(0, 0, b.r * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath(); ctx.arc(0, 0, b.r * 0.18, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-b.r * 0.08, -b.r * 0.08, b.r * 0.06, 0, 7); ctx.fill();
    for (var wi = -1; wi <= 1; wi += 2) {              // rotor arms
      ctx.fillStyle = '#22262e';
      ctx.fillRect(wi * b.r * 0.75 - 6, -3, 12, 6);
      ctx.beginPath(); ctx.arc(wi * b.r * 1.1, 0, 8, 0, 7); ctx.fill();
    }
    ctx.restore();
  };
  DA.bossPhase = function (b) { return b.hp <= b.maxHp / 2 ? 2 : 1; };
  DA.updateBoss = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    // strut horizontally toward the nearest contestant's column, bob vertically
    var want = DA.clamp(tp.x, 200, DA.W - 200);
    b.x += DA.clamp(want - b.x, -1, 1) * b.speed * (phase === 2 ? 1.5 : 1) * dt;
    b.wobble += dt;
    b.y = 190 + Math.sin(b.wobble * 1.7) * 40;
    DA.clampToArena(b);

    b.burstT -= dt;
    if (b.burstT <= 0) {
      b.burstT = phase === 2 ? 1.9 : 3.0;
      var n = phase === 2 ? 16 : 10;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.283 + DA.rand(0, 0.3);
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
      }
      if (DA.audio) DA.audio.roar();
    }
    if (phase === 2) {
      b.aimedT -= dt;
      if (b.aimedT <= 0) {
        b.aimedT = 1.6;
        var at = Math.atan2(tp.y - b.y, tp.x - b.x);
        [-0.18, 0, 0.18].forEach(function (off) {
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at + off), Math.sin(at + off));
        });
      }
    }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      b.minionT = phase === 2 ? 6 : 8;
      for (var m = 0; m < 3; m++) DA.spawnAtDoor(st.enemies, 'shambler');
      if (phase === 2) DA.spawnAtDoor(st.enemies, 'sprinter', 170);
      if (DA.announce) DA.announce('GET ME MORE EXTRAS!');
    }
  };
  DA.drawBoss = function (ctx, b) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';               // grounding shadow
    ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.85, b.r * 0.95, b.r * 0.36, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color;                          // body
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f2f2e9';                        // shirt
    ctx.beginPath(); ctx.arc(0, b.r * 0.35, b.r * 0.5, 0, 7); ctx.fill();
    if (b.type === 'executive') {
      ctx.fillStyle = '#d4a017';                      // gold tie
      ctx.fillRect(-4, b.r * 0.1, 8, b.r * 0.7);
      ctx.fillStyle = '#111';                         // visor
      ctx.fillRect(-b.r * 0.6, -b.r * 0.32, b.r * 1.2, b.r * 0.26);
      ctx.fillStyle = '#22222c';                      // phone at ear
      ctx.fillRect(b.r * 0.65, -b.r * 0.35, 7, b.r * 0.6);
    } else {
      ctx.fillStyle = '#8c1c2c';                      // power tie
      ctx.fillRect(-4, b.r * 0.1, 8, b.r * 0.7);
      ctx.fillStyle = '#111';                         // sunglasses
      ctx.fillRect(-b.r * 0.62, -b.r * 0.3, b.r * 0.5, b.r * 0.26);
      ctx.fillRect(b.r * 0.12, -b.r * 0.3, b.r * 0.5, b.r * 0.26);
      ctx.fillRect(-b.r * 0.15, -b.r * 0.24, b.r * 0.3, 4);
    }
    ctx.restore();
  };
  DA.drawBossBar = function (ctx, b) {
    var w = 420, h = 14, x = (DA.W - w) / 2, y = 46;
    ctx.fillStyle = 'rgba(10,10,15,0.7)';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DA.bossPhase(b) === 2 ? '#d43a4b' : '#d4a017';
    ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), h);
    ctx.fillStyle = '#f2f2e9';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.name || 'THE PRODUCER', DA.W / 2, y - 8);
  };
})();
