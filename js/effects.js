(function () {
  // The presenter. Tone: Black Mirror / Banksy / Monkey Dust — bitter,
  // satirical, slightly gritty. One fires every 25 kills.
  var QUIPS = [
    'THE SPONSORS LOVE YOU. FOR NOW.',
    'RATINGS UP 3%. KEEP BLEEDING.',
    'THE AUDIENCE VOTED FOR MORE.',
    'SOMEONE JUST MUTED THEIR CONSCIENCE.',
    'THIS SEGMENT BROUGHT TO YOU BY GRUEL™',
    'THE COMPLIANCE DEPARTMENT HAS LEFT.',
    'YOUR FAMILY GETS 10% OF NOTHING.',
    'BILLIONS WATCHING. NOBODY CALLING FOR HELP.',
    'LEGAL SAYS THIS IS ALL FINE.*',
    'THAT ONE HAD A NAME BADGE.',
    'MERCH IS SELLING BEAUTIFULLY.',
    'THE ALGORITHM WANTS MORE CLOSE-UPS.',
    "DON'T WORRY. NOBODY REMEMBERS SEASON 9.",
    'VIEWERS FIND YOUR SUFFERING RELATABLE.',
    'WE EDITED OUT YOUR SCREAMING. TOO REAL.',
    'FOCUS GROUPS PREFER YOU DESPERATE.',
    "EVERY ZOMBIE WAS SOMEONE'S CO-WORKER.",
    'THE CROWD GOES MILD.',
    'YOUR CONTRACT COVERS NONE OF THIS.',
    'SMILE FOR CAMERA THREE.',
    'THE PRIZE MONEY IS TECHNICALLY REAL.',
    'HR WOULD LIKE A WORD. HR IS DEAD.',
    'THIS IS WHAT YOU VOTED FOR.',
    'ANOTHER AD-FREE MASSACRE, VIEWERS.',
    "KIDS: DON'T TRY THIS. OR DO. WE NEED A SPIN-OFF.",
    'CATERING WAS THE FIRST TO GO.',
    'THE NETWORK THANKS YOU FOR YOUR SACRIFICE.',
    '80% OF VIEWERS THINK THIS IS SCRIPTED.',
    'YOUR PAIN IS CHARTING IN TWELVE COUNTRIES.',
    'SOMEWHERE, AN EXECUTIVE JUST SMILED.',
    'WE SOLD YOUR SCREAM AS A RINGTONE.',
    'THE CENSORS GAVE UP YEARS AGO.',
    'NOSTALGIA SPIKE: PEOPLE MISS SEASON 1.',
    'THE INSURANCE LAPSED MID-EPISODE.',
    'THE CLEANUP CREW SAYS SLOW DOWN.',
    'THAT WAS AN UNPAID INTERN.',
    "TONIGHT'S MORAL: THERE ISN'T ONE.",
    'VIEWER DISCRETION WAS NEVER ADVISED.',
    "YOU'RE TRENDING. SO IS YOUR OBITUARY.",
    'THE MONSTERS HAVE A UNION NOW.',
    'PLEASE SCREAM TOWARD THE BOOM MIC.',
    "HISTORY WILL CALL THIS 'CONTENT'.",
    'THE PRODUCERS FEEL NOTHING.',
    'SEASON 13 WAS BANNED IN 40 COUNTRIES. THIS IS WORSE.',
    'THEY CANCELLED THE NEWS FOR THIS.',
    'YOUR HEART RATE IS OUR TICKER TAPE.',
    'EVERY DEATH RESETS THE COMPLAINTS LINE.',
    "IT'S NOT VIOLENCE. IT'S HERITAGE.",
    'STAY TUNED. YOU HAVE NO CHOICE.'
  ];

  DA.fx = { particles: [], splats: [], popups: [], queue: [], corpses: [], shake: 0 };
  try { DA.fx.shakeOn = localStorage.getItem('deadset_shake') !== '0'; }
  catch (e) { DA.fx.shakeOn = true; }

  // a felled zombie deflates into the floor instead of blinking out
  DA.corpse = function (x, y, r, color) {
    DA.fx.corpses.push({ x: x, y: y, r: r, color: color, t: 0.45, max: 0.45 });
    if (DA.fx.corpses.length > 80) DA.fx.corpses.shift();
  };

  DA.burst = function (x, y, color, n, dx, dy) {
    for (var i = 0; i < n; i++) {
      var a = DA.rand(0, 6.28), s = DA.rand(60, 260);
      DA.fx.particles.push({ x: x, y: y,
                             vx: Math.cos(a) * s + (dx || 0) * 170,   // spray follows the shot
                             vy: Math.sin(a) * s + (dy || 0) * 170,
                             life: 0.5, maxLife: 0.5, color: color, r: DA.rand(2, 5) });
    }
  };

  DA.splat = function (x, y) {
    var blobs = [];
    var n = 2 + Math.floor(DA.rand(0, 3));
    for (var i = 0; i < n; i++) {
      blobs.push({ dx: DA.rand(-14, 14), dy: DA.rand(-14, 14), r: DA.rand(6, 16) });
    }
    DA.fx.splats.push({ x: x, y: y, blobs: blobs });
    if (DA.fx.splats.length > 200) DA.fx.splats.shift();
  };

  // announcements queue up and show ONE at a time; when the booth is backed up
  // (2 already waiting), extra messages are dropped rather than going stale
  DA.announce = function (text) {
    if (DA.fx.queue.length >= 2) return;
    DA.fx.queue.push(text);
  };

  DA.addShake = function (amount) {
    if (DA.fx.shakeOn === false) return;
    DA.fx.shake = Math.max(DA.fx.shake, amount);
  };

  DA.updateFx = function (dt) {
    var fx = DA.fx;
    for (var i = fx.particles.length - 1; i >= 0; i--) {
      var p = fx.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) fx.particles.splice(i, 1);
    }
    for (var j = fx.popups.length - 1; j >= 0; j--) {
      var pop = fx.popups[j];
      pop.y -= 25 * dt; pop.life -= dt;
      if (pop.life <= 0) fx.popups.splice(j, 1);
    }
    if (fx.popups.length === 0 && fx.queue.length > 0) {  // promote the next message
      fx.popups.push({ text: fx.queue.shift(), y: 130, life: 2.0, maxLife: 2.0 });
      if (DA.audio) DA.audio.sting();
    }
    for (var c = fx.corpses.length - 1; c >= 0; c--) {
      fx.corpses[c].t -= dt;
      if (fx.corpses[c].t <= 0) fx.corpses.splice(c, 1);
    }
    if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - 30 * dt);
  };

  DA.drawFxUnder = function (ctx) {   // floor stains + deflating corpses, under actors
    ctx.fillStyle = 'rgba(110, 20, 30, 0.55)';
    var splats = DA.fx.splats;
    for (var i = 0; i < splats.length; i++) {
      var s = splats[i];
      for (var b = 0; b < s.blobs.length; b++) {
        var blob = s.blobs[b];
        ctx.beginPath(); ctx.arc(s.x + blob.dx, s.y + blob.dy, blob.r, 0, 7); ctx.fill();
      }
    }
    var corpses = DA.fx.corpses;
    for (var c = 0; c < corpses.length; c++) {
      var k = corpses[c].t / corpses[c].max;         // 1 -> 0 as it deflates
      ctx.globalAlpha = 0.35 + k * 0.5;
      ctx.fillStyle = corpses[c].color;
      ctx.beginPath();
      ctx.ellipse(corpses[c].x, corpses[c].y + corpses[c].r * (1 - k) * 0.6,
                  corpses[c].r * (1 + (1 - k) * 0.35), Math.max(1, corpses[c].r * k), 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  DA.drawFxOver = function (ctx) {    // particles + announcer, over actors
    var fx = DA.fx;
    for (var i = 0; i < fx.particles.length; i++) {
      var p = fx.particles[i];
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (var j = 0; j < fx.popups.length; j++) {
      var pop = fx.popups[j];
      ctx.globalAlpha = Math.min(1, pop.life / (pop.maxLife * 0.5));
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = '#e8d44d';
      ctx.fillText(pop.text, DA.W / 2, pop.y);
    }
    ctx.globalAlpha = 1;
  };

  // Game-event hooks fired by combat.js / rooms.js
  DA.onKill = function (st, e, b) {          // b: the killing bullet, if any
    st.kills = (st.kills || 0) + 1;
    DA.burst(e.x, e.y, e.color, e.isBoss ? 60 : 12, b && b.dx, b && b.dy);
    if (e.isBoss || e.r >= 20) DA.fx.hitStop = 0.05;
    DA.splat(e.x, e.y);
    DA.corpse(e.x, e.y, e.r, e.color);
    DA.addShake(e.isBoss ? 14 : 3);
    if (DA.audio) DA.audio.splat();
    if (st.kills % 25 === 0) DA.announce(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
  };
  DA.onPlayerHurt = function (st) {
    DA.addShake(10);
    DA.burst(st.player.x, st.player.y, '#c0392b', 16);
    if (DA.audio) DA.audio.hurt();
  };
  DA.onWaveStart = function (n) {
    if (n > 1) DA.announce('WAVE ' + n);   // wave 1 follows the room name: let it breathe
    if (DA.audio) DA.audio.wave();
  };
})();
