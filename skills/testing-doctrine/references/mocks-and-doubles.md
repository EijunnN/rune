# Mocking Discipline — Doubles Without Self-Deception

Every mock replaces reality with your *assumption* of reality. The suite then verifies your code against your assumptions — which is worthless exactly where the assumptions are wrong. Hence the ladder: prefer the option that keeps the most reality.

**Real thing → hand-written fake → MSW at the network edge → module mock (last resort).**

## Taxonomy (use the words precisely)

- **Stub**: canned answers, no assertions on usage. Most "mocks" should be stubs.
- **Fake**: a working lightweight implementation (in-memory repo, Map-backed cache). The most valuable double — obeys the real contract.
- **Spy**: records calls for later inspection; the real (or stubbed) behavior still runs.
- **Mock (strict)**: pre-programmed expectations on *how it's called* — couples to interaction, use only when the interaction IS the contract (an email was sent once, a charge was made with amount X and idempotency key Y).

## Mock only boundaries you don't own

Own code gets called for real. If unit-testing `OrderService` requires mocking `TaxCalculator` (also yours), either test them together (they're one behavior) or the seam is wrong. Legitimate mock targets: third-party HTTP APIs, payment/email providers, clock, randomness, message brokers in unit tier, filesystem in unit tier.

**Interaction assertions on own modules (`expect(userService.save).toHaveBeenCalled()`) are the #1 refactor-breaker** — assert instead on the observable result (the user exists afterward).

## The network: MSW, at the HTTP layer

Mock the *wire*, not your client wrapper — then your wrapper, serialization, error mapping, and retry logic all stay under test:

```ts
// tests/msw/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.stripe.example/v1/customers/:id", ({ params }) =>
    HttpResponse.json(aStripeCustomer({ id: params.id as string })),
  ),
];

// tests/setup.ts (vitest setupFiles)
import { setupServer } from "msw/node";
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));  // unknown requests FAIL — no silent realness
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- Per-test overrides for scenarios: `server.use(http.get(url, () => HttpResponse.json({...}, { status: 429 })))` — error paths become one-liners.
- `onUnhandledRequest: "error"` is non-negotiable: it converts "test accidentally hit prod API" from an incident into a failure.
- Same handlers reuse in the browser (dev mocking) and Storybook — one source of network truth.

## Time & randomness

```ts
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-15T12:00:00Z")); });
afterEach(() => vi.useRealTimers());

it("expires sessions after 30 idle minutes", () => {
  const s = createSession();
  vi.advanceTimersByTime(29 * 60_000); expect(s.isActive()).toBe(true);
  vi.advanceTimersByTime(2 * 60_000);  expect(s.isActive()).toBe(false);
});
```

- Async timers: `await vi.advanceTimersByTimeAsync(...)` when callbacks contain awaits; `vi.runAllTimersAsync()` to drain. Mixing fake timers with real async IO (MSW included) can deadlock — advance with the async variants, or fake only what the test needs (`toFake: ["Date"]`).
- Randomness: inject the RNG (`createId(rng)`) or seed a library; `vi.spyOn(Math, "random").mockReturnValue(0.42)` as the blunt fallback. UUID collisions in assertions → assert shape (`expect(id).toMatch(/^ord_/)`), not value.

## Module mocking (vi.mock) — the sharp knife

```ts
vi.mock("./mailer", () => ({ sendMail: vi.fn().mockResolvedValue({ id: "m1" }) }));
```

Reach for it only when DI is impossible (framework-owned instantiation, singletons in third-party code). Know the traps:
- `vi.mock` is **hoisted** above imports — factory can't reference outer variables (use `vi.hoisted(() => ...)` for shared handles).
- Path must match the *importer's* specifier; aliased paths need the same alias.
- Partial mock: `const actual = await vi.importActual<typeof import("./mod")>("./mod"); return { ...actual, onlyThis: vi.fn() }`.
- Reset policy: set `restoreMocks: true` (or `mockReset`) in vitest config so call history and impls don't leak between tests — leaked mock state is a classic order-dependence flake.
- A file needing 5 `vi.mock`s is an integration test in denial or a DI refactor pending.

## Fakes — the underrated workhorse

```ts
export class InMemoryUserRepo implements UserRepo {
  #rows = new Map<string, User>();
  async byId(id: string) { return this.#rows.get(id) ?? null; }
  async save(u: User) { this.#rows.set(u.id, u); }
}
```

- Obeys the interface, keeps state, enables whole scenarios with zero mock choreography. Write once per port, reuse everywhere.
- **Verify fakes against reality**: run the same contract-test suite over `InMemoryUserRepo` and `PostgresUserRepo` (a shared `describe` taking the impl as parameter) — the fake is now certified, and unit tests using it inherit real confidence.

## Smells checklist

`toHaveBeenCalledTimes` on own code · mock returning a mock returning a mock · assertions on argument *order* of internal calls · `as any` to force a partial double (build a proper builder/fake) · mocks configured in `beforeEach` that half the tests silently rely on · a mocked dependency whose real version was never exercised anywhere in the suite (unverified assumption — add one integration test).
