---
name: bevy-mastery
description: Expert Bevy doctrine — the Rust ECS game engine: entities/components/systems and query design, app architecture with plugins and schedules, events and observers, transforms and rendering (2D/3D), assets, input, physics via Avian, fixed-timestep gameplay, performance and compile times, WASM builds, and decoding Bevy's error codes. Use whenever working on a Bevy project — writing systems or queries, structuring plugins, fixing B0001/borrow conflicts or "resource does not exist" panics, migrating between Bevy versions, integrating physics/UI/input crates, shipping to web or desktop, or starting a Rust game. Pairs with rust-mastery (the language) and game-design (the judgment).
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Bevy Mastery

Bevy is ECS all the way down: **the world is a database** (entities = rows, components = columns), **systems are queries over it** that the scheduler runs in parallel wherever data access allows, and *everything* — rendering, input, time, your gameplay — is the same machinery. Thinking in objects ("the Player class") produces fighting; thinking in data ("entities with `Player`, `Health`, `Velocity`") produces Bevy. The engine's two gifts are Rust's guarantees and automatic parallelism; both are bought with the same coin: declaring your data access honestly.

## Version awareness — survival requirement, not a tip

Bevy ships ~3–4 releases a year and **every release breaks APIs** (0.15 required components; 0.16 relationships/`ChildOf`; 0.17+ Result-returning systems; 0.19 the BSN scene system, resources-as-components). Before writing any code:

1. Check `Cargo.toml` for the Bevy version — all advice is version-relative, and training-data Bevy is *always* stale. When an API is missing/renamed, consult the official migration guides (https://bevy.org/learn/migration-guides/) for the exact hop.
2. Ecosystem crates (avian, leafwing-input-manager, bevy_egui, lightyear…) lag releases by days-to-months — check each crate's compatibility table before bumping Bevy itself. Upgrades are a project, not a `cargo update`.
3. When docs.rs and reality disagree, `cargo doc --open` on *your* resolved versions is the truth.

This skill teaches the doctrine that survives releases: the ECS mental model, scheduling, architecture patterns — flagging version-gated syntax where it matters.

## Reference map — read before working in that area

| Task involves | Read |
| --- | --- |
| Entities, components, queries, Commands, resources, the ECS mental model | [references/ecs-fundamentals.md](references/ecs-fundamentals.md) |
| App structure, plugins, schedules, system ordering, states, run conditions | [references/app-architecture.md](references/app-architecture.md) |
| Events, observers, hooks, change detection, entity relationships | [references/events-observers.md](references/events-observers.md) |
| Transforms, hierarchy, cameras, 2D sprites, 3D meshes/materials, visibility | [references/transforms-rendering.md](references/transforms-rendering.md) |
| Loading assets, handles, hot reload, custom assets, scenes | [references/assets-scenes.md](references/assets-scenes.md) |
| Keyboard/gamepad/mouse input, UI (bevy_ui), action mapping | [references/input-ui.md](references/input-ui.md) |
| Gameplay: fixed timestep, timers, physics (Avian), character controllers, audio | [references/gameplay-patterns.md](references/gameplay-patterns.md) |
| Slow frames, query performance, profiling, compile times, release builds | [references/performance.md](references/performance.md) |
| B0001 and friends, panics, WASM builds, the ecosystem crate map | [references/troubleshooting-ecosystem.md](references/troubleshooting-ecosystem.md) |

Rust language questions (ownership, lifetimes, unsafe) → the rust-mastery rune. Is-it-fun questions → game-design.

## Non-negotiables

1. **Components are data, systems are behavior.** No methods with gameplay logic on components; a component with an `update()` urge is a system waiting to be written. Small, single-purpose components (`Velocity`, `Health`, `Poisoned`) compose; god-components (`PlayerData` with 30 fields) recreate OOP's problems minus the ergonomics.
2. **Marker components are free — use them everywhere**: `#[derive(Component)] struct Enemy;` + `Query<&Transform, With<Enemy>>` is the idiom. Filtering by marker beats enums-with-match inside systems (the scheduler and archetypes do the work).
3. **Query exactly what you touch**: `&T` for reads, `&mut T` only when writing (it triggers change detection and blocks parallelism), `With/Without` for presence. Over-asking `&mut` serializes your schedule silently.
4. **`Commands` for structural changes** (spawn/despawn/insert/remove) and know they apply **deferred** — at the next sync point, not instantly. The classic bug: spawn then query same-frame and find nothing. Design around the boundary or force one (`ApplyDeferred`, chained systems).
5. **One source of truth per behavior**: physics owns transforms it simulates (Avian), animation owns what it animates, your code owns the rest — two writers to one component = jitter and heisenbugs. When two systems must influence one value, one system merges *intents* (components as inbox) into the write.
6. **Gameplay in `FixedUpdate`, presentation in `Update`.** Physics, timers with gameplay meaning, and simulation step at fixed rate; cameras, UI, VFX interpolate in Update. Mixing them recreates the web's variable-timestep sins with extra steps (the game-design/web-games doctrine, ECS edition).
7. **Explicit ordering only where truth requires it**: `.chain()` / `.before()/.after()` / system sets for real data dependencies; everywhere else let the scheduler parallelize. Ordering everything "to be safe" throws away Bevy's superpower; ordering nothing invites frame-late bugs (read after deferred write).
8. **States for modes, run conditions for gates**: `States` (Menu/Playing/Paused) + `OnEnter/OnExit` for setup/teardown + `.run_if(in_state(...))` — not `if game.paused { return }` sprinkled through fifty systems.
9. **Every `OnEnter` has an `OnExit`**: entities spawned for a state despawn on leaving it (`StateScoped` entities or an explicit cleanup system per state). Scene-change leaks are Bevy's version of the web's listener leaks.
10. **Plugins are your modules**: one plugin per feature (`CombatPlugin`, `InventoryPlugin`) owning its components, systems, events, and sets — `main.rs` is a plugin list. A plugin you can delete cleanly is architecture; a plugin reaching into another's internals is a module boundary lying.
11. **Panics are for setup, `Result`/graceful-skip for runtime**: `.unwrap()` on assets/resources in Startup is honest fail-fast; the same in Update systems is a crash on a race. Use `Option<Res<T>>`, `Query::single()` handled (returns Result), and let fallible systems return errors where the Bevy version supports it.
12. **Assets are handles, loading is async**: a `Handle<T>` is a claim ticket, not the asset. Gate gameplay on load states (loading screen driven by asset events/`LoadState`), never assume a handle resolves this frame.
13. **Change detection over polling**: `Changed<T>`/`Added<T>` filters and observers make systems that react instead of scan. A system iterating everything every frame to detect what moved is paying for the feature Bevy gives free — but know `&mut` derefs mark changed even without writes (`bypass_change_detection`/`set_if_neq` where it matters).
14. **`cargo run` iteration must stay fast**: `dynamic_linking` feature in dev, `opt-level = 1` for your code / `3` for deps, and generic-heavy systems split so incremental rebuilds stay seconds. Bevy compile pain is configuration debt, not fate (performance.md).
15. **Fight the borrow checker with ECS tools, not cleverness**: conflicting queries → `Without` disjointness or `ParamSet`; deep entangled access → exclusive system (`&mut World`) honestly; never `unsafe` around the scheduler. The B0001-class errors are design feedback, same doctrine as rust-mastery's ownership ladder.

## Decision framework — where does this logic live?

- Reacts to a specific happening (damage dealt, button clicked, entity spawned) → **observer/event handler** (events-observers.md).
- Runs every simulation tick over matching data (movement, timers, AI think) → **`FixedUpdate` system** with tight queries.
- Runs every rendered frame (camera follow, animation sampling, UI sync) → **`Update` system**.
- Happens on mode change (build the level, tear down the menu) → **`OnEnter`/`OnExit`** of a state.
- Needs the whole world mutably (save/load, complex spawning) → **exclusive system**, kept rare and at schedule edges.
- Configuration/service shared app-wide (score, settings, RNG) → **`Resource`** — but if it's per-thing state, it's a component; resources holding `Vec<EntityData>` are components in denial.

## Decision framework — modeling data (component granularity)

1. Can two entities differ in this? → component, not resource.
2. Is it a flag/tag? → marker component (unit struct), not a bool field.
3. Do systems care about A and B separately? → two components, even if they "belong together" conceptually.
4. Is it derived per-frame from other data? → compute in a system, don't store (stale-cache bugs), unless profiled hot.
5. Does one entity relate to another? → typed relationship (`ChildOf`-style, 0.16+) or an `Entity` field — and handle the dangling case (entities die; `Entity` ids in components are the ECS use-after-free).

## Review checklist (sweep before shipping Bevy code)

Versions pinned and migration-guide-checked · components data-only, markers over enums · no gratuitous `&mut` in queries · deferred-command boundaries respected · gameplay in FixedUpdate · states with symmetric enter/exit cleanup · plugins deletable · no runtime unwraps on assets/singletons · change detection where polling was tempting · dev profile fast (dynamic_linking) · release profile real (LTO) · WASM target tested if web is a target.
