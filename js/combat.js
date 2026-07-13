(function () {
  // Effect/announcer hooks (DA.onKill, DA.onPlayerHurt) are optional so this
  // file stays testable without the effects layer loaded.
  // The multiplier is earned: every KILLS_PER_STEP kills in an unbroken chain
  // raise it one step — with NO ceiling: it climbs until the player takes a
  // hit (which HALVES it) or the chain goes cold for 4s (which resets it).
  // Losing half a hot streak stings; losing all of it made players ignore it.
  var COMBO_WINDOW = 4, KILLS_PER_STEP = 8;
  DA.COMBO_STEP = KILLS_PER_STEP;      // the HUD draws chain progress from this
  DA.bumpCombo = function (st) {
    st.comboKills = (st.comboKills || 0) + 1;
    st.comboTimer = COMBO_WINDOW;
    if (st.comboKills >= KILLS_PER_STEP) {
      st.comboKills = 0;
      st.combo++; st.comboPopT = 0.3;
      if (DA.audio && DA.audio.comboUp) DA.audio.comboUp(st.combo);
    }
  };
  DA.updateCombo = function (st, dt) {
    if (st.comboTimer > 0) {
      st.comboTimer -= dt;
      if (st.comboTimer <= 0) { st.combo = 1; st.comboKills = 0; }
    }
    if (st.comboPopT > 0) st.comboPopT -= dt;
  };
  DA.resetCombo = function (st) {
    st.combo = 1; st.comboKills = 0; st.comboTimer = 0;
  };
  DA.comboHit = function (st) {        // a hit costs half the streak, not all of it
    st.combo = Math.max(1, Math.ceil(st.combo / 2));
    st.comboKills = 0;
    st.comboTimer = st.combo > 1 ? COMBO_WINDOW : 0;
  };
  // rocket splash: damages every OTHER non-boss enemy within radius of the
  // impact point. No combo credit for the freebies, same rule as boomerBlast.
  DA.explodeSplash = function (st, x, y, dmg, radius, exclude) {
    if (DA.burst) { DA.burst(x, y, '#ff8a3d', 30); DA.burst(x, y, '#ffe17a', 16); }
    if (DA.splat) DA.splat(x, y);
    if (DA.shockwave) DA.shockwave(x, y, radius);
    if (DA.addShake) {
      var shakeFrom = DA.nearestPlayer ? DA.nearestPlayer(st.players || [st.player], x, y) : null;
      DA.addShake(16, shakeFrom ? x - shakeFrom.x : 0, shakeFrom ? y - shakeFrom.y : 0);  // recoils away from the blast
    }
    if (DA.haptic) DA.haptic(0.6, 90);
    if (DA.fx) DA.fx.hitStop = Math.max(DA.fx.hitStop || 0, 0.04);
    if (DA.audio) DA.audio.roar();
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (!e || e === exclude || e.isBoss) continue; // chain-blasts shrink the list mid-loop
      if (DA.dist2(x, y, e.x, e.y) >= radius * radius) continue;
      e.hp -= dmg;
      e.hitFlash = 0.12;
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;                    // splash kills: no combo bump
      if (DA.onKill) DA.onKill(st, e);
      if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y);
    }
  };
  DA.resolveCombat = function (st) {
    var p = st.player;
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (!e) continue; // a boomer chain-blast may have shrunk the list mid-loop
      if (e.dying) continue; // a boss mid-death-scene is beyond harm (and harmless)
      var killed = false;
      for (var j = st.bullets.length - 1; j >= 0; j--) {
        var b = st.bullets[j];
        if (b.pierce && b.hit.indexOf(e) !== -1) continue; // railgun hits each zombie once
        var br = b.splash ? Math.max(b.r, 20) : b.r;   // splash rounds detonate on proximity, not just direct hit
        if (DA.circleHit(e.x, e.y, e.r, b.x, b.y, br)) {
          if (b.pierce) b.hit.push(e);
          else st.bullets.splice(j, 1);
          e.hp -= (b.dmg || 1);
          e.hitFlash = 0.12;
          // a pained groan on impact — reuses the same low ambient-groan
          // voice, gated so a minigun spraying six zombies at once doesn't
          // stack into a wall of noise
          if (DA.audio && DA.audio.groan && Math.random() < 0.3) DA.audio.groan();
          if (st.stats && !b.bot) st.stats.hits++;   // accuracy tracks the human
          if (b.splash) DA.explodeSplash(st, b.x, b.y, b.splash, b.splashR, e);
          if (e.hp <= 0) {
            if (st.stats && b.gunLabel && !b.bot) {
              st.stats.killsByGun[b.gunLabel] = (st.stats.killsByGun[b.gunLabel] || 0) + 1;
            }
            if (!e.isBoss) killed = true;  // bosses die on camera (main.js death scene)
            break;
          }
        }
      }
      if (killed) {
        st.enemies.splice(i, 1);
        st.score += e.score * st.combo;
        if (DA.bumpCombo) DA.bumpCombo(st);
        if (DA.onKill) DA.onKill(st, e, b);
        if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y); // shot boomers still detonate
        continue;
      }
      var ps = st.players || [p];
      for (var pc = 0; pc < ps.length; pc++) {
        var pl = ps[pc];
        if (pl.downed) continue;                   // the horde ignores the fallen
        if (pl.invuln <= 0 && !(e.grace > 0) && !(pl.shieldT > 0) &&
            DA.circleHit(e.x, e.y, e.r, pl.x, pl.y, pl.r)) {
          pl.hearts--;
          pl.invuln = 1.5;
          if (!pl.bot) DA.comboHit(st);            // only the human's hits cost the streak
          var v = DA.norm(e.x - pl.x, e.y - pl.y); // knock enemy back
          e.x += v.x * 60; e.y += v.y * 60;
          DA.clampToArena(e);
          if (DA.onPlayerHurt) DA.onPlayerHurt({ player: pl }, e.x, e.y);
        }
      }
    }
  };
})();
