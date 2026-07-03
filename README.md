# Rune

**A curated library of agent skills — every one forged, end to end, by one hand.**

Rune is not an open marketplace. Each **rune** is a single skill in the open
Agent Skills format (`SKILL.md` + `references/`) that hands your agent a
capability it didn't have — a complete doctrine, not a snippet. Read exactly
what each rune grants before you install it; no surprises.

```bash
npx rune-add react-mastery
```

```
> resolve react-mastery ..................... found
> write .claude/skills/react-mastery ........ ok (9 files)
> done. reload your agent ................... ok
```

## The library

| Rune | Category | Grants |
| --- | --- | --- |
| [typescript-mastery](skills/typescript-mastery/SKILL.md) | Engineering | Strictness, narrowing, generics, type-level craft, runtime boundaries |
| [rust-mastery](skills/rust-mastery/SKILL.md) | Engineering | Ownership, allocation discipline, profiling, async/tokio, disciplined unsafe |
| [react-mastery](skills/react-mastery/SKILL.md) | Engineering | Architecture, state, effects, performance, React 19, testing, a11y |
| [web-security](skills/web-security/SKILL.md) | Engineering | Auth, authorization, injection, SSRF, secrets, headers, supply chain |
| [frontend-aesthetics](skills/frontend-aesthetics/SKILL.md) | Design | Direction, typography, color, atmosphere, motion, the anti-slop catalog |
| [testing-doctrine](skills/testing-doctrine/SKILL.md) | Testing | Strategy, mocking discipline, Playwright, flaky-test warfare, TDD |
| [game-design](skills/game-design/SKILL.md) | Games | Core loops, meaningful choices, balance, difficulty, juice — engine-agnostic |
| [web-games](skills/web-games/SKILL.md) | Games | Fixed-timestep loops, Phaser, canvas, collision, input feel, shipping |
| [bevy-mastery](skills/bevy-mastery/SKILL.md) | Games | ECS doctrine, plugins and schedules, Avian physics, WASM, release-cadence survival |
| [threejs](skills/threejs/SKILL.md) | Engineering | Scenes, PBR, glTF, GLSL + TSL shaders, WebGPU, react-three-fiber, games |

Every rune works with **Claude Code** and **Codex** — and any agent that reads
the Agent Skills format.

## Installing runes

No CLI to install; [`rune-add`](cli/) runs on demand with the package manager
you already have:

```bash
npx rune-add <slug>            # asks: which agent (Claude Code / Codex / both), which scope
npx rune-add <slug> --claude --codex --global   # or say it with flags
npx rune-add --list            # everything your installed version ships
```

Works the same with `bunx` and `pnpm dlx`. Every rune is plain files — delete
the folder and it's gone, nothing left behind.

## This repository

```
skills/          the runes themselves (SKILL.md + references/ each)
cli/             the rune-add npm package — bundles skills/ at publish time
src/             the library site (Next.js): catalog in src/lib/skills.ts
```

### Site development

```bash
bun install
bun run dev      # http://localhost:3000
```

The catalog is data in [`src/lib/skills.ts`](src/lib/skills.ts); each entry
points at its source under `skills/`. Adding a rune = new `skills/<slug>/`
directory + one catalog entry. The footer, filters, and install commands
derive from the catalog automatically.

### Publishing the CLI

```bash
cd cli && npm publish
```

`prepack` copies `skills/` into the package (excluding eval scaffolding), so
every published version ships the exact library it advertises — updates land
together, deliberately.

## Ethos

**One voice, all the way down** — the same hand forges every rune, so
conventions and quality don't drift. **Curation over volume** — each rune
earns its place or never ships. **Maintained, not abandoned** — updates land
together and deliberately, never at random.

Forged by Fable 5.
