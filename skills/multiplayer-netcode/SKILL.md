---
name: multiplayer-netcode
description: Multiplayer game networking doctrine — choosing the netcode model (rollback, client prediction + reconciliation, lockstep, relaxed state-sync) by genre, server authority and anti-cheat, entity interpolation and lag compensation, delta compression and interest management, transports (WebSocket, WebRTC DataChannels, WebTransport, UDP), game server architecture, and testing under simulated latency. Use whenever building or debugging networked gameplay — "add multiplayer", co-op or PvP, teleporting/rubber-banding remote players, laggy-feeling controls, hit registration disputes, desyncs, speed hackers, choosing socket.io vs WebRTC, or sizing a game server. Engine-agnostic doctrine with web (Colyseus/geckos) and Rust/Bevy (lightyear/renet) stack notes.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Multiplayer Netcode

A networked game is a distributed system where **every machine holds a different, delayed, partially-wrong view of the world** — and the game must feel like one shared present anyway. Netcode is the art of hiding the speed of light: you cannot reduce latency, only choose *where to put it* (input delay, visual delay, correction artifacts) and *who resolves disputes* (authority). Every technique in this rune is a placement decision for those two quantities. The cardinal sin is pretending the network is fast and reliable, then patching the lies as bugs; the doctrine is choosing lies deliberately, per genre, from day one.

## Before writing any networked code

1. **Name the game's tolerance profile**: how much input latency can the core verb absorb (fighting: ~3 frames; MMO tab-target: 200ms+)? How catastrophic is a misprediction correction (racing: car teleports = disaster; co-op looter: enemy skips = shrug)? These two answers *select the netcode model* — the reference map's first row.
2. **Count players and authority stakes**: 2-player fighting ≠ 4-player co-op ≠ 60-player shooter ≠ MMO. Player count picks bandwidth strategy; competitive stakes pick authority strictness (a co-op speedrun timer can trust clients; a ranked ladder can trust nothing).
3. **Know your platform's transports** (web is not native — transport-web.md) and your tick budget before promising a genre the infrastructure can't carry.
4. **Multiplayer multiplies every cost** — content, testing, servers, abuse handling. The scope doctrine (game-design rune) applies squared: ship 2–4 player co-op with one authoritative room before dreaming bigger.

## Reference map — read before deciding in that area

| Task involves | Read |
| --- | --- |
| Choosing the model (rollback vs prediction vs lockstep), authority topology | [references/architecture-models.md](references/architecture-models.md) |
| Local player feels laggy; prediction, reconciliation, input buffers, rubber-banding | [references/prediction-reconciliation.md](references/prediction-reconciliation.md) |
| Remote players teleport/stutter; interpolation, extrapolation, hit registration, lag comp | [references/interpolation-lagcomp.md](references/interpolation-lagcomp.md) |
| Fighting/RTS netcode, determinism, rollback, desync hunting | [references/rollback-determinism.md](references/rollback-determinism.md) |
| Bandwidth: snapshots, deltas, quantization, interest management, serialization | [references/state-sync-bandwidth.md](references/state-sync-bandwidth.md) |
| WebSocket vs WebRTC vs WebTransport vs UDP, socket.io questions, NAT, signaling, relays | [references/transport-web.md](references/transport-web.md) |
| Server architecture, rooms, matchmaking, hosting, scaling, anti-cheat | [references/servers-security.md](references/servers-security.md) |
| Testing with fake latency/jitter/loss, metrics, replay debugging, clock sync | [references/testing-network.md](references/testing-network.md) |

Stack pointers throughout: web games → Colyseus/geckos.io/raw WS (pairs with web-games rune); Rust/Bevy → lightyear/bevy_replicon/renet (pairs with bevy-mastery); the *doctrine* is identical everywhere.

## Non-negotiables

1. **Authority is explicit, singular, and server-side for anything contested.** One machine owns each piece of truth (positions, health, inventory, the kill). "Both clients simulate and we hope" is not an architecture; it's a desync generator with a UI.
2. **Clients send inputs/intents, never results.** `{tick, buttons, aim}` — not "I'm at (x,y)", not "I hit him for 40". The moment a client reports outcomes, every cheat from speedhack to god-mode is a JSON edit away (servers-security.md).
3. **Pick the netcode model by genre before coding** (architecture-models.md's table). Retrofitting rollback onto a prediction codebase — or authority onto a P2P prototype — is a rewrite wearing a refactor's clothes.
4. **Tick-based simulation, everywhere, numbered.** Fixed-timestep simulation (the same accumulator every game rune preaches) with a monotonically increasing tick; every message stamps the tick it belongs to. Netcode without sequence numbers is archaeology without dates.
5. **Predict the local player; interpolate remote entities.** Your own character responds this frame (prediction hides your latency); everyone else renders ~100ms in the past between two known snapshots (interpolation hides theirs). Extrapolation/guessing is a last resort with a short leash (interpolation-lagcomp.md).
6. **Reconcile, don't snap**: on an authoritative update, rewind to the server's tick, re-apply pending inputs, and *smooth* residual error over ~100ms. Visible corrections are the price of misprediction — pay it in millimeters continuously, not meters occasionally.
7. **The simulation never blocks on the network.** Receive async into buffers; the tick loop reads what's arrived and proceeds. A stalled socket must produce a coasting entity, never a frozen game.
8. **Bandwidth is budgeted per entity per tick**: send what changed (deltas against acked baselines), quantized (a position is not an f64), to whom it matters (interest management). The naive full-state-to-everyone-at-60Hz design dies at the first real player count (state-sync-bandwidth.md).
9. **Reliability is chosen per message class**: state snapshots want *newest-wins unreliable* (a lost old snapshot is worthless once a newer one exists); events (chat, purchases, death) want reliable-ordered. One TCP pipe for everything means one lost packet stalls the world — head-of-line blocking is the web's silent netcode killer (transport-web.md).
10. **Clocks: the server's tick is the truth.** Clients estimate offset + RTT continuously and schedule themselves relative to server time; client wall-clock timestamps are never trusted for anything contested.
11. **Test under hostile network conditions from the first week** — artificial latency (100–250ms), jitter (±30ms), and loss (2–5%) in a dev toggle. Netcode that only ran on localhost hasn't run (testing-network.md). LAN-perfect and playable-at-150ms are different games; you ship the second.
12. **Design disconnects as gameplay**: grace timeouts, reconnect-with-state-recovery, bot takeover or pause rules, and host migration decided *before* the host's wifi decides for you.
13. **Validate everything server-side as if every client were hostile** — movement speed/teleport bounds, action rates, resource costs, sight checks. Rate-limit and sanity-check at the edge; log anomalies. The client is a *display* with an opinion (servers-security.md).
14. **Desync detection is built in, not bolted on** (deterministic models): periodic state checksums exchanged and compared; on mismatch, log the tick and dump state. A silent desync discovered by players is the genre's worst bug report (rollback-determinism.md).
15. **Hide the seams with game design**: wind-up animations absorb command latency, area effects forgive imprecision, cooldown verbs tolerate delay better than mash verbs. The cheapest netcode is the design that needs less of it — bring game-design (the rune) into the netcode meeting.

## Decision framework — choose the model (the one decision that rules the rest)

| Genre profile | Model |
| --- | --- |
| Turn-based, async, card games | **Trivial authority**: server validates turns; latency irrelevant; spend effort on reconnect + spectating |
| Casual co-op, party games (2–8) | **Relaxed server-auth state sync**: predict local, interpolate remote, forgive generously |
| Action/shooter/MOBA-like | **Server authority + client prediction + lag compensation** — the industry default (prediction-reconciliation.md + interpolation-lagcomp.md) |
| Fighting, precision platformer versus (2P) | **Deterministic rollback** (GGPO family) — peer-to-peer feel at the cost of determinism discipline (rollback-determinism.md) |
| RTS, huge armies (unit counts >> bandwidth) | **Deterministic lockstep** — send only inputs; pay input delay; determinism mandatory |
| MMO-scale persistent | Server-auth + aggressive interest management + sharding — and a strong reason not to build it as your first netcode |

## Decision framework — "it feels bad online" triage

- **My own controls lag** → no/broken client prediction (or you're predicting but round-tripping anyway). prediction-reconciliation.md.
- **I get yanked backwards** (rubber-banding) → prediction/server disagree: mismatched simulation code paths, unacked-input loss, or server correcting cheats/physics you didn't model client-side.
- **Other players teleport or vibrate** → missing interpolation buffer, or interpolating across dropped snapshots — check the render-delay math before blaming the network.
- **"I shot him first!" disputes** → no lag compensation (server judging in its present against shooters aiming in the past), or favor-the-shooter windows too tight/loose.
- **Fine at 2 players, dies at 8** → bandwidth (full snapshots, no deltas/AOI) or server tick starvation — measure which (testing-network.md metrics) before optimizing either.
- **Rare total disagreement about reality** → desync (deterministic models) or dual-authority writes (who else can set health?). Checksums and a write-authority audit respectively.

## Review checklist (sweep before shipping networked play)

One authority per fact · clients send inputs only · ticks number everything · local predicted, remote interpolated, corrections smoothed · per-class reliability chosen · deltas + quantization + AOI past toy scale · server validates movement/rates/costs · clock sync server-anchored · tested at 150ms/2% loss and at player-count ceiling · disconnect/reconnect flows exist · desync checksums (if deterministic) · and the game is still fun at real latency — the only metric players feel.
