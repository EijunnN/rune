# Performance

## Profile first

- `renderer.info.render` — `calls` (draw calls), `triangles`; `renderer.info.memory` — `geometries`, `textures`. Log it or show it on screen.
- Stats overlay: `import Stats from 'three/addons/libs/stats.module.js'` (`stats.begin()/end()` or `stats.update()` in loop).
- Browser DevTools Performance tab distinguishes CPU-bound (long scripting) vs GPU-bound (short frames but janky, `GPU` track saturated).
- Spector.js extension: inspect every draw call of a frame.
- Rules of thumb: **draw calls < ~200 mobile / < ~1000 desktop**; triangles < ~750k mobile / several M desktop; the bottleneck is usually draw calls or fill rate, not triangle count.

Quick bottleneck test: shrink the browser window — if FPS improves a lot, you're fill-rate/fragment bound (lower pixelRatio, simplify shaders/post); if not, you're CPU/draw-call bound (batch/instance).

## Reduce draw calls (the big one)

One mesh = one draw call (× materials). Options, in order of preference:

1. **`InstancedMesh`** — same geometry + material, many transforms. Grass, trees, particles, crowds:

```js
const mesh = new THREE.InstancedMesh(geometry, material, 10_000);
const m = new THREE.Matrix4();
for (let i = 0; i < 10_000; i++) {
  m.compose(position, quaternion, scale);      // or m.setPosition(x, y, z)
  mesh.setMatrixAt(i, m);
  // optional per-instance color: mesh.setColorAt(i, color)
}
mesh.instanceMatrix.needsUpdate = true;         // after any setMatrixAt batch
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // if updating every frame
scene.add(mesh);                                 // 10k objects, 1 draw call
```

Frustum culling treats all instances as one bounds — set `mesh.frustumCulled = false` if instances spread widely and pop out, or call `mesh.computeBoundingSphere()` after placing. Raycast gives `hit.instanceId`.

2. **`BatchedMesh`** — *different* geometries, one material, one draw call; supports per-item add/remove/transform and internal frustum culling. The modern answer for "many unique static props": `addGeometry()` + `addInstance()`.

3. **Merge static geometry** — `mergeGeometries` (BufferGeometryUtils) for truly static level geometry. Loses per-object control.

4. **Share materials/geometries** across meshes — deduplicate; each unique material can mean a program/state switch.

## Fill rate & fragment cost

- Cap `setPixelRatio(Math.min(devicePixelRatio, 2))` — DPR 3 renders 2.25x the pixels of DPR 2 for invisible gains. Under load, dynamically drop to 1–1.5.
- Overdraw: large transparent/overlapping quads (particle smoke!) are the classic mobile killer — fewer/smaller particles, `depthWrite: false`, opaque where possible.
- Cheaper materials where unseen: Lambert/Basic for distant or unimportant objects; `MeshMatcapMaterial` fakes studio lighting for free.
- Post-processing multiplies fill cost — see postprocessing.md; merge passes.
- `antialias: false` + FXAA/SMAA pass can be cheaper than MSAA when already post-processing.

## Lights & shadows

- Every dynamic light adds cost to every lit fragment. IBL (`scene.environment`) + 1 shadow-casting directional is the efficient recipe.
- Shadows re-render the scene per casting light per frame: static scene → `renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true` once (re-set needsUpdate when something moves).
- Shrink `shadow.mapSize` and tighten shadow camera bounds before adding resolution.
- PointLight shadows render 6 cube faces — avoid; prefer SpotLight.
- Bake lighting offline (Blender → lightmap in `lightMap`/`aoMap`) for static scenes: near-zero runtime cost, best quality.

## Geometry & assets

- LOD: `const lod = new THREE.LOD(); lod.addLevel(highMesh, 0); lod.addLevel(midMesh, 10); lod.addLevel(lowBillboard, 40);` — swap detail by distance. Generate lower LODs offline (gltf-transform `simplify` uses meshoptimizer).
- Compress: DRACO/Meshopt geometry, KTX2 textures (GPU memory AND bandwidth), resize textures (2048 max unless hero). See assets-gltf.md.
- `object.visible = false` for temporarily hidden; actually dispose when permanent.
- Frustum culling is automatic per-mesh via bounding spheres — merged mega-meshes defeat it (everything always drawn); balance merging vs culling by chunking large scenes (e.g. merge per room/sector).

## CPU-side (JS) costs

- **Zero allocations in the render loop.** Reuse scratch objects:

```js
const _v = new THREE.Vector3();                 // module scope
function update() { obj.getWorldPosition(_v); } // no GC pressure
```

- Raycasting every `pointermove` against a big scene stalls: throttle, restrict targets (`intersectObjects(pickables)`), and use `three-mesh-bvh` for heavy meshes.
- `matrixAutoUpdate = false` + manual `updateMatrix()` for hordes of static objects saves matrix math per frame.
- Text/DOM sync (`element.style` from 3D positions) causes layout thrash — batch reads/writes; prefer in-scene text (troika-three-text) or drei `<Html>` sparingly.
- Physics/pathfinding/procedural generation → Web Worker (transfer `Float32Array`s; or OffscreenCanvas to render off-main-thread).

## Memory

- Dispose geometry/material/texture/renderTargets when discarding (see fundamentals.md). Verify with `renderer.info.memory` trending flat.
- Texture GPU size = width × height × 4 bytes × 1.33 (mipmaps) — a single 4096² ≈ 89 MB. KTX2 cuts this ~6-8x.
- Context loss (`webglcontextlost` event) on mobile usually means GPU memory exhaustion — reduce texture sizes first.

## Loading & startup

- Shader compile hitch on first sight of a material: `await renderer.compileAsync(scene, camera)` after load, before reveal.
- Code-split three addons; dynamic-`import()` heavy loaders (DRACO wasm etc.).
- Show a skeleton/placeholder scene fast, stream real assets in (`LoadingManager`).

## Render-on-demand

Viewers/configurators don't need 60fps idle:

```js
let needsRender = true;
controls.addEventListener('change', () => (needsRender = true));
renderer.setAnimationLoop(() => {
  if (!needsRender) return;
  needsRender = false;
  renderer.render(scene, camera);
});
```

(Any animation/mixer must set the flag too.) Battery/thermal win on mobile is huge.

## Mobile checklist

- pixelRatio ≤ 2 (consider 1.5), textures ≤ 1024–2048 KTX2, draw calls < 200, 1 shadow light with 1024 map or baked/fake shadows, no SSAO/DOF/SSR, fog to shorten draw distance + tight camera far, `powerPreference: 'high-performance'`, test on a real mid-range Android — desktop DevTools throttling does not emulate GPU/thermals.
