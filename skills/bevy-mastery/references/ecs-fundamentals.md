# ECS Fundamentals — The World Is a Database

Mental model: the `World` stores entities (opaque ids) with sets of components (plain Rust types). Systems declare *what data they access*; the scheduler runs non-conflicting systems in parallel. Your job is honest declarations and tight queries — everything else follows.

## Components (the vocabulary of your game)

```rust
#[derive(Component)]
struct Health { current: f32, max: f32 }

#[derive(Component)]
struct Poisoned { dps: f32, until: f32 }   // state-as-component: add to afflict, remove to cure

#[derive(Component)]
struct Enemy;                               // marker: presence IS the information

// Required components (0.15+): spawning one auto-inserts its dependencies
#[derive(Component)]
#[require(Health, Transform)]
struct Monster;
```

- **Presence is state**: `Poisoned` as an insertable/removable component beats `is_poisoned: bool` — systems filter it (`With<Poisoned>`), change detection sees it arrive (`Added<Poisoned>`), and absent means zero cost.
- Required components largely replace bundles as the spawn-correctness tool: define the dependency once on the type, `commands.spawn(Monster)` brings the rest with defaults (customize via `#[require(Health(monster_health))]`-style constructors). Bundles remain fine for grouping spawn data.
- Newtype components for domain values (`struct Speed(f32)`) — same rust-mastery doctrine; ECS makes it cheaper still because components are already types.

## Spawning, despawning, Commands

```rust
fn spawn_wave(mut commands: Commands) {
    let boss = commands.spawn((Monster, Boss, Speed(2.0))).id();   // tuple = ad-hoc bundle
    commands.entity(boss).insert(Enraged);                          // add later
    commands.entity(old_boss).despawn();                            // includes descendants in current Bevy
}
```

- **Commands are deferred** (SKILL.md #4): queued, applied at the next sync point. Same-frame spawn-then-query finds nothing; insert-then-read reads the old value. Structure: producers write commands, consumers run *next* tick or after an explicit boundary — or use observers, which see spawns immediately (events-observers.md).
- Despawn safety: other entities holding this `Entity` id now dangle — `commands.get_entity(e)` / `query.get(e).is_ok()` before use, or model links as relationships that clean themselves (events-observers.md).
- Entity ids are generational: a stored `Entity` won't alias a new entity, it just becomes invalid — check, don't pray.

## Queries (the workhorse; design them tight)

```rust
fn poison_tick(
    time: Res<Time>,
    mut q: Query<(Entity, &mut Health, &Poisoned), Without<Invulnerable>>,
    mut commands: Commands,
) {
    for (e, mut health, poison) in &mut q {
        health.current -= poison.dps * time.delta_secs();
        if time.elapsed_secs() > poison.until { commands.entity(e).remove::<Poisoned>(); }
    }
}
```

- Tuple = what you access; filters (`With`, `Without`, `Or`, `Changed`, `Added`) = who matches without accessing. Keep access minimal (#3): every `&mut` narrows what can run in parallel with you.
- **Single-entity access**: `query.single()`/`single_mut()` return `Result` — handle it (menu frames where the player doesn't exist yet are normal, not exceptional). For known entities: `query.get(entity)`.
- Pairwise interactions: `iter_combinations_mut()` for N×N (fine for dozens, not thousands — physics engines exist, gameplay-patterns.md); or collect ids first and use `get_many_mut([a, b])` for exact pairs.
- Query conflict rule: two queries in one system that could both reach the same component with one `&mut` won't compile/panic (B0001) — prove disjointness with `Without`, or use `ParamSet<(Query…, Query…)>` (access one at a time), or accept an exclusive system. This is the scheduler asking you to state the truth (troubleshooting-ecosystem.md decodes the errors).

## Resources (world-global singletons)

```rust
#[derive(Resource)]
struct Score(u32);

fn scoring(mut score: ResMut<Score>, mut deaths: EventReader<EnemyDied>) {
    for d in deaths.read() { score.0 += d.value; }
}
```

- `Res<T>`/`ResMut<T>` in system params; `Option<Res<T>>` when it may not exist yet (#11). Insert at startup (`app.insert_resource`) or `init_resource` with `Default`.
- Resource discipline: settings, scores, RNG (`Resource` wrapping a seeded rng — determinism doctrine), asset handle registries. *Not* for lists of per-entity data — that's components. `ResMut` is a parallelism wall like any `&mut` (every system touching it serializes) — one more reason big resource blobs rot schedules.
- 0.19+: resources are components on a hidden entity under the hood — hooks/observers/immutability work on them; the `Res/ResMut` API remains your daily interface.

## System params beyond queries

`Commands` · `Res/ResMut` · `EventReader/Writer` · `Local<T>` (per-system persistent state — great for cooldown timers internal to one system) · `Query<…>` · `Time` (`Res<Time>` — delta-aware automatically per schedule: in FixedUpdate it's the fixed delta) · gizmos, asset servers, etc. All declared = all visible to the scheduler; that's the contract that buys parallelism.

## Archetypes (why any of this is fast)

Entities with the same component *set* live together in contiguous tables; a query iterates matching tables linearly — cache-friendly like Rust's SoA doctrine, automatically. Consequences:
- Adding/removing components moves the entity between archetypes (that's the cost of state-as-components: cheap, not free — for *very* hot flickering flags on thousands of entities, a bool field or marker-on-child can beat add/remove churn; profile before contorting).
- Fragmentation: hundreds of unique component combinations = many small tables = slower iteration. Prefer a few well-chosen markers over combinatorial tag explosions.
- Iteration order is unstable — never encode gameplay meaning in "the order the query returned things" (sort explicitly when order matters, e.g. by a `Priority` component).
