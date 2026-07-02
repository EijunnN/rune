# Security Review, Threat Modeling & Testing

Security review is a *method*, not vibes: enumerate where untrusted input enters, where
privileged effects happen, and walk every path between them. This file is the operating
procedure.

## Lightweight threat model (per feature, ~10 minutes)

Answer in writing, in the PR/design doc:

1. **Assets** — what does this feature touch that's worth stealing/breaking? (data,
   money, sessions, compute)
2. **Entry points** — which new routes/actions/webhooks/uploads/messages exist now?
3. **Trust boundaries** — where does data cross from user/third-party into our code?
   From our code into interpreters/infra?
4. **Abuse cases** — how would a hostile *user* (not hacker: user) exploit the rules?
   Free-tier laundering, coupon stacking, scraping, harassment via user content?
5. **Blast radius** — if this component is fully compromised, what can it reach?
   (drives least-privilege for its DB user/token scopes)

STRIDE as a memory aid: Spoofing, Tampering, Repudiation, Information disclosure,
Denial of service, Elevation of privilege — ask each against the entry points.

## Code review procedure (source → sink)

For the diff under review:

1. **List entry points** it adds/changes: HTTP handlers, server actions, webhooks,
   cron, queues, websocket handlers, upload endpoints.
2. **Per entry point, the four questions:**
   - AuthN: who can call this? (anonymous? verified? service?)
   - AuthZ: is the *resource* checked, not just the route? (IDOR test: swap the id)
   - Input: schema-validated, `.strict()`, size-capped?
   - Output: fields selected deliberately? errors generic?
3. **Per sink it touches:** DB (parameterized? scoped?), fs (path from user?), shell
   (args array?), fetch (destination user-influenced?), HTML (encoding bypassed?),
   headers/redirects (user data?), logs (secrets/PII?).
4. **Secrets sweep:** new env vars server-only? anything client-importable? test
   fixtures with real-looking keys?
5. **Dependency delta:** new packages justified, real, script-free?

### Grep-able hotspots

```
dangerouslySetInnerHTML   eval(   new Function   execSync(   exec(
shell: true               $queryRawUnsafe        .raw(       innerHTML
child_process             fs.readFile(… req     path.join(… req|params|body
fetch(… body|params       redirect(… searchParams|body
Access-Control-Allow-Origin            NEXT_PUBLIC_
jwt.decode                verify: false          rejectUnauthorized: false
Math.random               localStorage.setItem(… token
```

A hit isn't automatically a bug — it's a mandatory stop-and-trace.

## Security tests that pay rent

Encode the model as tests so regressions fail CI, not prod:

**Authorization (highest ROI):**

```ts
test("user A cannot read user B's invoice", async () => {
  const res = await asUser(userA).get(`/api/invoices/${invoiceOfB.id}`);
  expect(res.status).toBe(404); // not 403 — no existence oracle
});

test("member cannot call admin mutation", async () => {
  const res = await asUser(member).post("/api/admin/users", { role: "admin" });
  expect(res.status).toBe(403);
});
```

Parameterize across every resource type × role — table-driven tests make the matrix
cheap. Add a tenant-crossing suite for multi-tenant apps.

**Validation & mass assignment:** unknown fields rejected (`role`, `ownerId` in update
payloads must 400 or be ignored — assert which); oversized payloads rejected; wrong
types rejected (the NoSQL `{ $gt: "" }` shape).

**Auth flows:** expired/garbage/`alg:none` tokens rejected; reset token single-use;
session invalid after logout/password change; rate limit actually triggers.

**Business logic:** the double-spend race (fire two parallel redemptions, assert one
succeeds), state-machine skips, negative quantities, client-supplied price ignored.

## Automated scanning (CI layer)

- **Secret scanning**: gitleaks/trufflehog on push + full-history once.
- **Dependency audit**: `npm audit`/`osv-scanner` with triage discipline
  (supply-chain.md).
- **SAST**: Semgrep with a curated ruleset (its JS/TS + framework packs cover the
  hotspot grep above with dataflow); keep the ruleset small enough that findings get
  read.
- **DAST-lite**: hit staging with ZAP baseline scan for header/cookie/CORS regressions.
- CodeQL/platform scanners where available. None of these understand *your*
  authorization model — that's what the tests above are for.

## Monitoring & response readiness

- Alert on: auth-failure spikes (per-IP and distributed), impossible travel on admin
  accounts, permission-change events, error-rate anomalies on money paths, egress to
  unknown hosts from server workloads.
- Keep the forensic trail: security events logged with actor/target/origin/time
  (secrets-and-data.md), retained and tamper-resistant (ship off-box).
- Pre-write the playbook while calm: how to rotate *every* credential class (deploy
  keys, DB URLs, JWT signing keys, OAuth secrets), how to kill all sessions, who calls
  what a breach. A leaked-secret drill (rotate a real key on purpose) finds the rusty
  parts before an incident does.
- Dependency-compromise response: pin the known-good lockfile, `overrides` the bad
  version, rotate CI + developer credentials that ran the malicious install.

## Reporting posture

When reviewing, report findings as: **what** (one line), **where** (file:line),
**impact** (who can do what to whom), **fix** (concrete change), ordered by
exploitability × blast radius. "Theoretically weak" findings go in a separate
hardening list — don't bury the IDOR under twelve missing-header notes.
