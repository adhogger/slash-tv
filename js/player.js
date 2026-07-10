(function () {
  DA.ARENA = { x0: 40, y0: 40, x1: 1240, y1: 680 };
  DA.MAX_HEARTS = 5;
  DA.makePlayer = function () {
    return { x: DA.W / 2, y: DA.H / 2, r: 12, speed: 240, vx: 0, vy: 0,
             hearts: 3, invuln: 0, aimX: 1, aimY: 0, fireCooldown: 0, firing: false,
             gun: 'pistol', gunT: 0, bootsT: 0 };
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
  DA.updatePlayer = function (p, dt, boostsTicking) {
    var s = DA.input.state(p.x, p.y);
    DA.movePlayer(p, s.moveX, s.moveY, dt);
    if (s.aimX || s.aimY) { p.aimX = s.aimX; p.aimY = s.aimY; }
    p.firing = s.firing;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (boostsTicking !== false) {
      if (p.bootsT > 0) p.bootsT -= dt;
      if (p.gunT > 0) {
        p.gunT -= dt;
        if (p.gunT <= 0) p.gun = 'pistol'; // crate expired: back to the trusty pistol
      }
    }
  };
  DA.drawPlayer = function (ctx, p) {
    if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0) return; // blink when hit
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.bootsT > 0) {                              // boots trail
      ctx.fillStyle = 'rgba(76, 201, 240, 0.35)';
      ctx.beginPath(); ctx.arc(-p.vx * 0.03, -p.vy * 0.03, p.r + 3, 0, 7); ctx.fill();
    }
    ctx.rotate(Math.atan2(p.aimY, p.aimX));
    ctx.fillStyle = '#f2f2e9';                       // body
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
    ctx.fillStyle = (DA.GUNS[p.gun] || DA.GUNS.pistol).color; // sash shows current gun
    ctx.fillRect(-p.r, -3, p.r * 2, 6);
    ctx.fillStyle = '#333';                          // gun
    ctx.fillRect(p.r - 3, -2.5, 11, 5);
    ctx.restore();
  };
})();
