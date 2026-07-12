(function () {
  // EPISODE 3 environmental hazards: the studio itself is trying to kill you.
  // Two kinds, combinable per room via room.hazard: 'crane' (a rotating
  // camera-crane beam that periodically flares into a damaging sweep) and
  // 'pyro' (fixed floor rigs that warn, then burn). Positions are derived
  // deterministically from the room id, so a room's danger pattern is fixed
  // but distinct from its neighbours — and identical for both co-op seats.
  var CRANE_BEAM_LEN = 900, CRANE_HALF_WIDTH = 0.17; // radians

  function hazardState(st) {
    if (st.hazards && st.hazards.roomId === st.roomId) return st.hazards;
    var kind = st.room && st.room.hazard;
    var hz = { roomId: st.roomId, cranes: [], pyros: [] };
    if (!kind) { st.hazards = hz; return hz; }
    var rng = DA.makeRng(DA.hashSeed(st.roomId + ':hazard'));
    var A = DA.ARENA;
    if (kind === 'crane' || kind === 'crane_pyro') {
      var n = kind === 'crane_pyro' ? 1 : 2;
      for (var i = 0; i < n; i++) {
        hz.cranes.push({
          x: A.x0 + 100 + rng() * (A.x1 - A.x0 - 200),
          y: A.y0 + 100 + rng() * (A.y1 - A.y0 - 200),
          angle: rng() * 6.283, angVel: (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 0.35),
          flareT: 3.2 + rng() * 1.8, phase: 'idle', phaseT: 2 + rng() * 2
        });
      }
    }
    if (kind === 'pyro' || kind === 'crane_pyro') {
      var m = kind === 'crane_pyro' ? 3 : 5;
      for (var j = 0; j < m; j++) {
        hz.pyros.push({
          x: A.x0 + 90 + rng() * (A.x1 - A.x0 - 180),
          y: A.y0 + 90 + rng() * (A.y1 - A.y0 - 180),
          r: 46, cycle: 3.5 + rng() * 2, phase: 'idle', phaseT: 1.5 + rng() * 3
        });
      }
    }
    st.hazards = hz;
    return hz;
  }
  DA.hazardState = hazardState; // exposed for tests

  function hitPlayers(st, test, sx, sy) {
    var ps = st.players || [st.player];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!p || p.hearts <= 0 || p.downed || p.invuln > 0) continue;
      if (test(p)) {
        p.hearts--; p.invuln = 1.2;
        if (DA.resetCombo) DA.resetCombo(st);
        if (DA.onPlayerHurt) DA.onPlayerHurt(st, sx, sy);
        if (DA.addShake) DA.addShake(8);
      }
    }
  }

  DA.updateHazards = function (st, dt) {
    if (!st.room || !st.room.hazard) return;
    var hz = hazardState(st);
    var i, c, p;
    for (i = 0; i < hz.cranes.length; i++) {
      c = hz.cranes[i];
      c.angle += c.angVel * dt;
      c.phaseT -= dt;
      if (c.phase === 'idle' && c.phaseT <= 0) { c.phase = 'warn'; c.phaseT = 0.9; }
      else if (c.phase === 'warn' && c.phaseT <= 0) {
        c.phase = 'fire'; c.phaseT = 0.45;
        if (DA.audio) DA.audio.roar();
      } else if (c.phase === 'fire') {
        var ca = c.angle;                     // freeze the beam's angle while firing
        hitPlayers(st, function (pl) {
          var d = Math.sqrt(DA.dist2(c.x, c.y, pl.x, pl.y));
          if (d > CRANE_BEAM_LEN) return false;
          var a = Math.atan2(pl.y - c.y, pl.x - c.x);
          var diff = a - ca;
          while (diff > Math.PI) diff -= 6.28318;
          while (diff < -Math.PI) diff += 6.28318;
          return Math.abs(diff) < CRANE_HALF_WIDTH;
        }, c.x, c.y);
        if (c.phaseT <= 0) { c.phase = 'idle'; c.phaseT = c.flareT; }
      }
    }
    for (i = 0; i < hz.pyros.length; i++) {
      p = hz.pyros[i];
      p.phaseT -= dt;
      if (p.phase === 'idle' && p.phaseT <= 0) { p.phase = 'warn'; p.phaseT = 0.8; }
      else if (p.phase === 'warn' && p.phaseT <= 0) {
        p.phase = 'burn'; p.phaseT = 0.6;
        if (DA.audio) DA.audio.roar();
      } else if (p.phase === 'burn') {
        hitPlayers(st, (function (pp) {
          return function (pl) { return DA.dist2(pl.x, pl.y, pp.x, pp.y) < pp.r * pp.r; };
        })(p), p.x, p.y);
        if (p.phaseT <= 0) { p.phase = 'idle'; p.phaseT = p.cycle; }
      }
    }
  };

  DA.drawHazards = function (ctx, st) {
    if (!st.room || !st.room.hazard) return;
    var hz = hazardState(st);
    var i, c, p;
    for (i = 0; i < hz.cranes.length; i++) {
      c = hz.cranes[i];
      if (c.phase === 'fire') {
        ctx.fillStyle = 'rgba(255, 210, 120, 0.35)';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, CRANE_BEAM_LEN, c.angle - CRANE_HALF_WIDTH, c.angle + CRANE_HALF_WIDTH);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        if (c.phase === 'warn') {
          ctx.strokeStyle = 'rgba(255, 90, 60, ' + (0.35 + Math.sin(performance.now() / 60) * 0.2) + ')';
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = 'rgba(255, 220, 140, 0.16)';
          ctx.lineWidth = 3;
        }
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(CRANE_BEAM_LEN, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#22222c';
      ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (i = 0; i < hz.pyros.length; i++) {
      p = hz.pyros[i];
      if (p.phase === 'idle') {
        ctx.fillStyle = 'rgba(120, 60, 30, 0.28)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
      } else if (p.phase === 'warn') {
        var k = 1 - p.phaseT / 0.8;
        ctx.fillStyle = 'rgba(255, 120, 40, ' + (0.22 + k * 0.35) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * (p.r - 20), 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 200, 90, 0.75)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 220, 0.6)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, 7); ctx.fill();
      }
    }
  };
})();
