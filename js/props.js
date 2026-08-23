(function () {
  // Set dressing that shoots back. decorCanvas (main.js) still draws the
  // faint ambient sketches; these are REAL objects layered on top — solid,
  // damageable, and worth shooting: hp, a splash blast on death that hurts
  // nearby zombies (never the player, same rule as rocket splash), and a
  // score bonus. Position/size use the same arena-relative coordinates as
  // decorCanvas's sketches, so real props sit where the old fake ones did.
  function P(x, y, w, h, hp, color, label) {
    return { x: x, y: y, w: w, h: h, hp: hp, maxHp: hp, color: color, label: label,
             splashDmg: 2, splashR: 70, score: 120 };
  }
  // a few props per room, matching decorCanvas's per-decor theme — kept to
  // 3 (2 for the boss floor, tucked off the fight's center mark) so a room
  // reads as "shootable set dressing", not a clutter field
  var PROP_DEFS = {
    stage:     [P(120, 130, 26, 62, 3, '#8a8a98', 'LIGHT RIG'), P(120, 500, 26, 62, 3, '#8a8a98', 'LIGHT RIG'),
                P(1080, 310, 26, 62, 3, '#8a8a98', 'LIGHT RIG')],
    crates:    [P(150, 120, 54, 54, 2, '#9c7a44', 'CRATE'), P(560, 470, 54, 54, 2, '#9c7a44', 'CRATE'),
                P(1030, 190, 54, 54, 2, '#9c7a44', 'CRATE')],
    tables:    [P(180, 140, 62, 62, 3, '#7a5a3a', 'TABLE'), P(600, 470, 62, 62, 3, '#7a5a3a', 'TABLE'),
                P(1000, 150, 62, 62, 3, '#7a5a3a', 'TABLE')],
    monitors:  [P(140, 90, 58, 40, 2, '#3a4a52', 'MONITOR'), P(600, 90, 58, 40, 2, '#3a4a52', 'MONITOR'),
                P(1040, 90, 58, 40, 2, '#3a4a52', 'MONITOR')],
    racks:     [P(160, 160, 22, 100, 2, '#6a4a5a', 'CLOTHES RACK'), P(1060, 160, 22, 100, 2, '#6a4a5a', 'CLOTHES RACK'),
                P(600, 480, 22, 100, 2, '#6a4a5a', 'CLOTHES RACK')],
    papers:    [P(140, 100, 40, 46, 1, '#8a8266', 'PAPER STACK'), P(700, 460, 40, 46, 1, '#8a8266', 'PAPER STACK'),
                P(1080, 220, 40, 46, 1, '#8a8266', 'PAPER STACK')],
    desks:     [P(150, 150, 90, 50, 3, '#4a4258', 'EDIT DESK'), P(560, 420, 90, 50, 3, '#4a4258', 'EDIT DESK'),
                P(980, 150, 90, 50, 3, '#4a4258', 'EDIT DESK')],
    mirrors:   [P(150, 80, 30, 60, 2, '#5a6a72', 'VANITY MIRROR'), P(1060, 80, 30, 60, 2, '#5a6a72', 'VANITY MIRROR'),
                P(600, 500, 30, 60, 2, '#5a6a72', 'VANITY MIRROR')],
    servers:   [P(130, 100, 50, 110, 3, '#3a4048', 'SERVER RACK'), P(1080, 100, 50, 110, 3, '#3a4048', 'SERVER RACK'),
                P(600, 480, 50, 110, 3, '#3a4048', 'SERVER RACK')],
    lounge:    [P(430, 260, 100, 46, 3, '#3a5a44', 'SOFA'), P(770, 470, 100, 46, 3, '#3a5a44', 'SOFA'),
                P(200, 480, 44, 44, 1, '#6a5238', 'COFFEE TABLE')],
    lighting:  [P(150, 90, 24, 24, 2, '#6a6248', 'LIGHT FIXTURE'), P(600, 90, 24, 24, 2, '#6a6248', 'LIGHT FIXTURE'),
                P(1050, 90, 24, 24, 2, '#6a6248', 'LIGHT FIXTURE')],
    catwalk:   [P(160, 220, 34, 34, 2, '#4a4a54', 'STEEL DRUM'), P(1030, 220, 34, 34, 2, '#4a4a54', 'STEEL DRUM'),
                P(600, 480, 34, 34, 2, '#4a4a54', 'STEEL DRUM')],
    cranebay:  [P(140, 130, 46, 32, 3, '#7a5a2e', 'COUNTERWEIGHT'), P(1020, 130, 46, 32, 3, '#7a5a2e', 'COUNTERWEIGHT'),
                P(580, 500, 46, 32, 3, '#7a5a2e', 'COUNTERWEIGHT')],
    pyrobay:   [P(150, 150, 32, 52, 2, '#a83c2e', 'FUEL CANISTER'), P(1020, 200, 32, 52, 2, '#a83c2e', 'FUEL CANISTER'),
                P(560, 480, 32, 52, 2, '#a83c2e', 'FUEL CANISTER')],
    corebay:   [P(220, 90, 44, 44, 3, '#2e5a6a', 'RELAY DISH'), P(940, 90, 44, 44, 3, '#2e5a6a', 'RELAY DISH'),
                P(580, 500, 44, 44, 3, '#2e5a6a', 'RELAY DISH')],
    bossfloor: [P(90, 500, 26, 62, 3, '#8a8a98', 'LIGHT RIG'), P(1090, 500, 26, 62, 3, '#8a8a98', 'LIGHT RIG')]
  };
  // pyrobay props are the fuel-canister room — bigger bang, fits the theme
  PROP_DEFS.pyrobay.forEach(function (p) { p.splashDmg = 4; p.splashR = 100; p.score = 180; });

  DA.spawnProps = function (st) {
    var A = DA.ARENA;
    var defs = PROP_DEFS[st.room && st.room.decor];
    st.props = !defs ? [] : defs.map(function (d) {
      return { x: A.x0 + d.x, y: A.y0 + d.y, w: d.w, h: d.h, hp: d.hp, maxHp: d.maxHp,
                color: d.color, label: d.label, splashDmg: d.splashDmg, splashR: d.splashR,
                score: d.score, hitFlash: 0, r: Math.max(d.w, d.h) * 0.6 };
    });
  };

  function explodeProp(st, pr) {
    if (DA.burst) { DA.burst(pr.x, pr.y, pr.color, 22); DA.burst(pr.x, pr.y, '#ffe17a', 10); }
    if (DA.shockwave) DA.shockwave(pr.x, pr.y, pr.splashR);
    if (DA.addShake) DA.addShake(9);
    if (DA.audio) DA.audio.roar();
    st.score += pr.score;
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (e.isBoss || DA.dist2(pr.x, pr.y, e.x, e.y) >= pr.splashR * pr.splashR) continue;
      e.hp -= pr.splashDmg;
      e.hitFlash = 0.12;
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;
      if (DA.onKill) DA.onKill(st, e);
    }
  }

  // bullets vs. props: its own pass, same shape as DA.updatePowerups's pickup
  // loop — not folded into resolveCombat, which is already dense enough
  DA.resolveProps = function (st) {
    if (!st.props || !st.props.length) return;
    for (var i = st.props.length - 1; i >= 0; i--) {
      var pr = st.props[i];
      if (pr.hitFlash > 0) pr.hitFlash -= 1 / 60;
      for (var j = st.bullets.length - 1; j >= 0; j--) {
        var b = st.bullets[j];
        if (b.pierce && b.hit && b.hit.indexOf(pr) !== -1) continue;
        if (!DA.circleHit(pr.x, pr.y, pr.r, b.x, b.y, b.r)) continue;
        if (b.pierce) b.hit.push(pr); else st.bullets.splice(j, 1);
        pr.hp -= (b.dmg || 1);
        pr.hitFlash = 0.12;
        if (b.splash && DA.explodeSplash) DA.explodeSplash(st, b.x, b.y, b.splash, b.splashR);
        if (pr.hp <= 0) { explodeProp(st, pr); st.props.splice(i, 1); break; }
      }
    }
  };

  DA.drawProps = function (ctx, arr) {
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      var pr = arr[i];
      var dmgFrac = 1 - pr.hp / pr.maxHp;
      ctx.save();
      ctx.translate(pr.x, pr.y);
      if (dmgFrac > 0) ctx.rotate((Math.random() - 0.5) * dmgFrac * 0.06);  // a rattle once it's hurt
      ctx.fillStyle = pr.hitFlash > 0 ? '#ffffff' : pr.color;
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, pr.w / 2, pr.h / 2, 6, 0.3, 0.05 + dmgFrac * 0.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
      ctx.stroke();
      if (dmgFrac > 0.4) {                    // cracks once it's taken real damage
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-pr.w * 0.2, -pr.h * 0.3); ctx.lineTo(pr.w * 0.1, 0); ctx.lineTo(-pr.w * 0.05, pr.h * 0.3);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pr.label, pr.x, pr.y + pr.h / 2 + 13);
    }
  };
})();
