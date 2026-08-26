(function () {
  // Audience drops: the crowd throws sponsor gifts into the arena mid-combat.
  // Gun crates ('gun_smg' etc.) swap the player's weapon for 30 combat-seconds.
  var GUN_TYPES = ['triple', 'smg', 'shotgun', 'minigun', 'railgun', 'flamer', 'rocket', 'grenade'];
  var COLORS = { boots: '#4cc9f0', heart: '#d43a4b', shield: '#9ad7ff', bomb: '#ffb020', mail: '#f0d9a0',
                 turret: '#5bc8d6', drone: '#7ee081' };
  var DURATION = 30;       // seconds of gun/boots effect (only ticks during combat)
  DA.GUN_DURATION = DURATION;   // Stockpile (main.js) refreshes a running timer to this on room entry
  var SHIELD_TIME = 8;     // shorter: total protection is strong
  var LIFETIME = 12;       // seconds before an unclaimed drop despawns

  function colorOf(type) {
    if (type.indexOf('gun_') === 0) return DA.GUNS[type.slice(4)].color;
    return COLORS[type];
  }
  function labelOf(type) {
    if (type.indexOf('gun_') === 0) return DA.GUNS[type.slice(4)].label;
    if (type === 'mail') return 'FAN MAIL';
    return type.toUpperCase();
  }

  // Fan mail: a purely optional collectible, never part of the combat drop
  // pool — DA.spawnMail (called on room entry, see main.js) is the only
  // thing that creates one. No gameplay effect beyond score, so skipping it
  // never costs a run, only a line in the end-of-show tally.
  var MAIL_FLAVOR = [
    "FAN MAIL: \"PLEASE DON'T DIE, I HAVE MONEY ON YOU.\"",
    'FAN MAIL: A CRAYON DRAWING OF YOU, MOSTLY ACCURATE.',
    "FAN MAIL: \"CAN YOU SIGN THIS? IT'S FOR MY WILL.\"",
    'FAN MAIL: A COMPLAINT ABOUT THE LIGHTING, SOMEHOW.',
    "FAN MAIL: \"MY THERAPIST SAYS I SHOULDN'T WATCH THIS.\"",
    'FAN MAIL: A COUPON FOR A SPONSOR THAT NO LONGER EXISTS.'
  ];
  DA.collectMail = function (st) {
    st.mailFound = (st.mailFound || 0) + 1;
    st.score += 250;
    if (DA.announce) DA.announce(MAIL_FLAVOR[Math.floor(Math.random() * MAIL_FLAVOR.length)]);
  };
  // ~35% of non-boss rooms, never in Endless (no discrete "rooms" to tuck
  // one into there) — tucked at a random point, same as combat drops
  DA.spawnMail = function (st) {
    if (st.room.boss || st.room.endless) return;
    var guaranteed = st.mods && st.mods.guaranteedMail;             // Fan Favorite
    if (!guaranteed && Math.random() >= 0.35) return;
    st.powerups.push({ id: DA.newId(), type: 'mail', t: 999,
                       x: DA.rand(DA.ARENA.x0 + 120, DA.ARENA.x1 - 120),
                       y: DA.rand(DA.ARENA.y0 + 120, DA.ARENA.y1 - 120) });
  };

  // hearts never drop when the meter is full; the same gun never drops twice
  // in a row, and never the one the player is already holding
  DA.pickDropType = function (player, lastGunDrop) {
    var pool = ['boots', 'boots', 'shield', 'bomb', 'turret', 'drone'];   // as rare as bomb/shield
    if (player.hearts < DA.MAX_HEARTS) pool.push('heart', 'heart');
    for (var i = 0; i < GUN_TYPES.length; i++) {
      var g = 'gun_' + GUN_TYPES[i];
      if (GUN_TYPES[i] === player.gun || g === lastGunDrop) continue;
      pool.push(g);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Bomb: everything on set dies on camera. Full cash value, but no combo
  // climb (the audience knows you didn't earn those). Boss takes a chunk.
  DA.detonateBomb = function (st) {
    if (DA.addShake) DA.addShake(22);
    if (DA.addNeonFlash) DA.addNeonFlash();
    if (DA.audio) { DA.audio.roar(); if (DA.audio.cheer) DA.audio.cheer(); }
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      if (e.isBoss) { e.hp -= 15; continue; }
      if (DA.addScorch) DA.addScorch(e.x, e.y, true);   // a mark where each one stood
      st.enemies.splice(i, 1);
      st.score += e.score;
      if (DA.onKill) DA.onKill(st, e);
    }
    if (st.enemyBullets) st.enemyBullets.length = 0;   // clears the flak too
  };

  DA.applyPowerup = function (player, type) {
    var mods = player.mods || {};
    if (type.indexOf('gun_') === 0) {
      player.gun = type.slice(4);
      player.gunT = DURATION * (1 + (mods.gunDurationBonus || 0));   // Quartermaster
      player.gunWarnPlayed = false;
    } else if (type === 'boots') {
      player.bootsT = DURATION;
    } else if (type === 'shield') {
      player.shieldT = SHIELD_TIME * (1 + (mods.shieldDurationBonus || 0));   // Guardian Angel
    } else if (type === 'heart') {
      player.hearts = mods.fullHealHearts ? DA.MAX_HEARTS :          // Bargain Hunter
                       Math.min(player.hearts + 1, DA.MAX_HEARTS);
    }
  };

  DA.updatePowerups = function (st, dt) {
    if (st.powerupT === undefined) st.powerupT = DA.rand(12, 18);
    // only drop while there's a fight happening, and never pile up more
    // than 2 unclaimed gifts (elites can still add theirs on top)
    if (st.enemies.length > 0 && st.powerups.length < 2) {
      st.powerupT -= dt;
      if (st.powerupT <= 0) {
        st.powerupT = DA.rand(18, 26) * (1 - Math.min(0.85, (st.mods && st.mods.dropRateBonus) || 0));   // Lucky Break, stacks but always leaves a real gap
        var type = DA.pickDropType(st.player, st.lastGunDrop);
        for (var rr = 0; rr < 3; rr++) {       // don't drop a type already on the floor
          var taken = false;
          for (var pk = 0; pk < st.powerups.length; pk++) if (st.powerups[pk].type === type) taken = true;
          if (!taken) break;
          type = DA.pickDropType(st.player, st.lastGunDrop);
        }
        if (type.indexOf('gun_') === 0) st.lastGunDrop = type;
        st.powerups.push({ id: DA.newId(), type: type, t: LIFETIME,
                           x: DA.rand(DA.ARENA.x0 + 120, DA.ARENA.x1 - 120),
                           y: DA.rand(DA.ARENA.y0 + 120, DA.ARENA.y1 - 120) });
        if (DA.burst) DA.burst(st.powerups[st.powerups.length - 1].x,
                               st.powerups[st.powerups.length - 1].y, colorOf(type), 10);
      }
    }
    for (var i = st.powerups.length - 1; i >= 0; i--) {
      var pu = st.powerups[i];
      pu.t -= dt;
      if (pu.t <= 0) { st.powerups.splice(i, 1); continue; }
      var ps = st.players || [st.player];
      for (var pc = 0; pc < ps.length; pc++) {
        var pl = ps[pc];
        if (pl.downed) continue;
        var pickR = 22 * (1 + (st.mods && st.mods.pickupRadiusBonus || 0));   // Magnetic
        if (!DA.circleHit(pu.x, pu.y, pickR, pl.x, pl.y, pl.r)) continue;
        if (pu.type === 'bomb') DA.detonateBomb(st);
        else if (pu.type === 'mail') DA.collectMail(st);
        else if ((pu.type === 'turret' || pu.type === 'drone') && DA.spawnCompanion) {
          DA.spawnCompanion(st, pu.type, pu.x, pu.y);
        } else DA.applyPowerup(pl, pu.type);
        if (DA.burst) DA.burst(pu.x, pu.y, colorOf(pu.type), 14);
        if (DA.audio) DA.audio.pickup();
        st.powerups.splice(i, 1);
        break;
      }
    }
  };

  DA.drawPowerups = function (ctx, arr) {
    for (var i = 0; i < arr.length; i++) {
      var pu = arr[i];
      var blink = pu.t < 3 && Math.floor(pu.t * 5) % 2 === 0; // hurry-up blink
      if (blink) continue;
      var pulse = 1 + Math.sin(performance.now() / 150) * 0.12;
      ctx.globalAlpha = 0.16;                         // beacon glow on the floor
      ctx.fillStyle = colorOf(pu.type);
      ctx.beginPath(); ctx.arc(pu.x, pu.y, 24 * pulse, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = colorOf(pu.type);
      if (pu.type === 'boots') {                      // boot-ish block
        ctx.fillRect(-9, -11, 10, 16); ctx.fillRect(-9, 5, 18, 7);
      } else if (pu.type === 'shield') {              // ring
        ctx.lineWidth = 4; ctx.strokeStyle = COLORS.shield;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
      } else if (pu.type === 'bomb') {                // round bomb + fuse spark
        ctx.fillStyle = '#22222c';
        ctx.beginPath(); ctx.arc(0, 2, 10, 0, 7); ctx.fill();
        ctx.fillStyle = COLORS.bomb;
        ctx.fillRect(-1.5, -13, 3, 6);
      } else if (pu.type === 'heart') {               // heart
        ctx.beginPath();
        ctx.arc(-5, -3, 6.5, 0, 7); ctx.arc(5, -3, 6.5, 0, 7);
        ctx.moveTo(-11, 0); ctx.lineTo(0, 13); ctx.lineTo(11, 0); ctx.closePath();
        ctx.fill();
      } else if (pu.type === 'mail') {                // envelope: body + peaked flap
        ctx.fillRect(-11, -8, 22, 16);
        ctx.strokeStyle = '#22222c'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-11, -8); ctx.lineTo(0, 2); ctx.lineTo(11, -8);
        ctx.stroke();
      } else if (pu.type === 'turret') {              // squat base + barrel stub
        ctx.beginPath(); DA.polyPath(ctx, 0, 1, 9, 9, 6, 0.39); ctx.fill();
        ctx.fillRect(-2, -11, 4, 9);
      } else if (pu.type === 'drone') {                // quad rotor housing
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 7, 5, 6, 0); ctx.fill();
        ctx.strokeStyle = '#14141c'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, -6); ctx.lineTo(-3, -2); ctx.moveTo(9, -6); ctx.lineTo(3, -2);
        ctx.moveTo(-9, 6); ctx.lineTo(-3, 2); ctx.moveTo(9, 6); ctx.lineTo(3, 2);
        ctx.stroke();
      } else {                                        // gun crate
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-11, -11, 22, 22, 5); ctx.fill(); }
        else ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = '#14141c';
        var gunType = pu.type.slice(4);
        if (gunType === 'flamer') {                   // teardrop flame silhouette
          ctx.beginPath();
          ctx.moveTo(0, -8); ctx.quadraticCurveTo(7, 0, 0, 8);
          ctx.quadraticCurveTo(-7, 0, 0, -8);
          ctx.fill();
        } else if (gunType === 'rocket') {             // missile silhouette
          ctx.beginPath();
          ctx.moveTo(-8, 3); ctx.lineTo(4, 3); ctx.lineTo(8, 0); ctx.lineTo(4, -3); ctx.lineTo(-8, -3);
          ctx.closePath(); ctx.fill();
          ctx.fillRect(-10, -4, 3, 8);                 // tail fin
        } else if (gunType === 'grenade') {            // round body + pin
          ctx.beginPath(); ctx.arc(0, 2, 7, 0, 7); ctx.fill();
          ctx.fillRect(-1.5, -8, 3, 6);
          ctx.strokeStyle = '#14141c'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(2, -8, 3, 0, 7); ctx.stroke();
        } else {                                       // generic gun silhouette
          ctx.fillRect(-7, -2, 14, 5);
          ctx.fillRect(2, -5, 5, 4);
        }
      }
      ctx.restore();
      ctx.fillStyle = colorOf(pu.type);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labelOf(pu.type), pu.x, pu.y + 30);
    }
  };

  // HUD labels for timed effects (current gun is drawn separately, always)
  DA.powerupHudLines = function (player) {
    var lines = [];
    if (player.shieldT > 0) lines.push({ text: 'SHIELD ' + Math.ceil(player.shieldT) + 's', color: COLORS.shield });
    if (player.bootsT > 0) lines.push({ text: 'BOOTS ' + Math.ceil(player.bootsT) + 's', color: COLORS.boots });
    return lines;
  };
})();
