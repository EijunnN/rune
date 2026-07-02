---
name: web-security
description: Defensive security doctrine for building and reviewing web applications — authentication and sessions, authorization and IDOR, injection (XSS, SQL, command), SSRF, CSRF, file uploads, secrets management, security headers and CSP, supply-chain hygiene, and a security review methodology. Use when writing or reviewing auth flows, API routes, server actions, database queries, file handling, or anything that touches user input, secrets, or third-party dependencies — and whenever asked to security-review code.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Web Security

Defensive doctrine for code that survives contact with the internet. Two axioms govern
everything below: **all input is hostile until proven otherwise**, and **every check
that matters runs on the server**. Security is not a feature to add later — it's a
property of where you put the checks.

## Reference map

Read the matching reference **before** writing code in that area; read several when
doing a full review.

| Task involves | Read |
| --- | --- |
| Login, passwords, sessions, JWTs, OAuth, password reset, MFA | [references/auth.md](references/auth.md) |
| Who can access what — roles, ownership, tenants, admin routes | [references/authorization.md](references/authorization.md) |
| Rendering user content, SQL, shell commands, HTML/markdown | [references/injection.md](references/injection.md) |
| Server-side fetches, webhooks, uploads, redirects, CORS, CSRF | [references/server-side.md](references/server-side.md) |
| Secrets, tokens, crypto, PII, logging | [references/secrets-and-data.md](references/secrets-and-data.md) |
| CSP, cookies, HSTS, clickjacking, third-party scripts | [references/headers-and-platform.md](references/headers-and-platform.md) |
| Dependencies, lockfiles, CI/CD, install scripts | [references/supply-chain.md](references/supply-chain.md) |
| Security reviews, threat modeling, abuse cases, security tests | [references/review-and-testing.md](references/review-and-testing.md) |

## Non-negotiables

1. **Authorize at the resource, on every request.** Route-level auth says *who you
   are*; resource-level auth says *what's yours*. Assume every ID in a request is an
   IDOR attempt until ownership is checked.
2. **Client-side checks are UX.** Hidden buttons, disabled inputs, and frontend
   validation stop nobody. The server re-checks everything.
3. **Parameterize every interpreter.** No string-built SQL, shell commands, or HTML.
   Data stays data.
4. **Validate shape at the boundary, encode at the output.** Zod (or equivalent) where
   input enters; context-appropriate encoding where it leaves. These are different jobs;
   neither substitutes for the other.
5. **Every server action and API route is a public endpoint** — including the ones only
   your UI calls, including webhooks, including cron handlers.
6. **Auth tokens live in HttpOnly cookies** (`Secure`, `SameSite`), never in
   `localStorage`. What JavaScript can read, XSS can steal.
7. **Passwords get argon2id or bcrypt.** Security tokens come from a CSPRNG (≥128
   bits), are stored hashed, expire, and work once. `Math.random()` is never security.
8. **No secrets in client bundles, git history, or logs.** Anything a browser downloads
   is public. A leaked secret is rotated, not deleted.
9. **Never fetch a user-influenced URL** without an allowlist and private-network
   blocking. Webhooks, previews, and "import from URL" are SSRF until proven otherwise.
10. **Uploads are hostile files**: verify magic bytes, cap size, generate the filename,
    store outside the webroot, serve with an explicit content-type.
11. **Mutations never ride on GET**, and every state change is CSRF-protected
    (`SameSite` + origin checks, tokens for high-value ops).
12. **Errors are generic to clients, detailed in server logs.** Stack traces, query
    text, and "user not found" (vs "wrong password") all leak.
13. **Don't invent crypto or auth protocols.** Use vetted primitives and libraries;
    your job is choosing and wiring them correctly.
14. **Dependencies are code you run with full trust.** Minimal deps, committed
    lockfiles, install scripts distrusted by default.
15. **Defense in depth.** CSP, headers, rate limits, and scoped DB users exist because
    something above them will eventually fail.

## Decision framework — untrusted input pipeline

Every value from outside (body, params, headers, cookies, files, webhooks, third-party
APIs, your own DB when others write to it) passes through:

1. **Validate shape on arrival** — parse with a schema, reject don't sanitize:
   wrong shape → 400, unknown fields dropped (mass-assignment guard).
2. **Keep it as data in transit** — parameterized queries, args arrays for processes,
   IDs not paths, allowlisted enum values not free strings.
3. **Encode at the exit for its context** — HTML body vs attribute vs URL vs SQL vs
   shell vs log line each have different rules. React encodes text children; everything
   that bypasses that (`dangerouslySetInnerHTML`, `href`, raw responses) is on you.

If input must reach a dangerous sink (fs path, fetch URL, shell), don't pass the input —
pass a server-side mapping of it (id → known path, key → known URL, enum → known flag).

## Decision framework — where does this check go?

- **Authentication** → once, in middleware/session layer. Produces a trusted identity.
- **Authorization** → in the route handler / server action **and** scoped into the
  query itself (`where: { id, ownerId: session.user.id }`) so forgetting is impossible.
  Middleware alone is not authorization (framework bypasses exist — see authorization.md).
- **Validation** → at every trust boundary, even service-to-service.
- **Rate limiting** → auth endpoints, expensive operations, per-IP and per-account.
- **Business invariants** (price, quantity, state transitions) → server, from the
  database, never trusting client-supplied amounts.

## Decision framework — reviewing code for security

Work source → sink, not file by file:

1. **Inventory entry points**: routes, server actions, webhooks, cron jobs, upload
   handlers, websocket messages.
2. Per entry point: authenticated? authorized *against the resource*? input
   schema-validated?
3. **Find the sinks**: DB calls, `child_process`, `fs`, server-side `fetch`, HTML
   rendering, redirects, response headers. Is the path from input to sink parameterized/
   encoded/allowlisted?
4. **Secrets sweep**: client bundle imports, logs, error responses, git history.
5. **Grep hotspots**: `dangerouslySetInnerHTML`, `eval`, `new Function`, `execSync`,
   `exec(`, `$queryRawUnsafe`, `spawn(... { shell: true })`, `fs.` + user data,
   `redirect(` + user data, `Access-Control-Allow-Origin`, `NEXT_PUBLIC_`.

## Anti-pattern quick table

| Smell | Fix | Reference |
| --- | --- | --- |
| `WHERE id = ${params.id}` (no ownership) | Scope query by session user/tenant | authorization.md |
| Query/command built by string concat | Parameterized query / args array | injection.md |
| `dangerouslySetInnerHTML` with user content | Sanitize (DOMPurify) or render as text | injection.md |
| JWT in `localStorage` | HttpOnly cookie; short expiry + rotation | auth.md |
| `fetch(userProvidedUrl)` on the server | Allowlist hosts; block private IPs | server-side.md |
| Upload trusting `file.type` / original name | Magic bytes, generated name, off-webroot | server-side.md |
| Secret in `NEXT_PUBLIC_*` / shipped to client | Server-only module + platform secret store | secrets-and-data.md |
| `Math.random()` for tokens/ids with security meaning | `crypto.randomBytes` / `randomUUID` | secrets-and-data.md |
| `res.send(err.message)` / stack traces in prod | Generic client error + structured server log | secrets-and-data.md |
| `Access-Control-Allow-Origin` reflecting Origin + credentials | Exact-match allowlist | server-side.md |
| Admin check only in middleware / only in UI | Re-check role in each handler + data layer | authorization.md |
| `npm i` of a barely-maintained dep for 10 lines | Inline the 10 lines | supply-chain.md |

## Review checklist

**Identity** — passwords hashed (argon2id/bcrypt); sessions regenerate on login; cookies
`HttpOnly Secure SameSite`; reset tokens single-use/hashed/expiring; login rate-limited;
uniform errors (no enumeration).
**Access** — every handler authorizes the resource; queries scoped by owner/tenant;
admin functions re-check role; no mass assignment (schema allowlists fields).
**Input/Output** — schemas at boundaries; parameterized SQL; no shell string interp;
user HTML sanitized; URL protocols allowlisted (`javascript:` blocked).
**Server-side** — no user-controlled fetch destinations; redirects allowlisted; CSRF
covered for mutations; CORS exact-match; uploads validated and quarantined.
**Secrets/Data** — nothing sensitive in bundle/git/logs; tokens hashed at rest; crypto
from vetted libs; responses select fields deliberately (no `SELECT *` DTO leaks).
**Platform** — CSP (nonce-based) deployed; HSTS; `nosniff`; `frame-ancestors`; security
headers on every response, not just pages.
**Supply chain** — lockfile committed; new deps justified; install scripts gated; CI
tokens least-privilege; secret scanning enabled.

## Ecosystem notes (Next.js / React / Node)

- **Next.js middleware is not an authorization layer** — header-spoofing bypasses have
  shipped (e.g. CVE-2025-29927, `x-middleware-subrequest`). Use middleware for redirects
  and coarse gating; authorize in every route handler / server action / data function.
- `NEXT_PUBLIC_*` (and `VITE_*`) env vars are **compiled into the client bundle**.
  Mark server-only modules with `import "server-only"` so a client import fails the build.
- React escapes text children — its escape hatches (`dangerouslySetInnerHTML`, `href`,
  refs + `innerHTML`) are exactly where XSS lives in React apps.
- Server actions: Next checks `Origin`, but each action still authenticates, authorizes,
  and validates like any endpoint (see the react-mastery rune's modern-react.md).
- Node: prefer `execFile`/`spawn` with args arrays; `timingSafeEqual` for comparing
  secrets; `bun`/`pnpm` gate install scripts by default — keep it that way.
