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

  function enterRoom(st, roomId, entryDir) {
    st.roomId = roomId;
    st.room = DA.ROOMS[roomId];
    st.enemies = [];
    st.bullets = [];
    st.enemyBullets = [];
    st.powerups = [];
    st.powerupT = undefined;
    st.waveManager = DA.makeWaveManager(st.room);
    st.roomCleared = false;
    st.bossDead = false;
    DA.fx.splats.length = 0;   // fresh floor for a fresh studio
    var p = st.player;
    if (entryDir) {            // walk in through the door we came from
      var d = DA.doorByDir(entryDir);
      p.x = DA.clamp(d.x, DA.ARENA.x0 + 80, DA.ARENA.x1 - 80);
      p.y = DA.clamp(d.y, DA.ARENA.y0 + 80, DA.ARENA.y1 - 80);
    } else {
      p.x = DA.W / 2; p.y = DA.H / 2;
    }
    p.vx = 0; p.vy = 0;
    if (st.room.boss) {
      st.enemies.push(DA.makeBoss());
      DA.announce('THE PRODUCER!');
      if (DA.audio) DA.audio.roar();
    } else {
      DA.announce(st.room.name);
    }
  }

  function newGame() {
    DA.fx.particles.length = 0;
    DA.fx.splats.length = 0;
    DA.fx.popups.length = 0;
    DA.fx.queue.length = 0;
    var st = {
      mode: 'playing',
      player: DA.makePlayer(),
      score: 0, combo: 1, comboTimer: 0, kills: 0,
      roomsCleared: 0, groanT: 3
    };
    enterRoom(st, DA.START_ROOM, null);
    return st;
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

  function findBoss(st) {
    for (var i = 0; i < st.enemies.length; i++) if (st.enemies[i].isBoss) return st.enemies[i];
    return null;
  }

  function checkExits(st) {
    for (var dir in st.room.exits) {
      var d = DA.doorByDir(dir);
      if (DA.dist2(st.player.x, st.player.y, d.x, d.y) < 48 * 48) {
        st.roomsCleared++;
        st.score += 1000;
        st.player.hearts = Math.min(st.player.hearts + 1, DA.MAX_HEARTS);
        enterRoom(st, st.room.exits[dir], DA.oppositeDir(dir));
        return;
      }
    }
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

    DA.updatePlayer(st.player, dt, st.enemies.length > 0);
    DA.tryPlayerFire(st.player, st.bullets);
    DA.updateBullets(st.bullets, dt);
    DA.updateWaves(st.waveManager, st.enemies, dt);
    var boss = findBoss(st);
    if (boss) DA.updateBoss(boss, st, dt);
    DA.updateEnemies(st.enemies, st.player, dt);
    DA.updateEnemyBullets(st.enemyBullets, st.player, dt);
    DA.resolveCombat(st);
    DA.updateCombo(st, dt);
    DA.updatePowerups(st, dt);
    DA.updateFx(dt);

    // ambient groans while zombies are on set
    st.groanT -= dt;
    if (st.groanT <= 0) {
      st.groanT = DA.rand(2.5, 6);
      if (st.enemies.length > 0 && DA.audio) DA.audio.groan();
    }

    if (st.player.hearts <= 0) {
      st.mode = 'gameover';
      DA.announce('CUT TO COMMERCIAL!');
      return;
    }
    if (st.room.boss) {
      if (st.bossDead && st.enemies.length === 0) {
        st.mode = 'winner';
        DA.announce("THAT'S A WRAP!");
      }
    } else if (st.waveManager.done) {
      if (!st.roomCleared) {
        st.roomCleared = true;
        DA.announce('ROOM CLEAR — TAKE AN EXIT');
      }
      checkExits(st);
    }
  }

  function drawArena(ctx, st) {
    var A = DA.ARENA;
    ctx.fillStyle = '#2a2a38';                        // walls
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.fillStyle = (st.room && st.room.floor) || '#1c1c26'; // floor
    ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
    ctx.strokeStyle = 'rgba(232, 212, 77, 0.07)';     // game-show floor rings
    ctx.lineWidth = 3;
    for (var r = 80; r <= 320; r += 80) {
      ctx.beginPath(); ctx.arc(DA.W / 2, DA.H / 2, r, 0, 7); ctx.stroke();
    }
    var active = (st.waveManager && st.waveManager.activeDoors) || [];
    for (var i = 0; i < DA.DOORS.length; i++) {       // doors: gaps in the walls
      var d = DA.DOORS[i];
      var isExit = st.room && st.room.exits[d.dir] && st.roomCleared;
      var isSpawning = active.indexOf(d) !== -1;      // red = zombies use this door
      ctx.fillStyle = isExit ? '#2e6b3a' :
        (isSpawning ? 'rgba(150, 35, 45, ' + (0.65 + Math.sin(performance.now() / 200) * 0.25) + ')' : '#101018');
      if (d.dir === 'N' || d.dir === 'S') ctx.fillRect(d.x - 50, d.y - 20, 100, 40);
      else ctx.fillRect(d.x - 20, d.y - 50, 40, 100);
      if (isExit) {
        ctx.fillStyle = '#7ee081';
        ctx.font = 'bold 17px monospace';
        ctx.textAlign = 'center';
        var lx = d.x, ly = d.y;
        if (d.dir === 'N') ly += 46; else if (d.dir === 'S') ly -= 34;
        else if (d.dir === 'W') lx += 62; else lx -= 62;
        ctx.fillText('EXIT', lx, ly + 5);
      }
    }
  }

  function drawHeart(ctx, x, y, size, filled) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, 6);
    else ctx.rect(x, y, size, size);
    if (filled) { ctx.fillStyle = '#d43a4b'; ctx.fill(); }
    else { ctx.strokeStyle = '#4a3a40'; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawHud(ctx, st) {
    var wm = st.waveManager;
    ctx.textAlign = 'center';
    ctx.font = '22px monospace';
    ctx.fillStyle = '#e8d44d';
    var label = st.room.name;
    if (!st.room.boss && wm.room.waves.length) {
      var waveNo = Math.min(wm.wave + 1, wm.room.waves.length);
      label += ' — WAVE ' + waveNo + '/' + wm.room.waves.length;
    }
    ctx.fillText(label, DA.W / 2, 28);
    for (var i = 0; i < DA.MAX_HEARTS; i++) drawHeart(ctx, 16 + i * 30, 12, 22, i < st.player.hearts);
    // current gun, always visible under the hearts
    var gun = DA.GUNS[st.player.gun] || DA.GUNS.pistol;
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = gun.color;
    var gunLabel = gun.label + (st.player.gunT > 0 ? ' ' + Math.ceil(st.player.gunT) + 's' : '');
    ctx.fillText(gunLabel, 16, 60);
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
    var puLines = DA.powerupHudLines(st.player);
    ctx.font = 'bold 17px monospace';
    for (var k = 0; k < puLines.length; k++) {
      ctx.fillStyle = puLines[k].color;
      ctx.fillText(puLines[k].text, DA.W - 20, 90 + k * 22);
    }
    var boss = findBoss(st);
    if (boss) DA.drawBossBar(ctx, boss);
  }

  function drawWorld(ctx, st) {
    ctx.save();
    if (DA.fx.shake > 0) {
      ctx.translate(DA.rand(-DA.fx.shake, DA.fx.shake), DA.rand(-DA.fx.shake, DA.fx.shake));
    }
    drawArena(ctx, st);
    DA.drawFxUnder(ctx);
    DA.drawPowerups(ctx, st.powerups);
    DA.drawBullets(ctx, st.bullets);
    DA.drawEnemyBullets(ctx, st.enemyBullets);
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
      drawArena(ctx, {});
      var hint = DA.input.gamepadConnected() ?
        '🎮 gamepad detected — left stick moves, push right stick to fire that way' :
        'WASD moves — mouse aims — click fires (or plug in a gamepad)';
      drawCenteredScreen(ctx, [
        { text: 'DEAD AIR', font: 'bold 96px monospace', color: '#e8d44d', y: 280 },
        { text: 'EPISODE 1: PILOT SEASON', font: 'bold 28px monospace', color: '#c95d63', y: 330 },
        { text: "America's #1 post-apocalyptic game show!", font: '24px monospace', color: '#f2f2e9', y: 372 },
        { text: 'PRESS FIRE TO PLAY', font: 'bold 30px monospace', color: '#7ee081', y: 450 },
        { text: hint, font: '18px monospace', color: '#8888a0', y: 490 },
        { text: 'M mutes sound', font: '15px monospace', color: '#8888a0', y: 518 }
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
        { text: 'CUT TO COMMERCIAL', font: 'bold 72px monospace', color: '#d43a4b', y: 290 },
        { text: 'You leave with $' + st.score.toLocaleString('en-US') +
                ' after ' + st.roomsCleared + ' room' + (st.roomsCleared === 1 ? '' : 's'),
          font: '26px monospace', color: '#f2f2e9', y: 350 },
        { text: 'PRESS FIRE TO RESTART', font: 'bold 30px monospace', color: '#7ee081', y: 440 }
      ]);
    } else if (st.mode === 'winner') {
      drawCenteredScreen(ctx, [
        { text: "THAT'S A WRAP!", font: 'bold 84px monospace', color: '#e8d44d', y: 280 },
        { text: 'Episode 1 survived — The Producer is done for.', font: '26px monospace', color: '#f2f2e9', y: 335 },
        { text: 'You take home $' + st.score.toLocaleString('en-US'), font: '28px monospace', color: '#7ee081', y: 380 },
        { text: 'PRESS FIRE TO PLAY AGAIN', font: 'bold 30px monospace', color: '#7ee081', y: 460 }
      ]);
    }
  }

  requestAnimationFrame(frame);
})();
