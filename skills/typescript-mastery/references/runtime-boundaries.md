# Runtime Boundaries — Where Types Meet Reality

Types are erased at runtime. Every value entering from outside — network, storage, env, forms, files, `postMessage`, third-party callbacks — arrives as a **claim**, not a fact. The doctrine: *parse, don't assert*. One validated checkpoint at the edge buys typed calm everywhere inside.

## The anti-pattern and the pattern

```ts
// LIE — compiles, then explodes at 2am:
const user = (await res.json()) as User;

// PARSE — fails loudly, at the boundary, with a message:
const user = UserSchema.parse(await res.json());   // typed User or thrown ZodError
```

`res.json()` returns `any` (some lib.dom versions type it `unknown` — treat it as unknown regardless). Same for `JSON.parse`, `localStorage`, `process.env`, message events, and DB driver rows.

## Schema validation (zod as the lingua franca)

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
  createdAt: z.coerce.date(),          // accepts string/number, outputs Date
});
type User = z.infer<typeof UserSchema>; // derive the type — never write it twice
```

- `.parse` throws; `.safeParse` returns a discriminated union `{ success: true, data } | { success: false, error }` — prefer safeParse in request handlers (map to a 400, don't 500).
- Compose: `z.array(UserSchema)`, `.pick()/.omit()/.extend()`, discriminated unions via `z.discriminatedUnion("type", [...])`.
- Distinguish **input vs output** types when transforms/coercions exist: `z.input<typeof S>` vs `z.infer` (= output).
- Alternatives, same doctrine: valibot (smaller bundles), ArkType (fast, TS-syntax), typia (compile-time). For servers: fastify/Hono/tRPC integrate schemas directly — validate at the router, handlers receive proven types.
- **Where to validate**: external API responses, all user input, env/config at startup (fail fast — `EnvSchema.parse(process.env)` once, export the result), queue messages, webhook payloads, `JSON.parse` of anything you didn't just stringify. **Where not to**: between your own internal functions — that's what the type system is for.

## Assertion discipline (`as`)

Legitimate uses are narrow:
1. **Up-casting to a supertype / widening** — always safe (`satisfies` often better).
2. **Const assertions** — `as const` (not a lie; a narrowing request).
3. **Locally-provable facts the checker can't follow** — `document.getElementById("root") as HTMLElement` when you own the HTML; a comment stating the invariant is part of the assertion.
4. **Generic implementation guts** (see generics.md).

Everything else — especially `as SomeShape` on external data — is a deferred runtime error. `x as unknown as Y` (the double assertion) is the loudest possible smell: the compiler said *these types don't even overlap* and was overruled.

Non-null assertion `x!` is a micro-`as`. Fine immediately after a check the compiler can't see (`map.get(k)!` right after `map.has(k)`, `array[i]!` inside a bounds-checked loop); ban it on anything that crossed an await/callback since the check.

## Branded / nominal types

Structural typing means any `string` passes for any other `string`. Brand identifiers and validated values:

```ts
type UserId = string & { readonly __brand: "UserId" };
type Email  = string & { readonly __brand: "Email" };

const UserId = (s: string): UserId => {
  if (!/^u_[a-z0-9]{12}$/.test(s)) throw new Error(`bad UserId: ${s}`);
  return s as UserId;   // the one sanctioned cast: inside the smart constructor
};
```

Now `getUser(orderId)` is a compile error, and holding a `UserId` *proves* it was validated. Zod: `z.string().brand<"UserId">()`. Use for: ids of different entities, sanitized HTML vs raw strings, validated email/URL, currency-in-cents vs float, absolute vs relative paths.

## Errors across boundaries

```ts
try { ... } catch (e) {                       // e: unknown (useUnknownInCatchVariables ⊂ strict)
  if (e instanceof ApiError) return e.status;
  const message = e instanceof Error ? e.message : String(e);
  log.error({ message });
  throw e;                                     // rethrow what you don't understand
}
```

- Anything can be thrown (`throw "oops"`), so `unknown` is the honest type. Never `catch (e: any)` your way past it.
- For *expected* failures, return a discriminated result instead of throwing — the caller is then forced by the compiler to handle both arms:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Throwing stays for *unexpected* invariant violations. Don't build a full effect-system religion in a codebase that isn't bought in — a local `Result` for fallible operations (parsers, fetchers, FS) captures most of the value.

- `Error.cause` (`new Error("ctx", { cause: e })`) preserves chains across wrap points; type custom errors with a discriminant field (`code: "RATE_LIMIT"`) so handlers can switch exhaustively.

## Env & config pattern (complete example)

```ts
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().default(3000),
});
export const env = Env.parse(process.env);    // crashes at boot, not at first use
```

Import `env`, never `process.env`, everywhere else. The same shape works for feature flags, CLI args, and JSON config files.
