# Lights, Shadows, Environment & Textures

## Lights

Physically based lighting is the default (legacy mode was removed). Point/spot intensity falls off with distance squared (`decay: 2`). Units are physical-ish: directional/ambient intensity ≈ irradiance factor; point/spot in candela; RectAreaLight in nits.

| Light | Shadows | Cost | Use |
|---|---|---|---|
| `AmbientLight(color, intensity)` | no | free | flat fill; kills all contrast at high intensity — keep ≤ 0.5, or prefer an environment map |
| `HemisphereLight(skyColor, groundColor, i)` | no | free | outdoor fill (blue sky / warm bounce) — better than ambient |
| `DirectionalLight(color, i)` | yes | mid | sun. Position sets direction toward `light.target` (default origin). Intensity 1–3 typical with ACES |
| `PointLight(color, i, distance=∞, decay=2)` | yes (6 faces! expensive) | high w/ shadows | bulbs, torches. Physical intensity: candela |
| `SpotLight(color, i, distance, angle, penumbra, decay)` | yes | mid | flashlights, stage. `penumbra: 0.5+` for soft edge; `.map` for projected texture (gobo) |
| `RectAreaLight(color, i, w, h)` | **no shadows** | high | softboxes, windows, screens. Works only with Standard/Physical. Init once: `RectAreaLightUniformsLib.init()` from addons |
| `LightProbe` | no | free | baked ambient from cubemap |

Standard recipe (matches most "nice" demos):

```js
scene.environment = envMap;                       // IBL does the heavy lifting (see below)
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(5, 10, 5);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8899ff, 0x334422, 0.3)); // gentle fill
```

Every light type adds per-fragment cost to every lit material. Few dynamic lights + IBL beats many lights. Debug placement with `DirectionalLightHelper`, `SpotLightHelper`, `PointLightHelper`.

## Environment maps / IBL (the secret to good-looking PBR)

`scene.environment` lights all PBR materials with an image — reflections and diffuse fill for free.

**No-asset option** (neutral studio):

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();
```

**HDRI file** (polyhaven.com has free CC0 HDRIs):

```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
const env = await new RGBELoader().loadAsync('studio.hdr');
env.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = env;
scene.background = env;              // optional: also show it
scene.backgroundBlurriness = 0.3;    // product-shot style
```

- `scene.environmentIntensity` (global) and `material.envMapIntensity` (per material) control strength; `scene.environmentRotation` (Euler) rotates it.
- Prefer `.hdr`/`.exr` (via `RGBELoader`/`EXRLoader`) or pre-processed KTX2. A JPG environment gives dull, LDR reflections.
- Real-time reflections of the scene itself: `CubeCamera` + `WebGLCubeRenderTarget` (expensive; update sparingly).

## Shadows

Shadow maps: the light renders depth to a texture; fragments compare against it. Enable in three places:

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
light.castShadow = true;
mesh.castShadow = true;      // per mesh
ground.receiveShadow = true;
```

**DirectionalLight shadows use an orthographic camera that defaults to a tiny box** — fit it to your scene or shadows clip/pixelate:

```js
const s = 10;                              // half-extent covering the shadowed area
Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 50 });
sun.shadow.mapSize.set(2048, 2048);        // resolution; 1024 mobile, 2048 desktop, 4096 hero shots
sun.shadow.camera.updateProjectionMatrix();
// debug: scene.add(new THREE.CameraHelper(sun.shadow.camera))
```

The tighter the shadow camera fits, the sharper the shadows at a given mapSize.

### Shadow artifacts and fixes

| Symptom | Fix |
|---|---|
| Stripes/moiré on lit surfaces ("shadow acne") | `light.shadow.bias = -0.0005` (small negative steps) or better `normalBias = 0.02–0.05`; ensure geometry has correct normals |
| Shadow detached from object ("peter-panning") | bias too large — reduce it; use normalBias instead |
| Blocky/jagged shadow edge | tighten shadow camera bounds; raise mapSize; PCFSoft type |
| Shadow cut off | shadow camera bounds/far too small (visualize with CameraHelper) |
| No shadow at all | one of the three enables missing; material is `MeshBasicMaterial` (doesn't receive); light is RectAreaLight/Ambient (can't cast) |
| Everything too dark where shadowed | shadows only block direct light — add environment/hemisphere fill |

- `light.shadow.radius` blurs (works with PCFSoft; VSM has its own `blurSamples`).
- Shadows are re-rendered every frame per shadow-casting light. For static scenes: `renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;` once.
- Cheap alternative for single objects on a ground plane: bake or fake — a radial-gradient texture on a plane (`MeshBasicMaterial`, `transparent`), or `ShadowMaterial` (invisible plane that only shows received shadows: `new THREE.ShadowMaterial({ opacity: 0.3 })`), or drei's `ContactShadows` in R3F.

## Textures

```js
const tex = await new THREE.TextureLoader().loadAsync('albedo.jpg');
tex.colorSpace = THREE.SRGBColorSpace;   // REQUIRED for color maps; NOT for data maps
```

Key settings:
- **Tiling**: `tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4);` (also `.offset`, `.rotation`, `.center`). Default wrap is `ClampToEdgeWrapping`.
- **Anisotropy**: `tex.anisotropy = renderer.capabilities.getMaxAnisotropy();` — fixes blurry textures at grazing angles (floors!). Nearly free.
- **Filtering**: defaults (`LinearMipmapLinearFilter` min, `LinearFilter` mag) are right for photos. Pixel-art: `tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false;` (or keep mipmaps + `NearestFilter` mag only).
- **flipY**: `TextureLoader` textures have `flipY = true`; glTF textures `flipY = false`. When manually assigning a texture onto a glTF material and it appears upside-down, set `flipY = false` (and `needsUpdate = true`).
- After changing image or structural params post-render: `tex.needsUpdate = true`.
- Video: `new THREE.VideoTexture(videoElement)` (autoplay requires muted). Canvas: `CanvasTexture` (set `needsUpdate` when redrawn).
- Data/procedural: `DataTexture(typedArray, w, h, format, type)`.

**Sizing & formats**: keep textures ≤ 2048² unless justified (a 4096² RGBA = 89 MB of GPU memory with mipmaps). JPG/PNG decode to full-size uncompressed data in GPU memory — for texture-heavy scenes use **KTX2/Basis** compressed textures (stay compressed on GPU, ~6-8x less memory, faster upload). See assets-gltf.md for KTX2Loader.

**AO/lightmaps** need a second UV set: geometry attribute `uv1` (aoMap/lightMap use it automatically; glTF exports it as TEXCOORD_1).

## Common texture-related bugs

- Texture black/missing → path wrong (check Network tab), CORS (`crossOrigin` needed for foreign origins), or material created before texture assigned without `needsUpdate`.
- Washed out → missing `SRGBColorSpace` on color map.
- Normal map looks inverted/dented → flip green channel: `normalScale.y *= -1` (DirectX vs OpenGL convention).
- Blurry at glancing angles → anisotropy (above).
- Seams on repeated textures → source not seamless, or mipmap bleeding at atlas edges.
- `RepeatWrapping` not working → WebGL2 supports NPOT repeat, but if targeting odd setups keep power-of-two dimensions (512/1024/2048) — also required for mipmaps in some compressed formats.
