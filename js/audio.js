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

  // one oscillator with a pitch slide + fade-out envelope. dest lets a
  // caller route into its own gain node (e.g. a shared swell envelope)
  // instead of straight to the SFX bus.
  function blip(freq, dur, type, vol, endFreq, dest) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(dest || master);
    osc.start(t); osc.stop(t + dur);
  }
  // filtered noise burst (shots, splats)
  function noise(dur, vol, filterFreq, dest) {
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
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t);
  }
  // band-limited noise centered in the vocal range, with a soft swell-in —
  // reads as a roaring crowd instead of static, unlike a plain lowpass hiss
  function crowdNoise(dur, vol, centerFreq, q, dest, pan) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = centerFreq; f.Q.value = q || 1.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g);
    // optional stereo spread — scattering voices left/right makes a crowd
    // feel wide and populated instead of coming from one point in space
    if (pan != null && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(dest || master);
    } else {
      g.connect(dest || master);
    }
    src.start(t);
  }
  // a single "voice": 2 detuned sawtooth oscillators (a real shout has
  // pitch + harmonics, not just breath noise), pushed through a resonant
  // formant filter and given a falling pitch glide, like someone actually
  // yelling. This is the tonal counterpart to crowdNoise — measurement
  // against a real crowd recording showed the reference is dominated by
  // pitched/harmonic content, not flat noise, which noise alone can't fake.
  function crowdVoice(dur, vol, pitchHz, formantFreq, formantQ, dest, pan) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    var formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = formantFreq;
    formant.Q.value = formantQ;
    formant.connect(g);
    var voices = 2;
    for (var v = 0; v < voices; v++) {
      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = (v - (voices - 1) / 2) * (10 + Math.random() * 14);
      osc.frequency.setValueAtTime(pitchHz, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, pitchHz * (0.7 + Math.random() * 0.2)), t + dur);
      osc.connect(formant);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    var out = dest || master;
    if (pan != null && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(out);
    } else {
      g.connect(out);
    }
  }

  // tunable knobs for the crowd cheer, exposed on DA.audio.cheerParams so a
  // debug panel (js/cheer-tuner.js, add ?tune=1 to the URL) can dial them in
  // live while actually hearing the result, instead of guessing blind
  // pitch/formant ranges below come from measuring a real crowd cheer
  // clip: energy was concentrated in the 1200-3000Hz band (48% of total)
  // with 400-1200Hz next (30%) — and critically, spectral flatness was
  // very low (~0.08 out of 1), meaning the sound is dominated by tonal/
  // harmonic content, not flat noise. That's the formantMin/Max range.
  var cheerParams = {
    rumbleCount: 10, rumbleVol: 0.4, rumbleFreqBase: 300, rumbleFreqRange: 60, rumbleQ: 3, rumbleDur: 3.2,
    shoutCount: 320, shoutDurMin: 0.02, shoutDurMax: 0.02, shoutVolMin: 0.8, shoutVolMax: 0.8,
    shoutPitchMin: 160, shoutPitchMax: 420, formantMin: 1580, formantMax: 2080,
    formantQMin: 6, formantQMax: 3.4, panSpread: 0.9,
    swellT: 0.4, holdT: 6, fadeT: 12.3
  };

  DA.audio = {
    cheerParams: cheerParams,
    shot: function () {
      noise(0.05, 0.28, 2600);
      blip(300 + DA.rand(-40, 40), 0.05, 'square', 0.11, 90);
    },
    splat: function (r) {
      noise(0.14, 0.46, 500);
      // pitch tracks body size: swarmers pop high, brutes land with a thud
      var f = r ? DA.clamp(160 - r * 5, 55, 130) : 95;
      blip(f + DA.rand(-12, 12), 0.12, 'sine', 0.38, 40);
    },
    spit: function () {                  // a spitter hocks a glob
      blip(240, 0.1, 'sine', 0.18, 90);
      noise(0.07, 0.13, 800);
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
      blip(70 + DA.rand(0, 40), 0.6, 'sawtooth', 0.05, 50 + DA.rand(0, 20));
    },
    cheer: function () {              // the crowd loses it — many short shouts, not a held hiss
      if (muted || !ensure()) return;
      var P = cheerParams;
      var t0 = ctx.currentTime;
      // one shared envelope for the whole cheer: swells up like a real crowd
      // reacting, holds, then tails off gradually — instead of every layer
      // just being its own independent blip with no overall shape
      var envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0.0001, t0);
      envelope.gain.exponentialRampToValueAtTime(1, t0 + P.swellT);
      // a real crowd doesn't hold a dead-flat plateau — it surges and dips
      // as different pockets peak at different moments. A few randomized
      // waypoints between the swell and the fade recreate that instead of
      // one static "on" value the whole time.
      var holdSpan = Math.max(0.1, P.holdT - P.swellT);
      for (var wpt = 1; wpt <= 3; wpt++) {
        envelope.gain.linearRampToValueAtTime(0.72 + Math.random() * 0.28,
          t0 + P.swellT + (holdSpan * wpt) / 4);
      }
      envelope.gain.linearRampToValueAtTime(1, t0 + P.holdT);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + P.fadeT);
      envelope.connect(master);
      // low rumble bed: the "body" a stadium crowd has underneath the
      // shouting — a few long, low, staggered layers so it never gaps
      for (var r = 0; r < P.rumbleCount; r++) {
        (function () {
          setTimeout(function () {
            crowdNoise(P.rumbleDur, P.rumbleVol, P.rumbleFreqBase + Math.random() * P.rumbleFreqRange, P.rumbleQ, envelope);
          }, Math.random() * Math.max(1, P.fadeT - P.rumbleDur) * 1000);
        })();
      }
      // the shouts: many short, PITCHED voice bursts (crowdVoice), densely
      // overlapping, each with its own falling pitch glide like someone
      // actually yelling — not filtered noise. Each gets a random stereo
      // position so the crowd feels wide, not like it's all one point.
      var shoutSpan = Math.max(0.2, P.fadeT - 0.2);
      for (var i = 0; i < P.shoutCount; i++) {
        (function () {
          setTimeout(function () {
            var dur = P.shoutDurMin + Math.random() * Math.max(0, P.shoutDurMax - P.shoutDurMin);
            var vol = P.shoutVolMin + Math.random() * Math.max(0, P.shoutVolMax - P.shoutVolMin);
            var pitch = P.shoutPitchMin + Math.random() * Math.max(0, P.shoutPitchMax - P.shoutPitchMin);
            var formantFreq = P.formantMin + Math.random() * Math.max(0, P.formantMax - P.formantMin);
            var formantQ = P.formantQMin + Math.random() * Math.max(0, P.formantQMax - P.formantQMin);
            var pan = Math.random() * P.panSpread * 2 - P.panSpread;
            crowdVoice(dur, vol, pitch, formantFreq, formantQ, envelope, pan);
          }, Math.random() * shoutSpan * 1000);
        })();
      }
      // camera flashes: a dense flurry up front, not spread across the whole cheer
      if (DA.broadcast && DA.broadcast.flashBurst) {
        for (var fb = 0; fb < 32; fb++) {
          (function (delay) {
            setTimeout(function () { DA.broadcast.flashBurst(2 + Math.floor(Math.random() * 3)); }, delay);
          })(DA.rand(0, 2200));
        }
      }
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

  // ---- music: two pulses, never at once ----
  // A lookahead scheduler drives either the in-game heartbeat OR a 32-bit-
  // style menu theme — the heartbeat only exists once a room is actually
  // live (playing/dying); title, intro, gameover and winner all get the
  // menu loop instead. Locked to 123bpm, picking up to a modest 1.25x
  // (~154bpm) as the horde thickens or a boss takes the stage — the boss
  // adds a dark stab. On death the heart stumbles, slows, and gives out
  // before the fade.
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // exposed so the HUD can pulse the heart icons in time with the actual
  // scheduled thump instead of guessing — updated every time lub() fires
  var lastLubTime = -99, lastLubPeriod = 60 / 123;
  DA.audio.heartPulse = function () {
    if (!ctx) return 0;
    var elapsed = ctx.currentTime - lastLubTime;
    if (elapsed < 0 || elapsed > lastLubPeriod) return 0;
    return Math.max(0, 1 - elapsed / (lastLubPeriod * 0.4));
  };
  function lub(t, vol, period) {                 // the two-part thump, always
    noteAt(t, 62, 0.16, 'sine', vol, 30);
    noteAt(t, 110, 0.09, 'triangle', vol * 0.45, 70);   // overtone so phone speakers carry it
    noteAt(t + 0.14, 52, 0.14, 'sine', vol * 0.75, 28);
    lastLubTime = t; lastLubPeriod = period || lastLubPeriod;
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
  function inShow() {                            // true once the contestant is actually on set
    var st = DA.state;
    return !!st && (st.mode === 'playing' || st.mode === 'dying');
  }
  // 80s-synthwave menu theme: a four-on-the-floor kick, a light off-beat
  // tick, a bouncing bass, and a DRIVING 16th-note arpeggio lead — upbeat,
  // not a dirge. Loops a classic Am-F-C-G. Cuts out the instant the first
  // room starts and the heartbeat takes over.
  // Pushed faster and lower: root dropped 5 semitones, the arp pulled down
  // a fifth so it sits closer to the bass instead of soaring above it, and
  // both switched from 'square' (bright/buzzy) to 'triangle' (rounder,
  // warmer) — reads as lower even where the actual pitch barely moves.
  var MENU_BPM = 132, MENU_T = 60 / MENU_BPM, MENU_STEP = MENU_T / 4;
  var MENU_CHORDS = [0, -4, 3, -2];               // Am, F, C, G (semitones from A2)
  var MENU_BASS = [0, 0, 12, 7];                  // root-root-octave-fifth, one per beat
  var MENU_ARP = [
    [5, 12, 8, 12],     // 16th-note cell over Am
    [1, 8, 5, 8],        // over F
    [8, 15, 12, 15],     // over C
    [3, 10, 7, 10]       // over G
  ];
  var T123 = 60 / 123;                              // the show's canonical resting heart rate
  var beatNext = 0, beatNo = 0, menuNext = 0, menuStep = 0, menuHeartNext = 0;
  setInterval(function () {
    if (!ctx || muted || ctx.state !== 'running') return;
    if (!inShow()) {
      beatNo = 0;                                // resync the heartbeat to beat 1 for next time
      // a quiet lub-dub under the music — the show hasn't started, but the
      // pulse is always there, just background presence instead of the lead
      if (menuHeartNext < ctx.currentTime) menuHeartNext = ctx.currentTime + 0.05;
      while (menuHeartNext < ctx.currentTime + 0.35) {
        lub(menuHeartNext, 0.22, T123);
        menuHeartNext += T123;
      }
      if (menuNext < ctx.currentTime) menuNext = ctx.currentTime + 0.05;
      while (menuNext < ctx.currentTime + 0.35) {
        var bar = Math.floor(menuStep / 16) % 4;
        var beatIn = Math.floor(menuStep / 4) % 4;
        var sub = menuStep % 4;
        if (sub === 0) {                          // kick, once per beat — four on the floor
          noteAt(menuNext, 130, 0.09, 'sine', 0.14, 40);
          noteAt(menuNext, hz(40 + MENU_CHORDS[bar] + MENU_BASS[beatIn]), MENU_STEP * 3.2, 'triangle', 0.15);
        }
        if (sub === 2) noiseAt(menuNext, 0.035, 0.04, 7500);   // light off-beat tick
        noteAt(menuNext, hz(40 + MENU_ARP[bar][sub]), MENU_STEP * 0.85, 'triangle', 0.11);
        menuStep++;
        menuNext += MENU_STEP;
      }
      return;
    }
    menuStep = 0;                                  // resync the menu loop to bar 1 for next time
    menuHeartNext = 0;                              // resync the background pulse for next time too
    if (beatNext < ctx.currentTime) beatNext = ctx.currentTime + 0.05;
    while (beatNext < ctx.currentTime + 0.35) {
      var k = intensity();
      if (k < 0) {                               // dying: the heart gives out
        var st = DA.state;
        var gone = st.deathT == null ? 1 : DA.clamp(1 - st.deathT / (DA.DEATH_T || 3.8), 0, 1);
        var period = 0.8 + gone * 1.4;
        if (gone < 0.72) lub(beatNext, 0.55 * (1 - gone), period);
        beatNext += period;                       // each beat further apart, then nothing
        beatNo++;
        continue;
      }
      // the heart LOCKS to 123bpm and pounds AT ALL TIMES once the show has
      // started, picking up to 1.25x once a wave is live — never a slower
      // "resting" cadence, just the same lub-dub racing a little faster
      var T = k >= 0.5 ? T123 / 1.25 : T123;
      lub(beatNext, 0.55 + k * 0.35, T);
      if (k > 0.35) {                             // a double hat, every other beat...
        var hatEvery = k >= 0.9 ? 1 : 2;           // ...or every beat once combat's live (boss OR a room fight)
        if (beatNo % hatEvery === 0) {
          hatAt(beatNext + T / 2, 0.03 + k * 0.045, 0.1 + k * 0.03);
          hatAt(beatNext + T * 0.75, 0.025 + k * 0.04, 0.08 + k * 0.025);
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
  // a splashy cymbal hit, not a dry click: two layered noise bursts (a
  // lower body layer plus a brighter top layer) with a real ring-out —
  // short single-band noiseAt bursts read as a "tick", too close to the
  // crowd's own short bright shout/clap texture
  function hatAt(t, vol, dur) {
    noiseAt(t, dur, vol, 5000);
    noiseAt(t, dur * 0.8, vol * 0.65, 9500);
  }

})();
