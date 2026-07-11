(function () {
  DA.ARENA = { x0: 40, y0: 40, x1: 1240, y1: 680 };
  DA.MAX_HEARTS = 5;
  DA.makePlayer = function () {
    return { x: DA.W / 2, y: DA.H / 2, r: 12, speed: 240, vx: 0, vy: 0,
             hearts: 3, invuln: 0, aimX: 1, aimY: 0, fireCooldown: 0, firing: false,
             gun: 'pistol', gunT: 0, bootsT: 0, shieldT: 0 };
  };
  DA.clampToArena = function (e) {
    e.x = DA.clamp(e.x, DA.ARENA.x0 + e.r, DA.ARENA.x1 - e.r);
    e.y = DA.clamp(e.y, DA.ARENA.y0 + e.r, DA.ARENA.y1 - e.r);
  };
  // velocity eases toward the input direction instead of snapping — smooth, not jerky
  DA.movePlayer = function (p, mx, my, dt) {
    var mv = DA.norm(mx, my);
    var sp = p.speed * (p.bootsT > 0 ? 1.4 : 1);
    var k = Math.min(1, 10 * dt);
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
    var mul = p.downed ? 0.25 : 1;          // downed contestants crawl
    DA.movePlayer(p, s.moveX * mul, s.moveY * mul, dt);
    if (s.aimX || s.aimY) { p.aimX = s.aimX; p.aimY = s.aimY; }
    p.firing = p.downed ? false : !!s.firing;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (boostsTicking !== false) {
      if (p.bootsT > 0) p.bootsT -= dt;
      if (p.shieldT > 0) p.shieldT -= dt;
      if (p.gunT > 0) {
        p.gunT -= dt;
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
    if (p.downed) {                                  // crawling, waiting for a hand
      ctx.rotate(Math.atan2(p.aimY, p.aimX));
      ctx.globalAlpha = 0.85;
      ctx.scale(1, 0.6);
      ctx.fillStyle = p.bot ? '#7fa3b5' : '#c9c9c0';
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      if (p.reviveP > 0) {                           // the helping-hand ring
        ctx.strokeStyle = '#7ee081'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y - p.r - 14, 10, -1.57, -1.57 + p.reviveP * 6.283);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.rotate(Math.atan2(p.aimY, p.aimX));
    ctx.fillStyle = p.remote ? '#f2e2b0' :           // guest seats wear gold-tinted white
                    (p.bot ? '#a8c8d8' : '#f2f2e9'); // body (CAM-BOT runs brushed steel)
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
    ctx.fillStyle = (DA.GUNS[p.gun] || DA.GUNS.pistol).color; // sash shows current gun
    ctx.fillRect(-p.r, -3, p.r * 2, 6);
    ctx.fillStyle = '#333';                          // gun
    ctx.fillRect(p.r - 3, -2.5, 11, 5);
    var g = DA.GUNS[p.gun] || DA.GUNS.pistol;        // muzzle flash right after a shot
    if (p.firing && p.fireCooldown > g.rate - 0.05) {
      ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
      ctx.beginPath(); ctx.arc(p.r + 11, 0, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255, 200, 80, 0.25)';
      ctx.beginPath(); ctx.arc(p.r + 11, 0, 13, 0, 7); ctx.fill();
    }
    ctx.restore();
  };
})();
