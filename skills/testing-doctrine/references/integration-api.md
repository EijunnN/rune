# Integration & API Testing — The Workhorse Tier

Integration tests exercise your code with its real infrastructure (or high-fidelity stand-ins): route handlers with a real router, queries against a real database engine, serialization across a real HTTP boundary. This is where wiring bugs live — and wiring bugs are most production bugs.

## API tests: through the front door

Test handlers by making requests, not by calling handler functions with hand-built context objects (that skips routing, middleware, parsing — the stuff that breaks):

```ts
// Hono / Express+supertest / fastify.inject — same shape everywhere
it("creates an order and returns 201 with a location", async () => {
  const app = buildApp({ db });                                 // app factory takes deps — the key seam
  const res = await app.request("/orders", {
    method: "POST",
    headers: authHeaders(aUser()),
    body: JSON.stringify({ sku: "SKU-1", qty: 2 }),
  });

  expect(res.status).toBe(201);
  expect(res.headers.get("location")).toMatch(/^\/orders\/ord_/);
  await expect(db.order.count()).resolves.toBe(1);              // the durable outcome, not internals
});
```

- **App factory over global app**: `buildApp(deps)` lets each test wire a fresh app with test DB/fakes — no module-mocking, no shared state.
- Assert the full contract: status, body shape (schema-parse the response with the same zod schema the client uses — drift dies here), headers that matter, and the persisted side effect.
- **Error paths are first-class citizens**: 400 on bad input (assert the problem body names the field), 401/403 with wrong/absent auth, 404, 409 conflicts, and the 429/5xx mapping from downstream failures (MSW makes those one-liners).
- Third-party HTTP inside handlers → MSW as in mocks-and-doubles.md; your DB → real, below.

## The test database — real engine, fast reset

SQLite-in-memory "for speed" tests a different database than production. Use the real engine:

- **Testcontainers** (`@testcontainers/postgresql`) spins ephemeral Postgres/MySQL/Redis per suite — CI-friendly, no local install assumptions. One container per worker, migrate once at startup.
- Reset between tests, fastest first: **transaction rollback** (open TX in `beforeEach`, roll back in `afterEach` — milliseconds, but breaks if code-under-test manages its own transactions) → **truncate all tables** (robust default; `TRUNCATE ... RESTART IDENTITY CASCADE`) → re-migrate (only for schema tests).
- Parallel workers need isolation: one database (or schema) per worker (`test_${VITEST_WORKER_ID}`), or force single-thread for the integration project and rely on speed.
- Seed via the same builders as unit tests, inserted through your real data layer (so factory bugs surface): `await seed(db, [aUser(), anOrder({ userId })])`.

## What integration tests uniquely catch (aim them here)

- Query correctness: filters, joins, pagination boundaries (page size ±1, empty page), sort stability, N+1 detection (assert query count if your ORM exposes it).
- Constraint behavior: unique violations mapped to 409, FK cascades, concurrent upsert races (fire two awaits with `Promise.all`, assert one winner).
- Serialization drift: dates as ISO strings, bigints, null vs absent, zod schema ↔ DB row mismatches.
- Middleware stacks: auth token parsing, tenant scoping (**the** security test: user A requests user B's resource → 404/403, never 200), rate limiting, error handler formatting.
- Transactionality: force a failure mid-flow, assert *nothing* was persisted.

## Contract tests — when systems are owned by different teams

- Consumer-driven (Pact) if the org buys in; the lightweight version: the consumer's zod/OpenAPI schema runs as a test against the provider's real responses in CI (record a golden response per endpoint version and schema-parse it).
- Generated clients (openapi-typescript, GraphQL codegen) shift contract drift to compile time — prefer that over hand-rolled fetch + hope.
- Never assert on fields you don't consume — that's how contract tests become change-blockers instead of change-detectors.

## Queues, jobs, and async flows

- Test the handler as a function (`await handleOrderPaid(msg, deps)`) at unit/integration level; the broker itself only in one smoke E2E.
- Outbox/exactly-once logic: integration-test the dedup (deliver the same message twice, assert one effect).
- Never `await sleep(500)` for eventual effects — poll with timeout (`await vi.waitFor(() => expect(...))`) or expose a completion promise/hook from the worker (flaky-tests.md).

## Speed budget

Workhorse tier earns its keep only while fast enough to run on every save-ish: target < 500ms/test, suite minutes not tens. Levers: transaction rollback resets, container reuse across suite (start once in globalSetup), parallel workers with per-worker DBs, and ruthless demotion of pure-logic tests down to unit tier where they run in ms.
