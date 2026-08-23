(function () {
  // CAM-BOT: the network's camera robot, drafted as contestant #2. Its brain
  // reads the world and emits the SAME {moveX, moveY, aimX, aimY, firing}
  // state a human device or a network packet produces — so in online co-op
  // the second slot swaps from bot to human by changing one input source.
  //
  // Movement is weighted steering: repulsion from threats, walls and live
  // spawn doors; attraction to its partner, safe loot, and anyone downed.
  // Aim picks the most useful target with a little human wobble on top.

  function addPull(v, fx, fy, tx, ty, w) {
    var d = DA.norm(tx - fx, ty - fy);
    v.x += d.x * w; v.y += d.y * w;
  }

  DA.botInput = function (st, p, dt) {
    var m = p.botMem || (p.botMem = { retT: 0, target: null, wanderA: DA.rand(0, 6.28) });
    var human = st.players[0];
    var v = { x: 0, y: 0 };
    var i, e, d2, w;

    // --- threats push, scaled by how scary they are up close
    var pressure = 0;
    for (i = 0; i < st.enemies.length; i++) {
      e = st.enemies[i];
      var reach = e.isBoss ? 300 : (e.fuse != null ? 190 : 240);
      d2 = DA.dist2(e.x, e.y, p.x, p.y);
      if (d2 > reach * reach) continue;
      var d = Math.sqrt(d2) || 1;
      w = (reach - d) / reach;
      w *= w;
      if (e.type === 'sprinter') w *= 1.6;
      if (e.fuse != null) w *= 2.6;                    // lit boomers clear the room
      if (e.isBoss) w *= 1.8;
      addPull(v, e.x, e.y, p.x, p.y, w * 2.4);         // away from it
      pressure += w;
    }

    // --- incoming boss fire: sidestep, don't backpedal
    for (i = 0; i < st.enemyBullets.length; i++) {
      var b = st.enemyBullets[i];
      d2 = DA.dist2(b.x, b.y, p.x, p.y);
      if (d2 > 150 * 150) continue;
      var toMe = DA.norm(p.x - b.x, p.y - b.y);
      if (toMe.x * b.dx + toMe.y * b.dy < 0.5) continue;   // not heading my way
      var side = (b.dx * (p.y - b.y) - b.dy * (p.x - b.x)) > 0 ? 1 : -1;
      v.x += -b.dy * side * 1.6;                       // perpendicular dodge
      v.y += b.dx * side * 1.6;
    }

    // --- live spawn doors are about to pour zombies: stand elsewhere
    var wm = st.waveManager;
    if (wm && wm.activeDoors) {
      for (i = 0; i < wm.activeDoors.length; i++) {
        var dr = wm.activeDoors[i];
        d2 = DA.dist2(dr.x, dr.y, p.x, p.y);
        if (d2 < 160 * 160) addPull(v, dr.x, dr.y, p.x, p.y, 0.9);
      }
    }

    // --- walls and corners are where robots die
    var A = DA.ARENA, wallW = 0.9;
    if (p.x - A.x0 < 80) v.x += wallW * (80 - (p.x - A.x0)) / 80;
    if (A.x1 - p.x < 80) v.x -= wallW * (80 - (A.x1 - p.x)) / 80;
    if (p.y - A.y0 < 80) v.y += wallW * (80 - (p.y - A.y0)) / 80;
    if (A.y1 - p.y < 80) v.y -= wallW * (80 - (A.y1 - p.y)) / 80;

    // --- partner: rescue first, otherwise keep camera distance
    var hd = Math.sqrt(DA.dist2(human.x, human.y, p.x, p.y));
    if (human.downed) {
      addPull(v, p.x, p.y, human.x, human.y, 3.2);     // nothing matters more
    } else {
      if (hd > 340) addPull(v, p.x, p.y, human.x, human.y, 1.1 + (hd - 340) / 200);
      else if (hd < 120) addPull(v, human.x, human.y, p.x, p.y, 0.7);
    }

    // --- loot: only when the set is calm-ish, and never over a rescue
    if (!human.downed && pressure < 0.8 && st.powerups.length) {
      var best = null, bd = 420 * 420;
      for (i = 0; i < st.powerups.length; i++) {
        var pu = st.powerups[i];
        if (pu.type === 'heart' && p.hearts >= DA.MAX_HEARTS) continue;
        d2 = DA.dist2(pu.x, pu.y, p.x, p.y);
        if (d2 < bd) { bd = d2; best = pu; }
      }
      if (best) addPull(v, p.x, p.y, best.x, best.y, 0.8);
    }

    // --- a slow wander so an empty set doesn't look like a crash
    m.wanderA += dt * 0.7;
    v.x += Math.cos(m.wanderA) * 0.12;
    v.y += Math.sin(m.wanderA) * 0.12;

    var mv = DA.norm(v.x, v.y);

    // --- target selection: nearest, with a soft spot for boomers at range
    m.retT -= dt;
    if (m.retT <= 0 || !m.target || m.target.hp <= 0 || m.target.dying ||
        st.enemies.indexOf(m.target) === -1) {
      m.retT = 0.4;
      var pick = null, score = -1;
      for (i = 0; i < st.enemies.length; i++) {
        e = st.enemies[i];
        if (e.dying) continue;                 // no shooting the corpse on live TV
        if (e.isBoss && e.grace > 0) continue;  // no shooting the guest before ACTION!
        if (e.type === 'stalker' && DA.stalkerFaint(e)) continue;  // can't see it either
        d2 = DA.dist2(e.x, e.y, p.x, p.y);
        if (d2 > 560 * 560) continue;
        var s = 1 - Math.sqrt(d2) / 560;
        if (e.type === 'boomer' && e.fuse == null && d2 > 140 * 140) s += 0.35; // chain bait
        if (e.isBoss) s += 0.2;
        if (s > score) { score = s; pick = e; }
      }
      m.target = pick;
    }

    var aimX = p.aimX, aimY = p.aimY, firing = false;
    if (m.target) {
      var wob = Math.sin(performance.now() / 130 + m.wanderA) * 0.07;  // human wobble
      var at = Math.atan2(m.target.y - p.y, m.target.x - p.x) + wob;
      aimX = Math.cos(at); aimY = Math.sin(at);
      firing = true;
    }

    return { moveX: mv.x, moveY: mv.y, aimX: aimX, aimY: aimY, firing: firing };
  };
})();
