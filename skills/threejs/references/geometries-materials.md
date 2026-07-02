# Geometries & Materials

## Built-in geometries

All are `BufferGeometry`. Segment counts trade triangles for smoothness — keep them as low as looks acceptable.

| Class | Notes |
|---|---|
| `BoxGeometry(w, h, d)` | segments only matter if displacing/deforming |
| `SphereGeometry(r, widthSeg=32, heightSeg=16)` | 32/16 fine for most; 64/32 for close-ups |
| `PlaneGeometry(w, h)` | faces +Z; rotate `-Math.PI/2` on X for ground |
| `CylinderGeometry(rTop, rBottom, h, radialSeg)` | cone = rTop 0 (or `ConeGeometry`) |
| `TorusGeometry(r, tube, radialSeg, tubularSeg)` / `TorusKnotGeometry` | demos, decorative |
| `CircleGeometry`, `RingGeometry` | flat discs |
| `CapsuleGeometry(r, length)` | character colliders/placeholders |
| `IcosahedronGeometry(r, detail)` | best sphere topology for displacement (uniform triangles) |
| `ExtrudeGeometry(shape, { depth, bevelEnabled })` | 2D `THREE.Shape` → 3D; logos, floor plans |
| `LatheGeometry(points)` | revolve a 2D profile (vases, glasses) |
| `TubeGeometry(curve, ...)` | geometry along a `Curve` (e.g. `CatmullRomCurve3`) |
| `TextGeometry` (addon) | needs a typeface.json font via `FontLoader`; consider troika-three-text for crisp SDF text instead |

`EdgesGeometry` + `LineSegments` for outlines; `WireframeGeometry` or `material.wireframe = true` for wireframes.

## BufferGeometry (custom geometry)

Vertex data lives in typed arrays as attributes:

```js
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array([0,0,0,  1,0,0,  0,1,0]); // 3 floats per vertex
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 0,1]), 2));
geometry.setIndex([0, 1, 2]);           // indexed = shared vertices; winding order CCW = front face
geometry.computeVertexNormals();        // needed for lit materials
```

- Standard attribute names: `position` (vec3), `normal` (vec3), `uv` (vec2), `color` (vec3/4), `uv1` (for aoMap/lightMap if separate). Custom attributes for shaders: any name, read in GLSL/TSL.
- Update at runtime: mutate the array, then `attr.needsUpdate = true`. If vertices move beyond the original bounds also `geometry.computeBoundingSphere()` (frustum culling uses it — stale bounds make meshes vanish at screen edges). For frequently-updated attributes set `attr.setUsage(THREE.DynamicDrawUsage)`.
- You **cannot resize** an attribute after first render — allocate max size and use `geometry.setDrawRange(0, count)` to draw a subset.
- Merge static meshes to cut draw calls: `mergeGeometries([g1, g2], false)` from `three/addons/utils/BufferGeometryUtils.js` (bake world transforms into each geometry first with `g.applyMatrix4(mesh.matrixWorld)`).
- NaN in position data → "Computed radius is NaN" error and invisible mesh. Validate generated data.

## Choosing a material

| Material | Lit? | Cost | Use when |
|---|---|---|---|
| `MeshBasicMaterial` | no | lowest | unlit/flat color, UI, wireframes, fullscreen quads |
| `MeshLambertMaterial` | yes | low | cheap diffuse (mobile fallback) |
| `MeshPhongMaterial` | yes | low-mid | cheap specular highlights; legacy look |
| `MeshStandardMaterial` | yes (PBR) | mid | **the default choice** — metalness/roughness workflow, matches glTF |
| `MeshPhysicalMaterial` | yes (PBR+) | high | glass, car paint, fabric: clearcoat, transmission, sheen, iridescence, anisotropy |
| `MeshToonMaterial` | yes | low | cel shading (`gradientMap` for band count) |
| `MeshMatcapMaterial` | fakes it | lowest | sculpt-viewer look, no lights needed — great cheap "lit" look |
| `MeshNormalMaterial` | no | — | debugging normals |
| `MeshDepthMaterial` | no | — | depth visualization / custom pipelines |
| `ShaderMaterial` / `RawShaderMaterial` | you decide | — | custom GLSL (WebGL only; see shaders-tsl.md) |
| `PointsMaterial` (with `THREE.Points`) | no | — | particles (`size`, `sizeAttenuation`, `map` + `alphaTest`) |
| `LineBasicMaterial` / `LineDashedMaterial` | no | — | `linewidth > 1` does NOT work (WebGL limit) — use `Line2` addon or meshline for thick lines |
| `SpriteMaterial` (with `THREE.Sprite`) | no | — | camera-facing billboards, labels |

In `three/webgpu`, use the same names or `*NodeMaterial` variants — all materials there are node-based and accept TSL inputs.

## MeshStandardMaterial — the workhorse

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0xffffff,          // albedo tint (multiplies map)
  map: albedoTex,           // sRGB!
  metalness: 0.0,           // 0 = dielectric, 1 = metal. Real materials are ~0 or ~1, rarely between
  roughness: 0.5,           // 0 = mirror, 1 = matte
  metalnessMap, roughnessMap,
  normalMap,                // linear; normalScale: new THREE.Vector2(1, 1) to tune (negative Y if baked for DirectX)
  aoMap, aoMapIntensity: 1, // needs uv (or uv1) attribute; darkens ambient/env only
  emissive: 0x000000, emissiveMap, emissiveIntensity: 1, // ignores lights; drive bloom with values > 1
  envMapIntensity: 1,       // per-material IBL strength (scene.environment)
});
```

- Metals with no environment map look black — PBR metals reflect their environment; always provide `scene.environment` (see lights-shadows-textures.md).
- `flatShading: true` for faceted low-poly style.
- `side: THREE.DoubleSide` for planes/leaves/cloth (default `FrontSide`; backfaces are culled).

## MeshPhysicalMaterial extras

- **Glass**: `transmission: 1, roughness: 0, thickness: 0.5, ior: 1.5` — physically refractive; renders scene behind it (expensive; needs `transparent: false`, it's handled separately). `transparent: true, opacity: 0.5` is the cheap alternative (no refraction).
- **Clearcoat**: `clearcoat: 1, clearcoatRoughness: 0.1` — car paint, lacquer.
- **Sheen**: `sheen: 1, sheenColor` — velvet/fabric.
- **Iridescence**: `iridescence: 1, iridescenceIOR` — soap bubbles, oil.
- **Anisotropy**: `anisotropy: 1` — brushed metal (needs tangents).
- `specularIntensity`/`specularColor` — dial dielectric reflections.

## Transparency — the eternal pain

Alpha-blended transparency in a rasterizer is order-dependent; Three sorts **objects** by depth, not triangles, so intersecting/concave transparent objects self-glitch.

- `transparent: true, opacity: 0.5` — enables blending, moves object to the sorted-back-to-front transparent pass.
- **Cutouts** (foliage, fences, chain-link): use `alphaTest: 0.5` with `transparent: false` — depth-writes normally, no sorting problems. Prefer this whenever the alpha is binary.
- Self-overlapping transparent mesh artifacts: try `depthWrite: false` (stops self-occlusion, may cause bleed-through), or `side: THREE.FrontSide` plus a second back-side mesh, or accept it.
- `material.opacity` does nothing without `transparent: true` (or `material.alphaHash = true` — dithered alpha, order-independent, needs TAA/high DPR to look smooth).
- Sorting override: `object.renderOrder = n` (higher renders later).

## Material tips

- Materials compile into shader programs; **changing defines-level settings** (adding a map where there was none, toggling flags) triggers recompile → hitch. Changing `.color`, `.roughness` values is free. Set `material.needsUpdate = true` after structural changes (e.g. assigning `map` after first render, toggling `vertexColors`).
- Share one material across many meshes when possible. To vary color per-instance cheaply without cloning: `mesh.material.clone()` is fine for a few; for many use `InstancedMesh.setColorAt` or vertex colors.
- `vertexColors: true` reads the `color` attribute and multiplies with `material.color` — keep `color: 0xffffff`.
- `polygonOffset: true, polygonOffsetFactor: -1` — decals/overlays coplanar with a surface without z-fighting.
- Clipping planes: `renderer.localClippingEnabled = true; material.clippingPlanes = [new THREE.Plane(normal, constant)]` — cutaway views.
- `material.toneMapped = false` — for things that must not be tone-mapped (UI sprites, LUT-accurate colors, bloom-driving emissives).
