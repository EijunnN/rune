---
name: threejs
description: Complete expert knowledge of Three.js — scene setup, WebGLRenderer/WebGPURenderer, cameras, geometries, materials, lights, shadows, textures, glTF loading, animation, GLSL/TSL shaders, post-processing, performance, react-three-fiber, and game development (input, character controllers, camera rigs, physics, audio). Use this skill whenever the task involves Three.js, react-three-fiber, drei, WebGL, WebGPU, GLSL, TSL, 3D models (glTF/GLB/FBX/OBJ), browser games, or any browser 3D graphics — even if the user doesn't say "Three.js" explicitly (e.g. "add a 3D hero section", "spinning product viewer", "particle background", "shader effect", "3D configurator"). Also use it when debugging black screens, invisible models, washed-out colors, shadow acne, or performance problems in a 3D web app.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Three.js Expert

Three.js is a scene-graph abstraction over WebGL/WebGPU. Almost every bug comes from one of four places: **the scene graph** (what exists and where), **the camera** (what is seen), **materials/lights/color** (how it looks), or **the frame loop** (when it updates). Diagnose in that order.

## Version awareness — do this first

Three.js releases monthly (`r180`, `r181`, …) and **has breaking changes between releases**. Before writing code in an existing project:

1. Check the installed version: read `node_modules/three/package.json` or run `npm ls three` (`0.180.0` == r180).
2. If APIs behave unexpectedly, consult the migration guide: https://github.com/mrdoob/three.js/wiki/Migration-Guide
3. Addons import from `three/addons/...` (alias of `examples/jsm`). Anything importing `examples/js` or using script tags with global `THREE` is legacy — modern Three.js is ESM-only.

Baseline assumed by this skill (true since ~r160, stable through 2026):
- Color management is ON by default; `renderer.outputColorSpace` defaults to sRGB.
- Lighting is physically based by default (`useLegacyLights` is gone). Light intensities use physical-ish units; point/spot lights decay realistically.
- `WebGPURenderer` is production-ready (since r171): `import * as THREE from 'three/webgpu'` with automatic WebGL2 fallback. Shaders for it are written in **TSL** (Three Shading Language), not raw WGSL/GLSL.

## Choosing the stack

| Situation | Choice |
|---|---|
| Plain JS/TS app, broad compatibility, mature ecosystem | `WebGLRenderer` (`import * as THREE from 'three'`) |
| New project, wants compute shaders / node materials / future-proof | `WebGPURenderer` (`import * as THREE from 'three/webgpu'` + `three/tsl`) — it falls back to WebGL2 automatically |
| React app | react-three-fiber v9 (+ drei). Read [references/react-three-fiber.md](references/react-three-fiber.md) |
| Custom shaders on WebGLRenderer | GLSL via `ShaderMaterial` / `onBeforeCompile` |
| Custom shaders on WebGPURenderer | TSL node materials (`colorNode`, `positionNode`) |

Never mix: `EffectComposer` (GLSL post-processing) is WebGL-only; `THREE.PostProcessing` (TSL) is for WebGPURenderer.

## Canonical minimal setup (WebGLRenderer)

Every correct Three.js app has these parts. Omitting any of them is the #1 source of "nothing renders":

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(3, 2, 5);            // move the camera — it starts at origin, inside your object

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));  // cap DPR: 3x+ is wasted GPU
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;      // or AgX/Neutral; NoToneMapping is default
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;                           // damping requires controls.update() each frame

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 10, 7);
scene.add(sun);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4488ff }),   // Standard/Physical NEED lights; Basic doesn't
);
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();                       // forgetting this stretches the image
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {                        // preferred over raw rAF (works in XR too)
  const dt = clock.getDelta();                           // frame-rate-independent motion: scale by dt
  mesh.rotation.y += dt * 0.5;
  controls.update();
  renderer.render(scene, camera);
});
```

WebGPU variant: same code, but `import * as THREE from 'three/webgpu'`, `new THREE.WebGPURenderer({ antialias: true })`, and `await renderer.init()` before first render (or just use `setAnimationLoop`, which waits internally).

## Core mental model

- **Scene graph**: `Object3D` tree. `position`/`rotation` (Euler) / `quaternion` / `scale` are **local to the parent**. World transforms are computed into `matrixWorld` each render. Use `getWorldPosition(v)` when you need world-space.
- **Units**: dimensionless, but treat 1 unit = 1 meter — physical lighting, camera defaults and glTF all assume it.
- **Coordinates**: right-handed, **Y-up**, camera looks down **−Z**.
- **A mesh = geometry + material**. Geometry (`BufferGeometry`) holds vertex attributes on the GPU; material decides the shader program. Both are shareable between meshes — share them for performance.
- **Draw calls dominate performance.** One mesh = one draw call. Hundreds of meshes → merge, instance (`InstancedMesh`), or batch (`BatchedMesh`). See [references/performance.md](references/performance.md).
- **You own GPU memory.** Removing an object from the scene does NOT free it: call `geometry.dispose()`, `material.dispose()`, `texture.dispose()`.

## Reference files — read the one that matches the task

| Task | Read |
|---|---|
| Renderer options, cameras, color management, tone mapping, render loop, resize, disposal | [references/fundamentals.md](references/fundamentals.md) |
| Choosing/configuring materials, PBR params, transparency, BufferGeometry & custom geometry | [references/geometries-materials.md](references/geometries-materials.md) |
| Light types & intensities, shadow setup & artifacts, environment maps / IBL, texture settings & color spaces | [references/lights-shadows-textures.md](references/lights-shadows-textures.md) |
| Loading glTF/GLB (DRACO, KTX2, Meshopt), other formats, loading managers, asset optimization | [references/assets-gltf.md](references/assets-gltf.md) |
| AnimationMixer, clips/actions, crossfades, skeletal & morph targets, procedural animation | [references/animation.md](references/animation.md) |
| Custom GLSL (ShaderMaterial, onBeforeCompile) and TSL (node materials, compute shaders) | [references/shaders-tsl.md](references/shaders-tsl.md) |
| Bloom, DOF, SSAO, outlines — EffectComposer (WebGL) and PostProcessing (WebGPU/TSL) | [references/postprocessing.md](references/postprocessing.md) |
| Games & interaction — game loop, keyboard/gamepad input, character controllers, follow/FPS cameras, physics (Rapier), collisions, positional audio | [references/games-interaction.md](references/games-interaction.md) |
| FPS problems, draw calls, instancing, LOD, memory leaks, profiling, mobile | [references/performance.md](references/performance.md) |
| React three fiber v9, drei, hooks, R3F-specific performance rules | [references/react-three-fiber.md](references/react-three-fiber.md) |
| "It doesn't work" — black screen, invisible model, wrong colors, z-fighting, common runtime errors | [references/troubleshooting.md](references/troubleshooting.md) |

For anything not covered, the authoritative sources are https://threejs.org/docs, https://threejs.org/manual, and the live examples at https://threejs.org/examples (source code of each example is the best documentation for addons).

## Non-negotiables (top mistakes to avoid)

1. **Frame-rate independence**: multiply all motion by delta time (`clock.getDelta()` or the delta passed to `useFrame`). Never `+= 0.01` per frame.
2. **Color spaces**: color textures (map, emissiveMap) → `texture.colorSpace = THREE.SRGBColorSpace`. Data textures (normal, roughness, metalness, ao, displacement) stay linear (default). Getting this wrong = washed-out or too-dark rendering. `TextureLoader` does NOT set it automatically; `GLTFLoader` does.
3. **Lit materials need lights** (`MeshStandardMaterial` renders black without lights/environment). `MeshBasicMaterial` ignores lights entirely.
4. **Dispose what you create** when swapping scenes/assets, or memory grows unbounded.
5. **Don't allocate in the render loop** — no `new Vector3()` per frame; reuse module-level scratch objects.
6. **`updateProjectionMatrix()`** after changing any camera parameter; `shadow.camera` changes likewise.
7. **Reasonable near/far** (e.g. 0.1–100). `near: 0.001, far: 1000000` destroys depth precision → z-fighting.
8. **glTF is the format**. Prefer .glb; convert FBX/OBJ when possible; optimize with `gltf-transform`.
9. **Shadows are opt-in three times**: `renderer.shadowMap.enabled = true` + `light.castShadow = true` + per-mesh `castShadow`/`receiveShadow`.
10. **In R3F: never `setState` in `useFrame`**; mutate refs. And don't create objects in JSX props inline every render.

## Workflow for building a scene

1. Get the canonical setup rendering a placeholder (cube + lights + controls). Verify something is on screen before adding complexity.
2. Add real assets (glTF). Wrap loading in a `LoadingManager` or async/await; log `gltf.scene` structure to find node names.
3. Light it: environment map (`RoomEnvironment` or HDR) for PBR fill + one shadow-casting directional light is the standard recipe.
4. Animate: mixer for baked clips, delta-scaled code for procedural motion.
5. Only then: post-processing and shader polish.
6. Profile before optimizing: `renderer.info.render.calls` / `.triangles`, and Stats from `three/addons/libs/stats.module.js`.

When debugging visuals, add helpers liberally and remove them after: `AxesHelper`, `GridHelper`, `DirectionalLightHelper`, `CameraHelper(light.shadow.camera)`, `Box3Helper`.
