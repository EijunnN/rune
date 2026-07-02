# Animation

Two worlds: **baked clips** (exported from Blender/Mixamo, played via `AnimationMixer`) and **procedural animation** (code in the render loop). Most apps use both.

## AnimationMixer — playing glTF clips

```js
const mixer = new THREE.AnimationMixer(gltf.scene);   // root the tracks were authored against
const clips = gltf.animations;                        // AnimationClip[]
console.log(clips.map(c => c.name));                  // discover what's available

const idle = mixer.clipAction(THREE.AnimationClip.findByName(clips, 'Idle'));
idle.play();

// In the render loop — the mixer does nothing without this:
mixer.update(dt);
```

`clipAction(clip)` returns an `AnimationAction` (cached — calling twice returns the same one).

### AnimationAction control

```js
action.play();  action.stop();  action.reset();     // reset() rewinds; stop() also disables
action.paused = true;                               // freeze at current time
action.timeScale = 1.5;                             // speed (negative = reverse)
action.time = 0.5;                                  // scrub to seconds
action.setLoop(THREE.LoopOnce, 1);                  // default is LoopRepeat, Infinity
action.clampWhenFinished = true;                    // hold last frame after LoopOnce (else snaps to t=0 pose)
action.setEffectiveWeight(0.7);                     // blending weight
```

One-shot (e.g. jump) done signal:

```js
mixer.addEventListener('finished', (e) => { if (e.action === jump) backToIdle(); });
```

### Crossfading between clips (the correct pattern)

Multiple actions on one mixer blend by weight. To transition:

```js
function fadeTo(next, duration = 0.35) {
  next.reset().setEffectiveWeight(1).play();
  current.crossFadeTo(next, duration, false);  // fades current out, next in
  current = next;
}
```

Gotchas:
- `reset()` before crossfading into a previously-finished `LoopOnce` action, or it stays at its end and shows nothing.
- Clips must be authored compatibly (same skeleton) to blend well; use `warp: true` (3rd arg) to sync stride speeds between walk/run.
- Mixamo clips with root motion baked in will drift the model; either export "in place" or strip the hips position track: `clip.tracks = clip.tracks.filter(t => !t.name.endsWith('Hips.position'))` (keep Y if needed).

### Retargeting / additive

- `THREE.AnimationUtils.makeClipAdditive(clip)` + `action.blendMode = THREE.AdditiveAnimationBlendMode` — layer e.g. a head-look on top of a walk.
- Retarget clips between skeletons: `SkeletonUtils.retargetClip` (addons) — fiddly; matching bone names help.
- Play a subset: `THREE.AnimationUtils.subclip(clip, 'walk', startFrame, endFrame, fps)`.

## Skeletal & morph specifics

- Skinned meshes: `SkinnedMesh` + `Skeleton`. Debug with `new THREE.SkeletonHelper(model)`.
- Bones are regular `Object3D`s — grab one and animate/attach manually: `const hand = model.getObjectByName('mixamorigRightHand'); hand.add(sword);`
- Manual bone control (IK, head-look) must run **after** `mixer.update(dt)` in the frame, or the mixer overwrites it.
- Skinned meshes may vanish when the origin leaves the camera: `mesh.frustumCulled = false` is the standard fix.
- Morph targets (blend shapes / facial): `mesh.morphTargetInfluences[i] = 0..1`, indices by name via `mesh.morphTargetDictionary['smile']`. Animatable through clips too.

## Procedural animation

The pattern: mutate transforms in the loop, scaled by time.

```js
const t = clock.getElapsedTime();
mesh.position.y = Math.sin(t * 2) * 0.25 + baseY;     // bob
mesh.rotation.y += dt * 0.8;                           // spin (dt-scaled!)
```

Smooth follow / damping (frame-rate independent — do NOT use plain lerp with a constant):

```js
// exponential damping: correct across frame rates
obj.position.x = THREE.MathUtils.damp(obj.position.x, targetX, 4, dt); // λ≈4 = snappy
obj.quaternion.slerp(targetQuat, 1 - Math.exp(-8 * dt));               // same idea for rotation
```

Paths: `const curve = new THREE.CatmullRomCurve3(points, true); const p = curve.getPointAt(t % 1);` plus `curve.getTangentAt` to orient (`obj.lookAt(p.clone().add(tangent))`).

## Tweening & camera moves

For UI-style eased transitions (camera flights, door opens), a tween lib is cleaner than hand-rolled easing:
- **GSAP**: `gsap.to(camera.position, { x: 3, y: 2, z: 5, duration: 1.5, ease: 'power2.inOut', onUpdate: () => controls.update() })`. Tween `controls.target` simultaneously for orbit cameras.
- Lightweight alternative: `@tweenjs/tween.js` (remember `TWEEN.update()` in the loop) or drei's `<CameraControls />` (`camera-controls` lib) which has built-in smooth `setLookAt`.

Don't fight OrbitControls: while tweening the camera, either disable controls or tween `controls.target`/use camera-controls' API instead of raw camera position.

## Keyframe tracks from code

You can author clips programmatically — useful for cutscenes/exports:

```js
const track = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0,0,0, 0,2,0, 0,0,0]);
const spin  = new THREE.QuaternionKeyframeTrack('.quaternion', [0, 2], [...q0.toArray(), ...q1.toArray()]);
const clip  = new THREE.AnimationClip('bounce', -1, [track, spin]);
mixer.clipAction(clip).play();
```

Track name syntax: `'nodeName.property'` e.g. `'Hips.position'`, `'.material.opacity'`, `'mesh.morphTargetInfluences[smile]'`.

## Performance notes

- One mixer per animated model; `mixer.update` cost scales with active tracks — `action.stop()` idle actions (weight-0 actions still cost).
- Many animated characters: consider baking to vertex animation textures (VAT) or using `InstancedMesh` + shader skinning (advanced), or just cap simultaneous animated LODs.
- `mixer.stopAllAction()` and `mixer.uncacheRoot(root)` when disposing models.
