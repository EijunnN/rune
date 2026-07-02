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

/** The package/bin name. Runes install with `<runner> rune add <slug>` — no global install. */
export const CLI = "rune";

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
  return `${prefix} ${CLI} add ${slug}`;
}

const SKILLS: Skill[] = [
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
];

export function getAllSkills(): Skill[] {
  return SKILLS;
}

export function getSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}
