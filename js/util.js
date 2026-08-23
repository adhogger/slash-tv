var DA = {
  W: 1280, H: 720,
  clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  dist2: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  // circle-vs-circle hit test
  circleHit: function (ax, ay, ar, bx, by, br) {
    var r = ar + br; return DA.dist2(ax, ay, bx, by) <= r * r;
  },
  // normalize a vector; returns {x,y,len}. Zero-length stays zero.
  norm: function (x, y) {
    var len = Math.sqrt(x * x + y * y);
    if (len < 0.0001) return { x: 0, y: 0, len: 0 };
    return { x: x / len, y: y / len, len: len };
  },
  rand: function (lo, hi) { return lo + Math.random() * (hi - lo); },
  // deterministic RNG (mulberry32): same seed, same episode — for procedural
  // generation and, later, the shared seed both online players build from
  makeRng: function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // monotonic entity ids: network snapshots will reference enemies and drops by these
  _id: 1,
  newId: function () { return DA._id++; },
  hashSeed: function (str) {          // any string (a date, a room code) to a 32-bit seed
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i); h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },
  // traces a faceted polygon path — the game's angular art style uses this
  // everywhere a circle or ellipse would have gone (bodies, heads, wounds,
  // scenery). jag adds per-vertex radius noise for a jagged, shattered edge
  // instead of a perfect regular shape; pass a seeded rng for a stable bake,
  // omit it for a fresh jitter every call. Caller does beginPath/fill/stroke.
  polyPath: function (g, cx, cy, rx, ry, sides, rotation, jag, rnd) {
    for (var i = 0; i <= sides; i++) {
      var a = (rotation || 0) + (i / sides) * Math.PI * 2;
      var jitter = jag ? 1 + ((rnd ? rnd() : Math.random()) * 2 - 1) * jag : 1;
      var px = cx + Math.cos(a) * rx * jitter, py = cy + Math.sin(a) * ry * jitter;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }
};
