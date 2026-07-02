# Games & Interaction: input, character control, cameras, physics, audio

Three.js is a renderer, not a game engine — you assemble the engine parts yourself. This file is the doctrine for those parts.

## Game loop: fixed timestep for logic, variable for render

Physics and gameplay logic explode with variable dt (tunneling through walls, inconsistent jumps). Accumulate and step fixed:

```js
const FIXED_DT = 1 / 60;
let accumulator = 0;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  accumulator += Math.min(clock.getDelta(), 0.25);   // clamp tab-switch spikes
  while (accumulator >= FIXED_DT) {
    fixedUpdate(FIXED_DT);                            // physics, gameplay, AI
    accumulator -= FIXED_DT;
  }
  update(accumulator / FIXED_DT);                     // visual-only: interpolation factor for smoothness
  renderer.render(scene, camera);
});
```

For casual/non-physics games a single delta-scaled update is fine — reach for the accumulator when there's physics or competitive timing.

## Input

**Keyboard — track state, don't act in the event** (events fire irregularly; the loop reads state):

```js
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));   // e.code = layout-independent ('KeyW' works on AZERTY)
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());           // alt-tab leaves keys stuck otherwise

// in update():
const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
const strafe  = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
```

- Normalize diagonals: build a `Vector2(strafe, forward)`, `.normalize()` if length > 1, then scale by `speed * dt`.
- Pointer: `pointermove` + raycaster for aiming/hover (see fundamentals.md); `PointerLockControls` for FPS mouse-look (must be initiated from a user gesture: `controls.lock()` in a click handler).
- Gamepad: poll `navigator.getGamepads()` in the loop (there is no event for stick movement).
- Touch: treat as pointer events; add an on-screen joystick lib (e.g. nipplejs) for mobile movement.

## Movement must be camera-relative

The #1 "controls feel wrong" bug: applying W/S along world Z regardless of where the camera looks. Correct pattern:

```js
const _dir = new THREE.Vector3(), _right = new THREE.Vector3();
camera.getWorldDirection(_dir);
_dir.y = 0; _dir.normalize();                       // flatten so looking down doesn't slow you
_right.crossVectors(_dir, camera.up).normalize();
const move = _dir.multiplyScalar(forward).addScaledVector(_right, strafe);
if (move.lengthSq() > 1) move.normalize();
player.position.addScaledVector(move, speed * dt);
// face movement direction, smoothly:
if (move.lengthSq() > 0.001) {
  const targetYaw = Math.atan2(move.x, move.z);
  player.rotation.y += shortestAngle(targetYaw - player.rotation.y) * Math.min(1, 10 * dt);
}
// shortestAngle: ((a + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI
```

## Character controller (no physics engine)

For platformers/walkers, a kinematic controller is simpler and more controllable than a full physics body:

```js
velocity.y -= 30 * dt;                               // gravity (tune; realistic 9.8 feels floaty in games)
player.position.y += velocity.y * dt;

// ground check: short ray from hips downward
_ray.set(player.position.clone().add(UP_OFFSET), DOWN);
const hit = _ray.intersectObjects(groundMeshes, true)[0];
const grounded = hit && hit.distance <= HIP_HEIGHT + 0.05;
if (grounded) { player.position.y += HIP_HEIGHT - hit.distance; velocity.y = Math.max(0, velocity.y); }
if (grounded && keys.has('Space')) velocity.y = 10;  // jump impulse
```

- Walls: raycast in the move direction before applying it, or use capsule-vs-mesh via `three-mesh-bvh` (its `shapecast` powers the well-known character-controller example — the robust non-physics answer for arbitrary level geometry).
- Feel > realism: add coyote time (~0.1 s grace after leaving a ledge) and jump buffering (~0.1 s early press) — they make controls feel "right".

## Physics engines (when you need real dynamics)

Ray-and-move kinematics stop scaling when you need stacking, ragdolls, vehicles, or many dynamic bodies. Then:

| Engine | Notes |
|---|---|
| **Rapier** (`@dimforge/rapier3d-compat`) | current default choice: fast WASM, active, deterministic-ish; R3F wrapper `@react-three/rapier` |
| cannon-es | pure JS, simpler, slower; lots of old tutorials |
| Jolt (jolt-physics) / Havok | AAA-grade, heavier setup |

The integration pattern is always the same — physics owns the transform, Three copies it:

```js
world.step();                                        // in fixedUpdate
mesh.position.copy(body.translation());
mesh.quaternion.copy(body.rotation());
```

Player character on physics: use the engine's **kinematic character controller** (Rapier has one) rather than a dynamic capsule you push with forces — dynamic player bodies feel like soap.

Simple overlap checks without an engine: keep `Box3`/`Sphere` per object (`box.setFromObject(mesh)` once, then `box.copy(baseBox).applyMatrix4(mesh.matrixWorld)`), test `boxA.intersectsBox(boxB)` — fine for pickups, triggers, bullets (bullets: raycast from previous to current position so fast shots can't tunnel).

## Camera rigs

- **Orbit/inspect**: OrbitControls (fundamentals.md). Clamp with `minDistance/maxDistance`, `maxPolarAngle: Math.PI/2 - 0.05` (never under the floor).
- **First person**: `PointerLockControls` + the movement pattern above (move the controls' object).
- **Third person follow** — damped chase, the workhorse of action games:

```js
const CAM_OFFSET = new THREE.Vector3(0, 3, -6);       // behind and above (local to player facing)
const _camTarget = new THREE.Vector3(), _lookTarget = new THREE.Vector3();
// in update():
_camTarget.copy(CAM_OFFSET).applyQuaternion(player.quaternion).add(player.position);
camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTarget.x, 4, dt);
camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTarget.y, 4, dt);
camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTarget.z, 4, dt);
camera.lookAt(_lookTarget.copy(player.position).add(new THREE.Vector3(0, 1.5, 0)));
```

  - Camera clipping through walls: raycast player→camera; if a wall is hit, place the camera at `hit.distance * 0.9` along that ray.
  - Don't parent the camera to the player unless you want rigid 1:1 following (feels robotic; damping is what feels good).
- **Cinematics**: tween position + a lookAt target (animation.md); or author a `CatmullRomCurve3` dolly path and slide `t` 0→1. The `camera-controls` lib (drei `<CameraControls />`) gives smooth `setLookAt`/`fitToBox` transitions for free.
- One camera state machine: explicit modes (ORBIT / FOLLOW / CINEMATIC) with a small blend on switch beats ad-hoc flags.

## Audio

Three has positional audio built in — don't reach for raw WebAudio:

```js
const listener = new THREE.AudioListener();
camera.add(listener);                                 // ears follow the camera

const music = new THREE.Audio(listener);              // non-positional (music/UI)
const engineSound = new THREE.PositionalAudio(listener); // 3D — attenuates with distance
engineSound.setRefDistance(5);
carMesh.add(engineSound);

const buffer = await new THREE.AudioLoader().loadAsync('engine.ogg');
engineSound.setBuffer(buffer); engineSound.setLoop(true);
```

Browsers block audio until a user gesture: start/`context.resume()` on first click. `sound.setPlaybackRate()` for engine pitch, `sound.play()` per event (clone or use multiple Audio objects for overlapping SFX).

## Game structure patterns

- **Object pooling**: bullets/particles/enemies — pre-create N, recycle with `visible = false` + a free list. Never create/dispose meshes per shot (GC hitches + GPU churn).
- **Entity update list**: keep `const entities = []` each with `update(dt)`; iterate in fixedUpdate. Remove by swap-with-last, not `splice` mid-iteration.
- **State machine** per entity (IDLE/RUN/JUMP/ATTACK) driving both logic and animation crossfades (animation.md) — the clean way to sync gameplay and clips.
- **UI**: DOM overlay (absolutely-positioned HUD over the canvas) is right for menus/score — cheaper and more accessible than in-scene UI. In-world labels: sprites or troika text.
- **Pause**: `renderer.setAnimationLoop(null)` to halt, or keep rendering but skip fixedUpdate (lets you animate pause menus); `clock.getDelta()` on resume returns the gap — clamp it (already in the loop above).
- Save/restore: serialize plain state (positions, scores), never Three objects.

## What Three.js does NOT give you (plan for it)

Netcode/multiplayer (bring colyseus/socket.io + authoritative server), pathfinding (three-pathfinding, navmesh baked in Blender), advanced AI, level editors, asset hot-reload. For a full engine experience consider whether the project should be a game engine project instead — but for web games, this stack (Three + Rapier + the patterns above) is the standard and it ships.
