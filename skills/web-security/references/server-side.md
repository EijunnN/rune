# Server-Side Request Handling — SSRF, CSRF, CORS, Uploads, Redirects

The server is a privileged network position (VPC access, cloud metadata, internal
services) and a trusted origin for browsers. Both trusts get abused through features
that *sound* harmless: URL previews, webhooks, file uploads, redirects.

## SSRF — the server fetches what the user says

Any server-side request whose destination a user can influence — webhook URLs, "import
from URL", link unfurling, PDF renderers fetching images, OG-preview endpoints:

```ts
// ❌ fetch(body.webhookUrl) — the attacker's URL is 169.254.169.254 or localhost:6379
```

Defenses, layered:

1. **Allowlist when possible** — known hosts/paths only (payment provider callbacks,
   fixed API bases). Most features can be an allowlist if you design them that way.
2. When arbitrary-ish URLs are the feature: parse with `new URL()`; require `https:`;
   **resolve DNS and reject private/reserved ranges** — `127.0.0.0/8`, `10.0.0.0/8`,
   `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (cloud metadata!), `0.0.0.0`,
   `::1`, `fd00::/8` — and pin the resolved IP for the actual connection (re-resolution
   is the DNS-rebinding hole).
3. **Follow redirects manually**, re-validating each hop (redirect-to-internal is the
   classic bypass). Cap redirects, size, and time.
4. Egress isolation: run fetchers in a network segment that simply cannot reach
   internal services; block the metadata endpoint at the infra level (IMDSv2 helps).
5. The response is untrusted input — validate before storing/rendering.

## CSRF — the browser sends cookies wherever it's told

State-changing requests must prove they originated from your app, not a hostile page
the victim visited:

- **`SameSite=Lax`** (default it) blocks the classic cross-site POST; `Strict` for
  admin surfaces. This is the foundation, not the whole answer.
- **Verify `Origin`** (or `Referer` fallback) server-side on mutations — reject
  mismatches. Frameworks with server actions (Next.js) do origin checks; API routes
  you wire yourself.
- High-value ops (money, credentials): add explicit CSRF tokens (double-submit or
  synchronizer pattern) — belt and suspenders.
- **Never mutate on GET** — `<img src="/api/delete?id=1">` needs no JavaScript.
- Cookie-less APIs (Bearer tokens) are CSRF-immune but XSS-exposed; that trade is why
  tokens live in HttpOnly cookies + CSRF controls (auth.md).

## CORS — who may *read* responses

CORS controls whether cross-origin JS can read your responses (it never blocks the
request from *arriving* — authorization still happens server-side):

- Exact-match allowlist of origins. **Never reflect the request's `Origin` header**
  combined with `Access-Control-Allow-Credentials: true` — that's "any site may act as
  any logged-in user".
- `*` is acceptable only for truly public, cookie-less data.
- Don't widen methods/headers beyond need; cache preflights (`Access-Control-Max-Age`).
- `null` origin is not a safe origin (sandboxed iframes send it) — don't allowlist it.

## File uploads — hostile bytes with a filename

- **Validate the content, not the claim**: `file.type` and the extension are
  client-controlled. Check magic bytes (`file-type` package) against an allowlist;
  where feasible **re-encode** (images through sharp) which destroys embedded payloads.
- **Generate the stored name** (`crypto.randomUUID()` + safe extension); keep the
  original name only as display metadata, encoded on output. Never join user filenames
  into fs paths (injection.md → traversal).
- Cap size at the edge (body limit) *and* per-type; stream to disk/object storage —
  don't buffer whole files in memory.
- **Store outside the webroot** — object storage (S3/R2) is ideal; serve via signed
  URLs or a proxy that sets explicit `Content-Type`, `Content-Disposition` and
  `X-Content-Type-Options: nosniff`.
- **SVG/HTML/PDF are active content** — they execute script when rendered same-origin.
  Sanitize SVGs (DOMPurify) or, better, serve all user files from a **separate
  sandboxed domain** (`usercontent.example.net`) so a payload executes in a worthless
  origin.
- Archives: zip-slip (entry paths with `../`) and zip bombs — validate entry paths and
  cap decompressed size.
- Presigned upload URLs: constrain content-type, size, and key prefix; never let the
  client pick an arbitrary key (overwriting others' files).

## Redirects

`redirect(searchParams.next)` is phishing infrastructure — `?next=https://evil.tld`
rides your trusted domain:

- Allow **relative paths only** (must start with exactly one `/`, reject `//` and
  `/\`), or map named destinations server-side.
- OAuth `redirect_uri` gets exact-match registration (auth.md).

## Webhooks (receiving)

- **Verify signatures** (HMAC from the provider — Stripe-style `t=…,v1=…` with a
  timestamp window against replay) using `crypto.timingSafeEqual`; reject unsigned.
- Treat payloads as untrusted input: schema-validate before acting; fetch the
  authoritative object from the provider's API when the stakes are high.
- Idempotency: providers redeliver — key processing on the event id.
- The webhook endpoint is unauthenticated *by design*; rate-limit it and keep it
  narrow.

## Server actions & internal-looking endpoints

Anything reachable over HTTP is public: cron handlers, "internal" APIs, GraphQL
introspection, debug routes. Protect them with real auth (signed headers, OIDC between
services) — not obscurity, not IP checks alone, and definitely not `NODE_ENV` checks.
