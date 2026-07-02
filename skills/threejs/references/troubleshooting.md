# Troubleshooting — symptom → cause → fix

Work top-down: scene graph → camera → materials/lights → loop. Add `AxesHelper`/`GridHelper` immediately when lost.

## Nothing renders (black/blank screen)

Check in order:
1. **Render loop actually running?** `renderer.render(scene, camera)` called per frame; canvas appended to DOM; canvas has nonzero size (a display:none or 0-height parent = 0×0 canvas).
2. **Console errors?** A shader compile error or "THREE.WebGLRenderer: context lost" stops everything.
3. **Camera position** — default is `(0,0,0)`, possibly *inside* your object with backface culling hiding it. Move it back: `camera.position.set(0, 2, 5)`.
4. **Camera looking away** — `camera.lookAt(0,0,0)` (or set `controls.target`).
5. **Lights** — `MeshStandardMaterial` without lights/environment = black. Sanity-check by swapping in `MeshBasicMaterial({ color: 'red' })` or `MeshNormalMaterial` — if the object appears, it's a lighting problem.
6. **Object scale/position** — log `new THREE.Box3().setFromObject(obj)`; a 1000x-scaled CAD model means you're inside it; a mm-scale model is an invisible dot.
7. **Clipping planes** — object nearer than `camera.near` or beyond `far`.
8. **Background = object color** — black object on black background; set `scene.background = new THREE.Color('grey')` while debugging.

## Model loads but is invisible / partially visible

- Wrong units/scale (see above; glTF is meters, FBX often cm).
- **Frustum culling with stale bounds**: object disappears when near screen edge → `geometry.computeBoundingSphere()` after modifying positions, or `mesh.frustumCulled = false` (esp. skinned meshes and shader-displaced geometry).
- Normals flipped / single-sided: visible from one side only → `material.side = THREE.DoubleSide` to confirm, then fix normals in DCC or `geometry.computeVertexNormals()`.
- Draw range / index problems on generated geometry; NaN positions → "Computed radius is NaN" → validate data.
- Material `opacity: 0`, `visible: false`, or fog swallowing it (`scene.fog` near too close).

## It's there but looks wrong

| Symptom | Likely cause → fix |
|---|---|
| Washed out / pale | color texture missing `colorSpace = SRGBColorSpace`; or double tone mapping (composer without OutputPass semantics) |
| Too dark overall | no tone mapping with HDR env (`renderer.toneMapping = ACESFilmic...`); or data texture wrongly flagged sRGB; or missing environment for PBR |
| "Doesn't match Blender/DCC render" | Blender's default view transform is AgX (older: Filmic) — use `AgXToneMapping` in Three to match, plus the same HDRI as `scene.environment` |
| Metals pitch black | no `scene.environment` — metals only reflect; add IBL |
| Faceted when should be smooth | missing/flat normals → `computeVertexNormals()`, or `flatShading: true` unintended, or DCC export without smoothing |
| Stretched image | resize handler missing `camera.aspect = w/h; camera.updateProjectionMatrix()` |
| Blurry rendering | `renderer.setPixelRatio(devicePixelRatio)` never called (renders at DPR 1 upscaled) |
| Flickering surfaces (z-fighting) | coplanar faces or near/far too wide → separate surfaces slightly, raise `near`, tighten `far`, or `polygonOffset` for decals |
| Texture upside down | glTF vs TextureLoader `flipY` mismatch → `texture.flipY = false; texture.needsUpdate = true` |
| Normal map dents inverted | DirectX-baked map → `material.normalScale.y *= -1` |
| Jagged edges | `antialias: true` missing at renderer creation (can't change after); with composer, add AA pass |
| Banding in gradients | add subtle dithering (`material.dithering = true`) |
| Transparent objects popping/ordering wrong | see geometries-materials.md transparency section — alphaTest for cutouts, depthWrite/renderOrder tuning |
| Shadow acne / stripes | `light.shadow.normalBias = 0.02–0.05` (or small negative `bias`) |
| No shadows | 3-switch checklist: renderer.shadowMap.enabled, light.castShadow, mesh.castShadow + ground.receiveShadow; directional shadow camera bounds too small |

## Runtime errors decoded

- **"THREE.Object3D.add: object not an instance of THREE.Object3D"** — you passed a `gltf` (add `gltf.scene`), a geometry, or an object from a *duplicate three instance* (two versions of three in node_modules — `npm ls three`; dedupe; also caused by mixing `'three'` and `'three/webgpu'`).
- **"Cannot read properties of undefined (reading 'render'/'position')"** in R3F — ref not populated yet; guard `ref.current?.` in useFrame, or logic ran before mount.
- **"Texture marked for update but no image data found"** — texture used before load finished; await loaders.
- **"GL_INVALID_OPERATION: Feedback loop"** — rendering a render target while sampling it in the same pass; ping-pong two targets.
- **"too many uniforms" / shader fails only on mobile** — exceeded mobile limits (often from many lights or big uniform arrays); reduce lights, pack data into textures.
- **Context lost** — GPU memory exhaustion or driver reset; reduce texture memory; listen to `webglcontextlost`/`restored` to recover.
- **CORS / tainted canvas** — loading textures from another origin without CORS headers; serve assets same-origin or with `Access-Control-Allow-Origin`, loaders set `crossOrigin='anonymous'` by default.
- **Vite/Next build works in dev, breaks deployed** — asset paths: put models/textures in `public/` and load absolute (`/models/x.glb`), or `import` URLs so the bundler fingerprints them; DRACO/KTX2 decoder paths must also resolve in production.
- **"Multiple instances of Three.js being imported"** warning — same dedupe issue as above; harmless-looking but breaks `instanceof` checks randomly.

## Interaction bugs

- OrbitControls ignores damping → missing `controls.update()` in loop.
- OrbitControls doesn't respond → wrong DOM element (must be the canvas or its interactive ancestor), or another element with higher z-index eats events, or you created controls before appending canvas.
- Raycaster never hits → pointer NDC math wrong for non-fullscreen canvas (use `getBoundingClientRect()`), object in different `layers`, geometry has no `boundingSphere` (compute it), or mesh is InstancedMesh/SkinnedMesh needing special handling (see fundamentals.md).
- Clicks hit invisible objects → `visible=false` objects are skipped, but objects with `opacity: 0` are still raycast — remove from pickables or use layers.
- `lookAt` fights OrbitControls → set `controls.target.copy(p); controls.update()` instead.

## Animation bugs

- Mixer plays nothing → forgot `mixer.update(dt)`; clip names mismatch (log them); action weight 0; model root mismatch (create mixer with the same root the clips target).
- Animation snaps to T-pose at end → `LoopOnce` without `clampWhenFinished = true`.
- Character slides/walks away → root motion baked into clip; strip hips position track or export in-place.
- Manual bone edits ignored → apply them after `mixer.update` each frame.
- Everything speeds up on 144 Hz monitors → per-frame constants instead of delta time. Multiply by `dt`.
- Cloned characters share/steal animation → clone with `SkeletonUtils.clone`.

## Environment-specific

- **iOS Safari**: lower memory limits (context loss), DPR 3 devices (cap it), no `preserveDrawingBuffer` assumptions; `muted playsinline` required for video textures.
- **SSR (Next.js etc.)**: three touches `window`/`document` only at render time, but addons may at import — dynamic-import scene components with `ssr: false`; never construct renderer server-side.
- **Vitest/Jest**: no WebGL in jsdom — mock the renderer or use `@react-three/test-renderer` for R3F.
- **HMR (Vite)**: hot reload can stack multiple canvases/loops — dispose in cleanup (`import.meta.hot.dispose`) or fully reload on scene-file changes.

## Still stuck?

Reproduce minimal: fresh scene + cube + your one suspect feature. If the cube works, bisect additions. Compare against the closest official example at https://threejs.org/examples — their source is in `node_modules/three/examples/` locally.
