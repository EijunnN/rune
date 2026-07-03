# Events, Observers & Change Detection — Reacting Instead of Scanning

Three reactive tools, each with a timing personality: **events** (buffered, read next-ish), **observers** (immediate, per-entity), **change detection** (filter on what mutated). Choosing right keeps systems small and the schedule parallel; choosing wrong creates frame-late bugs or spaghetti.

## Buffered events — the decoupling workhorse

```rust
#[derive(Event)]
struct DamageDealt { target: Entity, amount: f32, source: Entity }

// producer:
fn melee_hits(mut events: EventWriter<DamageDealt>, /* … */) {
    events.write(DamageDealt { target, amount: 12.0, source });
}
// consumers (parallel-friendly — many readers, independent cursors):
fn apply_damage(mut events: EventReader<DamageDealt>, mut healths: Query<&mut Health>) {
    for ev in events.read() {
        if let Ok(mut h) = healths.get_mut(ev.target) { h.current -= ev.amount; }
    }
}
fn damage_numbers(mut events: EventReader<DamageDealt>, /* UI spawn */) { /* same events, own cursor */ }
```

- Register per type: `app.add_event::<DamageDealt>()`. Buffers are double-buffered: events live ~two frames; a reader that doesn't run (paused state!) *misses* events — gate producers and consumers with the same run conditions, or drain deliberately.
- Events are the **cross-plugin API** (app-architecture.md): CombatPlugin emits `EnemyDied`; Score, Audio, and VFX plugins each react without knowing each other. This is the decoupling event queues bought in the web-games rune, typed.
- Ordering: readers see events written earlier the same frame only if scheduled after the writer; otherwise next frame. For gameplay-critical same-tick causality inside FixedUpdate, order the sets (Intents → Resolve) — that's what the set spine is for.

## Observers — immediate, targeted reactions

```rust
// entity-targeted trigger:
commands.trigger_targets(Explode { radius: 3.0 }, bomb_entity);

// observer runs IMMEDIATELY (not deferred), with world access:
app.add_observer(|trigger: Trigger<Explode>, transforms: Query<&Transform>, mut commands: Commands| {
    let bomb = trigger.target();
    // spawn VFX, deal area damage…
});

// lifecycle observers — the killer feature:
app.add_observer(|trigger: Trigger<OnAdd, Poisoned>, mut q: Query<&mut Sprite>| {
    if let Ok(mut sprite) = q.get_mut(trigger.target()) { sprite.color = GREEN; }
});
// OnAdd / OnInsert / OnReplace / OnRemove — react to component structure changes
```

- Observers run synchronously at the trigger point — no frame delay, and they can trigger further observers (chains). That immediacy is the power and the risk: deep observer chains are hidden control flow; keep them shallow (one reaction, maybe one command) and push heavy consequences into events/systems.
- **When observer vs event**: per-entity, needs-to-happen-now, structural reactions (cleanup on remove, decorate on add) → observer. Broadcast facts many systems consume on their own schedule → buffered event. Rule of thumb: observers for *entity lifecycle & targeted commands*, events for *gameplay facts*.
- Component hooks (`on_add`/`on_remove` on the component definition) are the lower-level sibling — for invariants the component *itself* must maintain (indexes, counters), not gameplay.
- Version note: observer API names/ergonomics have shifted across releases (Trigger vs On, etc. — 0.19-era renames); the concepts are stable, check the migration guide for exact signatures on your version.

## Entity relationships (0.16+) — links that clean themselves

```rust
// built-in: ChildOf / Children (the transform hierarchy uses it)
commands.entity(sword).insert(ChildOf(player_entity));

// custom relationships: the same machinery for gameplay links
#[derive(Component)]
#[relationship(relationship_target = Minions)]
struct MinionOf(Entity);

#[derive(Component)]
#[relationship_target(relationship = MinionOf)]
struct Minions(Vec<Entity>);
```

- Relationships maintain the inverse automatically and **clean up on despawn** — the dangling-`Entity` class of bugs (ecs-fundamentals.md) largely dissolves for modeled links. Raw `Entity` fields remain for loose references (current target), with the get-and-check discipline.
- Despawning a parent despawns the relationship subtree per the relationship's rules (children by default) — design ownership consciously: is the dropped sword a child (dies with owner) or free-standing (owner link severed)?

## Change detection — the free reactivity layer

```rust
fn sync_health_bars(healths: Query<(&Health, &Children), Changed<Health>>, /* … */) { /* only touched ones */ }
fn on_new_enemies(fresh: Query<&Transform, Added<Enemy>>) { /* spawned since my last run */ }
fn mourn(mut removed: RemovedComponents<Enemy>) { for e in removed.read() { /* … */ } }
```

- `Changed<T>` = mutably dereferenced since this system last ran (works across frames, per-system tracking). `Added<T>` = inserted since last run. Both are *filters* — the cheap way to make UI-sync, index-maintenance, and reaction systems O(changed) instead of O(all).
- **False positives doctrine** (#13): `for mut h in &mut q` marks every `h` changed even if you wrote nothing. Guard hot flags with `h.set_if_neq(new)` (only marks on real change), or read-first-write-if-different, or `bypass_change_detection()` for bookkeeping writes that shouldn't ripple.
- `Ref<T>` in queries gives `.is_changed()/.is_added()` per item when you need mixed behavior in one pass.
- Change detection is per-*component*: granular components (ecs-fundamentals.md) make it precise; god-components make everything "changed" always — another tax on blob design.

## The reactive palette, summarized

| Need | Tool |
| --- | --- |
| Many systems react to a gameplay fact | buffered `Event` |
| Do something to a specific entity now | `trigger_targets` + observer |
| React to a component appearing/vanishing | `OnAdd`/`OnRemove` observer (or hook for invariants) |
| Keep derived data in sync cheaply | system with `Changed<T>` filter |
| First-frame setup for new entities | `Added<T>` filter |
| Cleanup for despawned/de-tagged things | `RemovedComponents` / `OnRemove` observer / relationships |
| Cross-plugin communication | events + public system sets, never direct pokes |
