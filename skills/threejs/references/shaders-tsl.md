# Custom Shaders: GLSL (WebGL) and TSL (WebGPU)

Decision:
- `WebGLRenderer` + fully custom look → `ShaderMaterial` (GLSL).
- `WebGLRenderer` + tweak a built-in material → `onBeforeCompile` or `three-custom-shader-material` (npm).
- `WebGPURenderer` → TSL node materials, always. GLSL `ShaderMaterial` does not work there. TSL also transpiles to GLSL, so TSL code runs on the WebGL fallback too — for new projects TSL is the future-proof choice.

## GLSL: ShaderMaterial

```js
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime:  { value: 0 },
    uColor: { value: new THREE.Color('#ff6030') },
    uMap:   { value: texture },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 p = position;
      p.z += sin(p.x * 4.0 + uTime) * 0.1;                 // vertex displacement
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      float light = dot(vNormal, normalize(vec3(1.0, 1.0, 0.5))) * 0.5 + 0.5; // half-lambert
      vec3 col = texture2D(uMap, vUv).rgb * uColor * light;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>   // convert to output color space — else output looks too dark
      // add <tonemapping_fragment> before it if you want tone mapping applied
    }
  `,
  transparent: false,
  side: THREE.FrontSide,
});

// loop: material.uniforms.uTime.value = clock.getElapsedTime();
```

What Three injects for you (with `ShaderMaterial`; `RawShaderMaterial` injects nothing):
- Attributes: `position`, `normal`, `uv` (+ your custom `geometry.setAttribute` ones — declare them yourself: `attribute float aScale;`).
- Uniforms: `projectionMatrix`, `modelViewMatrix`, `modelMatrix`, `viewMatrix`, `normalMatrix`, `cameraPosition`.
- Precision qualifiers and `#version`. GLSL3: set `glslVersion: THREE.GLSL3` and use `out vec4 fragColor` instead of `gl_FragColor`.

Rules of thumb:
- Uniforms update per frame cheaply; **never** rebuild the material or edit shader strings at runtime (recompiles). Branch-like variation → uniforms or `defines` (`material.defines.USE_FOO = ''` + `needsUpdate = true` for compile-time switches).
- Varyings interpolate vertex→fragment.
- Custom per-vertex data → geometry attributes (e.g. per-particle `aScale`, `aRandom`).
- Lights: ShaderMaterial doesn't get scene lighting for free. Set `lights: true` and merge `THREE.UniformsLib.lights` + use the light chunks — painful; if you need lit + custom, prefer `onBeforeCompile`/CSM below.
- World position in fragment: pass `varying vec3 vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz`.
- Screen UV: `gl_FragCoord.xy / uResolution`.
- Noise: no built-in — paste in classic `snoise`/`cnoise` (webgl-noise) or sample a noise texture.

## Extending built-in materials: onBeforeCompile

Patch `MeshStandardMaterial` (keeps PBR lighting/shadows) by string-replacing shader chunks:

```js
const mat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.y += sin(transformed.x * 3.0 + uTime) * 0.2;
    `);
  mat.userData.shader = shader;              // keep a ref to update uniforms later
};
// loop: mat.userData.shader && (mat.userData.shader.uniforms.uTime.value = t);
```

- Chunk source to know what to replace: `node_modules/three/src/renderers/shaders/ShaderChunk/`. Key hooks: `begin_vertex` (`transformed`), `beginnormal_vertex` (`objectNormal`), `map_fragment`/`color_fragment` (`diffuseColor`), `emissivemap_fragment`, `dithering_fragment` (end of frag).
- If two materials share `onBeforeCompile` with different code, set `mat.customProgramCacheKey = () => 'unique-key'`.
- The npm package `three-custom-shader-material` wraps this pattern ergonomically (also works in R3F).
- Depth: displaced vertices need matching `customDepthMaterial` for correct shadows.

## TSL — Three Shading Language (WebGPU renderer)

TSL builds shaders from JS-composable nodes; the renderer compiles to WGSL (WebGPU) or GLSL (WebGL fallback). All materials in `three/webgpu` accept node inputs.

```js
import * as THREE from 'three/webgpu';
import { uv, time, sin, positionLocal, texture, uniform, vec3, vec4, mix, Fn } from 'three/tsl';

const mat = new THREE.MeshStandardNodeMaterial();

// Fragment-stage: colorNode replaces the base color computation
const uTint = uniform(new THREE.Color('#ff6030'));   // .value settable at runtime, no recompile
mat.colorNode = mix(vec3(0.1), uTint, uv().y.add(sin(time).mul(0.2)));

// Vertex-stage: positionNode displaces geometry
mat.positionNode = positionLocal.add(vec3(0, sin(positionLocal.x.mul(4).add(time)).mul(0.1), 0));
```

Node material slots (most-used): `colorNode`, `positionNode`, `normalNode`, `emissiveNode`, `roughnessNode`, `metalnessNode`, `opacityNode`, `fragmentNode` (fully replace output), `outputNode`.

Core TSL vocabulary (all from `'three/tsl'`):
- Types/constructors: `float, vec2, vec3, vec4, color, int, bool, mat3, mat4`
- Inputs: `uv()`, `positionLocal/positionWorld/positionView`, `normalLocal/normalWorld/normalView`, `cameraPosition`, `screenUV`, `time` (seconds), `vertexColor()`, `attribute('aName', 'float')`, `modelWorldMatrix`
- Uniforms: `uniform(value)` — update via `.value`; `texture(tex, uvNode)`
- Math: chainable methods `.add .sub .mul .div .pow .abs .sin .cos .fract .floor .clamp .min .max .mix .smoothstep .dot .cross .normalize .length .negate .oneMinus()`, plus free functions of the same names
- Swizzles: `.x .xy .xyz .rgb` etc.
- Control flow: `If(cond, () => {...}).Else(...)`, `Loop(count, ({ i }) => {...})`; variables: `const v = vec3(0).toVar(); v.assign(...)`
- Functions: `const myFn = Fn(([a, b]) => a.mul(b).add(1)); myFn(x, y)`
- Utility noise (MaterialX port): `mx_noise_float(pos)`, `mx_fractal_noise_vec3(...)` from `'three/tsl'`
- Conditional per-stage: `varying(node)` to force vertex-stage computation, `.toVertexStage()`

TSL functions & docs: https://threejs.org/docs/pages/TSL.html and the wiki https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language — API still evolves; when in doubt, check `node_modules/three/src/nodes/` or webgpu_* examples for the installed version.

### Compute shaders (WebGPU superpower)

GPGPU particles without render-target ping-pong hacks:

```js
import { Fn, instancedArray, instanceIndex, hash, time, deltaTime } from 'three/tsl';

const count = 100_000;
const positions = instancedArray(count, 'vec3');   // storage buffer
const velocities = instancedArray(count, 'vec3');

const init = Fn(() => {
  positions.element(instanceIndex).assign(vec3(hash(instanceIndex), hash(instanceIndex.add(1)), 0));
})().compute(count);
await renderer.computeAsync(init);                  // run once

const update = Fn(() => {
  const p = positions.element(instanceIndex);
  p.addAssign(velocities.element(instanceIndex).mul(deltaTime));
})().compute(count);
// per frame: renderer.compute(update);

// Render them: sprite/points material reading the buffer
material.positionNode = positions.toAttribute();
```

Study `webgpu_compute_particles` and related official examples — the idioms there are current ground truth.

## Fullscreen shaders / shadertoy-style

- WebGL: a `PlaneGeometry(2,2)` + `ShaderMaterial` with `gl_Position = vec4(position.xy, 0.0, 1.0);` and an orthographic identity camera — or use post-processing passes (see postprocessing.md).
- Shadertoy ports: `iTime`→`uTime`, `iResolution`→`uResolution`, `fragCoord`→`gl_FragCoord.xy`, `mainImage(out fragColor, in fragCoord)`→`main()`. Shadertoy outputs linear-ish; you may need the colorspace include.

## Debugging shaders

- Black mesh → compile error: check console (Three logs full annotated source), typos in varying names (must match exactly both stages).
- Visualize intermediates: `gl_FragColor = vec4(vec3(value), 1.0);` — the printf of shaders.
- NaNs propagate as black/flicker: guard `pow`/`sqrt`/`normalize` of possibly-zero vectors.
- Spector.js browser extension captures a frame and shows every draw call + shader source.
- Precision issues on mobile: use `highp` for positions/time (`precision highp float;` is Three's default in fragment).
- Large `time` values lose float precision after hours — wrap phase with `fract`/modulo where possible.
