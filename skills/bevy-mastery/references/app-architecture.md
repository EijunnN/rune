# App Architecture — Plugins, Schedules, States

A Bevy app is a plugin tree over a schedule graph. Architecture here means: features as plugins, truth-only ordering, modes as states. Get these three right and a jam prototype scales into a shipped game without a rewrite.

## Plugins — the module system (use it from day one)

```rust
pub struct CombatPlugin;

impl Plugin for CombatPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<ComboCounter>()
            .add_event::<DamageDealt>()
            .configure_sets(FixedUpdate, (CombatSet::Intents, CombatSet::Resolve).chain())
            .add_systems(FixedUpdate, (
                aim.in_set(CombatSet::Intents),
                (apply_damage, apply_knockback).in_set(CombatSet::Resolve),
            ))
            .add_systems(OnEnter(GameState::Playing), spawn_arena)
            .add_observer(on_enemy_died);
    }
}

// main.rs is a manifest:
App::new()
    .add_plugins(DefaultPlugins.set(ImagePlugin::default_nearest()))   // pixel art: nearest sampling
    .add_plugins((CombatPlugin, InventoryPlugin, UiPlugin))
    .init_state::<GameState>()
    .run();
```

- One plugin per feature; it owns its components/events/resources/sets and *exports* a small public surface (its sets, its events) for others to order against. Cross-plugin reach-ins are the coupling smell.
- `DefaultPlugins` is itself a plugin group — configure via `.set(...)` (window title, asset path, log level, nearest-neighbor sampling) instead of fighting defaults downstream.
- Plugins compose into groups for editions of the app: `DevPlugins` (inspector, gizmos, hot reload) added behind `#[cfg(debug_assertions)]` or a feature flag.

## Schedules — where systems live

| Schedule | Runs | Belongs there |
| --- | --- | --- |
| `Startup` / `PreStartup` | once at boot | cameras, initial resources, kicking off asset loads |
| `Update` | every frame | presentation: camera follow, UI sync, VFX, input *sampling into intents* |
| `FixedUpdate` | 0..N times/frame at fixed Hz | **gameplay**: movement, physics-adjacent logic, timers, AI (SKILL.md #6) |
| `OnEnter(S)/OnExit(S)` | at state transitions | setup/teardown per mode |
| `PreUpdate/PostUpdate` | engine bookkeeping frames | rarely yours; transform propagation etc. live here |

- FixedUpdate rate: `app.insert_resource(Time::<Fixed>::from_hz(60.0))`. Inside it, `Res<Time>` yields the fixed delta automatically — write systems against `time.delta_secs()` and they're correct in either schedule.
- The visual smoothing companion: entities moved in FixedUpdate get interpolated for rendering (roll your own prev/current lerp in Update, or use the ecosystem's interpolation crates; Avian offers built-in interpolation for physics bodies — gameplay-patterns.md).
- Frame flow intuition: input events arrive → `Update` samples them into intent components → `FixedUpdate` consumes intents 0..N times → `PostUpdate` propagates transforms → render. Intents-as-components decouple the two clock domains cleanly (input-ui.md).

## Ordering — truth, not vibes

```rust
#[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
enum CombatSet { Intents, Resolve, Cleanup }

app.configure_sets(FixedUpdate, (CombatSet::Intents, CombatSet::Resolve, CombatSet::Cleanup).chain());
// systems join sets; cross-plugin ordering targets SETS, not foreign systems:
app.add_systems(FixedUpdate, ui_damage_numbers.after(CombatSet::Resolve));
```

- Order only real data dependencies (#7). Named sets per phase (Intents → Simulate → Resolve → Cleanup is a good universal spine) give plugins public anchors — importing another plugin's *system function* to `.after()` it couples internals.
- `.chain()` on a tuple = sequential within; great for small pipelines. Beware chaining everything: you're hand-rolling a single thread.
- Deferred commands apply between sets/sync points — a `Cleanup` set after `Resolve` sees `Resolve`'s spawns. When you need it explicit: `ApplyDeferred` as a system between sets (rarely necessary; the framework inserts sync points at ordering edges).

## States — modes done properly

```rust
#[derive(States, Debug, Clone, PartialEq, Eq, Hash, Default)]
enum GameState { #[default] Loading, Menu, Playing, Paused }

app.init_state::<GameState>()
    .add_systems(OnEnter(GameState::Playing), setup_level)
    .add_systems(OnExit(GameState::Playing), teardown_level)
    .add_systems(Update, pause_hotkey.run_if(in_state(GameState::Playing)))
    .add_systems(FixedUpdate, gameplay_systems.run_if(in_state(GameState::Playing)));

// transitions: mut next: ResMut<NextState<GameState>> → next.set(GameState::Paused)
```

- **StateScoped entities** are the leak-killer: `commands.spawn((StateScoped(GameState::Playing), level_stuff))` auto-despawns on exit — the #9 non-negotiable with zero cleanup systems. (Name/feature varies slightly by version — the *pattern* of state-owned entities is the doctrine.)
- Sub-states / computed states for hierarchies (Playing::{Exploring, Combat}) exist in current Bevy — prefer them over parallel bool resources when modes truly nest.
- Pause = a state that gates `FixedUpdate` gameplay sets, while Update keeps rendering the frozen world and running the pause menu. Also consider `Time::<Virtual>` pausing (`time.pause()`) for "world stops, app continues" — cleaner than gating every system when *everything* time-based should freeze.
- Run conditions compose: `.run_if(in_state(Playing).and(resource_exists::<LevelReady>))` — conditions are cheap, readable gates; `if` guards inside systems are invisible to the schedule and to readers.

## Project layout that scales

```
src/
  main.rs          // App::new() + plugin list + global config
  states.rs        // GameState + transition helpers
  combat/          // mod.rs = CombatPlugin; components.rs, systems.rs, events.rs
  inventory/
  ui/
  dev/             // debug plugins, cfg-gated
```

Feature folders mirror plugins 1:1; shared vocabulary components (Health, Team, Velocity) get a small `core/` plugin others depend on. The dependency direction stays: features → core, never feature → feature (talk via events/relationships instead — events-observers.md). A workspace split (game logic crate + thin binary) helps compile times and headless testing later (performance.md, testing note in gameplay-patterns.md).
