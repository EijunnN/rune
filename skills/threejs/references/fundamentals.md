# Fundamentals: renderers, cameras, loop, color, lifecycle

## WebGLRenderer

```js
const renderer = new THREE.WebGLRenderer({
  antialias: true,          // MSAA; nearly always want it (cheap on modern GPUs)
  alpha: false,             // true = transparent canvas background (composite over the page)
  powerPreference: 'high-performance',
  // canvas: existingCanvas, // pass your own canvas element if you have one
  // preserveDrawingBuffer: true, // only if you need canvas.toDataURL() screenshots; costs perf
  // logarithmicDepthBuffer: true, // only for extreme depth ranges (space scenes); breaks some tricks
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height); // sets canvas CSS size too; pass false as 3rd arg to skip CSS
```

Key properties:
- `renderer.outputColorSpace` — default `THREE.SRGBColorSpace`. Leave it. Only set `LinearSRGBColorSpace` when rendering into a pipeline that converts later.
- `renderer.toneMapping` — default `NoToneMapping` (clips HDR!). For PBR scenes set `ACESFilmicToneMapping` (contrasty, filmic), `AgXToneMapping` (neutral, handles extreme HDR best), or `NeutralToneMapping` (Khronos standard, best for e-commerce color accuracy). `renderer.toneMappingExposure` (default 1) is your global brightness knob.
- `renderer.shadowMap.enabled = true`, `renderer.shadowMap.type = THREE.PCFSoftShadowMap` (good default) or `THREE.VSMShadowMap` (soft, blurrable, but light leaks).
- `renderer.setClearColor(0x000000, 1)` or set `scene.background`.
- `renderer.info` — live counts: `render.calls`, `render.triangles`, `memory.geometries`, `memory.textures`. Your first profiling stop.

## WebGPURenderer

```js
import * as THREE from 'three/webgpu';   // superset of 'three'; all core classes included

const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();                    // async! setAnimationLoop also awaits it internally
renderer.setAnimationLoop(animate);
```

- Falls back to WebGL2 automatically when WebGPU is unavailable (`renderer.backend.isWebGPUBackend` tells you which).
- All materials become node materials (`MeshStandardNodeMaterial` etc.) — classic materials still work, but custom shading is done in **TSL**, not GLSL strings. `ShaderMaterial` does NOT work here. See shaders-tsl.md.
- Post-processing uses `THREE.PostProcessing` + TSL passes, not EffectComposer. See postprocessing.md.
- Compute shaders are available (particles, GPGPU) — a major reason to choose this renderer.
- Never instantiate both `'three'` and `'three/webgpu'` in one app (duplicate classes break `instanceof`).

## Cameras

**PerspectiveCamera(fov, aspect, near, far)** — fov is vertical, in degrees.
- Human-ish: 45–60. Product shots / less distortion: 25–35. Wide dramatic: 70–90.
- `near`/`far` define depth precision. Keep the ratio small (≤ 10⁴–10⁵). Precision is concentrated near `near`, so raising `near` from 0.001 to 0.1 fixes most z-fighting.
- After changing `fov`, `aspect`, `near`, `far`, `zoom`: `camera.updateProjectionMatrix()`.

**OrthographicCamera(left, right, top, bottom, near, far)** — no perspective; for 2D, isometric, UI, and shadow cameras. Size it from aspect:

```js
const frustumSize = 10;
const cam = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2, frustumSize * aspect / 2,
  frustumSize / 2, -frustumSize / 2, 0.1, 100,
);
```

`camera.lookAt(target)` orients the camera; OrbitControls overrides it every frame (set `controls.target` instead).

Fit an object in view:

```js
const box = new THREE.Box3().setFromObject(object);
const size = box.getSize(new THREE.Vector3()).length();
const center = box.getCenter(new THREE.Vector3());
camera.near = size / 100; camera.far = size * 10;
camera.position.copy(center).add(new THREE.Vector3(size / 2, size / 3, size / 2));
camera.lookAt(center); camera.updateProjectionMatrix();
controls?.target.copy(center);
```

## Controls (addons)

- `OrbitControls` — the default. `enableDamping = true` + `controls.update()` per frame. Constrain: `minDistance/maxDistance`, `minPolarAngle/maxPolarAngle`, `enablePan`.
- `TrackballControls` — free rotation (no up axis lock).
- `MapControls` — pan-centric (GIS style).
- `PointerLockControls` — FPS games.
- `TransformControls` — move/rotate/scale gizmo for editors. Add `controls.getHelper()` (r169+) to the scene; disable OrbitControls while dragging (`dragging-changed` event).

## The render loop

```js
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1); // clamp: tab-switch produces huge deltas
  update(dt);
  renderer.render(scene, camera);
});
```

- `setAnimationLoop` > raw `requestAnimationFrame`: pausable (`setAnimationLoop(null)`) and required for WebXR.
- Render-on-demand (dashboards, viewers — saves battery): render only when something changed; OrbitControls fires a `change` event you can hook.
- All time-based logic uses `dt` (or `clock.getElapsedTime()` for absolute phase). Physics libs often want fixed timesteps — accumulate dt and step in fixed increments.

## Scene graph operations

- `scene.add(obj)` / `obj.add(child)` — adding to a new parent removes from the old one.
- `obj.traverse(fn)` — visits self + all descendants (use for setting `castShadow` on loaded models).
- `scene.getObjectByName('Hips')` — glTF node names survive import (Blender names).
- Local vs world: `obj.position` is parent-relative. `obj.getWorldPosition(target)`, `getWorldQuaternion`, `getWorldScale` for world-space. `obj.attach(child)` reparents **keeping world transform** (vs `add` which keeps local values).
- `obj.visible = false` — skips rendering, keeps memory. `obj.layers` — per-camera filtering (e.g. layer 1 only visible to a minimap camera; raycaster respects layers too).
- Rotation: `obj.rotation` (Euler, radians, order 'XYZ') and `obj.quaternion` are synced views of the same state. For composed/interpolated rotations use quaternions (`slerp`); Euler for simple axis spins. `MathUtils.degToRad()` for degrees.

## Color management (why colors look wrong)

Rendering happens in **linear** space; output is converted to sRGB by the renderer. Rules:

1. `new THREE.Color('#ff8800')` and hex numbers are interpreted as sRGB and converted — correct by default.
2. Color textures (`map`, `emissiveMap`) must have `texture.colorSpace = THREE.SRGBColorSpace`. `GLTFLoader` sets this; `TextureLoader` does NOT — set it yourself.
3. Non-color data (normal/roughness/metalness/ao/height maps) must stay linear (`NoColorSpace`, the default).
4. Symptom map: washed-out/pale → color texture missing sRGB flag; too dark/oversaturated → data texture wrongly flagged sRGB; HDR whites clipping to flat white → enable tone mapping.

## Background & fog

- `scene.background = new THREE.Color(0x112233)` | a `Texture` | a cube/equirect env texture (`texture.mapping = THREE.EquirectangularReflectionMapping`).
- `scene.backgroundBlurriness = 0.5`, `scene.backgroundIntensity` — blur/dim HDRI backgrounds.
- `scene.environment = envTexture` — image-based lighting for all PBR materials (see lights-shadows-textures.md).
- `scene.fog = new THREE.Fog(color, near, far)` or `FogExp2(color, density)`. Match fog color to background color. Materials have `fog: true` by default.

## Disposal & lifecycle (memory leaks)

GPU resources outlive scene-graph membership. When permanently removing objects:

```js
function disposeObject(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      // dispose textures hanging off the material
      for (const v of Object.values(m)) v?.isTexture && v.dispose();
      m.dispose();
    });
  });
  root.removeFromParent();
}
```

- Also dispose: render targets (`rt.dispose()`), controls (`controls.dispose()`), and on full teardown `renderer.dispose()`.
- Re-adding after dispose is fine — Three re-uploads on next use. Disposing shared assets while still used elsewhere causes re-upload churn, not crashes.
- Watch `renderer.info.memory` — if geometries/textures grow monotonically while swapping content, you're leaking.

## Raycasting (mouse picking)

```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
window.addEventListener('pointerdown', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); // NDC
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, true); // recursive
  if (hits.length) console.log(hits[0].object.name, hits[0].point);
});
```

- Sorted nearest-first. Each hit: `object`, `point` (world), `distance`, `face`, `uv`, `instanceId` (for InstancedMesh).
- Costly on heavy meshes — for large scenes use `three-mesh-bvh` (npm) which accelerates raycasting ~100x.
- Raycasting a `SkinnedMesh` uses the bind pose unless you `mesh.computeBoundingBox()` per frame or use BVH refit; for lines/points set `raycaster.params.Line.threshold` / `Points.threshold`.
- If clicks "miss": verify the canvas fills the window (otherwise convert with `getBoundingClientRect()`), and that the object's `layers` match the raycaster's.
