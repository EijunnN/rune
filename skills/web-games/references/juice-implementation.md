# Juice Implementation — The Feel Catalog, In Code

This file implements the game-design rune's game-feel.md catalog for the web stack. The architecture rule that makes all of it clean: juice reads game events (`hit`, `land`, `kill`, `pickup`) from a tiny event queue and drives *presentation only* — gameplay state never depends on juice state, so you can tune wildly without breaking logic (or replays).

```ts
// the spine: gameplay emits, presentation consumes (same frame, after update)
events.push({ type: "hit", x, y, power: dmg / maxDmg });   // power ∈ [0,1] scales EVERYTHING below
```

## Tweening (the workhorse — write it once)

```ts
type Tween = { t: number; dur: number; from: number; to: number;
               ease: (x: number) => number; set: (v: number) => void; next?: () => void };

const tweens: Tween[] = [];
function tick(dt: number) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(tw.t + dt / tw.dur, 1);
    tw.set(tw.from + (tw.to - tw.from) * tw.ease(tw.t));
    if (tw.t >= 1) { tweens.splice(i, 1); tw.next?.(); }
  }
}

// the easing kit — memorize these five:
const easeOutQuad  = (x: number) => 1 - (1 - x) * (1 - x);          // entrances, responses
const easeOutBack  = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;  // overshoot: pickups, UI pops
const easeOutElastic = (x: number) => x === 0 || x === 1 ? x
  : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1;           // playful bounces
const easeInQuad   = (x: number) => x * x;                           // exits
const easeOutExpo  = (x: number) => x === 1 ? 1 : 1 - 2 ** (-10 * x); // snappy slides
```

Nothing animates linearly (design doctrine); durations: micro-feedback 50–150ms, transitions 200–350ms. Phaser: `this.tweens.add` with `ease: "Back.Out"` etc. — same catalog, engine syntax.

## Screenshake (trauma model — the good one)

```ts
let trauma = 0;                                        // add on events: hit +0.3, explosion +0.6 (clamp 1)
function updateShake(dt: number) {
  trauma = Math.max(0, trauma - 1.8 * dt);             // linear decay, fast
  const shake = trauma * trauma;                        // square: small hits whisper, big ones roar
  shakeX = shake * MAX_OFFSET * (noise1D(t * 25) * 2 - 1);   // smooth noise > random: no teleport-jitter
  shakeY = shake * MAX_OFFSET * (noise1D(t * 25 + 99) * 2 - 1);
  shakeAngle = shake * MAX_ANGLE * (noise1D(t * 25 + 199) * 2 - 1);  // 1-2° rotation sells it hardest
}
// apply in the camera transform ONLY (canvas-rendering.md) — never to entity positions
// MAX_OFFSET ≈ 8-12px at 480p; scale with resolution. Settings slider multiplies, 0 disables (a11y non-negotiable)
```

Trauma accumulates across rapid events naturally and decays smoothly — strictly better than "shake for 300ms" timers stacking badly. Directional punch (recoil): add a one-shot offset in the hit direction, tweened back with easeOutQuad.

## Hitstop & time-scale

```ts
let timeScale = 1, hitstopT = 0;
function frameDt(rawDt: number) {
  if (hitstopT > 0) { hitstopT -= rawDt; return 0; }   // full freeze, world only
  return rawDt * timeScale;                             // slow-mo: tween timeScale 0.15 → 1 over 300ms
}
// world update uses frameDt(raw); camera, UI, and the juice systems use rawDt (they keep moving!)
// doses: light hit 0.03s, heavy 0.06-0.09s, parry/kill 0.12s + slow-mo tail. More = mushy.
```

The one-line placement (architecture.md's timeScale note) is what keeps this from infecting every system. Audio ties in: drop music `playbackRate` to ~0.9 during slow-mo (audio.md).

## Flash, squash & stretch, knockback

- **Hit flash**: 2–3 frames white. Canvas 2D per-sprite: pre-bake a white-tinted copy of the atlas at load (draw atlas to offscreen, `globalCompositeOperation = "source-in"` fill white) and swap source while `flashT > 0` — per-frame filter/composite on the live sprite is too slow. Phaser: `sprite.setTintFill(0xffffff)` + a 40ms timer. Engines make this trivial; vanilla pre-bakes.
- **Squash & stretch** (scale, not sprite swaps): land = `scale(1.25, 0.75)` → easeOutElastic to (1,1) in ~250ms; jump launch = `(0.8, 1.2)`; hit = squash toward the impact axis. Scale around the *feet/contact point* (origin matters or it looks like floating).
- **Knockback**: velocity impulse on the target *away from source* (`vx += dir * 220 * power`) + half-strength recoil on the attacker; brief input-dampening (~80ms) on the knocked so physics reads before control resumes.

## Particles (pooled, from the atlas)

```ts
// pool of ~500 plain structs: {x,y,vx,vy,life,maxLife,frame,scale,gravity}
// spawn helpers per event type read the power field:
function burstHit(x: number, y: number, dir: number, power: number) {
  const n = 4 + Math.floor(power * 8);
  for (let i = 0; i < n; i++) spawn({
    x, y,
    vx: dir * rand(40, 160) + rand(-40, 40), vy: rand(-140, -40),
    life: rand(0.2, 0.45), gravity: 500,
    frame: pick(SPARK_FRAMES), scale: rand(0.5, 1) * (0.7 + power * 0.6),
  });
}
// update in the juice pass (rawDt); render additively for sparks/glows:
// ctx.globalCompositeOperation = "lighter" — batch all additive particles together (state switches cost)
```

Rules: pooled always (performance-assets.md), hard cap with oldest-recycled, fade by `life/maxLife` on alpha or scale (shrinking reads cleaner than alpha in pixel art), and dust motes/ambient particles for the idle-world-alive effect at near-zero cost.

## The compound events (wiring the catalog)

A medium hit, fully dressed — every line one system, all driven by `power`:

```ts
case "hit":
  hitstopT = 0.03 + e.power * 0.05;
  trauma = Math.min(1, trauma + 0.2 + e.power * 0.3);
  flash(e.target, 3);
  knockback(e.target, e.dir, e.power);
  squash(e.target, e.dir);
  burstHit(e.x, e.y, e.dir, e.power);
  playSfx(sfx.hit, { vol: 0.7 + e.power * 0.3, rate: 1.1 - e.power * 0.25 });  // big hits = lower pitch
  if (e.killed) { timeScaleTween(0.3, 0.12); trauma += 0.2; spawnScorePop(e.x, e.y, e.value); }
```

Floating text (damage/score pops): pooled, rise 30px with easeOutQuad, scale-in with easeOutBack, fade last 30% — the only UI element allowed in world space.

## Tuning workflow

All constants in one `JUICE` config object; debug panel (query-param, like input.md's) with sliders + an "event test" button row (fire a fake hit/kill/pickup at screen center). Tune by feel at 1x and 0.25x speed; verify the mute test and the reduce-motion/shake-slider paths (design non-negotiables). Juice reads best slightly *over*-tuned in isolation and correct in gameplay context — final pass happens in real play, not the test room.
