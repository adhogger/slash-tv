(function () {
  // Audience drops: the crowd throws sponsor gifts into the arena mid-combat.
  // Gun crates ('gun_smg' etc.) swap the player's weapon for 30 combat-seconds.
  var GUN_TYPES = ['triple', 'smg', 'shotgun', 'minigun', 'railgun'];
  var COLORS = { boots: '#4cc9f0', heart: '#d43a4b' };
  var DURATION = 30;     // seconds of gun/boots effect (only ticks during combat)
  var LIFETIME = 12;     // seconds before an unclaimed drop despawns

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
    var pool = ['boots', 'boots'];
    if (player.hearts < DA.MAX_HEARTS) pool.push('heart', 'heart');
    for (var i = 0; i < GUN_TYPES.length; i++) {
      var g = 'gun_' + GUN_TYPES[i];
      if (GUN_TYPES[i] === player.gun || g === lastGunDrop) continue;
      pool.push(g);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  DA.applyPowerup = function (player, type) {
    if (type.indexOf('gun_') === 0) {
      player.gun = type.slice(4);
      player.gunT = DURATION;
    } else if (type === 'boots') {
      player.bootsT = DURATION;
    } else if (type === 'heart') {
      player.hearts = Math.min(player.hearts + 1, DA.MAX_HEARTS);
    }
  };

  DA.updatePowerups = function (st, dt) {
    if (st.powerupT === undefined) st.powerupT = DA.rand(8, 14);
    // only drop while there's a fight happening
    if (st.enemies.length > 0) {
      st.powerupT -= dt;
      if (st.powerupT <= 0) {
        st.powerupT = DA.rand(12, 18);
        var type = DA.pickDropType(st.player, st.lastGunDrop);
        if (type.indexOf('gun_') === 0) st.lastGunDrop = type;
        st.powerups.push({ type: type, t: LIFETIME,
                           x: DA.rand(DA.ARENA.x0 + 120, DA.ARENA.x1 - 120),
                           y: DA.rand(DA.ARENA.y0 + 120, DA.ARENA.y1 - 120) });
        if (DA.announce) DA.announce('SPONSOR DROP!');
        if (DA.burst) DA.burst(st.powerups[st.powerups.length - 1].x,
                               st.powerups[st.powerups.length - 1].y, colorOf(type), 10);
      }
    }
    for (var i = st.powerups.length - 1; i >= 0; i--) {
      var pu = st.powerups[i];
      pu.t -= dt;
      if (pu.t <= 0) { st.powerups.splice(i, 1); continue; }
      if (DA.circleHit(pu.x, pu.y, 14, st.player.x, st.player.y, st.player.r)) {
        DA.applyPowerup(st.player, pu.type);
        if (DA.burst) DA.burst(pu.x, pu.y, colorOf(pu.type), 14);
        if (DA.audio) DA.audio.pickup();
        st.powerups.splice(i, 1);
      }
    }
  };

  DA.drawPowerups = function (ctx, arr) {
    for (var i = 0; i < arr.length; i++) {
      var pu = arr[i];
      var blink = pu.t < 3 && Math.floor(pu.t * 5) % 2 === 0; // hurry-up blink
      if (blink) continue;
      var pulse = 1 + Math.sin(performance.now() / 150) * 0.12;
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = colorOf(pu.type);
      if (pu.type === 'boots') {                      // boot-ish block
        ctx.fillRect(-9, -11, 10, 16); ctx.fillRect(-9, 5, 18, 7);
      } else if (pu.type === 'heart') {               // heart
        ctx.beginPath();
        ctx.arc(-5, -3, 6.5, 0, 7); ctx.arc(5, -3, 6.5, 0, 7);
        ctx.moveTo(-11, 0); ctx.lineTo(0, 13); ctx.lineTo(11, 0); ctx.closePath();
        ctx.fill();
      } else {                                        // gun crate
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-11, -11, 22, 22, 5); ctx.fill(); }
        else ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = '#14141c';
        ctx.fillRect(-7, -2, 14, 5);                  // little gun silhouette
        ctx.fillRect(2, -5, 5, 4);
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
    if (player.bootsT > 0) lines.push({ text: 'BOOTS ' + Math.ceil(player.bootsT) + 's', color: COLORS.boots });
    return lines;
  };
})();
