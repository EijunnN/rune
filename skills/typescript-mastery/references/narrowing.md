# Narrowing & Control Flow

Narrowing is how you hand the compiler evidence. The compiler tracks each variable's possible type through the code (control-flow analysis); every check you write either narrows or doesn't. When "it should know by now" fails, one of the rules below explains why.

## The narrowing toolbox

```ts
if (typeof x === "string") { ... }          // primitives
if (x instanceof Date) { ... }              // classes (same-realm caveat: fails across iframes/workers)
if ("kind" in shape) { ... }                // property existence
if (x != null) { ... }                      // kills null AND undefined in one check
if (x === "a" || x === "b") { ... }         // literal equality
while (queue.length > 0) queue.pop()!;      // length checks don't narrow element types — see below
```

**Discriminated unions — the crown jewel.** Give every variant a literal `kind`/`status`/`type` field; switch on it:

```ts
type Result<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: AppError };

switch (r.status) {
  case "ok":    return r.data;      // narrowed to the ok variant
  case "error": return log(r.error);
  default:      return assertNever(r); // exhaustiveness — see below
}
```

Design unions so the discriminant is a **literal** on every member. Optional-property bags (`{ data?: T; error?: E }`) don't narrow — `if (r.data)` proves nothing about `r.error`.

**Exhaustiveness enforcement** — make adding a variant break every unhandled switch:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
```

If the `default` receives anything other than `never`, the call errors at compile time. For expression positions: `x satisfies never`.

## Custom guards — when built-ins can't express it

```ts
function isUser(v: unknown): v is User {
  return typeof v === "object" && v !== null && "id" in v && typeof (v as any).id === "string";
}
```

- `v is User` is a **promise you must keep** — the compiler trusts the annotation, not the body (it checks the body only loosely). A wrong guard is an `as` with better PR. For nontrivial shapes prefer a schema parse (runtime-boundaries.md).
- **Assertion functions** for "throw if wrong" style: `function assertUser(v: unknown): asserts v is User`. After the call, the type is narrowed in the current scope. Also `asserts cond` for plain invariants (`function invariant(cond: unknown, msg: string): asserts cond`).
- TS 5.5+ **infers** guards for simple returns (`const isString = (v: unknown) => typeof v === "string"` gets `v is string` automatically) — and `arr.filter(x => x != null)` now narrows without the `is` boilerplate.

## Why it didn't narrow — the classic walls

1. **Narrowing doesn't survive function boundaries.** A check inside `items.forEach(...)` callback doesn't see narrowing from outside, and calling `check(x)` doesn't narrow `x` (unless `check` is a guard/assertion function).
2. **Mutable closures reset.** After a check, if the variable is `let`/captured and *could* have been reassigned (any function call in between, or use inside a callback), analysis conservatively widens back. Fix: copy to a `const` right after narrowing — `const u = maybeUser; if (!u) return;` — everything after sees `User`.
3. **Property access chains don't cache.** `if (a.b) use(a.b)` narrows, but `if (a.b) cb(() => a.b)` doesn't. Same fix: `const b = a.b`.
4. **Array index access**: with `noUncheckedIndexedAccess`, `arr[0]` is `T | undefined` even after `arr.length > 0` (mostly — TS narrows some direct patterns, not clever ones). Use `arr.at(0)`, destructuring with a check, or `.shift()`-style APIs that return `T | undefined` honestly.
5. **`in`/`typeof` on generics** narrows values, not type parameters — inside `function f<T extends A | B>(x: T)`, checks narrow `x` but `T` stays put; return-type tricks with `T` may need overloads or conditional types.
6. **Discriminant must be accessed directly.** `const { status } = r; if (status === "ok") r.data` — destructured discriminants narrow the destructured *siblings* only in TS 4.6+ and only when the union is "well-formed"; when it fails, switch on `r.status` directly.

## Truthiness traps

`if (x)` also excludes `0`, `""`, and `NaN`. For "is it present": use `x != null` or `x !== undefined`. Real bugs: `if (count) ...` skipping zero, `if (name) ...` skipping empty string. Reserve truthiness for booleans and objects.

## Widening, `const`, and literal types

- `let s = "a"` → `string`; `const s = "a"` → `"a"`. Object properties widen (`{ mode: "dark" }` → `{ mode: string }`) unless `as const` or a contextual type holds them narrow.
- Passing literals into functions keeps them narrow only if the parameter type asks (`mode: "dark" | "light"` or a `const` type parameter, TS 5.0+: `function f<const T>(x: T)`).
- When a lookup table loses its literal keys, you annotated instead of `satisfies` — see objects-functions.md.

## Equality & `unknown` narrowing

`unknown` narrows with every tool above — that's the entire point of preferring it to `any`. Also useful: `Array.isArray(x)` (narrows to `any[]` — follow with element checks), `Number.isFinite(x)` narrows to `number` (TS 5.x lib), and comparing two variables (`if (a === b)`) narrows both toward their intersection.
