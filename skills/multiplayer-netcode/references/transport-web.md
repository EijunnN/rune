# Transports — Pipes, Their Personalities, and the Web's Rules

The transport decides which reliability/ordering/latency trade-offs are even *available* to your netcode. Choose per SKILL.md #9's two message classes (state: unreliable-unordered-newest-wins; events: reliable), then pick the pipe(s) that can express both.

## The native baseline (for reference and for Rust servers)

Raw **UDP** is the genre's home: datagrams, no ordering, no reliability — you build exactly the semantics you need on top (acks, sequences, channels). Rust: **renet** / netcode.io-style (channels + connection tokens + encryption solved), quinn (QUIC) for reliable streams + datagrams together. TCP appears in native games only for lobby/meta traffic — its total ordering means one lost packet stalls *everything behind it* (head-of-line blocking), poison for realtime state.

## The web's menu (browsers can't UDP)

| Transport | Semantics | Reality check |
| --- | --- | --- |
| **WebSocket** | reliable, ordered (TCP) | Universally supported, trivial to ship, HOL-blocking under loss. The right *default* for turn-based, casual co-op, and every lobby. |
| **WebRTC DataChannel** | configurable! `ordered:false, maxRetransmits:0` = UDP-like | The web's unreliable channel. Cost: signaling dance + ICE/STUN/TURN infrastructure — pain justified by twitch games. Client↔*server* WebRTC (server as peer: geckos.io, or native libs) avoids P2P NAT chaos while keeping UDP-ish semantics. |
| **WebTransport** | QUIC: datagrams + independent streams | The designed successor (unreliable datagrams without WebRTC ceremony; no HOL across streams). Server needs HTTP/3; check current browser/platform coverage before betting the stack — adoption is the moving part, verify at build time. |

- Web doctrine by tier: **turn-based/casual → WebSocket and stop worrying** (150ms games don't feel TCP's sins at 2% loss; simplicity ships). **Twitch on web → WS for reliable class + WebRTC-DC/WebTransport for state class**, or accept WS-only with the mitigations below and honest expectations.
- WS-only mitigations for action-ish games: aggressive snapshot rates with newest-wins *application-side* dropping (stale ones discarded on arrival), small messages (less to stall), generous interpolation buffers, and prediction tuned for occasional 100ms+ stall-bursts (loss manifests as burst-latency on TCP, not gaps). Many shipped .io games live here — it's a feel ceiling, not a wall.
- Compression: `permessage-deflate` off for tick traffic (CPU + latency for little gain on quantized binary); binary frames always (`ArrayBuffer`, never JSON strings in the tick path — state-sync-bandwidth.md).

## NAT, signaling, and why P2P is a project

P2P (WebRTC or native) requires: a **signaling** channel to exchange offers (any WS server), **STUN** to discover public addresses, and **TURN** relays for the 10–20% of pairs whose NATs refuse hole-punching. TURN is a real server cost — at which point compare honestly against just hosting an authoritative room server (architecture-models.md's conclusion: for most games, server-relayed-or-simulated wins the TCO fight). Native P2P (fighting rollback) rides the same STUN/TURN reality via its libs; consoles/platforms add their own relay ecosystems.

## Connection lifecycle (every transport)

- **Handshake**: version check (protocol_version mismatch → clean rejection at the door), auth token, then initial state (the join keyframe — state-sync-bandwidth.md). Encrypt/authenticate the channel: WSS/DTLS/QUIC give transport crypto; the *game* still validates identity (tokens from your auth, not "trust the socket").
- **Keepalive + RTT**: ping/pong at 1–5s intervals doing double duty (liveness + RTT/jitter estimation feeding clock sync — testing-network.md). Detect death by silence (~5–10s), not by TCP FIN (which mobile networks eat).
- **Reconnect protocol** (SKILL.md #12): short-lived session token survives the socket; on reconnect within grace → resume entity + full keyframe (the same recovery path again). Mobile web *will* background-kill sockets constantly (web-games lifecycle doctrine) — reconnect is a mainline flow on web, not an edge case.
- **MTU discipline**: keep datagrams ≤ ~1200 bytes (fragmentation = multiplied loss); batch per tick within that; message framing with explicit lengths/types (never "one message per packet" assumptions on stream transports — WS frames help, TCP-ish streams in native don't).

## Stack quick-starts

- **Web casual/co-op**: Colyseus (WS, rooms, schema state sync) — the model-1/2 fast path; socket.io only if you need its fallbacks (its overhead and reconnection magic are wrong for tick traffic; prefer plain `ws`).
- **Web twitch**: geckos.io (WebRTC DC client↔server, UDP-ish on web) or hand-rolled WS+WebRTC hybrid; WebTransport where support allows.
- **Rust/native**: renet (channels over UDP) or lightyear's transport layer (which also does WebTransport/WS for browser clients — one server, native + web clients, the practical cross-play path for Bevy games).
- Serialization across stacks: shared schema (protobuf/flatbuffers) or shared code (TS shared module / Rust shared crate + wasm) — hand-synchronized parsers on both ends drift into the desync-adjacent bug class.

## Transport triage ("the network feels wrong")

Spiky-frozen under load → HOL blocking (reliable pipe carrying state class) · fine-then-awful on mobile/wifi → loss bursts on TCP; measure loss, consider unreliable channel or widen buffers · gradual drift then snap → clock sync issues, not transport · connects locally, fails for real users → NAT/TURN coverage or corporate-proxy WS blocking (443 + WSS solves most) · high RTT with good bandwidth → distance/routing: region servers are a product decision, not a code fix (servers-security.md hosting).
