# Game Servers & Security — The Machine That Owns the Truth

The server is a headless game running the shared-sim tick loop (architecture-models.md's separation paying its biggest dividend), wrapped in rooms, fed by sockets, and defended like the bank it is.

## Server process anatomy

```
per room/match:
  tick loop (fixed Hz, monotonic):        // the SAME accumulator discipline as every client rune
    drain inbound → validate → buffer inputs
    simulate(DT)
    replicate (deltas, AOI, priority)     // state-sync-bandwidth.md
  lifecycle: create → waiting → active → results → dispose
```

- **Rooms are the unit of everything**: isolation (a crash takes one match), scaling (rooms per process by CPU budget), and code sanity. A process hosts N rooms; an orchestrator assigns new matches to processes (Colyseus/Nakama do this bookkeeping; a hand-rolled Node/Rust server does it with a Map and honesty about limits).
- Tick budget arithmetic before launch: (sim cost per room × rooms) + serialization must fit the tick. Serialization commonly out-costs simulation — measure both (the counters from state-sync-bandwidth.md live server-side too). Degrade deliberately under overload: lower snapshot rates first, refuse new rooms second, never silently stretch the tick (clients experience stretched ticks as global lag spikes).
- **Headless determinism dividend**: the server build runs in CI — full bot matches as integration tests (testing-network.md), load tests as many-bot rooms. If the server can't run without rendering assets, the separation leaked; fix that first.
- Persistence at the edges, not in the tick: match results/progression written async post-match (or checkpointed); a DB call inside the tick loop is a frame spike with a connection pool. Crash recovery policy per stakes: casual = match voided; ranked = periodic room snapshots enable resume.

## Matchmaking & meta-services (right-sized)

Indie tier: a lobby list or room codes (`ABXK42`) — ship this first; friends-play-together is the actual requirement behind most "matchmaking" tickets. Ladder tier: queue + rating bands (widening over wait time) + region gates (RTT gate for rollback especially — rollback-determinism.md). The meta-services (auth, parties, progression) are a normal web backend (web-security rune governs it — sessions, rate limits, IDOR on inventory endpoints, the classics) talking to game servers via signed match tokens: the web tier authenticates, the game server *verifies the token*, neither trusts the client about the other.

## Hosting reality

- Game servers are stateful long-lived processes — the serverless/edge reflex does not apply to the tick loop (lobby APIs: fine). VPS/bare metal (Hetzner-class) is the indie workhorse; orchestrated fleets (Agones/K8s, or managed: Colyseus Cloud, Nakama Heroic, PlayFab/GameLift multiplayer) when scale-by-demand is real.
- **Region placement is a gameplay feature**: 80ms vs 180ms median RTT is a different game (the tolerance profile from SKILL.md's first question). EU+NA minimum for real audiences; region-lock queues honestly rather than matching Sydney against Frankfurt and calling the netcode bad.
- Cost model: CCU × per-room CPU × region redundancy — the arithmetic that decides P2P/listen-server vs dedicated for your budget (architecture-models.md's table has a money column implicitly; fill it in).
- WebSocket servers behind normal LBs work (sticky by room assignment — clients connect to the *specific* process hosting their room, usually via direct host:port or a per-process ingress; a stateless LB round-robining mid-match is a classic outage).

## Security — the threat model is "every client is a modified client"

Layered per stakes (a jam co-op needs layer 1; a ranked ladder needs all of them):

1. **Architecture is the first defense** (already bought if you followed the rune): server authority + inputs-not-results (#1, #2) kills god-mode/teleport/damage editing *by construction*. Client-authoritative anything is unfixable retroactively — this layer is chosen on day one or never.
2. **Input validation**: per-tick displacement/turn-rate clamps, action rate limits (fire rate, ability cooldowns re-checked server-side), resource cost enforcement, physical sanity (interacting with a chest 40m away = no). Violations: correct silently (clamp), count, and threshold into flags — instant-kick on first anomaly punishes lag; never punishing invites scripts.
3. **Information hygiene = anti-wallhack**: AOI/sight-based relevance (state-sync-bandwidth.md) — unsent data is uncheatable. Send enemy positions only when perceivable; the radar-hack market for your game evaporates.
4. **Lag-comp bounds = anti-time-travel** (interpolation-lagcomp.md): clamp claimed view-times against measured RTT; reject future timestamps outright (#10: server clock is truth).
5. **Statistical + report tooling**: accuracy/reaction-time outlier flags, replay capture on report (the determinism/replay investment triple-billing as anti-cheat evidence), shadow pools over insta-bans for uncertain cases. Client-side anti-cheat binaries are AAA-tier arms-race territory — indie stakes rarely justify them; server-side rigor + swift ban waves carry further per engineering hour.
6. **Web-tier basics still apply** (web-security rune): DoS rate limiting at the door, connection caps per IP, auth token expiry, no secrets in the client bundle (map data with hidden-room coordinates *is* a secret when the mode is hide-and-seek — think in information terms).

## Operations minimums

Structured logs per room (tick, players, anomalies) · metrics: tick-time p95, rooms, CCU, egress, reconnect rate (the dashboard version of testing-network.md's client metrics) · crash telemetry with room-state dumps · a kill-switch/maintenance mode that ends matches gracefully · and versioned protocol deploys (server supports N and N-1 client protocol during rollout windows, or you eat a synchronized-update outage on every patch — the shipping.md save-migration doctrine, wire edition).
