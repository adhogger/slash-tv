(function () {
  // THE HEADLINERS. Three bosses, three renderers, three voices — the shared
  // color-swap suit renderer is gone. Every persistent visual detail bakes
  // its randomness once from DA.makeRng(b.id * prime); transient one-frame
  // effects key off floor(performance.now()/N). One telegraph at a time:
  // while a signature attack winds up, the boss's other timers freeze, so
  // every warning on screen is the one that matters.
  var BOSS_ACTS = {
    producer:  ['ACT I — THE MONOLOGUE', 'ACT II — NO COMMERCIAL BREAK'],
    executive: ['Q1 — DUE DILIGENCE', 'Q2 — LIQUIDATION'],
    algorithm: ['NOW SHOWING: YOU', 'RERUN: YOU, AGAIN']
  };
  var BOSS_EPITHETS = {
    producer:  'YOUR HOST · YOUR DIRECTOR · YOUR EXECUTIONER',
    executive: 'SENIOR VP, CONTENT & LIQUIDATION',
    algorithm: 'RECOMMENDATION ENGINE · AUDIENCE OF NONE'
  };

  // THE PRODUCER — struts along the top of the stage running his own
  // execution as entertainment. Phase 1: radial bursts + WE'RE LIVE camera
  // crossfire + shambler extras. Phase 2: faster, aimed spreads, sprinters.
  DA.makeBoss = function () {
    return { id: DA.newId(), type: 'producer', isBoss: true, name: 'THE PRODUCER',
             x: DA.W / 2, y: 190, r: 46,
             speed: 80, hp: 360, maxHp: 360, score: 10000, color: '#d4a017',
             wobble: 0, burstT: 2.5, aimedT: 2, minionT: 6,
             sigT: 6, sigWarn: 0, sigDiag: 0 };
  };

  // THE EXECUTIVE — money doesn't walk. Planted dead still; his only
  // locomotion is the teleport. Claims the floor out from under you.
  DA.makeExecutive = function () {
    return { id: DA.newId(), type: 'executive', isBoss: true, name: 'THE EXECUTIVE',
             x: DA.W / 2, y: 200, r: 42, hp: 420, maxHp: 420, score: 20000,
             color: '#7a8aff', wobble: 0, teleportT: 3.5, fanT: 2.2,
             minionT: 7, claims: [], claimT: 5, fadeGhost: 0, posePhoneUp: 0 };
  };

  // THE ALGORITHM — the dead network running itself. A camera-drone core
  // with an orbiting pod halo; snap movement, predictive laser, and an
  // INSTANT REPLAY of your own recorded path that shoots back.
  DA.makeAlgorithm = function () {
    return { id: DA.newId(), type: 'algorithm', isBoss: true, name: 'THE ALGORITHM',
             x: DA.W / 2, y: 200, r: 44, hp: 500, maxHp: 500, score: 35000, color: '#2fd7c4',
             wobble: Math.random() * 6.283, driftT: 0, moveT: 1, shutterT: 0,
             laserPhase: 'idle', laserT: 2.5, laserAngle: 0, laserCount: 0,
             ringT: 4, spiralT: 0, spiralA: 0, minionT: 6,
             trail: [], trailT: 0, echoT: 8, echoWarn: 0, echo: null };
  };

  DA.bossPhase = function (b) { return b.hp <= b.maxHp / 2 ? 2 : 1; };

  // ---------------------------------------------------------------- PRODUCER
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

    // WE'RE LIVE — the director cues the studio's own corner cameras to
    // fire: the only attack in the game that comes from the arena itself.
    // Armed cams get solid tallies + a live warn line (drawn in drawArena).
    if (b.sigWarn > 0) {
      var preWarn = b.sigWarn;
      b.sigWarn -= dt;
      if ((preWarn > 1.0 && b.sigWarn <= 1.0) || (preWarn > 0.5 && b.sigWarn <= 0.5)) {
        if (DA.audio && DA.audio.countTick) DA.audio.countTick();
      }
      if (b.sigWarn <= 0) {                            // FIRE: crossfire on the victim's position
        var victim = DA.nearestPlayer(st.players || [st.player], b.x, b.y);
        var cams = (st.sigArmedCams || []);
        // main.js exports the real tripod spots; fall back to computing them
        // so the fight works anywhere the full game shell isn't loaded
        var pads = DA.TRIPODS || [[DA.ARENA.x0 + 26, DA.ARENA.y0 + 24], [DA.ARENA.x1 - 26, DA.ARENA.y0 + 24],
                                  [DA.ARENA.x0 + 26, DA.ARENA.y1 - 24], [DA.ARENA.x1 - 26, DA.ARENA.y1 - 24]];
        for (var ci = 0; ci < cams.length; ci++) {
          var cpos = pads[cams[ci]];
          if (!cpos) continue;
          var base = Math.atan2(victim.y - cpos[1], victim.x - cpos[0]);
          [-0.12, -0.06, 0, 0.06, 0.12].forEach(function (off) {
            DA.fireEnemyBullet(st.enemyBullets, cpos[0], cpos[1],
                               Math.cos(base + off), Math.sin(base + off), { speed: 250, color: '#ffd94a' });
          });
        }
        if (phase === 2) {                             // he joins his own crossfire
          for (var rb = 0; rb < 12; rb++) {
            var rba = (rb / 12) * 6.283;
            DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(rba), Math.sin(rba));
          }
        } else {
          var at0 = Math.atan2(tp.y - b.y, tp.x - b.x);
          [-0.18, 0, 0.18].forEach(function (off) {
            DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at0 + off), Math.sin(at0 + off));
          });
        }
        if (DA.audio && DA.audio.camVolley) DA.audio.camVolley();
        st.sigArmedCams = null;
        b.sigT = phase === 2 ? 7 : 9;
      }
    } else if (b.burstWindup > 0) {
      // the radial burst telegraphs: the bark and a contracting ring come
      // 0.4s BEFORE the bullets, so the spray is dodgeable on reaction
      b.burstWindup -= dt;
      if (b.burstWindup <= 0) {
        var n = phase === 2 ? 16 : 10;
        for (var i = 0; i < n; i++) {
          var a = (i / n) * 6.283 + DA.rand(0, 0.3);
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
        }
      }
    } else {
      b.sigT -= dt;
      if (b.sigT <= 0) {                               // COUNT: arm the cameras, 1.5s warning
        b.sigWarn = 1.5;
        b.sigDiag = b.sigDiag ? 0 : 1;
        st.sigArmedCams = phase === 2 ? [0, 1, 2, 3] : (b.sigDiag ? [1, 2] : [0, 3]);
        if (DA.audio && DA.audio.countTick) DA.audio.countTick();
        if (!b.sigTaught) { b.sigTaught = true; st.bossTicker = { text: 'SMILE FOR THE CAMERAS.', t: 1.4 }; }
      }
      b.burstT -= dt;
      if (b.burstT <= 0) {
        b.burstT = phase === 2 ? 1.9 : 3.0;
        b.burstWindup = 0.4;
        if (DA.audio) (DA.audio.micBark || DA.audio.roar)();   // the bark IS the warning
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
    }
  };

  // --------------------------------------------------------------- EXECUTIVE
  DA.updateExecutive = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var pls = st.players || [st.player];
    var tp = DA.nearestPlayer(pls, b.x, b.y);
    b.wobble += dt;                                    // planted: money doesn't walk
    b.faceA = Math.atan2(tp.y - b.y, tp.x - b.x);
    if (b.fadeGhost > 0) b.fadeGhost -= dt;
    if (b.posePhoneUp > 0) b.posePhoneUp -= dt;

    var claimMarking = false;                          // one telegraph at a time
    for (var cm = 0; cm < b.claims.length; cm++) if (b.claims[cm].phase === 'mark') claimMarking = true;

    // the teleport telegraphs: a flickering ghost + auction brackets 0.5s
    // early, never within 150px of a player, never onto sold floor
    if (b.tpGhost > 0) {
      b.tpGhost -= dt;
      if (b.tpGhost <= 0) {
        if (DA.burst) DA.burst(b.x, b.y, b.color, 18); // vanish puff
        b.lastX = b.x; b.lastY = b.y; b.lastFace = b.faceA;
        b.fadeGhost = 0.35;                            // he's already left
        if (DA.audio && DA.audio.execVanish) DA.audio.execVanish();
        b.x = b.tpX; b.y = b.tpY;
        if (DA.burst) DA.burst(b.x, b.y, b.color, 18); // arrival puff
        if (DA.audio) (DA.audio.execArrive || DA.audio.roar)();
        for (var i = 0; i < 10; i++) {                 // arrival ring
          var a = (i / 10) * 6.283;
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(a), Math.sin(a));
        }
        // phase 2: sometimes the next meeting is IMMEDIATE — chained
        // teleports replace the old spiral (a near-duplicate of the
        // Algorithm's), each hop keeping its full ghost telegraph + ring
        if (phase === 2 && Math.random() < 0.25) b.teleportT = 1.0;
      }
    } else {
      b.teleportT -= dt;
      if (b.teleportT <= 0) {
        b.teleportT = phase === 2 ? 2.6 : 4;
        var gx, gy, ok = false, tries = 0;
        while (!ok && tries++ < 12) {
          gx = DA.rand(220, DA.W - 220);
          gy = DA.rand(140, 320);
          ok = true;
          for (var pi = 0; pi < pls.length; pi++) {
            var pp = pls[pi];
            if (pp && !pp.downed && DA.dist2(gx, gy, pp.x, pp.y) < 150 * 150) { ok = false; break; }
          }
          if (ok) {
            for (var cz = 0; cz < b.claims.length; cz++) {   // he never stands on sold floor
              var zc = b.claims[cz];
              if (Math.abs(gx - zc.x) < zc.w / 2 + b.r && Math.abs(gy - zc.y) < zc.h / 2 + b.r) { ok = false; break; }
            }
          }
        }
        b.tpX = gx; b.tpY = gy;
        b.tpGhost = 0.5;
      }
    }

    // ASSET SEIZURE — he buys the floor out from under you. Zones mark
    // where you WERE (1.2s to leave), then burn hot for 3.5s; his
    // repossession cooks zombies standing there too.
    if (!claimMarking && b.tpGhost <= 0) {
      b.claimT -= dt;
      if (b.claimT <= 0) {
        b.claimT = phase === 2 ? 6.5 : 8.5;
        var A = DA.ARENA;
        for (var cp = 0; cp < pls.length; cp++) {
          var cpl = pls[cp];
          if (!cpl || cpl.downed) continue;
          b.claims.push({ x: DA.clamp(cpl.x, A.x0 + 90, A.x1 - 90), y: DA.clamp(cpl.y, A.y0 + 90, A.y1 - 90),
                          w: 150, h: 150, phase: 'mark', t: 1.2 });
        }
        if (phase === 2) b.claims.push({ x: DA.W / 2, y: DA.H / 2, w: 150, h: 150, phase: 'mark', t: 1.2 });
        b.posePhoneUp = 0.4;
        if (DA.audio && DA.audio.stamp) DA.audio.stamp();
        if (!b.claimTaught) { b.claimTaught = true; st.bossTicker = { text: 'ASSET SEIZED', t: 1.4 }; }
      }
    }
    for (var zi = b.claims.length - 1; zi >= 0; zi--) {
      var z = b.claims[zi];
      z.t -= dt;
      if (z.phase === 'mark' && z.t <= 0) {
        z.phase = 'active'; z.t = 3.5;
        if (DA.audio && DA.audio.sizzle) DA.audio.sizzle();
      } else if (z.phase === 'active') {
        for (var zp = 0; zp < pls.length; zp++) {      // the hazards.js hitPlayers contract
          var zpl = pls[zp];
          if (!zpl || zpl.hearts <= 0 || zpl.downed || zpl.invuln > 0) continue;
          if (Math.abs(zpl.x - z.x) < z.w / 2 && Math.abs(zpl.y - z.y) < z.h / 2) {
            zpl.hearts -= (DA.state && DA.state.mods && DA.state.mods.dmgTakenMult) || 1;
            zpl.invuln = 1.2;
            if (DA.resetCombo) DA.resetCombo(st);
            if (DA.onPlayerHurt) DA.onPlayerHurt(st, z.x, z.y);
            if (DA.addShake) DA.addShake(8);
          }
        }
        for (var ze = st.enemies.length - 1; ze >= 0; ze--) {   // repossession spares nobody
          var en = st.enemies[ze];
          if (en.isBoss) continue;
          if (Math.abs(en.x - z.x) >= z.w / 2 || Math.abs(en.y - z.y) >= z.h / 2) continue;
          en.hp -= 3 * dt;
          en.hitFlash = 0.12;
          if (en.hp > 0) continue;
          st.enemies.splice(ze, 1);
          st.score += en.score;
          if (DA.onKill) DA.onKill(st, en);
          if (en.type === 'boomer') DA.boomerBlast(st, en.x, en.y);
          if (en.type === 'brute' && DA.bruteGore) DA.bruteGore(st, en.x, en.y);
        }
        if (z.t <= 0) { z.phase = 'fade'; z.t = 0.4; }
      } else if (z.phase === 'fade' && z.t <= 0) {
        b.claims.splice(zi, 1);
      }
    }

    if (!claimMarking) {                               // one telegraph at a time
      b.fanT -= dt;
      if (b.fanT <= 0) {
        b.fanT = phase === 2 ? 1.6 : 2.2;
        var at2 = Math.atan2(tp.y - b.y, tp.x - b.x);
        [-0.3, -0.15, 0, 0.15, 0.3].forEach(function (off) {
          DA.fireEnemyBullet(st.enemyBullets, b.x, b.y, Math.cos(at2 + off), Math.sin(at2 + off));
        });
      }
    }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      if (phase === 2) {
        b.minionT = 8;
        DA.spawnAtDoor(st.enemies, 'stalker');
        DA.spawnAtDoor(st.enemies, 'stalker');
        if (DA.announce) DA.announce('LEGAL WILL HEAR ABOUT THIS!');
      } else {
        b.minionT = 9;
        for (var m2 = 0; m2 < 3; m2++) DA.spawnAtDoor(st.enemies, 'shambler');
      }
    }
    DA.clampToArena(b);
  };

  // --------------------------------------------------------------- ALGORITHM
  var ALGO_LASER_LEN = 1100, ALGO_LASER_HALF_WIDTH = 0.05;
  DA.updateAlgorithm = function (b, st, dt) {
    var phase = DA.bossPhase(b);
    var pls = st.players || [st.player];
    var tp = DA.nearestPlayer(pls, b.x, b.y);
    // SNAP MOVES, not a float: pick a point, ease there in 0.35s, then lock
    // dead still until the next retarget — machine motion, and it
    // photographs you between attacks (shutter click + lens flash)
    // it PLANTS to shoot: no retargeting or movement while the laser is
    // aiming or firing — the beam comes from a locked position
    if (b.laserPhase === 'idle') b.driftT -= dt;
    if (b.driftT <= 0 && b.laserPhase === 'idle') {
      b.driftT = 1.6 + Math.random() * 1.4;
      b.moveFromX = b.x; b.moveFromY = b.y; b.moveT = 0;
      b.tx = DA.rand(180, DA.W - 180); b.ty = DA.rand(120, 340);
      b.shutterT = 0.05;
      if (DA.audio && DA.audio.shutter) DA.audio.shutter();
    }
    if (b.moveT < 0.35 && b.laserPhase === 'idle') {
      b.moveT += dt;
      var mk = Math.min(1, b.moveT / 0.35);
      mk = 1 - Math.pow(1 - mk, 3);                    // ease-out cubic
      b.x = b.moveFromX + ((b.tx || b.x) - b.moveFromX) * mk;
      b.y = b.moveFromY + ((b.ty || b.y) - b.moveFromY) * mk;
    }
    if (b.shutterT > 0) b.shutterT -= dt;
    b.wobble += dt * 3;
    DA.clampToArena(b);

    // INSTANT REPLAY — a 3s ring buffer of the target's path; an echo of
    // your recorded self plays back at 1.35x and FIRES from where you were.
    b.trailT -= dt;
    if (b.trailT <= 0) {
      b.trailT = 0.1;
      b.trail.push({ x: tp.x, y: tp.y });
      if (b.trail.length > 30) b.trail.shift();
    }
    var echoLive = b.echoWarn > 0 || b.echo;
    if (b.echoWarn > 0) {
      b.echoWarn -= dt;
      if (b.echoWarn <= 0) {
        b.echo = { pts: b.trail.slice(), t: 0, fired: {} };
        b.echoT = phase === 2 ? 6 : 8;
      }
    } else if (b.echo) {
      var e = b.echo;
      var prevT = e.t;
      e.t += dt;
      var marks = phase === 2 ? [0.5, 1.2, 1.9] : [0.7, 1.5];
      var frac = Math.min(1, e.t / 2.2);
      var fi = frac * (e.pts.length - 1);
      var i0 = Math.floor(fi), i1 = Math.min(e.pts.length - 1, i0 + 1);
      var ex = e.pts[i0].x + (e.pts[i1].x - e.pts[i0].x) * (fi - i0);
      var ey = e.pts[i0].y + (e.pts[i1].y - e.pts[i0].y) * (fi - i0);
      e.x = ex; e.y = ey;
      for (var mv = 0; mv < marks.length; mv++) {
        if (prevT < marks[mv] && e.t >= marks[mv]) {   // the footage shoots back
          var vt = DA.nearestPlayer(pls, ex, ey);
          var va = Math.atan2(vt.y - ey, vt.x - ex);
          [-0.15, 0, 0.15].forEach(function (off) {
            DA.fireEnemyBullet(st.enemyBullets, ex, ey, Math.cos(va + off), Math.sin(va + off), { color: '#9ff5ea' });
          });
        }
      }
      if (e.t >= 2.2) b.echo = null;
    } else if (b.laserPhase === 'idle') {
      b.echoT -= dt;
      if (b.echoT <= 0 && b.trail.length >= 20) {
        b.echoWarn = 0.5;
        if (DA.audio && DA.audio.replayCue) DA.audio.replayCue();
        st.bossTicker = { text: '▶ REPLAY', t: 1.4 };
      }
    }

    // predictive laser: telegraphs where the target IS HEADING, not where
    // they are — the prediction point itself is drawn as a marked ghost
    if (!echoLive) b.laserT -= dt;                     // one telegraph at a time
    if (b.laserPhase === 'idle' && b.laserT <= 0 && !echoLive) {
      b.laserPhase = 'warn'; b.laserT = phase === 2 ? 0.6 : 0.9;
      var lead = 0.5;
      var px = tp.x + (tp.vx || 0) * lead, py = tp.y + (tp.vy || 0) * lead;
      b.predX = px; b.predY = py;
      b.laserCount = (b.laserCount || 0) + 1;
      b.laserAngle = Math.atan2(py - b.y, px - b.x);
      if (DA.audio && DA.audio.algoCharge) DA.audio.algoCharge(b.laserT);
    } else if (b.laserPhase === 'warn' && b.laserT <= 0) {
      b.laserPhase = 'fire'; b.laserT = 0.35;
      if (DA.audio) (DA.audio.algoZap || DA.audio.roar)();
      if (DA.addAberration) DA.addAberration(0.4);
    } else if (b.laserPhase === 'fire') {
      if (b.laserT > 0) {
        var la = b.laserAngle;
        for (var i = 0; i < pls.length; i++) {
          var pl = pls[i];
          if (!pl || pl.hearts <= 0 || pl.downed || pl.invuln > 0) continue;
          var d = Math.sqrt(DA.dist2(b.x, b.y, pl.x, pl.y));
          if (d > ALGO_LASER_LEN) continue;
          var a2 = Math.atan2(pl.y - b.y, pl.x - b.x);
          var diff = a2 - la;
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

  // ------------------------------------------------------------ SHARED FEEL
  // Bosses finally REACT to being shot: a draw-time shove along the shot's
  // line, a small squash, and a white rim light — never a full white fill
  // (a minigun would strobe a 90px sprite into noise). Sim position is
  // untouched, the same rule as the zombie flinch.
  function hitReact(b) {
    var k = b.hitFlash > 0 && b.hitDx != null ? b.hitFlash / 0.12 : 0;
    return { k: k, ox: k ? b.hitDx * 2.5 * k : 0, oy: k ? b.hitDy * 2.5 * k : 0,
             ang: k ? Math.atan2(b.hitDy, b.hitDx) : 0 };
  }
  function applySquash(ctx, hr2) {
    if (!hr2.k) return;
    ctx.rotate(hr2.ang); ctx.scale(1 + 0.05 * hr2.k, 1 - 0.04 * hr2.k); ctx.rotate(-hr2.ang);
  }

  // ---------------------------------------------------------------- RENDERERS
  // THE PRODUCER: sequined gold showman, coattails, tethered to his own rig.
  DA.drawProducer = function (ctx, b) {
    var r = b.r;
    var ph2 = DA.bossPhase(b) === 2;
    var hr2 = hitReact(b);
    var bx = b.x + hr2.ox, by = b.y + hr2.oy;
    // his personal key light — phase 2 the board stops flattering him
    var keyGrad = ctx.createRadialGradient(bx, by + r * 0.8, 10, bx, by + r * 0.8, ph2 ? r * 1.7 : r * 2.2);
    keyGrad.addColorStop(0, ph2 ? 'rgba(255,255,255,0.13)' : 'rgba(255,214,96,0.12)');
    keyGrad.addColorStop(1, 'rgba(255,214,96,0)');
    ctx.fillStyle = keyGrad;
    ctx.beginPath(); ctx.arc(bx, by + r * 0.8, ph2 ? r * 1.7 : r * 2.2, 0, 7); ctx.fill();
    if (b.burstWindup > 0) {                          // radial burst incoming: a contracting ring
      var wk = 1 - b.burstWindup / 0.4;
      ctx.strokeStyle = 'rgba(255, 214, 96, ' + (0.25 + wk * 0.55).toFixed(2) + ')';
      ctx.lineWidth = 2 + wk * 3;
      ctx.beginPath(); ctx.arc(bx, by, r + 26 - wk * 20, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';               // grounding shadow
    ctx.beginPath(); ctx.ellipse(bx, by + r * 0.85, r * 0.95, r * 0.36, 0, 0, 7); ctx.fill();
    // MIC CABLE up to the lighting rig — nobody else on set is tethered
    var face = b.faceA != null ? b.faceA : 1.57;
    var mcx = bx + Math.cos(face) * r * 1.68 - Math.sin(face) * (-r * 0.2);
    var mcy = by + Math.sin(face) * r * 1.68 + Math.cos(face) * (-r * 0.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mcx, mcy);
    ctx.bezierCurveTo(mcx + Math.sin(b.wobble * 0.9) * 30, (mcy + DA.ARENA.y0) / 2,
                      bx + 40, (mcy + DA.ARENA.y0) / 2, bx + 40, DA.ARENA.y0);
    ctx.stroke();
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(face);
    applySquash(ctx, hr2);
    var breathe = 1 + Math.sin((b.wobble || 0) * 2.3) * 0.022;   // he breathes
    ctx.scale(breathe, breathe);
    ctx.rotate(Math.sin((b.wobble || 0) * 1.7) * 0.06);          // a two-beat showman roll
    var suit = b.color, suitDark = '#a87f12';
    var swing = Math.sin((b.wobble || 0) * 1.7);
    // COATTAILS, flapping counterphase with the strut
    ctx.fillStyle = '#8a6a0e';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); DA.polyPath(ctx, -r * 0.85, -r * 0.35, r * 0.55, r * 0.3, 4, Math.PI + 0.25 + Math.sin(b.wobble * 1.7 - 0.6) * 0.18); ctx.fill(); ctx.stroke();
    ctx.beginPath(); DA.polyPath(ctx, -r * 0.85, r * 0.35, r * 0.55, r * 0.3, 4, Math.PI - 0.25 + Math.sin(b.wobble * 1.7 + 0.6) * 0.18); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = suitDark;                       // ARMS
    ctx.lineWidth = Math.max(5, r * 0.3);
    ctx.lineCap = 'round';
    ctx.beginPath();                                  // mic arm, thrust at the contestant
    ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 1.35, -r * 0.3); ctx.stroke();
    if (b.sigWarn > 0) {                              // the director's cue pose: arm UP
      ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.5, r * 1.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.5, r * 1.05); ctx.lineTo(r * 0.5, -r * 1.05); ctx.stroke();
    } else {
      ctx.beginPath();                                // showman's flourish arm
      ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.7 + swing * 5, r * 1.05); ctx.stroke();
    }
    ctx.strokeStyle = '#22222c'; ctx.lineWidth = 3;   // mic stem + foam ball
    ctx.beginPath(); ctx.moveTo(r * 1.35, -r * 0.3); ctx.lineTo(r * 1.6, -r * 0.22); ctx.stroke();
    ctx.fillStyle = '#1a1a20';
    ctx.beginPath(); DA.polyPath(ctx, r * 1.68, -r * 0.2, r * 0.18, r * 0.18, 6, 0); ctx.fill();
    ctx.fillStyle = '#c8ccd4';                        // chrome glint on the ball
    ctx.beginPath(); DA.polyPath(ctx, r * 1.63, -r * 0.26, r * 0.06, r * 0.06, 6, 0); ctx.fill();
    ctx.fillStyle = suit;                             // WIDE shoulder pads — he reads broad
    ctx.beginPath(); DA.polyPath(ctx, 0, -r * 0.82, r * 0.5, r * 0.5, 5, 4.7); ctx.fill();
    ctx.beginPath(); DA.polyPath(ctx, 0, r * 0.82, r * 0.5, r * 0.5, 5, 1.6); ctx.fill();
    var sg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r * 1.12);
    sg.addColorStop(0, '#f0c65a');                    // fabric sheen
    sg.addColorStop(0.65, suit);
    sg.addColorStop(1, suitDark);
    ctx.fillStyle = sg;                               // suit body, key-lit — an 8-sided plate
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, r, r, 8, 0.39); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3; ctx.lineJoin = 'miter';
    ctx.stroke();
    if (hr2.k) {                                      // hit: a white rim, never a fill
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * hr2.k).toFixed(2) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, r, r, 8, 0.39); ctx.stroke();
    }
    if (!b.sequins) {                                 // sequin field, baked once
      var sqRng = DA.makeRng((b.id || 7) * 17);
      b.sequins = [];
      for (var sq = 0; sq < 7; sq++) {
        var sqa = sqRng() * 6.283, sqd = r * (0.3 + sqRng() * 0.55);
        b.sequins.push([Math.cos(sqa) * sqd, Math.sin(sqa) * sqd]);
      }
    }
    var gi = Math.floor(b.wobble * 2.5) % 7;          // exactly one glints per beat
    var gp2 = b.sequins[gi];
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(b.wobble * 12)).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gp2[0] - 2.5, gp2[1]); ctx.lineTo(gp2[0] + 2.5, gp2[1]);
    ctx.moveTo(gp2[0], gp2[1] - 2.5); ctx.lineTo(gp2[0], gp2[1] + 2.5);
    ctx.stroke();
    ctx.fillStyle = '#f2f2e9';                        // shirt front
    ctx.beginPath(); DA.polyPath(ctx, r * 0.35, 0, r * 0.5, r * 0.5, 6, 0); ctx.fill();
    ctx.fillStyle = suitDark;                         // lapels closing over the shirt
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.5); ctx.lineTo(r * 0.9, -r * 0.28); ctx.lineTo(r * 0.15, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.5); ctx.lineTo(r * 0.9, r * 0.28); ctx.lineTo(r * 0.15, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2dd1';                        // pocket square in the show's own neon
    ctx.beginPath(); ctx.moveTo(r * 0.08, -r * 0.5); ctx.lineTo(r * 0.24, -r * 0.42); ctx.lineTo(r * 0.1, -r * 0.34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8c1c2c';                        // the tie
    if (b.enraged && b.grace > 0) {                   // the act-break TIE-RIP, on camera
      ctx.save(); ctx.translate(r * 0.12, 0);
      ctx.rotate(0.5 + (1 - b.grace / 1.4) * 0.4);
      ctx.fillRect(0, -3.5, r * 0.7, 7); ctx.restore();
    } else if (ph2) {                                 // kicked loose, swinging with the strut
      ctx.save(); ctx.translate(r * 0.12, 0);
      ctx.rotate(0.5 + Math.sin((b.wobble || 0) * 3.1) * 0.2);
      ctx.fillRect(0, -3.5, r * 0.7, 7); ctx.restore();
    } else {
      ctx.fillRect(r * 0.12, -3.5, r * 0.7, 7);
    }
    var hr = r * 0.5;                                 // head, pushed toward the camera line
    ctx.fillStyle = '#e0b08c';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.fill();
    ctx.fillStyle = '#b8b0a0';                        // silver hair — a wedge, not the whole head
    ctx.beginPath();
    DA.polyPath(ctx, r * 0.42, 0, hr + 0.5, hr + 0.5, 6, 1.85, 0, null, 0.414);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.stroke();
    // BARE EYES + brows, matching his BOSS CAM portrait (the shades were a
    // contradiction — the cam always showed him glaring, lensless)
    ctx.fillStyle = '#2c2116';
    ctx.save(); ctx.translate(r * 0.42 + hr * 0.3, -hr * 0.42); ctx.rotate(0.3);
    ctx.fillRect(-hr * 0.22, -hr * 0.05, hr * 0.44, hr * 0.1); ctx.restore();
    ctx.save(); ctx.translate(r * 0.42 + hr * 0.3, hr * 0.42); ctx.rotate(ph2 ? 0.15 : -0.3);
    ctx.fillRect(-hr * 0.22, -hr * 0.05, hr * 0.44, hr * 0.1); ctx.restore();
    ctx.fillStyle = '#f2f2e9';
    ctx.beginPath(); ctx.ellipse(r * 0.42 + hr * 0.32, -hr * 0.22, hr * 0.15, hr * 0.09, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.42 + hr * 0.32, hr * 0.22, hr * 0.15, hr * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath(); ctx.arc(r * 0.42 + hr * 0.38, -hr * 0.22, hr * 0.055, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.42 + hr * 0.38, hr * 0.22, hr * 0.055, 0, 7); ctx.fill();
    // THE GRIN — the only boss who smiles at you; phase 2 (or a fresh hit)
    // it collapses into gritted teeth: the mask, slipping
    var grim = ph2 || hr2.k > 0;
    ctx.fillStyle = grim ? '#3a2020' : '#f2f2e9';
    var gw = grim ? hr * 0.28 : hr * 0.5;
    ctx.fillRect(r * 0.42 + hr * 0.52, -gw / 2, hr * 0.14, gw);
    if (!grim) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var tg = -1; tg <= 1; tg++) {
        ctx.moveTo(r * 0.42 + hr * 0.52, tg * gw * 0.25);
        ctx.lineTo(r * 0.42 + hr * 0.66, tg * gw * 0.25);
      }
      ctx.stroke();
    }
    if (ph2) {                                        // baked battle damage
      var dmgRng = DA.makeRng((b.id || 7) * 31);
      ctx.fillStyle = 'rgba(18, 12, 10, 0.5)';
      for (var tw = 0; tw < 3; tw++) {
        var ta = dmgRng() * 6.283, td = r * (0.4 + dmgRng() * 0.4);
        ctx.beginPath();
        DA.polyPath(ctx, Math.cos(ta) * td, Math.sin(ta) * td, r * 0.15, r * 0.15,
                    3 + Math.floor(dmgRng() * 2), dmgRng() * 6.28);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(180, 60, 50, 0.6)';     // a brow-line scar
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.42 + hr * 0.2, -hr * 0.5);
      ctx.lineTo(r * 0.42 + hr * 0.38, hr * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  };
  DA.drawBoss = DA.drawProducer;                      // dispatch + rerun compatibility

  // THE EXECUTIVE: slim pinstriped suit, briefcase, a stock ticker for eyes.
  DA.drawExecutive = function (ctx, b) {
    var r = b.r;
    var ph2 = DA.bossPhase(b) === 2;
    var hr2 = hitReact(b);
    var bx = b.x + hr2.ox, by = b.y + hr2.oy;
    // ASSET SEIZURE zones, under everything
    for (var zi = 0; zi < (b.claims || []).length; zi++) {
      var z = b.claims[zi];
      var zx = z.x - z.w / 2, zy = z.y - z.h / 2;
      if (z.phase === 'mark') {
        ctx.save();
        ctx.strokeStyle = 'rgba(212,160,23,' + (0.35 + 0.45 * (Math.floor(performance.now() / 90) % 2)).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -performance.now() / 40;  // marching ants
        ctx.strokeRect(zx, zy, z.w, z.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(212,160,23,0.05)';
        ctx.fillRect(zx, zy, z.w, z.h);
        if (z.t < 0.4 || Math.floor(performance.now() / 120) % 2 === 0) {
          ctx.fillStyle = 'rgba(212,160,23,0.85)';
          ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
          ctx.fillText('SOLD', zx + 4, zy + 12);
        }
        ctx.restore();
      } else {
        var za = z.phase === 'fade' ? z.t / 0.4 : 1;
        ctx.save();
        ctx.globalAlpha = za;
        ctx.fillStyle = 'rgba(212,160,23,0.13)';
        ctx.fillRect(zx, zy, z.w, z.h);
        ctx.strokeStyle = 'rgba(212,160,23,0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        var hoff = (performance.now() / 30) % 24;
        for (var hx = -z.h; hx < z.w; hx += 24) {
          ctx.moveTo(zx + hx + hoff, zy); ctx.lineTo(zx + hx + hoff + z.h, zy + z.h);
        }
        ctx.stroke();
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2;
        ctx.strokeRect(zx, zy, z.w, z.h);
        ctx.fillStyle = 'rgba(212,160,23,0.9)';
        ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
        ctx.fillText('SOLD', zx + 4, zy + 12);
        ctx.restore();
      }
    }
    if (b.tpGhost > 0) {                              // teleport destination: ghost + auction brackets
      var gk = 1 - b.tpGhost / 0.5;
      if (Math.floor(performance.now() / 70) % 2 === 0) {
        ctx.strokeStyle = 'rgba(122, 138, 255, ' + (0.3 + gk * 0.5).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.tpX, b.tpY, r * 0.9, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.tpX - 8, b.tpY); ctx.lineTo(b.tpX + 8, b.tpY);
        ctx.moveTo(b.tpX, b.tpY - 8); ctx.lineTo(b.tpX, b.tpY + 8);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 214, 96, 0.7)';    // the network placing him
      ctx.lineWidth = 2;
      var bxr = r - gk * 6;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(b.tpX + c[0] * bxr, b.tpY + c[1] * bxr - c[1] * 10);
        ctx.lineTo(b.tpX + c[0] * bxr, b.tpY + c[1] * bxr);
        ctx.lineTo(b.tpX + c[0] * bxr - c[0] * 10, b.tpY + c[1] * bxr);
        ctx.stroke();
      });
    }
    if (b.fadeGhost > 0) {                            // departure afterimage — he's already left
      if (Math.floor(performance.now() / 70) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 * (b.fadeGhost / 0.35);
        ctx.translate(b.lastX, b.lastY);
        ctx.rotate(b.lastFace || 0);
        ctx.strokeStyle = '#7a8aff'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, r * 1.05, r * 0.88, 8, 0.39); ctx.stroke();
        ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, r * 0.5, r * 0.5, 7, 0.45); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';               // grounding shadow
    ctx.beginPath(); ctx.ellipse(bx, by + r * 0.85, r * 0.9, r * 0.34, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(b.faceA != null ? b.faceA : 1.57);
    applySquash(ctx, hr2);
    var breathe = 1 + Math.sin((b.wobble || 0) * 2.3) * 0.012;   // barely breathes
    ctx.scale(breathe, breathe);
    var suit = b.color, suitDark = '#5a68c9';
    var swing = Math.sin((b.wobble || 0) * 1.7);
    ctx.strokeStyle = suitDark;                       // ARMS
    ctx.lineWidth = Math.max(5, r * 0.3);
    ctx.lineCap = 'round';
    var phoneDown = b.enraged && b.grace > 0;         // the act break: THE CALL ENDS
    ctx.beginPath();                                  // phone hand, up by the ear (or sweeping down)
    if (phoneDown) {
      var pk2 = 1 - b.grace / 1.4;
      ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.55, -r * 0.62 + pk2 * r * 1.2);
    } else {
      ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.55, -r * 0.62);
    }
    ctx.stroke();
    if (b.posePhoneUp > 0) {                          // holding the contract up mid-claim
      ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.5, -r * 1.05); ctx.stroke();
      ctx.fillStyle = '#1c202e';
      ctx.fillRect(r * 0.36, -r * 1.3, r * 0.55, r * 0.38);
      ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 1.11); ctx.lineTo(r * 0.91, -r * 1.11); ctx.stroke();
      ctx.strokeStyle = suitDark; ctx.lineWidth = Math.max(5, r * 0.3);
    } else {
      ctx.beginPath();                                // the BRIEFCASE arm
      ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.7, r * 0.95); ctx.stroke();
      ctx.save();
      ctx.translate(r * 0.7, r * 0.95);
      ctx.rotate(swing * 0.06);
      ctx.fillStyle = '#1c202e';
      ctx.fillRect(-r * 0.1, 0, r * 0.55, r * 0.38);
      if (ph2) {                                      // the case hangs OPEN — assets gone
        ctx.save(); ctx.translate(-r * 0.1, 0); ctx.rotate(-0.5);
        ctx.fillRect(0, -r * 0.06, r * 0.55, r * 0.06); ctx.restore();
      } else {
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.06); ctx.lineTo(r * 0.45, r * 0.06); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = suitDark; ctx.lineWidth = Math.max(5, r * 0.3);
    }
    ctx.fillStyle = '#22222c';                        // the phone itself
    if (!phoneDown) {
      ctx.fillRect(r * 0.5, -r * 0.78, r * 0.3, r * 0.42);
      if (!(hr2.k > 0)) {                             // screen glow — dies while he's being hit
        ctx.fillStyle = 'rgba(150,200,255,0.5)';
        ctx.fillRect(r * 0.55, -r * 0.72, r * 0.12, r * 0.2);
      }
    }
    ctx.fillStyle = suit;                             // slim shoulder pads
    ctx.beginPath(); DA.polyPath(ctx, 0, -r * 0.78, r * 0.4, r * 0.4, 5, 4.7); ctx.fill();
    ctx.beginPath(); DA.polyPath(ctx, 0, r * 0.78, r * 0.4, r * 0.4, 5, 1.6); ctx.fill();
    var sg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r * 1.12);
    sg.addColorStop(0, '#98a6ff');
    sg.addColorStop(0.65, suit);
    sg.addColorStop(1, suitDark);
    ctx.fillStyle = sg;                               // the TAILORED plate: long, narrow
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, r * 1.05, r * 0.88, 8, 0.39); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3; ctx.lineJoin = 'miter';
    ctx.stroke();
    if (hr2.k) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * hr2.k).toFixed(2) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, r * 1.05, r * 0.88, 8, 0.39); ctx.stroke();
    }
    ctx.save();                                       // PINSTRIPES, clipped to the plate
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, r * 1.05, r * 0.88, 8, 0.39); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var ps = -2; ps <= 2; ps++) {
      ctx.moveTo(-r * 1.1, ps * r * 0.3); ctx.lineTo(r * 1.1, ps * r * 0.3);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f2f2e9';                        // shirt front
    ctx.beginPath(); DA.polyPath(ctx, r * 0.35, 0, r * 0.48, r * 0.48, 6, 0); ctx.fill();
    ctx.fillStyle = suitDark;                         // lapels
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.48); ctx.lineTo(r * 0.9, -r * 0.26); ctx.lineTo(r * 0.15, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.48); ctx.lineTo(r * 0.9, r * 0.26); ctx.lineTo(r * 0.15, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d4a017';                        // gold tie
    if (ph2) {                                        // his OWN loose tie now
      ctx.save(); ctx.translate(r * 0.12, 0);
      ctx.rotate(0.5 + Math.sin((b.wobble || 0) * 3.1) * 0.2);
      ctx.fillRect(0, -3.5, r * 0.7, 7); ctx.restore();
    } else {
      ctx.fillRect(r * 0.12, -3.5, r * 0.7, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';        // tie clip
      ctx.fillRect(r * 0.45, -3.5, 2, 7);
    }
    var hr = r * 0.5;                                 // head
    ctx.fillStyle = '#e0b08c';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.fill();
    ctx.fillStyle = '#2c2c34';                        // corporate hair wedge
    ctx.beginPath();
    DA.polyPath(ctx, r * 0.42, 0, hr + 0.5, hr + 0.5, 6, 1.85, 0, null, 0.414);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.lineJoin = 'miter';
    ctx.beginPath(); DA.polyPath(ctx, r * 0.42, 0, hr, hr, 7, 0.45); ctx.stroke();
    // the FULL-WIDTH VISOR with a live stock ticker scrolling across it
    var vx = r * 0.42 + hr * 0.15, vw = hr * 0.42, vh = hr * 1.7;
    ctx.fillStyle = '#111';
    ctx.fillRect(vx, -vh / 2, vw, vh);
    if (!b.tickerOffs) {                              // dash positions, baked once
      var tkRng = DA.makeRng((b.id || 7) * 23);
      b.tickerOffs = [];
      for (var tk = 0; tk < 5; tk++) b.tickerOffs.push(tkRng() * vh);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(vx, -vh / 2, vw, vh); ctx.clip();
    var scroll = (performance.now() / 40) % vh;
    for (var td2 = 0; td2 < 5; td2++) {
      if (ph2 && (td2 === 1 || td2 === 3)) continue;  // two dashes go dead below half
      var ty2 = ((b.tickerOffs[td2] - scroll) % vh + vh) % vh - vh / 2;
      ctx.fillStyle = td2 < 3 ? 'rgba(90,255,140,0.55)' : 'rgba(255,90,90,0.55)';
      ctx.fillRect(vx + vw * 0.3, ty2, 1.5, 4);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';         // one specular scanline
    ctx.fillRect(vx, -vh * 0.28, vw, 1);
    if (ph2) {                                        // baked damage: torn suit + cracked visor
      var dmgRng = DA.makeRng((b.id || 7) * 31);
      ctx.fillStyle = 'rgba(14, 14, 24, 0.5)';
      for (var tw = 0; tw < 3; tw++) {
        var ta = dmgRng() * 6.283, td = r * (0.4 + dmgRng() * 0.4);
        ctx.beginPath();
        DA.polyPath(ctx, Math.cos(ta) * td, Math.sin(ta) * td, r * 0.15, r * 0.15,
                    3 + Math.floor(dmgRng() * 2), dmgRng() * 6.28);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(vx + vw * 0.2, -vh * 0.3);
      ctx.lineTo(vx + vw * 0.8, vh * 0.05);
      ctx.lineTo(vx + vw * 0.4, vh * 0.35);
      ctx.stroke();
      if (!phoneDown && Math.floor(performance.now() / 110) % 3 === 0) {   // the phone sparks
        ctx.fillStyle = '#ffe17a';
        ctx.fillRect(r * 0.6, -r * 0.62, 3, 3);
        ctx.fillRect(r * 0.68, -r * 0.5, 2, 2);
      }
    }
    ctx.restore();
  };

  // THE ALGORITHM: a scanning machine — pod halo, quantized iris, scan grid.
  DA.drawAlgorithm = function (ctx, b) {
    var ph2 = DA.bossPhase(b) === 2;
    var hr2 = hitReact(b);
    var bx = b.x + hr2.ox, by = b.y + hr2.oy + Math.sin(b.wobble) * 3;
    var rebooting = b.enraged && b.grace > 0;         // the act-break REBOOT
    var rebootDark = rebooting && b.grace > 0.9;      // lens fully dark for the first 0.5s
    // projected SCAN GRID instead of an organic shadow — it isn't lit, it scans
    ctx.strokeStyle = 'rgba(47,215,196,0.08)'; ctx.lineWidth = 1;
    var cell = b.r * 0.55, gw = b.r * 2.2, gh = b.r * 1.2, gy0 = b.y + 46;
    var gsc = (b.wobble * 8) % cell;
    ctx.beginPath();
    for (var gx2 = -gw / 2; gx2 <= gw / 2; gx2 += cell) {
      ctx.moveTo(b.x + gx2 + gsc - cell / 2, gy0 - gh / 2); ctx.lineTo(b.x + gx2 + gsc - cell / 2, gy0 + gh / 2);
    }
    for (var gy2 = -gh / 2; gy2 <= gh / 2; gy2 += gh / 2) {
      ctx.moveTo(b.x - gw / 2, gy0 + gy2); ctx.lineTo(b.x + gw / 2, gy0 + gy2);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(47,215,196,0.2)';
    ctx.beginPath(); ctx.arc(b.x, gy0, 2, 0, 7); ctx.fill();
    // predictive laser, drawn before the drone so it reads as "from" it
    if (b.laserPhase === 'fire') {
      ctx.fillStyle = 'rgba(120, 255, 235, 0.4)';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.arc(bx, by, ALGO_LASER_LEN, b.laserAngle - ALGO_LASER_HALF_WIDTH, b.laserAngle + ALGO_LASER_HALF_WIDTH);
      ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(b.laserAngle);
      ctx.strokeStyle = 'rgba(47,215,196,0.5)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ALGO_LASER_LEN, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ALGO_LASER_LEN, 0); ctx.stroke();
      ctx.restore();
    } else if (b.laserPhase === 'warn') {
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(b.laserAngle);
      ctx.strokeStyle = 'rgba(120, 255, 235, ' + (0.3 + Math.sin(performance.now() / 50) * 0.25) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ALGO_LASER_LEN, 0); ctx.stroke();
      ctx.restore();
      if (b.predX != null) {                          // the PREDICTION, shown as fiction
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(b.predX, b.predY, 16, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(b.predX - 8, b.predY); ctx.lineTo(b.predX + 8, b.predY);
        ctx.moveTo(b.predX, b.predY - 8); ctx.lineTo(b.predX, b.predY + 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText(['87%', '91%', '96%'][(b.laserCount || 0) % 3], b.predX + 20, b.predY - 12);
        ctx.restore();
      }
    }
    if (b.echo) {                                     // INSTANT REPLAY: your past self, on set
      var e = b.echo;
      if (Math.floor(performance.now() / 50) % 8 !== 0 && e.x != null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(47,215,196,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(e.x, e.y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (var sl = -1; sl <= 1; sl++) {            // scanline body: three slices
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + sl * 9, 12, 3.2, 0, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = '#ff2020';
        ctx.beginPath(); ctx.arc(e.x - 14, e.y - 20, 3, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
        ctx.fillText('REC', e.x - 8, e.y - 17);
        ctx.restore();
      }
    }
    // POD HALO: 5 mini cameras orbiting the core — nothing else in the game
    // orbits; phase 2 two go dark and one drags sparks
    for (var pd = 0; pd < 5; pd++) {
      var dead = ph2 && (pd === 1 || pd === 3);
      var por = b.r * (dead ? 1.4 : 1.7);
      var pa = b.wobble * 0.6 + pd * 1.2566;
      var px2 = bx + Math.cos(pa) * por;
      var py2 = by + Math.sin(pa) * por + Math.sin(b.wobble * 0.9 + pd * 1.7) * 3;
      ctx.save();
      if (dead) ctx.globalAlpha = 0.4;
      ctx.strokeStyle = 'rgba(47,215,196,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px2, py2); ctx.stroke();
      ctx.fillStyle = '#181c22';
      ctx.beginPath(); DA.polyPath(ctx, px2, py2, 5, 5, 6, 0); ctx.fill();
      ctx.fillStyle = dead ? '#1c2226' : b.color;
      ctx.beginPath(); DA.polyPath(ctx, px2, py2, 2, 2, 6, 0); ctx.fill();
      if (!dead && (Math.floor(performance.now() / 700) + pd) % 3 === 0) {
        ctx.fillStyle = '#ff2020';
        ctx.beginPath(); ctx.arc(px2 + 3, py2 - 4, 1.5, 0, 7); ctx.fill();
      }
      if (ph2 && pd === 2 && Math.floor(performance.now() / 90) % 3 === 0) {
        ctx.fillStyle = '#ffe17a';
        ctx.fillRect(px2 - 5, py2 + 3, 2, 2);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(bx, by);
    applySquash(ctx, hr2);
    ctx.rotate(b.wobble * 0.15);                      // never settles, no face
    ctx.fillStyle = '#181c22';                        // drone chassis — angular housing
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r, b.r * 0.72, 6, 0); ctx.fill();
    var focusing = b.laserPhase === 'warn';
    ctx.strokeStyle = rebootDark ? 'rgba(60,70,76,0.6)' :
                      'rgba(47, 215, 196, ' + (focusing ? 0.95 : 0.6) + ')';
    ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.stroke();
    if (hr2.k) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * hr2.k).toFixed(2) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r, b.r * 0.72, 6, 0); ctx.stroke();
    }
    // the lens: dark through the reboot, red-cored after it relights
    ctx.fillStyle = rebootDark ? '#0c1214' : (rebooting ? '#5a1a1a' : b.color);
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r * 0.42, b.r * 0.42, 6, 0); ctx.fill();
    if (b.laserPhase === 'fire') {
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r * 0.28, b.r * 0.28, 6, 0); ctx.fill();
    }
    // QUANTIZED IRIS: it STEPS, it doesn't breathe — during a warn it snaps
    // tight (it's focusing); a fresh echo warn flashes it red
    var irisR = focusing ? b.r * 0.1 : b.r * (0.14 + 0.04 * (Math.floor(b.wobble * 2.5) % 3));
    ctx.fillStyle = b.echoWarn > 0 ? '#8c1c1c' : '#0a0a0f';
    ctx.beginPath(); DA.polyPath(ctx, 0, 0, irisR, irisR, 6, 0); ctx.fill();
    if (!rebootDark) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(-b.r * 0.08, -b.r * 0.08, b.r * 0.06, 0, 7); ctx.fill();
    }
    if (b.shutterT > 0 || hr2.k > 0) {                // the shutter / whiteout under fire
      var wo = Math.max(b.shutterT > 0 ? 0.6 * (b.shutterT / 0.05) : 0, 0.4 * hr2.k);
      ctx.fillStyle = 'rgba(255,255,255,' + wo.toFixed(2) + ')';
      ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r * 0.42, b.r * 0.42, 6, 0); ctx.fill();
    }
    for (var wi = -1; wi <= 1; wi += 2) {              // rotor arms + spinning discs
      ctx.fillStyle = '#22262e';
      ctx.fillRect(wi * b.r * 0.75 - 6, -3, 12, 6);
      ctx.beginPath(); ctx.arc(wi * b.r * 1.1, 0, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(150,160,170,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var rs = 0; rs < 3; rs++) {
        var rsa = b.wobble * 8 + rs * 2.094;
        ctx.moveTo(wi * b.r * 1.1, 0);
        ctx.lineTo(wi * b.r * 1.1 + Math.cos(rsa) * 7, Math.sin(rsa) * 7);
      }
      ctx.stroke();
    }
    if (ph2) {                                        // visible damage: spidered lens, sparking rotor
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var ck = 0; ck < 4; ck++) {
        var cka = 0.7 + ck * 1.5;
        ctx.moveTo(Math.cos(cka) * b.r * 0.12, Math.sin(cka) * b.r * 0.12);
        ctx.lineTo(Math.cos(cka + 0.25) * b.r * 0.4, Math.sin(cka + 0.25) * b.r * 0.4);
      }
      ctx.stroke();
      if (Math.floor(performance.now() / 90) % 3 === 0) {
        ctx.fillStyle = '#ffe17a';
        ctx.fillRect(-b.r * 1.1 - 2, -6, 3, 3);
        ctx.fillRect(-b.r * 1.02, -10, 2, 2);
      }
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';
      if (Math.floor(performance.now() / 240) % 2 === 0) {
        ctx.lineWidth = 2;
        ctx.beginPath(); DA.polyPath(ctx, 0, 0, b.r + 2, b.r * 0.72 + 2, 6, 0); ctx.stroke();
      }
    }
    ctx.restore();
  };

  // --------------------------------------------------------------- BOSS BAR
  // The bar IS the intro card: broadcast chrome from the moment he descends.
  DA.drawBossBar = function (ctx, b, st) {
    var w = 520, h = 18, x = (DA.W - w) / 2, y = 54;
    var jx = 0;
    if (st && st.barGlitchT > 0) jx = Math.round(DA.rand(-3, 3));   // the phase flip stutters the chrome
    ctx.save();
    ctx.translate(jx, 0);
    ctx.fillStyle = 'rgba(8,8,14,0.85)';              // the plate
    ctx.fillRect(x - 12, 20, w + 24, 56);
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(x - 12, 20, 3, 56);
    if (Math.floor((st ? performance.now() : 0) / 700) % 2 === 0) {
      ctx.fillStyle = '#d43a4b';                      // LIVE dot
      ctx.beginPath(); ctx.arc(x + w / 2 - (b.name || '').length * 4.5 - 16, 32, 3.5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#f2f2e9';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.name || 'THE PRODUCER', DA.W / 2, 37);
    ctx.fillStyle = 'rgba(242,242,233,0.6)';
    ctx.font = '10px monospace';
    ctx.fillText(BOSS_EPITHETS[b.type] || '', DA.W / 2, 49);
    ctx.fillStyle = '#3a3a48';                        // the bar
    ctx.fillRect(x, y, w, h);
    var frac = Math.max(0, b.hp / b.maxHp);
    var ghost = Math.max(frac, Math.max(0, (b.hpGhost == null ? b.hp : b.hpGhost) / b.maxHp));
    ctx.fillStyle = 'rgba(255,255,255,0.35)';         // the chip trail — the DPS cap reads as progress
    ctx.fillRect(x + w * frac, y, w * (ghost - frac), h);
    var flick = st && st.barGlitchT > 0 && Math.floor(performance.now() / 60) % 2 === 0;
    ctx.fillStyle = DA.bossPhase(b) === 2 ? (flick ? '#d4a017' : '#d43a4b') : (flick ? '#d43a4b' : (b.color || '#d4a017'));
    ctx.fillRect(x, y, w * frac, h);
    ctx.fillStyle = 'rgba(8,8,14,0.9)';               // the act-break notch at 50%
    ctx.fillRect(x + w / 2 - 1, y, 2, h);
    // the ticker line: the act label, and flash call-outs for signatures
    var tickText = null, tickAlpha = 0.5;
    if (st && st.bossTicker) { tickText = st.bossTicker.text; tickAlpha = Math.min(1, st.bossTicker.t / 0.4); }
    else if (BOSS_ACTS[b.type]) tickText = BOSS_ACTS[b.type][DA.bossPhase(b) - 1];
    if (tickText) {
      ctx.fillStyle = '#d43a4b';
      ctx.beginPath(); ctx.arc(DA.W / 2 - ctx.measureText(tickText).width / 2 - 30, 86, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(232, 212, 77, ' + tickAlpha.toFixed(2) + ')';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(tickText, DA.W / 2, 90);
    }
    ctx.restore();
  };
})();
