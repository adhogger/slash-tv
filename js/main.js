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

  function newGame() {
    DA.fx.particles.length = 0;
    DA.fx.splats.length = 0;
    DA.fx.popups.length = 0;
    return {
      mode: 'playing',
      player: DA.makePlayer(),
      bullets: [],
      enemies: [],
      waveManager: DA.makeWaveManager(DA.ROOMS.testRoom),
      score: 0,
      combo: 1,
      comboTimer: 0,
      kills: 0
    };
  }

  DA.state = { mode: 'title' };
  var startWasHeld = false; // require a release between screens

  var showDebug = false;    // G toggles a raw-gamepad readout for troubleshooting
  window.addEventListener('keydown', function (e) { if (e.code === 'KeyG') showDebug = !showDebug; });

  function drawDebug(ctx) {
    var info = DA.input.debugInfo();
    var lines = info ?
      ['pad: ' + info.id, 'mapping: ' + info.mapping, 'axes: ' + info.axes,
       'buttons down: ' + info.pressed, 'aim uses: ' + info.aimAxes] :
      ['no gamepad detected — press a button on it'];
    ctx.textAlign = 'left';
    ctx.font = '15px monospace';
    ctx.fillStyle = 'rgba(10,10,15,0.8)';
    ctx.fillRect(50, DA.H - 40 - lines.length * 20, 720, lines.length * 20 + 12);
    ctx.fillStyle = '#7ee081';
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], 60, DA.H - 36 - (lines.length - 1 - i) * 20);
  }

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
    var startHeld = DA.input.startHeld();

    if (st.mode !== 'playing') {
      if (startHeld && !startWasHeld) DA.state = newGame();
      startWasHeld = startHeld;
      DA.updateFx(dt);
      return;
    }
    startWasHeld = startHeld;

    DA.updatePlayer(st.player, dt);
    DA.tryPlayerFire(st.player, st.bullets);
    DA.updateBullets(st.bullets, dt);
    DA.updateWaves(st.waveManager, st.enemies, dt);
    DA.updateEnemies(st.enemies, st.player, dt);
    DA.resolveCombat(st);
    DA.updateCombo(st, dt);
    DA.updateFx(dt);

    if (st.player.hearts <= 0) {
      st.mode = 'gameover';
      DA.announce('CUT TO COMMERCIAL!');
    } else if (st.waveManager.done) {
      st.mode = 'winner';
      DA.announce('WINNER! WINNER!');
    }
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

  function drawHeart(ctx, x, y, size) {
    ctx.fillStyle = '#d43a4b';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, 6);
    else ctx.rect(x, y, size, size);
    ctx.fill();
  }

  function drawHud(ctx, st) {
    var wm = st.waveManager;
    // top-center: room + wave
    ctx.textAlign = 'center';
    ctx.font = '22px monospace';
    ctx.fillStyle = '#e8d44d';
    var waveNo = Math.min(wm.wave + 1, wm.room.waves.length);
    ctx.fillText(wm.room.name + ' — WAVE ' + waveNo + '/' + wm.room.waves.length, DA.W / 2, 28);
    // top-left: hearts
    for (var i = 0; i < st.player.hearts; i++) drawHeart(ctx, 16 + i * 30, 12, 22);
    // top-right: cash score + combo
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#7ee081';
    ctx.fillText('$' + st.score.toLocaleString('en-US'), DA.W - 20, 32);
    if (st.combo > 1) {
      var pulse = st.combo >= 5 ? 1 + Math.sin(performance.now() / 90) * 0.15 : 1;
      ctx.font = 'bold ' + Math.round(24 * pulse) + 'px monospace';
      ctx.fillStyle = '#e8d44d';
      ctx.fillText('x' + st.combo, DA.W - 20, 62);
    }
  }

  function drawWorld(ctx, st) {
    ctx.save();
    if (DA.fx.shake > 0) {
      ctx.translate(DA.rand(-DA.fx.shake, DA.fx.shake), DA.rand(-DA.fx.shake, DA.fx.shake));
    }
    drawArena(ctx);
    DA.drawFxUnder(ctx);
    DA.drawBullets(ctx, st.bullets);
    DA.drawEnemies(ctx, st.enemies);
    DA.drawPlayer(ctx, st.player);
    DA.drawFxOver(ctx);
    ctx.restore();
  }

  function drawCenteredScreen(ctx, lines) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.textAlign = 'center';
    for (var i = 0; i < lines.length; i++) {
      ctx.font = lines[i].font;
      ctx.fillStyle = lines[i].color;
      ctx.fillText(lines[i].text, DA.W / 2, lines[i].y);
    }
  }

  function render(ctx) {
    var st = DA.state;
    if (st.mode === 'title') {
      drawArena(ctx);
      var hint = DA.input.gamepadConnected() ?
        '🎮 gamepad detected — left stick moves, push right stick to fire that way' :
        'WASD moves — mouse aims — click fires (or plug in a gamepad)';
      drawCenteredScreen(ctx, [
        { text: 'DEAD AIR', font: 'bold 96px monospace', color: '#e8d44d', y: 300 },
        { text: "America's #1 post-apocalyptic game show!", font: '26px monospace', color: '#f2f2e9', y: 350 },
        { text: 'PRESS FIRE TO PLAY', font: 'bold 30px monospace', color: '#7ee081', y: 440 },
        { text: hint, font: '18px monospace', color: '#8888a0', y: 480 }
      ]);
      DA.drawFxOver(ctx);
      if (showDebug) drawDebug(ctx);
      return;
    }

    drawWorld(ctx, st);
    drawHud(ctx, st);
    if (showDebug) drawDebug(ctx);

    if (st.mode === 'gameover') {
      drawCenteredScreen(ctx, [
        { text: 'CUT TO COMMERCIAL', font: 'bold 72px monospace', color: '#d43a4b', y: 300 },
        { text: 'You leave with $' + st.score.toLocaleString('en-US'), font: '28px monospace', color: '#f2f2e9', y: 360 },
        { text: 'PRESS FIRE TO RESTART', font: 'bold 30px monospace', color: '#7ee081', y: 440 }
      ]);
    } else if (st.mode === 'winner') {
      drawCenteredScreen(ctx, [
        { text: 'WINNER! WINNER!', font: 'bold 84px monospace', color: '#e8d44d', y: 300 },
        { text: 'You survive with $' + st.score.toLocaleString('en-US'), font: '28px monospace', color: '#f2f2e9', y: 360 },
        { text: 'PRESS FIRE TO PLAY AGAIN', font: 'bold 30px monospace', color: '#7ee081', y: 440 }
      ]);
    }
  }

  requestAnimationFrame(frame);
})();
