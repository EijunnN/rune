# Testing & Debugging Networked Games — Hostile Conditions On Tap

Netcode's defining testing problem: the bugs live in conditions your dev machine never has (latency, jitter, loss, reorder) and in coincidences you can't reproduce by hand (two clients acting in the same tick). The answer is the same doctrine as everywhere in this library — determinism, simulation, and instrumentation — pointed at the network.

## The condition simulator (build it week one — SKILL.md #11)

```ts
// In-process link conditioner: wrap your transport's send/receive
class Conditioner {
  latencyMs = 80; jitterMs = 20; lossRate = 0.02; reorderRate = 0.01;
  send(packet: Uint8Array) {
    if (rng() < this.lossRate) return;                        // drop
    const delay = this.latencyMs + (rng() * 2 - 1) * this.jitterMs
                + (rng() < this.reorderRate ? 30 : 0);         // occasional reorder
    schedule(() => this.wire.send(packet), delay);
  }
}
```

- In-process conditioning (both directions, per-client settings) beats OS tools for dev ergonomics: a debug panel with latency/jitter/loss sliders per connected client — the netcode equivalent of the juice tuning panel, and just as non-negotiable. Presets: `LAN`, `Good WiFi (40±10, 0.1%)`, `Mobile (120±40, 2%)`, `Bad (250±80, 5%)` — every feature demo runs on `Mobile` before it's called done.
- OS-level for full-stack honesty: `tc netem` (Linux), `clumsy` (Windows), Network Link Conditioner (macOS) — these catch what in-process misses (TCP behavior under real loss, MTU issues).
- **Local multi-client is the daily loop**: N game instances + local server, conditioner between (bots driving all but one — see below). If launching this takes more than one command, it won't happen daily; script it (`npm run net:4p`, `cargo run --bin fourbox`).

## Determinism & replay as test infrastructure

- **Input-log replays** (rollback-determinism.md builds them; every model benefits): record (seed, settings, all input streams with ticks) per session automatically in dev. A netcode bug report without a replay is a rumor; with one, it's a breakpoint.
- CI tests this library keeps preaching, network edition: determinism check (same input log twice → identical checksum stream) · headless bot matches (server + N scripted clients through the *real* netcode path, conditioner at `Mobile`, asserting invariants: no desync flags, no negative health, reconnect succeeds, match completes) · protocol golden tests (serialize known states, compare bytes — accidental wire-format changes caught in review, the semver of netcode).
- Bots: input-script bots (replay fragments) for regression; chaos bots (random valid inputs at max rate) for robustness + soak; simple behavior bots (walk to point, shoot at sight) for load realism. The chaos bot running overnight under `Bad` conditions is the cheapest netcode fuzzer that exists.

## Clock sync (the invisible substrate everything above trusts)

```
// Continuous, not once: every ping carries client send-time
onPong(t_clientSend, t_serverTick):
  rtt = now - t_clientSend
  offsetSample = t_serverTick + rtt/2 - now      // server-time estimate
  // keep a window of samples; take the offset from the MIN-RTT sample (least queued)
  // slew the applied offset gradually — never step time mid-gameplay
```

- RTT/2 asymmetry is a known lie you accept; min-RTT filtering removes queueing noise, which is the actual enemy. Applied offset changes **slew** (a few ms per second) — stepping the clock makes every timer and interpolation window hiccup at once.
- What consumes it: interpolation's `renderTime` (interpolation-lagcomp.md), input scheduling (send inputs so they arrive ~1 buffer-tick early — the server's de-jitter note), lag-comp view-time validation. When "everything drifts then snaps," debug *this* layer before the consumers (transport-web.md triage).

## The observability kit (debug overlay, second tab of the perf overlay)

Per client: RTT + jitter (graph, not number — spikes are the story) · packet loss % both directions · snapshot age at render (interpolation buffer health: how close to starvation) · misprediction magnitude per reconcile (prediction-reconciliation.md's metric) · bytes/s up+down by message type (state-sync-bandwidth.md's counters) · server tick-time p95 and input-buffer depth (server overlay). These eight numbers diagnose 90% of "it feels bad" reports to the correct reference file mechanically — the triage tables in SKILL.md assume you *have* them.

Visualization beats numbers for spatial netcode bugs: debug-render the three time-domains simultaneously (server ghost from latest snapshot, predicted local, interpolated remotes — distinct colors). Rubber-banding, extrapolation overruns, and lag-comp disputes become *visible* as gaps between ghosts. This is the gizmos doctrine (bevy/web-games) aimed at time instead of space.

## Playtesting multiplayer (the human layer)

Real-condition playtests early: one remote friend on hotel wifi is worth ten localhost sessions (game-design's playtest protocol applies — watch, timestamp, don't coach; ask *"did anything feel unfair?"*, the netcode-specific feelings question, since players report fairness violations far more reliably than latency numbers). Cross-region test before launch week, not after. And the fun-at-latency gate from the review checklist is a design verdict humans give: some mechanics simply die at 150ms and need redesign (#15), which no amount of engineering polish will surface — only playtests under the conditioner will.

## Release health

Ship the metrics you debugged with: RTT/loss/reconnect-rate/desync-flags aggregated per region-build (servers-security.md ops) · staged rollouts with protocol N/N-1 support · and a "network health" indicator honest enough that players blame their wifi when it *is* their wifi — the cheapest support-ticket deflection ever shipped (and only credible because your overlay numbers are real).
