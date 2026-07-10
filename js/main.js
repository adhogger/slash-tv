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
    bullets: [],
    enemies: [],
    waveManager: DA.makeWaveManager(DA.ROOMS.testRoom),
    score: 0,
    combo: 1
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
    DA.updateWaves(st.waveManager, st.enemies, dt);
    DA.updateEnemies(st.enemies, st.player, dt);
    DA.resolveCombat(st);
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
    // spawn doors: darker gaps in the walls
    ctx.fillStyle = '#101018';
    for (var i = 0; i < DA.DOORS.length; i++) {
      var d = DA.DOORS[i];
      if (d.y <= A.y0 || d.y >= A.y1) ctx.fillRect(d.x - 50, d.y - 20, 100, 40);
      else ctx.fillRect(d.x - 20, d.y - 50, 40, 100);
    }
  }

  function drawHud(ctx, st) {
    ctx.textAlign = 'center';
    ctx.font = '22px monospace';
    ctx.fillStyle = '#e8d44d';
    var wm = st.waveManager;
    var waveNo = Math.min(wm.wave + 1, wm.room.waves.length);
    ctx.fillText(wm.room.name + ' — WAVE ' + waveNo + '/' + wm.room.waves.length, DA.W / 2, 28);
  }

  function render(ctx) {
    var st = DA.state;
    drawArena(ctx);
    DA.drawBullets(ctx, st.bullets);
    DA.drawEnemies(ctx, st.enemies);
    DA.drawPlayer(ctx, st.player);
    drawHud(ctx, st);
  }

  requestAnimationFrame(frame);
})();
