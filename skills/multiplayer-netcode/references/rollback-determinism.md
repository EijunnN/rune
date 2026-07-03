# Rollback & Determinism — Offline Feel, Distributed Truth

Rollback netcode (GGPO lineage) is the fighting-game gold standard: simulate immediately with *guessed* remote inputs, rewind-and-replay when truth arrives. Lockstep is its patient sibling: wait for all inputs before simulating. Both rest on one non-negotiable foundation — **bit-identical deterministic simulation** — which is where the real engineering lives.

## Rollback mechanics

```
tick T:
  localInput = sample(); send(localInput, T)            // send every tick, redundantly (last ~4 inputs/packet)
  remoteInput = received[T] ?? predictInput(remote)      // guess: usually "same as their last input"
  saveState(T)                                           // BEFORE simulating — the rewind anchor
  state = simulate(state, {local: localInput, remote: remoteInput})

on remote input for tick R arriving (R <= T), differing from the guess:
  loadState(R)
  for t in R..=T: state = simulate(state, confirmedOrGuessed(t))   // re-simulate the window
  // all in one frame's budget — then render tick T as usual
```

- **Input delay + rollback hybrid**: run with 1–3 frames of *local* input delay (configurable); rollbacks then only cover RTT beyond that. Delay is constant and trainable (fighting players calibrate to it); rollbacks are spiky and visible — the mix is a per-game feel decision, exposed as a player option in serious titles.
- Rollback window budget: at 60Hz with 100ms RTT ≈ 6–7 ticks re-simulated on a bad guess — your sim must run ~8–10× realtime *worst case*. This is the performance requirement that shapes everything: sim state compact (KBs, memcpy-able), simulation lean, rendering fully decoupled (only the final tick renders).
- **Visual rollback hygiene**: re-simulation happens invisibly, but *effects* triggered during mispredicted ticks (sounds, particles, hitsparks) need dedup/cancel logic — fire-once event keys per (tick, event), confirmed-only for high-salience effects (KO flash). The classic artifact — a hitspark for a hit that "un-happened" — is this bookkeeping missing.
- Guessing beyond ~inputs: don't. Input prediction "they're still holding right" is safe; predicting *reactions* is astrology. If guesses miss badly at high RTT, rollback games degrade honestly (visible skips) — pair with a max-RTT matchmaking gate rather than heroics.

## Lockstep mechanics (the RTS variant)

All peers exchange inputs for tick T; simulation of T waits for the full set. Input latency = slowest peer (hidden by design: command acknowledgments, wind-up animations — the original seam-hiding school). Bandwidth is inputs-only → thousand-unit battles on dial-up-era pipes. The stall mode: one slow peer freezes everyone ("waiting for player…") — mitigate with input-delay pipelining (commands scheduled 2–4 ticks ahead) and drop policies decided up front. Modern use: RTS, large-scale sims, and anywhere state >> bandwidth.

## Determinism — the actual hard part

Bit-identical means: same inputs at same ticks → same state, on every machine, every run. The threat catalog:

- **Floating point**: same-binary same-platform is generally safe; cross-platform/cross-compiler is where `sin/cos/pow` (libm differences), FMA contraction, and optimization reorderings bite. Options by paranoia level: fixed-point math for the sim core (fighting-game orthodoxy; deterministic by construction) · f32 with strict discipline (no transcendental stdlib in sim — table/polynomial versions; consistent compile flags; no fast-math *in the sim crate*) · same-binary-only multiplayer (ship identical builds, sidestep cross-platform).
- **Iteration order**: hash maps are the desync factory — any sim-affecting iteration must be over ordered structures (Vec, BTreeMap) or explicitly sorted (the ECS note: query iteration order is unstable — collect + sort by entity id before order-sensitive resolution; bevy-mastery's warning graduates to law here).
- **RNG**: one seeded PRNG *inside the sim state* (rolled back with it!), never `Math.random`/thread RNGs, never RNG in presentation code reaching into sim.
- **Time & externals**: no wall-clock, no frame-delta, no locale/platform APIs in sim. Tick count is the only clock (every rune's fixed-timestep doctrine, now load-bearing for correctness).
- **Init & replays**: full state (including pools, counters, RNG) reset identically per match; a match = (seed, settings, input streams) — which *is* a replay file for free, and the debugging superpower below.

## Desync detection & hunting

- **Checksums every N ticks**: hash the sim state (or a canonical serialization), exchange, compare. On mismatch: log tick, dump both states, flag the match — never let it ride silently (SKILL.md #14).
- Hunting: binary-search the first divergent tick via replay (both machines re-run the input log, checksum per tick) → diff the state dumps → the divergent field names the guilty system. With replays this is an afternoon; without them, a haunting. Build the replay harness *with* the netcode, not after.
- CI determinism test: same input script run twice (and cross-platform if you ship that) → identical checksum streams. It's the cheapest netcode test that exists and catches the hash-map-iteration class automatically (testing-network.md).

## When to choose this family (and when to run)

Choose rollback for: 2(-4) players, twitch-precise verbs, state small enough to snapshot per tick, teams able to hold the determinism line (or engines/libs holding it for them: **GGPO/ggrs** (Rust), rollback-capable frameworks — never hand-roll your first). Choose lockstep for: massive shared sims (RTS). Run away (to server-auth + prediction) when: player counts grow, sim state is heavy/physics-engine-shaped (general 3D physics engines rarely promise determinism), or the team can't budget the discipline — a desyncing rollback game is worse than an honest 80ms-feel prediction game, every time.
