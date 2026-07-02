# Test Strategy — What, Where, How Much

## The shape of a healthy suite

Forget pyramid-vs-trophy debates; the operative rule is **cost-per-confidence**. Each level up buys realism and pays in speed, flakiness surface, and debugging distance:

| Level | Catches | Cost | Healthy share (typical web app) |
| --- | --- | --- | --- |
| Static (types, lint) | whole bug classes, free forever | ~0 | maximize first |
| Unit | logic errors in pure-ish code | ms | many — for real logic, not for glue |
| Integration | wiring, queries, contracts, handlers | 10–500ms | **the workhorse** — most confidence per dollar |
| E2E | environment + full-system wiring | seconds, flake-prone | few: the money paths |

Two common failure shapes: the **ice-cream cone** (hundreds of E2E, no units — slow, flaky, undebuggable) and the **mockery pyramid** (thousands of "units" where every collaborator is mocked — fast, green, and worthless because they test the mocks). Both come from skipping strategy.

## What deserves tests (priority order)

1. **Money/critical paths** — auth, payment, data loss risks. Integration + one E2E each.
2. **Business logic with branches** — pricing, permissions, state machines, date math. Dense unit tests, edge cases enumerated (empty, zero, negative, boundary, unicode, huge).
3. **Contracts** — API request/response shapes, published lib APIs, event payloads. Integration tests that would fail if a consumer would break.
4. **Bug graveyards** — every fixed bug gets a regression test *first* (it's the only test guaranteed to catch a real bug, because it already did once).
5. **Gnarly code you're about to refactor** — pin current behavior with characterization tests, then refactor against them.

## What does NOT deserve tests

- Glue with no branches (a route that calls one service and returns it) — the integration test through it covers the wiring already.
- Framework behavior, library behavior, language behavior.
- Private functions directly — test through the public caller; if a private function begs for direct tests, it's asking to be extracted into its own module.
- Generated code, one-line getters, constants, styles.
- Things the type system proves. `noUncheckedIndexedAccess` beats a null test.

Deleting a worthless test is a positive contribution. Say so in review.

## Coverage policy that isn't theater

- Coverage answers "what did we *forget*?" — read the uncovered-lines report on critical modules; ignore the global %.
- If a gate is demanded: per-package thresholds on **changed code** (e.g. 80% on diff) beat repo-wide numbers; never let a gate incentivize assertion-free tests.
- **Mutation testing** (Stryker) is the honest metric where it matters: it verifies tests *fail* when logic changes. Run it on the top-risk modules occasionally, not in every CI.
- Branch coverage > line coverage when you must choose a number.

## Architecture for testability (the feedback loop)

Hard-to-test code is the design telling you something:

- **Extract pure cores**: `computeInvoice(data)` (unit-testable, no mocks) called by `handleInvoiceRequest` (thin, integration-tested). "Functional core, imperative shell."
- **Inject boundaries**: clock, RNG, fetch/client objects arrive as parameters/constructor args — then unit tests pass fakes without module-mocking magic.
- **One assertion of doom**: if a test needs 12 mocks, the unit has 12 reasons to change; split it.

## Test-suite architecture

- Colocate: `foo.ts` + `foo.test.ts` — distance breeds staleness. E2E lives in `e2e/` (own config, own CI job).
- Shared helpers earn a `tests/helpers/` module with the same code-review bar as prod code; **builders** (`aUser()`, `anOrder()`) beat fixtures (see unit-tests.md).
- Name suites by module/behavior, not by class mirroring (`describe("coupon expiry")` not `describe("CouponServiceImpl")`).
- Keep test types separate in CI (`test:unit`, `test:int`, `test:e2e`) so speed budgets are enforceable per tier (workflow-ci.md).

## Remediating a rotten suite (mock-heavy, flaky, distrusted)

Don't announce a rewrite; run a ratchet — new code obeys doctrine immediately, old tests convert opportunistically:

1. **Stop the bleeding first** (week one): review checklist enforced on new PRs (no interaction assertions on own code), flaky tests quarantined with owners, retries reduced to telemetry. No new rot while the old rot stands.
2. **Build the migration rails before migrating**: the app factory seam, test DB reset, MSW setup, builders, one or two certified fakes. One exemplary integration test per subsystem becomes the template others copy.
3. **Convert by risk, not by file order**: money paths and bug-history hotspots first. Each conversion replaces N mock-tests with fewer behavior tests; delete the replaced ones *in the same PR* (parallel suites = double maintenance and nobody trusts either).
4. **Convert on touch**: any PR modifying a module with legacy tests upgrades that module's tests as part of the change. Six months of normal work migrates most of what matters; what's never touched didn't matter.
5. **Track one number**: count of quarantined tests + count of `toHaveBeenCalled`-on-own-code occurrences (grep-able). Both trend to zero or the ratchet is slipping.

## Legacy code entry strategy

No tests + needed change = characterization first: write tests capturing *current* behavior (even bugs — mark them `// current behavior, likely wrong: TICKET-x`), get green, then change. Where seams don't exist, the first refactor is only seam-making (extract function, inject dependency) done mechanically. Golden-master testing (snapshot big outputs) is legitimate scaffolding here — delete it once real tests exist.
