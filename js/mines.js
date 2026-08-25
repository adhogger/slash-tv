(function () {
  // Buried landmines: a hidden hazard that shows up more as the difficulty
  // ramps up (later episodes, deeper rooms). A subtle raised plate with a
  // slow-blinking light — easy to miss if you're not looking, same "always
  // give SOME tell" rule as everything else that can hurt the player. Step
  // in range and it arms for a beat (fast blink, a real chance to back off)
  // before it goes off, denting anyone nearby and splashing zombies too —
  // same "environmental blast hurts everyone in range" rule as a rocket.
  function mineCountFor(room) {
    if (!room || room.boss || !room.decor) return 0;
    var ep = room.ep === 'syn' ? 2 : (room.ep || 1);
    var depth = room.map ? (room.map.x + room.map.y) : 0;
    return DA.clamp(2 + Math.floor((ep - 1) * 3.2 + depth * 1.1), 0, 10);
  }
  DA.spawnMines = function (st) {
    var n = mineCountFor(st.room);
    var A = DA.ARENA;
    st.mines = [];
    for (var i = 0; i < n; i++) {
      st.mines.push({ x: DA.rand(A.x0 + 100, A.x1 - 100), y: DA.rand(A.y0 + 100, A.y1 - 100),
                      armT: 0, blown: false });
    }
  };
  function blowMine(st, m) {
    m.blown = true;
    if (DA.burst) { DA.burst(m.x, m.y, '#ff8a3d', 26); DA.burst(m.x, m.y, '#2a2a2a', 14); }
    if (DA.shockwave) DA.shockwave(m.x, m.y, 90);
    if (DA.addShake) DA.addShake(14);
    if (DA.audio) DA.audio.roar();
    var ps = st.players || [st.player];
    for (var pc = 0; pc < ps.length; pc++) {
      var pl = ps[pc];
      if (pl.downed || pl.invuln > 0) continue;
      if (!DA.circleHit(m.x, m.y, 60, pl.x, pl.y, pl.r)) continue;
      pl.hearts--; pl.invuln = 1.5;
      if (!pl.bot && DA.comboHit) DA.comboHit(st);
      if (DA.onPlayerHurt) DA.onPlayerHurt({ player: pl }, m.x, m.y);
    }
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (e.isBoss || DA.dist2(m.x, m.y, e.x, e.y) >= 90 * 90) continue;
      e.hp -= 3;
      e.hitFlash = 0.12;
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;
      if (DA.onKill) DA.onKill(st, e);
      if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y);   // chain reaction, same as any other kill
      if (e.type === 'brute' && DA.bruteGore) DA.bruteGore(st, e.x, e.y);
    }
  }
  DA.updateMines = function (st, dt) {
    if (!st.mines || !st.mines.length) return;
    var ps = st.players || [st.player];
    for (var i = st.mines.length - 1; i >= 0; i--) {
      var m = st.mines[i];
      if (m.blown) { st.mines.splice(i, 1); continue; }
      if (m.armT > 0) {
        m.armT -= dt;
        if (m.armT <= 0) blowMine(st, m);
        continue;
      }
      var armed = false;
      for (var pc = 0; pc < ps.length; pc++) {
        var pl = ps[pc];
        if (pl.downed) continue;
        if (DA.circleHit(m.x, m.y, 15, pl.x, pl.y, pl.r)) { armed = true; break; }
      }
      if (!armed) {
        for (var ei = 0; ei < st.enemies.length; ei++) {
          var e = st.enemies[ei];
          if (e.isBoss) continue;           // immune to mines entirely, same as the blast itself
          if (DA.circleHit(m.x, m.y, 15, e.x, e.y, e.r)) { armed = true; break; }
        }
      }
      if (armed) m.armT = 0.22;
    }
  };
  DA.drawMines = function (ctx, st) {
    if (!st.mines) return;
    for (var i = 0; i < st.mines.length; i++) {
      var m = st.mines[i];
      var armed = m.armT > 0;
      ctx.save();
      ctx.translate(m.x, m.y);
      // neon glow underneath the plate — cyan idle, red once armed (matches
      // the blink light's own colour swap, just visible before you're close
      // enough to see the light itself)
      var glowColor = armed ? '255, 59, 59' : '47, 215, 196';
      var glowPulse = 0.5 + Math.sin(performance.now() / (armed ? 90 : 260)) * 0.5;
      ctx.fillStyle = 'rgba(' + glowColor + ', ' + (0.08 + glowPulse * 0.1).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(' + glowColor + ', ' + (0.18 + glowPulse * 0.14).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(20, 20, 22, 0.55)';
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, 13, 13, 8, 0.39);   // octagon, not hexagon
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
      ctx.stroke();
      var blink = armed ? Math.floor(m.armT * 20) % 2 === 0 : Math.floor(performance.now() / 500) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b3b' : 'rgba(120, 30, 30, 0.5)';
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 7); ctx.fill();
      ctx.restore();
    }
  };
})();
