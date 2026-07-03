# Phaser — The Web's 2D Workhorse

Phaser (3.8x/4) solves the plumbing — WebGL/Canvas rendering, scenes, arcade physics, tilemaps, input, audio, tweens — so you write gameplay. Doctrine: use Phaser's systems instead of fighting them, but keep *game state* yours (plain data the scenes render), so logic stays testable and portable.

Version note: Phaser 4 is current-gen (modernized internals, same conceptual API); most community answers are Phaser 3 and translate almost 1:1. Check the installed version and the migration notes when an API misbehaves.

## Boot & config that won't bite later

```ts
new Phaser.Game({
  type: Phaser.AUTO,                       // WebGL, Canvas fallback
  width: 480, height: 270,                 // virtual resolution — think in it everywhere
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  pixelArt: true,                          // nearest filtering + rounded render positions
  physics: { default: "arcade", arcade: { gravity: { x: 0, y: 900 }, fixedStep: true } },
  scene: [BootScene, PreloadScene, MenuScene, PlayScene, UIScene],
});
```

- Virtual resolution + `FIT` = one coordinate space on every device; never read `window.innerWidth` in gameplay.
- `pixelArt: true` at config time — retrofitting crisp pixels later touches every texture.
- `fixedStep: true` keeps Arcade physics deterministic across refresh rates (the rune's #1 non-negotiable, Phaser edition). Your own per-frame logic in `update(time, delta)` must still scale by `delta` or accumulate.

## Scene architecture (Phaser's best feature — use it fully)

- Split by responsibility: `Boot` (minimal assets for the loader), `Preload` (everything + progress bar), `Menu`, `Play`, `UI`. Scenes are cheap; God-scenes are the Phaser anti-pattern.
- **Run UI as a parallel scene** (`this.scene.launch("UI")`): HUD survives gameplay restarts, ignores world camera zoom/shake, and pause is `this.scene.pause("Play")` while UI keeps running. This one pattern solves pause menus, HUD scaling, and screen-shake-shaking-the-healthbar in a stroke.
- Communicate via the registry (`this.registry.set/get`, with change events) or a shared event emitter — not via scene-to-scene property reaches.
- Scene lifecycle: `init(data)` → `preload` → `create(data)` → `update`. Restart cleanly with `this.scene.restart()`; pass run config through `data`, don't rely on module-level mutable state (it survives restarts and becomes ghost state).
- `create()` registers, `shutdown` event cleans up: any `this.time.addEvent`, tween, or custom listener you added outside Phaser's ownership. Scene-swap leaks are Phaser's classic memory bug.

## Arcade physics (the 90% engine)

- AABB only (no rotation of bodies) — exactly right for platformers/top-down/shooters. Bodies: `this.physics.add.sprite`, groups for batches, `setSize/setOffset` to shrink hitboxes smaller than sprites (always smaller — generous visuals, forgiving hitboxes).
- `collider` = separates bodies; `overlap` = detection only (pickups, hurtboxes). Both take callbacks + optional process filter. Colliders with groups scale; N×N individual colliders don't.
- Platformer feel kit: `body.blocked.down` for grounded (not `touching` — blocked includes tiles), `setDragX` for friction-feel, jump cut on release (`if (!key.isDown && body.velocity.y < 0) body.velocity.y *= 0.5`), and your own coyote/buffer timers (input.md) — Arcade gives collision, *you* give feel.
- Fast movers tunnel: bump `fixedStep` rate, enlarge bodies, or raycast the movement (`this.physics.overlapRect` sweep) — Arcade has no CCD. Bullets faster than ~tile-per-step want the raycast pattern regardless of engine.
- Matter.js (built-in alternative) only when you need rotation/joints/stacking — and then feel-critical movement (the player) often stays Arcade/kinematic while decor goes Matter.

## The toolkit worth knowing cold

- **Groups & pools**: `this.add.group({ classType: Bullet, maxSize: 64 })` + `group.get()`/`killAndHide()` — Phaser's built-in pooling; wire `runChildUpdate: true` or update actives yourself.
- **Tweens**: `this.tweens.add({ targets, props, duration, ease: "Back.Out", onComplete })` — the juice workhorse (juice-implementation.md maps the whole catalog to tweens). Kill tweens on shutdown or they finish into destroyed objects.
- **Timers**: `this.time.addEvent({ delay, loop, callback })` — respects pause and time-scale, unlike `setTimeout` (never setTimeout in scenes).
- **Camera**: `startFollow(player, true, 0.08, 0.08)` (lerped follow), `setBounds`, `setDeadzone`, `shake/flash/fade` built in — plus `ignore()` lists per camera when running UI scenes.
- **Animations**: global registry (`this.anims.create`) keyed by string, from atlas frames; play with `sprite.play("run", true)`. Define once in `create` of a boot scene, not per-sprite.
- **Input**: `this.input.keyboard.createCursorKeys()` / `addKeys("W,A,S,D,SPACE")`, `justDown` for edges; gamepad plugin needs enabling in config. Pointer events per-object (`setInteractive`) or scene-wide.
- **Particles**: `this.add.particles(x, y, "atlas", { frame, lifespan, speed, quantity, ... })` — cap `quantity`, pool via `stop()/start()` rather than create/destroy.

## Loading & assets

`PreloadScene` loads atlases (`this.load.atlas` — TexturePacker/free-tex-packer output), audio sprites, tilemaps; progress via `this.load.on("progress", cb)` driving a simple bar. Multi-pack for big games; lazy-load per-world with a mid-game loader scene. Keys are global strings — establish a naming convention day one (`"atlas:player"`, `"sfx:jump"`) or collide silently later.

## Phaser-specific bug bestiary

- **Physics body offset wrong after flip/scale**: `setOrigin` + `setOffset` interact; set body size *after* origin, re-check when flipping (`setFlipX` doesn't move the body).
- **`justDown` eaten**: calling it twice a frame returns false the second time — sample once into your input state (input.md pattern applies inside Phaser too).
- **Tweens/timers surviving scene restart** → callbacks on dead objects: clean in `shutdown`, or scope with `this.tweens` killAll on restart consciously.
- **Black screen on itch.io**: base URL — use relative paths in the loader; also portal iframes need the scale manager, not manual canvas sizing.
- **Audio silent until click**: Phaser handles the unlock, but only if you start sounds *after* first input (audio.md flow: menu "click to start" = your unlock).
- **Blurry pixel art despite pixelArt:true**: a tween put a sprite on a subpixel position with zoom ≠ integer — `setRoundPixels(true)` on the camera, integer zoom levels.
- **Update running while paused**: scene `pause` stops update but not your external rAF/setInterval hooks — everything lives inside Phaser's clock or it doesn't pause.
