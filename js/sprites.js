(function () {
  // The sprite bakery. Still zero image assets: every zombie is drawn by code —
  // but ONCE, at load, into per-type walk-cycle sheets at 3x resolution, instead
  // of ~15 canvas ops per zombie per frame. That budget buys sprite-level
  // detail (shading, torn clothes, wounds, two-segment arms, stepping feet)
  // that would be too expensive to redraw live for 300 bodies.
  //
  // Sheets are baked facing +x and rotated at draw time. Dynamic touches
  // (elite ring, fuse strobe, jaw bulge, stalker wisps, fade alphas) stay live
  // in js/enemies.js on top of the stamped frame.
  var SCALE = 3, FRAMES = 6;
  var SHEETS = {};      // type -> { frames: [canvas], flash: [canvas], anchor, size }

  // per-type look: base body color, darker skin/limb tone, cloth-scrap color
  var LOOK = {
    shambler: { body: '#6fae5c', skin: '#54903f', cloth: '#3e5a38', r: 12 },
    sprinter: { body: '#c95d63', skin: '#a8434c', cloth: '#6e3038', r: 12 },
    swarmer:  { body: '#5bc8d6', skin: '#3f97a5', cloth: '#2e6570', r: 9 },
    brute:    { body: '#9b6bb3', skin: '#6e4585', cloth: '#4a2e5c', r: 20 },
    boomer:   { body: '#e8843c', skin: '#b5601f', cloth: '#7a4318', r: 14 },
    stalker:  { body: '#6c5b9e', skin: '#584a80', cloth: '#3a3060', r: 11 },
    spitter:  { body: '#a8b83c', skin: '#87962c', cloth: '#5c661e', r: 13 },
    gusher:   { body: '#79a832', skin: '#5e8226', cloth: '#42591a', r: 16 }
  };

  // deterministic per-type decoration rng so every shambler shares its scars
  function decoRng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function shade(hex, f) {   // darken (f<1) or lighten (f>1) a #rrggbb
    var n = parseInt(hex.slice(1), 16);
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')';
  }

  function bakeFrame(type, phase, white) {
    var L = LOOK[type], r = L.r;
    var margin = r * 2.2;                       // room for arms + feet
    var size = Math.ceil((r + margin) * 2 * SCALE);
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    g.scale(SCALE, SCALE);
    var swing = Math.sin((phase / FRAMES) * 6.283);       // walk cycle
    var bob = 1 + swing * 0.05;
    var rng = decoRng(DA.hashSeed ? DA.hashSeed(type) : type.length * 977);

    var skin = white ? '#ffffff' : L.skin;
    var body = white ? '#ffffff' : L.body;

    // FEET: alternating steps poking out under the body, along +x
    g.fillStyle = white ? '#ffffff' : shade(L.skin, 0.7);
    for (var fs = -1; fs <= 1; fs += 2) {
      g.beginPath();
      g.ellipse(r * 0.2 + swing * fs * r * 0.28, fs * r * 0.5,
                r * 0.3, r * 0.2, 0, 0, 7);
      g.fill();
    }

    // ARMS: two segments — upper arm + forearm reaching forward, opposite sway
    var back = type === 'sprinter';
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var shX = Math.cos(s2 * 1.5) * r * 0.75, shY = Math.sin(s2 * 1.5) * r * 0.75;
      var armA = back ? Math.PI + s2 * 0.5 - swing * 0.3 * s2
                      : s2 * 0.32 + swing * 0.3 * s2;
      var elX = shX + Math.cos(armA) * r * 0.85, elY = shY + Math.sin(armA) * r * 0.85;
      var foreA = armA + (back ? -s2 * 0.35 : s2 * 0.2) - swing * 0.15 * s2;
      var haX = elX + Math.cos(foreA) * r * 0.8, haY = elY + Math.sin(foreA) * r * 0.8;
      g.strokeStyle = skin;
      g.lineCap = 'round';
      g.lineWidth = Math.max(2.6, r * 0.34);
      g.beginPath(); g.moveTo(shX, shY); g.lineTo(elX, elY); g.stroke();
      g.lineWidth = Math.max(2.2, r * 0.27);
      g.beginPath(); g.moveTo(elX, elY); g.lineTo(haX, haY); g.stroke();
      g.fillStyle = white ? '#ffffff' : shade(L.skin, 1.18);   // grasping hand
      g.beginPath(); g.arc(haX, haY, r * 0.2, 0, 7); g.fill();
    }
    if (type === 'brute') {                     // shoulder slabs
      g.fillStyle = skin;
      for (var bs = -1; bs <= 1; bs += 2) {
        g.beginPath();
        g.arc(Math.cos(bs * 1.35) * r * 0.85, Math.sin(bs * 1.35) * r * 0.85, r * 0.42, 0, 7);
        g.fill();
      }
    }

    // BODY: two-tone shaded disc (lit from the upper-left key light)
    var grad = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r * bob * 1.15);
    grad.addColorStop(0, white ? '#ffffff' : shade(L.body, 1.22));
    grad.addColorStop(0.7, body);
    grad.addColorStop(1, white ? '#f0f0f0' : shade(L.body, 0.72));
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, r * bob, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 1.6;
    g.stroke();

    if (!white) {
      // TORN CLOTHES: jagged cloth scraps clinging to the torso
      g.fillStyle = L.cloth;
      for (var t2 = 0; t2 < 3; t2++) {
        var ca = rng() * 6.283, cd = r * (0.15 + rng() * 0.45);
        var cx = Math.cos(ca) * cd, cyy = Math.sin(ca) * cd;
        g.beginPath();
        g.moveTo(cx, cyy);
        for (var v = 0; v < 5; v++) {
          var va = (v / 5) * 6.283;
          var vr = r * (0.2 + rng() * 0.24);
          g.lineTo(cx + Math.cos(va) * vr, cyy + Math.sin(va) * vr * 0.7);
        }
        g.closePath(); g.fill();
      }
      // WOUNDS: dried gashes
      g.fillStyle = 'rgba(96, 16, 24, 0.85)';
      for (var w2 = 0; w2 < 2; w2++) {
        var wa = rng() * 6.283, wd = r * (0.3 + rng() * 0.4);
        g.beginPath();
        g.ellipse(Math.cos(wa) * wd, Math.sin(wa) * wd, r * 0.16, r * 0.07, rng() * 3, 0, 7);
        g.fill();
      }
    }

    if (type === 'boomer') {                    // bloated belly (strobe overlaid live)
      g.fillStyle = white ? '#ffffff' : '#f0a75e';
      g.beginPath(); g.arc(-r * 0.12, r * 0.16, r * 0.55, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.stroke();
    }

    // HEAD: shaded skull leaning into the walk, dead eyes, per-type jaw
    var hr = type === 'brute' ? r * 0.4 : r * 0.55;
    var hx = r * 0.5, hy = swing * r * 0.06;    // tiny head-sway with the gait
    var hgrad = g.createRadialGradient(hx - hr * 0.4, hy - hr * 0.4, hr * 0.1, hx, hy, hr * 1.1);
    hgrad.addColorStop(0, white ? '#ffffff' : shade(L.skin, 1.25));
    hgrad.addColorStop(1, white ? '#f0f0f0' : shade(L.skin, 0.8));
    g.fillStyle = hgrad;
    g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2; g.stroke();
    if (!white) {                               // matted hair tufts on the scalp
      g.fillStyle = shade(L.cloth, 0.8);
      g.beginPath(); g.arc(hx - hr * 0.45, hy, hr * 0.62, 1.9, 4.6); g.lineTo(hx - hr * 0.2, hy); g.closePath(); g.fill();
    }
    g.fillStyle = '#12120e';
    var eye = Math.max(1.6, hr * 0.3);
    g.fillRect(hx + hr * 0.32 - eye / 2, hy - hr * 0.48 - eye / 2, eye, eye);
    g.fillRect(hx + hr * 0.32 - eye / 2, hy + hr * 0.48 - eye / 2, eye, eye);
    if (type === 'spitter' || type === 'gusher') {   // resting jaw (bulge overlaid live)
      g.fillStyle = white ? '#e8e8e8' : '#2a2e18';
      g.beginPath(); g.arc(hx + hr * 0.6, hy, hr * 0.35, 0, 7); g.fill();
    }
    return c;
  }

  DA.bakeSprites = function () {
    for (var type in LOOK) {
      var frames = [], flash = [];
      for (var f = 0; f < FRAMES; f++) {
        frames.push(bakeFrame(type, f, false));
        flash.push(bakeFrame(type, f, true));
      }
      SHEETS[type] = { frames: frames, flash: flash, baseR: LOOK[type].r,
                       world: frames[0].width / SCALE };
    }
  };
  DA.SPRITE_FRAMES = FRAMES;
  DA.sprite = function (type) { return SHEETS[type]; };
})();
