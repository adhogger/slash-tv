(function () {
  // Effect/announcer hooks (DA.onKill, DA.onPlayerHurt) are optional so this
  // file stays testable without the effects layer loaded.
  var COMBO_CAP = 9, COMBO_WINDOW = 3; // seconds to keep a kill chain alive
  DA.bumpCombo = function (st) {
    st.combo = Math.min(st.combo + 1, COMBO_CAP);
    st.comboTimer = COMBO_WINDOW;
  };
  DA.updateCombo = function (st, dt) {
    if (st.comboTimer > 0) {
      st.comboTimer -= dt;
      if (st.comboTimer <= 0) st.combo = 1;
    }
  };
  DA.resolveCombat = function (st) {
    var p = st.player;
    for (var i = st.enemies.length - 1; i >= 0; i--) {
      var e = st.enemies[i];
      var killed = false;
      for (var j = st.bullets.length - 1; j >= 0; j--) {
        var b = st.bullets[j];
        if (b.pierce && b.hit.indexOf(e) !== -1) continue; // railgun hits each zombie once
        if (DA.circleHit(e.x, e.y, e.r, b.x, b.y, b.r)) {
          if (b.pierce) b.hit.push(e);
          else st.bullets.splice(j, 1);
          e.hp -= (b.dmg || 1);
          if (e.hp <= 0) { killed = true; break; }
        }
      }
      if (killed) {
        st.enemies.splice(i, 1);
        st.score += e.score * st.combo;
        if (e.isBoss) st.bossDead = true;
        if (DA.bumpCombo) DA.bumpCombo(st);
        if (DA.onKill) DA.onKill(st, e);
        continue;
      }
      if (p.invuln <= 0 && !(e.grace > 0) && DA.circleHit(e.x, e.y, e.r, p.x, p.y, p.r)) {
        p.hearts--;
        p.invuln = 1.5;
        var v = DA.norm(e.x - p.x, e.y - p.y); // knock enemy back
        e.x += v.x * 60; e.y += v.y * 60;
        DA.clampToArena(e);
        if (DA.onPlayerHurt) DA.onPlayerHurt(st);
      }
    }
  };
})();
