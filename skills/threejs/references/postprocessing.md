# Post-processing

Render the scene to a texture, run screen-space effects, output to canvas. Three ecosystems — pick the one matching your renderer:

| Renderer | Option | When |
|---|---|---|
| WebGL | `EffectComposer` (three addons) | classic, most examples use it |
| WebGL | `postprocessing` npm package (pmndrs) | **better**: merges effects into fewer passes (faster), nicer API; what R3F's `@react-three/postprocessing` wraps |
| WebGPU | `THREE.PostProcessing` + TSL nodes | the only option for WebGPURenderer |

Post-processing costs fill rate — it re-renders the full screen per pass. On mobile, prefer zero or one merged pass.

## EffectComposer (WebGL addons)

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight),
  0.6,   // strength
  0.4,   // radius
  0.85,  // threshold — with tone mapping, only emissive/HDR > threshold blooms
));
composer.addPass(new OutputPass());     // REQUIRED last: applies tone mapping + sRGB conversion

// loop: composer.render();            // INSTEAD of renderer.render
// resize: composer.setSize(w, h); composer.setPixelRatio(Math.min(devicePixelRatio, 2));
```

Critical details:
- **`OutputPass` must be the final pass.** The composer renders to linear HDR-ish buffers; without OutputPass the result is dark/washed (renderer's own conversion is bypassed when rendering to targets).
- Call `composer.render()` in place of `renderer.render()` — not both.
- Handle resize for the composer AND each pass that takes a resolution (bloom).
- Antialiasing: the built-in MSAA of the canvas doesn't apply to render targets. `EffectComposer` allocates a multisampled target on WebGL2 by default (`samples`), or append `SMAAPass` / FXAA `ShaderPass`.

Useful passes (all `three/addons/postprocessing/`): `UnrealBloomPass`, `SSAOPass`/`GTAOPass` (ambient occlusion), `SAOPass`, `BokehPass` (DOF), `OutlinePass` (selection glow), `SSRPass` (reflections), `FilmPass`, `GlitchPass`, `HalftonePass`, `AfterimagePass`, `LUTPass` (color grading with `.cube` files via `LUTCubeLoader`), `ShaderPass(anyShader)` for custom.

Custom fullscreen effect:

```js
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 1.2 } }, // tDiffuse = previous pass output
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStrength; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      gl_FragColor = vec4(c.rgb * smoothstep(0.8, 0.8 - uStrength * 0.5, d), c.a);
    }`,
};
composer.addPass(new ShaderPass(VignetteShader));
```

## pmndrs `postprocessing` (npm i postprocessing)

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing';
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 0.8 }), new VignetteEffect()));
// loop: composer.render(dt);
```

Effects declared together in one `EffectPass` compile into a single shader — significantly faster than chaining addon passes. Rich effect set: `SMAAEffect`, `DepthOfFieldEffect`, `SSAOEffect` (via realism-effects), `ChromaticAberrationEffect`, `NoiseEffect`, `GodRaysEffect`, `ToneMappingEffect`. Docs: https://pmndrs.github.io/postprocessing/

## WebGPU: THREE.PostProcessing + TSL

```js
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

const postProcessing = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);              // has .getTextureNode(), depth, velocity, etc.
const scenePassColor = scenePass.getTextureNode();
postProcessing.outputNode = scenePassColor.add(bloom(scenePassColor, 0.6, 0.3, 0.85));

// loop: postProcessing.render();                   // instead of renderer.render
```

- Effects are TSL nodes in `three/addons/tsl/display/`: `BloomNode`, `GTAONode` (AO), `DepthOfFieldNode`, `SSRNode`, `SMAANode`/`TRAAPassNode` (AA), `FXAANode`, `film`, `dotScreen`, `rgbShift`, `Lut3DNode`, `outline`, and more — check the folder in your installed version, plus `webgpu_postprocessing_*` official examples for exact wiring (APIs still move).
- Tone mapping + output color space are applied by `PostProcessing` at the end automatically (`postProcessing.outputColorTransform = true` default) — don't add your own.
- Compose with normal TSL math: `outputNode = a.add(b).mul(c)`; custom effects are just functions of texture nodes.

## Selective bloom (asked constantly)

Simplest robust approach with tone mapping: keep `UnrealBloomPass`/`BloomEffect` threshold ≈ 1 and give glowing objects `emissiveIntensity > 1` (HDR) while everything else stays below threshold. True selective bloom (layers + double render) is complex and rarely worth it; in `postprocessing` use `selection` on the bloom effect; in WebGPU use MRT with an emissive target (see `webgpu_postprocessing_bloom_selective` example... verify name in your version).

## Performance & quality notes

- Order matters: AA last-ish (after color grading), AO before lighting-dependent effects, bloom near the end but before vignette/grain.
- Each addon pass = fullscreen render. 4+ chained addon passes on mobile will tank FPS; pmndrs postprocessing merging or a single custom übershader pass fixes this.
- Half-resolution where possible (bloom internally downsamples already).
- DOF and SSR are the most expensive common effects; SSAO close behind. Question whether the design really needs them.
- If the screen is black after adding the composer: you forgot `OutputPass`, or you're still calling `renderer.render` after `composer.render`, or a pass's `renderToScreen` handling changed — put OutputPass last and render only via composer.
