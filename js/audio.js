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
      musicGain.gain.value = musicOn ? 1 : 0;
      musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  window.addEventListener('mousedown', ensure);
  window.addEventListener('touchstart', ensure);
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyM') {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.4;
      if (DA.announce) DA.announce(muted ? 'SOUND OFF' : 'SOUND ON');
    }
    if (e.code === 'KeyN') {
      musicOn = !musicOn;
      try { localStorage.setItem('deadset_music', musicOn ? '1' : '0'); } catch (err) {}
      if (musicGain) musicGain.gain.value = musicOn ? 1 : 0;
      if (DA.announce) DA.announce(musicOn ? 'MUSIC ON' : 'MUSIC OFF');
    }
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
    splat: function () {
      noise(0.14, 0.3, 500);
      blip(95 + DA.rand(-15, 15), 0.12, 'sine', 0.25, 40);
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
  // A lookahead scheduler beats a slow heartbeat that quickens with the horde:
  // an empty set idles near 40bpm, a packed one races toward 120. Hi-hats
  // sneak in on top as the pressure climbs; the boss adds a dark stab. On
  // death the heart stumbles, slows, and gives out before the fade.
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function lub(t, vol) {                         // the two-part thump
    noteAt(t, 62, 0.15, 'sine', vol, 30);
    noteAt(t + 0.13, 52, 0.13, 'sine', vol * 0.6, 28);
  }
  function intensity() {                         // 0..1 from the horde; -1 while dying
    var st = DA.state;
    if (!st) return 0;
    if (st.mode === 'dying') return -1;
    if (st.mode !== 'playing') return 0;         // menus idle at a faint resting pulse
    if (st.enemies) {
      for (var i = 0; i < st.enemies.length; i++) if (st.enemies[i].isBoss) return 1;
      return DA.clamp(st.enemies.length / 50, 0.06, 1);
    }
    return 0.06;
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
      var T = 1.5 - k * 1.0;                     // beat interval: 1.5s calm -> 0.5s frantic
      lub(beatNext, k <= 0.06 ? 0.22 : 0.3 + k * 0.3);
      if (k > 0.35) {                            // hats sneak in over the beat
        var sub = k > 0.65 ? 4 : 2;
        for (var h = 1; h < sub; h++) noiseAt(beatNext + (T / sub) * h, 0.025, 0.03 + k * 0.045, 7000);
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
