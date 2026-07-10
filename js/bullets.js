(function () {
  var SPEED = 700, RATE = 0.14; // seconds between shots
  DA.fireBullet = function (arr, x, y, dx, dy) {
    arr.push({ x: x, y: y, dx: dx, dy: dy, r: 5 });
  };
  DA.updateBullets = function (arr, dt) {
    for (var i = arr.length - 1; i >= 0; i--) {
      var b = arr[i];
      b.x += b.dx * SPEED * dt; b.y += b.dy * SPEED * dt;
      if (b.x < DA.ARENA.x0 || b.x > DA.ARENA.x1 || b.y < DA.ARENA.y0 || b.y > DA.ARENA.y1) arr.splice(i, 1);
    }
  };
  DA.tryPlayerFire = function (p, arr) {
    if (!p.firing || p.fireCooldown > 0) return;
    p.fireCooldown = RATE;
    DA.fireBullet(arr, p.x + p.aimX * 20, p.y + p.aimY * 20, p.aimX, p.aimY);
  };
  DA.drawBullets = function (ctx, arr) {
    ctx.fillStyle = '#ffd94a';
    for (var i = 0; i < arr.length; i++) {
      var b = arr[i];
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    }
  };
})();
