(function () {
  // The presenter has an ARC. Twelve years of selling murder as light
  // entertainment, and tonight is the first episode he can't control:
  //   Act 1 (Ep 1)          — the professional. Polished, amoral, selling.
  //   Act 2 (Ep 2)          — tiny cracks. Improvising, still smiling.
  //   Act 3 (Ep 2 boss +    — losing control. Talking to the control room
  //          early Ep 3)      more than the audience.
  //   Act 4 (late Ep 3)     — the broadcast collapses. Narrating his own fear.
  //   Act 5 (the finale)    — no audience voice left. An ordered confession,
  //                           dripped line by line during the Algorithm fight.
  // Tone: Black Mirror / Banksy / Monkey Dust. He jokes about TELEVISION,
  // not monsters — people built this. Executives. Marketing. Algorithms.
  var ACT1 = [
    'GOOD EVENING, HUMANITY. WE CHECKED OUR MORALS AT RECEPTION. AGAIN.',
    'OUR LEGAL DEPARTMENT HAS OFFICIALLY STOPPED ANSWERING THE PHONE.',
    'EVERY SCREAM YOU HEAR HAS BEEN PROFESSIONALLY MIKED.',
    'THE AUDIENCE WANTED AUTHENTICITY. WE MAY HAVE OVERDELIVERED.',
    'SMILE FOR CAMERA THREE. YOUR OBITUARY MIGHT USE THE FOOTAGE.',
    'SOMEWHERE, A SHAREHOLDER IS CALLING THIS A SUCCESS.',
    'THE BLOOD IS REAL. THE SMILES ARE CONTRACTUAL.',
    "IF THIS FEELS UNFAIR — CONGRATULATIONS. YOU'VE UNDERSTOOD THE FORMAT.",
    'THIS IS WHAT HAPPENS WHEN QUARTERLY PROFITS BECOME A RELIGION.',
    'FOCUS GROUPS AGREED THAT EMPATHY TESTED POORLY WITH OUR CORE DEMOGRAPHIC.',
    'ETHICS WERE REMOVED AFTER SEASON FOUR TO IMPROVE PACING.',
    'EVERY DEATH TONIGHT HAS BEEN OPTIMISED FOR VIEWER ENGAGEMENT.',
    'THE EXECUTIVES ARE WATCHING FROM A SECURE BUNKER. NATURALLY.',
    'THE CREW REQUESTED HAZARD PAY. WE GAVE THEM COMMEMORATIVE MUGS.',
    "REMEMBER — IF YOU'RE STILL ALIVE, YOU'RE TECHNICALLY UNDERPERFORMING.",
    "TONIGHT'S SUFFERING IS SPONSORED BY RECORD-BREAKING AUDIENCE RETENTION.",
    'OUR ADVERTISERS LEFT YEARS AGO. FORTUNATELY, HUMAN CURIOSITY IS FREE.',
    'NOTHING BOOSTS VIEWING FIGURES QUITE LIKE IRREVERSIBLE MISTAKES.',
    "WE ASKED THE AI TO MAXIMISE RATINGS. IT MISUNDERSTOOD THE WORD 'LIMIT'.",
    'YOUR PANIC IS BEING TRANSLATED LIVE INTO SEVENTEEN LANGUAGES.',
    'TONIGHT IS PROUDLY UNSPONSORED. EVERYONE ELSE PULLED OUT.',
    'THE COMPLAINTS LINE NOW REDIRECTS TO A GIFT SHOP.',
    'OUR VIEWERS AT HOME ARE SAFE. THAT IS THEIR ENTIRE CONTRIBUTION.',
    "DON'T THINK OF IT AS DYING. THINK OF IT AS PEAKING.",
    'EVERY CAMERA HERE HAS BETTER HEALTHCARE THAN THE CREW.',
    'OUR DEMOGRAPHIC IS EVERYONE WITH A PULSE. FOR NOW.',
    "TONIGHT'S EPISODE IS RATED: INEVITABLE.",
    'THE PRIZE MONEY EXISTS. THE WINNER RARELY DOES.',
    'HISTORY WILL JUDGE US. RATINGS ALREADY HAVE.',
    'APPLAUSE SIGNS ARE MANDATORY. FEELINGS ARE OPTIONAL.',
    'THE NETWORK CALLS THIS CONTENT. YOUR MOTHER WOULD CALL THE POLICE.',
    'WE COUNT VIEWERS, NOT SURVIVORS. THE MATHS IS SIMPLER.'
  ];
  var ACT2 = [
    "WELL... THAT WASN'T SCHEDULED.",
    'CONTROL ASSURES ME EVERYTHING REMAINS UNDER... ACCEPTABLE LEVELS.',
    'ONE MOMENT — APPARENTLY OUR AI HAS BECOME CREATIVELY INDEPENDENT.',
    'INTERESTING. CAMERA TWELVE HAS GONE OFFLINE.',
    'WE APPEAR TO BE MISSING SEVERAL MEMBERS OF OUR PRODUCTION CREW.',
    "NO NEED FOR ALARM. WE'VE PREPARED FOR ALMOST EVERY EVENTUALITY.",
    '...ALMOST.',
    'THE AI DIRECTOR ASSURES US EVERYTHING IS PROCEEDING CATASTROPHICALLY.',
    "THAT WASN'T A SCRIPTED EXPLOSION... BUT WE'LL ABSOLUTELY PRETEND IT WAS.",
    'EVERY MONSTER REPRESENTS YEARS OF INNOVATION AND ONE CATASTROPHIC OVERSIGHT.',
    'THIS EPISODE HAS EXCEEDED OUR PROJECTED CASUALTY TARGETS. CONGRATULATIONS, EVERYONE.',
    'SOMEWHERE IN THIS BUILDING IS AN EMERGENCY EXIT. IT TESTED POORLY WITH AUDIENCES.',
    'COULD SOMEONE CHECK ON THE BASEMENT LEVELS? ...ANYONE FROM THE BASEMENT LEVELS?',
    'THE TELEPROMPTER JUST WENT BLANK. I KNOW THIS SHOW BY HEART ANYWAY.',
    'THAT ALARM IS PART OF THE SOUNDTRACK. PROBABLY.',
    'MAKEUP? MAKEUP TO THE FLOOR, PLEASE. ...MAKEUP?',
    'WE SEEM TO HAVE LOST THE FEED FROM STUDIO SIX. AND STUDIO SIX.',
    'THE SHOW MUST GO ON. CONTRACTUALLY, IT HAS NO CHOICE.',
    'I AM TOLD EVERYTHING IS FINE. I AM TOLD THAT BY A RECORDING.',
    'MINOR SCHEDULING NOTE: THE 9PM SLOT NO LONGER EXISTS.',
    'SECURITY IS HANDLING IT. SECURITY? ...SECURITY IS HANDLING IT.',
    'WHOEVER IS RUNNING THE AUTOCUE: VERY FUNNY. STOP.',
    'THE SPRINKLERS ARE NOT PART OF THE SHOW. NEITHER IS THE SMOKE.',
    'FUN FACT: THIS BUILDING HAS NEVER PASSED A SINGLE INSPECTION.'
  ];
  var ACT3 = [
    'CONTROL... WHO AUTHORISED OPENING SECTOR NINE?',
    "THAT CREATURE WASN'T CLEARED FOR BROADCAST.",
    "...THAT'S IMPOSSIBLE.",
    'WHY ARE CONTAINMENT DOORS OPENING BY THEMSELVES?',
    'CAMERA FIVE... STOP FILMING THAT.',
    'DIRECTOR? ...DIRECTOR?',
    '...WHAT AN EXCITING TWIST FOR OUR VIEWERS.',
    "THE RATINGS NOW TRACK THE BODY COUNT EXACTLY. MARKETING CALLS THAT 'BRAND CONSISTENCY'.",
    'WHO IS CUTTING THE CAMERAS? I DID NOT CALL A CUT.',
    'THE DOORS TO THE EXECUTIVE FLOOR ARE... WELDED?',
    'PUT THE FLOOR MANAGER ON. PUT ANYONE ON.',
    'THE AUTOCUE IS WRITING ITSELF NOW. IT SAYS: KEEP SMILING.',
    'I CAN HEAR SOMETHING IN THE VENTS. CUT TO THE WIDE SHOT.',
    'THAT IS NOT ONE OF OURS. CONTROL — THAT IS NOT ONE OF OURS.'
  ];
  var ACT4 = [
    "CONTROL ISN'T ANSWERING.",
    'THERE SHOULD STILL BE SAFETY TEAMS.',
    'WHERE IS EVERYONE?',
    'SOMEONE IS SUPPOSED TO STOP THIS.',
    '...ANYONE?',
    "THE NETWORK IS DYING TONIGHT. YOU'RE JUST DOING IT MORE PUBLICLY.",
    "IF CIVILISATION SURVIVES THIS BROADCAST, WE'D APPRECIATE A FAVOURABLE REVIEW.",
    'THE EXITS ON THE FLOOR PLAN DO NOT EXIST.',
    "I FOUND THE CREW. I WISH I HADN'T.",
    'KEEP THE LIGHTS ON. PLEASE. KEEP THE LIGHTS ON.'
  ];
  // Act 5 is a SCRIPT, not a pool: dripped in order during the finale fight.
  var ACT5 = [
    'WE THOUGHT PEOPLE WANTED MONSTERS.',
    'IT TURNED OUT THEY WANTED US.',
    'I USED TO TELL CONTESTANTS THIS WAS JUST TELEVISION.',
    '...I STOPPED BELIEVING THAT YEARS AGO.',
    'WE KEPT ASKING HOW FAR WE COULD PUSH PEOPLE.',
    "WE NEVER ASKED HOW FAR WE'D PUSH OURSELVES.",
    'THE FUNNY THING ABOUT SPECTACLES...',
    '...IS EVENTUALLY THE FIRE REACHES THE STAGE.',
    "IF YOU'RE HEARING THIS...",
    "...YOU'RE NO LONGER THE CONTESTANT."
  ];
  var ACTS = [null, ACT1, ACT2, ACT3, ACT4, ACT5];

  // Which act is the show in? Follows the campaign's actual structure.
  DA.presenterAct = function (st) {
    var room = st && st.room;
    if (!room) return 1;
    var ep = room.ep || 1;
    if (ep === 1) return 1;
    if (ep === 2) return room.boss ? 3 : 2;
    if (ep === 3) {
      if (room.boss) return 5;
      var depth = room.map ? room.map.x + room.map.y : 0;
      return depth >= 3 ? 4 : 3;
    }
    return 1;                       // Syndication/Endless: the show at its confident best
  };

  DA.fx = { particles: [], popups: [], queue: [], corpses: [], dust: [], rings: [], casings: [], host: null,
            shake: 0, shakeDirX: 0, shakeDirY: 0, aberration: 0, neonFlash: 0 };
  // Floor stains (blood splats + explosion scorch) never change once placed,
  // so each is stamped ONCE onto this offscreen canvas at creation time and
  // the per-frame cost is a single drawImage — instead of re-drawing every
  // arc and polygon of every stain every frame (2000+ ops late in a room).
  // Side effect worth having: no more caps, the floor keeps the whole
  // fight's history until the room changes.
  var stainCanvas = document.createElement('canvas');
  stainCanvas.width = DA.W; stainCanvas.height = DA.H;
  var stainCtx = stainCanvas.getContext('2d');
  DA.clearStains = function () { stainCtx.clearRect(0, 0, DA.W, DA.H); };
  // the wall's neon trim strips stay dim except for this — set to 1 by a
  // bomb or rocket-launcher explosion specifically, decays over ~1.6s
  DA.addNeonFlash = function () { DA.fx.neonFlash = 1; };

  // The presenter appears ON CAMERA: a HOST CAM window in the corner with his
  // talking head and the line as a caption — his quips live there now, so the
  // centre of the screen stays clear for gameplay callouts.
  // speaker: omitted = the host; or a boss type ('producer'/'executive'/
  // 'algorithm') — the window becomes BOSS CAM, and during a boss entrance
  // the fight holds until it leaves the screen. monsterType: an enemy type
  // string — the window becomes CAST SPOTLIGHT and shows that monster
  // (drawn live via DA.drawEnemies, same as the bestiary) instead of a face.
  DA.hostSay = function (text, speaker, dur, monsterType) {
    if (!text) return;
    var t = dur || 4.6;
    // CAST SPOTLIGHT bakes its fake enemy ONCE here, not per render frame —
    // DA.makeEnemy hands out a fresh DA.newId() every call, and the sprite
    // sheet is keyed by that id (see DA.sprite), so recreating it every
    // frame in drawHostCam cycled through different baked variants each
    // frame and read as the monster glitching/flickering
    var fakeEnemy = (monsterType && monsterType !== 'mine' && DA.makeEnemy) ?
                     DA.makeEnemy(monsterType, 0, 0) : null;
    DA.fx.host = { text: text, lines: null, t: t, max: t, speaker: speaker || 'host',
                   monsterType: monsterType, fakeEnemy: fakeEnemy };
  };
  try { DA.fx.shakeOn = localStorage.getItem('deadset_shake') !== '0'; }
  catch (e) { DA.fx.shakeOn = true; }

  // a felled zombie shatters into flying shards instead of blinking out —
  // or deflating: this reads as glass breaking, not a balloon losing air
  // per-size shards: a swarmer pops into confetti, a brute breaks into slabs
  DA.corpse = function (x, y, r, color, dx, dy) {
    var big = r >= 16;
    var n = big ? 8 + Math.floor(r / 3.5) : 10 + Math.floor(r / 2);
    // reverted — the longer-lingering shards read as distracting clutter.
    // Back to a quick burst-and-gone; the permanent blood splat underneath
    // (DA.splat, a separate system) is what's meant to stick around.
    var life = big ? 0.95 : 0.75;
    for (var i = 0; i < n; i++) {
      var a = DA.rand(0, 6.283), speed = DA.rand(100, big ? 260 : 340);
      DA.fx.corpses.push({
        x: x, y: y,
        vx: Math.cos(a) * speed + (dx || 0) * 150,
        vy: Math.sin(a) * speed + (dy || 0) * 150 - DA.rand(40, 120),
        rot: DA.rand(0, 6.283), rotV: DA.rand(-13, 13),
        w: DA.rand(big ? r * 0.35 : 4, Math.max(5, r * (big ? 0.9 : 0.65))),
        h: DA.rand(big ? r * 0.35 : 4, Math.max(5, r * (big ? 0.9 : 0.65))),
        color: color, t: life, max: life, grav: 360, flightT: big ? 0.55 : 0.4
      });
    }
    if (DA.fx.corpses.length > 320) DA.fx.corpses.splice(0, DA.fx.corpses.length - 320);
  };

  // Chromatic aberration: a decaying 0..1 intensity, kicked up by big hits
  // and topped up continuously at low health (see the draw side in main.js).
  DA.addAberration = function (amount) {
    DA.fx.aberration = Math.max(DA.fx.aberration, amount);
  };

  // hard ceiling on live particles — past this, new ones are dropped rather
  // than letting a bomb-chain frame allocate without bound (GC-stutter
  // insurance before co-op multiplies every burst by more players)
  var PARTICLE_CAP = 1200;
  DA.burst = function (x, y, color, n, dx, dy) {
    for (var i = 0; i < n; i++) {
      if (DA.fx.particles.length >= PARTICLE_CAP) return;
      var a = DA.rand(0, 6.28), s = DA.rand(60, 260);
      DA.fx.particles.push({ x: x, y: y,
                             vx: Math.cos(a) * s + (dx || 0) * 170,   // spray follows the shot
                             vy: Math.sin(a) * s + (dy || 0) * 170,
                             life: 0.5, maxLife: 0.5, color: color, r: DA.rand(2, 5) });
    }
  };

  DA.shockwave = function (x, y, maxR) {   // expanding, fading blast ring (rocket explosions)
    DA.fx.rings.push({ x: x, y: y, maxR: maxR || 100, life: 0.32, maxLife: 0.32 });
  };

  DA.eject = function (x, y, aimA) {       // a spent casing kicked out sideways
    var side = Math.random() < 0.5 ? 1 : -1;
    var a = aimA + side * 1.9 + DA.rand(-0.3, 0.3);
    DA.fx.casings.push({ x: x, y: y,
      vx: Math.cos(a) * DA.rand(60, 120), vy: Math.sin(a) * DA.rand(60, 120) - 40,
      rot: DA.rand(0, 6.28), rotV: DA.rand(-14, 14), grav: 300,
      t: 0.5, max: 0.5 });
    if (DA.fx.casings.length > 60) DA.fx.casings.shift();
  };

  DA.dust = function (x, y) {              // tiny footstep puff, drawn under the player
    DA.fx.dust.push({ x: x, y: y, r: DA.rand(2, 4), vy: -8, life: 0.32, maxLife: 0.32 });
    if (DA.fx.dust.length > 60) DA.fx.dust.shift();
  };
  // wisps billowing out of a door that's actively pouring zombies through —
  // reuses the generic particle pool. Called with a SMALL count at a short
  // interval (see main.js's smoke tick) rather than a big count rarely, so
  // it reads as one continuous stream instead of visible pulses/waves.
  // Spread across the door's full width so it covers the WHOLE doorway
  // (doors are ~90-100px across), with enough reach to drift well past the
  // wall and INTO the arena, not just hover at the threshold. 'into' is
  // toward the arena's center from each wall — the opposite of the door's
  // own outward-facing normal.
  DA.doorSmoke = function (x, y, dir, count) {
    var into = dir === 'N' ? { x: 0, y: 1 } : dir === 'S' ? { x: 0, y: -1 } :
               dir === 'W' ? { x: 1, y: 0 } : { x: -1, y: 0 };
    var along = { x: -into.y, y: into.x };       // spans the door's width, perpendicular to its facing
    for (var i = 0; i < (count || 20); i++) {
      var spread = DA.rand(-48, 48);
      var life = DA.rand(1.3, 2.4);
      DA.fx.particles.push({ x: x + along.x * spread, y: y + along.y * spread,
        vx: into.x * DA.rand(35, 95) + DA.rand(-16, 16), vy: into.y * DA.rand(35, 95) - DA.rand(6, 16),
        r: DA.rand(6, 16), color: 'rgba(130, 128, 138, 0.28)', life: life, maxLife: life });
    }
  };
  // an immediate, stronger puff right as a pack starts pouring — the ambient
  // per-frame trickle (main.js) alone can get outrun by a fast type (a
  // sprinter clears the doorway before it reads as "smoke happened")
  DA.onBurstStart = function (door) { DA.doorSmoke(door.x, door.y, door.dir, 20); };
  // permanent (per-room) burn mark left by an EXPLOSION — rocket, grenade,
  // mine, bomb, or a zombie (boomer) going off. Deliberately NOT used for
  // ordinary bullets missing and hitting a wall — that read as too much
  // clutter for something that isn't really an explosion. Vertices/splash
  // are baked ONCE here, not re-rolled per draw call, so the mark stays a
  // fixed shape every frame instead of flickering (the exact bug class
  // fixed in the host-cam hair silhouette elsewhere). Side count, overall
  // size, and an elongation axis all vary per mark so a floor full of them
  // doesn't read as the same stamp repeated.
  DA.addScorch = function (x, y, big) {
    var n = 5 + Math.floor(DA.rand(0, 5));             // 5-9 sides
    var baseR = big ? DA.rand(10, 22) : DA.rand(2.5, 7);
    var stretchA = DA.rand(0, 6.283), stretch = DA.rand(0.7, 1.6);
    var verts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + DA.rand(-0.35, 0.35);
      var r = baseR * DA.rand(0.6, 1.15) * (1 + (stretch - 1) * Math.abs(Math.cos(a - stretchA)));
      verts.push({ a: a, r: r });
    }
    // faint soot speckles scattered around the main burn — a splash zone,
    // not just a clean-edged blob
    var splashN = (big ? 6 : 3) + Math.floor(DA.rand(0, 5));
    var splashReach = baseR * (big ? 2.6 : 3.2);
    var splash = [];
    for (var s = 0; s < splashN; s++) {
      var sa = DA.rand(0, 6.283), sd = DA.rand(baseR * 0.8, splashReach);
      splash.push({ dx: Math.cos(sa) * sd, dy: Math.sin(sa) * sd, r: DA.rand(big ? 3 : 1.5, big ? 8 : 3.5) });
    }
    if (splash.length) {                               // faint soot speckles, behind the main burn
      stainCtx.fillStyle = 'rgba(8, 6, 5, 0.22)';
      for (var sk = 0; sk < splash.length; sk++) {
        var spk = splash[sk];
        stainCtx.beginPath(); stainCtx.arc(x + spk.dx, y + spk.dy, spk.r, 0, 7); stainCtx.fill();
      }
    }
    stainCtx.fillStyle = big ? 'rgba(15, 10, 8, 0.55)' : 'rgba(10, 8, 6, 0.45)';
    stainCtx.beginPath();
    for (var vi = 0; vi < verts.length; vi++) {
      var vv = verts[vi];
      var px = x + Math.cos(vv.a) * vv.r, py = y + Math.sin(vv.a) * vv.r;
      if (vi === 0) stainCtx.moveTo(px, py); else stainCtx.lineTo(px, py);
    }
    stainCtx.closePath(); stainCtx.fill();
    if (DA.fx.particles) {                    // a brief puff of smoke off the fresh mark
      var puffN = big ? 5 : 3;
      for (var p = 0; p < puffN; p++) {
        var life = DA.rand(1.2, 2.2);
        DA.fx.particles.push({ x: x + DA.rand(-6, 6), y: y + DA.rand(-6, 6),
          vx: DA.rand(-8, 8), vy: -DA.rand(12, 26),
          r: DA.rand(big ? 5 : 3, big ? 11 : 6), color: 'rgba(80, 78, 82, 0.32)', life: life, maxLife: life });
      }
    }
  };
  // dx/dy optional: when the killing shot's direction is known, the stain
  // SPRAYS along it — a main pool plus droplets thrown down-range
  DA.splat = function (x, y, dx, dy) {
    var blobs = [];
    var n = 2 + Math.floor(DA.rand(0, 3));
    for (var i = 0; i < n; i++) {
      blobs.push({ dx: DA.rand(-14, 14), dy: DA.rand(-14, 14), r: DA.rand(6, 16) });
    }
    if (dx || dy) {
      for (var d = 1; d <= 3; d++) {              // trailing droplets down-range
        blobs.push({ dx: dx * (14 + d * 13) + DA.rand(-7, 7),
                     dy: dy * (14 + d * 13) + DA.rand(-7, 7),
                     r: DA.rand(3, 9 - d) });
      }
    }
    stainCtx.fillStyle = 'rgba(110, 20, 30, 0.55)';
    for (var bi = 0; bi < blobs.length; bi++) {
      var blob = blobs[bi];
      stainCtx.beginPath(); stainCtx.arc(x + blob.dx, y + blob.dy, blob.r, 0, 7); stainCtx.fill();
    }
  };

  // announcements queue up and show ONE at a time; when the booth is backed up
  // (2 already waiting), extra messages are dropped rather than going stale
  DA.announce = function (text) {
    if (DA.fx.queue.length >= 2) return;
    DA.fx.queue.push(text);
  };

  // only the bigger shake wins, same "loudest one takes it" rule as before
  // (Math.max) — but now direction rides along with magnitude, so a small
  // shake (a routine kill, say) can't stomp a bigger directed recoil shake
  // that's still decaying, the way an unconditional overwrite would
  DA.addShake = function (amount) {
    if (DA.fx.shakeOn === false || amount <= DA.fx.shake) return;
    DA.fx.shake = amount;
    DA.fx.shakeDirX = 0; DA.fx.shakeDirY = 0;   // undirected: plain isotropic jitter
  };
  // directional shake: the screen kicks along (dx,dy) instead of jittering
  // evenly in every direction — used for weapon recoil, where a real camera
  // would get punched back opposite the muzzle, not shaken at random
  DA.addShakeDir = function (amount, dx, dy) {
    if (DA.fx.shakeOn === false || amount <= DA.fx.shake) return;
    DA.fx.shake = amount;
    var n = DA.norm(dx, dy);
    DA.fx.shakeDirX = n.x; DA.fx.shakeDirY = n.y;
  };

  // Haptics: gamepad rumble (Chrome dual-rumble) + phone vibration (Android;
  // iOS Safari has no vibrate API, so it degrades silently there).
  var hapticsOn = true;
  try { hapticsOn = localStorage.getItem('deadset_haptics') !== '0'; } catch (e) {}
  DA.hapticsOn = function () { return hapticsOn; };
  DA.toggleHaptics = function () {
    hapticsOn = !hapticsOn;
    try { localStorage.setItem('deadset_haptics', hapticsOn ? '1' : '0'); } catch (e) {}
    if (DA.announce) DA.announce(hapticsOn ? 'HAPTICS ON' : 'HAPTICS OFF');
    if (hapticsOn) DA.haptic(0.8, 120);      // a demo thump so the toggle is felt
    return hapticsOn;
  };
  // (An iOS <input switch> haptic hack was tried here and confirmed dead on
  // real hardware — web pages simply don't get the Taptic Engine. Gamepad
  // rumble and Android vibration below are the supported paths.)
  DA.haptic = function (strength, ms) {
    if (!hapticsOn) return;
    try {
      if (navigator.vibrate && DA.input && DA.input.touchActive && DA.input.touchActive()) {
        navigator.vibrate(ms);
      }
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (p && p.connected && p.vibrationActuator && p.vibrationActuator.playEffect) {
          p.vibrationActuator.playEffect('dual-rumble',
            { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) });
          break;
        }
      }
    } catch (e) {}
  };

  DA.updateFx = function (dt) {
    var fx = DA.fx;
    // in-place compaction instead of splice-per-expiry: one O(n) pass with
    // no mid-array shifting, the classic hot-loop array pattern
    var alive = 0;
    for (var i = 0; i < fx.particles.length; i++) {
      var p = fx.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life > 0) fx.particles[alive++] = p;
    }
    fx.particles.length = alive;
    for (var j = fx.popups.length - 1; j >= 0; j--) {
      var pop = fx.popups[j];
      pop.y -= 25 * dt; pop.life -= dt;
      if (pop.life <= 0) fx.popups.splice(j, 1);
    }
    if (fx.popups.length === 0 && fx.queue.length > 0) {  // promote the next message
      var py = DA.state && DA.state.mode === 'title' ? 318 : 130;  // clear of the logo
      fx.popups.push({ text: fx.queue.shift(), y: py, life: 3.4, maxLife: 3.4 });
      if (DA.audio) DA.audio.sting();
    }
    for (var c = fx.corpses.length - 1; c >= 0; c--) {
      var sh = fx.corpses[c];
      sh.t -= dt;
      if (sh.t <= 0) { fx.corpses.splice(c, 1); continue; }
      if (sh.flightT > 0) {                    // still airborne: full arc physics
        sh.flightT -= dt;
        sh.vy += sh.grav * dt;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        sh.rot += sh.rotV * dt;
      }                                         // flightT spent: it's landed, hold still
    }
    if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - 30 * dt);
    if (fx.aberration > 0) fx.aberration = Math.max(0, fx.aberration - 1.8 * dt);
    if (fx.neonFlash > 0) fx.neonFlash = Math.max(0, fx.neonFlash - dt / 1.6);
    if (fx.houseDip > 0) fx.houseDip = Math.max(0, fx.houseDip - dt / 0.9);   // act-break house lights come back up
    for (var d = fx.dust.length - 1; d >= 0; d--) {
      var du = fx.dust[d];
      du.y += du.vy * dt; du.life -= dt;
      if (du.life <= 0) fx.dust.splice(d, 1);
    }
    for (var r = fx.rings.length - 1; r >= 0; r--) {
      fx.rings[r].life -= dt;
      if (fx.rings[r].life <= 0) fx.rings.splice(r, 1);
    }
    for (var cs = fx.casings.length - 1; cs >= 0; cs--) {
      var ca = fx.casings[cs];
      ca.t -= dt;
      if (ca.t <= 0) { fx.casings.splice(cs, 1); continue; }
      ca.vy += ca.grav * dt;
      ca.x += ca.vx * dt; ca.y += ca.vy * dt;
      ca.rot += ca.rotV * dt;
    }
    if (fx.host) {
      fx.host.t -= dt;
      if (fx.host.t <= 0) { fx.host = null; fx.hostClearedAt = performance.now(); }
    }
  };

  DA.drawFxUnder = function (ctx) {   // floor stains + deflating corpses, under actors
    var casings = DA.fx.casings;      // brass glinting on the studio floor
    for (var ci = 0; ci < casings.length; ci++) {
      var cg = casings[ci];
      ctx.save();
      ctx.translate(cg.x, cg.y);
      ctx.rotate(cg.rot);
      ctx.globalAlpha = Math.min(1, cg.t / 0.18);
      ctx.fillStyle = '#c9a23c';
      ctx.fillRect(-2.4, -1, 4.8, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    var dust = DA.fx.dust;
    ctx.fillStyle = 'rgba(210, 200, 180, 0.5)';
    for (var du = 0; du < dust.length; du++) {
      var d = dust[du];
      ctx.globalAlpha = (d.life / d.maxLife) * 0.5;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(stainCanvas, 0, 0);                 // every splat + scorch, pre-baked
    var corpses = DA.fx.corpses;                     // flying glass-shard fragments
    var CORPSE_FADE_TAIL = 0.6;                       // stays fully solid until near the very end
    for (var c = 0; c < corpses.length; c++) {
      var sh = corpses[c];
      var k = sh.t > CORPSE_FADE_TAIL ? 1 : sh.t / CORPSE_FADE_TAIL;
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot);
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = sh.color;
      ctx.fillRect(-sh.w / 2, -sh.h / 2, sh.w, sh.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-sh.w / 2, -sh.h / 2, sh.w, sh.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  DA.drawFxOver = function (ctx) {    // particles + announcer, over actors
    var fx = DA.fx;
    for (var rg = 0; rg < fx.rings.length; rg++) {
      var ring = fx.rings[rg];
      var k = 1 - ring.life / ring.maxLife;
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.maxR * k, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
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
      if (!pop.lines) {                 // wrap once, on first draw — long announcer
        pop.lines = [];                 // lines were running off the screen edges
        var words = pop.text.split(' '), cur = '';
        for (var w = 0; w < words.length; w++) {
          var tryLine = cur ? cur + ' ' + words[w] : words[w];
          if (cur && ctx.measureText(tryLine).width > DA.W - 120) { pop.lines.push(cur); cur = words[w]; }
          else cur = tryLine;
        }
        if (cur) pop.lines.push(cur);
      }
      for (var li = 0; li < pop.lines.length; li++) {
        ctx.fillText(pop.lines[li], DA.W / 2, pop.y + li * 46);
      }
    }
    ctx.globalAlpha = 1;
  };

  // Act 1-4 draw from the act's pool with DISCIPLINE: no line ever repeats in
  // a run (st.saidLines), and he appears at most 4 times per room
  // (st.hostRoomCount, reset on room entry). Act 5 delivers its confession in
  // order, uncapped, then falls silent. When a pool runs dry he shuts up —
  // which, for this man, is the most alarming thing he can do.
  DA.presenterQuip = function (st) {
    var act = DA.presenterAct(st);
    if (act === 5) {
      if (!st) return ACT5[0];
      st.act5Idx = st.act5Idx || 0;
      if (st.act5Idx >= ACT5.length) return null;   // he has nothing left to say
      return ACT5[st.act5Idx++];
    }
    if (!st) return ACTS[act][0];
    if ((st.hostRoomCount || 0) >= 4) return null;  // he's said enough for this room
    st.saidLines = st.saidLines || {};
    var fresh = [];
    var pool = ACTS[act];
    for (var i = 0; i < pool.length; i++) if (!st.saidLines[pool[i]]) fresh.push(pool[i]);
    if (!fresh.length) return null;
    var line = fresh[Math.floor(Math.random() * fresh.length)];
    st.saidLines[line] = true;
    st.hostRoomCount = (st.hostRoomCount || 0) + 1;
    return line;
  };

  // one-line threat callouts, announced the first time each type appears in a run
  var THREATS = {
    shambler: 'SHAMBLER — SLOW. WEAK. THERE ARE SO MANY.',
    swarmer:  'SWARMER — WEAK ALONE. NEVER ALONE.',
    sprinter: 'SPRINTER — FAST. DO NOT STAND STILL.',
    boomer:   "BOOMER — DON'T LET IT GET CLOSE. SHOOT FROM RANGE.",
    stalker:  'STALKER — FADES OUT. FASTER WHEN YOU CAN BARELY SEE IT.',
    brute:    'BRUTE — SLOW, BUT IT HITS LIKE A CANCELLED CONTRACT.',
    spitter:  'SPITTER — LOBS BILE FROM ACROSS THE SET. SIDESTEP OR CLOSE IN.',
    gusher:   'GUSHER — HOSES A THREE-GLOB FAN. ONE SIDESTEP IS NOT ENOUGH.',
    mine:     'MINES — BURIED IN THE FLOOR. THE BLINK IS YOUR ONLY WARNING.'
  };
  DA.threatLine = function (type) { return THREATS[type]; };

  // Game-event hooks fired by combat.js / rooms.js
  DA.onKill = function (st, e, b) {          // b: the killing bullet, if any
    st.kills = (st.kills || 0) + 1;
    DA.burst(e.x, e.y, e.color, e.isBoss ? 60 : 12, b && b.dx, b && b.dy);
    if (e.isBoss || e.r >= 20) { DA.fx.hitStop = 0.05; DA.addAberration(0.55); }
    DA.splat(e.x, e.y, b && b.dx, b && b.dy);
    DA.corpse(e.x, e.y, e.r, e.color, b && b.dx, b && b.dy);
    DA.addShake(e.isBoss ? 14 : 3);
    if (DA.haptic && e.isBoss) DA.haptic(1, 350);
    if (DA.audio) DA.audio.splat(e.r);
    if (e.elite && st.powerups && DA.pickDropType && st.powerups.length < 3) {
      // a champion pays out — but never floods the floor, and rerolls
      // rather than duplicating a gift type already lying there
      var dtype = DA.pickDropType(st.player, st.lastGunDrop);
      for (var rr = 0; rr < 3; rr++) {
        var dupe = st.powerups.some(function (pu) { return pu.type === dtype; });
        if (!dupe) break;
        dtype = DA.pickDropType(st.player, st.lastGunDrop);
      }
      if (dtype.indexOf('gun_') === 0) st.lastGunDrop = dtype;
      st.powerups.push({ id: DA.newId(), type: dtype, t: 12, x: e.x, y: e.y });
      DA.burst(e.x, e.y, '#e8d44d', 18);
      if (DA.audio && DA.audio.elite) DA.audio.elite();
    }
  };
  DA.onPlayerHurt = function (st, sx, sy) {
    var p = st.player;
    DA.addShake(10);
    DA.addAberration(0.4);
    if (DA.haptic) DA.haptic(0.9, 130);
    DA.burst(p.x, p.y, '#c0392b', 16);
    p.hurtDir = (sx != null) ? Math.atan2(sy - p.y, sx - p.x) : null;
    p.hurtFlashT = 0.35;
    if (DA.audio) DA.audio.hurt();
  };
  DA.onWaveStart = function (n) {
    if (DA.audio) DA.audio.wave();
    // the presenter speaks ONCE per wave, a few seconds in — and waits for
    // any monster CAST SPOTLIGHT already using his window to actually
    // finish first, so he doesn't cut one off early
    var st = DA.state;
    if (st && st.mode === 'playing' && DA.presenterQuip) {
      var line = DA.presenterQuip(st);
      if (line) {
        // HOST_GAP: a beat of quiet after the corner clears before it's
        // allowed to pop up again — refilling it the instant it's free
        // read as a strobe once wave-to-wave pacing tightened up
        var HOST_GAP = 1800;
        var tryShow = function () {
          if (DA.state !== st || st.mode !== 'playing') return;
          if (DA.fx.host) { setTimeout(tryShow, 500); return; }   // still spotlighting — wait
          var sinceCleared = DA.fx.hostClearedAt ? performance.now() - DA.fx.hostClearedAt : HOST_GAP;
          if (sinceCleared < HOST_GAP) { setTimeout(tryShow, HOST_GAP - sinceCleared); return; }
          DA.hostSay(line);
        };
        setTimeout(tryShow, 5000);
      }
    }
  };
})();
