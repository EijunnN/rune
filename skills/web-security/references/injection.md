# Injection — Keeping Data Out of Interpreters

Every injection class is the same bug: untrusted data reaches an interpreter (SQL
engine, browser HTML parser, shell, template engine) as *code*. The universal fix is
structural: **parameterize, encode for the exact output context, or map input to
server-side values** — never sanitize-and-hope.

Three distinct jobs, none substituting for another:

- **Validation** (boundary): is the shape right? `z.string().max(200)` — rejects junk,
  doesn't make data safe for any particular sink.
- **Parameterization** (transit): data travels in slots, not in the code string.
- **Encoding/sanitization** (exit): make data inert for *this* context — HTML body,
  attribute, URL, shell, log line each differ.

## SQL injection

```ts
// ❌ code and data mixed
await db.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ parameterized — placeholder API or tagged template that binds params
await db.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
await pool.query("SELECT * FROM users WHERE email = $1", [email]);
```

- ORMs are parameterized by default; audit their raw escape hatches
  (`$queryRawUnsafe`, `.raw()`, `sequelize.literal`, string-built `knex.raw`).
- **Identifiers** (table/column names, `ORDER BY` targets) cannot be parameterized —
  map through an allowlist: `const col = SORTABLE[input] ?? "created_at"`.
- `LIKE` input: escape `%` and `_` or wildcards become a scraping/DoS primitive.
- Defense in depth: the app's DB user gets least privilege (no DDL, no superuser), so
  a successful injection reads less and destroys nothing.

## XSS

React escapes **text children** automatically. XSS in React apps lives in the escape
hatches:

```tsx
// ❌ the classic
<div dangerouslySetInnerHTML={{ __html: user.bio }} />

// ✅ if HTML is truly required (rich text), sanitize with an allowlist sanitizer
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} />

// ✅ better: don't accept HTML — accept markdown/structured content and render
//    with a component tree (no raw HTML pass-through enabled)
```

- **URL attributes**: `href={user.website}` executes `javascript:alert(1)` on click.
  Allowlist protocols: parse with `new URL()` and require `http:`/`https:`/`mailto:`.
- **DOM XSS**: user data into `innerHTML` (via refs), `document.write`, `eval`,
  `new Function`, `setTimeout("string")` — never use these with any dynamic input;
  prefer never.
- **Stored XSS** is the dangerous one: data written by user A renders in user B's
  browser (comments, names, filenames, support tickets, admin panels viewing user
  data). Every render surface of user content is in scope — including emails and
  internal dashboards.
- **SVG and HTML uploads are XSS payloads** — see server-side.md (serve from a
  sandboxed origin or sanitize).
- Markdown renderers: disable raw HTML (`remark`/`rehype` default-safe modes) or
  sanitize after render.
- **CSP is the seatbelt, not the brakes**: a nonce-based CSP (headers-and-platform.md)
  turns many XSS bugs into non-events, but encoding remains the primary control.

## Command injection

```ts
// ❌ shell string interpolation — `; rm -rf /` is a filename now
exec(`convert ${file} out.png`);

// ✅ no shell, args as array
execFile("convert", [file, "out.png"]);
```

- `exec` spawns a shell; `execFile`/`spawn` (without `shell: true`) do not — prefer
  them always. Audit any `shell: true`.
- Even with args arrays, allowlist flag-like inputs — a filename of `-delete` is an
  argument injection into many tools.
- Best: avoid shelling out; use native libraries (sharp over ImageMagick CLI). If a
  queue of user files must hit a CLI, run it in a locked-down worker (no network,
  temp-only fs, timeouts).

## Path traversal

```ts
// ❌ ../../../../etc/passwd
fs.readFile(path.join(UPLOADS, req.query.name));

// ✅ resolve and verify containment — or better, map ids to paths server-side
const p = path.resolve(UPLOADS, name);
if (!p.startsWith(UPLOADS + path.sep)) throw new Forbidden();
```

The strongest form: clients never send paths or filenames at all — they send record
ids; the server owns the id → path mapping.

## NoSQL / query-object injection

`{ "password": { "$gt": "" } }` matches everything if you pass body values into Mongo
queries. Schema validation kills the whole class: `z.string()` guarantees a string
reaches the query, not an operator object. Same discipline for any query DSL built
from JSON.

## Prototype pollution

Deep-merging untrusted objects can set `__proto__`/`constructor.prototype`, corrupting
every object in the process:

- Validate with `.strict()` schemas before merging; never deep-merge raw input into
  config/state.
- `Object.create(null)` for dictionaries keyed by user input; `Map` is better.
- Keep merge/clone utilities patched (historic lodash CVEs live here).

## Other interpreters

- **Log injection**: encode newlines/control chars in logged user data or use
  structured logging (JSON) — forged log lines poison forensics.
- **CRLF/header injection**: never place user input in response headers unencoded;
  frameworks block `\r\n` — don't bypass them.
- **Template injection**: user input is template *data*, never template *source*
  (no user-controlled EJS/Handlebars strings).
- **`eval` family**: no dynamic code from any external source, ever. `node:vm` is not a
  security sandbox.
- **XML**: disable DTD/external entity resolution (XXE) in any XML parser config.
- **Regex/ReDoS**: user input as regex *pattern* needs escaping; catastrophic
  backtracking on user-*matched* input needs linear-time patterns or `re2`.
