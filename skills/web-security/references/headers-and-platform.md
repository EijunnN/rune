# Security Headers, CSP & Browser Platform

Headers are defense in depth: they turn classes of bugs (XSS, clickjacking, MIME
confusion) into non-events. Apply them to **every response** — API routes and error
pages included, not just HTML pages.

## The baseline set

```ts
// next.config.ts — applies app-wide
headers: async () => [{
  source: "/(.*)",
  headers: [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-Frame-Options", value: "DENY" }, // legacy; CSP frame-ancestors is the real control
  ],
}],
```

- **HSTS**: forces HTTPS after first visit. Add `preload` only when every subdomain is
  HTTPS-ready forever — it's effectively irreversible.
- **nosniff**: stops MIME-sniffing uploads/responses into executable types — pairs
  with upload rules (server-side.md).
- **Referrer-Policy**: `strict-origin-when-cross-origin` keeps paths (and tokens
  someone wrongly put in URLs) from leaking to other origins.
- **Permissions-Policy**: switch off powerful APIs you don't use.

## Content-Security-Policy — the XSS seatbelt

A nonce-based policy neutralizes injected `<script>` even when an encoding bug slips
through:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
```

- **Nonce-based `script-src`** (fresh CSPRNG nonce per request, attached to your own
  `<script>` tags) + `'strict-dynamic'` (trusted scripts may load their chunks — needed
  for modern bundlers). Allowlist-of-domains CSP is weak (JSONP/gadget bypasses);
  `'unsafe-inline'` for scripts defeats the point entirely.
- **`object-src 'none'`, `base-uri 'self'`** close plugin and `<base>`-hijack vectors.
- **`frame-ancestors`** is the clickjacking control (supersedes X-Frame-Options):
  `'none'`, or the exact allowed embedder.
- **`form-action`** stops injected `<form>` exfiltration — the bypass class people
  forget.
- Rollout: start with `Content-Security-Policy-Report-Only` + a `report-to` endpoint,
  watch a week of violations, then enforce. In Next.js generate the nonce in
  middleware/root layout so framework scripts receive it.

## Cookies (consolidated)

`__Host-` prefix + `HttpOnly; Secure; SameSite=Lax; Path=/` is the default shape for
session cookies (details in auth.md). Non-session cookies (prefs) still get `Secure`
and tight scope. Audit any cookie with `Domain=` set — it's shared with every
subdomain, including the forgotten marketing site with the XSS.

## Third-party scripts — XSS as a service

Every `<script src="https://third.party/...">` runs with your origin's full power:
sessions, DOM, keystrokes.

- Default answer is **no**. Each vendor script is a standing grant of total client-side
  access to an org you don't audit.
- Tag managers are arbitrary-code injection consoles for whoever holds the marketing
  login — if unavoidable, lock publishing rights and review containers.
- Static third-party assets you must load: **Subresource Integrity**
  (`integrity="sha384-…" crossorigin="anonymous"`) or better, self-host.
- Embeds (support chat, video) go in **sandboxed iframes**
  (`sandbox="allow-scripts allow-same-origin"` minus what they don't need) rather than
  inline scripts, when the vendor allows.

## Isolation extras

- **User-generated content domain**: serve uploads/previews from a separate registrable
  domain (`example-usercontent.net`) — cookies, storage, and CSP stay isolated
  (server-side.md).
- **COOP/COEP/CORP** (`Cross-Origin-Opener-Policy: same-origin`) when you handle
  especially sensitive data or need `SharedArrayBuffer`; they cut cross-origin
  window/leak channels.
- **Sandboxed iframes for user HTML**: `sandbox` without `allow-same-origin` renders
  hostile HTML in a null origin — the right home for email previews and rich-content
  sandboxes.

## Transport

- HTTPS everywhere including internal hops where feasible; redirect HTTP → HTTPS at the
  edge; no mixed content (CSP `upgrade-insecure-requests` during migrations).
- TLS config lives at the platform/CDN layer — keep it modern (TLS 1.2+), don't
  hand-roll Node TLS servers when a proxy terminates better.
- WebSockets: `wss://` only; authenticate the upgrade request (cookies/`Origin` check —
  cross-site WebSocket hijacking is CSRF's cousin) and re-authorize messages
  server-side.
