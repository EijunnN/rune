# Performance — Frames, Schedules, and the Other Compiler Fight

Two distinct performance problems in Bevy, never confuse them: **runtime** (frame time) and **iteration** (compile time). Both are configuration-and-doctrine problems before they're heroics. And the universal law holds: measure in the right build — `cargo run` debug Bevy is 10–100x off; all frame-time verdicts come from `--release` (or dev-with-opt deps, below).

## Iteration speed (the fight you win first)

```toml
# Cargo.toml — the standard Bevy dev setup
[features]
dev = ["bevy/dynamic_linking", "bevy/file_watcher"]

[profile.dev]
opt-level = 1                 # your code: mildly optimized, still debuggable

[profile.dev.package."*"]
opt-level = 3                 # Bevy & deps: fully optimized ONCE, cached forever
```

- `cargo run --features dev`: **dynamic_linking** turns the minute-class relink into seconds-class — the single biggest dev-loop lever. Never ship with it (dev feature only).
- Faster linker (rust-mastery troubleshooting doctrine): `lld`/`mold` — on Bevy-sized dep graphs this stacks with dynamic linking.
- Structural: game logic in library crates within a workspace (thin binary), plugins split so a combat tweak doesn't rebuild rendering glue; generics kept off hot recompile paths.
- The dev/release feel gap: with opt-level-3 deps, dev builds are *playable* — feel-tuning in dev builds is legitimate; final feel verdicts in release.

## Runtime: measure

- `FrameTimeDiagnosticsPlugin` + `LogDiagnosticsPlugin` for the always-on numbers; **Tracy** (`trace_tracy` feature + Tracy viewer) for the real picture — per-system timings on the schedule timeline: *see* which systems run long and which serialize the frame.
- `bevy_render::diagnostic` render diagnostics / GPU timers for draw-side cost; `cargo flamegraph` for CPU hot spots inside a system (rust-mastery performance.md owns that layer — allocation discipline, layout, iterators all apply inside systems verbatim).
- The schedule-shape question Tracy answers: is the frame long because systems are slow, or because they're *sequential*? Wide gaps of single-system execution = parallelism lost — audit `&mut` scope, `ResMut` bottlenecks (every system touching `ResMut<BigBlob>` serializes — split the blob), and over-chaining (#7).

## ECS-side costs (in likely order)

1. **O(N²) interactions** — `iter_combinations` over hundreds+ → spatial structure (Avian's broadphase via sensor queries, or a grid-hash resource — web-games spatial doctrine in Rust).
2. **Archetype churn** — add/remove components on thousands of entities per tick (state-flicker) → keep hot flags as data fields where flicker is extreme (ecs-fundamentals.md), batch structural changes into cleanup sets.
3. **Change-detection floods** — writing every `&mut` you touch marks everything changed; downstream `Changed<T>` systems then scan everything anyway → `set_if_neq` discipline (#13).
4. **Table fragmentation** — combinatorial marker explosions → consolidate rarely-queried tags into enum fields.
5. **Per-tick allocation** — Vec collects inside systems each tick → `Local<Vec<_>>` scratch buffers (the ECS version of the scratch-object doctrine every performance file in this library preaches).
6. **Spawn spikes** — burst spawns amortized (gameplay-patterns.md); asset loads at state boundaries, not mid-combat.

Parallel iteration inside one system (`query.par_iter_mut()`) for genuinely heavy per-entity math — after the above, not instead of it.

## Render-side costs

- Draw calls: share materials/meshes (handle clones — transforms-rendering.md); atlases for 2D; current Bevy batches/instances aggressively when materials match, and 0.19-era GPU-driven rendering improves large-scene draw cost — your job is not defeating batching with per-entity material mutations (tint via sprite color, not material clones, in 2D; material property animation via shared-material discipline in 3D).
- Lights & shadows budget as in threejs doctrine: one shadow-casting directional + cheap fills; shadow map resolution honest.
- Visibility: `Visibility::Hidden` for temporarily-gone (no archetype move, no draw); genuinely distant content → disable behavior systems too (invisible-but-simulating is a CPU leak — the activation-radius pattern, ECS edition: strip an `Active` marker and gate systems on it).
- UI: bevy_ui redraws are fine; *rebuilding* UI trees per frame is the sin (input-ui.md — mutate, don't respawn).
- Window/present: `PresentMode::AutoVsync` default; `Fifo` vs `Mailbox` tradeoffs for latency tuning; fullscreen borderless as the shipping default.

## Release profile (deploy-grade)

```toml
[profile.release]
lto = "thin"
codegen-units = 1
# consider panic = "abort" per rust-mastery errors doctrine

[profile.release-wasm]      # web builds: size matters more
inherits = "release"
opt-level = "z"
```

Plus `wasm-opt -Oz` post-pass and the WASM notes in troubleshooting-ecosystem.md (web builds are also where the asset-budget doctrine from web-games bites hardest — a 60MB WASM+assets itch upload loses players before frame one).

## The Bevy-specific honesty rules

Frame verdicts from release builds with Tracy attached, not vibes · schedule parallelism checked before micro-optimizing systems · entity counts in perf reports ("slow" means nothing; "8ms in `enemy_ai` at 2k enemies" is actionable) · and the rust-mastery iron law inherited whole: no optimization without a before/after measurement. Bevy is fast by default; most slow Bevy is one serializing resource, one N², or one debug build away from fine.
