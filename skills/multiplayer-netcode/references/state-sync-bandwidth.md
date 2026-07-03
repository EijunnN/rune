# State Sync & Bandwidth — Sending Less, Meaning More

Bandwidth engineering is four multiplicative levers: **what** (relevance), **how often** (rates), **how encoded** (quantization/deltas), **to whom** (interest). Naive full-state broadcast dies quadratically: N players × N entities × 60Hz × fat floats. Each lever cuts an order of magnitude; shipped games pull all four.

## Snapshots, deltas, baselines

- **Full snapshot**: complete relevant state. Simple, loss-proof (any snapshot stands alone), heavier. Right for: small states, join/recovery moments, and as periodic keyframes.
- **Delta compression**: send changes against a **baseline the receiver has acknowledged**. The ack matters: delta-against-last-sent without acks corrupts on first loss (receiver applies a delta to a baseline it never got). Protocol: receiver acks snapshot IDs → sender deltas against the latest *acked* ID → periodic full keyframes bound recovery time. This is the Quake-lineage design and still the standard.
- Practical middle path (Colyseus-style schema sync, replication libs): per-field dirty tracking — only changed fields serialize. You get 80% of delta wins without hand-rolled baselines; the libs' entire pitch is this lever automated (lightyear/bevy_replicon rooms run the same idea via change detection — the ECS `Changed<T>` machinery feeding the wire).
- **Reliability split** (SKILL.md #9): state = unreliable, newest-wins (stale snapshots dropped without tears — never resend old state); events = reliable channel. Mixing them in one reliable stream imports head-of-line stalls into world updates.

## Quantization (floats are a choice, not a fact)

- Positions: fixed-point within world bounds — a 4km map at 1cm resolution fits 19 bits/axis; an f64 spends 64 on picometers nobody renders. Velocities/angles likewise (angle: 8–10 bits is visually perfect).
- Rotations (3D): quaternion **smallest-three** (drop the largest component, 2 bits index + 3×10 bits) — the standard 32-bit quat.
- Booleans/enums: bit-packed flags; counts with known ranges get exactly their bits. Hand-rolled bit-writers, or the serialization layer's varint/bitpack support (bitcode/postcard in Rust; flatbuffers/custom DataView writers in TS — JSON is for the lobby, never the tick loop).
- **Quantize consistently on both ends** — a predicted client using full-precision floats against a server snapping to the quantization grid manufactures phantom mispredictions. Rule: the *sim* runs on quantized-roundtripped values, or reconciliation compares in quantized space (prediction-reconciliation.md's drift note, root cause edition).
- Compression on top (LZ4/zstd per packet batch) helps text-ish payloads; well-quantized binary barely compresses — bits saved at the source beat bits squeezed at the door.

## Send rates & priority

- Server tick ≠ send rate: simulate 30–60Hz, snapshot 10–30Hz per client — interpolation (interpolation-lagcomp.md) is *designed* to bridge this; higher send rates buy diminishing smoothness at linear cost.
- **Priority accumulators** for entity scheduling within a budget: each entity gains priority per tick (rate by class: players ≫ projectiles ≫ ambient), spends it on inclusion, resets. Under budget pressure, important things stay fresh, decorations get stale — gracefully, automatically.
- Event/rate classes: position streams (unreliable, per-tick eligible) vs slow state (health/scores at 5–10Hz) vs one-shots (reliable events). Every field in the replicated schema gets a class assignment — the audit that finds the "chat presence pings at 60Hz" absurdities every codebase grows.

## Interest management / AOI (to whom)

- **Relevance filtering**: each client receives only what it can perceive — grid cells / radius (spatial-hash doctrine, network edition), team channels (allies' health, not enemies'), plus always-relevant sets (objectives, own party).
- Enter/leave protocol: crossing into relevance triggers a *spawn-grade full state* for that entity (the receiver knows nothing); leaving triggers explicit despawn-from-view (or entities ghost forever at their last seen position). This edge handling is where AOI implementations actually fail — test the boundary crossing under packet loss specifically.
- Hysteresis on the boundary (enter at 95m, leave at 110m) kills flicker-thrash for entities orbiting the radius. Same hysteresis doctrine as every threshold in this library.
- **AOI is also anti-cheat** (servers-security.md): what's never sent can't be wall-hacked. Sight-based relevance (only replicate enemies your server-side line-of-sight confirms) is the strongest anti-ESP that exists — expensive, and worth it exactly in proportion to your stakes.
- Scale note: AOI turns N² player-pairs into ~N×constant — it is *the* lever that separates 8-player rooms from 60-player battlefields; MMOs add sharding/zoning above it (architecture-models.md's "strong reason not to start there").

## Join, recovery, and late state

Joining mid-match = a full keyframe of the relevant world (possibly staged: static world → nearby dynamic → far), then deltas as normal. The same path *is* your loss-recovery and reconnect path (SKILL.md #12) — one code path, three uses, test it as such. Big worlds stream the join (loading screen driven by chunked keyframes) rather than one mega-packet that trips MTU/fragmentation — keep individual datagrams under ~1200 bytes (transport-web.md) and batch by budget per tick.

## The budget discipline

Write the arithmetic before writing code: entities × bytes-per-entity × rate × recipients = server egress (and per-client downstream vs consumer uplinks). A 16-player action game targeting ~20KB/s per client downstream is comfortable everywhere; 100KB/s excludes real players and real server bills. Instrument from week one (testing-network.md): per-message-type byte counters on a debug overlay — the "what got fat" question answered continuously, the same way frame budgets are watched. Bandwidth regressions land silently in feature PRs (a new component auto-replicated at 60Hz) and the counter is what catches them in review.
