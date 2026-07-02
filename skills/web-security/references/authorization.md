# Authorization — Who May Touch What

Authentication answers *who you are*; authorization answers *whether this identity may
perform this action on this resource*. Most real-world breaches in app code are missing
or object-blind authorization — IDOR is boring, universal, and devastating.

## The IDOR default assumption

Every identifier arriving in a request (path param, query, body, hidden field, header)
is an attack until the handler proves the caller may act on that object.

```ts
// ❌ authenticated ≠ authorized — any logged-in user reads any invoice
const invoice = await db.invoice.findUnique({ where: { id: params.id } });

// ✅ ownership is part of the query itself
const invoice = await db.invoice.findUnique({
  where: { id: params.id, organizationId: session.orgId },
});
if (!invoice) notFound(); // one path for "missing" and "not yours" — no oracle
```

Sequential ids make IDOR discoverable but UUIDs do **not** fix it — ids leak in URLs,
exports, logs, and referrers. Unguessable ≠ authorized.

## Where checks live

Two layers, both mandatory:

1. **Entry point** (route handler / server action / resolver): is this identity allowed
   to invoke this operation at all? (role/feature checks)
2. **Data layer**: every query scoped by owner/tenant so a forgotten check fails
   *closed* — the row simply isn't found.

```ts
// data-layer helper that makes bypass structurally hard:
export function invoicesFor(session: Session) {
  return db.invoice.where({ organizationId: session.orgId }); // all reads flow through
}
```

Centralize the *policy* (a `can(user, action, resource)` module or a library like CASL)
so rules live in one testable place instead of scattered ifs.

**Middleware is convenience, not enforcement.** Framework middleware has shipped
bypasses (Next.js CVE-2025-29927: a spoofed `x-middleware-subrequest` header skipped
middleware entirely). Gate UX in middleware; authorize in handlers and data.

## Deny by default

- New routes/actions start locked: no role match → 403 (or 404 to avoid disclosure).
- Enumerate *allowed* roles/permissions; never `if (!user.isBanned)` style blocklists.
- Function-level access: admin endpoints re-check the role server-side on **every**
  call — hiding the admin nav is not a control. Test it: normal user calls
  `POST /api/admin/users` directly and must fail.

## Multi-tenancy

- Tenant id comes from the **session/token**, never from the request body or URL alone.
- Every table with tenant data carries the tenant column; every query filters on it —
  by construction (scoped client/helper), not by convention.
- Postgres Row-Level Security is an excellent belt-and-suspenders: even a forgotten
  `where` can't cross tenants.
- Test the seam explicitly: user in tenant A requests tenant B's resource ids across
  every endpoint (this is automatable — see review-and-testing.md).

## Mass assignment

Spreading client input into writes silently grants clients every column:

```ts
// ❌ body: { "name": "x", "role": "admin", "organizationId": "victim-org" }
await db.user.update({ where: { id }, data: req.body });

// ✅ schema is the allowlist
const data = UpdateProfile.parse(req.body); // z.object({ name, avatarUrl }).strict()
await db.user.update({ where: { id }, data });
```

Fields that change privilege (`role`, `ownerId`, `tenantId`, `price`, `status`,
`emailVerified`) only move through dedicated, separately-authorized operations.

## Business-logic authorization

The checks no scanner finds:

- **Server-computed invariants**: price, totals, and discounts come from the DB at
  execution time — a `price` field in the request is decoration.
- **State machines**: enforce legal transitions server-side (`shipped → refunded`
  only from paid states; approval can't come from the requester).
- **Race conditions**: balance checks and redemptions need atomicity — unique
  constraints, `UPDATE … WHERE balance >= x` style conditional writes, or transactions
  with the right isolation; otherwise two parallel requests both pass the check
  (double-spend). Idempotency keys on payment-ish endpoints.
- **Quantity/limit abuse**: negative quantities, absurd ranges, free-tier loops —
  validate ranges and recheck limits inside the transaction.

## Sensitive operations

Email change, password/MFA changes, member removal, payouts, deletions:

- Require **step-up auth** (fresh password/MFA), notify the old contact point, and make
  destructive actions reversible for a window (soft delete) where feasible.
- Log actor, action, target, and origin for every privileged operation (see
  secrets-and-data.md for what *not* to log).

## Anti-patterns

| Smell | Fix |
| --- | --- |
| `findUnique({ where: { id: params.id } })` then no owner check | Ownership in the `where`, 404 on miss |
| Role checked in middleware only | Re-check in handler + scoped queries |
| `data: req.body` into an update | Parse with `.strict()` schema allowlist |
| Tenant id read from the request | Tenant from session; scoped helpers; RLS |
| `if (user.role !== "admin")` sprinkled per file | Central `can()` policy module + tests |
| Client sends `price`/`total` | Recompute server-side from the DB |
| "It's a UUID, nobody can guess it" | Ids leak; authorize anyway |
