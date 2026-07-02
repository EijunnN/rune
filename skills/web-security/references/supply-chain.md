# Supply Chain — Dependencies, CI/CD & Publishing

`npm install` executes strangers' code on your machine and ships it to every user with
your app's full authority. The 2024–2025 wave of hijacked-maintainer attacks made this
concrete: popular packages shipped credential stealers for hours before detection.
Treat the dependency graph as your largest attack surface.

## Choosing dependencies

Before adding anything, in order:

1. **Can we not?** Ten lines of vendored code beat a dependency with 40 transitive
   deps. Left-pad taught the availability lesson; the security lesson is identical.
2. Evaluate: maintenance activity, download base, issue hygiene, number of transitive
   deps (`npm ls --all | wc -l` shock test), install scripts present?, provenance
   published? Prefer platform APIs (fetch, WebCrypto, `node:` builtins) over wrappers.
3. **Exact-name discipline**: typosquats live one keystroke away (`lodash` vs
   `1odash`). Copy names from the registry page, not from memory or chat suggestions —
   hallucinated-package squatting is a real vector against AI-assisted coding.
   Verify a package *exists and is the famous one* before installing.

## Lockfiles & installation

- **Lockfile committed, always** — it's the only record of what actually runs.
  CI installs with `npm ci` / frozen lockfile (`bun install --frozen-lockfile`,
  `pnpm install --frozen-lockfile`) so builds can't silently drift.
- **Install scripts are the #1 payload delivery.** Bun and pnpm block lifecycle
  scripts by default and allowlist per-package (this repo's `trustedDependencies`) —
  keep that posture; audit before trusting a new package's scripts. With npm, consider
  `ignore-scripts=true` in `.npmrc` and explicit exceptions.
- Version pinning: exact or narrow ranges + automated update PRs (Renovate/Dependabot)
  reviewed like code — a dependency bump diff *is* code you're adopting. A short cooling
  period before adopting brand-new releases (e.g. Renovate `minimumReleaseAge`) dodges
  most hijack windows, which get caught within days.
- `npm audit`/`bun audit` in CI with triage: fix criticals in direct deps immediately;
  evaluate transitive noise honestly (`overrides` to force-patch when upstream lags).

## Dependency confusion

If you use internal packages, an attacker publishing the same name publicly can win
resolution:

- Scope internal packages (`@yourorg/…`) and claim the scope on the public registry.
- Registry config binds the scope to your private registry (`.npmrc`
  `@yourorg:registry=…`); CI must not fall back to the public registry for scoped names.

## CI/CD hardening

The pipeline holds deploy keys and publishes artifacts — it's production:

- **Pin GitHub Actions by full commit SHA** (`uses: actions/checkout@<sha>`), not
  by tag — tags move (the tj-actions compromise rewrote tags to steal secrets).
- **Least-privilege `GITHUB_TOKEN`**: top-level `permissions: contents: read`,
  escalate per-job only as needed.
- **Fork PRs are untrusted code execution**: never expose secrets to
  `pull_request`-triggered runs; treat `pull_request_target` + checkout-of-PR-code as
  the known foot-gun it is.
- Secrets: OIDC federation to cloud providers over long-lived keys; scoped, expiring
  tokens; audit which workflows can reach which secrets.
- Build provenance: `npm publish --provenance` for anything you publish; verify
  signatures/attestations where your platform supports it.

## Publishing (if you ship packages)

- 2FA (hardware-backed WebAuthn where supported) on registry accounts; granular automation tokens scoped to
  single packages; publish only from CI with provenance.
- `files` allowlist in package.json — don't ship `.env`, test fixtures, or source maps
  with secrets; `npm pack --dry-run` review before first publish.
- No install scripts in your own packages unless truly unavoidable — you're asking
  every consumer to trust what you just learned not to.

## Runtime supply chain

- **Never fetch-and-eval remote code** at runtime (plugins from URLs, remote config
  that becomes code). Config is data; validate it like input.
- Third-party browser scripts: covered in headers-and-platform.md — same threat,
  client side.
- Docker/base images: pin by digest, minimal images (distroless/alpine), scan in CI,
  rebuild on base-image CVEs — `latest` is a moving target you don't control.
- AI-generated code (yes, including this agent's): review dependency suggestions
  against the real registry; treat generated auth/crypto/query code to the same review
  as human code — the review-and-testing.md checklist applies to every author.
