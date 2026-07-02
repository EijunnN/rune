---
name: testing-doctrine
description: Complete testing doctrine for modern JavaScript/TypeScript — test strategy and what to test at which level, unit tests that survive refactors, mocking discipline (MSW, fakes, DI over module mocks), integration and API testing, Playwright end-to-end, UI component testing, hunting flaky tests, coverage policy, and TDD workflow. Use whenever writing or reviewing tests, setting up Vitest/Jest/Playwright, deciding what or how to test, fixing flaky or slow suites, mocking a dependency, or when a PR needs test coverage — even if the user just says "add tests for this".
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Testing Doctrine

A test suite has exactly one job: **let you change code with confidence**. Every practice below follows from that. Tests that break when you refactor (without behavior changing) are liabilities wearing a safety costume; tests that pass while the app is broken are worse. The unit of testing is **behavior through a public contract** — never implementation detail.

Write every test to answer one question: *"if this fails, what user-visible or contract-visible promise was broken?"* No answer = no test.

## Fit the codebase first

Before writing a single test:

1. **Detect the stack**: which runner (Vitest? Jest? bun test? node:test), which conventions (`*.test.ts` vs `__tests__/`), existing helpers/factories/fixtures. Extend what exists; never introduce a second runner or a parallel convention.
2. **Read 2–3 neighboring test files** and match their idiom — assertion style, setup patterns, naming language.
3. **Run the suite** before and after your change. A test you never saw fail proves nothing — break the code (or write the test first) to see the failure message once.

Default stack when starting fresh: **Vitest** (unit/integration), **Playwright** (E2E), **MSW** (network), **Testing Library** (UI). All advice here uses them; translate idioms for Jest (nearly 1:1).

## Reference map — read before deciding in that area

| Task involves | Read |
| --- | --- |
| What to test, which level, coverage policy, test-suite architecture | [references/strategy.md](references/strategy.md) |
| Writing/reviewing unit tests, naming, table-driven tests, builders, snapshots | [references/unit-tests.md](references/unit-tests.md) |
| Mocking anything: module mocks, MSW, fake timers, DI, spies | [references/mocks-and-doubles.md](references/mocks-and-doubles.md) |
| API/server/DB tests, test databases, transactions, contract tests | [references/integration-api.md](references/integration-api.md) |
| Playwright, E2E flows, auth state, selectors, parallel workers | [references/e2e-playwright.md](references/e2e-playwright.md) |
| Component/UI tests, Testing Library queries, user-event, accessibility | [references/ui-components.md](references/ui-components.md) |
| Flaky tests, async races, retries policy, time/randomness control | [references/flaky-tests.md](references/flaky-tests.md) |
| TDD loop, CI pipelines, sharding, what runs when, pre-commit | [references/workflow-ci.md](references/workflow-ci.md) |

React-specific component patterns (hooks, Suspense, server components) are covered in depth by the react-mastery rune's testing reference — this rune is the framework-agnostic authority.

## Non-negotiables

1. **Test behavior, not implementation.** Assert on outputs, emitted events, rendered text, HTTP responses, DB rows — never on "method X was called with Y" unless calling X *is* the contract (e.g. a payment gateway).
2. **A refactor that preserves behavior must not break tests.** If renaming a private function or reordering internals breaks the suite, the tests are pinned to the wrong layer.
3. **One behavior per test.** Multiple assertions are fine when they describe one outcome; two scenarios in one test hide which died.
4. **Test names state behavior in domain language**: `"rejects expired coupons"`, not `"test applyCoupon 2"`. The suite output should read as a spec of the module.
5. **Every test contains its own story.** Arrange-Act-Assert visible in the body; relevant inputs inline or via named builders (`aUser({ role: "admin" })`) — not buried in a shared fixture 200 lines away. Shared mutable fixtures are how suites rot.
6. **Mock only at boundaries you don't own** — network, clock, randomness, external services. Mocking your own modules to "isolate units" couples tests to structure (violates #2). Prefer: real collaborators > fakes > handler-level MSW > module mocks (last resort).
7. **No test touches the real network, real time, or real randomness.** MSW for HTTP, fake timers for time, seeded/injected RNG. These are the top three flake sources.
8. **Tests are independent and order-agnostic.** Fresh state per test (new instance, clean DB via transaction/truncate, `beforeEach` reset). If running one test alone changes its result, that's a P1 bug in the suite.
9. **Zero tolerance for flakiness.** A flaky test is quarantined the day it flakes and fixed or deleted within the week. Auto-retries are diagnosis tools, not a lifestyle — every retry hides a real race somewhere.
10. **Coverage is a flashlight, not a target.** Use it to find untested *risk*; never chase a percentage — 100%-covered assertions-free tests are negative value. Critical paths deserve mutation-level rigor; glue code may deserve nothing.
11. **The failure message is part of the test.** When it fails at 2am, the message + diff should point to the broken promise without a debugger. Prefer specific matchers (`toEqual`, `toMatchObject`, `rejects.toThrow(/expired/)`) over `toBeTruthy`.
12. **Snapshots only for output that is the contract** (serialized config, codegen, error rendering) — small, reviewed, inline where possible. A 300-line component snapshot nobody reads is `--force` merged noise.
13. **Don't test the framework or the library** — React renders, zod parses, SQL WHERE filters. Test *your* logic: the query is right, the schema matches your API, the props wire up.
14. **E2E tests are few, ruthless, and user-shaped**: the money paths (signup, checkout, core loop), through real UI semantics (roles/labels), with no sleeps. Everything else pushes down the pyramid.
15. **Slow suites kill the loop.** Unit feedback < 10s locally; parallelize integration; if a test needs >1s, it's probably at the wrong level. Perceived speed is a feature of the suite.

## Decision framework — which level?

Start from the failure you fear, pick the *lowest* level that can catch it honestly:

- **Pure logic** (calculations, parsing, state machines) → unit. Extract logic *out of* IO-heavy code to make this possible — testability pressure is good design pressure.
- **Your code ↔ your infra** (handlers, queries, queues) → integration with real-ish deps (test DB, MSW at the HTTP edge). This is the workhorse level for servers — most backend "unit tests with everything mocked" belong here instead.
- **Wiring across the whole system + real browser** → E2E, only for flows whose breakage is a pager incident.
- **Types already prove it?** (exhaustiveness, nullability) → no test; the compiler is faster than any suite.

## Decision framework — to mock or not

```
Is it yours and fast and deterministic?        → use the real thing
Is it yours but slow/stateful (DB, queue)?     → real in integration; fake (in-memory impl) in unit
Is it the network / a third party?             → MSW handler (HTTP) or a hand-written fake client
Is it time, randomness, env?                   → inject or fake globally (timers, seed)
Is it "so the test compiles"?                  → stop; the design wants dependency injection
```

## Review checklist (sweep any test PR)

Names read as spec · failure messages tried (see them fail) · no implementation-coupled assertions (`toHaveBeenCalled` on own code) · no shared mutable state between tests · no real network/time/randomness · builders over mega-fixtures · each test would survive a rename-only refactor · slow tests justified or moved down a level · snapshots small and intentional · flaky = quarantined, not retried into silence.
