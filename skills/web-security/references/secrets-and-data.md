# Secrets, Crypto & Data Protection

## Secrets

A secret is anything that grants access: API keys, DB URLs, signing keys, service
tokens. Rules:

- **Live in the platform's secret store** (Vercel/CF/AWS env config, Doppler, Vault) —
  injected as env vars at runtime. Local dev uses `.env.local`, which is in
  `.gitignore` from commit zero.
- **Never in the client bundle.** `NEXT_PUBLIC_*` / `VITE_*` variables are compiled
  into public JavaScript — so are string literals in any file a client component
  imports. Enforce structurally: modules touching secrets start with
  `import "server-only"` so a client-side import breaks the build.
- **Never in git.** If a secret ever lands in a commit — even deleted a minute later —
  it is public: **rotate it**; history rewriting is cleanup, not remediation. Run a
  secret scanner (gitleaks/trufflehog) in CI and pre-commit.
- **Never in logs, error messages, or URLs.** Query strings end up in access logs,
  browser history, and Referer headers — tokens go in headers or cookies.
- Least privilege per credential (a read-only DB URL for the analytics job), unique
  per environment, rotated on staff departure and on any suspicion.

## Cryptography — choose, don't invent

Your job is picking the right vetted primitive and wiring it correctly:

| Need | Use | Never |
| --- | --- | --- |
| Password storage | argon2id / bcrypt (auth.md) | SHA-*, MD5, homemade |
| Random token/id with security meaning | `crypto.randomBytes(32)` / `crypto.randomUUID()` | `Math.random()`, timestamps |
| Integrity/authenticity (webhooks, cookies) | HMAC-SHA256, `crypto.timingSafeEqual` to compare | `===`, plain hash of secret+data |
| Encrypting data at rest | AES-256-GCM (unique random 12-byte IV per message, auth tag verified) or libsodium `secretbox` | ECB mode, static IVs, XOR |
| Signing tokens | EdDSA/ES256 via a maintained JWT/PASETO lib | Rolling your own format |
| Checksums/dedup (non-adversarial) | SHA-256 | MD5/SHA-1 where collision matters |

Implementation traps: reusing a GCM nonce is catastrophic (generate per encryption,
store alongside ciphertext); encryption keys come from a KMS/env — not hardcoded, not
derived from a password without a real KDF (scrypt/argon2); compare all secret-ish
strings with `timingSafeEqual` (equal-length check first).

**Security tokens at rest** (reset tokens, API keys, refresh tokens): store the
SHA-256 hash, compare against the hash — a DB leak must not hand out live credentials.
Show API keys once at creation; store prefix + hash for identification.

## PII & data minimization

- Collect only what the feature needs; the safest data is data you don't hold.
- **Select fields deliberately** at the API boundary. ORM habits leak:

```ts
// ❌ returns passwordHash, resetToken, stripeCustomerId… to the client
return db.user.findUnique({ where: { id } });

// ✅ allowlist the response shape (select or a DTO mapper)
return db.user.findUnique({ where: { id }, select: { id: true, name: true, avatarUrl: true } });
```

- The same applies to embedded relations (`include` pulling whole rows) and to
  "debug" fields in GraphQL types.
- Deletion means deletion: cascade or anonymize related rows, expire backups on a
  schedule, document retention.
- Encrypt especially-sensitive columns at rest (tokens, government ids, health data)
  with keys outside the DB.

## Error handling & logging

- **Clients get generic errors + a correlation id**; servers log the detail. Stack
  traces, SQL text, file paths, and dependency versions in responses are free recon.
- Disable framework debug pages in production; catch-all error boundaries return
  sanitized JSON, not `err.message` (which may embed query values).
- Uniform "not found": 404 for both nonexistent and unauthorized resources
  (authorization.md) — 403 confirms existence.
- **Structured logging with a redaction layer**: denylist keys (`password`, `token`,
  `authorization`, `cookie`, `secret`, card fields) redacted at the logger level (e.g.
  pino `redact`) so one forgotten `logger.info({ req })` doesn't archive credentials.
- Log security events (logins, failures, resets, permission changes, admin actions)
  with actor/target/origin/time — these are your forensics. Never log the credential
  itself.

## Client-side data hygiene

- The client stores nothing sensitive that isn't already the user's: no roles-as-truth,
  no feature-flag secrets, no other users' data "hidden" in the payload (view-source is
  an API client).
- `localStorage`: preferences, drafts — never tokens (auth.md).
- Third-party analytics: scrub PII from event payloads and URLs before they leave.
