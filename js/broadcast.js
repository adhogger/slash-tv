(function () {
  // The "broadcast package": dynamic set lighting, a live studio audience,
  // camera flashes, an on-air bug, and signal interference on big moments.
  // Purely cosmetic — sits on top of the sim, never touches it. V toggles.
  var B = DA.broadcast = { on: true, t: 0, glitch: 0, applause: 0, flashes: [],
                           lastCombo: 1, prevInv: 0, microT: 5 };
  try { B.on = localStorage.getItem('deadset_bfx') !== '0'; } catch (e) {}

  // one soft radial blob, pre-rendered; every light is this sprite scaled
  var LIGHT = (function () {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(128, 128, 24, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    return c;
  })();
  var lightCanvas = document.createElement('canvas');
  lightCanvas.width = DA.W; lightCanvas.height = DA.H;
  var lctx = lightCanvas.getContext('2d');
  function punch(x, y, r, a) {           // erase a hole in the darkness
    lctx.globalAlpha = a;
    lctx.drawImage(LIGHT, x - r, y - r, r * 2, r * 2);
  }
  function tint(ctx, x, y, r, style) {   // warm additive touch over the hole
    ctx.fillStyle = style;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  // how dark each set runs — the boss stage is the moodiest
  var MOOD = { bossfloor: 0.22, servers: 0.18, monitors: 0.16,
               mirrors: 0.12, stage: 0.12, lounge: 0.14 };

  // world-space pass: darkness + lights, drawn inside the shake transform
  B.drawWorldFx = function (ctx, st) {
    if (!B.on || !st.player) return;
    var p = st.player, i, e, d, dir;
    var dark = MOOD[st.room && st.room.decor];
    if (dark == null) dark = 0.12;
    lctx.globalCompositeOperation = 'source-over';
    lctx.globalAlpha = 1;
    lctx.clearRect(0, 0, DA.W, DA.H);
    lctx.fillStyle = 'rgba(4, 4, 14, ' + dark + ')';
    lctx.fillRect(0, 0, DA.W, DA.H);
    lctx.globalCompositeOperation = 'destination-out';
    var ps = st.players || [p];
    for (var pk = 0; pk < ps.length; pk++) {           // each contestant's key light
      var pp = ps[pk];
      punch(pp.x, pp.y, pp.downed ? 150 : 250, 0.95);
      var gg = DA.GUNS && (DA.GUNS[pp.gun] || DA.GUNS.pistol);
      if (gg && pp.firing && pp.fireCooldown > gg.rate - 0.06) {
        punch(pp.x + pp.aimX * 22, pp.y + pp.aimY * 22, 340, 0.8);   // gunfire lights the set
      }
    }
    for (i = 0; i < st.enemies.length; i++) {
      e = st.enemies[i];
      if (e.isBoss) punch(e.x, e.y, 300, 0.85);        // the star gets a spotlight
      else if (e.fuse != null) punch(e.x, e.y, 120 + Math.sin(B.t * 18) * 18, 0.85);
    }
    if (st.roomCleared && st.room) {
      for (dir in st.room.exits) {                     // cleared exits glow
        d = DA.doorByDir(dir);
        if (d) punch(d.x, d.y, 150, 0.8);
      }
    }
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.drawImage(lightCanvas, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (pk = 0; pk < ps.length; pk++) {
      var pm = ps[pk];
      var gm = DA.GUNS && (DA.GUNS[pm.gun] || DA.GUNS.pistol);
      if (gm && pm.firing && pm.fireCooldown > gm.rate - 0.06) {
        tint(ctx, pm.x + pm.aimX * 26, pm.y + pm.aimY * 26, 90, 'rgba(255, 214, 120, 0.14)');
      }
    }
    for (i = 0; i < st.enemies.length; i++) {
      e = st.enemies[i];
      if (!e.isBoss && e.fuse != null) tint(ctx, e.x, e.y, 70, 'rgba(232, 132, 60, 0.22)');
    }
    if (st.roomCleared && st.room) {
      for (dir in st.room.exits) {
        d = DA.doorByDir(dir);
        if (d) tint(ctx, d.x, d.y, 70, 'rgba(126, 224, 129, 0.13)');
      }
    }
    ctx.restore();
  };

  // the audience is seated once, in the gallery strips beyond the walls,
  // clear of the four doors and the on-air bug
  var crowd = [];
  (function seatTheAudience() {
    var x, y;
    for (x = 205; x < 1235; x += 26) {
      if (x > 575 && x < 705) continue;                // the south door
      crowd.push({ x: x + DA.rand(-5, 5), y: 703 + DA.rand(-4, 4),
                   r: DA.rand(8, 13), ph: DA.rand(0, 6.28), sp: DA.rand(1.6, 2.6) });
    }
    for (y = 58; y < 665; y += 30) {
      if (y > 295 && y < 425) continue;                // the side doors
      crowd.push({ x: 20 + DA.rand(-3, 3), y: y, r: DA.rand(7, 11),
                   ph: DA.rand(0, 6.28), sp: DA.rand(1.6, 2.6) });
      crowd.push({ x: DA.W - 20 + DA.rand(-3, 3), y: y, r: DA.rand(7, 11),
                   ph: DA.rand(0, 6.28), sp: DA.rand(1.6, 2.6) });
    }
  })();
  function popFlash() {                                // a camera goes off in the crowd
    if (crowd.length === 0 || B.flashes.length > 18) return;
    var m = crowd[Math.floor(Math.random() * crowd.length)];
    B.flashes.push({ x: m.x + DA.rand(-6, 6), y: m.y - m.r - DA.rand(2, 8),
                     t: 0.22, max: 0.22 });
  }

  // screen-space pass: audience, flashes, APPLAUSE sign, on-air bug.
  // Drawn under the vignette + scanlines so it all sits "in the broadcast".
  B.drawFrame = function (ctx, st) {
    if (!B.on || !st.player) return;
    // taking a hit jolts the signal (rising invulnerability edge)
    if (st.player.invuln > B.prevInv + 0.2) B.glitch = Math.max(B.glitch, 0.2);
    B.prevInv = st.player.invuln;
    ctx.save();
    var dying = st.mode === 'dying';
    var cheer = B.applause > 0 && !dying;           // nobody cheers a death
    ctx.fillStyle = 'rgba(14, 14, 22, 0.96)';
    for (var i = 0; i < crowd.length; i++) {
      var m = crowd[i];
      var bob = Math.sin(B.t * m.sp * (cheer ? 2.2 : 1) + m.ph) * (cheer ? 3 : (dying ? 0.35 : 1.3));
      ctx.beginPath(); ctx.arc(m.x, m.y + bob, m.r, 0, 7); ctx.fill();
      if (cheer && i % 3 === 0) {                      // arms up for the multiplier
        ctx.beginPath(); ctx.arc(m.x - m.r * 0.8, m.y + bob - m.r - 3, 3.5, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(m.x + m.r * 0.8, m.y + bob - m.r - 4, 3.5, 0, 7); ctx.fill();
      }
    }
    for (i = 0; i < B.flashes.length; i++) {           // camera flashes
      var f = B.flashes[i], k = f.t / f.max;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.9 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(220, 235, 255, ' + (0.28 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 13 * (2 - k), 0, 7); ctx.fill();
    }
    if (Math.sin(B.t * 4) > -0.2) {                    // the on-air bug
      ctx.fillStyle = '#d43a4b';
      ctx.beginPath(); ctx.arc(24, 700, 5, 0, 7); ctx.fill();
    }
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9c9d4';
    var s = Math.floor(B.t % 60), mnt = Math.floor(B.t / 60) % 60;
    ctx.fillText('LIVE ' + (mnt < 10 ? '0' : '') + mnt + ':' + (s < 10 ? '0' : '') + s, 36, 706);
    ctx.restore();
  };

  // interference: horizontal slices of the finished frame shoved sideways
  B.drawGlitch = function (ctx) {
    if (!B.on || B.glitch <= 0) return;
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var y = Math.floor(Math.random() * (DA.H - 24));
      var h = 4 + Math.floor(Math.random() * 14);
      var dx = Math.floor(DA.rand(-1, 1) * (8 + B.glitch * 90));
      ctx.drawImage(ctx.canvas, 0, y, DA.W, h, dx, y, DA.W, h);
    }
    ctx.fillStyle = 'rgba(91, 200, 214, 0.05)';        // a breath of chroma error
    ctx.fillRect(0, Math.random() * DA.H, DA.W, 3);
  };

  // hooks: ride the existing fx tick and kill pipeline, no sim changes
  var baseFx = DA.updateFx;
  DA.updateFx = function (dt) {
    baseFx(dt);
    B.t += dt;
    if (B.glitch > 0) B.glitch -= dt;
    if (B.applause > 0) B.applause -= dt;
    B.microT -= dt;                                    // ambient signal wobble
    if (B.microT <= 0) {
      B.microT = DA.rand(4, 9);
      if (B.on) B.glitch = Math.max(B.glitch, 0.05);
    }
    for (var i = B.flashes.length - 1; i >= 0; i--) {
      B.flashes[i].t -= dt;
      if (B.flashes[i].t <= 0) B.flashes.splice(i, 1);
    }
  };
  var baseKill = DA.onKill;
  DA.onKill = function (st, e, b) {
    baseKill(st, e, b);
    if (!B.on) return;
    if (Math.random() < Math.min(0.2 + st.combo * 0.09, 0.85)) popFlash();
    if (st.combo > B.lastCombo) B.applause = 1.4;      // the sign lights on a step up
    B.lastCombo = st.combo;
    if (e.isBoss || e.r >= 20) B.glitch = Math.max(B.glitch, 0.16); // big deaths jolt the signal
  };
})();
