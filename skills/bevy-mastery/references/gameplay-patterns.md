# Gameplay Patterns — Timers, Physics, Controllers, Audio, Saves

The recurring shapes of actual game code in ECS form. Everything here runs in `FixedUpdate` unless labeled presentation.

## Timers & cooldowns (components, always)

```rust
#[derive(Component)]
struct AttackCooldown(Timer);              // Timer::from_seconds(0.5, TimerMode::Once)

fn tick_cooldowns(time: Res<Time>, mut q: Query<&mut AttackCooldown>, mut commands: Commands /*…*/) {
    for mut cd in &mut q {
        if cd.0.tick(time.delta()).just_finished() { /* ready — or remove the component */ }
    }
}
```

- `Timer` (once/repeating) + tick with the schedule's delta; `Stopwatch` for counting up. Timers as *components* scale (every enemy its own cooldown) and die with their entity — timers in resources for world-level rhythms only (wave spawner).
- Delayed one-shots: spawn an entity with a `DelayedAction { timer, what }` component + one executor system — the ECS `setTimeout`, pause-aware and save-friendly, unlike actual threads/tasks.
- Durations respect `Time<Virtual>` pause/speed (app-architecture.md) — slow-mo and pause work through the same dt every timer already uses. Hitstop/timescale juice = `time.set_relative_speed(0.2)` briefly (presentation-driven, but affects Virtual time — decide whether UI timers use `Time<Real>`).

## Physics: Avian (the Bevy-native default)

```rust
// avian2d / avian3d — ECS-native: bodies and colliders ARE components
app.add_plugins(PhysicsPlugins::default());

commands.spawn((
    RigidBody::Dynamic,
    Collider::circle(0.5),
    LinearVelocity(Vec2::new(3.0, 0.0)),
    Transform::from_xyz(0., 4., 0.),
    CollisionLayers::new(GameLayer::Enemy, [GameLayer::Player, GameLayer::Ground]),
));
```

- **Avian** over bevy_rapier for new projects: ECS-native (query velocities like any component), schedules integrate cleanly, interpolation built in. Rapier remains solid/more battle-tested — whichever, the cross-engine doctrine holds (web-games physics-collision.md): kinematic character bodies for players, `Sensor` colliders for triggers/pickups, collision layers from day one, sane world scale (meters-ish, not pixels — or configure gravity/pixels-per-meter deliberately in 2D).
- Collision *events/queries* drive gameplay: `CollisionStarted`/collision event readers or `CollidingEntities` components → your damage/pickup systems. Physics detects; gameplay resolves (the detection/resolution split, ECS edition).
- One writer rule (#5): dynamic bodies — physics writes Transform, you write forces/velocities; kinematic — you write velocity/position *through the physics API*, never both raw Transform and physics on the same entity.
- Don't reach for a physics engine for grid/tile games — hand-rolled AABB against a tile grid (web-games patterns port directly, Vec2 for Vec2) stays the right call for tight platformer feel.

## Character controller shape

```rust
// FixedUpdate chain: read intents (input-ui.md) → apply movement → resolve state
fn move_player(
    time: Res<Time>,
    mut q: Query<(&mut MoveIntent, &mut LinearVelocity, &Grounded), With<Player>>,
    tuning: Res<Tuning>,
) {
    let Ok((mut intent, mut vel, grounded)) = q.single_mut() else { return };
    let now = time.elapsed_secs();
    vel.x = intent.dir.x * tuning.move_speed;
    let buffered = intent.jump_buffered_at.is_some_and(|t| now - t < tuning.buffer);
    if buffered && (grounded.0 || now - grounded.left_at < tuning.coyote) {
        vel.y = tuning.jump_v;
        intent.jump_buffered_at = None;   // consume — or it re-fires next tick
    }
}
```

`Grounded` maintained by a sensor/raycast system (Avian ships ray/shape casts); jump-cut on release; state machine as an enum component (`MoveState::{Idle, Run, Jump, Dash}`) whose transitions drive animation selection — the animation system just matches on it (`Changed<MoveState>`). For 3D, ecosystem controllers (`bevy_tnua`) solve slopes/steps — evaluate before hand-rolling.

## Spawning patterns

- **Spawn functions** over copy-pasted component tuples: `fn spawn_goblin(commands: &mut Commands, assets: &GameAssets, pos: Vec2) -> Entity` — one authority per archetype, callable from waves/levels/tests. Data-driven variant: specs as custom assets (assets-scenes.md) feeding one generic spawner.
- Waves/directors as a resource + timer system emitting spawn commands; heavy bursts amortized across ticks (spawn 10/tick, not 300 at once — schedule spikes are frame spikes).
- Projectiles: full entities with `Lifetime` component (timer → despawn) — Bevy handles thousands fine; pooling is *not* default doctrine here (archetype moves are cheap, allocation is amortized) — profile before porting web-games pooling reflexes, and reach for it only at bullet-hell scales.
- Despawn discipline: one `Cleanup` set at tick end processes `Dead` markers (systems mark, cleanup despawns) — mid-tick despawns make later systems' `get(entity)` fail surprisingly.

## Audio

Core `bevy_audio`: `commands.spawn((AudioPlayer::new(assets.boom.clone()), PlaybackSettings::DESPAWN))` — one-shots as entities that clean themselves. Volume/speed via settings; music = looping entity you keep a handle-entity for (fade by mutating volume). For real game audio (buses, dynamic layers, ducking — the web-games audio.md mixer doctrine), **bevy_kira_audio** or the maturing bevy_seedling; the concepts (SFX pitch-variance ±8%, voice caps, music layering on synchronized starts) transfer verbatim. Pitch-vary via playback speed on each shot.

## Saves & determinism

- Save = serialize *chosen* data (the shipping.md doctrine): a `Saveable` slice of the world — progress resources + a query of persistent entities mapped to spec ids, written as RON/JSON via serde to platform storage (`directories` crate for paths; localStorage shim on WASM). Versioned with migrations, same as always. Full-world scene snapshots are fragile across game versions — save *meaning* (player at checkpoint 3 with these items), rebuild entities from specs on load.
- Determinism: seeded RNG as a resource (`ChaCha8Rng` via `rand`), all gameplay randomness drawn from it, fixed timestep already granted — replays and daily seeds fall out (web-games #11, rust-mastery testing doctrine).
- **Headless testing is Bevy's superpower**: `App::new().add_plugins(MinimalPlugins)` + your gameplay plugins, `app.update()` N times, assert on the World — real integration tests of combat/economy with zero window, in CI. `app.world_mut().spawn(...)`, run, `app.world().get::<Health>(e)`. The game-logic-as-plugins architecture (app-architecture.md) is what makes this cheap; testing-doctrine's behavior-over-implementation rules apply unchanged.
