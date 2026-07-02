# Assets & Loaders (glTF first)

## Why glTF/GLB

glTF 2.0 is the format Three.js is built around: PBR materials map 1:1 to `MeshStandardMaterial`/`MeshPhysicalMaterial`, correct color spaces are set automatically, animations/skins/morphs import cleanly. Prefer `.glb` (single binary file). Convert other formats to glTF in the pipeline (Blender exports it natively) rather than loading FBX/OBJ at runtime when you can avoid it.

## GLTFLoader — full setup

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader()
  .setDRACOLoader(new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'))
  .setKTX2Loader(new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/basis/').detectSupport(renderer))
  .setMeshoptDecoder(MeshoptDecoder);

const gltf = await gltfLoader.loadAsync('model.glb');
scene.add(gltf.scene);
```

- Only wire up DRACO/KTX2/Meshopt if the asset uses them, but wiring them unconditionally is harmless (decoders lazy-load). For production, self-host the decoder files (copy from `node_modules/three/examples/jsm/libs/{draco,basis}/`) instead of CDNs, and match the CDN version to your three version.
- The result object: `gltf.scene` (a `Group`), `gltf.animations` (`AnimationClip[]`), `gltf.cameras`, `gltf.asset`.
- `KTX2Loader.detectSupport(renderer)` is required — it picks the right GPU format to transcode to.

## Post-load housekeeping (almost always needed)

```js
gltf.scene.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = true;
    // o.material.envMapIntensity = 1;  // tune IBL per asset if needed
  }
});

// Find parts by their Blender/DCC names:
const wheel = gltf.scene.getObjectByName('Wheel_FL');

// Normalize size/position of arbitrary models:
const box = new THREE.Box3().setFromObject(gltf.scene);
const size = box.getSize(new THREE.Vector3());
const scale = 2 / Math.max(size.x, size.y, size.z);  // fit into ~2 units
gltf.scene.scale.setScalar(scale);
box.setFromObject(gltf.scene);
gltf.scene.position.y -= box.min.y;                   // sit on the ground
```

Common surprises:
- Model invisible → wrong scale (CAD exports in mm = 1000x too big; you may be inside it). Log the bounding box.
- Materials look dull → no `scene.environment` set (glTF PBR needs IBL), or missing tone mapping.
- Vertex colors from Blender look wrong → they're in the `color` attribute; ensure material `vertexColors: true` (GLTFLoader sets it) and correct color space handling comes free.
- Cloning a skinned model: use `SkeletonUtils.clone(gltf.scene)` from addons — naïve `.clone()` breaks bone bindings.
- Textures upside down after manual assignment → `texture.flipY = false` for glTF materials.

## Other formats

| Format | Loader (addons) | Notes |
|---|---|---|
| FBX | `FBXLoader` | animations OK; units often cm (scale 0.01); convert to glTF offline when possible |
| OBJ/MTL | `OBJLoader` + `MTLLoader` | no animation, legacy materials |
| STL | `STLLoader` | geometry only (3D printing) — returns geometry, wrap in a Mesh yourself |
| PLY | `PLYLoader` | point clouds / scans |
| USDZ | `USDZLoader` | limited; mostly for AR interchange |
| HDR/EXR | `RGBELoader`/`EXRLoader` | environment maps |
| SVG | `SVGLoader` | parse to shapes → `ExtrudeGeometry` |
| Splats | `LumaSplatsThree` / community loaders | gaussian splatting — third-party |

## Loading UX

**LoadingManager** — aggregate progress across all loaders:

```js
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => updateBar(loaded / total);
manager.onLoad = () => hideOverlay();
manager.onError = (url) => console.error('Failed:', url);
const loader = new GLTFLoader(manager);
```

- Per-file progress (`onProgress` callback of `.load`) only works when the server sends `Content-Length`; item-count progress via the manager is more reliable.
- Parallelize independent loads: `await Promise.all([gltfLoader.loadAsync(a), rgbeLoader.loadAsync(b)])`.
- First render after load compiles shaders (hitch). Pre-warm: `await renderer.compileAsync(gltf.scene, camera, scene)` before adding/revealing.
- Loaders cache by URL within a session via `THREE.Cache` only if `THREE.Cache.enabled = true` (for `FileLoader`-based loaders); otherwise structure your code to load once and clone.

## Asset optimization pipeline (do this offline, not at runtime)

Use **gltf-transform** (CLI: `npm i -g @gltf-transform/cli`):

```bash
gltf-transform optimize input.glb output.glb --compress draco --texture-compress ktx2
# or individual steps:
gltf-transform draco in.glb out.glb          # mesh compression (~5-10x smaller geometry)
gltf-transform etc1s in.glb out.glb          # KTX2 basis compression for color textures
gltf-transform uastc in.glb out.glb --slots "{normalTexture}"  # higher quality for normal maps
gltf-transform resize in.glb out.glb --width 1024 --height 1024
gltf-transform prune in.glb out.glb && gltf-transform dedup in.glb out.glb
```

Guidelines: hero asset ≤ 5–15 MB, whole scene ideally < 25 MB; textures 1024–2048; DRACO for meshes (decode cost is one-time), Meshopt as a faster-decoding alternative (also great with `EXT_meshopt_compression`), KTX2 for textures (stays compressed on the GPU — helps memory AND load).

Inspect/validate assets: https://gltf.report (drag & drop analysis) or `gltf-transform inspect model.glb`.

## Where to get test assets

- Khronos sample models: https://github.com/KhronosGroup/glTF-Sample-Assets
- Poly Haven (CC0 models + HDRIs): https://polyhaven.com
- Three.js repo `examples/models/` for classics (damaged helmet, soldier, horse).
