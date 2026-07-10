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
  // many controller/browser combos put it on axis 5 or 4. We watch every axis over
  // time: a stick axis idles near zero and moves both ways; a trigger idles at -1.
  // zeroFrac[i] = fraction of samples where the axis sat near zero.
  // Returns axis indices; y === -1 means "no trustworthy vertical axis yet".
  DA.pickAimAxes = function (zeroFrac, min, max) {
    function stickLike(i) { return typeof zeroFrac[i] === 'number' && zeroFrac[i] > 0.3; }
    function live(i) { return stickLike(i) && min[i] < -0.25 && max[i] > 0.25; }
    var candidates = [3, 5, 4], y = -1;
    for (var c = 0; c < candidates.length; c++) {
      if (live(candidates[c])) { y = candidates[c]; break; }
    }
    if (y === -1 && stickLike(3)) y = 3; // nothing proven yet: trust the spec default
    return { x: 2, y: y };
  };

  var padWatch = null; // per-pad axis history, sampled every poll
  function watchPad(pad) {
    if (!padWatch || padWatch.id !== pad.id) {
      padWatch = { id: pad.id, min: pad.axes.slice(), max: pad.axes.slice(),
                   nearZero: pad.axes.map(function () { return 0; }), samples: 0 };
    }
    padWatch.samples++;
    for (var i = 0; i < pad.axes.length; i++) {
      if (pad.axes[i] < padWatch.min[i]) padWatch.min[i] = pad.axes[i];
      if (pad.axes[i] > padWatch.max[i]) padWatch.max[i] = pad.axes[i];
      if (Math.abs(pad.axes[i]) < 0.15) padWatch.nearZero[i]++;
    }
    padWatch.zeroFrac = padWatch.nearZero.map(function (n) { return n / padWatch.samples; });
    return padWatch;
  }

  var keys = {}, mouse = { x: DA.W / 2, y: DA.H / 2, down: false };
  var device = 'keyboard'; // or 'gamepad'

  window.addEventListener('keydown', function (e) { keys[e.code] = true; device = 'keyboard'; });
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
        var pick = DA.pickAimAxes(watch.zeroFrac, watch.min, watch.max);
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
      var mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      var my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
      var maim = DA.norm(mouse.x - playerX, mouse.y - playerY);
      return { moveX: mx, moveY: my, aimX: maim.x, aimY: maim.y,
               firing: mouse.down, device: 'keyboard' };
    },
    // true while any "start the game" input is held: fire, click, Enter or Space
    startHeld: function () {
      if (keys.Enter || keys.Space) return true;
      return DA.input.state(DA.W / 2, DA.H / 2).firing;
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
        var pick = DA.pickAimAxes(watch.zeroFrac, watch.min, watch.max);
        var pressed = [];
        for (var b = 0; b < pad.buttons.length; b++) if (pad.buttons[b].pressed) pressed.push(b);
        return {
          id: pad.id.slice(0, 40), mapping: pad.mapping || '(none)',
          axes: pad.axes.map(function (v) { return v.toFixed(2); }).join('  '),
          pressed: pressed.join(',') || 'none',
          aimAxes: 'x=axis' + pick.x + '  y=' + (pick.y >= 0 ? 'axis' + pick.y : 'not found yet — wiggle right stick')
        };
      }
      return null;
    }
  };
})();
