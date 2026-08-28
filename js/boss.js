(function () {
  // THE PRODUCER — struts along the top of the stage barking orders.
  // Phase 1: radial flash bursts + shambler minions.
  // Phase 2 (under 50% hp): faster bursts, aimed 3-shot spreads, sprinter minions.
  DA.makeBoss = function () {
    return { id: DA.newId(), type: 'producer', isBoss: true, name: 'THE PRODUCER',
             x: DA.W / 2, y: 190, r: 38,
             speed: 80, hp: 320, maxHp: 320, score: 10000, color: '#d4a017',
             wobble: 0, burstT: 2.5, aimedT: 2, minionT: 6 };
  };

  // EPISODE 2 BOSS: THE EXECUTIVE — teleports around the suite, arrives with a
  // bullet ring, snipes 5-shot fans; phase 2 adds a rotating spiral + stalkers.
  DA.makeExecutive = function () {
    return { id: DA.newId(), type: 'executive', isBoss: true, name: 'THE EXECUTIVE',
             x: DA.W / 2, y: 200, r: 34, hp: 380, maxHp: 380, score: 20000,
             color: '#7a8aff', wobble: 0, teleportT: 3.5, fanT: 2.2,
             spiralT: 0, spiralA: 0, minionT: 7 };
  };
  DA.updateExecutive = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    b.wobble += dt;
    b.x += Math.sin(b.wobble * 0.9) * 40 * dt;
    b.faceA = Math.atan2(tp.y - b.y, tp.x - b.x);
    // the teleport telegraphs: the destination shows as a flickering ghost
    // outline 0.5s before he arrives, and never lands within 150px of a
    // player — no more materializing on top of someone with a bullet ring
    if (b.tpGhost > 0) {
      b.tpGhost -= dt;
      if (b.tpGhost <= 0) {
        if (DA.burst) DA.burst(b.x, b.y, b.color, 18); // vanish puff
        b.x = b.tpX; b.y = b.tpY;
        if (DA.burst) DA.burst(b.x, b.y, b.color, 18); // arrival puff
        if (DA.audio) DA.audio.roar();
        for (var i = 0; i < 10; i++) {                 // arrival ring
          var a = (i / 10) * 6.283;
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
        }
      }
    } else {
      b.teleportT -= dt;
      if (b.teleportT <= 0) {
        b.teleportT = phase === 2 ? 2.8 : 4;
        var pls = st.players || [st.player], gx, gy, ok = false, tries = 0;
        while (!ok && tries++ < 12) {
          gx = DA.rand(220, DA.W - 220);
          gy = DA.rand(140, 320);
          ok = true;
          for (var pi = 0; pi < pls.length; pi++) {
            var pp = pls[pi];
            if (pp && !pp.downed && DA.dist2(gx, gy, pp.x, pp.y) < 150 * 150) { ok = false; break; }
          }
        }
        b.tpX = gx; b.tpY = gy;
        b.tpGhost = 0.5;
      }
    }
    b.fanT -= dt;
    if (b.fanT <= 0) {
      b.fanT = phase === 2 ? 1.6 : 2.2;
      var at = Math.atan2(tp.y - b.y, tp.x - b.x);
      [-0.3, -0.15, 0, 0.15, 0.3].forEach(function (off) {
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at + off), Math.sin(at + off));
      });
    }
    if (phase === 2) {
      b.spiralT -= dt;
      if (b.spiralT <= 0) {                            // rotating bullet spiral
        b.spiralT = 0.15;
        b.spiralA += 0.55;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(b.spiralA), Math.sin(b.spiralA));
      }
      b.minionT -= dt;
      if (b.minionT <= 0) {
        b.minionT = 8;
        DA.spawnAtDoor(st.enemies, 'stalker');
        DA.spawnAtDoor(st.enemies, 'stalker');
        if (DA.announce) DA.announce('LEGAL WILL HEAR ABOUT THIS!');
      }
    } else {
      b.minionT -= dt;
      if (b.minionT <= 0) {
        b.minionT = 9;
        for (var m = 0; m < 3; m++) DA.spawnAtDoor(st.enemies, 'shambler');
      }
    }
    DA.clampToArena(b);
  };
  // EPISODE 3 BOSS: THE ALGORITHM — no human left to fire. A hovering
  // camera-drone that predicts where you're running and lasers the line,
  // while the studio's own hazards keep burning around it.
  DA.makeAlgorithm = function () {
    return { id: DA.newId(), type: 'algorithm', isBoss: true, name: 'THE ALGORITHM',
             x: DA.W / 2, y: 200, r: 36, hp: 460, maxHp: 460, score: 35000, color: '#2fd7c4',
             wobble: Math.random() * 6.283, driftT: 0,
             laserPhase: 'idle', laserT: 2.5, laserAngle: 0,
             ringT: 4, spiralT: 0, spiralA: 0, minionT: 6 };
  };
  var ALGO_LASER_LEN = 1100, ALGO_LASER_HALF_WIDTH = 0.05;
  DA.updateAlgorithm = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    // erratic hover: drifts toward a fresh random point every couple of seconds
    b.driftT -= dt;
    if (b.driftT <= 0) {
      b.driftT = 1.6 + Math.random() * 1.4;
      b.tx = DA.rand(180, DA.W - 180); b.ty = DA.rand(120, 340);
    }
    b.x += DA.clamp((b.tx || b.x) - b.x, -1, 1) * 70 * dt;
    b.y += DA.clamp((b.ty || b.y) - b.y, -1, 1) * 70 * dt;
    b.wobble += dt * 3;
    DA.clampToArena(b);

    // predictive laser: telegraphs where the target IS HEADING, not where they are
    b.laserT -= dt;
    if (b.laserPhase === 'idle' && b.laserT <= 0) {
      b.laserPhase = 'warn'; b.laserT = phase === 2 ? 0.6 : 0.9;
      var lead = 0.5;
      var px = tp.x + (tp.vx || 0) * lead, py = tp.y + (tp.vy || 0) * lead;
      b.laserAngle = Math.atan2(py - b.y, px - b.x);
    } else if (b.laserPhase === 'warn' && b.laserT <= 0) {
      b.laserPhase = 'fire'; b.laserT = 0.35;
      if (DA.audio) DA.audio.roar();
    } else if (b.laserPhase === 'fire') {
      if (b.laserT > 0) {
        var la = b.laserAngle;
        var ps = st.players || [st.player];
        for (var i = 0; i < ps.length; i++) {
          var pl = ps[i];
          if (!pl || pl.hearts <= 0 || pl.downed || pl.invuln > 0) continue;
          var d = Math.sqrt(DA.dist2(b.x, b.y, pl.x, pl.y));
          if (d > ALGO_LASER_LEN) continue;
          var a = Math.atan2(pl.y - b.y, pl.x - b.x);
          var diff = a - la;
          while (diff > Math.PI) diff -= 6.28318;
          while (diff < -Math.PI) diff += 6.28318;
          if (Math.abs(diff) < ALGO_LASER_HALF_WIDTH) {
            pl.hearts -= (DA.state && DA.state.mods && DA.state.mods.dmgTakenMult) || 1; pl.invuln = 1.2;
            if (DA.resetCombo) DA.resetCombo(st);
            if (DA.onPlayerHurt) DA.onPlayerHurt(st, b.x, b.y);
          }
        }
      }
      if (b.laserT <= 0) { b.laserPhase = 'idle'; b.laserT = phase === 2 ? 1.8 : 2.6; }
    }

    b.ringT -= dt;
    if (b.ringT <= 0) {
      b.ringT = phase === 2 ? 3 : 4.5;
      var n = phase === 2 ? 14 : 9;
      for (var r = 0; r < n; r++) {
        var ra = (r / n) * 6.283;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(ra), Math.sin(ra));
      }
    }
    if (phase === 2) {
      b.spiralT -= dt;
      if (b.spiralT <= 0) {
        b.spiralT = 0.14;
        b.spiralA += 0.5;
        DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(b.spiralA), Math.sin(b.spiralA));
      }
    }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      b.minionT = phase === 2 ? 6 : 8;
      DA.spawnAtDoor(st.enemies, 'stalker');
      if (phase === 2) DA.spawnAtDoor(st.enemies, 'swarmer');
      if (DA.announce) DA.announce('NO NOTES. JUST MORE EXTRAS.');
    }
  };
  DA.drawAlgorithm = function (ctx, b) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 46, b.r * 0.8, b.r * 0.28, 0, 0, 7); ctx.fill();
    // predictive-laser telegraph / beam, drawn before the drone so it reads as "from" it
    if (b.laserPhase === 'fire') {
      ctx.fillStyle = 'rgba(120, 255, 235, 0.4)';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, ALGO_LASER_LEN, b.laserAngle - ALGO_LASER_HALF_WIDTH, b.laserAngle + ALGO_LASER_HALF_WIDTH);
      ctx.closePath(); ctx.fill();
    } else if (b.laserPhase === 'warn') {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.laserAngle);
      ctx.strokeStyle = 'rgba(120, 255, 235, ' + (0.3 + Math.sin(performance.now() / 50) * 0.25) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ALGO_LASER_LEN, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(b.wobble) * 6);
    ctx.fillStyle = '#181c22';                        // drone chassis — angular housing
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r, b.r * 0.72, 6, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(47, 215, 196, 0.6)'; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.stroke();
    ctx.fillStyle = b.color;                          // the lens — always watching, hex-iris
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r * 0.42, b.r * 0.42, 6, 0); ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r * 0.18, b.r * 0.18, 6, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-b.r * 0.08, -b.r * 0.08, b.r * 0.06, 0, 7); ctx.fill();
    for (var wi = -1; wi <= 1; wi += 2) {              // rotor arms
      ctx.fillStyle = '#22262e';
      ctx.fillRect(wi * b.r * 0.75 - 6, -3, 12, 6);
      ctx.beginPath(); ctx.arc(wi * b.r * 1.1, 0, 8, 0, 7); ctx.fill();
    }
    if (DA.bossPhase(b) === 2) {                       // visible damage: spidered lens, sparking rotor
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();                                 // spiderweb crack radiating off the lens
      for (var ck = 0; ck < 4; ck++) {
        var cka = 0.7 + ck * 1.5;
        ctx.moveTo(Math.cos(cka) * b.r * 0.12, Math.sin(cka) * b.r * 0.12);
        ctx.lineTo(Math.cos(cka + 0.25) * b.r * 0.4, Math.sin(cka + 0.25) * b.r * 0.4);
      }
      ctx.stroke();
      if (Math.floor(performance.now() / 90) % 3 === 0) {   // the left rotor's dying
        ctx.fillStyle = '#ffe17a';
        ctx.fillRect(-b.r * 1.1 - 2, -6, 3, 3);
        ctx.fillRect(-b.r * 1.02, -10, 2, 2);
      }
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';      // chassis stroke flickers hot
      if (Math.floor(performance.now() / 240) % 2 === 0) {
        ctx.lineWidth = 2;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r + 2, b.r * 0.72 + 2, 6, 0); ctx.stroke();
      }
    }
    ctx.restore();
  };
  DA.bossPhase = function (b) { return b.hp <= b.maxHp / 2 ? 2 : 1; };
  DA.updateBoss = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var tp = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
    // strut horizontally toward the nearest contestant's column, bob vertically
    var want = DA.clamp(tp.x, 200, DA.W - 200);
    b.x += DA.clamp(want - b.x, -1, 1) * b.speed * (phase === 2 ? 1.5 : 1) * dt;
    b.wobble += dt;
    b.y = 190 + Math.sin(b.wobble * 1.7) * 40;
    b.faceA = Math.atan2(tp.y - b.y, tp.x - b.x);     // the renderer turns him toward camera 1
    DA.clampToArena(b);

    // the radial burst telegraphs: the roar and a contracting ring come
    // 0.4s BEFORE the bullets, so the spray is dodgeable on reaction
    // instead of appearing from nowhere (same idea as the spitter's windup)
    if (b.burstWindup > 0) {
      b.burstWindup -= dt;
      if (b.burstWindup <= 0) {
        var n = phase === 2 ? 16 : 10;
        for (var i = 0; i < n; i++) {
          var a = (i / n) * 6.283 + DA.rand(0, 0.3);
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
        }
      }
    } else {
      b.burstT -= dt;
      if (b.burstT <= 0) {
        b.burstT = phase === 2 ? 1.9 : 3.0;
        b.burstWindup = 0.4;
        if (DA.audio) DA.audio.roar();   // the roar IS the warning now
      }
    }
    if (phase === 2) {
      b.aimedT -= dt;
      if (b.aimedT <= 0) {
        b.aimedT = 1.6;
        var at = Math.atan2(tp.y - b.y, tp.x - b.x);
        [-0.18, 0, 0.18].forEach(function (off) {
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at + off), Math.sin(at + off));
        });
      }
    }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      b.minionT = phase === 2 ? 6 : 8;
      for (var m = 0; m < 3; m++) DA.spawnAtDoor(st.enemies, 'shambler');
      if (phase === 2) DA.spawnAtDoor(st.enemies, 'sprinter', 170);
      if (DA.announce) DA.announce('GET ME MORE EXTRAS!');
    }
  };
  // Suit-and-shades host, drawn in a rotated frame (facing +x) so the whole
  // costume — lapels, tie, props — turns with him as he tracks the contestant.
  DA.drawBoss = function (ctx, b) {
    var r = b.r;
    if (b.burstWindup > 0) {                          // radial burst incoming: a contracting ring
      var wk = 1 - b.burstWindup / 0.4;
      ctx.strokeStyle = 'rgba(255, 214, 96, ' + (0.25 + wk * 0.55).toFixed(2) + ')';
      ctx.lineWidth = 2 + wk * 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 26 - wk * 20, 0, 7); ctx.stroke();
    }
    if (b.tpGhost > 0) {                              // teleport destination: flickering ghost outline
      if (Math.floor(performance.now() / 70) % 2 === 0) {
        var gk = 1 - b.tpGhost / 0.5;
        ctx.strokeStyle = 'rgba(122, 138, 255, ' + (0.3 + gk * 0.5).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.tpX, b.tpY, r * 0.9, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.tpX - 8, b.tpY); ctx.lineTo(b.tpX + 8, b.tpY);
        ctx.moveTo(b.tpX, b.tpY - 8); ctx.lineTo(b.tpX, b.tpY + 8);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';               // grounding shadow
    ctx.beginPath(); ctx.ellipse(b.x, b.y + r * 0.85, r * 0.95, r * 0.36, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.faceA != null ? b.faceA : 1.57);
    var breathe = 1 + Math.sin((b.wobble || 0) * 2.3) * 0.022;   // he breathes
    ctx.scale(breathe, breathe);
    var suit = b.color;
    var suitDark = b.type === 'executive' ? '#5a68c9' : '#a87f12';
    var swing = Math.sin((b.wobble || 0) * 1.7);
    ctx.strokeStyle = suitDark;                       // ARMS
    ctx.lineWidth = Math.max(5, r * 0.3);
    ctx.lineCap = 'round';
    if (b.type === 'executive') {
      ctx.beginPath();                                // phone hand, up by the ear
      ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.55, -r * 0.62); ctx.stroke();
      ctx.beginPath();                                // free arm gesturing, sealing deals
      ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.9 + swing * 4, r * 0.85); ctx.stroke();
      ctx.fillStyle = '#22222c';                      // the phone itself
      ctx.fillRect(r * 0.5, -r * 0.78, r * 0.3, r * 0.42);
    } else {
      ctx.beginPath();                                // mic arm, thrust at the contestant
      ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 1.35, -r * 0.3); ctx.stroke();
      ctx.beginPath();                                // showman's flourish arm
      ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.7 + swing * 5, r * 1.05); ctx.stroke();
      ctx.strokeStyle = '#22222c'; ctx.lineWidth = 3; // mic stem + foam ball
      ctx.beginPath(); ctx.moveTo(r * 1.35, -r * 0.3); ctx.lineTo(r * 1.6, -r * 0.22); ctx.stroke();
      ctx.fillStyle = '#1a1a20';
      ctx.beginPath(); DA.polyPath(ctx, r * 1.68, -r * 0.2, r * 0.18, r * 0.18, 6, 0); ctx.fill();
    }
    ctx.fillStyle = suit;                             // shoulder pads either side
    ctx.beginPath(); DA.polyPath(ctx, 0, -r * 0.82, r * 0.4, r * 0.4, 5, 4.7); ctx.fill();
    ctx.beginPath(); DA.polyPath(ctx, 0, r * 0.82, r * 0.4, r * 0.4, 5, 1.6); ctx.fill();
    var sg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r * 1.12);
    sg.addColorStop(0, suitDark === '#5a68c9' ? '#98a6ff' : '#f0c65a');   // fabric sheen
    sg.addColorStop(0.65, suit);
    sg.addColorStop(1, suitDark);
    ctx.fillStyle = sg;                               // suit body, key-lit — an 8-sided plate
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, r, r, 8, 0.39); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3; ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.fillStyle = '#f2f2e9';                        // shirt front
    ctx.beginPath(); DA.polyPath(ctx, r * 0.35, 0, r * 0.5, r * 0.5, 6, 0); ctx.fill();
    ctx.fillStyle = suitDark;                         // lapels closing over the shirt
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.5); ctx.lineTo(r * 0.9, -r * 0.28); ctx.lineTo(r * 0.15, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.5); ctx.lineTo(r * 0.9, r * 0.28); ctx.lineTo(r * 0.15, r * 0.05); ctx.closePath(); ctx.fill();
    var ph2 = DA.bossPhase(b) === 2;                  // the fight's midpoint shows ON the body
    ctx.fillStyle = b.type === 'executive' ? '#d4a017' : '#8c1c2c';   // the tie
    if (ph2 && b.type !== 'executive') {              // kicked loose, swinging with the strut
      ctx.save(); ctx.translate(r * 0.12, 0);
      ctx.rotate(0.5 + Math.sin((b.wobble || 0) * 3.1) * 0.2);
      ctx.fillRect(0, -3.5, r * 0.7, 7); ctx.restore();
    } else {
      ctx.fillRect(r * 0.12, -3.5, r * 0.7, 7);
    }
    var hr = r * 0.5;                                 // head, pushed toward the camera line —
                                                        // a faceted plate, not a round skull
    ctx.fillStyle = '#e0b08c';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.fill();
    ctx.fillStyle = b.type === 'executive' ? '#2c2c34' : '#b8b0a0';   // slicked hair, back of skull —
                                                                       // a wedge, not the whole head
    ctx.beginPath();
    DA.polyPath(ctx, r * 0.42, 0, hr + 0.5, hr + 0.5, 6, 1.85, 0, null, 0.414);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.stroke();
    ctx.fillStyle = '#111';                           // shades: visor vs twin lenses
    if (b.type === 'executive') {
      ctx.fillRect(r * 0.42 + hr * 0.15, -hr * 0.75, hr * 0.42, hr * 1.5);
    } else {
      ctx.fillRect(r * 0.42 + hr * 0.15, -hr * 0.72, hr * 0.45, hr * 0.55);
      ctx.fillRect(r * 0.42 + hr * 0.15, hr * 0.17, hr * 0.45, hr * 0.55);
      ctx.fillRect(r * 0.42 + hr * 0.2, -hr * 0.2, hr * 0.3, hr * 0.4);
    }
    if (ph2) {                                        // visible damage: torn suit, cracked eyewear
      var dmgRng = DA.makeRng((b.id || 7) * 31);      // baked per-entity, never re-rolled per frame
      ctx.fillStyle = 'rgba(18, 12, 10, 0.5)';        // torn wedges out of the suit
      for (var tw = 0; tw < 3; tw++) {
        var ta = dmgRng() * 6.283, td = r * (0.4 + dmgRng() * 0.4);
        ctx.beginPath();
        DA.polyPath(ctx, Math.cos(ta) * td, Math.sin(ta) * td, r * 0.15, r * 0.15,
                    3 + Math.floor(dmgRng() * 2), dmgRng() * 6.28);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';     // a crack across the eyewear
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.42 + hr * 0.2, -hr * 0.5);
      ctx.lineTo(r * 0.42 + hr * 0.38, hr * 0.05);
      ctx.lineTo(r * 0.42 + hr * 0.26, hr * 0.5);
      ctx.stroke();
      if (b.type === 'executive' &&                   // the phone sparks intermittently
          Math.floor(performance.now() / 110) % 3 === 0) {
        ctx.fillStyle = '#ffe17a';
        ctx.fillRect(r * 0.6, -r * 0.62, 3, 3);
        ctx.fillRect(r * 0.68, -r * 0.5, 2, 2);
      }
    }
    ctx.restore();
  };
  DA.drawBossBar = function (ctx, b) {
    var w = 420, h = 14, x = (DA.W - w) / 2, y = 46;
    ctx.fillStyle = 'rgba(10,10,15,0.7)';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = DA.bossPhase(b) === 2 ? '#d43a4b' : '#d4a017';
    ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), h);
    ctx.fillStyle = '#f2f2e9';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.name || 'THE PRODUCER', DA.W / 2, y - 8);
  };
})();
