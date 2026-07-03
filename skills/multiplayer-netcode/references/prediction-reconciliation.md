# Client Prediction & Reconciliation — Your Own Hands, Instant

Without prediction, every input round-trips before your character moves: 100ms RTT = moving through syrup. Prediction runs *your own* entity locally the moment you act; reconciliation keeps that optimism honest against the server. Done right, the local player is indistinguishable from offline at sane latencies.

## The machinery (the loop every implementation shares)

```
CLIENT tick T:
  input = sample()                          // the intent layer from the input doctrine
  send { seq: T, input }                    // unreliable is fine; server acks by seq
  history.push({ seq: T, input })           // pending inputs — the replay fuel
  localPlayer = simulate(localPlayer, input, DT)   // predict NOW — same sim code as server

ON snapshot { lastProcessedSeq: A, state: S }:
  history.drop(seq <= A)                    // acked — no longer pending
  predicted = S.players[me]                 // rewind to server truth at A
  for cmd in history:                       // re-apply everything the server hasn't seen
      predicted = simulate(predicted, cmd.input, DT)
  error = localPlayer.pos - predicted.pos
  localPlayer = predicted                   // adopt corrected state
  smoothError += error                      // …but bleed the visual difference gradually
```

- **The sim function is shared code** (architecture-models.md): the server and the client's predictor must be the *same* movement/collision logic, same constants, same tick DT. Every divergence between them is guaranteed rubber-banding — the #1 cause in practice is a "quick client-side approximation" of server physics.
- Input history keyed by sequence number; server acks the last seq it consumed per snapshot. Unacked inputs are your rollback window — cap it (say 1s); a client 60 ticks behind should snap + resync, not replay a minute.
- **Predict only what the local player owns**: their kinematics, their cooldown starts, their reload. Don't predict *outcomes involving others* (damage dealt, pickups contested) — show optimistic *presentation* (muzzle flash, swing animation) while awaiting the authoritative *result* (health change). This split — predicted motion, presented-but-unconfirmed effects — is what makes shooters feel instant without letting clients hallucinate kills.

## Reconciliation quality (where the feel lives)

- **Smoothing residual error**: after replay, the visual position offsets by the error and decays it (~exponential over 50–150ms, the universal damp). Below a few centimeters: pure smoothing. Above a threshold (teleport-grade): snap honestly — smoothing a 5-meter correction is a cutscene of sliding.
- **Why mispredictions happen** (triage order): lost input packets (server simulated your absence — send inputs redundantly: each packet carries the last 2–3 inputs, loss-proofing for free) · sim divergence (audit shared code, constants, DT) · server-side events you couldn't know (knockback from an unseen rocket — irreducible; smoothing's true purpose) · floating-point drift between runs of "the same" code (rare in same-binary; real across languages — quantize state at snapshot boundaries to bound it).
- **Predicted-state completeness**: everything your sim tick *reads* for the local player must be in the rewind/replay state (position, velocity, grounded flags, cooldown timers, movement-state enums). The classic subtle bug: replaying inputs against a rewound position but a *current* stamina value — the replay diverges deterministically and you chase ghosts.

## Server side of the contract

```
SERVER tick T:
  for each client: consume buffered inputs (one per tick; cap burst)
  world = simulate(world, allInputs, DT)
  every N ticks: to each client → snapshot { lastProcessedSeq[client], relevantState }
```

- **Input buffering with a small de-jitter window** (1–2 ticks): inputs arrive irregularly; simulating them the tick they arrive amplifies jitter into movement noise. Buffer slightly, consume steadily — and tell the client its buffer health so it can adjust send pacing (adaptive clients ride varying networks).
- Missing inputs at tick time: repeat the last input for 1–2 ticks (coasting), then treat as neutral — never *wait* (that's lockstep, a different contract). When the late inputs do arrive: discard (their tick has passed). The client's redundancy (above) makes this path rare.
- Anti-cheat validation belongs exactly here (servers-security.md): clamp per-tick displacement, rate-limit actions, cost-check abilities — inside the consume step, before simulation trusts anything.

## What NOT to predict (scope discipline)

Other players (interpolate them — interpolation-lagcomp.md) · physics-heavy shared objects (predicted crates that others also push = permanent jitter; either server-only or ownership-transfer schemes) · random outcomes (crits roll server-side; predicting them means visible take-backs) · economy/inventory (present optimistic UI with a pending state — greyed item — but the transaction is authoritative; a "pending" spinner beats a rollback of a purchase). Prediction scope creep is how codebases end up mispredicting everything and smoothing nothing convincingly.

## Feel targets & verification

With prediction healthy: local input latency ≈ one frame regardless of RTT; corrections invisible at ≤120ms RTT with occasional millimeter drift under loss; the artificial-conditions harness (testing-network.md) at 150ms/2% should feel *stiff but fair*, never drunk. Instrument misprediction magnitude per reconcile (log distance corrected) — a rising trend is sim divergence creeping in with new features; a per-feature spike names the feature that forgot its server twin. This metric on a debug overlay is the single best netcode dashboard a team can have.
