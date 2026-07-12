(function () {
  var DEAD = 0.2;
  DA.applyDeadzone = function (v) {
    var a = Math.abs(v);
    if (a < DEAD) return 0;
    return Math.sign(v) * (a - DEAD) / (1 - DEAD);
  };
  DA.screenToCanvas = function (sx, sy, winW, winH) {
    var scale = Math.min(winW / DA.W, winH / DA.H);
    var offX = (winW - DA.W * scale) / 2, offY = (winH - DA.H * scale) / 2;
    return { x: (sx - offX) / scale, y: (sy - offY) / scale };
  };

  // Pads SHOULD report right-stick vertical on axis 3 ("standard" mapping), but
  // many controller/browser combos put it on axis 5 or 4. A stick axis is one that
  // has SAT near zero for an unbroken streak (sticks snap back and rest; triggers
  // only pass through zero for a frame) AND has moved both ways. idleStreaks[i] =
  // longest consecutive near-zero run seen. proven === true means the y axis
  // demonstrated real stick behaviour, so callers can lock it in permanently.
  // y === -1 means "no trustworthy vertical axis yet".
  DA.pickAimAxes = function (idleStreaks, min, max) {
    function stickLike(i) { return typeof idleStreaks[i] === 'number' && idleStreaks[i] >= 10; }
    function live(i) { return stickLike(i) && min[i] < -0.25 && max[i] > 0.25; }
    // Browsers disagree about which axes the right stick lives on (Chrome 2/3
    // or 2/5, Firefox often 3/4...). We don't guess: the first two axes beyond
    // the left stick that PROVE they're a stick (idle at zero, move both ways)
    // become horizontal + vertical, in index order.
    var found = [];
    for (var i = 2; i < idleStreaks.length && found.length < 2; i++) {
      if (live(i)) found.push(i);
    }
    if (found.length === 2) return { x: found[0], y: found[1], proven: true };
    // only one axis proven so far (e.g. the stick has only been wiggled
    // vertically): use it as Y right away, keep the default X, don't lock yet
    if (found.length === 1) return { x: 2, y: found[0], proven: false };
    return { x: 2, y: stickLike(3) ? 3 : -1, proven: false };
  };

  var padWatch = null; // per-pad axis history, sampled every poll
  function watchPad(pad) {
    if (!padWatch || padWatch.id !== pad.id) {
      padWatch = { id: pad.id, min: pad.axes.slice(), max: pad.axes.slice(),
                   streak: pad.axes.map(function () { return 0; }),
                   bestStreak: pad.axes.map(function () { return 0; }),
                   lockedX: 2, lockedY: -1 };
    }
    for (var i = 0; i < pad.axes.length; i++) {
      var v = pad.axes[i];
      if (v < padWatch.min[i]) padWatch.min[i] = v;
      if (v > padWatch.max[i]) padWatch.max[i] = v;
      if (Math.abs(v) < 0.15) {
        padWatch.streak[i]++;
        if (padWatch.streak[i] > padWatch.bestStreak[i]) padWatch.bestStreak[i] = padWatch.streak[i];
      } else {
        padWatch.streak[i] = 0;
      }
    }
    return padWatch;
  }

  // Decide (and permanently lock) which axes the right stick lives on.
  function aimAxesFor(watch) {
    var pick = DA.pickAimAxes(watch.bestStreak, watch.min, watch.max);
    if (watch.lockedY < 0 && pick.proven) { watch.lockedX = pick.x; watch.lockedY = pick.y; }
    var locked = watch.lockedY >= 0;
    return { x: locked ? watch.lockedX : pick.x, y: locked ? watch.lockedY : pick.y, locked: locked };
  }

  var keys = {}, mouse = { x: DA.W / 2, y: DA.H / 2, down: false };
  var device = 'keyboard'; // or 'gamepad' or 'touch'

  // ---- touch: floating twin sticks. Left half moves, right half aims+fires. ----
  // Pure helper: a stick's deflection as a -1..1 vector with a deadzone.
  DA.stickVector = function (ox, oy, cx, cy, radius) {
    var dx = (cx - ox) / radius, dy = (cy - oy) / radius;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) { dx /= len; dy /= len; len = 1; }
    if (len < 0.18) return { x: 0, y: 0, active: false };
    return { x: dx, y: dy, active: true };
  };

  var sticks = { move: null, aim: null };   // { id, ox, oy, cx, cy }
  var pauseTapped = false, botTapped = false, synTapped = false, castTapped = false, anyTapped = false;
  function canvasPt(t) { return DA.screenToCanvas(t.clientX, t.clientY, window.innerWidth, window.innerHeight); }

  window.addEventListener('touchstart', function (e) {
    device = 'touch';
    anyTapped = true;                                // "tap anywhere" consumers (unpause)
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var p = canvasPt(t);
      var zone = DA.touchUIBlock && DA.touchUIBlock(p.x, p.y);
      if (zone) {
        if (zone === 'bot') botTapped = true;
        else if (zone === 'syn') synTapped = true;
        else if (zone === 'cast') castTapped = true;
        else pauseTapped = true;
        continue;
      }
      var side = p.x < DA.W / 2 ? 'move' : 'aim';
      if (!sticks[side]) sticks[side] = { id: t.identifier, ox: p.x, oy: p.y, cx: p.x, cy: p.y };
    }
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      for (var side in sticks) {
        if (sticks[side] && sticks[side].id === t.identifier) {
          var p = canvasPt(t);
          sticks[side].cx = p.x; sticks[side].cy = p.y;
        }
      }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var id = e.changedTouches[i].identifier;
      for (var side in sticks) if (sticks[side] && sticks[side].id === id) sticks[side] = null;
    }
  }
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  window.addEventListener('keydown', function (e) {
    keys[e.code] = true; device = 'keyboard';
    if (e.code.indexOf('Arrow') === 0) e.preventDefault(); // arrows fire, never scroll
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('mousemove', function (e) {
    var p = DA.screenToCanvas(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    mouse.x = p.x; mouse.y = p.y; device = 'keyboard';
  });
  window.addEventListener('mousedown', function () { mouse.down = true; device = 'keyboard'; });
  window.addEventListener('mouseup', function () { mouse.down = false; });

  // playerX/playerY: needed to turn mouse position into an aim direction
  DA.input = {
    state: function (playerX, playerY) {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      var pad = null;
      for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
      if (pad) {
        var watch = watchPad(pad);
        var pick = aimAxesFor(watch);
        var gx = DA.applyDeadzone(pad.axes[0]), gy = DA.applyDeadzone(pad.axes[1]);
        var ax = DA.applyDeadzone(pad.axes[pick.x] || 0);
        var ay = pick.y >= 0 ? DA.applyDeadzone(pad.axes[pick.y] || 0) : 0;
        var fireBtn = pad.buttons[7] && pad.buttons[7].pressed;       // right trigger
        if (gx || gy || ax || ay || fireBtn) device = 'gamepad';
        if (device === 'gamepad') {
          var aim = DA.norm(ax, ay);
          return { moveX: gx, moveY: gy, aimX: aim.x, aimY: aim.y,
                   firing: (ax !== 0 || ay !== 0 || fireBtn), device: 'gamepad' };
        }
      }
      if (device === 'touch') {
        var mv = sticks.move ? DA.stickVector(sticks.move.ox, sticks.move.oy, sticks.move.cx, sticks.move.cy, 70) : { x: 0, y: 0 };
        var am = sticks.aim ? DA.stickVector(sticks.aim.ox, sticks.aim.oy, sticks.aim.cx, sticks.aim.cy, 70) : { x: 0, y: 0, active: false };
        var ta = DA.norm(am.x, am.y);
        return { moveX: mv.x, moveY: mv.y, aimX: ta.x, aimY: ta.y,
                 firing: !!am.active, device: 'touch' };
      }
      var mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      var my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
      // arrow keys are a keyboard-only second stick, SNES Smash TV style:
      // holding an arrow (or two, for diagonals) aims AND fires that way
      var kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      var ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
      if (kx || ky) {
        var karrow = DA.norm(kx, ky);
        return { moveX: mx, moveY: my, aimX: karrow.x, aimY: karrow.y,
                 firing: true, device: 'keyboard' };
      }
      var maim = DA.norm(mouse.x - playerX, mouse.y - playerY);
      return { moveX: mx, moveY: my, aimX: maim.x, aimY: maim.y,
               firing: mouse.down, device: 'keyboard' };
    },
    touchActive: function () { return device === 'touch'; },
    touchSticks: function () { return sticks; },
    consumePauseTap: function () { var v = pauseTapped; pauseTapped = false; return v; },
    consumeAnyTap: function () { var v = anyTapped; anyTapped = false; return v; },
    consumeBotTap: function () { var v = botTapped; botTapped = false; return v; },
    consumeCastTap: function () { var v = castTapped; castTapped = false; return v; },
    consumeSynTap: function () { var v = synTapped; synTapped = false; return v; },
    // true while any "start the game" input is held: fire, click, tap, Enter or Space
    startHeld: function () {
      if (keys.Enter || keys.Space) return true;
      if (device === 'touch' && (sticks.move || sticks.aim)) return true;
      return DA.input.state(DA.W / 2, DA.H / 2).firing;
    },
    // is a specific gamepad button held right now? (9 = Start, 3 = Y/Triangle)
    padButton: function (idx) {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var pad = pads[i];
        if (pad && pad.connected && pad.buttons[idx] && pad.buttons[idx].pressed) return true;
      }
      return false;
    },
    gamepadConnected: function () {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) return true;
      return false;
    },
    // raw controller readout for the G debug overlay
    debugInfo: function () {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var pad = pads[i];
        if (!pad || !pad.connected) continue;
        var watch = watchPad(pad);
        var pick = aimAxesFor(watch);
        var pressed = [];
        for (var b = 0; b < pad.buttons.length; b++) if (pad.buttons[b].pressed) pressed.push(b);
        return {
          id: pad.id.slice(0, 40), mapping: pad.mapping || '(none)',
          axes: pad.axes.map(function (v) { return v.toFixed(2); }).join('  '),
          pressed: pressed.join(',') || 'none',
          aimAxes: 'x=axis' + pick.x + '  y=' + (pick.y >= 0 ? 'axis' + pick.y + (pick.locked ? ' (locked)' : ' (unproven)') : 'not found yet — wiggle right stick')
        };
      }
      return null;
    }
  };
})();
