# Authentication, Sessions & Identity

First decision: **don't build auth if you can adopt it** (Auth.js, Clerk, WorkOS, your
IdP). But adopt with understanding — misconfigured auth libraries fail exactly like
hand-rolled auth, just with better docs. Everything below applies either way.

## Passwords

- Hash with **argon2id** (preferred, memory-hard) or **bcrypt** (fine; note its 72-byte
  input truncation — reject or pre-hash longer passwords deliberately). Never general
  hashes (MD5/SHA-*) — GPUs eat billions per second.
- Per-password salt is built into both — never reuse or omit.
- Verify with the library's compare function (constant-time). Never `===` on hashes.
- Policy: length ≥ 8–12, allow all characters and long passphrases, check against
  breached-password lists; skip composition rules and forced rotation (they reduce
  entropy in practice).
- On login failure return one uniform message ("Invalid credentials") with uniform
  timing — run the hash compare even when the user doesn't exist (compare against a
  dummy hash) so timing doesn't enumerate accounts.

## Sessions

- Prefer **server-side sessions**: opaque CSPRNG id in a cookie, session data in a
  store (DB/Redis) you can inspect and revoke.
- Cookie flags, always: `HttpOnly` (XSS can't read), `Secure` (HTTPS only),
  `SameSite=Lax` (or `Strict` for admin surfaces), explicit `Path=/`, and the
  `__Host-` prefix when possible (locks Secure + no Domain + Path=/).
- **Regenerate the session id on login and on privilege change** — otherwise a
  pre-login id planted by an attacker survives authentication (session fixation).
- Timeouts: idle timeout (e.g. 30–60 min sliding) + absolute lifetime (e.g. 7–30 days).
  Logout destroys the session server-side, not just the cookie.
- "Log out everywhere" and password change invalidate *all* of the user's sessions.

## JWTs — if you must

Stateless tokens trade revocability for scale. Rules when using them:

- **Verify with an algorithm allowlist** pinned server-side (`{ algorithms: ["EdDSA"] }`
  or RS256/ES256). Never accept the header's word for it — `alg: none` and RS→HS
  confusion are classic full bypasses.
- Always validate `exp`, `iss`, `aud`. Short access-token lifetime (minutes), refresh
  token rotation with reuse detection (a replayed old refresh token nukes the family).
- Payloads are **readable by anyone** (base64, not encryption) — no secrets or PII.
- Storage in the browser: HttpOnly cookie. `localStorage`/`sessionStorage` is readable
  by any XSS payload; "but we have no XSS" is not a control.
- Revocation needs a plan before you need it: short expiry + a small denylist keyed by
  `jti`, or accept server-side sessions were the right call.

## Password reset & magic links

The reset flow is an authentication bypass with extra steps — treat it accordingly:

- Token: CSPRNG ≥128 bits, **stored hashed** in the DB (a DB leak must not mint
  sessions), single-use, short expiry (≤1h), bound to the account.
- Response is identical whether the email exists or not ("If that account exists,
  we sent a link") — same status, same timing shape.
- Consuming the token: invalidate it, invalidate *other* active reset tokens, set the
  password, invalidate existing sessions, notify the email on file.
- Never ship the new password or a session in the email. Never trust `Host` headers to
  build the link (host-header injection poisons reset URLs) — use a configured base URL.
- Magic-link login: same token rules, plus rate-limit sends and require the link to be
  opened in a same-device context where feasible.

## Rate limiting & abuse

- Layer limits: per-IP (broad, generous), per-account (tight), per-route class
  (login/reset/signup tighter than reads).
- Lockout with care — hard lockout hands attackers a denial-of-service button. Prefer
  escalating delays + CAPTCHA after N failures, and alert on distributed patterns
  (credential stuffing looks like 1 attempt × 100k accounts).
- Sign-up needs limits too (mass account creation) and email verification before the
  account can act.

## MFA

- TOTP: store the seed encrypted; window of ±1 step; rate-limit attempts (6 digits is
  brute-forceable unthrottled); require current session + password to enroll or remove.
- Recovery codes: generated once, shown once, **stored hashed**, single-use each.
- WebAuthn/passkeys are the strongest option and phish-resistant — prefer offering them.
- Step-up: re-prompt (password or MFA) before dangerous actions — email change, MFA
  removal, payout details, deleting the org.

## OAuth / OIDC (as a client)

- Use **authorization code flow with PKCE**. Implicit flow is dead.
- `state`: random per request, verified on callback (CSRF on the OAuth handshake).
- `redirect_uri`: exact-match registration — wildcard or prefix matching leaks codes.
- Validate the ID token: signature against the provider's JWKS, `iss`, `aud` (your
  client id), `exp`, `nonce` if used.
- Account linking by email is dangerous when the provider doesn't verify emails
  (attacker registers victim@ at a lax provider → takes over the local account). Only
  auto-link on `email_verified: true` from providers you trust, else require login-first
  linking.
- An access token is authorization to call an API, **not proof of who the caller is** —
  don't accept raw access tokens as login.

## Anti-patterns

| Smell | Why it burns |
| --- | --- |
| `if (user.password === input)` | Plaintext storage + timing leak in one line |
| "Email not registered" on login/reset | Account enumeration oracle |
| JWT verified with `decode()` not `verify()` | No verification at all — common lib footgun |
| Session id unchanged across login | Session fixation |
| Reset token in DB as plaintext | DB read becomes account takeover |
| MFA check only in the UI flow | Call the API directly, skip the modal |
| OAuth callback without `state` | Login CSRF — attacker attaches their identity |
