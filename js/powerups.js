(function () {
  // Audience drops: the crowd throws sponsor gifts into the arena mid-combat.
  // Gun crates ('gun_smg' etc.) swap the player's weapon for 30 combat-seconds.
  var GUN_TYPES = ['triple', 'smg', 'shotgun', 'minigun', 'railgun', 'flamer', 'rocket', 'grenade'];
  var COLORS = { boots: '#4cc9f0', heart: '#d43a4b', shield: '#9ad7ff', bomb: '#ffb020',
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
    return type.toUpperCase();
  }

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
        st.powerupT = DA.rand(18, 26) * (1 - Math.min(0.85, (st.mods && st.mods.dropRateBonus) || 0)) /
                      (st.segmentDropMult || 1);   // Lucky Break stacks (never to zero); SPONSOR HOUR doubles the cadence
        var type = DA.pickDropType(st.player, st.lastGunDrop);
        for (var rr = 0; rr < 3; rr++) {       // don't drop a type already on the floor
          var taken = false;
          for (var pk = 0; pk < st.powerups.length; pk++) if (st.powerups[pk].type === type) taken = true;
          if (!taken) break;
          type = DA.pickDropType(st.player, st.lastGunDrop);
        }
        if (type.indexOf('gun_') === 0) st.lastGunDrop = type;
        var dropX, dropY;
        for (var pr = 0; pr < 8; pr++) {       // don't land on top of a gift already on the floor
          dropX = DA.rand(DA.ARENA.x0 + 120, DA.ARENA.x1 - 120);
          dropY = DA.rand(DA.ARENA.y0 + 120, DA.ARENA.y1 - 120);
          var clear = true;
          for (var pd = 0; pd < st.powerups.length; pd++) {
            if (DA.dist2(dropX, dropY, st.powerups[pd].x, st.powerups[pd].y) < 70 * 70) { clear = false; break; }
          }
          if (clear) break;
        }
        st.powerups.push({ id: DA.newId(), type: type, t: LIFETIME, x: dropX, y: dropY });
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
        else if ((pu.type === 'turret' || pu.type === 'drone') && DA.spawnCompanion) {
          DA.spawnCompanion(st, pu.type, pu.x, pu.y);
        } else DA.applyPowerup(pl, pu.type);
        if (DA.burst) DA.burst(pu.x, pu.y, colorOf(pu.type), 14);
        if (DA.audio) DA.audio.pickup(pu.type);
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
      if (pu.type === 'boots') {                      // boot: shaft + sole, outlined, with a highlight streak
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, -11); ctx.lineTo(1, -11); ctx.lineTo(1, 5); ctx.lineTo(9, 5); ctx.lineTo(9, 12); ctx.lineTo(-9, 12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-6, 3); ctx.stroke();      // shine streak
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-9, 8.5); ctx.lineTo(9, 8.5); ctx.stroke();     // sole seam
      } else if (pu.type === 'shield') {              // double ring + cross emblem, glowing rim
        ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
        ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(0, 0, 13, -2.5, -0.6); ctx.stroke();               // rim highlight arc
        ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
        ctx.stroke();
      } else if (pu.type === 'bomb') {                // round bomb, rim highlight, curved lit fuse
        ctx.fillStyle = '#22222c';
        ctx.beginPath(); ctx.arc(0, 2, 10, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 2, 8.5, -2.4, -0.7); ctx.stroke();              // metal rim highlight
        ctx.strokeStyle = '#8a5a1a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(4, -13, 1, -16); ctx.stroke();
        ctx.lineCap = 'butt';
        var sparkPulse = 0.5 + Math.sin(performance.now() / 90) * 0.5;
        ctx.fillStyle = COLORS.bomb;
        ctx.beginPath(); ctx.arc(1, -16, 2 + sparkPulse * 1.3, 0, 7); ctx.fill();
        ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.arc(1, -16, 4.5 + sparkPulse * 1.6, 0, 7); ctx.fill();
        ctx.globalAlpha /= 0.5;
      } else if (pu.type === 'heart') {               // heart, outlined, small glint
        ctx.beginPath();
        ctx.arc(-5, -3, 6.5, 0, 7); ctx.arc(5, -3, 6.5, 0, 7);
        ctx.moveTo(-11, 0); ctx.lineTo(0, 13); ctx.lineTo(11, 0); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(-4.5, -5, 1.8, 0, 7); ctx.fill();                  // glint
      } else if (pu.type === 'turret') {              // squat base + barrel, rivets, glow ring
        ctx.globalAlpha *= 0.3;
        ctx.beginPath(); ctx.arc(0, 3, 12, 0, 7); ctx.fill();                       // glow-underneath
        ctx.globalAlpha /= 0.3;
        ctx.fillStyle = colorOf(pu.type);
        ctx.beginPath(); DA.polyPath(ctx, 0, 1, 9, 9, 6, 0.39); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); DA.polyPath(ctx, 0, 1, 9, 9, 6, 0.39); ctx.stroke();
        ctx.fillStyle = '#0e0e14';
        ctx.beginPath(); ctx.arc(0, 1, 2.4, 0, 7); ctx.fill();                      // sensor hub
        ctx.fillStyle = colorOf(pu.type);
        ctx.fillRect(-2, -11, 4, 9);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(-1.6, -11, 1, 9);                                             // barrel highlight
      } else if (pu.type === 'drone') {                // quad rotor housing, blurred blades, camera lens
        ctx.fillStyle = colorOf(pu.type);
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 7, 5, 6, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, 7, 5, 6, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        var armTips = [[-9, -6], [9, -6], [-9, 6], [9, 6]];
        for (var ai = 0; ai < armTips.length; ai++) {
          ctx.beginPath(); ctx.ellipse(armTips[ai][0], armTips[ai][1], 3.4, 1.4, ai % 2 ? -0.5 : 0.5, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = '#14141c'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, -6); ctx.lineTo(-3, -2); ctx.moveTo(9, -6); ctx.lineTo(3, -2);
        ctx.moveTo(-9, 6); ctx.lineTo(-3, 2); ctx.moveTo(9, 6); ctx.lineTo(3, 2);
        ctx.stroke();
        ctx.fillStyle = '#0e0e14';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill();                        // camera lens
        ctx.fillStyle = 'rgba(150,220,255,0.8)';
        ctx.beginPath(); ctx.arc(-0.6, -0.6, 0.8, 0, 7); ctx.fill();                // lens glint
      } else {                                        // gun crate
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-11, -11, 22, 22, 5); ctx.fill(); }
        else ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.4;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-11, -11, 22, 22, 5); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.55)';                                   // corner rivets
        var rivets = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
        for (var ri = 0; ri < rivets.length; ri++) {
          ctx.beginPath(); ctx.arc(rivets[ri][0], rivets[ri][1], 1, 0, 7); ctx.fill();
        }
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
