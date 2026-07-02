# React Three Fiber (R3F)

R3F is a React **renderer** for Three.js — JSX describes the scene graph; there is no overhead per frame vs vanilla. v9 targets React 19 (v8 → React 18). Everything in the other reference files still applies; this file covers the React layer.

```bash
npm i three @react-three/fiber @react-three/drei
# types: npm i -D @types/three
```

## Core model

```jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { useRef } from 'react';

function Spinner(props) {
  const ref = useRef();
  useFrame((state, delta) => { ref.current.rotation.y += delta; }); // mutate refs, never setState here
  return (
    <mesh ref={ref} {...props} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4488ff" roughness={0.3} />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [3, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 7]} intensity={2} castShadow />
      <Spinner position={[0, 0.5, 0]} />
      <Environment preset="city" />
      <OrbitControls enableDamping />
    </Canvas>
  );
}
```

- Lowercase JSX elements = any Three class, auto-discovered (`<mesh>`, `<pointLight>`, `<torusKnotGeometry>`). Constructor args go in `args={[...]}` — **changing `args` reconstructs the object**.
- Props set properties: `position={[x,y,z]}`, `rotation={[rx,ry,rz]}`, `scale={2}`. Dashed paths pierce nesting: `rotation-x={0.5}`, `material-color="red"`, `shadow-mapSize={[2048, 2048]}` (on a light: `castShadow shadow-camera-far={50}`).
- `<Canvas>` good defaults: sRGB output, ACES tone mapping, antialias, DPR `[1, 2]`, a default PerspectiveCamera. Configure via `gl={{ ... }}`, `camera={{ ... }}`, `dpr`, `shadows`, `flat` (disables tone mapping), `orthographic`.
- **R3F disposes objects declared in JSX automatically on unmount.** Don't double-dispose; DO dispose things you create imperatively outside JSX.
- Custom/addon classes need registration: `extend({ OrbitControls })` then `<orbitControls args={[camera, gl.domElement]} />` — or just use drei's wrappers.
- Everything inside `<Canvas>` is inside the R3F reconciler: no DOM elements there (use drei `<Html>`); hooks like `useFrame`/`useThree` only work in components under `<Canvas>`.

## The three hooks

- `useThree()` → `{ scene, camera, gl (renderer), size, viewport, pointer, raycaster, clock, invalidate }`. Subscribe narrowly: `const camera = useThree(s => s.camera)`.
- `useFrame((state, delta) => {})` — per-frame callback. Order with second arg `useFrame(cb, 1)` (positive after render... actually: numbers order callbacks; using any index means YOU take over rendering — `state.gl.render(state.scene, state.camera)`).
- `useLoader(GLTFLoader, url, (loader) => loader.setDRACOLoader(draco))` — suspends; cache keyed by url. Wrap consumers in `<Suspense fallback={...}>`.

## Golden rules (R3F-specific performance)

1. **Never `setState` in `useFrame`.** Mutate refs. If UI must reflect 3D state, throttle or use a store (zustand) with transient subscribe.
2. **Don't create objects in render:** `<mesh position={new THREE.Vector3()}>` allocates every render → arrays/scalars in props, `useMemo` for geometries/materials/vectors you build manually.
3. **Reuse geometries/materials** across many meshes: create once (`useMemo` or module scope, or drei `<Instances>`).
4. `frameloop="demand"` on `<Canvas>` for static viewers + `invalidate()` to request frames; `frameloop="never"` + manual `advance()` for full control.
5. Big lists → `<Instances>`/`<Merged>` (drei) or `<instancedMesh>` — same draw-call rules as vanilla.
6. React state changes re-render components but NOT the canvas per se; still, keep fast-changing values (scroll, pointer) out of React state — read them in `useFrame`.
7. `<AdaptiveDpr>` / `PerformanceMonitor` (drei) to degrade quality under load.

## drei — use it before writing your own

Most-used helpers:
- **Staging**: `<Environment preset="studio|city|sunset" />` (or `files="x.hdr"`, `background`), `<ContactShadows />`, `<AccumulativeShadows>`, `<Sky />`, `<Stars />`, `<Stage>` (auto light+center), `<Center>`, `<Bounds fit>` (auto-zoom).
- **Controls/camera**: `<OrbitControls makeDefault />`, `<CameraControls />` (smooth programmatic moves), `<PerspectiveCamera makeDefault position={...} />`, `<ScrollControls>`+`useScroll` (scrollytelling).
- **Loading**: `useGLTF(url)` (DRACO-ready; `useGLTF.preload(url)`), `useTexture`, `useProgress` + `<Loader />` (loading UI), `<Preload all />`.
- **Text/UI**: `<Text>` (troika SDF text — crisp at any zoom), `<Text3D>`, `<Html>` (DOM anchored to 3D), `<Billboard>`.
- **Perf**: `<Instances>/<Instance>`, `<Detailed>` (LOD), `<BakeShadows />`, `<AdaptiveDpr pixelated />`, `<PerformanceMonitor>`, `<Bvh>` (three-mesh-bvh raycast accel).
- **Effects-ish**: `<MeshTransmissionMaterial>` (fancy glass), `<MeshReflectorMaterial>` (reflective floors), `<Outlines>`, `<Float>`, `<SoftShadows />`.
- `useHelper(ref, DirectionalLightHelper)` for debugging.

The `gltfjsx` CLI (`npx gltfjsx model.glb --transform`) converts a GLB into a typed JSX component with named nodes — the best way to work with authored models in R3F (also runs gltf-transform optimization with `--transform`).

## Events (built-in raycasting)

```jsx
<mesh
  onClick={(e) => { e.stopPropagation(); setActive(!active); }}
  onPointerOver={(e) => setHover(true)}
  onPointerOut={() => setHover(false)}
/>
```

Pointer events with `intersection` data (`e.point`, `e.distance`, `e.object`). `e.stopPropagation()` stops going through to objects behind. Set `document.body.style.cursor` in over/out for affordance. For heavy scenes wrap in drei `<Bvh>`.

## Post-processing in R3F

`@react-three/postprocessing` (wraps pmndrs postprocessing — merged passes, fast):

```jsx
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
<EffectComposer>
  <Bloom intensity={0.7} luminanceThreshold={0.9} mipmapBlur />
  <Vignette darkness={0.6} />
</EffectComposer>
```

## Ecosystem quick map (pmndrs)

- `@react-three/drei` — helpers (above)
- `@react-three/postprocessing` — effects
- `@react-three/rapier` — physics (Rapier; current recommendation over cannon)
- `@react-three/xr` — WebXR (VR/AR)
- `@react-three/csg` — boolean geometry ops
- `zustand` — state (transient updates pair perfectly with useFrame)
- `leva` — tweak-panel GUI for props
- `maath` — math helpers (damping, easing, random distributions)

## v9 / React 19 notes

- Requires React 19 (v9.x supports 19.0–19.2). With React 18 stay on R3F v8 + drei v9.
- Types are dynamically mapped: `ThreeElements['mesh']` replaces removed `MeshProps`; augment `ThreeElements` for `extend()`-ed classes.
- StrictMode double-invokes effects — R3F v9 handles suspense/attach cleanup correctly now, but your own imperative side effects must be idempotent with cleanup.
- Next.js: R3F components are client components (`'use client'`). Dynamic-import the canvas with `ssr: false` if three code touches `window` at module scope. Keep `three` in `transpilePackages` only if the bundler complains.
- WebGPU in R3F: supported — pass `gl={async (props) => { const r = new THREE.WebGPURenderer(props); await r.init(); return r; }}` with `three/webgpu` imports (check current R3F docs for the exact prop shape in your version).

## Vanilla↔R3F translation

Any vanilla snippet translates: constructor args → `args`, properties → props, `scene.add` → JSX nesting, render-loop code → `useFrame`, load-then-use → `useLoader`/Suspense, dispose → automatic for JSX-declared objects. When a feature has no drei wrapper, drop to imperative Three inside `useEffect`/`useMemo` with refs — it's all the same objects underneath.
