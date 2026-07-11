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
    }
  };

  // ---- music: a synthesized loop that thickens with the horde ----
  // A lookahead scheduler queues 8th notes at 126bpm. Layers by intensity:
  // title = sparse bass pulse; combat = kick + bass; big horde adds hats;
  // boss fights transpose darker and add a stab.
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
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var BASS = [45, 45, 48, 45, 43, 43, 50, 48];   // brooding A-minor line
  var mStep = 0, mNext = 0;
  function musicLevel() {
    var st = DA.state;
    if (!st || st.mode !== 'playing') return 0;  // menus: sparse pulse
    var n = st.enemies ? st.enemies.length : 0;
    if (st.enemies) for (var i = 0; i < st.enemies.length; i++) if (st.enemies[i].isBoss) return 3;
    return n > 60 ? 2 : (n > 0 ? 1 : 0.5);
  }
  setInterval(function () {
    if (!ctx || muted || ctx.state !== 'running') return;
    var spb = 60 / 126 / 2;                      // 8th notes @ 126bpm
    if (mNext < ctx.currentTime) mNext = ctx.currentTime + 0.05;
    while (mNext < ctx.currentTime + 0.3) {
      var lvl = musicLevel();
      var dark = lvl === 3 ? -3 : 0;             // boss key change
      if (mStep % 4 === 0 && lvl >= 1) noteAt(mNext, 105, 0.1, 'sine', lvl === 3 ? 0.5 : 0.38, 34); // kick
      if (mStep % 2 === 0) noteAt(mNext, hz(BASS[(mStep / 2) % 8] + dark), 0.17, 'sawtooth',
                                  lvl === 0 ? 0.035 : 0.08);                                        // bass
      if (mStep % 2 === 1 && lvl >= 2) noiseAt(mNext, 0.03, 0.05, 6000);                            // hats
      if (mStep % 8 === 6 && lvl === 3) noteAt(mNext, hz(57 + dark), 0.12, 'square', 0.06);         // stab
      mStep = (mStep + 1) % 16;
      mNext += spb;
    }
  }, 100);
})();
