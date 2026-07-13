(function () {
  DA.ARENA = { x0: 40, y0: 40, x1: 1240, y1: 680 };
  DA.MAX_HEARTS = 5;
  DA.makePlayer = function () {
    return { x: DA.W / 2, y: DA.H / 2, r: 12, speed: 215, vx: 0, vy: 0,
             hearts: 3, invuln: 0, aimX: 1, aimY: 0, fireCooldown: 0, firing: false,
             gun: 'pistol', gunT: 0, bootsT: 0, shieldT: 0 };
  };
  DA.clampToArena = function (e) {
    e.x = DA.clamp(e.x, DA.ARENA.x0 + e.r, DA.ARENA.x1 - e.r);
    e.y = DA.clamp(e.y, DA.ARENA.y0 + e.r, DA.ARENA.y1 - e.r);
  };
  // velocity eases toward the input direction instead of snapping — smooth, not
  // jerky. Letting go brakes much harder than speeding up does, so stopping
  // feels planted instead of skating.
  DA.movePlayer = function (p, mx, my, dt) {
    var mv = DA.norm(mx, my);
    var sp = p.speed * (p.bootsT > 0 ? 1.4 : 1);
    var k = Math.min(1, (mv.x || mv.y ? 10 : 22) * dt);
    p.vx += (mv.x * sp - p.vx) * k;
    p.vy += (mv.y * sp - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    DA.clampToArena(p);
  };
  // boostsTicking === false freezes spread/boots timers (between fights and rooms,
  // so a late pickup isn't wasted walking to the exit)
  // input is a plain {moveX, moveY, aimX, aimY, firing} state. The human
  // passes DA.input.state(), the bot passes DA.botInput(), and a networked
  // player will pass the last packet — same shape for all three.
  DA.updatePlayer = function (p, input, dt, boostsTicking) {
    var s = input || { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false };
    if (p.downed) {                         // a body takes NO input — frozen where it fell
      p.vx = 0; p.vy = 0;
      p.firing = false;
    } else {
      DA.movePlayer(p, s.moveX, s.moveY, dt);
      if (s.aimX || s.aimY) { p.aimX = s.aimX; p.aimY = s.aimY; }
      p.firing = !!s.firing;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.hurtFlashT > 0) p.hurtFlashT -= dt;
    p.walkT = (p.walkT || 0) + Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt * 0.06;
    var moving = Math.abs(p.vx) > 20 || Math.abs(p.vy) > 20;
    p.stepT = (p.stepT || 0) - dt;
    if (moving && !p.downed && p.stepT <= 0) {
      p.stepT = 0.11;
      if (DA.dust) DA.dust(p.x - p.vx * 0.02, p.y + p.r * 0.7 - p.vy * 0.02);
    }
    if (boostsTicking !== false) {
      if (p.bootsT > 0) p.bootsT -= dt;
      if (p.shieldT > 0) p.shieldT -= dt;
      if (p.gunT > 0) {
        p.gunT -= dt;
        if (p.gunT <= 1 && !p.gunWarnPlayed) {      // one-shot "running out" tell
          p.gunWarnPlayed = true;
          if (DA.audio && DA.audio.tick) DA.audio.tick();
        }
        if (p.gunT <= 0) p.gun = 'pistol'; // crate expired: back to the trusty pistol
      }
    }
  };
  DA.drawPlayer = function (ctx, p) {
    if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0) return; // blink when hit
    ctx.fillStyle = 'rgba(0,0,0,0.3)';               // grounding shadow
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.85, p.r * 0.9, p.r * 0.36, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.bootsT > 0) {                              // boots trail
      ctx.fillStyle = 'rgba(76, 201, 240, 0.35)';
      ctx.beginPath(); ctx.arc(-p.vx * 0.03, -p.vy * 0.03, p.r + 3, 0, 7); ctx.fill();
    }
    if (p.shieldT > 0) {                             // shield bubble
      var fading = p.shieldT < 2 && Math.floor(p.shieldT * 6) % 2 === 0;
      if (!fading) {
        ctx.strokeStyle = 'rgba(154, 215, 255, ' + (0.6 + Math.sin(performance.now() / 120) * 0.25) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, p.r + 7, 0, 7); ctx.stroke();
      }
    }
    var seat2 = p.remote || p.localP2;    // seat 2 (human): local co-op partner OR online guest
    if (p.downed) {                                  // still and dead — frozen where he fell
      var deadA = p.downAim != null ? p.downAim : Math.atan2(p.aimY, p.aimX);
      ctx.rotate(deadA);
      ctx.globalAlpha = 0.85;
      ctx.scale(1, 0.6);
      ctx.fillStyle = p.bot ? '#7fa3b5' : (seat2 ? '#a89ac2' : '#c9c9c0');
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();                                   // back to world space (p.x/p.y absolute)
      // chalk-outline limbs splayed from the torso — a top-down crime-scene
      // read so a downed body is unmistakably a BODY, not just a flat disc
      ctx.save();
      ctx.translate(p.x, p.y);                         // re-enter the body's frame, unsquashed
      ctx.rotate(deadA);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.25, -p.r * 0.55); ctx.lineTo(-p.r * 1.6, -p.r * 1.15);   // arm
      ctx.moveTo(-p.r * 0.25, p.r * 0.55); ctx.lineTo(-p.r * 1.7, p.r * 0.35);     // arm
      ctx.moveTo(p.r * 0.5, -p.r * 0.4); ctx.lineTo(p.r * 1.7, -p.r * 0.75);       // leg
      ctx.moveTo(p.r * 0.5, p.r * 0.4); ctx.lineTo(p.r * 1.8, p.r * 0.8);          // leg
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (p.reviveP > 0) {                           // the helping-hand ring
        ctx.strokeStyle = '#7ee081'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y - p.r - 14, 10, -1.57, -1.57 + p.reviveP * 6.283);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    var mvA = Math.atan2(p.vy, p.vx);                // feet track MOVEMENT, torso tracks aim
    if (p.vx * p.vx + p.vy * p.vy > 400) {
      var step = Math.sin(p.walkT || 0);
      ctx.fillStyle = '#2c2c34';
      for (var fs = -1; fs <= 1; fs += 2) {
        ctx.beginPath();
        ctx.ellipse(-Math.sin(mvA) * fs * p.r * 0.45 + Math.cos(mvA) * step * fs * 5,
                    Math.cos(mvA) * fs * p.r * 0.45 + Math.sin(mvA) * step * fs * 5 + p.r * 0.55,
                    4.5, 3, mvA, 0, 7);
        ctx.fill();
      }
    }
    ctx.rotate(Math.atan2(p.aimY, p.aimX));
    ctx.fillStyle = p.bot ? '#a8c8d8' :              // CAM-BOT runs brushed steel
                    (seat2 ? '#b78bff' : '#f2f2e9');  // seat 2 wears purple, seat 1 wears white
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';             // outline
    ctx.lineWidth = 2;
    ctx.stroke();
    if (p.bot) {                                     // camera lens + antenna
      ctx.fillStyle = '#1a2630';
      ctx.beginPath(); ctx.arc(p.r * 0.45, 0, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#d43a4b';                     // tally light: always recording
      ctx.beginPath(); ctx.arc(p.r * 0.45, 0, 1.8, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a7a8a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-p.r * 0.5, -p.r * 0.5); ctx.lineTo(-p.r - 6, -p.r - 6); ctx.stroke();
      ctx.fillStyle = '#9ad7ff';
      ctx.beginPath(); ctx.arc(-p.r - 6, -p.r - 6, 2.5, 0, 7); ctx.fill();
    }
    if (!p.bot) {                                    // jumpsuit detail: seams + holster
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-p.r * 0.2, -p.r * 0.85); ctx.lineTo(-p.r * 0.2, p.r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.r * 0.55, -p.r * 0.75); ctx.lineTo(p.r * 0.85, 0); ctx.lineTo(p.r * 0.55, p.r * 0.75); ctx.stroke();
      ctx.fillStyle = '#3a3228';                     // hip holster
      ctx.fillRect(-p.r * 0.55, p.r * 0.6, 7, 5);
    }
    ctx.fillStyle = (DA.GUNS[p.gun] || DA.GUNS.pistol).color; // sash shows current gun
    ctx.fillRect(-p.r, -3, p.r * 2, 6);
    if (!p.bot) {
      ctx.fillStyle = '#e0b08c';                     // hands gripping the gun
      ctx.beginPath(); ctx.arc(p.r * 0.7, -3.5, 3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(p.r * 0.7, 3.5, 3, 0, 7); ctx.fill();
    }
    drawHeldGun(ctx, p.gun, p.r);                    // a shotgun LOOKS like a shotgun
    if (!p.bot) {                                    // head: hair at the back, face forward
      var hr = p.r * 0.52;
      ctx.fillStyle = '#e0b08c';
      ctx.beginPath(); ctx.arc(0, 0, hr, 0, 7); ctx.fill();
      ctx.fillStyle = seat2 ? '#7a4f2a' : '#3a2c20';
      ctx.beginPath(); ctx.arc(0, 0, hr + 0.5, 1.9, 4.4); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, hr, 0, 7); ctx.stroke();
    }
    var g = DA.GUNS[p.gun] || DA.GUNS.pistol;        // per-gun muzzle flash shapes
    if (p.firing && p.fireCooldown > g.rate - 0.05) drawMuzzleFlash(ctx, p.gun, p.r);
    ctx.restore();
  };

  // held-weapon silhouettes, drawn in the aim-rotated frame (facing +x)
  function drawHeldGun(ctx, id, r) {
    var METAL = '#2c2c34', DARK = '#1c1c22', WOOD = '#5a4128';
    ctx.fillStyle = METAL;
    if (id === 'shotgun') {
      ctx.fillStyle = WOOD; ctx.fillRect(r - 10, -3, 7, 6);          // stock
      ctx.fillStyle = METAL; ctx.fillRect(r - 4, -2.5, 20, 5);       // long barrel
      ctx.fillStyle = '#4a4a58'; ctx.fillRect(r + 5, -4, 6, 8);      // pump
    } else if (id === 'minigun') {
      ctx.fillStyle = DARK; ctx.fillRect(r - 5, -5.5, 17, 11);       // fat rotary body
      ctx.fillStyle = '#4a4a58';
      ctx.fillRect(r + 12, -4.5, 6, 3); ctx.fillRect(r + 12, -1.5, 6, 3); ctx.fillRect(r + 12, 1.5, 6, 3);
    } else if (id === 'railgun') {
      ctx.fillRect(r - 4, -2, 19, 4);                                // rail
      ctx.strokeStyle = '#b78bff'; ctx.lineWidth = 2;                // coils
      ctx.beginPath(); ctx.arc(r + 4, 0, 4, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(r + 10, 0, 4, 0, 7); ctx.stroke();
    } else if (id === 'flamer') {
      ctx.fillStyle = '#7a3018'; ctx.beginPath(); ctx.arc(r - 6, 5, 4.5, 0, 7); ctx.fill();  // fuel tank
      ctx.fillStyle = METAL; ctx.fillRect(r - 4, -3, 15, 6);
      ctx.fillStyle = '#ff5b1f'; ctx.beginPath(); ctx.arc(r + 12, 0, 2, 0, 7); ctx.fill();   // pilot light
    } else if (id === 'rocket') {
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(r - 6, -4.5, 22, 9);   // launch tube
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(r + 16, 0, 4, 0, 7); ctx.fill();        // open muzzle
      ctx.fillStyle = '#d43a4b'; ctx.fillRect(r + 2, -4.5, 3, 9);    // warning band
    } else if (id === 'smg') {
      ctx.fillRect(r - 4, -3, 13, 6);
      ctx.fillStyle = DARK; ctx.fillRect(r + 1, 3, 4, 7);            // magazine
    } else if (id === 'triple') {
      ctx.fillRect(r - 3, -5, 12, 3); ctx.fillRect(r - 3, -1.5, 14, 3); ctx.fillRect(r - 3, 2, 12, 3);
    } else {                                                          // pistol
      ctx.fillRect(r - 3, -2.5, 11, 5);
      ctx.fillStyle = DARK; ctx.fillRect(r - 2, 2, 4, 4);            // grip
    }
  }

  // per-gun muzzle flash shapes at the barrel tip
  function drawMuzzleFlash(ctx, id, r) {
    var tip = r + (id === 'rocket' ? 20 : (id === 'shotgun' || id === 'railgun' ? 17 : 12));
    if (id === 'shotgun') {
      ctx.fillStyle = 'rgba(255, 210, 110, 0.45)';                   // wide cone
      ctx.beginPath(); ctx.moveTo(tip - 3, 0); ctx.lineTo(tip + 9, -6); ctx.lineTo(tip + 9, 6); ctx.closePath(); ctx.fill();
    } else if (id === 'minigun') {
      ctx.fillStyle = 'rgba(255, 230, 140, 0.5)';                    // 4-point star
      ctx.beginPath();
      ctx.moveTo(tip + 6, 0); ctx.lineTo(tip + 1.5, 1.5); ctx.lineTo(tip, 6); ctx.lineTo(tip - 1.5, 1.5);
      ctx.lineTo(tip - 6, 0); ctx.lineTo(tip - 1.5, -1.5); ctx.lineTo(tip, -6); ctx.lineTo(tip + 1.5, -1.5);
      ctx.closePath(); ctx.fill();
    } else if (id === 'railgun') {
      ctx.strokeStyle = 'rgba(183, 139, 255, 0.6)';                  // charge ring
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tip, 0, 5, 0, 7); ctx.stroke();
    } else if (id === 'rocket') {
      ctx.fillStyle = 'rgba(255, 170, 80, 0.4)';                     // backblast puff
      ctx.beginPath(); ctx.arc(tip, 0, 6, 0, 7); ctx.fill();
    } else if (id !== 'flamer') {                                     // small classic flash
      ctx.fillStyle = 'rgba(255, 240, 150, 0.4)';
      ctx.beginPath(); ctx.arc(tip, 0, 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255, 200, 80, 0.12)';
      ctx.beginPath(); ctx.arc(tip, 0, 3, 0, 7); ctx.fill();
    }
  }
})();
