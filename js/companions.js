(function () {
  // Deployable allies: audience gifts, same drop pool as guns/boots/etc.
  // TURRET plants itself where it's picked up and holds the line. DRONE
  // hovers near whoever picked it up and follows. Both auto-target the
  // nearest live enemy and fire real DA.bullets entries — same pipeline
  // as the player and CAM-BOT, so hits/kills/combo all just work.
  var TURRET_TIME = 14, DRONE_TIME = 16, FIRE_RATE = 0.32, RANGE = 380;
  var COMPANION_GUN = { color: '#5bc8d6', dmg: 1, speed: 640, botOwned: true, label: 'TURRET' };

  DA.spawnCompanion = function (st, kind, x, y) {
    st.companions = st.companions || [];
    st.companions.push({ id: DA.newId(), kind: kind, x: x, y: y,
                          t: kind === 'turret' ? TURRET_TIME : DRONE_TIME,
                          fireT: 0, aimA: -1.57, wobble: Math.random() * 6.28 });
  };

  function nearestTarget(st, x, y) {
    var best = null, bd = RANGE * RANGE;
    for (var i = 0; i < st.enemies.length; i++) {
      var e = st.enemies[i];
      if (e.dying || (e.isBoss && e.grace > 0)) continue;
      var d2 = DA.dist2(x, y, e.x, e.y);
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  DA.updateCompanions = function (st, dt) {
    if (!st.companions || !st.companions.length) return;
    var human = (st.players || [st.player])[0];
    for (var i = st.companions.length - 1; i >= 0; i--) {
      var c = st.companions[i];
      c.t -= dt;
      if (c.t <= 0) { st.companions.splice(i, 1); continue; }
      c.wobble += dt;
      if (c.kind === 'drone') {                       // hovers just off whoever it's escorting
        var tx = human.x + Math.cos(c.wobble * 0.6) * 46, ty = human.y - 56 + Math.sin(c.wobble * 0.9) * 10;
        c.x += (tx - c.x) * Math.min(1, 3 * dt);
        c.y += (ty - c.y) * Math.min(1, 3 * dt);
      }
      c.fireT -= dt;
      var target = nearestTarget(st, c.x, c.y);
      if (target) {
        var d = DA.norm(target.x - c.x, target.y - c.y);
        c.aimA = Math.atan2(d.y, d.x);
        if (c.fireT <= 0) {
          DA.fireBullet(st.bullets, c.x, c.y, d.x, d.y, COMPANION_GUN);
          c.fireT = FIRE_RATE;
          if (DA.audio) DA.audio.shot();
        }
      }
    }
  };

  DA.drawCompanions = function (ctx, st) {
    if (!st.companions) return;
    var now = performance.now();
    for (var i = 0; i < st.companions.length; i++) {
      var c = st.companions[i];
      var blink = c.t < 2.5 && Math.floor(c.t * 6) % 2 === 0;
      var pulse = 0.5 + Math.sin(now / 260 + c.id) * 0.5;   // per-unit phase offset so a pair don't lockstep
      var neon = c.kind === 'turret' ? '91, 200, 214' : '126, 224, 129';
      // neon underglow on the floor — same layered-radius treatment as the
      // mine's glow, so the deployables read as part of the same tech
      ctx.fillStyle = 'rgba(' + neon + ', ' + (0.06 + pulse * 0.06).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(c.x, c.y + 6, 26, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(' + neon + ', ' + (0.12 + pulse * 0.1).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(c.x, c.y + 6, 15, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';                // grounding shadow, same as enemies/player
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 12, 13, 5, 0, 0, 7); ctx.fill();
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.kind === 'turret') {
        // tripod legs — dull metal, planted into the glow
        ctx.strokeStyle = '#2c333c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var lg = 0; lg < 3; lg++) {
          var la = lg / 3 * 6.283 + 0.52;
          ctx.beginPath(); ctx.moveTo(Math.cos(la) * 5, 4 + Math.sin(la) * 5);
          ctx.lineTo(Math.cos(la) * 15, 8 + Math.sin(la) * 15); ctx.stroke();
        }
        // base plate: dark gunmetal body, brushed-metal rim highlight, neon trim
        ctx.fillStyle = '#20242c';
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 13, 13, 8, 0.39); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 12, 12, 8, 0.39); ctx.stroke();
        ctx.strokeStyle = blink ? '#ffffff' : 'rgba(' + neon + ', ' + (0.55 + pulse * 0.4).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 13, 13, 8, 0.39); ctx.stroke();
        // slow radar sweep ring — reads as "actively scanning," independent of aim
        ctx.save();
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 13, 13, 8, 0.39); ctx.clip();
        ctx.strokeStyle = 'rgba(' + neon + ', 0.5)'; ctx.lineWidth = 2;
        var sweepA = (now / 700) % 6.283;
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(Math.cos(sweepA) * 14, 4 + Math.sin(sweepA) * 14); ctx.stroke();
        ctx.restore();
        // raised turret head, swivels toward the target
        ctx.save();
        ctx.rotate(c.aimA + 1.5708);
        ctx.fillStyle = '#2a2f38';
        ctx.beginPath(); ctx.ellipse(0, 4, 7, 8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(' + neon + ', 0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 4, 7, 8, 0, 0, 7); ctx.stroke();
        // barrel: metal housing with a glowing neon core, brighter muzzle tip
        ctx.strokeStyle = '#14161b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -15); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + neon + ', ' + (0.65 + pulse * 0.3).toFixed(2) + ')'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -14); ctx.stroke();
        ctx.fillStyle = 'rgba(' + neon + ', ' + (0.5 + pulse * 0.5).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, -15, 2.6, 0, 7); ctx.fill();
        ctx.restore();
        // the sensor eye up top, blinking amber-to-neon like the mine's light
        ctx.fillStyle = blink ? '#ff3b3b' : 'rgba(' + neon + ', ' + (0.7 + pulse * 0.3).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 4, 2.2, 0, 7); ctx.fill();
      } else {                                          // drone: angular gunmetal core, glowing lens, spinning rotors
        // 4 metal arms, each ending in a spinning rotor disc (motion-blur ring)
        var rotorSpin = now / 40;
        var arms = [[-14, -9], [14, -9], [-14, 9], [14, 9]];
        for (var am = 0; am < 4; am++) {
          var ax = arms[am][0], ay = arms[am][1];
          ctx.strokeStyle = '#2c333c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(ax * 0.32, ay * 0.32); ctx.lineTo(ax, ay); ctx.stroke();
          ctx.save();
          ctx.translate(ax, ay); ctx.rotate(rotorSpin + am * 1.6);
          ctx.strokeStyle = 'rgba(220, 230, 235, 0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 2, 0, 0, 7); ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#181c22';
          ctx.beginPath(); ctx.arc(ax, ay, 2.4, 0, 7); ctx.fill();
        }
        // core body: faceted gunmetal hull, neon piping along the seam
        ctx.fillStyle = '#1c2027';
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 12, 8.5, 6, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 11, 7.5, 6, 0); ctx.stroke();
        ctx.strokeStyle = blink ? '#ffffff' : 'rgba(' + neon + ', ' + (0.6 + pulse * 0.4).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 12, 8.5, 6, 0); ctx.stroke();
        // belly status light, pulsing independent of the lens
        ctx.fillStyle = 'rgba(' + neon + ', ' + (0.35 + pulse * 0.35).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 5, 2, 0, 7); ctx.fill();
        // camera lens: outer ring + a pupil that tracks the current target
        var lx = Math.cos(c.aimA) * 5, ly = Math.sin(c.aimA) * 5;
        ctx.fillStyle = '#0c0e11';
        ctx.beginPath(); ctx.arc(0, -1, 5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(' + neon + ', 0.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, -1, 5, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(' + neon + ', ' + (0.75 + pulse * 0.25).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(lx * 0.5, -1 + ly * 0.5, 2.3, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  };
})();
