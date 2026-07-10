(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  function fit() {
    var scale = Math.min(window.innerWidth / DA.W, window.innerHeight / DA.H);
    canvas.style.width = Math.floor(DA.W * scale) + 'px';
    canvas.style.height = Math.floor(DA.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  DA.state = {
    player: DA.makePlayer(),
    bullets: []
  };

  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); // cap dt: tab-switch safety
    last = now;
    update(dt);
    render(ctx);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    var st = DA.state;
    DA.updatePlayer(st.player, dt);
    DA.tryPlayerFire(st.player, st.bullets);
    DA.updateBullets(st.bullets, dt);
  }

  function drawArena(ctx) {
    var A = DA.ARENA;
    // walls
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(0, 0, DA.W, DA.H);
    // floor
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
    // game-show floor rings
    ctx.strokeStyle = 'rgba(232, 212, 77, 0.07)';
    ctx.lineWidth = 3;
    for (var r = 80; r <= 320; r += 80) {
      ctx.beginPath(); ctx.arc(DA.W / 2, DA.H / 2, r, 0, 7); ctx.stroke();
    }
  }

  function render(ctx) {
    var st = DA.state;
    drawArena(ctx);
    DA.drawBullets(ctx, st.bullets);
    DA.drawPlayer(ctx, st.player);
  }

  requestAnimationFrame(frame);
})();
