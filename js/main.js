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

  // localStorage can be blocked (private mode) — never let that crash the game
  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  function enterRoom(st, roomId, entryDir) {
    st.roomId = roomId;
    st.room = DA.ROOMS[roomId];
    st.visited[roomId] = true;
    st.enemies = [];
    st.bullets = [];
    st.enemyBullets = [];
    st.powerups = [];
    st.powerupT = undefined;
    st.waveManager = DA.makeWaveManager(st.room);
    st.roomCleared = false;
    st.bossDead = false;
    st.lastWave = 0;
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
      var boss = st.room.boss === 'executive' ? DA.makeExecutive() : DA.makeBoss();
      st.enemies.push(boss);
      DA.announce(boss.name + '!');
      if (DA.audio) DA.audio.roar();
    } else {
      DA.announce(st.room.name);
    }
  }

  function newGame(startRoom) {
    DA.fx.particles.length = 0;
    DA.fx.splats.length = 0;
    DA.fx.popups.length = 0;
    DA.fx.queue.length = 0;
    var st = {
      mode: 'playing',
      player: DA.makePlayer(),
      score: 0, combo: 1, comboTimer: 0, kills: 0,
      roomsCleared: 0, groanT: 3, visited: {},
      stats: { shots: 0, hits: 0, killsByGun: {}, start: performance.now() }
    };
    enterRoom(st, startRoom || DA.START_ROOM, null);
    if (st.room.ep === 2) st.player.hearts = DA.MAX_HEARTS; // champions start refreshed
    return st;
  }

  DA.state = { mode: 'title' };
  var startWasHeld = false;   // require a release between screens
  var endlessWasHeld = false;
  var paused = false;
  var pauseWasHeld = false;

  var showDebug = false;      // G toggles a raw-gamepad readout for troubleshooting
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyG') showDebug = !showDebug;
    if ((e.code === 'Escape' || e.code === 'KeyP') && DA.state.mode === 'playing') paused = !paused;
  });
  var endlessKeyHeld = false, ep2KeyHeld = false;
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = true;
    if (e.code === 'Digit2') ep2KeyHeld = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = false;
    if (e.code === 'Digit2') ep2KeyHeld = false;
  });

  function endlessUnlocked() { return load('deadset_ep1') === '1'; }
  function ep2Unlocked() { return load('deadset_ep1') === '1'; }
  var ep2WasHeld = false;

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

  function endRun(st, won) {
    st.mode = won ? 'winner' : 'gameover';
    st.stats.seconds = Math.round((performance.now() - st.stats.start) / 1000);
    var best = parseInt(load('deadset_best') || '0', 10);
    st.newBest = st.score > best;
    if (st.newBest) store('deadset_best', String(st.score));
    if (won) {
      store('deadset_ep1', '1');
      if (st.room.ep === 2) store('deadset_ep2', '1');
    }
    if (st.room.endless) {
      var bw = parseInt(load('deadset_best_waves') || '0', 10);
      st.newBestWaves = st.waveManager.wave > bw;
      if (st.newBestWaves) store('deadset_best_waves', String(st.waveManager.wave));
    }
    DA.announce(won ? "THAT'S A WRAP!" : 'CUT TO COMMERCIAL!');
  }

  function update(dt) {
    var st = DA.state;
    var startHeld = DA.input.startHeld();

    if (st.mode !== 'playing') {
      paused = false;
      if (startHeld && !startWasHeld) DA.state = newGame();
      var endlessHeld = endlessKeyHeld || DA.input.padButton(3);
      if (endlessUnlocked() && endlessHeld && !endlessWasHeld) DA.state = newGame('endless');
      var ep2Held = ep2KeyHeld || DA.input.padButton(2);
      if (ep2Unlocked() && ep2Held && !ep2WasHeld) DA.state = newGame('writers');
      startWasHeld = startHeld;
      endlessWasHeld = endlessHeld;
      ep2WasHeld = ep2Held;
      DA.updateFx(dt);
      return;
    }
    startWasHeld = startHeld;

    // gamepad Start button pauses (edge-triggered)
    var pauseHeld = DA.input.padButton(9);
    if (pauseHeld && !pauseWasHeld) paused = !paused;
    pauseWasHeld = pauseHeld;
    if (paused) return;

    DA.updatePlayer(st.player, dt, st.enemies.length > 0);
    st.stats.shots += DA.tryPlayerFire(st.player, st.bullets);
    DA.updateBullets(st.bullets, dt);
    DA.updateWaves(st.waveManager, st.enemies, dt);
    var boss = findBoss(st);
    if (boss) {
      if (boss.type === 'executive') DA.updateExecutive(boss, st, dt);
      else DA.updateBoss(boss, st, dt);
    }
    DA.updateEnemies(st.enemies, st.player, dt);
    DA.updateBoomers(st, dt);
    DA.updateEnemyBullets(st.enemyBullets, st.player, dt, st);
    DA.resolveCombat(st);
    DA.updateCombo(st, dt);
    DA.updatePowerups(st, dt);
    DA.updateFx(dt);

    // endless: the audience tosses a heart every 3rd wave survived
    if (st.room.endless && st.waveManager.wave > st.lastWave) {
      st.lastWave = st.waveManager.wave;
      if (st.lastWave % 3 === 0) {
        st.player.hearts = Math.min(st.player.hearts + 1, DA.MAX_HEARTS);
        DA.announce('AUDIENCE GIFT: +1 HEART');
      }
    }

    // ambient groans while zombies are on set
    st.groanT -= dt;
    if (st.groanT <= 0) {
      st.groanT = DA.rand(2.5, 6);
      if (st.enemies.length > 0 && DA.audio) DA.audio.groan();
    }

    if (st.player.hearts <= 0) { endRun(st, false); return; }
    if (st.room.boss) {
      if (st.bossDead && st.enemies.length === 0) endRun(st, true);
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

  // the studio map: shown while choosing an exit, and while paused
  function drawMap(ctx, st) {
    var ox = DA.W - 330, oy = DA.H - 130, sx = 62, sy = 56;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.82)';
    ctx.fillRect(ox - 34, oy - 44, 344, 122);
    ctx.fillStyle = '#8888a0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STUDIO MAP', ox - 22, oy - 26);
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 2;
    var id, room;
    var ep = st.room.ep || 1;                          // only this episode's floor plan
    for (id in DA.ROOMS) {                             // corridors
      room = DA.ROOMS[id];
      if (!room.map || (room.ep || 1) !== ep) continue;
      for (var dir in room.exits) {
        var to = DA.ROOMS[room.exits[dir]];
        if (!to || !to.map) continue;
        ctx.beginPath();
        ctx.moveTo(ox + room.map.x * sx, oy + room.map.y * sy);
        ctx.lineTo(ox + to.map.x * sx, oy + to.map.y * sy);
        ctx.stroke();
      }
    }
    for (id in DA.ROOMS) {                             // rooms
      room = DA.ROOMS[id];
      if (!room.map || (room.ep || 1) !== ep) continue;
      var x = ox + room.map.x * sx, y = oy + room.map.y * sy;
      var here = id === st.roomId;
      ctx.beginPath(); ctx.arc(x, y, here ? 9 : 7, 0, 7);
      if (here) { ctx.fillStyle = '#7ee081'; ctx.fill(); }
      else if (st.visited && st.visited[id]) { ctx.fillStyle = '#e8d44d'; ctx.fill(); }
      else { ctx.strokeStyle = room.boss ? '#c95d63' : '#555566'; ctx.lineWidth = 2; ctx.stroke(); }
    }
  }

  function drawHud(ctx, st) {
    var wm = st.waveManager;
    ctx.textAlign = 'center';
    ctx.font = '22px monospace';
    ctx.fillStyle = '#e8d44d';
    var label = st.room.name;
    if (st.room.endless) label += ' — WAVE ' + (wm.wave + 1);
    else if (!st.room.boss && wm.room.waves.length) {
      var waveNo = Math.min(wm.wave + 1, wm.room.waves.length);
      label += ' — WAVE ' + waveNo + '/' + wm.room.waves.length;
    }
    ctx.fillText(label, DA.W / 2, 28);
    for (var i = 0; i < DA.MAX_HEARTS; i++) drawHeart(ctx, 16 + i * 30, 12, 22, i < st.player.hearts);
    var gun = DA.GUNS[st.player.gun] || DA.GUNS.pistol;
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = gun.color;
    ctx.fillText(gun.label + (st.player.gunT > 0 ? ' ' + Math.ceil(st.player.gunT) + 's' : ''), 16, 60);
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
    if (DA.fx.shake > 0 && !paused) {
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

  function favoriteGun(st) {
    var best = null, n = 0;
    for (var g in st.stats.killsByGun) {
      if (st.stats.killsByGun[g] > n) { n = st.stats.killsByGun[g]; best = g; }
    }
    return best ? best + ' (' + n + ' kills)' : '—';
  }

  function statsLines(st, y) {
    var acc = st.stats.shots ? Math.round(st.stats.hits / st.stats.shots * 100) : 0;
    var mins = Math.floor(st.stats.seconds / 60), secs = st.stats.seconds % 60;
    var run = st.room.endless ? (st.waveManager.wave + ' waves survived') :
                                (st.roomsCleared + ' rooms cleared');
    return [
      { text: run + '  ·  ' + st.kills + ' kills  ·  ' + acc + '% accuracy',
        font: '22px monospace', color: '#f2f2e9', y: y },
      { text: 'favorite gun: ' + favoriteGun(st) + '  ·  ' + mins + 'm ' + secs + 's on air',
        font: '20px monospace', color: '#8888a0', y: y + 32 }
    ];
  }

  function render(ctx) {
    var st = DA.state;
    if (st.mode === 'title') {
      drawArena(ctx, {});
      var hint = DA.input.gamepadConnected() ?
        '🎮 gamepad detected — left stick moves, push right stick to fire that way' :
        'WASD moves — mouse aims — click fires (or plug in a gamepad)';
      var lines = [
        { text: 'DEAD SET', font: 'bold 96px monospace', color: '#e8d44d', y: 250 },
        { text: "New America's #1 post-apocalyptic game show!", font: '24px monospace', color: '#f2f2e9', y: 300 },
        { text: 'PRESS FIRE — EPISODE 1: PILOT SEASON', font: 'bold 28px monospace', color: '#7ee081', y: 386 }
      ];
      if (ep2Unlocked()) {
        lines.push({ text: '2 (or 🎮 X) — EPISODE 2: SWEEPS WEEK' + (load('deadset_ep2') === '1' ? ' ✓' : ''),
                     font: 'bold 24px monospace', color: '#c95d63', y: 426 });
      }
      if (endlessUnlocked()) {
        lines.push({ text: 'E (or 🎮 Y) — ENDLESS ARENA — best: wave ' + (load('deadset_best_waves') || '0'),
                     font: 'bold 22px monospace', color: '#5bc8d6', y: 462 });
      }
      var best = load('deadset_best');
      if (best) lines.push({ text: 'BEST: $' + parseInt(best, 10).toLocaleString('en-US'),
                             font: 'bold 20px monospace', color: '#e8d44d', y: 502 });
      lines.push({ text: hint, font: '18px monospace', color: '#8888a0', y: 545 });
      lines.push({ text: 'Esc pauses · M mutes', font: '15px monospace', color: '#8888a0', y: 572 });
      drawCenteredScreen(ctx, lines);
      DA.drawFxOver(ctx);
      if (showDebug) drawDebug(ctx);
      return;
    }

    drawWorld(ctx, st);
    drawHud(ctx, st);
    if (st.mode === 'playing' && st.roomCleared && st.room.map) drawMap(ctx, st);
    if (showDebug) drawDebug(ctx);

    if (paused && st.mode === 'playing') {
      drawCenteredScreen(ctx, [
        { text: 'PAUSED', font: 'bold 72px monospace', color: '#e8d44d', y: 300 },
        { text: 'WE\'LL BE RIGHT BACK', font: '24px monospace', color: '#8888a0', y: 345 },
        { text: 'Esc / P / 🎮 Start to resume', font: 'bold 22px monospace', color: '#7ee081', y: 420 }
      ]);
      if (st.room.map) drawMap(ctx, st);
      return;
    }

    if (st.mode === 'gameover') {
      var go = [
        { text: 'CUT TO COMMERCIAL', font: 'bold 72px monospace', color: '#d43a4b', y: 250 },
        { text: 'You leave with $' + st.score.toLocaleString('en-US') +
                (st.newBest ? '  —  NEW BEST!' : ''),
          font: '26px monospace', color: st.newBest ? '#e8d44d' : '#f2f2e9', y: 310 }
      ].concat(statsLines(st, 370));
      go.push({ text: 'PRESS FIRE TO RESTART', font: 'bold 30px monospace', color: '#7ee081', y: 480 });
      if (endlessUnlocked()) go.push({ text: 'E (or 🎮 Y) for Endless Arena', font: '19px monospace', color: '#5bc8d6', y: 516 });
      drawCenteredScreen(ctx, go);
    } else if (st.mode === 'winner') {
      var isFinale = st.room.ep === 2;
      var w = [
        { text: isFinale ? 'SEASON FINALE!' : "THAT'S A WRAP!",
          font: 'bold 84px monospace', color: '#e8d44d', y: 240 },
        { text: isFinale ? 'The Executive is cancelled. The network is yours.' :
                           'Episode 1 survived — The Producer is done for.',
          font: '24px monospace', color: '#f2f2e9', y: 292 },
        { text: 'You take home $' + st.score.toLocaleString('en-US') +
                (st.newBest ? '  —  NEW BEST!' : ''),
          font: 'bold 28px monospace', color: '#7ee081', y: 336 }
      ].concat(statsLines(st, 392));
      w.push({ text: isFinale ? 'Thanks for watching DEAD SET — stay tuned for Season 2' :
                                'EPISODE 2 + ENDLESS ARENA UNLOCKED — press 2 or E',
               font: 'bold 22px monospace', color: '#5bc8d6', y: 470 });
      w.push({ text: 'PRESS FIRE TO PLAY AGAIN', font: 'bold 26px monospace', color: '#7ee081', y: 510 });
      drawCenteredScreen(ctx, w);
    }
  }

  requestAnimationFrame(frame);
})();
