# Interpolation & Lag Compensation — Everyone Else, Smoothly; Hits, Fairly

Remote entities arrive as sparse, jittery snapshots. Rendering them raw = teleporting stutter. The fix is counterintuitive: **render other players in the past** — buffer snapshots and interpolate between two you already have. You trade ~100ms of remote-view freshness for perfect smoothness; lag compensation then repays that trade where it matters (hit registration).

## Entity interpolation (the workhorse)

```
// per remote entity: ring buffer of { serverTick, state }
renderTime = serverTimeEstimate - INTERP_DELAY          // e.g. now-ish minus 100ms
(a, b) = snapshots straddling renderTime
t = (renderTime - a.tick) / (b.tick - a.tick)
render(lerp(a.state, b.state, t))                        // positions lerp; rotations slerp/shortest-arc
```

- **INTERP_DELAY ≥ ~2× snapshot interval + jitter allowance.** Server at 20Hz (50ms) → 100–120ms delay. Too small = you run out of "future" snapshot and stall/extrapolate constantly; too big = remote players feel like ghosts of the past. Make it adaptive against measured jitter if you make it anything.
- Interpolate *state*, not just position: facing, crouch/anim flags sampled from the older snapshot (or nearest) — a lerped position with present-time animation flags looks subtly wrong before anyone knows why.
- Discrete events (shots, deaths, teleports) don't lerp: they're timestamped events replayed when `renderTime` crosses them. Teleports specifically must *break* interpolation (flag in the snapshot: "don't lerp into this position") — else every portal is a smear across the map.
- Missing the far snapshot (loss/late): hold the last pose briefly, then **extrapolate with a hard leash** — dead reckoning along last velocity for at most ~200–250ms, decaying to a stop, snapping when truth returns. Long extrapolation is how corpses run around corners; the leash is the doctrine.
- The buffer math must survive dropped and *reordered* snapshots: key by server tick (never arrival time), insert-sorted, and interpolation reads by tick lookup — half of "vibrating players" bugs are arrival-order assumptions.

## Lag compensation (server-side rewind for hit registration)

The debt created by the pipeline: a shooter aims at a target rendered ~100ms + RTT/2 in the past; by the time the shot reaches the server, the target has moved. Judged in the server's present, every lead-less shot misses — "I hit him ON MY SCREEN" is a correct complaint.

```
SERVER on shot { clientTick, aim }:
  rewindTo = shooterInterpTargetTime(clientTick)     // when the shooter SAW the world
  for each potential victim: pose = historicalPose(victimId, rewindTo)   // ~1s of pose history
  hit = raycast(aim, historicalPoses)
  apply damage in the PRESENT (never rewrite past state)
```

- The server keeps a short **pose history** (positions + hitboxes per tick, ~1 second); rewinding is a lookup, not a re-simulation. Validate the client's claimed view-time against measured RTT (clamp to plausible window) — else "lag compensation" becomes a time-travel cheat lever.
- **Favor-the-shooter is a policy with victims**: the flip side is "I was already behind the wall" deaths for the target. Bound it: max rewind (~200ms — beyond that, laggy shooters miss, correctly), and don't rewind *outcomes* (a rewound shot can hit, but a victim who already reached spawn-protection in the present stays protected).
- Non-hitscan (projectiles): spawn the projectile slightly rewound / velocity-advanced so its birth matches the shooter's view, then simulate it in present time like any entity — full rewind-per-projectile-tick is neither needed nor sane.
- Melee/grabs in high-stakes games: same rewind machinery, tighter windows, and more design forgiveness (generous hitboxes, sticky targeting) — the #15 doctrine again: design absorbs what netcode can't.

## The complete time picture (keep this diagram in your head)

One entity exists at three times simultaneously: **the server's present** (authoritative, where damage applies) · **your predicted present** (your own character, slightly ahead of server ack) · **the interpolated past** (how everyone else appears to you, INTERP_DELAY + transit behind). Netcode bugs are almost always two systems disagreeing about *which* of these times they're talking in — a hit test against present positions with past-time aims, a pickup radius checked in predicted-space against interpolated items. Every gameplay query that spans entities must name its reference frame; "just use .position" is the bug.

## Smoothness details that separate shipped from janky

- Correction smoothing applies to remote entities too: when a snapshot contradicts the interpolation you showed (post-extrapolation snap), bleed it over ~100ms — same exponential decay as prediction's reconcile smoothing.
- Animation/net decoupling: drive locomotion anims from interpolated *velocity*, not from network events — 20Hz snapshots through 60fps animation via velocity-driven blending looks native.
- Audio/VFX timing: fire them at *render* time crossings (with the interpolated world), not at packet arrival — a gunshot sound 100ms before its muzzle flash reads as a bug even when it's "more accurate".
- Local prediction + remote interpolation means *your* projectiles vs *their* bodies inherently cross time domains — the classic solution stack: client presents optimistic tracers instantly, server judges via lag comp, tracer bends/confirms on verdict. Players notice none of it, which is the entire art.
