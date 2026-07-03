# Performance & Assets — 16ms, Shared With a Garbage Collector

The browser gives you ~16.6ms per frame (8.3 at 120Hz) and takes back unpredictable slices for GC. Web-game performance is therefore one discipline above all: **allocate nothing per frame**, then the usual suspects (draw count, logic spikes) in order. Measure first — DevTools Performance tab, 20s of real gameplay, and read which of the three shapes you have (SKILL.md triage): GC sawteeth, long render bars, or logic spikes.

## GC discipline (the web's allocation doctrine)

The allocating patterns that look innocent and aren't — all per-frame:

```ts
// ALLOCATES (per frame, per entity — the killers):
const pos = { x: e.x, y: e.y };                    // object literal
const near = enemies.filter(e => dist(e) < R);     // new array every frame
const dir = target.sub(pos).normalize();           // vector chain: 2 temporaries
ctx.fillText(`Score: ${score}`, ...);              // string concat (+ fillText itself)
list.forEach(e => update(e, player));              // closure capture (varies by engine, don't bet)

// THE FIXES:
const _pos = { x: 0, y: 0 };                       // module-scope scratch, reused
subInto(_dir, target, pos); normalizeInPlace(_dir); // in-place math, out-params
for (let i = 0; i < enemies.length; i++) { ... }   // plain loops, reused query arrays
scoreText = score !== lastScore ? String(score) : scoreText;  // strings only on change
```

- Vector math: mutable vectors + in-place ops (`addInPlace`, out-parameters) in hot paths; immutable niceness belongs to cold code. (Same doctrine as Rust's #9 and threejs's scratch vectors — the web just hides the cost until the GC bill arrives as a 30ms pause.)
- **Verify, don't believe**: DevTools → Performance → the memory graph during 20s of play. Healthy = near-flat with rare small steps; sawtooth every few seconds = per-frame garbage; find it with Allocation instrumentation on timeline (it names constructors and stacks).
- Events/arrays: reuse a `queue.length = 0`-cleared array over `queue = []` (the latter is fine occasionally, not per frame per system).

## Object pooling (the pattern, once, correctly)

```ts
class Pool<T> {
  private free: T[] = [];
  constructor(private make: () => T, private reset: (o: T) => void, prealloc = 64) {
    for (let i = 0; i < prealloc; i++) this.free.push(make());
  }
  take(): T { return this.free.pop() ?? this.make(); }
  give(o: T) { this.reset(o); this.free.push(o); }
}
```

Pool: bullets, particles, floating text, hit events, AI scratch — anything spawned in bursts. The two pool bugs: **use-after-give** (entity A holds a reference to pooled B → IDs + lookups, architecture.md) and **reset amnesia** (a field survives recycling — reset must touch *every* field; a `reset` unit test per pooled type pays for itself the first time).

## Render cost (when the flame is in paint/draw)

- Draw count: atlas + batching (canvas: same-source drawImage; Phaser/Pixi: atlas = automatic batches; texture swaps break batches — sort draws by texture when hand-rolling WebGL-ish layers).
- Cull off-screen (camera rect + margin) before *any* per-entity work, not just draw.
- Canvas size honesty: backing store = viewport × DPR capped at 2 (canvas-rendering.md); a devicePixelRatio-3 phone rendering native is 9x the pixels of 1x for imperceptible gain. Virtual-resolution games render tiny and scale — the ultimate fill-rate win.
- Layered canvases / pre-rendered chunks so static pixels aren't repainted (canvas-rendering.md, tilemaps-worlds.md).
- Particle/entity caps with graceful recycling (juice-implementation.md) — spectacle degrades before framerate does.

## Logic spikes

Time-slice anything O(N·heavy): stagger AI (`if ((frame + e.id) % 4 === 0) think(e)`), budget pathfinding expansions per frame (tilemaps-worlds.md), amortize spawn waves. Web Workers for genuinely heavy pure computation (procgen, big pathfinding, sim ticks) — transfer `ArrayBuffer`s / use SharedArrayBuffer where available; workers pay serialization, so batch messages (one "world snapshot" per tick, not 200 tiny posts). And `console.log` in the loop is a profiler-visible cost — strip or gate debug logging.

## Asset pipeline & loading

- **Atlases**: TexturePacker / free-tex-packer → one PNG + JSON, extruded 1–2px borders (bleeding fix), trimmed transparent edges, power-of-two overall size for safety. Everything visual in 1–2 atlases for a small game.
- **Compression**: PNG through oxipng/pngquant (pixel art quantizes beautifully); photographic backgrounds → WebP/AVIF; audio per audio.md (OGG+M4A, stream music). A jam game should ship < 5–10MB total; portals reward < 3MB first-paint aggressively (their discovery algorithms measure load-to-interactive).
- **Loading UX**: preload the menu's needs first (play button interactive ASAP), stream the rest behind it; real progress bars (bytes, not file counts, when the loader offers it); decode images off-thread via `createImageBitmap` for big sheets.
- Fonts: bitmap fonts from the atlas for in-game text (canvas-rendering.md) — no FOUT, no layout, batched draws.
- Cache-bust by content hash (bundler default) + long-cache headers; players on portals return daily — repeat loads should be near-instant.

## The performance checklist (run before "it's the browser's fault")

Release-equivalent build (minified, no dev servers/HMR overlay) · memory graph flat during play · draw calls counted (engine stats or manual counter) and culled · canvas backing size sane for the device · particles/entities capped · no per-frame strings/logs · workers for the one heavy system · tested on a real mid-range phone AND a 144Hz desktop (SKILL.md #14) — the phone finds fill-rate and GC sins, the 144Hz finds timestep sins. Both cost less than one confused week each.
