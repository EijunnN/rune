# Unit Tests That Survive Refactors

## Anatomy — Arrange, Act, Assert (visible, in that order)

```ts
import { describe, expect, it } from "vitest";
import { applyCoupon } from "./pricing";

describe("applyCoupon", () => {
  it("rejects coupons past their expiry date", () => {
    const cart = aCart({ total: 100 });                       // Arrange — builders, intent-revealing
    const coupon = aCoupon({ expiresAt: yesterday() });

    const result = applyCoupon(cart, coupon);                 // Act — one line, the behavior under test

    expect(result).toEqual({ ok: false, reason: "expired" }); // Assert — on the OUTCOME
  });
});
```

- The reader must see *what varies* (expiry in the past) without leaving the test. Everything irrelevant hides in the builder defaults.
- One `act` per test. Setup requiring a chain of acts often means the test wants to be an integration test — or the API forces awkward sequencing (design signal).
- No logic in tests: no `if`, no loops computing expectations, no re-implementing prod formulas to assert against themselves. Expected values are **literals** a human verified once.

## Naming

`it("<behavior in domain words>")` — third person, present tense, no "should" filler: `"rounds totals to cents"`, `"throws for negative quantities"`, `"keeps the newest session per device"`. Test output = executable spec. If naming is hard, the test covers too much.

## Table-driven tests — for input matrices

```ts
it.each`
  input        | expected     | why
  ${""}        | ${null}      | ${"empty"}
  ${"a@b.c"}   | ${"a@b.c"}   | ${"minimal valid"}
  ${" A@B.c "} | ${"a@b.c"}   | ${"trims and lowercases"}
  ${"nope"}    | ${null}      | ${"no at-sign"}
`("parseEmail($input) → $expected ($why)", ({ input, expected }) => {
  expect(parseEmail(input)).toBe(expected);
});
```

Use for pure functions with many cases; don't use it to smuggle five unrelated behaviors into one table. Each row still = one behavior instance.

## Test data: builders over fixtures

```ts
// tests/helpers/builders.ts
export const aUser = (over: Partial<User> = {}): User => ({
  id: "u_test000001",
  role: "member",
  email: "test@example.com",
  createdAt: new Date("2026-01-01T00:00:00Z"),   // fixed — never `new Date()` in test data
  ...over,
});
```

- Defaults are *valid and boring*; each test overrides only what it's about. This is how tests stay readable AND robust to schema growth (new required field → update one builder, not 400 tests).
- Compose: `anAdmin = () => aUser({ role: "admin" })`. For DB-backed tests the same builders feed insert helpers (integration-api.md).
- Anti-pattern: `fixtures/big-blob.json` shared by 50 tests — nobody can change it, nobody knows which fields matter to which test.

## Assertions that earn their keep

- `toEqual`/`toStrictEqual` for whole values; `toMatchObject` when only part is the contract (but ask why the rest isn't).
- Errors: assert the *kind*, not the prose — `expect(fn).toThrow(ExpiredCouponError)` or match a stable code `/COUPON_EXPIRED/`. Full-message equality breaks on copy edits.
- Async: `await expect(promise).resolves.toEqual(...)` / `.rejects.toThrow(...)` — and **return/await every assertion**; a floating async expect passes vacuously.
- Floats: `toBeCloseTo`, never `toBe(0.3)`.
- Avoid `toBeTruthy/Falsy/Defined` — they accept too much and their failure diff says nothing.
- Custom domain matchers (`expect.extend`) when a check repeats with intent: `expect(response).toBeProblemJson(404)`.

## Snapshot discipline

Legit: codegen output, CLI/error formatting, serialized configs — where the exact text IS the contract. Rules: **inline** (`toMatchInlineSnapshot()`) so it's visible in review; small (<20 lines); regenerate only after *reading* the diff. Component-tree snapshots and 200-line JSON snapshots are write-only noise — replace with targeted assertions on the fields that matter.

## Property-based testing (fast-check) — for algorithmic code

```ts
import fc from "fast-check";

it("decode inverts encode for any payload", () => {
  fc.assert(fc.property(fc.string(), (s) => decode(encode(s)) === s));
});
```

Ideal for parsers, serializers, math, invariant-rich data structures ("sorted output is a permutation of input"). When it finds a counterexample, fast-check shrinks it minimal — paste that case in as a permanent example test too. Don't property-test glue code; generators cost thought.

## Test hygiene

- `beforeEach` for resets only (fresh SUT, clear fakes); construction belongs in the test or builders. If `beforeEach` grows a personality, tests get coupled.
- No conditional assertions (`if (x) expect(...)`) — a test with paths tests nothing on the untaken path. `expect.assertions(n)` guards callback-style code.
- Never `test.skip` and forget: skips carry a ticket or die. `it.todo("...")` documents planned coverage honestly.
- Determinism absolutes inside unit tests: injected/faked clock (`vi.setSystemTime`), seeded randomness, sorted iteration before asserting on order you don't actually promise (flaky-tests.md).
