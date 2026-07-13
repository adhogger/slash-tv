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
    st.hostRoomCount = 0;
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
      if (BOSS_TAUNTS[st.room.boss]) {
        if (DA.hostSay) DA.hostSay(BOSS_TAUNTS[st.room.boss], st.room.boss, 4.0);
        else DA.announce(BOSS_TAUNTS[st.room.boss]);
        st.hostRoomCount = (st.hostRoomCount || 0) + 1;
      }
      if (DA.audio) (DA.audio.bossSting || DA.audio.roar)();
    } else {
      st.introCardT = 1.7;   // lower-third title card instead of an announcer line
      st.countdownT = entryDir ? 3.0 : 0;   // 3-2-1 (fresh episodes walk in first)
      if (DA.primeWave) DA.primeWave(st.waveManager);   // sirens burn through the countdown
      if (!entryDir) {                      // fresh episode: walk in through the doors
        st.entranceT = 2.8;   // long enough for the full stroll at 130px/s
        var sd = DA.doorByDir('S');
        for (var wi = 0; wi < st.players.length; wi++) {
          var wp = st.players[wi];
          wp.x = sd.x + (wi === 0 ? -26 : 26);
          wp.y = DA.ARENA.y1 - 24;
          wp.aimX = 0; wp.aimY = -1;
        }
      }
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
      st.saidLines = carry.saidLines;         // the host never repeats himself all run
    }
    st.players = [st.player];                 // st.player stays the human, always
    if (localCoopOn) {
      var mate = DA.makePlayer();
      mate.localP2 = true;                    // seat 2 reads its OWN gamepad (slot 2), never seat 1's
      st.players.push(mate);
    } else if (botOn) {
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
  var showSettings = false;   // title-screen settings panel
  var showCoopChoice = false; // title-screen "how are you playing?" submenu
  var menuSel = 0, setSel = 0, pauseSel = 0, coopSel = 0;   // keyboard/gamepad cursor per menu
  var titleMenu = [], settingsMenu = [], pauseMenu = [], coopMenu = [];   // rebuilt every frame

  function toggleShake() {
    DA.fx.shakeOn = DA.fx.shakeOn === false;
    try { localStorage.setItem('deadset_shake', DA.fx.shakeOn ? '1' : '0'); } catch (err) {}
    DA.announce(DA.fx.shakeOn ? 'SHAKE ON' : 'SHAKE OFF');
  }
  function toggleFx() {
    if (!DA.broadcast) return;
    DA.broadcast.on = !DA.broadcast.on;
    try { localStorage.setItem('deadset_bfx', DA.broadcast.on ? '1' : '0'); } catch (err) {}
    DA.announce(DA.broadcast.on ? 'BROADCAST FX ON' : 'BROADCAST FX OFF');
  }
  var pauseWasHeld = false;
  var padNavWas = { d: false, u: false, a: false };   // gamepad menu-nav edges

  // touch UI: taps starting in the top-right corner pause instead of aiming
  DA.touchUIBlock = function (x, y) {
    if (DA.state.mode === 'playing' && paused && !showBestiary) {
      var pi = hitMenu(showSettings ? settingsMenu : pauseMenu, x, y);
      if (pi >= 0) return 'btn:' + pi;
      return false;                          // taps elsewhere resume (anyTap path)
    }
    if (DA.state.mode === 'playing' && x > DA.W - 84 && y < 76) return true;
    if (DA.state.mode === 'title') {          // taps route to the menu buttons
      var bi = DA.titleHit ? DA.titleHit(x, y) : -1;
      if (bi >= 0) return 'btn:' + bi;
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
  var botOn = load('deadset_bot') === '1';        // persisted: last "with a bot" choice
  var localCoopOn = false;                        // set fresh each time 2P > LOCAL CO-OP is picked
  var showDebug = false;      // G toggles a raw-gamepad readout for troubleshooting
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyG') showDebug = !showDebug;
    if ((e.code === 'Escape' || e.code === 'KeyP') && DA.state.mode === 'playing' &&
        !(e.code === 'Escape' && (showSettings || showBestiary))) paused = !paused;
    if (e.code === 'KeyB' && paused && DA.state.mode === 'playing') showBestiary = !showBestiary;
    if (e.code === 'KeyC' && DA.state.mode === 'title') showBestiary = !showBestiary;
    if (e.code === 'Escape' && showBestiary) showBestiary = false;
    if (e.code === 'KeyK') toggleShake();
    if (e.code === 'KeyV') toggleFx();
    if (e.code === 'KeyI' && DA.state.mode === 'title') { showSettings = false; DA.state = { mode: 'intro', page: 0 }; }
    if (e.code === 'KeyH' && DA.state.mode === 'title' && DA.net) DA.net.host();
    // arrow/enter menu navigation on the title, pause and settings screens
    var inPauseMenu = DA.state.mode === 'playing' && paused;
    if ((DA.state.mode === 'title' || inPauseMenu) && !showBestiary) {
      var baseMenu = inPauseMenu ? pauseMenu : (showCoopChoice ? coopMenu : titleMenu);
      var baseSel = inPauseMenu ? pauseSel : (showCoopChoice ? coopSel : menuSel);
      var menu = showSettings ? settingsMenu : baseMenu;
      var moving = (e.code === 'ArrowDown' || e.code === 'KeyS') ? 1 :
                   ((e.code === 'ArrowUp' || e.code === 'KeyW') ? -1 : 0);
      if (moving && menu.length) {
        var sel = showSettings ? setSel : baseSel;
        for (var tries = 0; tries < menu.length; tries++) {   // skip locked entries
          sel = (sel + moving + menu.length) % menu.length;
          if (!menu[sel].locked) break;
        }
        if (showSettings) setSel = sel;
        else if (inPauseMenu) pauseSel = sel;
        else if (showCoopChoice) coopSel = sel;
        else menuSel = sel;
      }
      if ((e.code === 'Enter' || e.code === 'Space') && menu.length) {
        var pick = menu[showSettings ? setSel : (inPauseMenu ? pauseSel : (showCoopChoice ? coopSel : menuSel))];
        if (pick && !pick.locked) pick.act();
      }
      if (e.code === 'Escape' && showSettings) showSettings = false;
      else if (e.code === 'Escape' && showCoopChoice) showCoopChoice = false;
    }
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
  var endlessKeyHeld = false;
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyE') endlessKeyHeld = false;
  });

  function endlessUnlocked() { return load('deadset_ep1') === '1'; }

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
      if (st.mode === 'title') {
        titleMenu = buildTitleMenu();
        settingsMenu = buildSettingsMenu();
        coopMenu = buildCoopMenu();
        var click = DA.input.consumeClick ? DA.input.consumeClick() : null;
        var btnTap = DA.input.consumeBtnTap ? DA.input.consumeBtnTap() : -1;
        var tapAny = DA.input.consumeAnyTap ? DA.input.consumeAnyTap() : false;
        if (showBestiary) {                        // cast page: anything closes it
          if (click || tapAny || (startHeld && !startWasHeld)) showBestiary = false;
          startWasHeld = startHeld;
          DA.updateFx(dt);
          return;
        }
        var menu = showSettings ? settingsMenu : (showCoopChoice ? coopMenu : titleMenu);
        if (click) {                               // mouse: click a button, nothing else starts
          var ci = hitMenu(menu, click.x, click.y);
          if (ci >= 0 && !menu[ci].locked) {
            if (showSettings) setSel = ci; else if (showCoopChoice) coopSel = ci; else menuSel = ci;
            menu[ci].act();
          }
        }
        if (btnTap >= 0 && menu[btnTap] && !menu[btnTap].locked) menu[btnTap].act();
        // gamepad: d-pad moves the cursor, A activates
        var padD = DA.input.padButton(13), padU = DA.input.padButton(12), padA = DA.input.padButton(0);
        if ((padD && !padNavWas.d) || (padU && !padNavWas.u)) {
          var dir = padD && !padNavWas.d ? 1 : -1;
          var s2 = showSettings ? setSel : (showCoopChoice ? coopSel : menuSel);
          for (var tr = 0; tr < menu.length; tr++) {
            s2 = (s2 + dir + menu.length) % menu.length;
            if (!menu[s2].locked) break;
          }
          if (showSettings) setSel = s2; else if (showCoopChoice) coopSel = s2; else menuSel = s2;
        }
        if (padA && !padNavWas.a) {
          var pk = menu[showSettings ? setSel : (showCoopChoice ? coopSel : menuSel)];
          if (pk && !pk.locked) pk.act();
        }
        padNavWas.d = padD; padNavWas.u = padU; padNavWas.a = padA;
      } else if (startHeld && !startWasHeld) {     // winner/gameover: fire continues the run
        if (st.mode === 'winner' && (st.room.ep || 1) === 1) DA.state = newGame('writers', st);
        else if (st.mode === 'winner' && st.room.ep === 2) DA.state = newGame('controlbooth', st);
        else DA.state = newGame();
      }
      var endlessHeld = endlessKeyHeld || DA.input.padButton(3);
      if (endlessUnlocked() && endlessHeld && !endlessWasHeld) DA.state = newGame('endless');
      if (st.mode === 'title' && DA.input.consumeCastTap && DA.input.consumeCastTap()) showBestiary = !showBestiary;
      startWasHeld = startHeld;
      endlessWasHeld = endlessHeld;
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
    if (st.entranceT > 0) {                      // walking on set — no control yet
      st.entranceT -= dt;
      var allThere = true;
      for (var ei = 0; ei < st.players.length; ei++) {
        var ep2 = st.players[ei];
        var tx = DA.W / 2 + (ei === 0 ? -26 : 26), ty = DA.H / 2;
        var ddx = tx - ep2.x, ddy = ty - ep2.y;
        var edist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (edist > 4) {
          allThere = false;
          var espd = 130;                        // a deliberate walk, not a sprint
          ep2.vx = ddx / edist * espd;
          ep2.vy = ddy / edist * espd;
          ep2.x += ep2.vx * dt;
          ep2.y += ep2.vy * dt;
          ep2.walkT = (ep2.walkT || 0) + espd * dt * 0.06;
        } else {
          ep2.vx = 0; ep2.vy = 0;
        }
        ep2.aimX = 0; ep2.aimY = -1;             // eyes front, into the studio
      }
      if (allThere || st.entranceT <= 0) {       // in position: cue the countdown
        st.entranceT = 0;
        st.countdownT = 3.0;
      }
      if (st.introCardT > 0) st.introCardT -= dt;
      DA.updateFx(dt);
      return;
    }
    var cornerTap = DA.input.consumePauseTap();
    if (cornerTap) paused = !paused;                                  // the ⏸ chip toggles
    if (paused) {                                                     // pause MENU input
      pauseMenu = buildPauseMenu();
      settingsMenu = buildSettingsMenu();
      var pClick = DA.input.consumeClick ? DA.input.consumeClick() : null;
      var pTap = DA.input.consumeBtnTap ? DA.input.consumeBtnTap() : -1;
      var pAny = DA.input.consumeAnyTap ? DA.input.consumeAnyTap() : false;
      if (showBestiary) {
        if (pClick || pAny) showBestiary = false;
      } else {
        var pMenu = showSettings ? settingsMenu : pauseMenu;
        if (pClick) {
          var pci = hitMenu(pMenu, pClick.x, pClick.y);
          if (pci >= 0 && !pMenu[pci].locked) {
            if (showSettings) setSel = pci; else pauseSel = pci;
            pMenu[pci].act();
          } else if (!showSettings) paused = false;   // click outside resumes
        }
        if (pTap >= 0 && pMenu[pTap] && !pMenu[pTap].locked) pMenu[pTap].act();
        else if (pTap < 0 && pAny && DA.input.touchActive() && !showSettings) paused = false;
        var ppD = DA.input.padButton(13), ppU = DA.input.padButton(12), ppA = DA.input.padButton(0);
        if ((ppD && !padNavWas.d) || (ppU && !padNavWas.u)) {
          var pdir = ppD && !padNavWas.d ? 1 : -1;
          var ps2 = showSettings ? setSel : pauseSel;
          ps2 = (ps2 + pdir + pMenu.length) % pMenu.length;
          if (showSettings) setSel = ps2; else pauseSel = ps2;
        }
        if (ppA && !padNavWas.a) {
          var ppk = pMenu[showSettings ? setSel : pauseSel];
          if (ppk && !ppk.locked) ppk.act();
        }
        padNavWas.d = ppD; padNavWas.u = ppU; padNavWas.a = ppA;
      }
    }
    if (paused) return;
    if (DA.fx.hitStop > 0) { DA.fx.hitStop -= dt; return; }   // the big-kill freeze frame

    var fighting = st.enemies.length > 0;
    for (var pi = 0; pi < st.players.length; pi++) {
      var pl = st.players[pi];
      var inp;
      if (pl.remote) {           // seat 2 is a live guest: play their last packet
        inp = (DA.net && DA.net.freshGuestInput()) ||
              { moveX: 0, moveY: 0, aimX: pl.aimX, aimY: pl.aimY, firing: false };
      } else if (pl.localP2) {   // local co-op: seat 2 reads gamepad slot 2 directly
        inp = DA.input.padState(1, pl.x, pl.y);
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
    if (st.countdownT > 0) {                     // 3... 2... 1... nothing spawns yet
      var cdPrev = Math.ceil(st.countdownT / 1.0);
      st.countdownT -= dt;
      var cdNow = Math.ceil(Math.max(st.countdownT, 0.001) / 1.0);
      if (cdNow !== cdPrev || st.countdownT <= 0) {
        if (DA.audio && DA.audio.tick) DA.audio.tick();
        if (st.countdownT <= 0) {
          if (DA.addShake) DA.addShake(5);
          if (DA.announce) DA.announce('HERE. WE. GO!!');
        }
      }
    } else {
      DA.updateWaves(st.waveManager, st.enemies, dt);
    }
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
      if (DA.fx.host && DA.fx.host.speaker === boss.type) {
        boss.grace = Math.max(boss.grace, 0.25);       // no fight while BOSS CAM is live
      } else if (!boss.actionCalled && boss.grace <= 0.25) {
        boss.actionCalled = true;                      // the cam just cut away
        DA.announce('ACTION!');
        if (DA.audio && DA.audio.sting) DA.audio.sting();
      }
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
    // Act 5: during the finale fight the presenter's confession drips out in
    // order, one line every few seconds — no audience voice left, just him
    if (boss && !boss.dying && st.room.ep === 3 && st.room.boss && DA.presenterQuip) {
      st.act5T = (st.act5T == null ? 6 : st.act5T) - dt;
      if (st.act5T <= 0) {
        st.act5T = 9;
        var conf = DA.presenterQuip(st);
        if (conf) (DA.hostSay || DA.announce)(conf);
      }
    }
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
        pd.downAim = Math.atan2(pd.aimY, pd.aimX);   // freeze facing where he fell
        if (DA.splat) DA.splat(pd.x, pd.y);          // a pool spreads under the body
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
  // CRT edge curvature: a rounded-corner shadow frame, baked once — the last
  // touch that makes the whole picture read as a broadcast monitor
  var crtMask = (function () {
    var c = document.createElement('canvas'); c.width = DA.W; c.height = DA.H;
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(0, 0, 0, 0.6)';
    g.fillRect(0, 0, DA.W, DA.H);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    if (g.roundRect) g.roundRect(1, 1, DA.W - 2, DA.H - 2, 48); else g.rect(0, 0, DA.W, DA.H);
    g.fill();                                          // hard window...
    g.filter = 'blur(6px)';                            // ...softened at the rim
    g.beginPath();
    if (g.roundRect) g.roundRect(4, 4, DA.W - 8, DA.H - 8, 48); else g.rect(0, 0, DA.W, DA.H);
    g.fill();
    return c;
  })();
  function drawScreenFx(ctx) {
    ctx.drawImage(vignette, 0, 0);
    if (!scanPattern) scanPattern = ctx.createPattern(scanlines, 'repeat');
    ctx.fillStyle = scanPattern;
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.drawImage(crtMask, 0, 0);
  }

  // ambient colour cast per set, so makeup reads pink and the server room blue
  var ROOM_TINT = {
    mirrors: 'rgba(230, 140, 200, 0.05)', tables: 'rgba(120, 200, 160, 0.04)',
    monitors: 'rgba(255, 170, 90, 0.05)', servers: 'rgba(90, 150, 255, 0.055)',
    crates: 'rgba(210, 190, 120, 0.045)', desks: 'rgba(170, 140, 255, 0.045)',
    papers: 'rgba(200, 200, 230, 0.04)', lounge: 'rgba(140, 220, 140, 0.045)',
    racks: 'rgba(255, 140, 120, 0.045)', bossfloor: 'rgba(255, 80, 80, 0.05)',
    lighting: 'rgba(255, 220, 130, 0.045)', catwalk: 'rgba(160, 160, 190, 0.04)',
    cranebay: 'rgba(255, 190, 110, 0.045)', pyrobay: 'rgba(255, 110, 60, 0.06)',
    corebay: 'rgba(90, 220, 255, 0.05)'
  };
  // a studio camera on a tripod, aimed at the action
  function drawTripodCam(ctx, x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(20, 20, 28, 0.8)';        // tripod legs
    ctx.lineWidth = 2.5;
    for (var l = 0; l < 3; l++) {
      var la = ang + 2.2 + l * 1.05;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(la) * 14, Math.sin(la) * 14); ctx.stroke();
    }
    ctx.rotate(ang);
    ctx.fillStyle = '#22222e';                        // camera body
    ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#14141c';                        // lens hood
    ctx.fillRect(8, -4, 7, 8);
    ctx.fillStyle = '#3a5a7a';                        // lens glass
    ctx.beginPath(); ctx.arc(13, 0, 2.5, 0, 7); ctx.fill();
    if (Math.floor(performance.now() / 700) % 2 === 0) {
      ctx.fillStyle = '#d43a4b';                      // tally light
      ctx.beginPath(); ctx.arc(-5, -8, 2, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function drawArena(ctx, st) {
    var A = DA.ARENA;
    ctx.fillStyle = '#2a2a38';                        // walls
    ctx.fillRect(0, 0, DA.W, DA.H);
    ctx.fillStyle = floorPattern((st.room && st.room.floor) || '#1c1c26'); // tiled floor
    ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
    ctx.drawImage(decorCanvas(st), A.x0, A.y0);        // this room's set dressing
    var tint = ROOM_TINT[st.room && st.room.decor];    // ambient colour per set
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
    }
    // cable runs taped across the floor — a real set is never tidy
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(A.x0 + 60, A.y1 - 12);
    ctx.bezierCurveTo(DA.W * 0.35, A.y1 - 26, DA.W * 0.6, A.y1 - 6, A.x1 - 60, A.y1 - 18);
    ctx.moveTo(A.x1 - 14, A.y0 + 70);
    ctx.bezierCurveTo(A.x1 - 30, DA.H * 0.4, A.x1 - 8, DA.H * 0.6, A.x1 - 22, A.y1 - 70);
    ctx.stroke();
    var sweep = performance.now() / 4000;
    var followed = st.players || (st.player ? [st.player] : null);
    for (var tp = 0; tp < 4; tp++) {                   // camera tripods, one per corner —
      var tc = [[A.x0 + 62, A.y0 + 58], [A.x1 - 62, A.y0 + 58],           // ACTIVELY FILMING:
                [A.x0 + 62, A.y1 - 58], [A.x1 - 62, A.y1 - 58]][tp];      // they track the cast
      var camAng;
      if (followed) {
        var camStar = followed[tp % followed.length];
        camAng = Math.atan2(camStar.y - tc[1], camStar.x - tc[0]) +
                 Math.sin(sweep * 2.3 + tp * 2.1) * 0.05;   // a slower, steadier operator
      } else {
        camAng = Math.atan2(DA.H / 2 - tc[1], DA.W / 2 - tc[0]);
      }
      drawTripodCam(ctx, tc[0], tc[1], camAng);
      ctx.fillStyle = 'rgba(150, 200, 255, 0.05)';    // ON-CAMERA LIGHT: cool blue-white,
      ctx.beginPath();                                 // distinct from the warm followspots
      ctx.moveTo(tc[0], tc[1]);
      ctx.arc(tc[0], tc[1], 520, camAng - 0.075, camAng + 0.075);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(232, 212, 77, 0.07)';     // game-show floor rings
    ctx.lineWidth = 3;
    for (var r = 80; r <= 320; r += 80) {
      ctx.beginPath(); ctx.arc(DA.W / 2, DA.H / 2, r, 0, 7); ctx.stroke();
    }
    // studio spotlights, one per corner: independent wandering sweeps, always —
    // unlike the tripod cameras above, these never lock onto a contestant.
    // Four lights roaming the arena on their own paths reads as a real
    // broadcast rig; four things all staring at the same two players doesn't.
    ctx.fillStyle = 'rgba(240, 235, 200, 0.035)';
    var corners = [[A.x0, A.y0], [A.x1, A.y0], [A.x0, A.y1], [A.x1, A.y1]];
    // base angle points from each corner straight at the arena's center, so
    // the sweep oscillates across the interior instead of drifting outward
    // past the wall (the bottom-right corner used to do exactly that — its
    // old hand-tuned offset pointed the beam away from the floor entirely)
    var CORNER_BASE = [Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4];
    for (var li = 0; li < 4; li++) {
      var cpos = corners[li];
      var a = CORNER_BASE[li] + Math.sin(sweep * (li % 2 ? -1.3 : 1) + li * 1.7) * 0.6;
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
    var sirenMap = (st.waveManager && st.waveManager.sirens) || {};
    var anySiren = false;
    for (var i = 0; i < DA.DOORS.length; i++) {       // doors: gaps in the walls
      var d = DA.DOORS[i];
      var isExit = st.room && ((st.room.exits[d.dir] && st.roomCleared) ||
                               (st.bossDead && st.victoryExit === d.dir));
      var isPouring = active.indexOf(d) !== -1;       // zombies mid-pour: slab washes red
      var isSpawning = !isExit && (isPouring || !!sirenMap[d.dir]);  // lamps: warn + pour + linger
      ctx.fillStyle = isExit ? '#2e6b3a' :
        (isPouring ? 'rgba(150, 35, 45, ' + (0.65 + Math.sin(performance.now() / 200) * 0.25) + ')' : '#101018');
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
      if (isSpawning) anySiren = true;
      var lampNow = performance.now();
      var lamps = (d.dir === 'N' || d.dir === 'S') ?
        [[d.x - 70, d.y], [d.x + 70, d.y]] : [[d.x, d.y - 70], [d.x, d.y + 70]];
      for (var lp = 0; lp < 2; lp++) {
        var LX = lamps[lp][0], LY = lamps[lp][1];
        ctx.fillStyle = '#26262e';                     // lamp housing
        ctx.fillRect(LX - 5, LY - 5, 10, 10);
        if (isExit) {                                  // green: FLASHING until you take it
          var ga = Math.floor(lampNow / 260) % 2 ? 0.95 : 0.3;
          ctx.fillStyle = 'rgba(126, 224, 129, ' + (ga * 0.35).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(LX, LY, 11, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(126, 224, 129, ' + ga.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(LX, LY, 4, 0, 7); ctx.fill();
        } else if (isSpawning) {                       // red beacon: they're coming
          var beam = (lampNow / 140 + lp * 3.14) % 6.283;
          ctx.fillStyle = 'rgba(220, 50, 60, 0.06)';   // the long sweep, painting the arena
          ctx.beginPath();
          ctx.moveTo(LX, LY);
          ctx.arc(LX, LY, 460, beam, beam + 0.45);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(220, 50, 60, 0.28)';   // the beacon head
          ctx.beginPath();
          ctx.moveTo(LX, LY);
          ctx.arc(LX, LY, 26, beam, beam + 0.9);
          ctx.closePath(); ctx.fill();
          var ra = 0.55 + Math.sin(lampNow / 90) * 0.45;
          ctx.fillStyle = 'rgba(220, 50, 60, ' + (ra * 0.4).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(LX, LY, 12, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(230, 60, 70, ' + ra.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(LX, LY, 4.5, 0, 7); ctx.fill();
        } else {                                       // idle: a dark dome
          ctx.fillStyle = '#3a3a44';
          ctx.beginPath(); ctx.arc(LX, LY, 3.5, 0, 7); ctx.fill();
        }
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
    if (anySiren) {                                    // the whole set breathes red
      ctx.fillStyle = 'rgba(220, 50, 60, ' + (0.025 + Math.sin(performance.now() / 180) * 0.02).toFixed(4) + ')';
      ctx.fillRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
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
    DA.drawCorpseLimbs(ctx, p.x, p.y, p.r, 2.2);
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
  // ---- the title menu: REAL buttons, not hotkey trivia. Click, tap, arrow
  // keys + Enter, or gamepad d-pad + A all drive the same list. Locked modes
  // stay visible with a lock + how to earn them, instead of vanishing.
  function startShow() {   // first-ever launch tells the story first; everyone else goes straight in
    DA.state = load('slashtv_intro') !== '1' ? { mode: 'intro', page: 0 } : newGame();
  }
  function buildTitleMenu() {
    var endu = endlessUnlocked();
    var BW = 560, X = (DA.W - BW) / 2, Y0 = 308, G = 52, BH = 48;
    var m = [], row = 0;
    function push(opts) {
      opts.x = X; opts.y = Y0 + G * row++; opts.w = BW; opts.h = BH;
      m.push(opts);
    }
    push({ color: '#7ee081', primary: true, label: '▶  1 PLAYER', state: 'PILOT SEASON',
           act: function () { botOn = false; localCoopOn = false; startShow(); } });
    push({ color: '#9ad7ff', label: '👥  2 PLAYER', state: 'local, online, or with a bot',
           act: function () { showCoopChoice = true; coopSel = 0; } });
    var hosting = DA.net && DA.net.status === 'hosting';
    push({ color: '#9ad7ff', locked: !DA.net, label: '🌍  ONLINE MULTIPLAYER',
           state: hosting ? 'ROOM ' + (DA.net.code || '····') : 'get a link to share',
           act: function () { botOn = false; localCoopOn = false; if (DA.net) DA.net.host(); } });
    push({ color: '#5bc8d6', locked: !endu, label: '♾  ENDLESS MODE',
           state: endu ? 'best: wave ' + (load('deadset_best_waves') || '0') : '🔒 beat Episode 1',
           act: function () { DA.state = newGame('endless'); } });
    push({ color: '#f2f2e9', label: '⚙  SETTINGS', state: 'sound · music · effects',
           act: function () { showSettings = true; setSel = 0; } });
    push({ color: '#e8d44d', label: "🧟  TONIGHT'S CAST", state: 'know your monsters',
           act: function () { showBestiary = true; } });
    if (window.SLASHTV_DONATE_URL) {
      push({ color: '#e8d44d', label: '💛  SUPPORT THE SHOW', state: 'optional — no ads, ever',
             act: function () { window.open(window.SLASHTV_DONATE_URL, '_blank', 'noopener'); } });
    }
    return m;
  }
  // the "how are you playing?" submenu reached from 2 PLAYER — three ways to
  // fill seat 2, each with a little picture (see drawModeIcon) of who's playing
  // where: local co-op needs a second controller (keyboard's already seat 1's),
  // online hands seat 2 to a guest on their own device, cam-bot fills it with AI
  function buildCoopMenu() {
    var BW = 620, X = (DA.W - BW) / 2, Y0 = 330, G = 96, BH = 82;
    var hosting = DA.net && DA.net.status === 'hosting';
    return [
      { x: X, y: Y0, w: BW, h: BH, color: '#7ee081', icon: 'local',
        label: 'LOCAL CO-OP', state: 'one screen — plug in a 2nd controller',
        act: function () {
          botOn = false; localCoopOn = true;
          startShow();
          showCoopChoice = false;
        } },
      { x: X, y: Y0 + G, w: BW, h: BH, color: '#9ad7ff', locked: !DA.net, icon: 'online',
        label: 'ONLINE CO-OP',
        state: hosting ? 'ROOM ' + (DA.net.code || '····') : 'get a link to share',
        act: function () {
          botOn = false; localCoopOn = false;
          if (DA.net) DA.net.host();
          showCoopChoice = false;
        } },
      { x: X, y: Y0 + G * 2, w: BW, h: BH, color: '#a8c8d8', icon: 'bot',
        label: 'CAM-BOT PARTNER', state: 'one screen, one controller — AI takes seat 2',
        act: function () {
          localCoopOn = false; botOn = true;
          store('deadset_bot', '1');
          startShow();
          showCoopChoice = false;
        } },
      { x: X, y: Y0 + G * 3 + 14, w: BW, h: 44, color: '#f2f2e9',
        label: '←  BACK', state: '', act: function () { showCoopChoice = false; } }
    ];
  }
  function buildPauseMenu() {
    var BW = 480, X = (DA.W - BW) / 2, Y0 = 340, G = 58, BH = 48;
    return [
      { x: X, y: Y0, w: BW, h: BH, color: '#7ee081', primary: true,
        label: '▶  RESUME', state: DA.input.touchActive() ? 'or tap outside' : 'Esc / P',
        act: function () { paused = false; } },
      { x: X, y: Y0 + G, w: BW, h: BH, color: '#f2f2e9',
        label: '⚙ SETTINGS', state: 'sound · music · effects',
        act: function () { showSettings = true; setSel = 0; } },
      { x: X, y: Y0 + G * 2, w: BW, h: BH, color: '#e8d44d',
        label: "🧟 TONIGHT'S CAST", state: 'B',
        act: function () { showBestiary = true; } },
      { x: X, y: Y0 + G * 3, w: BW, h: BH, color: '#d43a4b',
        label: '📺 QUIT TO TITLE SCREEN', state: 'run is abandoned',
        act: function () { paused = false; showSettings = false; DA.state = { mode: 'title' }; } }
    ];
  }
  function buildSettingsMenu() {
    var BW = 560, X = (DA.W - BW) / 2, Y0 = 312, G = 55, BH = 46;
    function row(i, label, state, hint, act) {
      return { x: X, y: Y0 + G * i, w: BW, h: BH, color: '#f2f2e9',
               label: label, state: state, hint: hint, act: act };
    }
    return [
      row(0, '🔊 SOUND', DA.soundOn && DA.soundOn() ? 'ON ✓' : 'OFF', 'M', function () { DA.toggleMute(); }),
      row(1, '🎵 MUSIC', DA.musicOn && DA.musicOn() ? 'ON ✓' : 'OFF', 'N', function () { DA.toggleMusic(); }),
      row(2, '💥 SCREEN SHAKE', DA.fx.shakeOn !== false ? 'ON ✓' : 'OFF', 'K', toggleShake),
      row(3, '📺 BROADCAST FX', DA.broadcast && DA.broadcast.on ? 'ON ✓' : 'OFF', 'V', toggleFx),
      row(4, '📳 HAPTICS (rumble/vibration)', DA.hapticsOn && DA.hapticsOn() ? 'ON ✓' : 'OFF', '', function () { DA.toggleHaptics(); }),
      row(5, '📖 REPLAY THE STORY INTRO', '', 'I', function () { showSettings = false; DA.state = { mode: 'intro', page: 0 }; }),
      row(6, '← BACK', '', 'Esc', function () { showSettings = false; })
    ];
  }
  function hitMenu(menu, x, y) {
    for (var i = 0; i < menu.length; i++) {
      var b = menu[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
    }
    return -1;
  }
  DA.titleHit = function (x, y) {   // touch taps route through input.js as 'btn:N'
    if (DA.state.mode !== 'title' || showBestiary) return -1;
    return hitMenu(showSettings ? settingsMenu : (showCoopChoice ? coopMenu : titleMenu), x, y);
  };
  // small canvas-drawn glyphs for the 2-player submenu: TVs + gamepads sketch
  // out HOW each mode plays before anyone has to read the label
  function drawModeIcon(ctx, kind, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    function tv(x, y, s) {
      ctx.fillStyle = '#14141c'; ctx.fillRect(x, y, s, s * 0.72);
      ctx.strokeStyle = '#6a6a7c'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, s, s * 0.72);
      ctx.fillStyle = '#3a5a7a'; ctx.fillRect(x + 3, y + 3, s - 6, s * 0.72 - 6);
    }
    function pad(x, y, s) {
      ctx.fillStyle = '#e8d44d';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, s, s * 0.6, s * 0.22); else ctx.rect(x, y, s, s * 0.6);
      ctx.fill();
      ctx.fillStyle = '#14141c';
      ctx.beginPath(); ctx.arc(x + s * 0.26, y + s * 0.3, s * 0.1, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.74, y + s * 0.3, s * 0.1, 0, 7); ctx.fill();
    }
    if (kind === 'local') {                     // ONE screen, TWO controllers
      tv(-16, -20, 32);
      pad(-25, 9, 20); pad(5, 9, 20);
    } else if (kind === 'online') {              // TWO screens, TWO controllers, linked
      tv(-32, -18, 24); tv(8, -18, 24);
      pad(-30, 9, 17); pad(13, 9, 17);
      ctx.strokeStyle = 'rgba(154, 215, 255, 0.85)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.stroke();
      ctx.setLineDash([]);
    } else if (kind === 'bot') {                 // ONE screen, ONE controller, ONE AI partner
      tv(-16, -20, 32);
      pad(-10, 9, 20);
      ctx.fillStyle = '#a8c8d8';
      ctx.beginPath(); ctx.arc(14, -8, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#14141c';
      ctx.beginPath(); ctx.arc(11, -9, 1.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(17, -9, 1.6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#a8c8d8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(14, -17); ctx.lineTo(14, -21); ctx.stroke();
      ctx.beginPath(); ctx.arc(14, -22, 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function drawMenu(ctx, menu, sel) {
    var mp = DA.input.mousePos ? DA.input.mousePos() : null;
    for (var i = 0; i < menu.length; i++) {
      var b = menu[i];
      var hover = mp && hitMenu([b], mp.x, mp.y) === 0 && !b.locked;
      if (hover) sel = i;
      var on = i === sel && !b.locked;
      ctx.fillStyle = b.locked ? 'rgba(16, 16, 22, 0.85)' :
                      (on ? 'rgba(52, 52, 70, 0.96)' : 'rgba(26, 26, 36, 0.92)');
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 9); else ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.strokeStyle = b.locked ? '#2c2c38' : (on ? '#7ee081' : (b.primary ? b.color : '#4a4a5c'));
      ctx.lineWidth = on || b.primary ? 2.5 : 1.5;
      ctx.stroke();
      ctx.textAlign = 'left';
      if (b.icon) {                                    // a little picture of how the mode plays
        drawModeIcon(ctx, b.icon, b.x + 44, b.y + b.h / 2);
        ctx.font = 'bold 19px monospace';
        ctx.fillStyle = b.locked ? '#4a4a58' : b.color;
        ctx.fillText(b.label, b.x + 92, b.y + b.h / 2 - 4);
        if (b.state) {
          ctx.font = '13px monospace';
          ctx.fillStyle = b.locked ? '#4a4a58' : '#8888a0';
          ctx.fillText(b.state, b.x + 92, b.y + b.h / 2 + 18);
        }
        if (on) {
          ctx.textAlign = 'left';
          ctx.font = 'bold 19px monospace';
          ctx.fillStyle = '#7ee081';
          ctx.fillText('›', b.x + 5, b.y + b.h / 2 + 7);
        }
        continue;
      }
      ctx.font = 'bold ' + (b.primary ? 22 : 19) + 'px monospace';
      ctx.fillStyle = b.locked ? '#4a4a58' : b.color;
      ctx.fillText(b.label, b.x + 18, b.y + b.h / 2 + 7);
      if (b.state) {
        ctx.textAlign = 'right';
        ctx.font = (b.locked ? '' : 'bold ') + '14px monospace';
        ctx.fillStyle = b.locked ? '#4a4a58' : '#8888a0';
        ctx.fillText(b.state, b.x + b.w - 14, b.y + b.h / 2 + 5);
      }
      if (b.hint) {
        ctx.textAlign = 'right';
        ctx.font = '12px monospace';
        ctx.fillStyle = '#55556a';
        ctx.fillText(b.hint, b.x + b.w - 14, b.y + b.h - 8);
      }
      if (on) {                                     // selection chevron
        ctx.textAlign = 'left';
        ctx.font = 'bold 19px monospace';
        ctx.fillStyle = '#7ee081';
        ctx.fillText('›', b.x + 5, b.y + b.h / 2 + 7);
      }
    }
    return sel;
  }

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

  // HOST CAM: the presenter pops up in a corner window, talking head + caption,
  // whenever he has something to say — like a real broadcast's commentary box
  function drawHostCam(ctx) {
    var hst = DA.fx.host;
    if (!hst) return;
    if (DA.state && DA.state.introCardT > 0) return;   // the title card owns this corner
    var a = Math.max(0, Math.min(1, (hst.max - hst.t) / 0.25, hst.t / 0.4));
    // signal quality: full static as the feed cuts in, and again as it cuts out
    var glitch = Math.max(0, 1 - (hst.max - hst.t) / 0.3, 1 - hst.t / 0.38);
    var x = 14, y = 545, w = 478, h = 118, bs = 80, bx = x + 12;
    ctx.save();                                         // the CARD is see-through...
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = a * 0.6;
    ctx.fillStyle = 'rgba(8, 8, 14, 0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = a;                                // ...but the host IMAGE square is OPAQUE
    ctx.fillStyle = '#0c0c12';
    ctx.fillRect(bx, y + 26, bs, bs);
    ctx.restore();
    ctx.globalAlpha = a;
    var bossCam = hst.speaker && hst.speaker !== 'host';
    ctx.strokeStyle = bossCam ? '#d43a4b' : '#3a3a48'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#d43a4b';
    if (Math.floor(hst.t * 3) % 2 === 0) { ctx.beginPath(); ctx.arc(x + 15, y + 13, 3.5, 0, 7); ctx.fill(); }
    ctx.fillText(bossCam ? 'BOSS CAM' : 'HOST CAM', x + 24, y + 17);
    var by = y + 26;                                    // the talking head
    ctx.fillStyle = '#1c1c28';
    ctx.fillRect(bx, by, bs, bs);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bs, bs); ctx.clip();
    var now = performance.now();
    var open = Math.abs(Math.sin(now / 90)) * (hst.t > 0.6 ? 1 : 0.15);
    if (hst.speaker === 'algorithm') {                  // the drone: a lens, not a face
      ctx.fillStyle = '#181c22';
      ctx.beginPath(); ctx.ellipse(bx + bs / 2, by + bs / 2, bs * 0.42, bs * 0.3, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(47, 215, 196, 0.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#3a4450'; ctx.lineWidth = 3;   // rotor arms
      ctx.beginPath();
      ctx.moveTo(bx + 10, by + 16); ctx.lineTo(bx + bs / 2 - 18, by + bs / 2 - 10);
      ctx.moveTo(bx + bs - 10, by + 16); ctx.lineTo(bx + bs / 2 + 18, by + bs / 2 - 10);
      ctx.stroke();
      ctx.fillStyle = '#2fd7c4';                        // the lens dilates as it "speaks"
      ctx.beginPath(); ctx.arc(bx + bs / 2, by + bs / 2, bs * 0.16 + open * 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#0a0a0f';
      ctx.beginPath(); ctx.arc(bx + bs / 2, by + bs / 2, bs * 0.07 + open * 2, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#d43a4b'; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bs, bs);
      drawHostCaption(ctx, hst, x, y, w, bx, bs);
      if (glitch > 0.02) drawCamStatic(ctx, bx, by, bs, bs, glitch);   // static on the IMAGE only
      ctx.globalAlpha = 1;
      return;
    }
    if (hst.speaker === 'executive') {                  // navy suit, visor, phone at ear
      var eg = ctx.createLinearGradient(bx, by + bs - 26, bx + bs, by + bs);
      eg.addColorStop(0, '#98a6ff'); eg.addColorStop(0.5, '#7a8aff'); eg.addColorStop(1, '#5a68c9');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.ellipse(bx + bs / 2, by + bs + 8, bs * 0.58, bs * 0.46, 0, 3.14, 6.29); ctx.fill();
      ctx.fillStyle = '#f2f2e9';
      ctx.fillRect(bx + bs / 2 - 8, by + bs - 18, 16, 18);
      ctx.fillStyle = '#d4a017';                        // gold tie
      ctx.fillRect(bx + bs / 2 - 3.5, by + bs - 18, 7, 18);
      var ex = bx + bs / 2, ey = by + bs * 0.42, er = bs * 0.29;
      ctx.fillStyle = '#d8a988';
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c2c34';                        // corporate hair
      ctx.beginPath(); ctx.arc(ex, ey - er * 0.28, er * 1.05, 3.3, 6.1); ctx.fill();
      ctx.fillStyle = '#111';                           // full-width visor
      ctx.fillRect(ex - er * 0.9, ey - er * 0.34, er * 1.8, er * 0.42);
      ctx.fillStyle = '#22222c';                        // phone welded to the ear
      ctx.fillRect(ex + er * 0.75, ey - er * 0.4, 6, er * 0.9);
      ctx.fillStyle = '#5c2a2a';
      ctx.beginPath(); ctx.ellipse(ex, ey + er * 0.52, er * 0.32, er * (0.07 + 0.2 * open), 0, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#d43a4b'; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bs, bs);
      drawHostCaption(ctx, hst, x, y, w, bx, bs);
      if (glitch > 0.02) drawCamStatic(ctx, bx, by, bs, bs, glitch);   // static on the IMAGE only
      ctx.globalAlpha = 1;
      return;
    }
    // the 80s package: sequined gold suit, industrial fake tan, teeth you could ski off
    var act = DA.presenterAct ? DA.presenterAct(DA.state) : 1;
    var sway = Math.sin(now / 1300) * 0.05 +            // he never quite sits still
               (act >= 4 ? Math.sin(now / 97) * 0.025 : 0);   // by the end, he shakes
    ctx.translate(bx + bs / 2, by + bs);
    ctx.rotate(sway);
    ctx.translate(-(bx + bs / 2), -(by + bs));
    var sg = ctx.createLinearGradient(bx, by + bs - 26, bx + bs, by + bs);
    sg.addColorStop(0, '#f5cf4e'); sg.addColorStop(0.5, '#d4a017'); sg.addColorStop(1, '#f0c649');
    ctx.fillStyle = sg;                                 // flashy suit shoulders
    ctx.beginPath(); ctx.ellipse(bx + bs / 2, by + bs + 8, bs * 0.58, bs * 0.46, 0, 3.14, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';            // sequin glints roll across the suit
    for (var sq = 0; sq < 3; sq++) {
      if ((Math.sin(now / 160 + sq * 2.4) + 1) / 2 > 0.75) {
        ctx.beginPath();
        ctx.arc(bx + 14 + sq * 26, by + bs - 8 - (sq % 2) * 7, 1.4, 0, 7);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#f8e8f0';                          // wide 80s collar
    ctx.beginPath();
    ctx.moveTo(bx + bs / 2 - 12, by + bs - 18); ctx.lineTo(bx + bs / 2, by + bs - 4);
    ctx.lineTo(bx + bs / 2 + 12, by + bs - 18); ctx.lineTo(bx + bs / 2 + 8, by + bs);
    ctx.lineTo(bx + bs / 2 - 8, by + bs); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c2185b';                          // power tie, louder decade
    ctx.fillRect(bx + bs / 2 - 3.5, by + bs - 16, 7, 16);
    var hx = bx + bs / 2, hy = by + bs * 0.42, hr = bs * 0.29;
    ctx.fillStyle = '#e08a4e';                          // industrial fake tan
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255, 205, 150, 0.45)';        // sunbed sheen on the brow
    ctx.beginPath(); ctx.arc(hx - hr * 0.3, hy - hr * 0.35, hr * 0.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#14100c';                          // jet-black lacquered helmet hair
    ctx.beginPath(); ctx.arc(hx, hy - hr * 0.28, hr * 1.06, 3.25, 6.17); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';         // the hair shine streak
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy - hr * 0.28, hr * 0.88, 3.7, 4.5); ctx.stroke();
    ctx.fillStyle = '#111';                             // shades stay on indoors, obviously
    ctx.fillRect(hx - hr * 0.85, hy - hr * 0.32, hr * 0.7, hr * 0.4);
    ctx.fillRect(hx + hr * 0.15, hy - hr * 0.32, hr * 0.7, hr * 0.4);
    ctx.fillRect(hx - hr * 0.2, hy - hr * 0.22, hr * 0.4, 3);
    var doneTalking = hst.t < 1.05;                     // the line has landed...
    if (doneTalking) {                                  // ...and the GRIN stays. Too long.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(hx, hy + hr * 0.5, hr * 0.52, hr * 0.17, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();                                  // tooth gaps
      for (var tg = -2; tg <= 2; tg++) {
        ctx.moveTo(hx + tg * hr * 0.18, hy + hr * 0.36);
        ctx.lineTo(hx + tg * hr * 0.18, hy + hr * 0.64);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = '#7a3020';                        // the mouth flaps while he talks
      ctx.beginPath(); ctx.ellipse(hx, hy + hr * 0.52, hr * 0.36, hr * (0.09 + 0.24 * open), 0, 0, 7); ctx.fill();
      if (open > 0.25) {                                // TEETH: dazzling, dentally impossible
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - hr * 0.28, hy + hr * 0.52 - hr * (0.06 + 0.1 * open), hr * 0.56, hr * 0.12);
      }
    }
    if ((Math.sin(now / 340) + 1) / 2 > 0.86) {         // the incisor PINGS periodically
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.4;
      var gx = hx + hr * 0.22, gy = hy + hr * 0.5;
      ctx.beginPath();
      ctx.moveTo(gx - 4, gy); ctx.lineTo(gx + 4, gy);
      ctx.moveTo(gx, gy - 4); ctx.lineTo(gx, gy + 4);
      ctx.stroke();
    }
    var sweep = (now / 3600) % 1;                       // a glint SWEEPS across the shades
    if (sweep < 0.16) {
      var gpx = hx - hr * 0.85 + sweep / 0.16 * hr * 1.7;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gpx - 2, hy - hr * 0.34);
      ctx.lineTo(gpx + 3, hy + hr * 0.1);
      ctx.stroke();
    }
    if (act >= 3) {                                     // the sweat starts in Act 3
      for (var swd = 0; swd < 2; swd++) {
        var fall = ((now / 1100) + swd * 0.45) % 1;
        ctx.fillStyle = 'rgba(200, 230, 255, ' + (0.65 * (1 - fall)).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(hx + (swd ? hr * 0.66 : -hr * 0.62), hy - hr * 0.25 + fall * hr * 0.9, 1.6, 0, 7);
        ctx.fill();
      }
    }
    if (act >= 4) {                                     // late acts: the feed itself is sick
      ctx.fillStyle = 'rgba(120, 255, 150, 0.06)';
      ctx.fillRect(bx, by, bs, bs);
    }
    ctx.restore();
    ctx.strokeStyle = '#3a3a48'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bs, bs);
    drawHostCaption(ctx, hst, x, y, w, bx, bs);
    if (glitch > 0.02) drawCamStatic(ctx, bx, by, bs, bs, glitch);   // static on the IMAGE only
    else if (act >= 4 && Math.random() < 0.05) drawCamStatic(ctx, bx, by, bs, bs, 0.5);
    ctx.globalAlpha = 1;
  }
  function drawHostCaption(ctx, hst, x, y, w, bx, bs) {
    if (!hst.lines) {                                   // wrap the caption once
      ctx.font = 'bold 15px monospace';
      hst.lines = [];
      var words = hst.text.split(' '), cur = '';
      var maxW = w - bs - 42;
      for (var wd = 0; wd < words.length; wd++) {
        var tryLine = cur ? cur + ' ' + words[wd] : words[wd];
        if (cur && ctx.measureText(tryLine).width > maxW) { hst.lines.push(cur); cur = words[wd]; }
        else cur = tryLine;
      }
      if (cur) hst.lines.push(cur);
    }
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#f2f2e9';
    for (var li = 0; li < hst.lines.length && li < 4; li++) {
      ctx.fillText(hst.lines[li], bx + bs + 14, y + 44 + li * 20);
    }
  }

  // broadcast static over the cam window while the feed cuts in/out
  function drawCamStatic(ctx, x, y, w, h, g) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (var n = 0; n < 46 * g; n++) {                  // snow
      var sx2 = x + Math.random() * w, sy2 = y + Math.random() * h;
      var lum = 40 + Math.random() * 215 | 0;
      ctx.fillStyle = 'rgba(' + lum + ',' + lum + ',' + lum + ',' + (0.25 + Math.random() * 0.5) + ')';
      ctx.fillRect(sx2, sy2, 2 + Math.random() * 5, 1.5);
    }
    for (var b2 = 0; b2 < 3; b2++) {                    // rolling tear bands
      if (Math.random() < g) {
        var by2 = y + Math.random() * h;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + Math.random() * 0.1) + ')';
        ctx.fillRect(x, by2, w, 2 + Math.random() * 5);
      }
    }
    if (Math.random() < g * 0.7) {                      // rgb fringe flicker
      ctx.fillStyle = 'rgba(255,60,60,0.1)'; ctx.fillRect(x + 2, y, w, h);
      ctx.fillStyle = 'rgba(60,255,220,0.08)'; ctx.fillRect(x - 2, y, w, h);
    }
    ctx.restore();
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
      ctx.fillStyle = buddy.bot ? '#a8c8d8' : '#b78bff';
      ctx.fillText(buddy.bot ? 'CAM-BOT' : (buddy.remote ? 'CONTESTANT 2' : 'PLAYER 2'), 16, 84);
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
    if ((DA.fx.shakeX || DA.fx.shakeY) && !paused) {
      ctx.translate(DA.fx.shakeX, DA.fx.shakeY);
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
      drawAttract(ctx);                              // the parade sits behind everything
      ctx.fillStyle = 'rgba(10, 10, 15, 0.72)';
      ctx.fillRect(0, 0, DA.W, DA.H);
      ctx.textAlign = 'center';
      ctx.font = 'bold 84px monospace'; ctx.fillStyle = '#e8d44d';
      ctx.fillText('SLASH TV', DA.W / 2, 160);
      ctx.font = 'bold 28px monospace'; ctx.fillStyle = '#d43a4b';
      ctx.fillText('THE FINAL BROADCAST', DA.W / 2, 202);
      ctx.font = '19px monospace'; ctx.fillStyle = '#f2f2e9';
      ctx.fillText(tagline, DA.W / 2, 238);
      if (showSettings) {
        ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#7ee081';
        ctx.fillText('⚙ SETTINGS', DA.W / 2, 288);
        setSel = drawMenu(ctx, settingsMenu, setSel);
        DA.drawFxOver(ctx);
        drawScreenFx(ctx);
        return;
      }
      if (showCoopChoice) {
        ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#7ee081';
        ctx.fillText('👥 HOW ARE YOU PLAYING?', DA.W / 2, 288);
        coopSel = drawMenu(ctx, coopMenu, coopSel);
        DA.drawFxOver(ctx);
        drawScreenFx(ctx);
        return;
      }
      // one-line status strip: hosting / tonight's leader / personal best
      var status = [];
      if (DA.net && DA.net.status === 'hosting') {
        status.push('ROOM ' + (DA.net.code || '····') +
                    (DA.net.remoteJoined ? ' — CONTESTANT 2 READY' : ' — waiting for contestant 2'));
      } else if (DA.net && DA.net.status === 'error') {
        status.push('RELAY ERROR — online co-op unavailable');
      }
      if (DA.lb && DA.lb.today && DA.lb.today.length && DA.lb.todaySeed === synSeed()) {
        status.push('🏆 tonight: ' + DA.lb.today[0].name + ' $' + DA.lb.today[0].score.toLocaleString('en-US'));
      }
      var best = load('deadset_best');
      if (best) status.push('your best: $' + parseInt(best, 10).toLocaleString('en-US'));
      if (status.length) {
        ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#9ad7ff';
        ctx.fillText(status.join('   ·   '), DA.W / 2, 292);
      }
      menuSel = drawMenu(ctx, titleMenu, menuSel);
      var hint = DA.input.touchActive() ?
        (window.innerHeight > window.innerWidth ? '📺 rotate your phone for the full show' :
          'in the game: left thumb moves — right thumb aims & fires') :
        (DA.input.gamepadConnected() ?
          '🎮 d-pad + A picks · in the game: left stick moves, right stick fires' :
          '↑↓ + Enter or click · in the game: WASD moves, mouse or arrow keys fire');
      ctx.textAlign = 'center';
      ctx.font = '16px monospace'; ctx.fillStyle = '#8888a0';
      ctx.fillText(hint, DA.W / 2, 700);
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
    if (st.mode === 'playing' && st.countdownT > 0) {   // 3-2-1, centre stage
      var cdDigit = Math.ceil(st.countdownT / 1.0);
      var cdSeg = st.countdownT - (cdDigit - 1) * 1.0;  // 1s per digit
      var cdScale = 1 + (1.0 - cdSeg) * 0.7;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, cdSeg / 0.12);
      ctx.font = 'bold ' + Math.round(110 * cdScale) + 'px monospace';
      ctx.fillStyle = '#d43a4b';
      ctx.fillText(String(cdDigit), DA.W / 2, DA.H / 2 - 60);
      ctx.globalAlpha = 1;
    }
    if (st.mode === 'playing') drawHostCam(ctx);
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
      if (hp.hurtFlashT > 0.24) {                // chromatic-aberration flicker on the hit itself
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14;
        ctx.drawImage(canvas, 4, 0);
        ctx.drawImage(canvas, -4, 1);
        ctx.restore();
      }
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
      ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
      ctx.fillRect(0, 0, DA.W, DA.H);
      ctx.textAlign = 'center';
      ctx.font = 'bold 72px monospace'; ctx.fillStyle = '#e8d44d';
      ctx.fillText('PAUSED', DA.W / 2, 210);
      ctx.font = '22px monospace'; ctx.fillStyle = '#8888a0';
      ctx.fillText("WE'LL BE RIGHT BACK", DA.W / 2, 252);
      if (showSettings) {
        ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#7ee081';
        ctx.fillText('⚙ SETTINGS', DA.W / 2, 296);
        setSel = drawMenu(ctx, settingsMenu, setSel);
      } else {
        pauseSel = drawMenu(ctx, pauseMenu, pauseSel);
        if (st.room.map) drawMap(ctx, st);
      }
      drawScreenFx(ctx);
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
      var sub = isSeasonFinale ? '"Ladies and gentlemen... this concludes our final broadcast." — static — nothing.' :
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
