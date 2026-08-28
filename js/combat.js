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
    var speedCut = Math.min(0.9, (st.mods && st.mods.comboSpeedCut) || 0);      // stacks, but always needs at least 1 kill
    var step = Math.max(1, Math.round(KILLS_PER_STEP * (1 - speedCut)));  // Photogenic
    st.comboStepNeeded = step;                              // HUD reads this instead of the flat constant
    if (st.comboKills >= step) {
      st.comboKills = 0;
      st.combo++; st.comboPopT = 0.3;
      if (DA.audio && DA.audio.comboUp) DA.audio.comboUp(st.combo);   // the run's core economy finally makes a sound
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
  DA.comboHit = function (st) {        // a hit costs half the streak, not all of it (less with Vengeance)
    var hadStreak = st.combo >= 3;     // losing a real streak gets a reaction; a trivial x2 doesn't
    var frac = (st.mods && st.mods.comboHitFrac) || 0.5;
    st.combo = Math.max(1, Math.ceil(st.combo * frac));
    st.comboKills = 0;
    st.comboTimer = st.combo > 1 ? COMBO_WINDOW : 0;
    if (hadStreak) {                   // the crowd deflates, the signal stumbles — diegetic, not a popup
      if (DA.audio && DA.audio.aww) DA.audio.aww();
      if (DA.broadcast) DA.broadcast.glitch = Math.max(DA.broadcast.glitch || 0, 0.15);
    }
  };
  // rocket splash: damages every OTHER non-boss enemy within radius of the
  // impact point. No combo credit for the freebies, same rule as boomerBlast.
  DA.explodeSplash = function (st, x, y, dmg, radius, exclude) {
    if (DA.addScorch) DA.addScorch(x, y, true);   // rocket AND grenade both route through here
    if (DA.burst) { DA.burst(x, y, '#ff8a3d', 30); DA.burst(x, y, '#ffe17a', 16); }
    if (DA.splat) DA.splat(x, y);
    if (DA.shockwave) DA.shockwave(x, y, radius);
    if (DA.addShake) DA.addShake(16);
    if (DA.addNeonFlash) DA.addNeonFlash();
    if (DA.haptic) DA.haptic(0.6, 90);
    if (DA.fx) DA.fx.hitStop = Math.max(DA.fx.hitStop || 0, 0.04);
    if (DA.addAberration) DA.addAberration(0.75);
    if (DA.audio) { DA.audio.roar(); if (DA.audio.pop) DA.audio.pop(); }   // a pop, not the full cheer — explosions are routine
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (!e || e === exclude || e.isBoss) continue; // chain-blasts shrink the list mid-loop
      if (DA.dist2(x, y, e.x, e.y) >= radius * radius) continue;
      e.hp -= dmg;
      e.hitFlash = 0.12;
      var fd = Math.max(1, Math.sqrt(DA.dist2(x, y, e.x, e.y)));
      e.hitDx = (e.x - x) / fd; e.hitDy = (e.y - y) / fd;   // flinch away from the blast
      if (e.hp > 0) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;                    // splash kills: no combo bump
      if (DA.onKill) DA.onKill(st, e);
      if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y);
      if (e.type === 'brute' && DA.bruteGore) DA.bruteGore(st, e.x, e.y);
    }
  };
  // no build can burst a boss down faster than this: at most BOSS_DPS_CAP
  // damage lands on a boss within any rolling BOSS_DPS_WINDOW seconds, so
  // even a maxed-out minigun/railgun combo can't skip past the fight's
  // attack patterns. Leaves every normal build untouched — it only clips
  // in once sustained damage is already well above what any single stock
  // weapon deals, so this doesn't need its own mod-pool interaction.
  var BOSS_DPS_WINDOW = 3, BOSS_DPS_CAP = 120;
  function bossDamageAllowed(e, dmg, dt) {
    e.dpsHits = (e.dpsHits || []).filter(function (h) { h.age += dt; return h.age < BOSS_DPS_WINDOW; });
    var dealt = 0;
    for (var i = 0; i < e.dpsHits.length; i++) dealt += e.dpsHits[i].dmg;
    var allowed = Math.max(0, Math.min(dmg, BOSS_DPS_CAP - dealt));
    if (allowed > 0) e.dpsHits.push({ age: 0, dmg: allowed });
    return allowed;
  }
  DA.resolveCombat = function (st, dt) {
    dt = dt || 0;
    var p = st.player;
    // flamer burn: tagged enemies cook for 2s — small repeated damage, kills
    // bookkeeped like splash kills (score + chains, no combo credit)
    for (var bn = st.enemies.length - 1; bn >= 0; bn--) {
      var be = st.enemies[bn];
      if (!(be.burnT > 0)) continue;
      be.burnT -= dt;
      be.hp -= 1.6 * dt;
      if (be.hp > 0) continue;
      st.enemies.splice(bn, 1);
      st.score += be.score;
      if (DA.onKill) DA.onKill(st, be);
      if (be.type === 'boomer') DA.boomerBlast(st, be.x, be.y);
      if (be.type === 'brute' && DA.bruteGore) DA.bruteGore(st, be.x, be.y);
    }
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (!e) continue; // a boomer chain-blast may have shrunk the list mid-loop
      if (e.dying) continue; // a boss mid-death-scene is beyond harm (and harmless)
      if (e.isBoss && e.grace > 0) continue; // still making his entrance — no cheap shots before ACTION!
      var killed = false;
      for (var j = st.bullets.length - 1; j >= 0; j--) {
        var b = st.bullets[j];
        if (b.pierce && b.hit.indexOf(e) !== -1) continue; // railgun hits each zombie once
        var br = b.splash ? Math.max(b.r, 20) : b.r;   // splash rounds detonate on proximity, not just direct hit
        if (DA.circleHit(e.x, e.y, e.r, b.x, b.y, br)) {
          if (b.pierce) b.hit.push(e);
          else st.bullets.splice(j, 1);
          var wpPart = DA.checkWeakPoint && DA.checkWeakPoint(e, b.x, b.y);
          if (wpPart === 'fuse') e.hp = 0;    // called shot on the fuse pack: pop it now, full kill credit
          else {
            var hitDmg = b.dmg || 1;
            if ((wpPart === 'head' || wpPart === 'leg') && st.mods && st.mods.weakPointDmgBonus) {
              hitDmg *= 1 + st.mods.weakPointDmgBonus;   // Executioner: bonus damage on a called shot
            }
            if (e.isBoss) hitDmg = bossDamageAllowed(e, hitDmg, dt);
            e.hp -= hitDmg;
          }
          e.hitFlash = 0.12;
          e.hitDx = b.dx; e.hitDy = b.dy;   // draw-time flinch shoves along the shot's line
          if (b.gunLabel === 'FLAMETHROWER' && !e.isBoss) e.burnT = 2;   // tag-and-retreat: the burn does the rest
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
        st.score += e.score * st.combo * (1 + (st.mods && st.mods.scoreBonus || 0));   // Big Spender
        if (DA.bumpCombo) DA.bumpCombo(st);
        if (DA.onKill) DA.onKill(st, e, b);
        if (e.type === 'boomer') DA.boomerBlast(st, e.x, e.y); // shot boomers still detonate
        if (e.type === 'brute' && DA.bruteGore) DA.bruteGore(st, e.x, e.y);
        if (st.mods && st.mods.cooldownRefund) {     // Chain Reaction: a kill shaves both barrels
          var refund = Math.min(0.9, st.mods.cooldownRefund);   // stacks, but never below a 10% cooldown
          (st.players || [p]).forEach(function (rp) {
            if (rp.fireCooldown > 0) rp.fireCooldown *= 1 - refund;
          });
        }
        continue;
      }
      var ps = st.players || [p];
      for (var pc = 0; pc < ps.length; pc++) {
        var pl = ps[pc];
        if (pl.downed) continue;                   // the horde ignores the fallen
        if (pl.invuln <= 0 && !(e.grace > 0) && !(pl.shieldT > 0) &&
            DA.circleHit(e.x, e.y, e.r, pl.x, pl.y, pl.r)) {
          pl.hearts -= (DA.state && DA.state.mods && DA.state.mods.dmgTakenMult) || 1;
          pl.invuln = 1.5 + (st.mods && st.mods.invulnBonus || 0);   // Thick Skin
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
