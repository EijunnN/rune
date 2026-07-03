# Physics & Collision — Hand-Rolled First, Engine When Earned

The decision framework from SKILL.md: platformers/top-down/arcade want **hand-rolled AABB** (control over feel); stacking/joints/ragdolls want **Rapier2D or Matter.js**. Never both moving the same body.

## The AABB toolkit (memorize; it's ~30 lines)

```ts
type Rect = { x: number; y: number; w: number; h: number };   // x,y = top-left

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const circleHit = (ax: number, ay: number, ar: number, bx: number, by: number, br: number) => {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy < r * r;                            // no sqrt — compare squared
};
// circle-vs-rect: clamp circle center to rect, then squared-distance check to the clamp point
```

Hitboxes are data on entities (offset + size relative to position), always **smaller than the sprite** for hurtboxes (forgiving) and honest-to-visual for player attacks (generous *for* the player — the feel asymmetry every good action game ships).

## Resolution: axis-separated movement (the platformer core)

The pattern that prevents corner-snagging and wall-climbing bugs — move and resolve one axis at a time:

```ts
function moveEntity(e: Entity, solids: Rect[], dt: number) {
  e.x += e.vx * dt;                                    // X first
  for (const s of solids) if (overlaps(box(e), s)) {
    e.x = e.vx > 0 ? s.x - e.w : s.x + s.w;            // push out horizontally
    e.vx = 0;
  }
  e.y += e.vy * dt;                                    // then Y
  e.grounded = false;
  for (const s of solids) if (overlaps(box(e), s)) {
    if (e.vy > 0) { e.y = s.y - e.h; e.grounded = true; }
    else          { e.y = s.y + s.h; }
    e.vy = 0;
  }
}
```

- Gravity: `vy += G * dt` before the Y pass; clamp to terminal velocity (unclamped fall speed = tunneling *and* bad feel).
- `grounded` computed during resolution (not by a separate probe) feeds jump logic + coyote time (input.md).
- One-way platforms: solid only when `vy > 0` *and* previous-frame feet were above the top (store `prevY`); drop-through = temporarily ignore one-ways while Down is held during the check.
- Slopes: legitimately harder — either tile-based slope heights (y = f(x within tile)) or concede to an engine. Decide before promising slopes.

**Tunneling** (fast movers skipping thin walls): with fixed-timestep 60Hz, anything moving > wallThickness per step can skip. Fixes in order: thicker walls (design), clamp speeds, **swept movement** (step the motion in sub-increments of half the smallest solid dimension), raycast for hitscan-fast things (bullets: segment-vs-rect test from prev to current position — never a moving body).

## Broadphase: stop testing everything vs everything

N² pairs die around a few hundred movers. The web-game workhorse is a **uniform spatial hash grid** (cell ≈ 1–2× typical entity size):

```ts
// rebuild each step: Map<cellKey, Entity[]>; query = own cell + 8 neighbors
const key = (x: number, y: number) => ((x / CELL) | 0) + "," + ((y / CELL) | 0);
```

Rebuild-per-frame (clear + reinsert) is simpler and usually faster than incremental updates at web-game scales. Tiles get an even better broadphase for free: an entity only tests the tile cells its AABB spans (tilemaps-worlds.md). Quadtrees: only for wildly non-uniform size distributions; the grid wins the common case.

## Collision architecture

- **Layers/masks** from day one: `PLAYER`, `ENEMY`, `PLAYER_BULLET`, `PICKUP`, `SOLID` as bit flags; each entity has `layer` + `collidesWith` mask; the pair loop checks masks first. Retro-fitting "enemy bullets shouldn't hit enemies" into an unlayered system touches everything.
- Separate **detection** (overlap events: pickups, hurt, triggers) from **resolution** (position correction: solids). Overlap handlers queue effects (damage, despawn) applied in the resolve phase — mutating mid-detection skips pairs (architecture.md's frame order).
- Emit `enter/stay/exit` where gameplay needs it (standing-on-lava ticks, trigger zones): keep a `Set` of current-frame pairs, diff against last frame.

## Engines: Rapier2D & Matter.js

When the game *is* physics (stacking, vehicles, ragdolls, joints, realistic bounces):

- **Rapier2D** (`@dimforge/rapier2d-compat`): WASM, fast, actively developed, optional determinism, the modern default. Pattern mirrors 3D: world.step() in your fixed update; bodies own transforms; you copy to sprites each render. Kinematic character controller included — use it for players instead of dynamic bodies.
- **Matter.js**: pure JS, gentler API, plenty fast for casual scales; Phaser ships an integration (phaser.md).
- The iron rules regardless of engine: physics steps inside *your* fixed timestep (one clock — architecture.md); player characters are **kinematic** (you set velocity; solver resolves) not dynamic-with-forces (soap feel); scale sanity — these engines want human-ish scales (meters-ish units, ~1–10 range), not pixel values in the hundreds (jitter, explosion); sleep thresholds on for piles.
- Mixed worlds are fine *by role*: player kinematic + crates dynamic + triggers sensor — what's forbidden is two systems writing one body's position.

## Feel adjustments that live in collision code

Generosity is implemented here, not in design docs: **corner rounding** (about-to-clip-by-2px on a jump? nudge them over), ledge forgiveness (land if any-overlap ≥ ~25%), hitbox vs hurtbox asymmetry (above), and attack sweeps as *arcs of segments* across the swing frames rather than one frame's box (whiffs that visually connected are felt as bugs). Every one of these is invisible, and their absence is "the controls feel off".
