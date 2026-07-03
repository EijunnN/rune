---
name: web-games
description: Complete doctrine for building 2D games in the browser — game architecture (fixed-timestep loops, scenes, ECS), Phaser, raw Canvas 2D rendering, physics and collision (AABB/Rapier2D/Matter), robust input (keyboard/gamepad/touch, buffering), tilemaps (Tiled/LDtk), game audio (WebAudio/Howler), juice implementation (tweens, screenshake, particles), performance (object pooling, GC discipline, 60fps budgets), and shipping (saves, itch.io/Poki/Steam, PWA/mobile). Use whenever building or debugging a browser game — "make a game", platformers, shooters, puzzle games, arcade clones, game jams, HTML5/Canvas/Phaser work, "my game stutters/feels laggy", or porting game logic to the web. For 3D rendering specifics use the threejs rune; for design judgment (is it fun?) use game-design.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Web Games

The browser is a legitimate game platform — instant distribution, no install friction, gamepads, fullscreen, 120Hz — with two ruthless constraints: **the frame budget is ~16ms shared with a garbage collector**, and **your player is one tab-switch from gone**. Web game engineering is therefore two disciplines: game architecture (loops, state, collision — same as anywhere), and web-specific survival (GC discipline, audio unlock policies, visibility handling, load size). This rune carries both.

Division of labor: this rune makes the game *run and feel* right; the game-design rune decides *what* is fun (read its game-feel.md — this rune implements that catalog); threejs owns 3D rendering.

## Choose the stack (first decision, sized honestly)

| Project | Stack |
| --- | --- |
| Jam game, arcade clone, prototype | **Vanilla Canvas 2D + the loop below** — zero deps, full control, no framework tax |
| Real 2D game (platformer, shooter, RPG) | **Phaser** — scenes, physics, tilemaps, input, audio solved; the ecosystem default |
| Heavy 2D rendering needs (1000s of sprites, shaders) | **PixiJS** (rendering only) + your own game layer, or Phaser (uses WebGL underneath) |
| 3D | three.js (threejs rune) or Babylon |
| Rust brain | Bevy→WASM works but weighs MBs; consider Rust logic + JS rendering only if you measured |

Default recommendation: **Phaser for games, vanilla for toys** — and vanilla first when learning, because everything in Phaser makes sense once you've hand-rolled it once. Never adopt an engine mid-jam.

## Reference map — read before working in that area

| Task involves | Read |
| --- | --- |
| Game loop, fixed timestep, scenes/states, entity architecture (ECS vs classes) | [references/architecture.md](references/architecture.md) |
| Anything Phaser: scenes, sprites, arcade physics, cameras, Phaser-specific bugs | [references/phaser.md](references/phaser.md) |
| Raw Canvas 2D: drawing, sprites, camera math, pixel-art crispness | [references/canvas-rendering.md](references/canvas-rendering.md) |
| Collision & physics: AABB, circles, spatial hashing, Rapier2D/Matter, tunneling | [references/physics-collision.md](references/physics-collision.md) |
| Input: keyboard/mouse/gamepad/touch, action mapping, buffering, mobile controls | [references/input.md](references/input.md) |
| Levels: Tiled/LDtk pipelines, tile collision, chunking, procedural placement | [references/tilemaps-worlds.md](references/tilemaps-worlds.md) |
| Sound: WebAudio/Howler, the unlock gesture, music layers, SFX pooling | [references/audio.md](references/audio.md) |
| Juice implementation: tweens, screenshake, hitstop, particles, easing library | [references/juice-implementation.md](references/juice-implementation.md) |
| Slow/stuttering games: pooling, GC, draw batching, profiling, asset budgets | [references/performance-assets.md](references/performance-assets.md) |
| Saves, pause/visibility, fullscreen, itch.io/Poki/Steam, PWA/mobile packaging | [references/shipping.md](references/shipping.md) |

## Non-negotiables

1. **Fixed timestep for logic, interpolated rendering.** Physics/gameplay stepped at a constant dt (accumulator pattern) or the game behaves differently at 60/120/144Hz — jump heights change with monitor refresh. This is the #1 structural bug in hobby web games. (architecture.md has the canonical loop.)
2. **Clamp the frame delta** (~50–100ms max). A tab-switch returns a 4-second delta; unclamped, physics explodes through walls. (The clamp also guards the accumulator's "spiral of death" — updates costing more than they simulate.)
3. **Handle `visibilitychange`**: pause the loop, mute audio, timestamp the exit. Browsers throttle hidden tabs to ~1Hz — an unpaused game returns desynced, drained, or "hacked" (idle games must decide offline progress *deliberately*).
4. **Zero allocations in the frame loop.** `{x, y}` literals, arrays, closures, strings created per frame = GC pauses = the stutter players call "lag". Preallocate, pool, reuse — the web game's equivalent of Rust's allocation discipline. (performance-assets.md.)
5. **Audio starts locked**: browsers require a user gesture to start audio contexts. Boot flow: load silently → "click to start" screen → unlock audio in that handler. A game that *tries* to autoplay music gets console errors and silence.
6. **Input is state polled by the loop, not logic in event handlers** (events fire between frames; handlers mutate a state object the fixed step reads). Include `blur` → clear all keys, or alt-tab leaves the player running forever.
7. **The forgiveness layer ships with movement**: input buffering (~100ms), coyote time (~90ms), and first-frame response (sound/flash on next frame even if animation lags). Tight controls are engineered, not tuned into existence later. (input.md + juice-implementation.md.)
8. **Screen-space is not world-space**: one camera transform owns the mapping; all gameplay math in world units; conversions at the edges (render, pointer input). Mixing them works until the first zoom/shake/resize, then everything breaks at once.
9. **Pixel-art discipline**: integer scaling, `image-rendering: pixelated`, camera positions rounded at *render* time only (never round physics), a virtual resolution rendered to an offscreen canvas then scaled. Half of "blurry/shimmering sprites" reports are these four lines.
10. **Assets budgeted like code**: sprite atlases over loose files (draw batching + fewer requests), audio compressed (OGG/M4A, not WAV), total first-load under ~5MB for web portals (they measure), loading screen with real progress past that.
11. **Determinism where replay/fairness matters**: seeded RNG (never raw `Math.random()` for gameplay in anything competitive/daily-puzzle), logic independent of render framerate (see #1). A daily-challenge game with unseeded RNG is a bug factory.
12. **Save early, save often, save small**: localStorage for settings/progress (JSON, versioned with a migration path), IndexedDB past ~1MB, autosave on `visibilitychange` (the mobile-web "close" event you actually get). Losing progress is the one bug players never forgive. (shipping.md.)
13. **Ship the pause/resize/fullscreen trio** before content: pause menu (Esc + auto on blur), canvas that handles resize/DPR properly, fullscreen toggle. Retro-fitting these into a finished game touches everything.
14. **Test on a real phone and a 144Hz monitor** before calling anything done — the two environments where every timestep, input, and layout sin becomes visible. DevTools throttling emulates neither touch latency nor high-refresh.
15. **Play your own game daily.** Web builds rot quietly (a CDN font, an audio policy change, a portal iframe update). The daily smoke-play is the cheapest CI a game has.

## Decision framework — physics: how much do you need?

- Platformer/top-down/arcade → **hand-rolled AABB + swept movement** (physics-collision.md's ~80 lines): full control over feel, coyote time, and edge cases. Real physics engines make platformers feel *worse* (you'll fight the solver to fake game-feel).
- Stacking, ragdolls, vehicles, joints, "physics IS the game" → **Rapier2D** (fast WASM, deterministic option) or **Matter.js** (pure JS, simpler). Phaser: Arcade (AABB, fast, built-in) for most; Matter integration when you need rotation/constraints.
- Never mix two sources of movement truth: either physics owns transforms or your code does — hybrid = tunneling and jitter.

## Decision framework — "it stutters" triage (performance-assets.md for depth)

1. Measure first: DevTools Performance tab, 20s recording — is it GC sawteeth (allocation discipline broke), long frames on render (too many draws/fill-rate), or logic spikes (pathfinding/spawner)?
2. GC sawteeth → hunt per-frame allocations (#4): object literals in loops, array methods creating copies (`filter`/`map` per frame), string building, closures in hot paths.
3. Render-bound → batch (atlas + fewer draw calls), cull off-screen entities, cap particles, check canvas size vs DPR (a 4K canvas on mobile is fill-rate suicide).
4. Logic spikes → spread work across frames (time-sliced pathfinding, staggered AI updates: 1/4 of agents per frame), move heavy pure work to a Web Worker.

## Review checklist (sweep before shipping a web game)

Fixed timestep + clamped delta + interpolation · visibilitychange pauses everything · zero per-frame allocations verified in a heap timeline · audio unlocks on gesture, resumes on focus · keys clear on blur · buffering + coyote in movement · world/screen space separated by one camera · saves versioned + autosaved on hide · atlas-packed assets under portal budget · seeded RNG where it matters · tested on phone + 144Hz · pause/resize/fullscreen work · played start-to-finish today.
