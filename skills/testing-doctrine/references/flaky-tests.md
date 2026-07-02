# Flaky Tests — Determinism or Death

A flaky test (passes/fails without code change) is worse than no test: it burns CI time, trains the team to click "re-run" past real failures, and hides at least one genuine race. Doctrine: **quarantine same-day, root-cause within the week, delete if unowned.** Retries are telemetry, never treatment.

## The usual suspects — in order of frequency

**1. Un-awaited async.** A floating promise lets the test finish before the work does; it passes now and fails when timing shifts.
- Enable lint: `@typescript-eslint/no-floating-promises`, `no-misused-promises` — in test files especially.
- Every `expect(...).resolves/.rejects` is awaited. Every helper returning a promise is awaited. `async` test fns, always.

**2. Real time.** `new Date()` in test data (works until midnight/月末/DST), timeouts racing assertions, TTL logic.
- Fixed clock via fake timers (mocks-and-doubles.md); fixed dates in builders; never assert "took less than X ms" (that's a benchmark, and CI machines are potatoes).

**3. Shared state between tests.** Module-level singletons, leaked mock impls, one DB row all tests edit, env vars mutated and not restored.
- Symptom: passes alone, fails in suite (or vice versa) — bisect with `--shuffle` / seed reorder; vitest `sequence.shuffle: true` in CI keeps everyone honest.
- Fix at the seam: fresh instances per test (app factory pattern), `restoreMocks: true`, per-worker DBs, `vi.stubEnv` (auto-restores) over raw `process.env` writes.

**4. Order-of-completion assumptions.** `Promise.all` results asserted in resolution order, unordered SQL asserted as ordered, parallel writes racing.
- Sort before asserting when order isn't the contract; assert as sets (`expect(new Set(ids)).toEqual(new Set([...]))`); when order IS the contract, make the code order it (`ORDER BY`) — the flake found a real bug.

**5. Polling/eventual consistency handled with sleeps.** `await sleep(500)` is a bet against the scheduler.
- Replace with condition-polling: `await vi.waitFor(() => expect(rows()).toHaveLength(3), { timeout: 2000 })` (Playwright: web-first assertions do this natively). Better: expose completion (return the promise, emit an event, flush hook) and await it directly.

**6. Animation & transition timing** (UI tiers). Element "not stable" or intercepted clicks.
- Disable animations under test (CSS `prefers-reduced-motion` honored by your app + a test stylesheet, or Playwright's `reducedMotion: "reduce"` context option); assert end-states, not mid-flight frames.

**7. Resource contention.** Port collisions (hardcoded :3001 across workers), same temp file paths, container startup timeouts on cold CI.
- Port 0 (OS-assigned) + read the actual port; `mkdtemp` per test; generous *startup* timeouts distinct from test timeouts.

**8. External reality leaking in.** Real third-party APIs (rate limits, outages), DNS, locale/timezone of the CI box.
- MSW with `onUnhandledRequest: "error"` closes the network hole. Pin `TZ=UTC` and locale in test env/config so "works on my machine (in Madrid)" dies.

## The flake response playbook

1. **Capture evidence at failure time** — Playwright traces on retry, CI artifacts for logs; flakes reproduce badly on demand, so instrument the crime scene in advance.
2. **Quarantine visibly**: tag (`it.skip` + `// QUARANTINED: TICKET-123 <date>`) or move to a non-blocking CI lane. Invisible retries are how suites rot; a quarantine list with owners is how they heal.
3. **Reproduce by amplification**: `vitest --retry=0 --repeat=50 path/to/test` (or a loop), with `--shuffle`, under `--pool=threads --maxWorkers=100%` load. For Playwright: `--repeat-each=20 --workers=4`.
4. **Root-cause against the suspect list above** — the failure mode usually names its family (timeout → 1/5; passes-alone → 3; count mismatch → 4).
5. **Fix the code when the flake is real.** Roughly a third of "flaky tests" are correctly detecting a race in production code (unawaited write, missing transaction, event ordering). The test was the hero; don't shoot it.

## Retry policy (the whole policy)

- Local: retries 0. You want to see it.
- CI: at most 1 retry, **only** as a detector — every pass-on-retry is logged/reported (Playwright and Vitest reporters expose `flaky` status; fail the build on flake-rate budgets if the team can hold the line).
- Auto-rerun-until-green bots, `--retry=3` as default config, and "just re-run the pipeline" culture are the suite's obituary in progress.

## Timeouts

Per-test timeouts exist to fail fast, not to paper over slowness: keep defaults tight (5s unit/integration), raise *locally and explicitly* for the few legitimately slow tests (`it("migrates 1M rows", { timeout: 60_000 })`) with a comment. A timeout increase without a reason is a flake fix from the retry family — denied in review.
