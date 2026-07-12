(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  if (DA.bakeSprites) DA.bakeSprites();   // pre-render the zombie sprite sheets once

  function fit() {
    var scale = Math.min(window.innerWidth / DA.W, window.innerHeight / DA.H);
    canvas.style.width = Math.floor(DA.W * scale) + 'px';
    canvas.style.height = Math.floor(DA.H * scale) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  // Fullscreen button: mobile Safari's address/keyboard bars eat real screen
  // space that `vh` units can't reclaim, so on touch devices with real
  // Fullscreen API support (Android Chrome; iOS Safari has none outside a
  // <video>, so the button just never appears there) we offer a YouTube-style
  // tap-to-expand icon instead of fighting the viewport.
  (function () {
    var docEl = document.documentElement;
    if (!docEl) return;   // headless test harness has no real DOM tree
    var btn = document.getElementById('fsBtn');
    var supported = !!btn && !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
    function isTouch() { return DA.input && DA.input.touchActive && DA.input.touchActive(); }
    function refreshBtn() {
      var inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btn.textContent = inFs ? '⤢' : '⛶';
      btn.classList.toggle('show', supported && !inFs && isTouch());
    }
    if (supported) {
      btn.addEventListener('click', function () {
        var req = canvas.requestFullscreen || canvas.webkitRequestFullscreen;
        if (req) req.call(canvas);
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(function () {});
        }
      });
      document.addEventListener('fullscreenchange', function () { refreshBtn(); fit(); });
      document.addEventListener('webkitfullscreenchange', function () { refreshBtn(); fit(); });
      document.addEventListener('touchstart', refreshBtn, { once: true, passive: true });
      setInterval(refreshBtn, 1000);   // catches the touch/mouse device switch without extra listeners
    }
  })();

  // localStorage can be blocked (private mode) — never let that crash the game
  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  var BOSS_TAUNTS = {
    producer: '"I MADE THIS SHOW. I CAN UNMAKE YOU."',
    executive: '"YOUR CONTRACT HAS A DEATH CLAUSE. PAGE 40."',
    algorithm: '"I HAVE SEEN EVERY WAY YOU DIE. PICK ONE."'
  };
  function enterRoom(st, roomId, entryDir) {
    st.roomId = roomId;
    st.room = DA.ROOMS[roomId];
    st.entryDir = entryDir;
    st.victoryExit = null;
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
    DA.fx.corpses.length = 0;
    for (var pi = 0; pi < st.players.length; pi++) {
      var p = st.players[pi];
      var off = (pi === 0 ? -1 : 1) * 26;    // shoulder to shoulder, not stacked
      if (entryDir) {                        // walk in through the door we came from
        var d = DA.doorByDir(entryDir);
        var horiz = entryDir === 'N' || entryDir === 'S';
        p.x = DA.clamp(d.x + (horiz ? off : 0), DA.ARENA.x0 + 80, DA.ARENA.x1 - 80);
        p.y = DA.clamp(d.y + (horiz ? 0 : off), DA.ARENA.y0 + 80, DA.ARENA.y1 - 80);
      } else {
        p.x = DA.W / 2 + off; p.y = DA.H / 2;
      }
      p.vx = 0; p.vy = 0;
      p.downed = false; p.reviveP = 0;
    }
    if (st.room.gift) {                     // the sponsors left something out for you
      var GUNS = ['triple', 'smg', 'shotgun', 'minigun', 'railgun', 'flamer', 'rocket'];
      st.powerups.push({ id: DA.newId(), type: 'heart', t: 60, x: DA.W / 2 - 60, y: DA.H / 2 });
      st.powerups.push({ id: DA.newId(), type: 'gun_' + GUNS[Math.floor(Math.random() * GUNS.length)],
                         t: 60, x: DA.W / 2 + 60, y: DA.H / 2 });
    }
    if (st.room.boss) {
      var boss = st.room.boss === 'executive' ? DA.makeExecutive() :
                 (st.room.boss === 'algorithm' ? DA.makeAlgorithm() : DA.makeBoss());
      // stage the entrance: the boss descends from above the set to its mark,
      // harmless while it talks trash — never frozen, never snapping to its AI
      boss.homeX = boss.x; boss.homeY = boss.y;
      boss.y = -80;
      boss.grace = 2.4;
      st.enemies.push(boss);
      DA.announce(boss.name + '!');
      if (BOSS_TAUNTS[st.room.boss]) DA.announce(BOSS_TAUNTS[st.room.boss]);
      if (DA.audio) (DA.audio.bossSting || DA.audio.roar)();
    } else {
      st.introCardT = 1.7;   // lower-third title card instead of an announcer line
    }
    if (DA.net) DA.net.onEnterRoom(roomId, entryDir);
  }

  // carry: the previous episode's state — score/kills/stats roll over so
  // beating a boss CONTINUES the run into the next episode instead of
  // dumping the contestant back at the start
  function newGame(startRoom, carry) {
    DA._id = 1;                                 // fresh run, fresh entity ids
    DA.fx.particles.length = 0;
    DA.fx.splats.length = 0;
    DA.fx.popups.length = 0;
    DA.fx.queue.length = 0;
    DA.fx.corpses.length = 0;
    var st = {
      mode: 'playing',
      player: DA.makePlayer(),
      score: 0, combo: 1, comboTimer: 0, kills: 0,
      roomsCleared: 0, groanT: 3, visited: {}, cleared: {}, seenTypes: {},
      stats: { shots: 0, hits: 0, killsByGun: {}, maxCombo: 1, start: performance.now() }
    };
    if (carry) {                              // the run rolls on: bank the last episode
      st.score = carry.score;
      st.kills = carry.kills;
      st.stats = carry.stats;                 // shots/hits/gun tallies keep accumulating
    }
    st.players = [st.player];                 // st.player stays the human, always
    if (botOn) {
      var buddy = DA.makePlayer();
      buddy.bot = true;
      st.players.push(buddy);
    }
    enterRoom(st, startRoom || DA.START_ROOM, null);
    if (st.room.ep === 2 || st.room.ep === 3) st.players.forEach(function (cp) { cp.hearts = DA.MAX_HEARTS; }); // champions start refreshed
    if (DA.net) DA.net.onHostNewGame(st, startRoom);   // a paired guest takes seat 2
    return st;
  }

  // Title-screen taglines — one is drawn at random every time the page loads.
  var TAGLINES = [
    'The most-watched — and most-banned — show on Earth.',
    'Filmed in front of a live studio audience. Once.',
    'All complaints are automatically applauded.',
    'Your outrage keeps the lights on.',
    'Banned in 194 countries. Streaming in all of them.',
    'The revolution was televised. Nobody switched over.',
    'Made possible by viewers like you. This is your fault.',
    'No animals were harmed. People were mostly people.',
    "Entertainment's final form.",
    'You watched it happen.',
    'As real as anything else on television.',
    'The ratings justify everything.',
    "Because the news wasn't working anymore.",
    'Everyone said it would never last. Everyone watched.',
    'An honest show for dishonest times.',
    'The sponsors would like to remain anonymous.',
    'Now with 40% more regret.',
    'Somebody greenlit this.',
    'The camera adds ten pounds of guilt.',
    'Not suitable for anyone. Watched by everyone.',
    'Democracy voted. This won.',
    "Every episode is somebody's last.",
    "It's only exploitation if you look away.",
    'Proudly failing every ethics review since Season 3.',
    'The waiting list to die on air is nine years.',
    "Fifty million complaints can't be wrong.",
    'Bread. Circuses. Us.',
    "Tonight's episode is rated: inevitable.",
    'The off switch was discontinued.',
    "History's most profitable apology.",
    'Watched by billions. Loved by shareholders.',
    'Set your moral compass to standby.',
    'The final episode of everything.',
    'Survivors get residuals.',
    'Please do not adjust your conscience.',
    'It was this or the election coverage.',
    'Product placement continues after death.',
    'A hospice for primetime.',
    'All contestants signed something.',
    'Coming up next: nothing. Ever again.',
    'Your attention span built this arena.',
    'The last thing 4 billion people will agree on.',
    'So bad for society they banned society.',
    'Written by focus group. Directed by algorithm.',
    'The end of the world, sponsored.',
    'One-star reviews are read aloud to the monsters.',
    "If you can read this, you're the audience.",
    'Blood is the only honest special effect.',
    'Thank you for not caring.',
    'Live from the end of civilisation.'
  ];
  var tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  // The legend of SLASH TV, told before your first-ever run. FIRE advances.
  var INTRO = [
    ['For twelve years, SLASH TV was the most-watched',
     'entertainment program on the planet.', '',
     'It began as a late-night survival game — crude monsters,',
     'fake-looking weapons, real prize money.',
     'Most contestants made it out alive.', '',
     { t: 'Then the ratings exploded.', gold: true }],
    ['Every season had to be bigger than the last.',
     'Deadlier creatures. Crueler traps. Higher stakes.', '',
     'The safety protocols vanished quietly. Then the',
     'emergency interventions. Then the rule that',
     'contestants had to consent at all.', '',
     'The audience stopped asking who would win.',
     { t: 'They tuned in to watch people die.', gold: true }],
    ['The leaked footage. The lawsuits by the hundreds.',
     'The "special effects" that turned out to be real.', '',
     "At midnight tonight, the network's license",
     'is revoked. Permanently.', '',
     'The executives had a choice: end the show quietly,',
     'or make sure no one ever forgot it.', '',
     { t: 'They chose spectacle.', gold: true }],
    ["Tonight's episode has one contestant.",
     { t: 'You.', gold: true }, '',
     'Every monster the production team ever built is loose.',
     'The AI director has been told to ignore casualty limits.',
     'The budget went on ammunition and practical effects.',
     'The prize pool is a number nobody expects to pay.', '',
     'Billions are watching — not for a winner.',
     { t: 'For history.', gold: true }],
    ['The host steps into the spotlight one last time,',
     'smiling the smile that made them famous.', '',
     '"We\'ve turned the monsters up to ten..."',
     '"...and the violence up to eleven."', '',
     '10... 9... 8...', '',
     { t: 'WELCOME TO THE FINAL BROADCAST', big: true }]
  ];

  DA.state = { mode: 'title' };
  var startWasHeld = false;   // require a release between screens
  var endlessWasHeld = false;
  var paused = false;
  var showBestiary = false;   // pause-screen "who's who" overlay
  // where the tappable title lines were LAST DRAWN — the stack is dynamic
  // (unlocks add lines), so hardcoded tap zones drift off their text
  var titleZones = { bot: -99, syn: -99, cast: -99 };
  var pauseWasHeld = false;
  var botWasHeld = false;

  // touch UI: taps starting in the top-right corner pause instead of aiming
  DA.touchUIBlock = function (x, y) {
    if (DA.state.mode === 'playing' && x > DA.W - 84 && y < 76) return true;
    if (DA.state.mode === 'title') {          // zones track the lines' drawn positions
      if (Math.abs(y - titleZones.bot + 7) < 18) return 'bot';
      if (Math.abs(y - titleZones.syn + 7) < 18) return 'syn';
      if (Math.abs(y - titleZones.cast + 6) < 16) return 'cast';
    }
    return false;
  };

  function drawTouchUI(ctx) {
    if (!DA.input.touchActive()) return;
    var sticks = DA.input.touchSticks();
    for (var side in sticks) {
      var s = sticks[side];
      if (!s) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.ox, s.oy, 70, 0, 7); ctx.stroke();
      var v = DA.stickVector(s.ox, s.oy, s.cx, s.cy, 70);
      ctx.fillStyle = side === 'aim' ? 'rgba(232,212,77,0.35)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(s.ox + v.x * 55, s.oy + v.y * 55, 26, 0, 7); ctx.fill();
    }
    if (DA.state.mode === 'playing') {          // pause button: an unmissable chip, top-right
      ctx.fillStyle = 'rgba(10, 10, 15, 0.72)';
      ctx.beginPath(); ctx.arc(DA.W - 42, 38, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(DA.W - 51, 27, 6, 22);
      ctx.fillRect(DA.W - 39, 27, 6, 22);
    }
  }

  function synSeed() {
    try {
      var q = (typeof location !== 'undefined' && location.search.match(/[?&]seed=([A-Za-z0-9_-]+)/));
      if (q) return q[1];
    } catch (e) {}
    return DA.dailySeed();
  }
  var botOn = load('deadset_bot') === '1';
  function toggleBot() {
    botOn = !botOn;
    store('deadset_bot', botOn ? '1' : '0');
    DA.announce(botOn ? 'CAM-BOT JOINS THE SHOW' : 'CAM-BOT BENCHED');
  }
  var showDebug = false;      // G toggles a raw-gamepad readout for troubleshooting
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyG') showDebug = !showDebug;
    if ((e.code === 'Escape' || e.code === 'KeyP') && DA.state.mode === 'playing') paused = !paused;
    if (e.code === 'KeyB' && paused && DA.state.mode === 'playing') showBestiary = !showBestiary;
    if (e.code === 'KeyC' && DA.state.mode === 'title') showBestiary = !showBestiary;
    if (e.code === 'Escape' && showBestiary) showBestiary = false;
    if (e.code === 'KeyK') {   // screen shake toggle, remembered
      DA.fx.shakeOn = DA.fx.shakeOn === false;
      try { localStorage.setItem('deadset_shake', DA.fx.shakeOn ? '1' : '0'); } catch (err) {}
      DA.announce(DA.fx.shakeOn ? 'SHAKE ON' : 'SHAKE OFF');
    }
    if (e.code === 'KeyV' && DA.broadcast) {   // broadcast fx toggle, remembered
      DA.broadcast.on = !DA.broadcast.on;
      try { localStorage.setItem('deadset_bfx', DA.broadcast.on ? '1' : '0'); } catch (err) {}
      DA.announce(DA.broadcast.on ? 'BROADCAST FX ON' : 'BROADCAST FX OFF');
    }
    if (e.code === 'KeyB' && DA.state.mode === 'title') toggleBot();
    if (e.code === 'KeyI' && DA.state.mode === 'title') DA.state = { mode: 'intro', page: 0 };
    if (e.code === 'KeyH' && DA.state.mode === 'title' && DA.net) DA.net.host();
    if (e.code === 'KeyD' && DA.state.mode === 'title' && window.SLASHTV_DONATE_URL) {
      window.open(window.SLASHTV_DONATE_URL, '_blank', 'noopener');
    }
    if (e.code === 'KeyF' && (DA.state.mode === 'gameover' || DA.state.mode === 'winner') &&
        window.SLASHTV_FEEDBACK_URL) {
      window.open(window.SLASHTV_FEEDBACK_URL, '_blank', 'noopener');
    }
  });

  // attract mode: a parade of silhouettes shambling across the title screen
  var attract = [];
  function updateAttract(dt) {
    if (attract.length === 0) {
      for (var i = 0; i < 12; i++) {
        attract.push({ x: Math.random() * DA.W, y: 615 + Math.random() * 70,
                       r: 12 + Math.random() * 16,
                       v: (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 26),
                       w: Math.random() * 6.28 });
      }
    }
    for (var j = 0; j < attract.length; j++) {
      var z = attract[j];
      z.x += z.v * dt; z.w += dt * 4;
      if (z.x < -40) z.x = DA.W + 40;
      if (z.x > DA.W + 40) z.x = -40;
    }
  }
  function drawAttract(ctx) {
    ctx.fillStyle = 'rgba(28, 42, 28, 0.9)';
    for (var i = 0; i < attract.length; i++) {
      var z = attract[i];
      var bob = 1 + Math.sin(z.w) * 0.08;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * bob, 0, 7); ctx.fill();
    }
  }
  var endlessKeyHeld = false, ep2KeyHeld = false, ep3KeyHeld = false, ep3WasHeld = false,
      synKeyHeld = false, synWasHeld = false;
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = true;
    if (e.code === 'Digit2') ep2KeyHeld = true;
    if (e.code === 'Digit3') synKeyHeld = true;
    if (e.code === 'Digit4') ep3KeyHeld = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = false;
    if (e.code === 'Digit2') ep2KeyHeld = false;
    if (e.code === 'Digit3') synKeyHeld = false;
    if (e.code === 'Digit4') ep3KeyHeld = false;
  });

  function endlessUnlocked() { return load('deadset_ep1') === '1'; }
  function ep2Unlocked() { return load('deadset_ep1') === '1'; }
  function ep3Unlocked() { return load('deadset_ep2') === '1'; }
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

  // Simulation runs at a locked 60 Hz under a free-running render. This makes
  // the game identical on 60/120/144 Hz displays and — critically for online
  // co-op — makes the host's ticks and the guest's prediction use the same
  // arithmetic. debugFrame below still single-steps for the tests.
  var TICK = 1 / 60;
  var last = performance.now(), acc = 0;
  function frame(now) {
    var rdt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (DA.net && DA.net.guestActive) {         // guests render the host's world
      DA.net.guestFrame(rdt);
      render(ctx);
      requestAnimationFrame(frame);
      return;
    }
    acc += rdt;                                 // clamp above: tab-switch safety
    var steps = 0;
    while (acc >= TICK && steps < 4) {          // catch up, but never spiral
      update(TICK);
      acc -= TICK;
      steps++;
    }
    if (steps === 4) acc = 0;                   // hopelessly behind: drop the debt
    render(ctx);
    requestAnimationFrame(frame);
  }

  // The boss doesn't just vanish: it detonates in stages over ~3 seconds,
  // every zombie on set dies with it (their strings are cut), and then a
  // single glowing exit opens that the player walks into to end the episode.
  function startBossDeath(st, boss) {
    boss.dying = true;
    boss.deathT = 3.0;
    boss.burstT = 0;
    st.score += boss.score * st.combo;
    for (var i = st.enemies.length - 1; i >= 0; i--) {   // the whole cast dies with the star
      var e = st.enemies[i];
      if (e.isBoss) continue;
      st.enemies.splice(i, 1);
      st.score += e.score;
      if (DA.onKill) DA.onKill(st, e);
    }
    st.enemyBullets.length = 0;
    DA.addShake(18);
    DA.fx.hitStop = 0.08;
    DA.announce('CANCELLED.');
    if (DA.audio && DA.audio.bossSting) DA.audio.bossSting();
  }
  function updateBossDeath(st, boss, dt) {
    boss.deathT -= dt;
    boss.burstT -= dt;
    if (boss.burstT <= 0) {                              // staged detonations
      boss.burstT = 0.17;
      var bx = boss.x + DA.rand(-boss.r, boss.r), by = boss.y + DA.rand(-boss.r, boss.r);
      DA.burst(bx, by, Math.random() < 0.5 ? '#ff8a3d' : '#ffe17a', 13);
      DA.splat(bx, by);
      DA.addShake(5);
      if (DA.audio && Math.random() < 0.35) DA.audio.splat(24);
    }
    if (boss.deathT <= 0) {                              // the final blowout
      DA.burst(boss.x, boss.y, '#ffe17a', 60);
      DA.burst(boss.x, boss.y, boss.color, 40);
      if (DA.shockwave) DA.shockwave(boss.x, boss.y, 240);
      DA.corpse(boss.x, boss.y, boss.r * 1.6, boss.color);
      DA.addShake(22);
      DA.fx.hitStop = 0.1;
      if (DA.audio) DA.audio.roar();
      st.enemies.splice(st.enemies.indexOf(boss), 1);
      st.kills = (st.kills || 0) + 1;
      st.bossDead = true;
      st.roomCleared = true;
      st.victoryExit = DA.oppositeDir(st.entryDir || 'N');
      DA.announce('TAKE THE EXIT');
    }
  }
  function findBoss(st) {
    for (var i = 0; i < st.enemies.length; i++) if (st.enemies[i].isBoss) return st.enemies[i];
    return null;
  }

  function checkExits(st) {
    for (var dir in st.room.exits) {
      var d = DA.doorByDir(dir);
      for (var pi = 0; pi < st.players.length; pi++) {
        var p = st.players[pi];
        if (p.downed) continue;
        if (DA.dist2(p.x, p.y, d.x, d.y) < 48 * 48) {
          st.roomsCleared++;
          st.score += 1000;
          st.players.forEach(function (hp) { hp.hearts = Math.min(hp.hearts + 1, DA.MAX_HEARTS); });
          enterRoom(st, st.room.exits[dir], DA.oppositeDir(dir));
          return;
        }
      }
    }
  }

  // Death is a scene now, not a cut: the contestant drops, the horde closes
  // in over a few seconds, the heartbeat gives out, and we fade to black.
  DA.DEATH_T = 3.8;
  function updateRevive(st, dt) {
    if (st.players.length < 2) return;
    for (var i = 0; i < st.players.length; i++) {
      var d = st.players[i];
      if (!d.downed) continue;
      var o = st.players[1 - i];
      if (!o.downed && o.hearts > 0 && DA.dist2(o.x, o.y, d.x, d.y) < 52 * 52) {
        d.reviveP = (d.reviveP || 0) + dt / 3;       // three seconds of helping hand
        if (d.reviveP >= 1) {
          d.downed = false; d.reviveP = 0; d.hearts = 2; d.invuln = 2;
          DA.announce('BACK IN THE GAME!');
          if (DA.audio) DA.audio.pickup();
        }
      } else if (d.reviveP > 0) {
        d.reviveP = Math.max(0, d.reviveP - dt / 2); // help interrupted
      }
    }
  }
  function startDying(st) {
    st.mode = 'dying';
    st.deathT = DA.DEATH_T;
    st.dead = true;
    st.players.forEach(function (dp) { dp.dead = true; dp.firing = false; });
    st.player.firing = false;
    startWasHeld = true;               // require a fresh press to skip the scene
    if (DA.audio) DA.audio.death();
    if (DA.broadcast) DA.broadcast.glitch = Math.max(DA.broadcast.glitch, 0.4);
    DA.addShake(16);
    DA.splat(st.player.x, st.player.y);
  }

  function endRun(st, won) {
    st.mode = won ? 'winner' : 'gameover';
    if (!won && st.dead) st.goFade = 0.7;          // rise out of the death fade
    st.stats.seconds = Math.round((performance.now() - st.stats.start) / 1000);
    var best = parseInt(load('deadset_best') || '0', 10);
    st.newBest = st.score > best;
    if (st.newBest) store('deadset_best', String(st.score));
    // remember the run for the TOP 5 board (newest first, capped)
    var runs = [];
    try { runs = JSON.parse(load('deadset_runs') || '[]'); } catch (e2) { runs = []; }
    st.runStamp = Date.now();
    runs.unshift({ s: st.score,
                   m: st.room.endless ? 'ARENA' :
                      (st.room.ep === 'syn' ? 'SYN' :
                       (st.room.ep === 3 ? 'EP 3' : (st.room.ep === 2 ? 'EP 2' : 'EP 1'))),
                   d: st.runStamp });
    if (runs.length > 30) runs.length = 30;
    store('deadset_runs', JSON.stringify(runs));
    if (won) {
      store('deadset_ep1', '1');
      if (st.room.ep === 2) store('deadset_ep2', '1');
      if (st.room.ep === 3) store('deadset_ep3', '1');
    }
    if (st.room.endless) {
      var bw = parseInt(load('deadset_best_waves') || '0', 10);
      st.newBestWaves = st.waveManager.wave > bw;
      if (st.newBestWaves) store('deadset_best_waves', String(st.waveManager.wave));
    }
    // Syndication runs post to the worldwide board for their seed
    if (st.room.ep === 'syn' && st.room.seed && DA.lb) {
      var nm = DA.lb.initials();
      if (!nm) {
        var typed = null;
        try { typed = prompt('YOUR NAME FOR THE GLOBAL BOARD (up to 8 letters):', 'ACE'); } catch (e3) {}
        nm = DA.lb.setInitials(typed || '');
      }
      if (nm) {
        st.globalRank = 'sending';
        DA.lb.submit(st.room.seed, { name: nm, score: st.score, won: won, rooms: st.roomsCleared },
          function (d) {
            st.globalRank = d && d.rank ? d.rank : null;
            if (d && d.top) st.globalTop = d.top;
          });
      }
    }
    DA.announce(won ? "THAT'S A WRAP!" : 'CUT TO COMMERCIAL!');
  }

  function update(dt) {
    var st = DA.state;
    var startHeld = DA.input.startHeld();

    if (st.mode === 'intro') {
      if (startHeld && !startWasHeld) {
        st.page++;
        if (st.page >= INTRO.length) {
          store('slashtv_intro', '1');
          DA.state = newGame();
        }
      }
      startWasHeld = startHeld;
      DA.updateFx(dt);
      return;
    }
    if (st.mode === 'dying') {
      st.deathT -= dt;
      DA.updateEnemies(st.enemies, st.players, dt * 0.5);  // the horde closes in
      DA.updateBullets(st.bullets, dt);                    // stray shots finish flying
      DA.updateFx(dt);
      st.bloodT = (st.bloodT || 0) - dt;
      if (st.bloodT <= 0) {                                // the pool spreads
        st.bloodT = 0.3;
        DA.splat(st.player.x + DA.rand(-12, 12), st.player.y + DA.rand(-10, 10));
      }
      if (startHeld && !startWasHeld) st.deathT = Math.min(st.deathT, 0.6); // fire skips ahead
      startWasHeld = startHeld;
      if (st.deathT <= 0) endRun(st, false);
      return;
    }
    if (st.mode !== 'playing') {
      paused = false;
      if (st.goFade > 0) st.goFade -= dt;
      if (showBestiary && st.mode === 'title') {   // cast page open: fire closes it, nothing starts
        if (startHeld && !startWasHeld) showBestiary = false;
        startWasHeld = startHeld;
        DA.updateFx(dt);
        return;
      }
      if (startHeld && !startWasHeld) {
        if (st.mode === 'winner' && (st.room.ep || 1) === 1) DA.state = newGame('writers', st);    // straight into Ep 2
        else if (st.mode === 'winner' && st.room.ep === 2) DA.state = newGame('controlbooth', st); // straight into Ep 3
        else DA.state = (st.mode === 'title' && load('slashtv_intro') !== '1') ?
                        { mode: 'intro', page: 0 } : newGame();
      }
      var endlessHeld = endlessKeyHeld || DA.input.padButton(3);
      if (endlessUnlocked() && endlessHeld && !endlessWasHeld) DA.state = newGame('endless');
      var ep2Held = ep2KeyHeld || DA.input.padButton(2);
      if (ep2Unlocked() && ep2Held && !ep2WasHeld) DA.state = newGame('writers');
      var ep3Held = ep3KeyHeld || DA.input.padButton(1);
      if (ep3Unlocked() && ep3Held && !ep3WasHeld) DA.state = newGame('controlbooth');
      var synHeld = synKeyHeld || DA.input.padButton(5);
      var synTap = st.mode === 'title' && DA.input.consumeSynTap && DA.input.consumeSynTap();
      if ((synHeld && !synWasHeld) || synTap) {
        DA.state = newGame(DA.generateEpisode(synSeed()).startId);
      }
      synWasHeld = synHeld;
      var botHeld = DA.input.padButton(4);
      if (st.mode === 'title' && botHeld && !botWasHeld) toggleBot();
      botWasHeld = botHeld;
      if (st.mode === 'title' && DA.input.consumeBotTap && DA.input.consumeBotTap()) toggleBot();
      if (st.mode === 'title' && DA.input.consumeCastTap && DA.input.consumeCastTap()) showBestiary = !showBestiary;
      startWasHeld = startHeld;
      endlessWasHeld = endlessHeld;
      ep2WasHeld = ep2Held;
      ep3WasHeld = ep3Held;
      updateAttract(dt);
      DA.updateFx(dt);
      return;
    }
    startWasHeld = startHeld;

    // gamepad Start button or the touch corner button pauses (edge-triggered)
    var pauseHeld = DA.input.padButton(9);
    if (pauseHeld && !pauseWasHeld) paused = !paused;
    if (!paused) showBestiary = false;
    pauseWasHeld = pauseHeld;
    var cornerTap = DA.input.consumePauseTap();
    var anyTap = DA.input.consumeAnyTap ? DA.input.consumeAnyTap() : false;
    if (cornerTap) paused = !paused;                                  // the ⏸ chip toggles
    else if (paused && DA.input.touchActive() && anyTap) paused = false; // tap ANYWHERE resumes
    if (paused) return;
    if (DA.fx.hitStop > 0) { DA.fx.hitStop -= dt; return; }   // the big-kill freeze frame

    var fighting = st.enemies.length > 0;
    for (var pi = 0; pi < st.players.length; pi++) {
      var pl = st.players[pi];
      var inp;
      if (pl.remote) {           // seat 2 is a live guest: play their last packet
        inp = (DA.net && DA.net.freshGuestInput()) ||
              { moveX: 0, moveY: 0, aimX: pl.aimX, aimY: pl.aimY, firing: false };
      } else {
        inp = pl.bot ? DA.botInput(st, pl, dt) : DA.input.state(pl.x, pl.y);
      }
      DA.updatePlayer(pl, inp, dt, fighting);
      if (!pl.downed) {
        var fired = DA.tryPlayerFire(pl, st.bullets);
        if (!pl.bot) st.stats.shots += fired;    // accuracy tracks the human
      }
    }
    DA.updateBullets(st.bullets, dt);
    DA.updateWaves(st.waveManager, st.enemies, dt);
    for (var ne = 0; ne < st.enemies.length; ne++) {   // first-encounter callouts
      var newType = st.enemies[ne].type;
      if (!st.seenTypes[newType]) {
        st.seenTypes[newType] = true;
        var line = DA.threatLine && DA.threatLine(newType);
        if (line && DA.announce) DA.announce(line);
      }
    }
    var boss = findBoss(st);
    if (boss && boss.grace > 0 && !boss.dying) {      // entrance: glide down to the mark
      boss.wobble += dt;
      var homeY = boss.homeY + (boss.type === 'producer' ? Math.sin(boss.wobble * 1.7) * 40 : 0);
      boss.y += (homeY - boss.y) * Math.min(1, 4 * dt);   // tracks the strut bob, so the
      boss.x += (boss.homeX - boss.x) * Math.min(1, 4 * dt); // AI handoff has no visible seam
    }
    if (boss && !(boss.grace > 0) && !boss.dying) {   // AI held during entrance + death scene
      if (boss.type === 'executive') DA.updateExecutive(boss, st, dt);
      else if (boss.type === 'algorithm') DA.updateAlgorithm(boss, st, dt);
      else DA.updateBoss(boss, st, dt);
      if (!boss.enraged && DA.bossPhase(boss) === 2) {   // half health: phase 2 stinger
        boss.enraged = true;
        if (DA.audio && DA.audio.bossSting) DA.audio.bossSting();
        if (DA.addShake) DA.addShake(10);
      }
    }
    if (boss && boss.hp <= 0 && !boss.dying) startBossDeath(st, boss);
    if (boss && boss.dying) updateBossDeath(st, boss, dt);
    DA.updateEnemies(st.enemies, st.players, dt, st.enemyBullets);
    DA.updateBoomers(st, dt);
    if (DA.updateHazards) DA.updateHazards(st, dt);
    DA.updateEnemyBullets(st.enemyBullets, st.players, dt, st);
    DA.resolveCombat(st);
    DA.updateCombo(st, dt);
    if (st.introCardT > 0) st.introCardT -= dt;
    if (st.combo > st.stats.maxCombo) st.stats.maxCombo = st.combo;
    DA.updatePowerups(st, dt);
    DA.updateFx(dt);

    // endless: the audience tosses a heart every 3rd wave survived
    if (st.room.endless && st.waveManager.wave > st.lastWave) {
      st.lastWave = st.waveManager.wave;
      if (st.lastWave % 3 === 0) {
        st.players.forEach(function (gp) { gp.hearts = Math.min(gp.hearts + 1, DA.MAX_HEARTS); });
        DA.announce('AUDIENCE GIFT: +1 HEART');
      }
    }

    // ambient groans while zombies are on set
    st.groanT -= dt;
    if (st.groanT <= 0) {
      st.groanT = DA.rand(2.5, 6);
      if (st.enemies.length > 0 && DA.audio) DA.audio.groan();
    }

    for (pi = 0; pi < st.players.length; pi++) {
      var pd = st.players[pi];
      if (pd.hearts > 0 || pd.downed) continue;
      var partnerUp = false;
      for (var pj = 0; pj < st.players.length; pj++) {
        if (pj !== pi && !st.players[pj].downed && st.players[pj].hearts > 0) partnerUp = true;
      }
      if (partnerUp) {                        // downed, not out: a partner can help
        pd.downed = true; pd.reviveP = 0;
        DA.addShake(10);
        DA.announce(pd.bot ? 'CAM-BOT IS DOWN!' : 'CONTESTANT DOWN!');
        if (DA.audio) DA.audio.hurt();
      } else { startDying(st); return; }
    }
    updateRevive(st, dt);
    if (st.room.boss) {
      if (st.bossDead && st.victoryExit) {     // walk into the glowing exit to wrap the episode
        var vd = DA.doorByDir(st.victoryExit);
        if (vd && DA.dist2(st.player.x, st.player.y, vd.x, vd.y) < 60 * 60) endRun(st, true);
      }
    } else if (st.waveManager.done) {
      if (!st.roomCleared) {
        st.roomCleared = true;
        st.cleared[st.roomId] = true;
        st.players.forEach(function (rp) {   // medics patch everyone between segments
          if (rp.downed) { rp.downed = false; rp.reviveP = 0; rp.hearts = 2; rp.invuln = 1; }
        });
        DA.announce('ROOM CLEAR — TAKE AN EXIT');
        if (DA.presenterQuip) DA.announce(DA.presenterQuip());
      }
      checkExits(st);
    }
    if (DA.net) DA.net.hostTick(st);
  }

  // --- cached scenery (built once, redrawn cheaply every frame) ---
  var floorPatterns = {};
  function floorPattern(color) {
    if (floorPatterns[color]) return floorPatterns[color];
    var t = document.createElement('canvas'); t.width = 80; t.height = 80;
    var g = t.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 80, 80);
    g.fillStyle = 'rgba(255,255,255,0.035)';           // checker sheen
    g.fillRect(0, 0, 40, 40); g.fillRect(40, 40, 40, 40);
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1;  // tile grout
    g.strokeRect(0.5, 0.5, 40, 40); g.strokeRect(40.5, 40.5, 40, 40);
    g.strokeRect(40.5, 0.5, 40, 40); g.strokeRect(0.5, 40.5, 40, 40);
    floorPatterns[color] = ctx.createPattern(t, 'repeat');
    return floorPatterns[color];
  }
  var vignette = (function () {
    var c = document.createElement('canvas'); c.width = DA.W; c.height = DA.H;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(DA.W / 2, DA.H / 2, DA.H * 0.42, DA.W / 2, DA.H / 2, DA.H * 0.95);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.16)');
    g.fillStyle = grad; g.fillRect(0, 0, DA.W, DA.H);
    return c;
  })();
  var bloodVignette = (function () {
    var c = document.createElement('canvas'); c.width = DA.W; c.height = DA.H;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(DA.W / 2, DA.H / 2, DA.H * 0.30, DA.W / 2, DA.H / 2, DA.H * 0.85);
    grad.addColorStop(0, 'rgba(120, 8, 18, 0)');
    grad.addColorStop(1, 'rgba(120, 8, 18, 0.85)');
    g.fillStyle = grad; g.fillRect(0, 0, DA.W, DA.H);
    return c;
  })();
  var scanlines = (function () {
    var c = document.createElement('canvas'); c.width = 8; c.height = 4;
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 2, 8, 2);
    return c;
  })();
  var scanPattern = null;

  // per-room set dressing: deterministic decals pre-rendered once per room
  var decorCache = {};
  function decorCanvas(st) {
    var id = (st && st.roomId) || 'title';
    if (decorCache[id]) return decorCache[id];
    var A = DA.ARENA, w = A.x1 - A.x0, h = A.y1 - A.y0;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    var type = (st && st.room && st.room.decor) || 'stage';
    g.strokeStyle = 'rgba(255,255,255,0.055)';
    g.fillStyle = 'rgba(255,255,255,0.045)';
    g.lineWidth = 3;
    var i, x, y;
    function cross(cx, cy, s) {
      g.beginPath();
      g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy + s);
      g.moveTo(cx + s, cy - s); g.lineTo(cx - s, cy + s);
      g.stroke();
    }
    if (type === 'stage') {                     // spike tape + dolly track
      for (i = 0; i < 6; i++) cross(120 + i * 195, (i % 2) ? 130 : h - 140, 16);
      g.beginPath(); g.moveTo(60, h / 2 - 14); g.lineTo(w - 60, h / 2 - 14);
      g.moveTo(60, h / 2 + 14); g.lineTo(w - 60, h / 2 + 14); g.stroke();
    } else if (type === 'crates') {             // stacked prop crates
      for (i = 0; i < 9; i++) {
        x = 90 + (i * 233) % (w - 180); y = 80 + (i * 157) % (h - 160);
        g.strokeRect(x, y, 54, 54); g.strokeRect(x + 8, y + 8, 38, 38);
      }
    } else if (type === 'tables') {             // round tables, four chairs
      for (i = 0; i < 7; i++) {
        x = 140 + (i * 271) % (w - 280); y = 110 + (i * 193) % (h - 220);
        g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke();
        [[46, 0], [-46, 0], [0, 46], [0, -46]].forEach(function (o) {
          g.beginPath(); g.arc(x + o[0], y + o[1], 8, 0, 7); g.stroke();
        });
      }
    } else if (type === 'monitors') {           // a monitor wall + floor cables
      for (i = 0; i < 14; i++) g.strokeRect(40 + i * 80, 18, 62, 40);
      g.beginPath(); g.moveTo(60, 80); g.bezierCurveTo(w / 3, h / 2, w / 2, h / 3, w - 80, h - 60); g.stroke();
    } else if (type === 'racks') {              // wardrobe rails with hangers
      for (i = 0; i < 4; i++) {
        y = 110 + i * 130;
        g.beginPath(); g.moveTo(120, y); g.lineTo(w - 120, y); g.stroke();
        for (x = 160; x < w - 140; x += 70) { g.beginPath(); g.arc(x, y + 12, 9, 0, 7); g.stroke(); }
      }
    } else if (type === 'papers') {             // scattered scripts
      for (i = 0; i < 26; i++) {
        x = 60 + (i * 199) % (w - 120); y = 50 + (i * 137) % (h - 100);
        g.save(); g.translate(x, y); g.rotate((i * 0.83) % 6.28);
        g.strokeRect(-13, -17, 26, 34); g.restore();
      }
    } else if (type === 'desks') {              // edit bays in rows
      for (i = 0; i < 8; i++) {
        x = 110 + (i % 4) * 280; y = 120 + Math.floor(i / 4) * 300;
        g.strokeRect(x, y, 130, 60); g.strokeRect(x + 40, y - 26, 50, 26);
      }
    } else if (type === 'mirrors') {            // makeup bulbs along both walls
      for (i = 0; i < 16; i++) {
        g.beginPath(); g.arc(70 + i * 72, 26, 9, 0, 7); g.stroke();
        g.beginPath(); g.arc(70 + i * 72, h - 26, 9, 0, 7); g.stroke();
      }
    } else if (type === 'servers') {            // racks + status LEDs
      for (i = 0; i < 8; i++) {
        x = 90 + i * 140;
        g.strokeRect(x, 30, 60, 110); g.strokeRect(x, h - 140, 60, 110);
        g.fillStyle = i % 2 ? 'rgba(126,224,129,0.35)' : 'rgba(212,58,75,0.35)';
        g.fillRect(x + 8, 42, 8, 8); g.fillRect(x + 8, h - 128, 8, 8);
        g.fillStyle = 'rgba(255,255,255,0.045)';
      }
    } else if (type === 'lounge') {             // green room sofas + rug
      g.strokeRect(w / 2 - 170, h / 2 - 110, 340, 220);
      [[w / 2 - 120, h / 2 - 170], [w / 2 + 40, h / 2 + 140]].forEach(function (s) {
        g.strokeRect(s[0], s[1], 130, 46); g.strokeRect(s[0] + 8, s[1] + 8, 114, 30);
      });
    } else if (type === 'lighting') {           // a rigged lighting grid overhead
      for (i = 0; i < 10; i++) {
        x = 70 + (i * 121) % (w - 140);
        g.beginPath(); g.arc(x, 34, 12, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(x, 46); g.lineTo(x, 20); g.moveTo(x - 14, 34); g.lineTo(x + 14, 34); g.stroke();
      }
    } else if (type === 'catwalk') {            // steel walkway grating
      for (y = 90; y < h - 60; y += 130) {
        g.beginPath(); g.moveTo(50, y); g.lineTo(w - 50, y);
        g.moveTo(50, y + 22); g.lineTo(w - 50, y + 22); g.stroke();
        for (x = 60; x < w - 60; x += 26) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); }
      }
    } else if (type === 'cranebay') {           // rigging track along the ceiling
      g.beginPath(); g.moveTo(40, 44); g.lineTo(w - 40, 44); g.stroke();
      for (i = 0; i < 7; i++) {
        x = 90 + i * ((w - 180) / 6);
        g.strokeRect(x - 10, 44, 20, 14);
        g.beginPath(); g.moveTo(x, 58); g.lineTo(x, 90); g.stroke();
      }
    } else if (type === 'pyrobay') {            // fuel canisters + hazard stripes
      for (i = 0; i < 6; i++) {
        x = 90 + (i * 210) % (w - 180); y = 90 + (i * 173) % (h - 180);
        g.strokeRect(x - 16, y - 26, 32, 52);
      }
      g.save(); g.translate(w - 70, h - 40); g.rotate(-0.4);
      for (i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 14 - 60, -10); g.lineTo(i * 14 - 40, 10); g.stroke(); }
      g.restore();
    } else if (type === 'corebay') {            // relay dishes + conduit
      for (i = 0; i < 4; i++) {
        x = 120 + i * ((w - 240) / 3); y = 70;
        g.beginPath(); g.arc(x, y, 26, 3.6, 5.9); g.stroke();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke();
      }
      g.beginPath(); g.moveTo(60, h - 60); g.bezierCurveTo(w / 3, h - 100, w * 2 / 3, h - 20, w - 60, h - 70); g.stroke();
    } else if (type === 'bossfloor') {          // the star's mark
      g.save(); g.translate(w / 2, h / 2);
      for (i = 0; i < 5; i++) { g.rotate(6.28 / 5); g.beginPath(); g.moveTo(0, -58); g.lineTo(0, -110); g.stroke(); }
      g.restore();
      g.beginPath(); g.arc(w / 2, h / 2, 58, 0, 7); g.stroke();
      for (i = 0; i < 6; i++) cross(120 + i * 195, (i % 2) ? 100 : h - 110, 14);
    }
    decorCache[id] = c;
    return c;
  }
  function drawScreenFx(ctx) {
    ctx.drawImage(vignette, 0, 0);
    if (!scanPattern) scanPattern = ctx.createPattern(scanlines, 'repeat');
    ctx.fillStyle = scanPattern;
    ctx.fillRect(0, 0, DA.W, DA.H);
  }

  function drawArena(ctx, st) {
    var A = DA.ARENA;
    ctx.fillStyle = '#2a2a38';                        // walls
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.fillStyle = floorPattern((st.room && st.room.floor) || '#1c1c26'); // tiled floor
    ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
    ctx.drawImage(decorCanvas(st), A.x0, A.y0);        // this room's set dressing
    ctx.strokeStyle = 'rgba(232, 212, 77, 0.07)';     // game-show floor rings
    ctx.lineWidth = 3;
    for (var r = 80; r <= 320; r += 80) {
      ctx.beginPath(); ctx.arc(DA.W / 2, DA.H / 2, r, 0, 7); ctx.stroke();
    }
    // studio spotlights, one per corner: followspots that TRACK the contestants
    // (with operator sway and lag) during the show; idle sweep on the title
    var sweep = performance.now() / 4000;
    ctx.fillStyle = 'rgba(240, 235, 200, 0.035)';
    var corners = [[A.x0, A.y0], [A.x1, A.y0], [A.x0, A.y1], [A.x1, A.y1]];
    var followed = st.players || (st.player ? [st.player] : null);
    for (var li = 0; li < 4; li++) {
      var cpos = corners[li], a;
      if (followed) {
        var star = followed[li % followed.length];   // corners split between contestants
        a = Math.atan2(star.y - cpos[1], star.x - cpos[0]) +
            Math.sin(sweep * 4 + li * 1.7) * 0.09;   // human on the followspot, not a servo
      } else {
        a = 0.9 + Math.sin(sweep * (li % 2 ? -1.3 : 1) + li) * 0.55 +
            (cpos[0] > DA.W / 2 ? 1.35 : 0) + (cpos[1] > DA.H / 2 ? -1.5 : 0);
      }
      ctx.beginPath();
      ctx.moveTo(cpos[0], cpos[1]);
      ctx.arc(cpos[0], cpos[1], 900, a - 0.13, a + 0.13);
      ctx.closePath(); ctx.fill();
    }
    // wall bevel: a lit inner edge
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 2;
    ctx.strokeRect(A.x0 + 1, A.y0 + 1, A.x1 - A.x0 - 2, A.y1 - A.y0 - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';      // wall panel seams
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var wx = A.x0 + 80; wx < A.x1; wx += 80) {
      ctx.moveTo(wx, 0); ctx.lineTo(wx, A.y0);
      ctx.moveTo(wx, A.y1); ctx.lineTo(wx, DA.H);
    }
    for (var wy = A.y0 + 80; wy < A.y1; wy += 80) {
      ctx.moveTo(0, wy); ctx.lineTo(A.x0, wy);
      ctx.moveTo(A.x1, wy); ctx.lineTo(DA.W, wy);
    }
    ctx.stroke();
    var active = (st.waveManager && st.waveManager.currentSpawnDoors) || [];
    for (var i = 0; i < DA.DOORS.length; i++) {       // doors: gaps in the walls
      var d = DA.DOORS[i];
      var isExit = st.room && ((st.room.exits[d.dir] && st.roomCleared) ||
                               (st.bossDead && st.victoryExit === d.dir));
      var isSpawning = active.indexOf(d) !== -1;      // red = zombies use this door
      ctx.fillStyle = isExit ? '#2e6b3a' :
        (isSpawning ? 'rgba(150, 35, 45, ' + (0.65 + Math.sin(performance.now() / 200) * 0.25) + ')' : '#101018');
      if (d.dir === 'N' || d.dir === 'S') ctx.fillRect(d.x - 50, d.y - 20, 100, 40);
      else ctx.fillRect(d.x - 20, d.y - 50, 40, 100);
      // warning-striped frame posts flanking every gap — studio safety theatre
      var posts = (d.dir === 'N' || d.dir === 'S') ?
        [[d.x - 58, d.y - 20, 8, 40, false], [d.x + 50, d.y - 20, 8, 40, false]] :
        [[d.x - 20, d.y - 58, 40, 8, true], [d.x - 20, d.y + 50, 40, 8, true]];
      for (var pf = 0; pf < 2; pf++) {
        var P = posts[pf];
        ctx.fillStyle = '#8a7530';
        ctx.fillRect(P[0], P[1], P[2], P[3]);
        ctx.fillStyle = '#1c1c22';
        if (P[4]) { ctx.fillRect(P[0] + 8, P[1], 8, P[3]); ctx.fillRect(P[0] + 24, P[1], 8, P[3]); }
        else { ctx.fillRect(P[0], P[1] + 8, P[2], 8); ctx.fillRect(P[0], P[1] + 24, P[2], 8); }
      }
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

  function drawDeadPlayer(ctx, p, st) {
    var gone = DA.clamp((DA.DEATH_T - (st.deathT == null ? 0 : st.deathT)) / DA.DEATH_T, 0, 1);
    ctx.fillStyle = 'rgba(110, 20, 30, 0.7)';               // the pool
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, 10 + gone * 30, 6 + gone * 16, 0, 0, 7);
    ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(2.2);
    ctx.scale(1, 0.55);                                     // face-down
    ctx.fillStyle = '#c9c9c0';
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#333';                                 // the dropped gun
    ctx.fillRect(p.x + 14, p.y + 6, 11, 5);
  }
  function drawHeart(ctx, x, y, size, filled) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, 6);
    else ctx.rect(x, y, size, size);
    if (filled) { ctx.fillStyle = '#d43a4b'; ctx.fill(); }
    else { ctx.strokeStyle = '#4a3a40'; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // the studio map: shown while choosing an exit, and while paused
  // the pause-screen bestiary: live sprites drawn by the real enemy renderer,
  // threat lines from the same table the first-encounter callouts use — so
  // this page can never drift out of date with the actual game
  var BESTIARY_ORDER = ['shambler', 'swarmer', 'sprinter', 'boomer', 'stalker', 'brute', 'spitter', 'gusher'];
  function drawBestiary(ctx) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.97)';
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = '#e8d44d';
    ctx.fillText("TONIGHT'S CAST", DA.W / 2, 74);
    for (var i = 0; i < BESTIARY_ORDER.length; i++) {
      var y = 132 + i * 74;
      var fake = DA.makeEnemy(BESTIARY_ORDER[i], 330, y);
      fake.wobble = performance.now() / 200 + i;   // idle shuffle, out of sync per row
      DA.drawEnemies(ctx, [fake]);
      ctx.textAlign = 'left';
      ctx.font = '18px monospace';
      ctx.fillStyle = '#f2f2e9';
      ctx.fillText(DA.threatLine ? DA.threatLine(BESTIARY_ORDER[i]) : BESTIARY_ORDER[i].toUpperCase(), 390, y + 6);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#7ee081';
    ctx.fillText('Esc — back to the show', DA.W / 2, 682);
  }

  // TV lower-third: the room's title card slides up when the show cuts to a
  // new set, exactly like a broadcast caption — then gets out of the way
  function drawIntroCard(ctx, st) {
    var t = st.introCardT;
    var a = Math.max(0, Math.min(1, (1.7 - t) / 0.22, t / 0.4));
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 552, DA.W * 0.52, 86);
    ctx.fillStyle = '#d43a4b';
    ctx.fillRect(0, 552, 9, 86);
    ctx.textAlign = 'left';
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#f2f2e9';
    ctx.fillText(st.room.name, 34, 596);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#d43a4b';
    if (Math.floor(t * 4) % 2 === 0) { ctx.beginPath(); ctx.arc(41, 618, 5, 0, 7); ctx.fill(); }
    ctx.fillText('LIVE', 54, 623);
    ctx.fillStyle = '#8888a0';
    ctx.fillText('— ' + (st.room.ep === 'syn' ? "TONIGHT'S SYNDICATED EPISODE" :
                         (st.room.endless ? 'ENDLESS ARENA' : 'EPISODE ' + (st.room.ep || 1))), 100, 623);
    ctx.globalAlpha = 1;
  }

  function drawMap(ctx, st) {
    var ep = st.room.ep || 1;
    var maxX = 0, maxY = 0, mid, mroom;
    for (mid in DA.ROOMS) {
      mroom = DA.ROOMS[mid];
      if (!mroom.map || (mroom.ep || 1) !== ep) continue;
      if (mroom.map.x > maxX) maxX = mroom.map.x;
      if (mroom.map.y > maxY) maxY = mroom.map.y;
    }
    var sx = 62, sy = 46;
    var ox = DA.W - 56 - maxX * sx, oy = DA.H - 66 - maxY * sy;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.82)';
    ctx.fillRect(ox - 34, oy - 44, maxX * sx + 68, maxY * sy + 88);
    ctx.fillStyle = '#8888a0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STUDIO MAP', ox - 22, oy - 26);
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 2;
    var id, room;
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
      var cleared = st.cleared && st.cleared[id];
      if (room.boss) {                                 // boss: pulsing diamond, hard to miss
        var bp = 1 + Math.sin(performance.now() / 220) * 0.18;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = here ? '#7ee081' : '#ff3b3b';
        var bs = 11 * (here ? 1 : bp);
        ctx.fillRect(-bs / 2, -bs / 2, bs, bs);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-bs / 2, -bs / 2, bs, bs);
        ctx.restore();
        if (!here) {
          ctx.strokeStyle = 'rgba(255, 59, 59, 0.45)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 13 * bp, 0, 7); ctx.stroke();
        }
        continue;
      }
      ctx.beginPath(); ctx.arc(x, y, here ? 9 : 7, 0, 7);
      if (here) { ctx.fillStyle = '#7ee081'; ctx.fill(); }
      else if (cleared) { ctx.fillStyle = '#3a5a3a'; ctx.fill(); }
      else if (st.visited && st.visited[id]) { ctx.fillStyle = '#e8d44d'; ctx.fill(); }
      else { ctx.strokeStyle = '#555566'; ctx.lineWidth = 2; ctx.stroke(); }
      if (cleared && !here) {                           // tick mark: unmistakably done
        ctx.strokeStyle = '#7ee081'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 3, y); ctx.lineTo(x - 0.5, y + 2.5); ctx.lineTo(x + 3.5, y - 3);
        ctx.stroke();
      }
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
    var expiring = st.player.gunT > 0 && st.player.gunT <= 1 && Math.floor(st.player.gunT * 8) % 2 === 0;
    ctx.fillStyle = expiring ? '#d43a4b' : gun.color;
    ctx.fillText(gun.label + (st.player.gunT > 0 ? ' ' + Math.ceil(st.player.gunT) + 's' : ''), 16, 60);
    var buddy = st.players[1];
    if (buddy) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#a8c8d8';
      ctx.fillText('CAM-BOT', 16, 84);
      if (buddy.downed) {
        if (Math.floor(performance.now() / 300) % 2 === 0) {
          ctx.fillStyle = '#d43a4b';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('DOWN! GO HELP', 92, 84);
        }
      } else {
        for (var bh = 0; bh < DA.MAX_HEARTS; bh++) drawHeart(ctx, 92 + bh * 21, 72, 14, bh < buddy.hearts);
      }
    }
    ctx.textAlign = 'right';
    // on touch, the whole right-aligned block shifts left to clear the pause button
    var rx = DA.input.touchActive() ? DA.W - 96 : DA.W - 20;
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#7ee081';
    ctx.fillText('$' + st.score.toLocaleString('en-US'), rx, 32);
    if (st.combo > 1) {
      var pulse = st.combo >= 5 ? 1 + Math.sin(performance.now() / 90) * 0.15 : 1;
      var pop = st.comboPopT > 0 ? 1 + (st.comboPopT / 0.3) * 0.6 : 1;   // one-shot step-up punch
      ctx.font = 'bold ' + Math.round(24 * pulse * pop) + 'px monospace';
      ctx.fillStyle = st.comboPopT > 0 ? '#fff3b0' : '#e8d44d';
      ctx.fillText('x' + st.combo, rx, 62);
    }
    var chain = st.comboKills || 0;                 // chain progress toward the next step
    if (st.combo > 1 || chain > 0) {
      var frac = DA.clamp(chain / (DA.COMBO_STEP || 6), 0, 1);
      ctx.fillStyle = 'rgba(232, 212, 77, 0.22)';
      ctx.fillRect(rx - 64, 70, 64, 5);
      ctx.fillStyle = '#e8d44d';
      ctx.fillRect(rx - 64 * frac, 70, 64 * frac, 5);
    }
    var puLines = DA.powerupHudLines(st.player);
    ctx.font = 'bold 17px monospace';
    for (var k = 0; k < puLines.length; k++) {
      ctx.fillStyle = puLines[k].color;
      ctx.fillText(puLines[k].text, rx, 90 + k * 22);
    }
    // co-op link quality, both ends
    if (DA.net && ((DA.net.status === 'hosting' && DA.net.remoteJoined) || DA.net.guestActive)) {
      var ping = DA.net.ping || 0;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = ping < 80 ? '#7ee081' : (ping < 150 ? '#e8d44d' : '#d43a4b');
      ctx.fillText('LINK ' + ping + 'ms', DA.W - 20, 90 + puLines.length * 22);
    } else if (DA.net && DA.net.status === 'reconnecting') {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#d43a4b';
      ctx.fillText('LINK LOST — RETRYING', DA.W - 20, 90 + puLines.length * 22);
    }
    var boss = findBoss(st);
    if (boss) DA.drawBossBar(ctx, boss);
  }

  function drawWorld(ctx, st) {
    ctx.save();
    if (st.mode === 'dying') {          // slow push-in on the fallen contestant
      var zk = 1 + 0.35 * Math.min(1, (DA.DEATH_T - st.deathT) / 1.2);
      ctx.translate(st.player.x, st.player.y);
      ctx.scale(zk, zk);
      ctx.translate(-st.player.x, -st.player.y);
    }
    if (DA.fx.shake > 0 && !paused) {
      ctx.translate(DA.rand(-DA.fx.shake, DA.fx.shake), DA.rand(-DA.fx.shake, DA.fx.shake));
    }
    drawArena(ctx, st);
    DA.drawFxUnder(ctx);
    if (DA.drawHazards) DA.drawHazards(ctx, st);
    DA.drawPowerups(ctx, st.powerups);
    DA.drawBullets(ctx, st.bullets);
    DA.drawEnemyBullets(ctx, st.enemyBullets);
    DA.drawEnemies(ctx, st.enemies);
    for (var pw = 0; pw < st.players.length; pw++) {
      if (st.players[pw].dead) drawDeadPlayer(ctx, st.players[pw], st);
      else DA.drawPlayer(ctx, st.players[pw]);
    }
    if (DA.broadcast) DA.broadcast.drawWorldFx(ctx, st);
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

  // the single most impressive stat of the run, called out instead of buried in the list
  function highlightStat(st) {
    var acc = st.stats.shots ? Math.round(st.stats.hits / st.stats.shots * 100) : 0;
    var candidates = [];
    if (acc >= 55) candidates.push({ label: '🎯 SHARPSHOOTER', text: acc + '% ACCURACY', w: acc });
    if (st.stats.maxCombo >= 6) candidates.push({ label: '🔥 ON A STREAK', text: 'x' + st.stats.maxCombo + ' MULTIPLIER HIT', w: st.stats.maxCombo * 12 });
    if (st.kills >= 120) candidates.push({ label: '💀 BODY COUNT', text: st.kills + ' KILLS', w: st.kills / 3 });
    if (!candidates.length) return null;
    candidates.sort(function (a, b) { return b.w - a.w; });
    return candidates[0];
  }

  function topFiveLines(st, y) {
    var runs = [];
    try { runs = JSON.parse(load('deadset_runs') || '[]'); } catch (e) { runs = []; }
    if (!runs.length) return [];
    var top = runs.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
    var lines = [{ text: 'TOP 5 BROADCASTS', font: 'bold 17px monospace', color: '#8888a0', y: y }];
    for (var i = 0; i < top.length; i++) {
      var r = top[i];
      var mine = st.runStamp && r.d === st.runStamp;
      var when = new Date(r.d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      lines.push({ text: (i + 1) + '.  $' + r.s.toLocaleString('en-US') + '  ·  ' + r.m + '  ·  ' + when +
                         (mine ? '  ◂ THIS RUN' : ''),
                   font: (mine ? 'bold ' : '') + '18px monospace',
                   color: mine ? '#e8d44d' : '#8888a0', y: y + 26 + i * 24 });
    }
    return lines;
  }

  function render(ctx) {
    var st = DA.state;
    if (st.mode === 'intro') {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, DA.W, DA.H);
      var page = INTRO[st.page] || [];
      ctx.textAlign = 'center';
      var yy = 368 - page.length * 19;
      for (var li = 0; li < page.length; li++) {
        var line = page[li];
        // strings inherit a legacy String.prototype.big() — check the type!
        var isObj = typeof line === 'object';
        var big = isObj && line.big, gold = isObj && line.gold;
        ctx.font = big ? 'bold 44px monospace' : '23px monospace';
        ctx.fillStyle = big ? '#d43a4b' : (gold ? '#e8d44d' : '#c9c9d4');
        ctx.fillText(isObj ? line.t : line, DA.W / 2, yy);
        yy += big ? 64 : 38;
      }
      for (var pd = 0; pd < INTRO.length; pd++) {
        ctx.fillStyle = pd === st.page ? '#e8d44d' : '#3a3a48';
        ctx.beginPath();
        ctx.arc(DA.W / 2 - (INTRO.length - 1) * 12 + pd * 24, DA.H - 82, 5, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#7ee081';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('FIRE ▸', DA.W / 2, DA.H - 44);
      drawScreenFx(ctx);
      return;
    }
    if (st.mode === 'title') {
      if (showBestiary) { drawBestiary(ctx); return; }
      drawArena(ctx, {});
      var hint = DA.input.touchActive() ?
        'left thumb moves — right thumb aims & fires — tap to start' :
        (DA.input.gamepadConnected() ?
          '🎮 gamepad detected — left stick moves, push right stick to fire that way' :
          'WASD moves — mouse click or ARROW KEYS fire (or plug in a gamepad)');
      var lines = [
        { text: 'SLASH TV', font: 'bold 96px monospace', color: '#e8d44d', y: 240 },
        { text: 'THE FINAL BROADCAST', font: 'bold 32px monospace', color: '#d43a4b', y: 290 },
        { text: tagline, font: '21px monospace', color: '#f2f2e9', y: 328 }
      ];
      // net status sits in the fixed gap between the tagline and the press-fire
      // line — at most one of these two ever shows, so a fixed slot is safe
      if (DA.net && DA.net.status === 'hosting') {
        lines.push({ text: 'ROOM ' + (DA.net.code || '····') +
                           (DA.net.remoteJoined ? ' — CONTESTANT 2 READY' : ' — waiting for contestant 2'),
                     font: 'bold 22px monospace', color: '#9ad7ff', y: 364 });
      } else if (DA.net && DA.net.status === 'error') {
        lines.push({ text: 'RELAY ERROR — see server/README.md', font: 'bold 18px monospace', color: '#d43a4b', y: 364 });
      }
      lines.push({ text: 'PRESS FIRE — EPISODE 1: PILOT SEASON', font: 'bold 28px monospace', color: '#7ee081', y: 396 });
      // dynamic vertical stack from here down: a running cursor, not fixed
      // offsets, so no combination of unlocks can ever overlap two lines
      var cy = 434;
      if (ep2Unlocked()) {
        lines.push({ text: '2 (or 🎮 X) — EPISODE 2: SWEEPS WEEK' + (load('deadset_ep2') === '1' ? ' ✓' : ''),
                     font: 'bold 24px monospace', color: '#c95d63', y: cy });
        cy += 32;
      }
      if (ep3Unlocked()) {
        lines.push({ text: '4 (or 🎮 B/Circle) — EPISODE 3: LIVE FINALE' + (load('deadset_ep3') === '1' ? ' ✓' : ''),
                     font: 'bold 24px monospace', color: '#2fd7c4', y: cy });
        cy += 32;
      }
      if (endlessUnlocked()) {
        lines.push({ text: 'E (or 🎮 Y) — ENDLESS ARENA — best: wave ' + (load('deadset_best_waves') || '0'),
                     font: 'bold 22px monospace', color: '#5bc8d6', y: cy });
        cy += 30;
      }
      titleZones.syn = cy;                    // tap target follows the drawn line
      lines.push({ text: '3 (or 🎮 RB) — SYNDICATION — tonight: #' + synSeed(),
                    font: 'bold 22px monospace', color: '#b78bff', y: cy });
      cy += 30;
      if (DA.lb && DA.lb.today && DA.lb.today.length && DA.lb.todaySeed === synSeed()) {
        var podium = DA.lb.today.slice(0, 3).map(function (s, i) {
          return (i + 1) + '. ' + s.name + ' $' + s.score.toLocaleString('en-US');
        }).join('   ');
        lines.push({ text: '🏆 ' + podium, font: '16px monospace', color: '#b78bff', y: cy });
        cy += 26;
      }
      var best = load('deadset_best');
      if (best) {
        lines.push({ text: 'BEST: $' + parseInt(best, 10).toLocaleString('en-US'),
                     font: 'bold 20px monospace', color: '#e8d44d', y: cy });
        cy += 28;
      }
      cy += 12;
      lines.push({ text: hint, font: '18px monospace', color: '#8888a0', y: cy });
      cy += 26;
      lines.push({ text: 'Esc pauses · M mutes · N music · K shake · V fx · I story', font: '15px monospace', color: '#8888a0', y: cy });
      cy += 30;
      titleZones.bot = cy;
      lines.push({ text: (DA.input.touchActive() ? 'TAP HERE' : 'B (or 🎮 LB)') + ' — 2-PLAYER with CAM-BOT (AI partner): ' + (botOn ? 'ON ✓' : 'OFF'),
                   font: 'bold 20px monospace', color: botOn ? '#a8c8d8' : '#666677', y: cy });
      cy += 28;
      if (DA.net) {
        lines.push({ text: 'H — 2-PLAYER ONLINE: host a game, send a friend the link', font: '17px monospace', color: '#666677', y: cy });
        cy += 26;
      }
      titleZones.cast = cy;
      lines.push({ text: (DA.input.touchActive() ? 'TAP HERE' : 'C') + " — TONIGHT'S CAST: meet the monsters",
                   font: '17px monospace', color: '#8888a0', y: cy });
      cy += 26;
      if (window.SLASHTV_DONATE_URL) {              // inert until Ben configures a link
        lines.push({ text: 'D — 💛 SUPPORT THE SHOW (optional — no ads, ever)',
                     font: '16px monospace', color: '#e8d44d', y: cy });
        cy += 24;
      }
      if (DA.input.touchActive() && window.innerHeight > window.innerWidth) {
        lines.push({ text: '📺 rotate your phone for the full show', font: 'bold 20px monospace', color: '#e8d44d', y: cy });
      }
      drawAttract(ctx);         // the parade sits behind the copy, never over it
      drawCenteredScreen(ctx, lines);
      DA.drawFxOver(ctx);
      drawTouchUI(ctx);
      drawScreenFx(ctx);
      if (showDebug) drawDebug(ctx);
      return;
    }

    drawWorld(ctx, st);
    drawTouchUI(ctx);
    if (DA.broadcast) DA.broadcast.drawFrame(ctx, st);
    drawScreenFx(ctx);
    drawHud(ctx, st);
    if (st.mode === 'playing' && st.introCardT > 0) drawIntroCard(ctx, st);
    if (st.mode === 'playing' && st.player.hearts === 1) {  // last-heart warning pulse
      var pulse = 0.14 + 0.1 * Math.sin(performance.now() / 260);
      ctx.globalAlpha = pulse;
      ctx.drawImage(bloodVignette, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (st.mode === 'playing' && st.player.hurtFlashT > 0) {  // directional "you got hit from here" flash
      var hp = st.player, k = hp.hurtFlashT / 0.35;
      var cx = DA.W / 2, cy = DA.H / 2;
      var ex = hp.hurtDir != null ? cx + Math.cos(hp.hurtDir) * DA.W * 0.7 : cx;
      var ey = hp.hurtDir != null ? cy + Math.sin(hp.hurtDir) * DA.W * 0.7 : cy;
      var flashGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, DA.W * 0.65);
      flashGrad.addColorStop(0, 'rgba(220, 30, 40, ' + (0.5 * k).toFixed(3) + ')');
      flashGrad.addColorStop(1, 'rgba(220, 30, 40, 0)');
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, DA.W, DA.H);
    }
    var lb = findBoss(st);
    if (st.mode === 'playing' && lb && lb.laserPhase === 'warn') {  // boss laser telegraph: screen-edge glow
      var lk = 1 - lb.laserT / (DA.bossPhase(lb) === 2 ? 0.6 : 0.9);   // ramps up as the beam nears firing
      var pl0 = st.player;
      var lang = Math.atan2(lb.y - pl0.y, lb.x - pl0.x);
      var lex = DA.W / 2 + Math.cos(lang) * DA.W * 0.7, ley = DA.H / 2 + Math.sin(lang) * DA.W * 0.7;
      var laserGrad = ctx.createRadialGradient(lex, ley, 0, lex, ley, DA.W * 0.55);
      var la = (0.15 + 0.35 * lk).toFixed(3);
      laserGrad.addColorStop(0, 'rgba(255, 180, 40, ' + la + ')');
      laserGrad.addColorStop(1, 'rgba(255, 180, 40, 0)');
      ctx.fillStyle = laserGrad;
      ctx.fillRect(0, 0, DA.W, DA.H);
    }
    if (DA.broadcast) DA.broadcast.drawGlitch(ctx);
    if (st.mode === 'dying') {
      ctx.globalAlpha = Math.min(1, (DA.DEATH_T - st.deathT) / 0.9);
      ctx.drawImage(bloodVignette, 0, 0);                   // blood at the edges
      ctx.globalAlpha = 1;
      if (st.deathT < 1.5) {                                // slow fade to black
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.min(1, (1.5 - st.deathT) / 1.5).toFixed(3) + ')';
        ctx.fillRect(0, 0, DA.W, DA.H);
      }
    }
    if (st.mode === 'playing' && st.roomCleared && st.room.map) drawMap(ctx, st);
    if (showDebug) drawDebug(ctx);

    if (paused && st.mode === 'playing') {
      if (showBestiary) { drawBestiary(ctx); return; }
      drawCenteredScreen(ctx, [
        { text: 'PAUSED', font: 'bold 72px monospace', color: '#e8d44d', y: 300 },
        { text: 'WE\'LL BE RIGHT BACK', font: '24px monospace', color: '#8888a0', y: 345 },
        { text: DA.input.touchActive() ? 'TAP ANYWHERE TO RESUME' : 'Esc / P / 🎮 Start to resume',
          font: 'bold 22px monospace', color: '#7ee081', y: 420 },
        { text: 'B — WHO\'S WHO (know your monsters)', font: '19px monospace', color: '#8888a0', y: 458 }
      ]);
      if (st.room.map) drawMap(ctx, st);
      return;
    }

    if (st.mode === 'gameover') {
      var goHi = highlightStat(st);
      var go = [
        { text: 'CUT TO COMMERCIAL', font: 'bold 64px monospace', color: '#d43a4b', y: 218 },
        { text: 'You leave with $' + st.score.toLocaleString('en-US') +
                (st.newBest ? '  —  NEW BEST!' : ''),
          font: '26px monospace', color: st.newBest ? '#e8d44d' : '#f2f2e9', y: 268 }
      ];
      if (goHi) go.push({ text: goHi.label + ': ' + goHi.text, font: 'bold 20px monospace', color: '#e8d44d', y: 300 });
      go = go.concat(statsLines(st, goHi ? 332 : 316)).concat(topFiveLines(st, goHi ? 412 : 396));
      if (st.room.ep === 'syn') {
        go.push({ text: "TONIGHT'S SEED: #" + st.room.seed + '  ·  challenge a friend: ?seed=' + st.room.seed,
                  font: '16px monospace', color: '#b78bff', y: 538 });
        if (st.globalRank && st.globalRank !== 'sending') {
          go.push({ text: '🌍 GLOBAL RANK #' + st.globalRank + ' on this episode',
                    font: 'bold 22px monospace', color: '#b78bff', y: 512 });
        }
      }
      go.push({ text: 'PRESS FIRE TO RESTART', font: 'bold 28px monospace', color: '#7ee081', y: 566 });
      if (endlessUnlocked()) go.push({ text: 'E (or 🎮 Y) for Endless Arena', font: '19px monospace', color: '#5bc8d6', y: 598 });
      if (window.SLASHTV_FEEDBACK_URL) {
        go.push({ text: 'F — 📝 TELL US WHAT YOU THOUGHT', font: '16px monospace', color: '#8888a0', y: 624 });
      }
      drawCenteredScreen(ctx, go);
      if (st.goFade > 0) {                                  // fade in from the death scene
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.min(1, st.goFade / 0.7).toFixed(3) + ')';
        ctx.fillRect(0, 0, DA.W, DA.H);
      }
    } else if (st.mode === 'winner') {
      var isSeasonFinale = st.room.ep === 3;
      var isEp2 = st.room.ep === 2;
      var headline = isSeasonFinale ? 'THE FINAL BROADCAST' : (isEp2 ? 'SEASON FINALE!' : "THAT'S A WRAP!");
      var sub = isSeasonFinale ? 'The Algorithm goes dark. Nobody is watching anymore.' :
                (isEp2 ? 'The Executive is cancelled. The network is yours.' :
                         'Episode 1 survived — The Producer is done for.');
      var winHi = highlightStat(st);
      var w = [
        { text: headline, font: 'bold ' + (isSeasonFinale ? 60 : 84) + 'px monospace', color: '#e8d44d', y: 196 },
        { text: sub, font: '24px monospace', color: '#f2f2e9', y: 246 },
        { text: 'You take home $' + st.score.toLocaleString('en-US') +
                (st.newBest ? '  —  NEW BEST!' : ''),
          font: 'bold 28px monospace', color: '#7ee081', y: 288 }
      ];
      if (winHi) w.push({ text: winHi.label + ': ' + winHi.text, font: 'bold 20px monospace', color: '#e8d44d', y: 316 });
      w = w.concat(statsLines(st, winHi ? 348 : 334)).concat(topFiveLines(st, winHi ? 418 : 404));
      if (st.room.ep === 'syn' && st.globalRank && st.globalRank !== 'sending') {
        w.push({ text: '🌍 GLOBAL RANK #' + st.globalRank + " on tonight's episode (#" + st.room.seed + ')',
                 font: 'bold 22px monospace', color: '#b78bff', y: 534 });
      }
      var isEp1 = (st.room.ep || 1) === 1 && st.room.ep !== 'syn';
      w.push({ text: isSeasonFinale ? 'Thanks for watching SLASH TV. That was the whole show.' :
                     (isEp2 ? 'The run continues — your score carries over.' :
                     (isEp1 ? 'ENDLESS ARENA UNLOCKED (press E) — or keep the run going:' :
                              'Same seed, same studio — can you rank higher?')),
               font: 'bold 22px monospace', color: '#5bc8d6', y: 566 });
      w.push({ text: isEp2 ? 'PRESS FIRE — EPISODE 3: LIVE FINALE' :
                     (isEp1 ? 'PRESS FIRE — EPISODE 2: SWEEPS WEEK' :
                              'PRESS FIRE TO PLAY AGAIN'),
               font: 'bold 26px monospace', color: '#7ee081', y: 598 });
      if (window.SLASHTV_FEEDBACK_URL) {
        w.push({ text: 'F — 📝 TELL US WHAT YOU THOUGHT', font: '16px monospace', color: '#8888a0', y: 624 });
      }
      drawCenteredScreen(ctx, w);
    }
  }

  // manual single-step for headless verification (background tabs pause rAF)
  DA.debugFrame = function (dt) { update(dt || 1 / 60); render(ctx); };

  requestAnimationFrame(frame);
})();
