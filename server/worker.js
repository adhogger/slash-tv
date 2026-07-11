// Cloudflare Worker + Durable Object version of the relay. Same protocol as
// relay.js, tested there; this file is the deploy target (wrangler deploy).
// One Durable Object per room code; WebSocket hibernation keeps idle rooms free.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code4 = () => Array.from({ length: 4 },
  () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('SLASH TV relay (Durable Objects)', { status: 200 });
    }
    let code = url.searchParams.get('join');
    const hosting = url.searchParams.get('host');
    if (hosting) code = code4();
    if (!code) return new Response('host=1 or join=CODE required', { status: 400 });
    code = code.toUpperCase();
    const room = env.RELAY_ROOM.get(env.RELAY_ROOM.idFromName(code));
    url.searchParams.set('code', code);
    return room.fetch(new Request(url, req));
  }
};

export class RelayRoom {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const role = url.searchParams.get('host') ? 'host' : 'guest';
    const sockets = this.state.getWebSockets();
    const hasHost = sockets.some(s => s.deserializeAttachment()?.role === 'host');
    if (role === 'host' && hasHost) return new Response('room taken', { status: 409 });
    if (role === 'guest' && (!hasHost || sockets.length >= 2)) {
      return new Response('no such room', { status: 404 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role, code });
    if (role === 'host') pair[1].send(JSON.stringify({ t: 'room', code }));
    else {
      for (const s of this.state.getWebSockets()) s.send(JSON.stringify({ t: 'joined' }));
    }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws, msg) {
    const me = ws.deserializeAttachment()?.role;
    for (const s of this.state.getWebSockets()) {
      if (s !== ws && s.deserializeAttachment()?.role !== me) s.send(msg);
    }
  }
  webSocketClose(ws) {
    const me = ws.deserializeAttachment()?.role;
    for (const s of this.state.getWebSockets()) {
      if (s !== ws) s.send(JSON.stringify({ t: 'peer_left' }));
    }
    if (me === 'host') for (const s of this.state.getWebSockets()) s.close();
  }
}
