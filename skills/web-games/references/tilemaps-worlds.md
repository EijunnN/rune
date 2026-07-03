# Tilemaps & Worlds — Levels as Data

Levels authored in an editor, loaded as data, rendered in chunks. Hand-coding level geometry in JS arrays survives exactly one level; the pipeline below survives a game.

## The editors: Tiled vs LDtk

- **Tiled** — the veteran standard: any map type (ortho/iso/hex), infinite maps, robust JSON export, plugins everywhere (Phaser loads it natively). Its flexibility means *you* define conventions.
- **LDtk** — the modern opinionated one (by Dead Cells' dev): auto-tiling rules that feel magical, first-class entity/field definitions (an enemy with `patrolRange: 3` edited visually), levels-in-worlds organization, clean JSON. Best DX for platformers/top-downs; TS-friendly (typed via `ldtk` importers or codegen).

Doctrine either way: **the editor owns layout; code owns behavior.** Designers (or future-you) iterate levels without touching TS. Entities in maps are *spawn points with properties* — the map says "goblin here, aggro 5"; the game instantiates from its registry (`spawnersByType[name](x, y, props)`). Unknown entity in map = loud warning, not silent skip.

## Map anatomy (conventions that pay)

Layers by role, named consistently across every level:
- `bg`, `bg-detail` — render-only, parallax candidates.
- `solid` — THE collision layer (tile layer or LDtk IntGrid). Collision comes from this layer's data, not from per-tile properties scattered across art tiles — art and physics decoupled means re-skinning never breaks jumps.
- `main` — the visual layer matching solids.
- `fg` — renders *over* entities (depth for free).
- `entities` — object layer: spawns, triggers, doors, checkpoints (rects with properties).
- Special zones as object rects with a `type` (water, kill, wind) — resolved to fast lookup structures at load.

## Loading & collision from tiles

```ts
// Load: parse JSON once → typed structures. Solids as a 2D grid (or bitset):
const solid = new Uint8Array(w * h);                    // 1 = solid; index = y * w + x
const isSolid = (tx: number, ty: number) =>
  tx < 0 || ty < 0 || tx >= w || ty >= h ? true : solid[ty * w + tx] === 1;  // out-of-bounds = solid

// Entity vs tiles — the free broadphase (physics-collision.md):
// test ONLY the tiles the AABB spans:
for (let ty = (e.y / TILE) | 0; ty <= ((e.y + e.h) / TILE) | 0; ty++)
  for (let tx = (e.x / TILE) | 0; tx <= ((e.x + e.w) / TILE) | 0; tx++)
    if (isSolid(tx, ty)) resolveAgainst(tileRect(tx, ty));
```

Axis-separated resolution as in physics-collision.md, tiles as the solids. Tile variants (one-way, spikes, ladders) = distinct IntGrid values with per-value behavior in the resolve switch. Slopes: tile-height functions or don't promise slopes.

## Rendering tiles fast

- **Pre-render static layers to offscreen canvases** — the canvas-rendering.md doctrine at map scale. Whole map if small (≤ ~4096px sides — mobile GPU texture limits!), otherwise **chunks** (16×16 or 32×32 tiles per canvas): render chunks lazily as they approach the camera, keep an LRU of ~20, blit 4–6 chunks per frame instead of thousands of tile draws.
- Animated tiles (water, torches): keep them on a separate thin dynamic layer drawn per frame; don't bust whole-chunk caches for six lava tiles.
- Tile edge bleeding (colored seams at chunk/zoom boundaries): pad tiles in the atlas with 1–2px extruded borders (TexturePacker/free-tex-packer "extrude" option) — the fix is in the asset, not the code.
- Parallax backgrounds: draw with `cam.x * factor` (0 = sky, 1 = play layer); wrap horizontally by drawing twice. Layers < 5, and precompute their gradients.

## Big worlds: chunking & streaming

- Entity activation radius: entities beyond ~1.5 screens sleep (no update, no draw) — wake on approach. Persistent state for slept entities (the door stays open) lives in the level state, not the entity instance (which may be pooled away).
- Multi-level games (LDtk worlds): load adjacent levels in the background at boundaries; carry the player entity across; despawn the origin level after transition completes. Level transitions are a scene-level concern (architecture.md), with their own mini-state (fade, reposition, camera snap).
- Procedural worlds still use the same substrate: generation writes the `solid` grid + entity list, everything downstream (collision, chunks, rendering) is identical. Generate in a Worker for anything over trivial size; seed it (non-negotiable #11).

## Pathfinding on tiles (the usual companion)

- Grid A* is ~60 lines or a tiny dep; the game-relevant doctrine: path on the `solid` grid + entity-size clearance (inflate obstacles by half the mover's size — or path fails in doorways), **time-slice** it (a few expansions per frame, or a Worker) because 20 enemies pathing on the same frame is a logic spike (SKILL.md triage #4), cache paths and repath on interval/invalidations, not every frame.
- Platformer AI doesn't A* — it uses movement probes (ledge ahead? gap jumpable?) and scripted patterns. Don't force navmesh thinking into a jump game.

## Authoring workflow tips

Hot-reload maps in dev (watch the JSON, rebuild level state, keep player position) — level iteration speed is design iteration speed (game-design's playtesting doctrine applied) · version maps in git as JSON (LDtk's single-file format diffs tolerably; Tiled: use external tileset files to avoid noise) · a debug overlay drawing the `solid` grid + entity boxes + triggers (query-param gated) is the first tool to build — every collision bug session starts with "show me what the game thinks the level is".
