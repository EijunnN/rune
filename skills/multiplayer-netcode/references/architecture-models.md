# Architecture & Models — Who Owns the Truth, Who Pays the Latency

Two orthogonal decisions define every multiplayer architecture: **topology** (where the authoritative simulation runs) and **model** (how latency is hidden). Choose both explicitly; each combination has a genre home.

## Topologies

| Topology | Truth lives | Costs | Fits |
| --- | --- | --- | --- |
| **Dedicated server** | your server process | hosting $, ops | anything competitive; the default when money allows |
| **Listen server / host** | one player's machine | host advantage, host-quit crisis | co-op, friends lobbies; decide host migration up front |
| **P2P full-mesh (deterministic)** | everyone (must agree) | determinism discipline, NAT pain | 2P fighting (rollback), small lockstep RTS |
| **Relay-assisted** (server forwards, doesn't simulate) | still clients (usually host) | cheap servers, keeps client authority risks | jam/co-op tier; a stepping stone, not an endpoint |

- Client-authoritative anything (each client owns "their" position) is the tempting default of tutorials and the root of speed hacks, dupes, and unfixable disputes. Acceptable *only* where stakes are zero (a co-op cursor party) — and even then, dispute-prone facts (pickups!) want a single owner.
- Listen-server host advantage is real (~0ms for host): fine for co-op, corrosive for versus. If versus + no budget → deterministic P2P (rollback) beats host-auth for fairness.
- The relay tier (or managed rooms: Colyseus Cloud, Nakama, Photon-style) exists because NAT traversal and hosting are their own projects — for web games especially, a room server that *also* simulates (becoming a true dedicated server) is barely more work than a relay and strictly safer.

## The four latency-hiding models

**1. Trivial authority (turn-based tier).** Server validates each move; clients render results. Latency hides inside human turns. All effort goes to: reconnect-with-state, spectators, timers, and abuse (the server still validates every move — non-negotiable #13 applies at every tier).

**2. Relaxed state-sync (casual co-op tier).** Server (or host) simulates at 10–30Hz, broadcasts snapshots; clients predict *their own* movement loosely and interpolate everything else. Corrections are forgiving (big smoothing windows), disputes resolved bluntly (server wins, nobody litigates a party game). The 80% case for indie co-op — and deliberately boring: most games need exactly this and nothing fancier.

**3. Server authority + prediction + lag compensation (action tier).** The industry-standard triad for anything twitchy with >2 players:
- Client: sends input per tick, **predicts** its own character immediately, keeps an input history.
- Server: simulates authoritative world at fixed tick, sends snapshots + last-processed-input acks.
- Client: **reconciles** (rewind to ack, replay pending inputs), renders remote entities **interpolated** ~100ms behind, server performs **lag compensation** for hit registration.
Each leg has its own reference file; the model's cost is engineering breadth (three mechanisms), its prize is scaling to real player counts with server-grade trust.

**4. Deterministic input-passing** — two flavors:
- **Lockstep (RTS)**: all peers exchange inputs for tick N, *nobody simulates N until all inputs arrive*; simulation is bit-identical everywhere. Bandwidth = inputs only (why 500-unit armies are possible). Cost: input delay = worst peer's RTT (hidden by RTS design: acknowledgment animations, wind-ups — the #15 seam-hiding doctrine born here) and mandatory determinism.
- **Rollback (fighting)**: simulate *without waiting* using predicted inputs (usually "same as last tick"); when real inputs arrive late and differ, rewind and re-simulate. Feels offline at <~120ms between two peers. Cost: determinism + state save/restore + N-times re-simulation budget (rollback-determinism.md).

## Choosing — the honest questionnaire

1. **Can the core verb absorb 100–200ms?** (cooldown/aim-slow verbs: yes → model 2/3 relax; frame-precise cancels: no → rollback.)
2. **>2 simultaneous players?** Rollback's bandwidth/re-sim scales poorly past 2–4; lockstep stalls on the slowest peer — big counts push to model 3.
3. **Competitive stakes / strangers?** → dedicated authority (topology row 1), lag comp, full validation. Friends-only co-op can cut every corner marked "relaxed".
4. **Simulation size vs bandwidth**: thousands of entities (RTS) → inputs-only models; dozens → state sync is simpler and robust to non-determinism.
5. **Team's determinism appetite**: rollback/lockstep demand bit-identical sim (float discipline, seeded RNG, no iteration-order leaks — rollback-determinism.md). If the engine/stack can't promise it, model 3 doesn't care about determinism at all (server's floats are the only floats that matter).

## Structural doctrine (applies to every model)

- **Separate simulation from networking from rendering.** The sim is a pure `(state, inputs) -> state` tick function (the architecture every game rune already demands — here it graduates from good practice to load-bearing: prediction *replays* it, rollback *re-executes* it, the server *is* it headless).
- **The same sim code runs on client and server** wherever prediction exists — shared crate/package (Rust workspace, TS shared module). Hand-duplicated "close enough" client physics is the rubber-banding factory (prediction-reconciliation.md).
- Message taxonomy from day one: `Input`, `Snapshot`, `Event` (reliable), `Control` (join/leave/ping) — typed, versioned (a `protocol_version` in the hello; mismatched clients rejected at the door, not desynced at minute 20).
- Stack notes: web room-servers — **Colyseus** (TS, rooms + state sync built in) is the fastest path for models 1–2; model 3 on web usually means hand-rolled prediction over its state or a custom WS/WebRTC server. Rust/Bevy — **lightyear** (prediction/interp/replication, model 3 in a box), **bevy_replicon** (replication substrate), **renet** (transport + channels); fighting games on any stack: GGPO-lineage libs (ggrs in Rust) rather than hand-rolling rollback first time out.
