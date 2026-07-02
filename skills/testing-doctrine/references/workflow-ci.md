# Workflow & CI — When Tests Run, and How Development Feels

## The TDD loop (use it where it pays)

Red → Green → Refactor, honestly:

1. **Red**: write the smallest failing test for the next behavior. *Read the failure* — if the message wouldn't guide a stranger to the bug, improve it now.
2. **Green**: minimum code to pass. Resist gold-plating; the next test drives the next increment.
3. **Refactor**: with green as a net — rename, extract, dedupe, in code AND tests. This step is where design happens; skipping it is why "TDD produced a mess".

Where TDD shines: pure logic, parsers, pricing/permission rules, bug fixes (**always** reproduce-first — the failing test is the bug report), API design (writing the test first forces the caller's perspective). Where it's ceremony: exploratory UI work, glue code — write tests after, same rigor, no guilt. The doctrine is *test-guided*, not test-theater.

For agents specifically: reproduce-first is non-negotiable on bug fixes. A fix without a previously-failing test is a claim, not a fix.

## Local feedback layers (fastest loop wins)

- **Watch mode is the inner loop**: `vitest` (watch is default) re-runs affected tests on save via module-graph tracking. Keep the unit tier fast enough that watch feels instant (<2s re-run).
- Editor test integration or `vitest --ui` for focused debugging; `test.only` locally (blocked in CI — `forbidOnly: true` / `--forbid-only` so a stray `.only` can't silently skip the suite).
- Pre-commit hooks: **lint + typecheck + affected unit tests only** (lint-staged). Full suites in pre-commit punish commit frequency — that cost lands on code quality. Pre-push may run more; CI runs everything.

## CI pipeline shape

```yaml
# The canonical ladder — each rung gates the next, cheapest first
jobs:
  static:      # ~1 min: typecheck (tsc --noEmit), lint, format check
  unit:        # ~2 min: vitest run --project unit  (fail here = logic bug)
  integration: # ~5 min: needs: static; services/testcontainers; per-worker DBs
  e2e:         # ~10 min sharded: needs: unit+integration; playwright --shard=${{ matrix.shard }}/4
```

- **Fail fast, cheap first** — a type error shouldn't cost a 10-minute E2E bill.
- Cache aggressively: package manager store, Playwright browsers (`~/.cache/ms-playwright` keyed on version), build artifacts reused by E2E (build once, `webServer` serves the artifact — don't rebuild per shard).
- **Sharding**: Playwright `--shard=i/n` across matrix jobs; Vitest `--shard` similarly. Merge reports (`playwright merge-reports` / blob reporters) for one human-readable result.
- Artifacts on failure only: traces, videos, DB logs. Green runs stay cheap; red runs arrive pre-instrumented (flaky-tests.md).
- Monorepos: run *affected* projects per PR (turborepo/nx task graph — tests are cached tasks keyed on inputs), full matrix on main. A PR touching `packages/ui` must not pay for `packages/billing`'s integration suite.
- Nightly lane for the expensive honesty checks: full cross-browser E2E, mutation testing on core modules, dependency-audit — things too slow for PR gates but too valuable to skip forever.

## Merge policy

- Required checks: static + unit + integration + E2E-smoke. All green = mergeable; no human overrides "just this once" (the once compounds).
- **Flake budget**: pass-on-retry events are tracked; exceeding the budget freezes feature merges for suite repair. This single policy keeps retries from becoming morphine.
- New code norms enforced in review, not by coverage bots: behavior named in test titles, reproduce-first on fixes, no new `.skip` without a ticket.

## Test environments & config hygiene

- One `test` env config, loaded the same way prod config loads (env schema from your runtime-boundaries pattern) — not `if (NODE_ENV === "test")` branches sprinkled through app code. App code ideally doesn't know tests exist; the seams are dependency injection, not env checks.
- Vitest `projects` (or separate configs) per tier: unit (node env, no setup), integration (containers setup file), ui (jsdom/browser + testing-library setup). Named projects → `vitest --project unit` locally and per-CI-job selection.
- Determinize the environment: `TZ=UTC`, fixed locale, `CI=true` behavior differences minimized (same seeds, same viewports). "Passes locally, fails in CI" is almost always environment drift you can pin.

## Suite maintenance (the part nobody schedules)

- Test code gets refactored with the same standards as prod code — duplicated setup extracted to builders/helpers, dead tests deleted, names updated when behavior language changes.
- Quarterly: read the slowest-tests report (`--reporter=verbose` durations / Playwright report) and demote or fix the top offenders; review the quarantine list to zero; delete snapshots nobody has read since creation.
- When a prod incident ships: the postmortem includes "which test tier *should* have caught this" and lands the missing test in the fix PR — incidents are the highest-signal test-strategy feedback that exists.
