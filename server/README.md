# The relay

Two ways to run the pairing relay. The client is configured with `?relay=`
in the game URL, or `localStorage.deadset_relay`, or `window.SLASHTV_RELAY`.

**Local / any Node host:** `npm install ws && node server/relay.js`, then open
the game with `?relay=ws://localhost:8787`. Works as-is on Railway or Fly.

**Cloudflare (recommended for the public game):** `cd server && npx wrangler deploy`.
Point the client at `?relay=wss://slash-tv-relay.<your-subdomain>.workers.dev`.
The free tier covers a hobby game; idle rooms hibernate at no cost. The
Durable Object mirrors the Node relay's protocol, which is what the
integration test exercises.

Protocol: relay -> host `{t:'room',code}`; both `{t:'joined'}` on pairing;
`{t:'peer_left'}` on drop; everything else is forwarded verbatim.
