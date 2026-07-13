(function () {
  // All sound is synthesized with WebAudio — no audio files. The context can
  // only start after a user gesture (browser autoplay rules), so we lazily
  // create/resume it on first input. M toggles mute.
  var ctx = null, master = null, musicGain = null, muted = false;
  var musicOn = true;
  try { musicOn = localStorage.getItem('deadset_music') !== '0'; } catch (e) {}

  function ensure() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();          // music has its own tap (N toggles it)
      musicGain.gain.value = musicOn ? 1.6 : 0;
      musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  window.addEventListener('mousedown', ensure);
  window.addEventListener('touchstart', ensure);
  // exposed so the settings screen can drive the same toggles as the hotkeys
  DA.toggleMute = function () {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.4;
    if (DA.announce) DA.announce(muted ? 'SOUND OFF' : 'SOUND ON');
    return !muted;
  };
  DA.soundOn = function () { return !muted; };
  DA.toggleMusic = function () {
    musicOn = !musicOn;
    try { localStorage.setItem('deadset_music', musicOn ? '1' : '0'); } catch (err) {}
    if (musicGain) musicGain.gain.value = musicOn ? 1.6 : 0;
    if (DA.announce) DA.announce(musicOn ? 'MUSIC ON' : 'MUSIC OFF');
    return musicOn;
  };
  DA.musicOn = function () { return musicOn; };
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyM') DA.toggleMute();
    if (e.code === 'KeyN') DA.toggleMusic();
    ensure();
  });

  // one oscillator with a pitch slide + fade-out envelope
  function blip(freq, dur, type, vol, endFreq) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur);
  }
  // filtered noise burst (shots, splats)
  function noise(dur, vol, filterFreq) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  DA.audio = {
    shot: function () {
      noise(0.05, 0.16, 2600);
      blip(300 + DA.rand(-40, 40), 0.05, 'square', 0.06, 90);
    },
    splat: function (r) {
      noise(0.14, 0.3, 500);
      // pitch tracks body size: swarmers pop high, brutes land with a thud
      var f = r ? DA.clamp(160 - r * 5, 55, 130) : 95;
      blip(f + DA.rand(-12, 12), 0.12, 'sine', 0.25, 40);
    },
    spit: function () {                  // a spitter hocks a glob
      blip(240, 0.1, 'sine', 0.12, 90);
      noise(0.07, 0.08, 800);
    },
    elite: function () {                 // champion down: the audience pays out
      blip(660, 0.09, 'square', 0.13, 880);
      setTimeout(function () { blip(880, 0.12, 'square', 0.12, 1100); }, 70);
    },
    comboUp: function (step) {           // multiplier steps up: pitch climbs with it
      blip(360 + Math.min(step || 1, 9) * 55, 0.1, 'triangle', 0.14, 700);
    },
    bossSting: function () {             // boss entrance / phase-2 enrage
      blip(110, 0.5, 'sawtooth', 0.28, 55);
      setTimeout(function () { blip(104, 0.55, 'sawtooth', 0.26, 52); }, 180);
      setTimeout(function () { noise(0.35, 0.3, 350); }, 340);
    },
    hurt: function () {
      blip(130, 0.28, 'sawtooth', 0.4, 45);
      noise(0.2, 0.25, 900);
    },
    groan: function () {
      blip(70 + DA.rand(0, 40), 0.6, 'sawtooth', 0.07, 50 + DA.rand(0, 20));
    },
    sting: function () {                 // announcer fanfare: quick rising arpeggio
      blip(440, 0.12, 'triangle', 0.12);
      setTimeout(function () { blip(554, 0.12, 'triangle', 0.12); }, 70);
      setTimeout(function () { blip(659, 0.2, 'triangle', 0.14); }, 140);
    },
    wave: function () {
      noise(0.25, 0.4, 300);
      blip(60, 0.3, 'sine', 0.4, 35);
    },
    pickup: function () {
      blip(520, 0.08, 'square', 0.15, 700);
      setTimeout(function () { blip(780, 0.14, 'square', 0.13, 1040); }, 60);
    },
    roar: function () {
      blip(160, 0.5, 'sawtooth', 0.3, 55);
      noise(0.4, 0.2, 400);
    },
    death: function () {                 // the final cut: thud, fall, and a thin ring
      noise(0.3, 0.4, 500);
      blip(180, 0.9, 'sawtooth', 0.35, 30);
      setTimeout(function () { blip(980, 1.6, 'sine', 0.05, 940); }, 350);
    },
    tick: function () {                  // gun crate about to expire
      blip(880, 0.08, 'square', 0.1, 1200);
    }
  };

  // ---- music: the show's pulse is literally a pulse ----
  // A lookahead scheduler beats the SAME lub-dub heartbeat at all times —
  // no separate quiet "resting" mode — locked to 123bpm, picking up to a
  // modest 1.25x (~154bpm) as the horde thickens or a boss takes the stage.
  // Hi-hats sneak in on top as the pressure climbs; the boss adds a dark
  // stab. On death the heart stumbles, slows, and gives out before the fade.
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function lub(t, vol) {                         // the two-part thump, always
    noteAt(t, 62, 0.16, 'sine', vol, 30);
    noteAt(t, 110, 0.09, 'triangle', vol * 0.45, 70);   // overtone so phone speakers carry it
    noteAt(t + 0.14, 52, 0.14, 'sine', vol * 0.75, 28);
  }
  // wave-gated, not headcount-scaled: HIGH the instant a wave starts sending
  // zombies through the doors, staying high through the quiet gaps BETWEEN
  // packs and through the last straggler, dropping only once the wave is
  // actually cleared. That keeps the tension constant through a room instead
  // of dipping every time a burst runs out.
  function intensity() {                         // -1 while dying
    var st = DA.state;
    if (!st) return 0;
    if (st.mode === 'dying') return -1;
    if (st.mode !== 'playing') return 0;
    if (st.enemies) {
      for (var i = 0; i < st.enemies.length; i++) if (st.enemies[i].isBoss) return 1;
    }
    var wm = st.waveManager;
    var waveActive = wm && !wm.done && wm.spawners;            // still sending zombies through a door
    var enemiesOnScreen = st.enemies && st.enemies.length > 0; // or stragglers still standing
    return (waveActive || enemiesOnScreen) ? 0.9 : 0.06;
  }
  var beatNext = 0, beatNo = 0;
  setInterval(function () {
    if (!ctx || muted || ctx.state !== 'running') return;
    if (beatNext < ctx.currentTime) beatNext = ctx.currentTime + 0.05;
    while (beatNext < ctx.currentTime + 0.35) {
      var k = intensity();
      if (k < 0) {                               // dying: the heart gives out
        var st = DA.state;
        var gone = st.deathT == null ? 1 : DA.clamp(1 - st.deathT / (DA.DEATH_T || 3.8), 0, 1);
        if (gone < 0.72) lub(beatNext, 0.55 * (1 - gone));
        beatNext += 0.8 + gone * 1.4;            // each beat further apart, then nothing
        beatNo++;
        continue;
      }
      // the heart LOCKS to 123bpm and pounds AT ALL TIMES, picking up to
      // 1.25x once a wave is live — never a slower "resting" cadence, just
      // the same lub-dub racing a little faster, not doubling into a rave
      var T123 = 60 / 123;
      var T = k >= 0.5 ? T123 / 1.25 : T123;
      lub(beatNext, 0.55 + k * 0.35);
      if (k > 0.35) {                             // a double hat, every other beat...
        var hatEvery = k >= 1 ? 1 : 2;             // ...or every beat once things get dire (boss up)
        if (beatNo % hatEvery === 0) {
          noiseAt(beatNext + T / 2, 0.025, 0.03 + k * 0.045, 7000);
          noiseAt(beatNext + T * 0.75, 0.02, 0.025 + k * 0.04, 7500);
        }
      }
      if (k >= 1 && beatNo % 4 === 2) noteAt(beatNext, hz(45), 0.14, 'square', 0.07); // boss stab
      beatNo++;
      beatNext += T;
    }
  }, 100);
  function noteAt(t, freq, dur, type, vol, endFreq) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + dur);
  }
  function noiseAt(t, dur, vol, filterFreq) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = filterFreq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t);
  }

})();
