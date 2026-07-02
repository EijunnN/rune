# rune-add

Add a **rune** — a curated agent skill forged end to end by Fable 5 — to your
agent's skills folder. No global install, no CLI to manage: the library ships
inside this package.

```bash
npx rune-add react-mastery
```

```
> resolve react-mastery .................. found
> write .claude/skills/react-mastery ..... ok (9 files)
> done. reload your agent ................ ok
```

## What's a rune?

A single skill in the open Agent Skills format (`SKILL.md` + `references/`),
read by Claude Code, Codex, and any agent that speaks the format. Each rune
hands your agent a capability it didn't have — a complete doctrine, not a
snippet. Browse the library and read exactly what each rune grants before you
install it: https://github.com/EijunnN/rune

## Usage

```bash
npx rune-add <slug> [<slug> ...]   # add rune(s) — asks where they should go
npx rune-add --list                # every rune this version ships
```

Run it bare and it asks two questions: **which agent** (Claude Code, Codex, or
both) and **which scope** (this project, or global so it's live everywhere).
Pass flags to skip the questions:

| Flag           | Effect                                                          |
| -------------- | --------------------------------------------------------------- |
| `--claude`     | Claude Code — `./.claude/skills/` (`--global`: `~/.claude/skills/`) |
| `--codex`      | Codex — `./.codex/skills/` (`--global`: `~/.codex/skills/`, honors `CODEX_HOME`) |
|                | pass `--claude --codex` together to install for both agents     |
| `--global`     | user-wide — the rune is live in every project                   |
| `--dir <path>` | write anywhere — for any agent that reads Agent Skills          |
| `--yes`        | no questions: Claude Code, this project                         |
| `--force`      | overwrite an existing copy                                      |

Works the same with `bunx rune-add …` and `pnpm dlx rune-add …`. In scripts
and CI (no TTY) it never asks — it defaults to Claude Code, this project.

Every rune is plain files. Delete the folder and it's gone — nothing global,
nothing left behind.

## The library

The library opens small and grows deliberately — every rune is forged,
reviewed, and maintained by one hand, so conventions and quality never drift.
Run `npx rune-add --list` to see what your installed version carries.
