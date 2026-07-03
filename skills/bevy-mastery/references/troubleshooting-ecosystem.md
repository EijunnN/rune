# Troubleshooting & Ecosystem — Errors Decoded, Crates Mapped

## The error bestiary

**B0001 — query/system param conflict** ("&mut access conflicts with a previous access"): two params in one system could reach the same component mutably. Fixes in order (the SKILL.md #15 ladder): prove disjointness with `Without<T>` on one query · `ParamSet<(Query<…>, Query<…>)>` when both genuinely target overlapping sets (access one at a time) · exclusive system (`&mut World`) when the operation is truly global. It's a compile/startup panic *by design* — the scheduler refusing to guess.

**B0002 — resource conflict** (`Res<T>` + `ResMut<T>` in one system): same rule, resources edition. Split the system or take `ResMut` alone.

**B0003 — Commands on a despawned entity**: a queued command targeted an entity that died earlier in the flush. Symptom of despawn-anywhere architecture — adopt the Dead-marker + single cleanup set (gameplay-patterns.md) and `commands.get_entity(e)` guards.

**"Resource requested by system does not exist"** (panic at startup or state entry): `Res<T>` before `insert_resource`. Order plugin setup honestly, use `init_resource` defaults, or take `Option<Res<T>>` where absence is a real state (#11).

**Query returned no/multiple entities** (`single()` Err): frames where the player isn't spawned yet (menu, death) are normal — `let Ok(x) = q.single() else { return }`, never unwrap in Update-class systems.

**Spawned it but queries don't see it**: deferred commands (#4). The entity exists next sync point — restructure, or react with an observer (which sees it immediately).

**"It moved but snapped back" / jitter**: two writers on Transform (your system + physics/animation/hierarchy propagation). One-writer rule (#5); with Avian, drive bodies through physics components, not raw Transform.

**Child transforms wrong**: writing `GlobalTransform` (computed — write `Transform`), or reading Global same-frame before propagation (transforms-rendering.md).

**Trait-bound wall of text on `add_systems`** ("the trait `IntoSystem…` is not implemented"): a param isn't a valid system param — a bare `&World`, a non-Resource type in `Res<>`, a missing `#[derive(Component/Resource/Event)]`, or `&mut` where the wrapper (`ResMut`) belongs. Read the *innermost* type it names; the rust-mastery error-reading doctrine (inside-out) applies verbatim.

**Sprite/mesh invisible**: no camera spawned (the classic first-project one) · z-order/behind camera · asset not loaded yet (handle ≠ asset, assets-scenes.md) · `Visibility::Hidden` inherited from a parent.

**Every enemy has the same rotation/behavior**: shared mutable state via a misused resource, or one entity's components accidentally reused — spawn functions with per-instance data (gameplay-patterns.md); check you're iterating `&mut q` and not writing through a stale single.

**Version mismatch hell** ("expected `bevy_x::Y`, found `bevy_x::Y`"): two Bevy versions in the tree — an ecosystem crate pinned to the previous release. `cargo tree -d | grep bevy`, then align (usually: wait for or patch the lagging crate). Same disease rust-mastery documents; Bevy's release cadence makes it chronic — pin exact-compatible ecosystem versions per the compat tables.

## Migration discipline (the quarterly ritual)

Upgrade *deliberately*: read the official migration guide top-to-bottom first (bevy.org/learn/migration-guides) · upgrade Bevy + all ecosystem crates in one branch (mixed versions don't build) · fix by compiler-error archaeology (renames are mechanical; semantic changes — schedule reorganizations, observer API shifts, scene system rework in 0.19 — are the ones to read twice) · run the headless test suite (gameplay-patterns.md) before trusting the port · budget: minor project = an afternoon; heavy ecosystem usage = days. Skipping releases compounds: two-hop migrations through the guides, one hop at a time.

## The ecosystem map (check compat table before adopting)

| Need | Crate |
| --- | --- |
| Physics | **avian2d/3d** (ECS-native default) · bevy_rapier (battle-tested) |
| Input actions/rebinding | **leafwing-input-manager** |
| Asset loading states | **bevy_asset_loader** |
| Dev inspector | **bevy-inspector-egui** (+ bevy_egui for tools) |
| 2D levels | **bevy_ecs_ldtk** (LDtk pipeline) · bevy_ecs_tilemap (raw tile rendering) |
| Audio (buses/layers) | **bevy_kira_audio** · bevy_seedling (newer) |
| Tweening/juice | bevy_tweening · custom lerp systems (juice doctrine ports from web-games) |
| 3D character controller | bevy_tnua |
| Networking | lightyear (client-server rollback) · bevy_replicon |
| UI beyond bevy_ui | bevy_egui (tools) · ecosystem UI experiments (volatile — evaluate freshness) |
| Particles | bevy_hanabi (GPU) |

Adoption doctrine (rust-mastery's dependency hires + one Bevy twist): maintenance pulse matters *more* here because every Bevy release orphans unmaintained crates within months. A crate that missed the last Bevy version is a fork-or-avoid decision, not a "probably fine".

## WASM / web builds (the itch.io path)

- Target: `wasm32-unknown-unknown`, `wasm-bindgen` + a canvas host page; **trunk** or `wasm-server-runner` for dev serving. Release: `opt-level = "z"` profile + `wasm-opt -Oz` (performance.md) — Bevy WASM binaries are MBs; budget like web-games says portals demand.
- Web quirks inherited from the platform (web-games rune is the authority): audio requires a user gesture (spawn audio after first input — the unlock doctrine), `visibilitychange` throttling (pause on hidden), asset paths relative for itch's iframe, and no threads by default (Bevy runs single-threaded scheduling on WASM unless atomics flags — accept single-thread for jams).
- Rendering backend is WebGL2/WebGPU per browser support — test both; shader edge cases differ.
- The genuinely honest note: for *pure web* targets, a JS/TS stack (web-games rune) ships smaller and faster; Bevy-on-WASM shines when web is *one* target of a native-first game (the same code ships to Steam via `cargo build --release` — no wrapper needed, Bevy's actual superpower over the web stack).

## When Bevy fights you repeatedly

Recurring B0001s, systems that all want everything, resources ballooning — the design wants restructuring, not workarounds: smaller components, intent-inbox patterns (#5), set spines (app-architecture.md). Bevy's friction is unusually honest — it's almost always pointing at shared-mutable-everything design, the exact thing ECS exists to dissolve. Same meta-doctrine as rust-mastery: the checker/scheduler complaining is the architecture review, free.
