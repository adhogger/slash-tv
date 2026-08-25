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
    for (var i = 0; i < st.companions.length; i++) {
      var c = st.companions[i];
      var blink = c.t < 2.5 && Math.floor(c.t * 6) % 2 === 0;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';                // grounding shadow, same as enemies/player
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 12, 13, 5, 0, 0, 7); ctx.fill();
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.kind === 'turret') {
        ctx.fillStyle = blink ? '#ffffff' : '#3a4450';
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 12, 12, 8, 0.39); ctx.fill();
        ctx.strokeStyle = 'rgba(91, 200, 214, 0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); DA.polyPath(ctx, 0, 4, 12, 12, 8, 0.39); ctx.stroke();
        ctx.strokeStyle = '#5bc8d6'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(Math.cos(c.aimA) * 17, 4 + Math.sin(c.aimA) * 17); ctx.stroke();
      } else {                                          // drone: angular housing, quad rotor arms
        ctx.fillStyle = blink ? '#ffffff' : '#181c22';
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 11, 8, 6, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(126, 224, 129, 0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 11, 8, 6, 0); ctx.stroke();
        ctx.strokeStyle = '#3a4450'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-14, -9); ctx.lineTo(-5, -3); ctx.moveTo(14, -9); ctx.lineTo(5, -3);
        ctx.moveTo(-14, 9); ctx.lineTo(-5, 3); ctx.moveTo(14, 9); ctx.lineTo(5, 3);
        ctx.stroke();
        ctx.fillStyle = '#7ee081';
        ctx.beginPath(); ctx.arc(Math.cos(c.aimA) * 6, Math.sin(c.aimA) * 6, 3, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  };
})();
