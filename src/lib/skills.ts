/*
 * Rune — data layer.
 *
 * The real catalog. Each entry points at an actual skill whose source lives in
 * `skills/<slug>/` at the repo root (SKILL.md + references/, the open Agent
 * Skills format read by Claude Code and Codex). The site reads only from the
 * exported helpers below, so wiring this to a CMS/API later is a local change.
 */

export const CATEGORIES = [
  "Engineering",
  "Games",
  "Writing",
  "Data",
  "Design",
  "Testing",
  "Ops",
  "Productivity",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Agents each rune is built and tested for. Nothing else is claimed. */
export const AGENTS = ["Claude Code", "Codex"] as const;
export type Agent = (typeof AGENTS)[number];

export type Skill = {
  slug: string;
  name: string;
  tagline: string;
  category: Category;
  tags: string[];
  version: string;
  updated: string;
  agents: Agent[];
  /** Where the skill source lives in the repo. */
  sourcePath: string;
  /** One or two paragraphs shown on the detail page. */
  overview: string;
  /** Bullet list of what the skill grants. */
  capabilities: string[];
  /** An example prompt the user would give once the rune is installed. */
  usagePrompt: string;
};

/** Rune is open source — every rune's files are readable before installing. */
export const REPO_URL = "https://github.com/EijunnN/rune";

/** Deep link to a rune's source directory on GitHub. */
export function skillSourceUrl(skill: Pick<Skill, "sourcePath">) {
  return `${REPO_URL}/tree/main/${skill.sourcePath}`;
}

/** The package/bin name. Runes install with `<runner> rune-add <slug>` — no global install. */
export const CLI = "rune-add";

/** Package runners users can pick from. `npx` is the safe default (ships with npm). */
export const RUNNERS = [
  { id: "npx", label: "npx", prefix: "npx" },
  { id: "bunx", label: "bunx", prefix: "bunx" },
  { id: "pnpm", label: "pnpm dlx", prefix: "pnpm dlx" },
] as const;

export type Runner = (typeof RUNNERS)[number];

export function installCommand(
  slug: string,
  prefix: string = RUNNERS[0].prefix,
) {
  return `${prefix} ${CLI} ${slug}`;
}

const SKILLS: Skill[] = [
  {
    slug: "typescript-mastery",
    name: "TypeScript Mastery",
    tagline:
      "The complete TypeScript doctrine — strictness, narrowing, generics, type-level craft, runtime boundaries — in one rune.",
    category: "Engineering",
    tags: ["typescript", "types", "generics", "zod", "tsconfig"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/typescript-mastery",
    overview:
      "TypeScript Mastery loads a complete typing doctrine into your agent: types are sets, the compiler is a prover, and every bad type traces to lying to it, withholding evidence, or proving in the wrong place. The core file carries fifteen non-negotiables and two decision frameworks (any/unknown/never/assertion, and where a type should live); eight reference files go deep on tsconfig and module resolution, narrowing and control flow, generics that pay rent, type-level programming, runtime validation at boundaries, everyday type design, declarations and publishing, and decoding compiler errors — loaded only when the task needs them, so the rune stays light in context.",
    capabilities: [
      "Version- and config-aware from the first line: reads tsconfig strictness before advising, knows erasable-syntax runtimes",
      "The strict baseline plus the flags worth adding: noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax",
      "Narrowing doctrine: discriminated unions, enforced exhaustiveness, and the six walls where control flow gives up",
      "Generics discipline: the parameter-appears-twice rule, inference-first design, NoInfer and const type params",
      "Type-level programming with a conscience: conditional/mapped/template-literal types, named and tested, derived from values when possible",
      "Parse-don't-assert at every boundary: zod schemas, branded identifiers, errors as unknown, Result unions for expected failures",
      "interface-vs-type settled, satisfies over annotation for const data, enums replaced with as-const objects",
      "Publishing types that survive contact: exports maps validated with attw, module augmentation, JS→TS migration ratchet",
      "Compiler-error decoder ring and tsc performance triage: from 'not assignable' archaeology to instantiation-depth blowups",
    ],
    usagePrompt:
      "Review this module the typescript-mastery way — hunt the lies (as, any, !), fix the boundaries with parsed types, and make every switch exhaustive.",
  },
  {
    slug: "rust-mastery",
    name: "Rust Mastery",
    tagline:
      "Expert Rust where speed and safety reinforce each other — ownership, allocation discipline, profiling, fearless concurrency, disciplined unsafe.",
    category: "Engineering",
    tags: ["rust", "performance", "async", "unsafe", "cargo"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/rust-mastery",
    overview:
      "Rust Mastery loads Rust's founding bet into your agent: the safe code and the fast code are the same code. The doctrine has two reinforcing halves — don't fight the borrow checker, redesign until it agrees; and measure, then remove work. The core file carries fifteen non-negotiables and two decision frameworks (the ownership ladder and performance triage); nine reference files go deep on ownership and borrowing, type-driven design, error handling, the full optimization toolbox (profiles, allocation discipline, layout, SIMD, rayon), concurrency and async/tokio, disciplined unsafe with Miri, crate API design, testing, and decoding compiler errors — loaded only when the task needs them.",
    capabilities: [
      "The ownership ladder: restructure > borrow > deliberate clone > Rc/Arc > unsafe — with the fight catalog for each borrow-checker classic",
      "Performance triage in order of leverage: release profiles, algorithms, allocations, copies, contention, rayon, micro",
      "Allocation discipline: with_capacity, buffer reuse, iterator fusion, arenas, small-vec — the everyday wins",
      "Profiling as doctrine: criterion, flamegraphs, dhat, hyperfine — no optimization without a before/after in --release",
      "Type-driven design: illegal states unrepresentable, newtypes, typestate, generics vs dyn dispatch decided by data",
      "Errors as API: thiserror for libraries, anyhow for apps, panic policy, matchable variants",
      "Fearless concurrency with discipline: locks never held across .await, cancellation-aware async, rayon vs tokio by workload",
      "unsafe as a contract: SAFETY comments, safe wrappers, the UB catalog, Miri and fuzzing in CI, FFI mechanics",
      "Crate craft: API signatures that borrow, additive features, semver discipline, doc tests on every public item",
      "Compiler-error decoder ring: E0382/E0502/'not Send' surgically fixed, plus build-speed and footgun checklists",
    ],
    usagePrompt:
      "Profile and fix this hot path the rust-mastery way — release build, kill the allocations, justify every clone, and prove the wins with criterion.",
  },
  {
    slug: "react-mastery",
    name: "React Mastery",
    tagline:
      "The complete React doctrine — architecture, state, effects, performance, testing — in one rune.",
    category: "Engineering",
    tags: ["react", "performance", "typescript", "testing", "a11y"],
    version: "1.0.0",
    updated: "Jul 1, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/react-mastery",
    overview:
      "React Mastery loads a complete engineering doctrine for modern React (19+, Compiler era) into your agent: how to structure components, where state belongs, when an effect is justified, how to hunt re-renders and slow interactions, and how to ship accessible, tested UI. The core file carries fifteen non-negotiables and three decision frameworks; eight reference files go deep on architecture, state, effects, performance, React 19 APIs, TypeScript, testing, and accessibility — loaded only when the task needs them, so the rune stays light in context.",
    capabilities: [
      "Decision frameworks for state placement, effect necessity, and performance triage",
      "React Compiler–era performance doctrine: profile first, compose before memoizing",
      "React 19/19.2 APIs used right: actions, useActionState, useOptimistic, use(), Activity, useEffectEvent",
      "Server Components and server-action security rules — authenticate and validate every action",
      "TypeScript patterns: discriminated unions, generic components, precisely typed hooks",
      "Testing Library doctrine: behavior over implementation, roles-first queries, MSW at the network edge",
      "Accessibility built in: semantics first, focus management, keyboard support",
    ],
    usagePrompt:
      "Audit this component for re-render churn and effect misuse, then refactor it the way react-mastery prescribes.",
  },
  {
    slug: "web-security",
    name: "Web Security",
    tagline:
      "Defensive security doctrine — auth, injection, SSRF, secrets — for code that survives contact with the internet.",
    category: "Engineering",
    tags: ["security", "auth", "owasp", "xss", "secrets"],
    version: "1.0.0",
    updated: "Jul 1, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/web-security",
    overview:
      "Web Security loads a defensive engineering doctrine into your agent: all input is hostile until proven otherwise, and every check that matters runs on the server. The core file carries fifteen non-negotiables, an untrusted-input pipeline, and a source-to-sink review method; eight reference files go deep on authentication and sessions, authorization and IDOR, injection, SSRF/CSRF/uploads, secrets and crypto, security headers and CSP, supply-chain hygiene, and security testing — loaded only when the task needs them.",
    capabilities: [
      "Resource-level authorization doctrine: IDOR by default assumption, tenant scoping, mass-assignment guards",
      "Auth done right: argon2id/bcrypt, session fixation, JWT pitfalls, reset flows without enumeration",
      "Injection defense across every interpreter: SQL, XSS in React's escape hatches, shell, paths, prototypes",
      "SSRF, CSRF, CORS, uploads, and redirects — the server-side traps, with layered fixes",
      "Secrets that stay secret: bundle rules, hashed tokens at rest, vetted crypto choices, log redaction",
      "Nonce-based CSP and the full security-header baseline",
      "Supply-chain discipline: lockfiles, install-script gating, pinned CI actions, dependency vetting",
      "A source-to-sink review method with grep-able hotspots and authorization tests that pay rent",
    ],
    usagePrompt:
      "Security-review this PR the way web-security prescribes — trace every input to its sink and check authorization on each route.",
  },
  {
    slug: "frontend-aesthetics",
    name: "Frontend Aesthetics",
    tagline:
      "Design taste as doctrine — direction, typography, color, atmosphere, and the anti-AI-slop catalog.",
    category: "Design",
    tags: ["design", "typography", "color", "css", "motion"],
    version: "1.0.0",
    updated: "Jul 1, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/frontend-aesthetics",
    overview:
      "Frontend Aesthetics loads design judgment into your agent — the difference between interfaces that look deliberately designed and the statistical average that reads as AI-generated. The core file carries the prime directive (commit to a named direction), fifteen non-negotiables, and a triage order for generic-looking UI; eight reference files go deep on aesthetic direction, typography, color systems, layout and composition, atmosphere and texture, motion choreography, the 27-entry slop catalog with antidotes, and the craft-details finishing pass — loaded only when the task needs them.",
    capabilities: [
      "The naming ritual: commit to one aesthetic direction and derive every choice from it",
      "Typography doctrine: characterful pairings, fluid scales, tracking/leading tuning — and the banned-defaults list, including second-order slop",
      "Color systems in OKLCH: tinted neutrals, scarce accents, dark themes designed rather than inverted",
      "Composition beyond centered-everything: asymmetry, grid-breaks, whitespace as material",
      "Atmosphere: grain, patterns, shadow languages, borders as protagonists",
      "Motion choreography: one orchestrated entrance over twenty hover effects, easing as personality",
      "The 27-entry anti-AI-slop catalog — every tell, every antidote, swept before shipping",
      "The finishing pass: focus and selection theming, designed empty/loading/error states, favicon/OG, optical alignment",
    ],
    usagePrompt:
      "Restyle this landing page the frontend-aesthetics way — name a direction, retheme the tokens, and sweep the slop catalog.",
  },
  {
    slug: "game-design",
    name: "Game Design",
    tagline:
      "Design judgment for games — core loops, meaningful choices, balance, difficulty, juice — engine-agnostic doctrine.",
    category: "Games",
    tags: ["game-design", "balance", "game-feel", "progression", "playtesting"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/game-design",
    overview:
      "Game Design loads a conviction into your agent: a game is a machine that generates interesting decisions wrapped in feedback that feels good — and when it's boring, the loop is broken somewhere specific, not lacking features. The core file carries fifteen non-negotiables and two decision frameworks (is this mechanic worth adding, and the boring/too-hard triage); six reference files go deep on core loops and session shapes, mechanics and depth-versus-complexity, balance and economies, difficulty curves and progression, onboarding that teaches through play, game feel and the juice catalog, and playtesting with scope discipline. Engine-agnostic: it pairs with web-games and threejs for implementation.",
    capabilities: [
      "The find-the-fun gate: core verb polished naked before any meta — meta amplifies fun, never creates it",
      "Loop-layer analysis: moment, encounter, session, meta — and which one is actually broken when players say 'boring'",
      "Meaningful-choice anatomy: trade-offs, degenerate forms (calculations, blind picks, false choices), depth over complexity",
      "Economy architecture: sources, sinks, curves, inflation control, pity timers, input-vs-output randomness",
      "Difficulty as legibility first: telegraph audits, retry-loop length, teach-test-twist-rest rhythm",
      "Onboarding doctrine: players don't read — the teaching-tool hierarchy from level design down to popups",
      "The juice catalog as information theory: hitstop, screenshake, squash-and-stretch — proportional, accessible, budgeted",
      "Playtest protocol: silent observation, behavior over opinions, the two-strike rule for killing darlings",
      "Scope as a design skill: vertical slices, cut order, the game-jam scope masterclass",
    ],
    usagePrompt:
      "Diagnose my game the game-design way — find which loop layer is broken, audit the choices for trade-offs, and tell me what to cut.",
  },
  {
    slug: "web-games",
    name: "Web Games",
    tagline:
      "Browser games done right — fixed-timestep loops, Phaser, canvas, collision, input feel, juice, and shipping to itch.",
    category: "Games",
    tags: ["phaser", "canvas", "html5-games", "gamedev", "webaudio"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/web-games",
    overview:
      "Web Games loads the two disciplines of browser game engineering into your agent: game architecture (fixed-timestep loops, scenes, entities, collision) and web-specific survival (GC discipline, audio unlock, tab lifecycle, load budgets). The core file carries fifteen non-negotiables and two decision frameworks (how much physics engine you need, and the stutter triage); ten reference files go deep on the canonical game loop, Phaser, raw Canvas 2D rendering, physics and collision, input with forgiveness systems, tilemaps via Tiled/LDtk, WebAudio, the juice catalog implemented in code, performance and asset pipelines, and shipping with versioned saves. It implements what the game-design rune prescribes.",
    capabilities: [
      "The canonical loop: fixed timestep, clamped delta, interpolated render — identical gameplay at 60 and 144Hz",
      "Stack sizing: vanilla canvas for jams, Phaser for games, hand-rolled AABB before physics engines",
      "Phaser doctrine: parallel UI scenes, arcade physics feel kit, pooling groups, and the bug bestiary",
      "Collision craft: axis-separated resolution, spatial hashing, tunneling fixes, hitbox-hurtbox asymmetry",
      "Input as engineering: device-to-action mapping, buffering and coyote time as code, gamepad and touch done natively",
      "Tilemap pipelines: LDtk/Tiled as the source of truth, chunked pre-rendering, tile-grid broadphase for free",
      "WebAudio without tears: the unlock gesture, a real mixer in 100 lines, vertical music layering, pitch-varied SFX",
      "The juice catalog in code: trauma-model screenshake, hitstop, tweens with the five-easing kit, pooled particles",
      "GC discipline and pooling: zero per-frame allocations, verified in the heap timeline",
      "Shipping: versioned saves with migrations, the visibility trio, itch.io/Poki/Steam-via-Tauri paths",
    ],
    usagePrompt:
      "Build this platformer the web-games way — fixed timestep, buffered jumps with coyote time, pooled particles, and saves that survive updates.",
  },
  {
    slug: "bevy-mastery",
    name: "Bevy Mastery",
    tagline:
      "The Rust ECS engine, mastered — world-as-database thinking, plugins, schedules, Avian physics, and surviving Bevy's release cadence.",
    category: "Games",
    tags: ["bevy", "rust", "ecs", "gamedev", "wasm"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/bevy-mastery",
    overview:
      "Bevy Mastery loads the ECS mental model into your agent: the world is a database, systems are queries the scheduler parallelizes wherever data access allows, and both of Bevy's gifts — Rust's guarantees and automatic parallelism — are bought by declaring data access honestly. Version awareness is doctrine, not a tip: Bevy breaks APIs every release, so the rune teaches what survives (the model, scheduling, architecture) and the discipline of migration guides. Fifteen non-negotiables and two decision frameworks (where does this logic live, and component granularity); nine references cover ECS fundamentals, app architecture with plugins and states, events and observers, transforms and rendering, assets and scenes, input and UI, gameplay patterns with Avian physics, performance on both clocks (frame time and compile time), and an error bestiary with the ecosystem crate map.",
    capabilities: [
      "Version-survival discipline: check Cargo.toml first, migration guides as ritual, ecosystem compat tables before any bump",
      "ECS doctrine: components as data, markers everywhere, state-as-component, the archetype cost model",
      "Query craft: tight access for parallelism, deferred-command boundaries, the B0001 resolution ladder",
      "Architecture that scales: one plugin per feature, set spines (Intents→Resolve→Cleanup), states with symmetric cleanup",
      "The reactive palette: buffered events vs observers vs change detection — chosen by timing, not habit",
      "Gameplay in FixedUpdate, presentation in Update — with intent components bridging the two clocks",
      "Avian physics integration, character controllers with buffering and coyote time, timers as components",
      "Headless testing as a superpower: MinimalPlugins + gameplay plugins asserted in CI without a window",
      "Both performance fights won: dynamic_linking dev loops in seconds, Tracy-profiled schedules in release",
      "WASM/itch builds with the web platform's rules, and the honest Bevy-vs-web-stack sizing call",
    ],
    usagePrompt:
      "Restructure this main.rs the bevy-mastery way — feature plugins, a set spine in FixedUpdate, states with scoped cleanup, and intents bridging input to simulation.",
  },
  {
    slug: "multiplayer-netcode",
    name: "Multiplayer Netcode",
    tagline:
      "The art of hiding the speed of light — rollback, prediction, lag compensation, and servers that trust nobody.",
    category: "Games",
    tags: ["netcode", "multiplayer", "rollback", "webrtc", "websocket"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/multiplayer-netcode",
    overview:
      "Multiplayer Netcode loads the distributed-systems truth of networked games into your agent: every machine holds a different, delayed, partially-wrong view of the world, and netcode is choosing deliberately where to put the latency and who resolves disputes. Fifteen non-negotiables and two decision frameworks (choose the model by genre, and the it-feels-bad-online triage); eight references cover architecture models and authority topologies, client prediction and reconciliation, entity interpolation and lag compensation, rollback and the determinism discipline, delta compression and interest management, web transports (WebSocket/WebRTC/WebTransport), game server architecture with layered anti-cheat, and testing under simulated hostile networks. Engine-agnostic doctrine with web (Colyseus/geckos) and Rust/Bevy (lightyear/ggrs/renet) stack notes throughout.",
    capabilities: [
      "Model selection as the first decision: rollback vs prediction vs lockstep vs relaxed sync, chosen by the genre's latency-tolerance profile",
      "Authority doctrine: one owner per fact, clients send inputs never results — cheats killed by construction",
      "Client prediction with reconciliation: shared sim code, input histories, redundant sends, smoothed corrections",
      "The three-time-domains picture: server present, predicted present, interpolated past — and which queries live where",
      "Lag compensation with bounded rewind: favor-the-shooter as a policy with limits, not an accident",
      "Determinism as engineering: seeded sim-owned RNG, iteration-order discipline, checksums, replay-driven desync hunting",
      "Bandwidth's four levers: acked deltas, quantization, send-rate priority, interest management that doubles as anti-wallhack",
      "Web transport truth: WebSocket's head-of-line ceiling, WebRTC DataChannels, WebTransport, and when each ships",
      "Server anatomy: room-based tick loops, headless CI bot matches, layered security sized to stakes",
      "The condition simulator doctrine: latency/jitter/loss sliders from week one — localhost-only netcode hasn't run",
    ],
    usagePrompt:
      "Redesign my socket.io position-broadcast game the multiplayer-netcode way — server authority, inputs not results, prediction plus interpolation, and a bandwidth budget that survives ten players.",
  },
  {
    slug: "testing-doctrine",
    name: "Testing Doctrine",
    tagline:
      "Tests that let you change code without fear — strategy, mocking discipline, Playwright, and the war on flakes.",
    category: "Testing",
    tags: ["testing", "vitest", "playwright", "msw", "tdd"],
    version: "1.0.0",
    updated: "Jul 2, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/testing-doctrine",
    overview:
      "Testing Doctrine loads one conviction into your agent: a test suite exists to let you change code with confidence, so every test is judged by the promise it protects — behavior through a public contract, never implementation detail. The core file carries fifteen non-negotiables and two decision frameworks (which level catches this failure, and to-mock-or-not); eight reference files go deep on test strategy and coverage policy, unit tests that survive refactors, mocking discipline, integration and API testing, Playwright end-to-end, UI component testing, the flaky-test playbook, and TDD workflow with CI pipeline shape — loaded only when the task needs them.",
    capabilities: [
      "Fits the codebase first: detects the runner and conventions, extends what exists, never introduces a parallel stack",
      "Level-selection doctrine: start from the failure you fear, pick the lowest level that catches it honestly — integration as the workhorse",
      "The mocking ladder: real thing > hand-written fake > MSW at the wire > vi.mock as last resort — and never mock what you own",
      "Unit tests as executable spec: behavior names, builders over fixtures, table-driven cases, snapshot discipline",
      "API testing through the front door: app factories, real test databases via containers, tenant-scoping security tests",
      "Playwright doctrine: role-first locators, auto-waiting over sleeps, auth state reuse, data setup via API not UI",
      "The flaky-test playbook: eight root-cause families, quarantine policy, retries as telemetry never treatment",
      "Coverage as flashlight not target — plus mutation testing where honesty matters",
      "TDD where it pays, reproduce-first on every bug fix, and the cheapest-first CI ladder with sharding",
    ],
    usagePrompt:
      "Audit this test file the testing-doctrine way — find the implementation coupling, fix the mocking, and make every name read as a spec.",
  },
  {
    slug: "threejs",
    name: "Three.js Mastery",
    tagline:
      "Complete 3D doctrine — scenes, PBR, glTF, shaders (GLSL + TSL), WebGPU, and react-three-fiber — in one rune.",
    category: "Engineering",
    tags: ["threejs", "webgl", "webgpu", "shaders", "r3f", "3d"],
    version: "1.0.0",
    updated: "Jul 1, 2026",
    agents: ["Claude Code", "Codex"],
    sourcePath: "skills/threejs",
    overview:
      "Three.js Mastery loads a complete 3D graphics doctrine into your agent: diagnose every scene through the scene graph, the camera, materials-and-light, and the frame loop — in that order. The core file carries the canonical renderer setup, the WebGL-versus-WebGPU decision table, and ten non-negotiables (delta time, color spaces, disposal, depth precision); eleven reference files go deep on fundamentals, geometries and materials, lights/shadows/IBL, the glTF pipeline, the animation system, custom shaders in both GLSL and TSL, post-processing on both renderers, games and interaction, performance, react-three-fiber v9, and a symptom-to-fix troubleshooting table — loaded only when the task needs them, so the rune stays light in context.",
    capabilities: [
      "Version-aware from the first line: checks the installed release and heeds Three.js' monthly breaking changes",
      "The canonical setup that never black-screens: camera placement, tone mapping, capped DPR, resize, delta-scaled loop",
      "PBR that actually looks good: environment-map IBL doctrine, physical light units, material decision table",
      "The glTF pipeline end to end: DRACO/KTX2/Meshopt loading, post-load housekeeping, gltf-transform optimization",
      "Shadow artifacts decoded: acne, peter-panning, blocky edges — each with its exact fix",
      "Custom shaders on both stacks: GLSL ShaderMaterial and onBeforeCompile for WebGL, TSL node materials and compute for WebGPU",
      "Draw-call discipline: InstancedMesh, BatchedMesh, merging, LOD — profile first via renderer.info",
      "Game-ready patterns: fixed-timestep loops, camera-relative movement, character controllers, third-person camera rigs, Rapier physics, positional audio",
      "react-three-fiber v9 golden rules: refs over state in useFrame, drei before DIY, automatic disposal semantics",
      "A symptom-to-cause troubleshooting table for the classics: black screen, invisible model, washed-out colors, z-fighting",
    ],
    usagePrompt:
      "Build a product viewer for this GLB the threejs way — studio IBL, soft contact shadow, capped DPR, and orbit controls that can't go under the floor.",
  },
];

export function getAllSkills(): Skill[] {
  return SKILLS;
}

export function getSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}
