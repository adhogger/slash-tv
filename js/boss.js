(function () {
  // THE PRODUCER — struts along the top of the stage barking orders.
  // Phase 1: radial flash bursts + shambler minions.
  // Phase 2 (under 50% hp): faster bursts, aimed 3-shot spreads, sprinter minions.
  DA.makeBoss = function () {
    return { type: 'producer', isBoss: true, name: 'THE PRODUCER',
             x: DA.W / 2, y: 190, r: 38,
             speed: 80, hp: 320, maxHp: 320, score: 10000, color: '#d4a017',
             wobble: 0, burstT: 2.5, aimedT: 2, minionT: 6 };
  };

  // EPISODE 2 BOSS: THE EXECUTIVE — teleports around the suite, arrives with a
  // bullet ring, snipes 5-shot fans; phase 2 adds a rotating spiral + stalkers.
  DA.makeExecutive = function () {
    return { type: 'executive', isBoss: true, name: 'THE EXECUTIVE',
             x: DA.W / 2, y: 200, r: 34, hp: 380, maxHp: 380, score: 20000,
             color: '#7a8aff', wobble: 0, teleportT: 3.5, fanT: 2.2,
             spiralT: 0, spiralA: 0, minionT: 7 };
  };
  DA.updateExecutive = function (b, st, dt) {
    var phase = DA.bossPhase(b);
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
      var at = Math.atan2(st.player.y - b.y, st.player.x - b.x);
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
  DA.bossPhase = function (b) { return b.hp <= b.maxHp / 2 ? 2 : 1; };
  DA.updateBoss = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    // strut horizontally toward the player's column, bob vertically
    var want = DA.clamp(st.player.x, 200, DA.W - 200);
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
        var at = Math.atan2(st.player.y - b.y, st.player.x - b.x);
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
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color;                          // body
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
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
