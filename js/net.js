(function () {
  // Online co-op, v0 (JSON protocol; binary quantisation is Phase 3).
  // Host runs the whole simulation and streams snapshots at 20Hz; the guest
  // sends its input state at 30Hz, renders the host's world ~100ms in the
  // past with interpolation, and predicts only its own contestant locally.
  // The guest's input is the SAME shape CAM-BOT emits — when a guest joins,
  // players[1] simply swaps input source; when they drop, CAM-BOT steps back in.

  var SNAP_EVERY = 3;                 // host ticks at 60Hz; snapshot every 3rd
  var TYPES = ['shambler', 'sprinter', 'swarmer', 'brute', 'boomer', 'stalker',
               'producer', 'executive'];
  var N = DA.net = { status: 'off', code: null, guestActive: false, ping: 0,
                     remoteJoined: false };
  var ws = null, tick = 0, lastInput = null, lastInputAt = 0;
  var snaps = [], ghost = null, inputTimer = null, pingTimer = null, pingSent = 0;

  function relayUrl() {
    try {
      var q = location.search.match(/[?&]relay=([^&]+)/);
      if (q) return decodeURIComponent(q[1]);
    } catch (e) {}
    try { var s = localStorage.getItem('deadset_relay'); if (s) return s; } catch (e2) {}
    return (typeof window !== 'undefined' && window.SLASHTV_RELAY) || null;
  }
  function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

  // ---------------- host ----------------
  N.host = function () {
    var url = relayUrl();
    if (!url) { N.status = 'error'; DA.announce('NO RELAY SET: SEE server/README'); return; }
    ws = new WebSocket(url + (url.indexOf('?') < 0 ? '?' : '&') + 'host=1');
    N.status = 'hosting';
    ws.onmessage = function (ev) { hostMsg(JSON.parse(ev.data)); };
    ws.onerror = function () { N.status = 'error'; };
    ws.onclose = function () { N.status = 'off'; N.code = null; dropRemote(); };
    if (!pingTimer) pingTimer = setInterval(function () {
      pingSent = performance.now(); send({ t: 'p' });
    }, 2000);
  };
  function hostMsg(m) {
    if (m.t === 'room') { N.code = m.code; }
    else if (m.t === 'joined') {
      N.remoteJoined = true;
      DA.announce('CONTESTANT 2 IS IN THE BUILDING');
      var st = DA.state;
      if (st && st.mode === 'title') return;          // they'll be cast at next newGame
      if (st && st.players) attachRemote(st);
      sendStart(st);
    }
    else if (m.t === 'peer_left') { dropRemote(); DA.announce('CONTESTANT 2 LOST THE FEED'); }
    else if (m.t === 'i') { lastInput = m; lastInputAt = performance.now(); }
    else if (m.t === 'p') { send({ t: 'q' }); }
    else if (m.t === 'q') { N.ping = Math.round(performance.now() - pingSent); }
  }
  function attachRemote(st) {
    var p2 = st.players[1];
    if (!p2) { p2 = DA.makePlayer(); p2.x += 40; st.players.push(p2); }
    p2.bot = false; p2.remote = true; p2.botMem = null;
    if (st.mode === 'playing') { p2.downed = false; p2.hearts = Math.max(p2.hearts, 2); }
  }
  function dropRemote() {
    N.remoteJoined = false; lastInput = null;
    var st = DA.state;
    if (st && st.players && st.players[1] && st.players[1].remote) {
      st.players[1].remote = false;
      st.players[1].bot = true;                       // CAM-BOT retakes the seat
      DA.announce('CAM-BOT COVERS THE SHIFT');
    }
  }
  function sendStart(st) {
    if (!st || !N.remoteJoined) return;
    send({ t: 'start', roomId: st.roomId, seed: (st.room && st.room.seed) || null,
           ep: (st.room && st.room.ep) || 1 });
  }
  N.freshGuestInput = function () {
    if (!lastInput || performance.now() - lastInputAt > 400) return null;
    return { moveX: lastInput.mx, moveY: lastInput.my,
             aimX: lastInput.ax, aimY: lastInput.ay, firing: !!lastInput.f };
  };
  N.onHostNewGame = function (st, startRoom) {
    if (N.status !== 'hosting') return;
    if (N.remoteJoined) attachRemote(st);
    sendStart(st);
  };
  N.onEnterRoom = function (roomId, entryDir) {
    if (N.status === 'hosting' && N.remoteJoined) {
      send({ t: 'e', k: 'room', roomId: roomId, dir: entryDir || null });
    }
  };
  N.hostTick = function (st) {
    if (N.status !== 'hosting' || !N.remoteJoined) return;
    if (++tick % SNAP_EVERY !== 0) return;
    send({ t: 's',
      mode: st.mode, roomId: st.roomId, cleared: st.roomCleared ? 1 : 0,
      score: st.score, combo: st.combo, ck: st.comboKills || 0,
      wave: st.waveManager ? st.waveManager.wave : 0,
      ps: st.players.map(function (p) {
        return [Math.round(p.x), Math.round(p.y),
                +p.aimX.toFixed(2), +p.aimY.toFixed(2),
                p.hearts, p.gun, p.downed ? 1 : 0, p.firing ? 1 : 0, p.dead ? 1 : 0];
      }),
      es: st.enemies.map(function (e) {
        return [e.id, TYPES.indexOf(e.type), Math.round(e.x), Math.round(e.y),
                e.fuse != null ? 1 : 0];
      }),
      eb: st.enemyBullets.map(function (b) {
        return [b.id, Math.round(b.x), Math.round(b.y), +b.dx.toFixed(2), +b.dy.toFixed(2)];
      }),
      pu: st.powerups.map(function (u) {
        return [u.id, u.type, Math.round(u.x), Math.round(u.y)];
      })
    });
  };
  // kill + announcer events ride the existing hooks
  var baseKill = DA.onKill;
  DA.onKill = function (st, e, b) {
    baseKill(st, e, b);
    if (N.status === 'hosting' && N.remoteJoined) {
      send({ t: 'e', k: 'kill', id: e.id, x: Math.round(e.x), y: Math.round(e.y),
             ty: TYPES.indexOf(e.type), c: e.color,
             bd: b ? [+b.dx.toFixed(2), +b.dy.toFixed(2)] : null });
    }
  };
  var baseAnn = DA.announce;
  DA.announce = function (text) {
    baseAnn(text);
    if (N.status === 'hosting' && N.remoteJoined) send({ t: 'e', k: 'ann', x: text });
  };

  // ---------------- guest ----------------
  var retries = 0;
  N.join = function (code) {
    var url = relayUrl();
    if (!url) { N.status = 'error'; baseAnn('NO RELAY SET: SEE server/README'); return; }
    N.joinCode = code;
    ws = new WebSocket(url + (url.indexOf('?') < 0 ? '?' : '&') + 'join=' + code);
    N.status = 'joining';
    ws.onmessage = function (ev) { retries = 0; guestMsg(JSON.parse(ev.data)); };
    ws.onerror = function () { N.status = 'error'; };
    ws.onclose = function () {
      var wasLive = N.guestActive;
      N.guestActive = false;
      if (inputTimer) { clearInterval(inputTimer); inputTimer = null; }
      // reconnect grace: if we were mid-show, chase the same room code —
      // CAM-BOT covers our seat on the host until we're back
      if (wasLive && retries < 5) {
        retries++;
        N.status = 'reconnecting';
        baseAnn('SIGNAL DROPPED — RE-ESTABLISHING (' + retries + '/5)');
        setTimeout(function () { N.join(N.joinCode); }, 2500);
      } else {
        N.status = 'off';
        baseAnn('FEED LOST: THANKS FOR WATCHING');
      }
    };
  };
  function guestMsg(m) {
    if (m.t === 'joined') { N.status = 'connected'; baseAnn('ON AIR SOON: WAITING FOR THE HOST'); }
    else if (m.t === 'err') { N.status = 'error'; baseAnn('NO SUCH ROOM'); }
    else if (m.t === 'start') { guestStart(m); }
    else if (m.t === 's') {
      snaps.push({ at: performance.now(), d: m });
      if (snaps.length > 4) snaps.shift();
      if (ghost) applyAuthoritative(m);
    }
    else if (m.t === 'e') { guestEvent(m); }
    else if (m.t === 'p') { send({ t: 'q' }); }
    else if (m.t === 'q') { N.ping = Math.round(performance.now() - pingSent); }
  }
  function guestStart(m) {
    if (m.seed) DA.generateEpisode(m.seed);           // build the identical studio
    var me = DA.makePlayer();
    ghost = { mode: 'playing', player: DA.makePlayer(), score: 0, combo: 1, comboKills: 0,
              comboTimer: 0, kills: 0, roomsCleared: 0, groanT: 999, visited: {},
              stats: { shots: 0, hits: 0, killsByGun: {}, start: performance.now() },
              enemies: [], bullets: [], enemyBullets: [], powerups: [], entMap: {} };
    ghost.players = [ghost.player, me];
    ghost.players[0].remote = true;                   // the host, on my screen
    ghost.roomId = m.roomId;
    ghost.room = DA.ROOMS[m.roomId];
    ghost.visited[m.roomId] = true;
    ghost.waveManager = { wave: 0, room: ghost.room, done: false };
    ghost.roomCleared = false;
    DA.state = ghost;
    N.guestActive = true;
    if (!inputTimer) inputTimer = setInterval(function () {
      var me2 = ghost.players[1];
      var s = DA.input.state(me2.x, me2.y);
      send({ t: 'i', mx: +s.moveX.toFixed(2), my: +s.moveY.toFixed(2),
             ax: +s.aimX.toFixed(2), ay: +s.aimY.toFixed(2), f: s.firing ? 1 : 0 });
    }, 33);
    if (!pingTimer) pingTimer = setInterval(function () {
      pingSent = performance.now(); send({ t: 'p' });
    }, 2000);
  }
  function guestEvent(m) {
    if (!ghost) return;
    if (m.k === 'kill') {
      var e = ghost.entMap[m.id];
      if (e) {
        var ix = ghost.enemies.indexOf(e);
        if (ix >= 0) ghost.enemies.splice(ix, 1);
        delete ghost.entMap[m.id];
      }
      ghost.kills++;
      var color = m.c || '#6fae5c';
      DA.burst(m.x, m.y, color, 12, m.bd && m.bd[0], m.bd && m.bd[1]);
      DA.splat(m.x, m.y);
      DA.corpse(m.x, m.y, 12, color);
      DA.addShake(3);
      if (DA.audio) DA.audio.splat();
    } else if (m.k === 'room') {
      ghost.roomId = m.roomId;
      ghost.room = DA.ROOMS[m.roomId];
      ghost.visited[m.roomId] = true;
      ghost.enemies.length = 0; ghost.enemyBullets.length = 0;
      ghost.powerups.length = 0; ghost.bullets.length = 0;
      ghost.entMap = {};
      ghost.roomCleared = false;
      DA.clearStains(); DA.fx.corpses.length = 0;
      if (m.dir) {
        var d = DA.doorByDir(m.dir);
        ghost.players.forEach(function (p, i) {
          p.x = DA.clamp(d.x + (i ? 26 : -26), DA.ARENA.x0 + 80, DA.ARENA.x1 - 80);
          p.y = DA.clamp(d.y, DA.ARENA.y0 + 80, DA.ARENA.y1 - 80);
          p.vx = 0; p.vy = 0;
        });
      }
    } else if (m.k === 'ann') {
      baseAnn(m.x);
    }
  }
  function applyAuthoritative(m) {
    // players: host is snapped-with-lerp; my own is corrected gently
    for (var i = 0; i < m.ps.length && i < ghost.players.length; i++) {
      var s = m.ps[i], p = ghost.players[i];
      p.hearts = s[4]; p.gun = s[5]; p.downed = !!s[6]; p.dead = !!s[8];
      if (i === 1) {                                  // me: prediction correction
        var ex = s[0] - p.x, ey = s[1] - p.y;
        if (ex * ex + ey * ey > 60 * 60) { p.x = s[0]; p.y = s[1]; }
        else { p.x += ex * 0.12; p.y += ey * 0.12; }
      } else {
        p.tx = s[0]; p.ty = s[1];                     // interpolation target
        if (p.x === undefined || Math.abs(p.tx - p.x) > 220) { p.x = p.tx; p.y = p.ty; }
        p.aimX = s[2]; p.aimY = s[3]; p.firing = !!s[7];
      }
    }
    // enemies: reconcile by id
    var seen = {};
    for (i = 0; i < m.es.length; i++) {
      var row = m.es[i], id = row[0];
      seen[id] = true;
      var e = ghost.entMap[id];
      if (!e) {
        e = DA.makeEnemy(TYPES[row[1]] === 'producer' || TYPES[row[1]] === 'executive' ?
                         'brute' : TYPES[row[1]], row[2], row[3]);
        if (TYPES[row[1]] === 'producer' || TYPES[row[1]] === 'executive') {
          e = TYPES[row[1]] === 'executive' ? DA.makeExecutive() : DA.makeBoss();
        }
        e.id = id;
        ghost.entMap[id] = e;
        ghost.enemies.push(e);
        e.x = row[2]; e.y = row[3];
      }
      e.px = e.x; e.py = e.y;                         // previous shown position
      e.tx = row[2]; e.ty = row[3];                   // fresh target
      e.fuse = row[4] ? 0.4 : null;
      e.lerpT = 0;
    }
    for (var id2 in ghost.entMap) {                   // vanished without a kill event
      if (!seen[id2]) {
        var gone = ghost.entMap[id2];
        var gx = ghost.enemies.indexOf(gone);
        if (gx >= 0) ghost.enemies.splice(gx, 1);
        delete ghost.entMap[id2];
      }
    }
    // enemy bullets + powerups: light-touch mirrors
    ghost.enemyBullets = m.eb.map(function (b) {
      return { id: b[0], x: b[1], y: b[2], dx: b[3], dy: b[4], r: 6 };
    });
    ghost.powerups = m.pu.map(function (u) {
      return { id: u[0], type: u[1], t: 5, x: u[2], y: u[3] };
    });
    ghost.score = m.score; ghost.combo = m.combo; ghost.comboKills = m.ck;
    ghost.roomCleared = !!m.cleared;
    ghost.waveManager.wave = m.wave;
    if (m.mode !== ghost.mode) {
      ghost.mode = m.mode;
      if (m.mode === 'dying') { ghost.deathT = DA.DEATH_T; ghost.dead = true; }
    }
  }
  var SNAP_DT = SNAP_EVERY / 60;
  N.guestFrame = function (dt) {
    if (!ghost) return;
    var me = ghost.players[1], host = ghost.players[0];
    if (ghost.mode === 'playing') {
      var inp = DA.input.state(me.x, me.y);
      DA.updatePlayer(me, inp, dt, ghost.enemies.length > 0);   // predict myself
      if (!me.downed && !me.dead) DA.tryPlayerFire(me, ghost.bullets);
      if (host.tx !== undefined) {                    // ease the host toward target
        host.x += (host.tx - host.x) * Math.min(1, dt / SNAP_DT);
        host.y += (host.ty - host.y) * Math.min(1, dt / SNAP_DT);
      }
      if (!host.dead && !host.downed) DA.tryPlayerFire(host, ghost.bullets);   // cosmetic
      DA.updateBullets(ghost.bullets, dt);
      for (var i = 0; i < ghost.enemies.length; i++) {          // interpolate the horde
        var e = ghost.enemies[i];
        if (e.tx === undefined) continue;
        e.lerpT = Math.min(1, (e.lerpT || 0) + dt / SNAP_DT);
        e.x = e.px + (e.tx - e.px) * e.lerpT;
        e.y = e.py + (e.ty - e.py) * e.lerpT;
        e.wobble += dt * 5;
      }
      for (i = 0; i < ghost.enemyBullets.length; i++) {
        var b = ghost.enemyBullets[i];
        b.x += b.dx * 200 * dt; b.y += b.dy * 200 * dt;
      }
    } else if (ghost.mode === 'dying' && ghost.deathT > 0) {
      ghost.deathT -= dt;
    }
    DA.updateFx(dt);
  };

  // a guest link boots straight into the room
  try {
    if (typeof location !== 'undefined') {
      var jm = location.search.match(/[?&]join=([A-Za-z0-9]+)/);
      if (jm) setTimeout(function () { N.join(jm[1].toUpperCase()); }, 50);
    }
  } catch (e3) {}
})();
