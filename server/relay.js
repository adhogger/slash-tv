// Slash TV relay: pairs two browsers by room code and forwards their messages.
// It knows nothing about zombies. Run locally:
//   npm install ws && node server/relay.js        (defaults to port 8787)
// Then open the game with  ?relay=ws://localhost:8787
var http = require('http');
var WebSocket = require('ws');

var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no lookalikes
function makeCode(rooms) {
  for (;;) {
    var c = '';
    for (var i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!rooms[c]) return c;
  }
}

function start(port, onReady) {
  var rooms = {};                                    // code -> { host, guest }
  var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('SLASH TV relay: ' + Object.keys(rooms).length + ' room(s) live\n');
  });
  var wss = new WebSocket.Server({ server: server });

  wss.on('connection', function (ws, req) {
    var q = new URL(req.url, 'http://x').searchParams;
    if (q.get('host')) {
      var code = makeCode(rooms);
      rooms[code] = { host: ws, guest: null };
      ws._room = code; ws._role = 'host';
      ws.send(JSON.stringify({ t: 'room', code: code }));
    } else if (q.get('join')) {
      var r = rooms[(q.get('join') || '').toUpperCase()];
      if (!r || r.guest || r.host.readyState !== WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'err', why: 'no such room' }));
        return ws.close();
      }
      r.guest = ws;
      ws._room = (q.get('join') || '').toUpperCase(); ws._role = 'guest';
      r.host.send(JSON.stringify({ t: 'joined' }));
      ws.send(JSON.stringify({ t: 'joined' }));
    } else {
      return ws.close();
    }

    ws.on('message', function (data, isBinary) {     // pure forwarding
      var r = rooms[ws._room];
      if (!r) return;
      var peer = ws._role === 'host' ? r.guest : r.host;
      if (peer && peer.readyState === WebSocket.OPEN) {
        peer.send(data, { binary: isBinary });
      }
    });
    ws.on('close', function () {
      var r = rooms[ws._room];
      if (!r) return;
      var peer = ws._role === 'host' ? r.guest : r.host;
      if (peer && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ t: 'peer_left' }));
      }
      if (ws._role === 'host') delete rooms[ws._room];   // host gone: show's over
      else r.guest = null;                               // guest gone: seat reopens
    });
  });

  server.listen(port, function () {
    if (onReady) onReady(server.address().port);
    else console.log('SLASH TV relay listening on :' + server.address().port);
  });
  return server;
}

if (require.main === module) start(process.env.PORT || 8787);
module.exports = { start: start };
