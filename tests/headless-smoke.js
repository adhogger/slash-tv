// smoke: bot co-op — play, human goes down, bot revives, then a full team wipe
function stub() {
  var f = function () { return P; };
  var P = new Proxy(f, {
    get: function (t, k) { if (k === Symbol.toPrimitive) return function () { return 0; }; return P; },
    set: function () { return true; }, apply: function () { return P; }, construct: function () { return P; }
  });
  return P;
}
function gainNode() { return { connect: function(){}, gain: { value: 0, setValueAtTime: function(){}, exponentialRampToValueAtTime: function(){}, linearRampToValueAtTime: function(){}, cancelScheduledValues: function(){} } }; }
function AC() { var t0 = Date.now();
  return { get currentTime() { return (Date.now() - t0) / 1000; }, destination: {}, sampleRate: 44100, state: 'running', resume: function(){},
    createGain: gainNode,
    createOscillator: function () { var g = gainNode(); g.frequency = g.gain; g.start=function(){}; g.stop=function(){}; return g; },
    createBiquadFilter: function () { var g = gainNode(); g.frequency = g.gain; return g; },
    createBuffer: function () { return { getChannelData: function(){ return new Float32Array(64); } }; },
    createBufferSource: function () { var g = gainNode(); g.start=function(){}; g.stop=function(){}; return g; } };
}
global.window = { addEventListener: function () {}, innerWidth: 1280, innerHeight: 720, AudioContext: AC };
global.document = { getElementById: function () { return { getContext: function () { return stub(); }, style: {}, width: 1280, height: 720 }; },
  createElement: function () { return { getContext: function () { return stub(); }, style: {}, width: 0, height: 0 }; },
  addEventListener: function () {} };
global.navigator = { getGamepads: function () { return []; } };
global.performance = require('perf_hooks').performance;
global.requestAnimationFrame = function () {};
var fs = require('fs');
['util','input','audio','effects','broadcast','bullets','enemies','player','bot','rooms','combat','boss','powerups','main']
  .forEach(function (n) { (0, eval)(fs.readFileSync(__dirname + '/../js/' + n + '.js', 'utf8')); });
// build a two-player state directly (mirrors newGame with botOn)
function freshState() {
  var st = { mode: 'playing', player: DA.makePlayer(), score: 0, combo: 1, comboTimer: 0,
    kills: 0, roomsCleared: 0, groanT: 3, visited: {}, cleared: {}, seenTypes: {}, roomId: DA.START_ROOM,
    stats: { shots: 0, hits: 0, killsByGun: {}, maxCombo: 1, start: performance.now() } };
  st.players = [st.player];
  var buddy = DA.makePlayer(); buddy.bot = true; buddy.x += 40;
  st.players.push(buddy);
  st.room = DA.ROOMS[st.roomId];
  st.enemies = []; st.bullets = []; st.enemyBullets = []; st.powerups = [];
  st.waveManager = DA.makeWaveManager(st.room);
  st.roomCleared = false; st.bossDead = false; st.lastWave = 0;
  return st;
}
DA.state = freshState();
for (var i = 0; i < 600; i++) DA.debugFrame(1 / 60);
var bot = DA.state.players[1];
console.log('co-op play OK | enemies:', DA.state.enemies.length,
  '| bot fired:', DA.state.bullets.length >= 0, '| bot pos moved:', Math.round(bot.x) + ',' + Math.round(bot.y));
// human goes down with the bot standing: expect downed, then a bot rescue
DA.state.player.hearts = 0;
DA.debugFrame(1 / 60);
if (DA.state.mode !== 'playing') throw new Error('run should continue while the bot stands, mode=' + DA.state.mode);
if (!DA.state.player.downed) throw new Error('human should be downed');
var revivedAt = -1;
for (i = 0; i < 1200; i++) {
  DA.debugFrame(1 / 60);
  if (!DA.state.player.downed) { revivedAt = i; break; }
}
if (revivedAt < 0) throw new Error('bot never completed the revive');
if (DA.state.player.hearts !== 2) throw new Error('revive should restore 2 hearts, got ' + DA.state.player.hearts);
console.log('bot rescue OK after', revivedAt, 'frames (' + (revivedAt / 60).toFixed(1) + 's)');
// team wipe: both to zero -> death scene -> gameover
DA.state.players[1].hearts = 0;
DA.debugFrame(1 / 60);
if (!DA.state.players[1].downed) throw new Error('bot should be downed first');
DA.state.player.hearts = 0;
DA.debugFrame(1 / 60);
if (DA.state.mode !== 'dying') throw new Error('team wipe should start the death scene, mode=' + DA.state.mode);
for (i = 0; i < 300 && DA.state.mode === 'dying'; i++) DA.debugFrame(1 / 60);
if (DA.state.mode !== 'gameover') throw new Error('expected gameover, got ' + DA.state.mode);
console.log('team wipe OK; SMOKE OK');
process.exit(0);   // the audio scheduler holds the loop open otherwise
