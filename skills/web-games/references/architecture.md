# Game Architecture — Loop, Scenes, Entities

## The canonical loop (fixed logic, interpolated render)

This is the load-bearing pattern of the whole rune — gameplay identical at any refresh rate, no physics explosions, smooth rendering:

```ts
const STEP = 1000 / 60;            // logic at fixed 60Hz, in ms
const MAX_DELTA = 100;             // clamp: tab-switches return multi-second deltas
let last = performance.now();
let acc = 0;

function frame(now: number) {
  requestAnimationFrame(frame);
  acc += Math.min(now - last, MAX_DELTA);
  last = now;

  while (acc >= STEP) {            // 0..N logic steps per rendered frame
    prevState.copyFrom(state);     // keep last step for interpolation
    update(STEP / 1000);           // gameplay/physics: constant dt, in seconds
    acc -= STEP;
  }

  render(acc / STEP);              // alpha ∈ [0,1): draw between prev and current
}
requestAnimationFrame(frame);

// render: pos = prev.pos + (curr.pos - prev.pos) * alpha  — kills 120Hz judder
```

- Skipping interpolation is acceptable for jams (render latest state; minor judder on high-Hz screens); skipping the fixed step is not — jump arcs and speeds must not depend on the monitor.
- `visibilitychange`: on hide, pause (stop accumulating, mute); on show, reset `last = performance.now()` — never "catch up" hidden time in gameplay (idle games compute offline progress explicitly instead).
- One loop owns the game. Multiple rAF loops (one per system, a React re-render driving logic…) = phase bugs forever.
- Phaser/engines do this internally (Arcade physics has its own fixed step config) — the pattern still applies to your custom logic inside their update callbacks: accumulate or scale by their delta, never assume 60.

## Scenes / game states

Every game is a state machine at the top: `Boot → Menu → Play → Pause → GameOver`. Even in vanilla:

```ts
interface Scene {
  enter(prev?: Scene): void;       // build entities, start music
  update(dt: number): void;
  render(alpha: number): void;
  exit(): void;                    // teardown: listeners, timers, pools — leaks live here
}
const scenes = { menu, play, pause };  // switch = exit old, enter new
```

- Pause as a *state* (input routed to menu, world frozen but rendered) beats a boolean checked in forty places.
- Scene `exit()` discipline is where memory leaks die: every listener added in `enter` is removed, every interval cleared. Audit it like Rust audits Drop.
- Transitions (fade, wipe) are a mini-scene between scenes, not flags inside both.

## Entity architecture — honest sizing

Three tiers; pick by *entity count and behavior variety*, not by ideology:

1. **Plain objects + arrays** (jam tier, <100 entities): `const bullets: Bullet[] = []`, typed shapes, functions per behavior. Remove via swap-pop while iterating backwards, or a `dead` flag + single sweep. Do not build ECS for Pong.
2. **Class/composition tier** (most 2D games): `Entity` with `update/draw`, behaviors composed as small objects/functions (`movement`, `health`, `shooter`) rather than 6-deep inheritance (`FlyingShootingIceEnemy extends…` is the classic dead end — compose capabilities, don't multiply subclasses).
3. **ECS** (bullet-hell/sim tier, 1000s of homogeneous entities, or when behaviors recombine combinatorially): components = plain data, systems = functions over queries. In TS: **miniplex** (pragmatic, typed) or **bitecs** (SoA typed arrays, fastest, harsher API). ECS earns its ceremony via cache-friendly iteration and free composition — and taxes you in indirection; below ~500 mixed entities the class tier usually wins on total velocity.

Whatever the tier: **game state is data, separated from rendering**. `Player` holds position/velocity/hp; something else draws it. This single separation enables interpolation, headless testing of game logic, replays, and sane saves.

## Spawning, despawning, and the frame lifecycle

- Order within a step, fixed and documented: input-sample → intents/AI → physics/movement → collisions → resolve (damage, pickups) → cleanup (dead removal) → spawn queue flush. Spawning *during* iteration mutates the list mid-loop — queue spawns/despawns and flush at the step boundary.
- Pools for anything spawned in bursts (bullets, particles, enemies, floating text): preallocate N, `active` flag, free-list; `spawn()` reuses. (performance-assets.md for the GC math — pooling is non-negotiable #4 in practice.)
- IDs over references for cross-entity links (target, owner): a dangling reference to a pooled/reused object is the web-game use-after-free. `targetId: number` + lookup, and handle "target gone" as a normal state.

## Time, timers, and tweens inside the loop

- All gameplay time derives from accumulated fixed steps (`gameTime += dt`), never `Date.now()`/`performance.now()` inside logic — pausable, scalable (slow-mo = multiply dt), reproducible.
- Cooldowns/timers: countdown floats (`timer -= dt`), not `setTimeout` — setTimeout ignores pause, breaks on throttled tabs, and desyncs from steps.
- Slow-motion/hitstop (juice-implementation.md): a `timeScale` multiplier applied to dt for the *world* but not the UI/camera — one line in the right place vs. special cases everywhere.

## Save-friendly & testable by construction

State-as-data pays twice more: serialization is `JSON.stringify(pickSaveFields(state))` (shipping.md), and headless tests can run `update()` a thousand steps without a browser (`vitest` on pure logic: "jump apex reached in N steps", "economy never negative"). If saving or testing requires instantiating the renderer, the separation leaked — fix that before it spreads.
