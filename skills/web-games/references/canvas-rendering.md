# Canvas 2D — Rendering Without an Engine

Canvas 2D is underrated: hardware-accelerated in practice, zero dependencies, and fully sufficient for jams, arcade games, and anything under a few hundred sprites. Its doctrine: one camera transform, draw order you control, and respect for what's cheap (drawImage) vs expensive (state changes, text, shadows).

## Setup — DPR, sizing, crispness

```ts
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;

function resize() {
  const dpr = Math.min(devicePixelRatio, 2);          // cap like any game
  canvas.width  = innerWidth  * dpr;                   // backing store (physical px)
  canvas.height = innerHeight * dpr;
  canvas.style.width  = `${innerWidth}px`;             // CSS size (logical px)
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);              // draw in logical units
}
addEventListener("resize", resize); resize();
```

Skipping DPR = blurry everything on any modern screen. Resizing the canvas also **resets all ctx state** (transform, fonts) — re-apply after resize.

**Pixel-art mode**: render the game to a small offscreen canvas at virtual resolution (e.g. 480×270), then blit scaled with smoothing off:

```ts
ctx.imageSmoothingEnabled = false;                     // both contexts
ctx.drawImage(offscreen, 0, 0, vw, vh, ox, oy, vw * scale, vh * scale); // integer scale
```

Integer scale + integer-rounded *render* positions (never round physics!) + `image-rendering: pixelated` on the CSS = crisp, shimmer-free pixels. Letterbox the remainder (`ox, oy`) — don't stretch to non-integer scales.

## The frame

```ts
function render(alpha: number) {
  ctx.fillStyle = "#0d0e10";                           // clear = full-canvas fill (cheap, sets the mood)
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();                                          // === WORLD SPACE ===
  ctx.translate(vw / 2, vh / 2);                       // camera: center,
  ctx.scale(cam.zoom, cam.zoom);                       // zoom,
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);     // position (+ shake lives HERE only)
  drawWorld(alpha);                                    // everything in world units
  ctx.restore();                                       // === SCREEN SPACE ===

  drawHUD();                                           // UI unaffected by camera — free "UI scene"
}
```

- One transform block owns world↔screen (non-negotiable #8). Inverse for pointer picking: `worldX = (screenX - vw/2) / zoom + cam.x`.
- Draw order = paint order: sort by layer then `y` (top-down games: painter's sort per frame is fine — sort a pre-filtered visible list, not the world).
- **Cull before drawing**: skip entities outside `cam` rect ± margin. drawImage off-canvas isn't free; culling is.

## What's cheap, what's expensive

| Cheap (spam freely) | Expensive (budget/cached) |
| --- | --- |
| `drawImage` from an atlas (same source image) | `fillText` per frame (cache to offscreen canvas) |
| `fillRect`, solid fills | `shadowBlur` (catastrophic — fake with pre-baked sprites) |
| transform save/restore (few per frame) | gradients/`filter` created per frame (create once) |
| alpha via `globalAlpha` | frequent source-image switching (pack one atlas) |
| | `getImageData`/pixel reads mid-frame (pipeline stall) |

- **Atlas doctrine**: all sprites in 1–2 sheets; draw via `drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh)` with frame rects from a JSON. Same wins as GPU batching, plus one HTTP fetch.
- **Text**: render dynamic text (score) to a small offscreen canvas only when the value changes, blit it per frame; static labels pre-render once. Bitmap fonts (glyphs in the atlas) for pixel styles — also solves web-font FOUT in games.
- **Static backgrounds/tile layers**: composite once to an offscreen canvas (or per-chunk canvases, tilemaps-worlds.md), blit one image per frame instead of 2000 tile draws.
- Sprite flipping: `scale(-1, 1)` inside a save/restore around that sprite, or pre-bake flipped frames into the atlas (cheaper when many flip).
- Rotation: rotate around the sprite center (`translate(cx, cy); rotate(a); drawImage(img, -w/2, -h/2)`), and know each save/rotate/restore has cost — thousands of rotated sprites is where you consider Pixi/WebGL.

## Animation (sprite frames)

```ts
// data-driven, zero classes:
const anims = { run: { frames: [0,1,2,3], fps: 10, loop: true }, jump: { frames: [4], fps: 1, loop: false } };
// entity: { anim: "run", t: 0 }; update: e.t += dt; frame = anim.frames[Math.floor(e.t * anim.fps) % anim.frames.length]
```

Animation state is gameplay data (survives saves, testable); the renderer just indexes the atlas. Switch anims by name; reset `t` on switch unless blending is intended.

## Layered canvases (the free compositor)

Two or three stacked `<canvas>` elements (CSS `position:absolute`): static/parallax background (redrawn rarely) · game layer (every frame) · UI layer (redrawn on change). The browser composites them on the GPU; you skip redrawing what didn't change. Cheapest big win in canvas land — just remember input targets the top layer (`pointer-events: none` on non-interactive ones).

## When Canvas 2D runs out

Symptoms: >1–2k sprites drawn per frame, per-pixel effects (lighting, distortion), heavy rotation/scaling everywhere, or you're hand-building batching. That's the WebGL line: **PixiJS** (rendering-only, drop-in mentally: containers/sprites over your same game state) or Phaser (whole engine, phaser.md). The state separation this rune insists on (architecture.md) makes the renderer swap a contained refactor — game logic doesn't know ctx exists.
