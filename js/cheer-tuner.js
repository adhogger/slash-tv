(function () {
  // Debug-only live tuning panel for the crowd cheer sound. Never loads
  // unless the URL has ?tune=1 (or #tune) — completely invisible during
  // normal play. Sliders write straight into DA.audio.cheerParams (the same
  // object js/audio.js reads every time cheer() runs), so dragging one and
  // hitting "PREVIEW CHEER" hears the change immediately. "Copy settings"
  // dumps the current values as text to paste back for baking into the code.
  if (location.search.indexOf('tune') === -1 && location.hash.indexOf('tune') === -1) return;

  function init() {
    if (!window.DA || !DA.audio || !DA.audio.cheerParams) { setTimeout(init, 100); return; }
    buildPanel(DA.audio.cheerParams);
  }
  window.addEventListener('load', function () { setTimeout(init, 200); });

  function buildPanel(P) {
    var DEFAULTS = {};
    for (var k in P) DEFAULTS[k] = P[k];
    var sliderEls = {};

    function makeSlider(key, label, min, max, step) {
      var row = document.createElement('div');
      row.style.cssText = 'margin-bottom:8px;';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'display:flex;justify-content:space-between;color:#ccc;font-size:11px;margin-bottom:2px;';
      var name = document.createElement('span'); name.textContent = label;
      var val = document.createElement('span'); val.style.color = '#ffd76a'; val.textContent = P[key];
      lbl.appendChild(name); lbl.appendChild(val);
      var input = document.createElement('input');
      input.type = 'range'; input.min = min; input.max = max; input.step = step;
      input.value = P[key];
      input.style.width = '100%';
      input.oninput = function () {
        P[key] = parseFloat(input.value);
        val.textContent = P[key];
      };
      sliderEls[key] = { input: input, val: val };
      row.appendChild(lbl); row.appendChild(input);
      return row;
    }

    function refreshAll() {
      for (var key in sliderEls) {
        sliderEls[key].input.value = P[key];
        sliderEls[key].val.textContent = P[key];
      }
    }

    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:8px;right:8px;width:300px;max-height:96vh;overflow-y:auto;'
      + 'background:rgba(10,10,16,0.95);border:2px solid #d4a017;border-radius:8px;padding:12px;'
      + 'font:12px monospace;color:#eee;z-index:99999;box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    var title = document.createElement('div');
    title.textContent = 'CHEER TUNER';
    title.style.cssText = 'font-weight:bold;font-size:14px;color:#ffd76a;margin-bottom:10px;';
    panel.appendChild(title);

    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ PREVIEW CHEER';
    playBtn.style.cssText = 'width:100%;padding:10px;margin-bottom:10px;background:#2e7d32;color:#fff;'
      + 'border:none;border-radius:4px;font-weight:bold;font-size:13px;cursor:pointer;';
    playBtn.onclick = function () { DA.audio.cheer(); };
    panel.appendChild(playBtn);

    var groups = [
      { title: 'Low rumble (background body)', fields: [
        ['rumbleCount', 'How many rumble layers', 0, 10, 1],
        ['rumbleVol', 'Rumble loudness', 0, 0.4, 0.01],
        ['rumbleFreqBase', 'Rumble pitch (low = deeper)', 60, 300, 5],
        ['rumbleQ', 'Rumble tone narrowness', 0.3, 3, 0.1]
      ] },
      { title: 'Shouts (the crowd voices)', fields: [
        ['shoutCount', 'How many voices', 0, 320, 5],
        ['shoutDurMin', 'Shortest shout (seconds)', 0.02, 1, 0.01],
        ['shoutDurMax', 'Longest shout (seconds)', 0.02, 1.5, 0.01],
        ['shoutVolMin', 'Quietest shout', 0, 0.6, 0.01],
        ['shoutVolMax', 'Loudest shout', 0, 0.6, 0.01],
        ['shoutPitchMin', 'Lowest shout pitch (voice fundamental)', 60, 800, 10],
        ['shoutPitchMax', 'Highest shout pitch', 60, 800, 10],
        ['formantMin', 'Lowest tone-color center', 400, 4000, 20],
        ['formantMax', 'Highest tone-color center', 400, 4000, 20],
        ['formantQMin', 'Tightest tone-color focus', 0.3, 8, 0.1],
        ['formantQMax', 'Widest tone-color focus', 0.3, 8, 0.1],
        ['panSpread', 'Stereo width (left-right spread)', 0, 1, 0.05]
      ] },
      { title: 'Overall shape (seconds)', fields: [
        ['swellT', 'Build-up time', 0.1, 3, 0.05],
        ['holdT', 'Full-volume hold time', 1, 10, 0.1],
        ['fadeT', 'Total length (end of fade)', 2, 15, 0.1]
      ] }
    ];
    groups.forEach(function (grp) {
      var h = document.createElement('div');
      h.textContent = grp.title;
      h.style.cssText = 'margin:10px 0 6px;color:#7ec7e0;font-weight:bold;border-top:1px solid #333;padding-top:8px;';
      panel.appendChild(h);
      grp.fields.forEach(function (f) {
        panel.appendChild(makeSlider(f[0], f[1], f[2], f[3], f[4]));
      });
    });

    var codeBox = document.createElement('textarea');
    codeBox.style.cssText = 'width:100%;height:140px;margin-top:8px;display:none;font:10px monospace;'
      + 'background:#111;color:#8f8;border:1px solid #333;border-radius:4px;';
    codeBox.readOnly = true;

    function showCode() {
      var lines = [];
      for (var key in P) lines.push('    ' + key + ': ' + P[key] + ',');
      codeBox.value = lines.join('\n');
      codeBox.style.display = 'block';
      codeBox.focus(); codeBox.select();
    }

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:12px;';
    var resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.style.cssText = 'flex:1;padding:8px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    resetBtn.onclick = function () {
      for (var key in DEFAULTS) P[key] = DEFAULTS[key];
      refreshAll();
    };
    var copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy settings';
    copyBtn.style.cssText = 'flex:1;padding:8px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    copyBtn.onclick = showCode;
    btnRow.appendChild(resetBtn); btnRow.appendChild(copyBtn);
    panel.appendChild(btnRow);
    panel.appendChild(codeBox);

    var hint = document.createElement('div');
    hint.textContent = 'Drag sliders, hit Preview to listen. When it sounds right, hit "Copy settings" and send those numbers back.';
    hint.style.cssText = 'margin-top:8px;color:#888;font-size:10px;line-height:1.4;';
    panel.appendChild(hint);

    document.body.appendChild(panel);
  }
})();
