# Objects, Functions & Everyday Type Design

## `interface` vs `type` — settle it in one paragraph

Mechanical differences: interfaces **merge declarations** (needed for augmentation — declarations-publishing.md), `extends` gives better errors and caching than `&`; type aliases express unions, tuples, mapped/conditional types, and primitives (interfaces can't). Performance: `extends` chains check faster than deep intersections. Doctrine: **pick one default per codebase and stay consistent** — `interface` for object shapes that others implement/extend (public APIs, options objects), `type` for everything else (unions, functions, derived types). Never mix styles for the same kind of thing in one file.

## `satisfies` vs annotation vs assertion — the three-way

```ts
const config: Config = {...};        // checks, but WIDENS — literal keys/values lost
const config = {...} as Config;      // no check at all — lies allowed
const config = {...} satisfies Config; // checks AND keeps the narrow inferred type ✓
```

`satisfies` is the answer for lookup maps, route tables, theme objects, and any const data that must both conform to a contract and keep its literals:

```ts
const routes = {
  home: "/",
  user: "/users/:id",
} satisfies Record<string, `/${string}`>;
routes.user;   // type "/users/:id", not string — and a typo'd value errored
```

## Optionality, `undefined`, `null`

- `a?: string` means "may be absent"; `a: string | undefined` means "always present, possibly undefined" — callers must pass it explicitly. With `exactOptionalPropertyTypes` the distinction is enforced. Choose by intent: config → optional; function results → explicit `| undefined`.
- Pick a house convention for absent values (`undefined` is the ecosystem default; `null` where JSON/DB interop demands it) and convert at boundaries rather than unioning both everywhere.
- Default parameters kill undefined ergonomically: `function page(size = 20)` — inside, `size: number`.

## Index signatures vs `Record` vs `Map`

- Known finite keys → a real object type (or `Record<"a" | "b", V>`).
- Arbitrary string keys, homogeneous values → `Record<string, V>` — but with `noUncheckedIndexedAccess` reads are `V | undefined` (correct!).
- Truly dynamic keyed collections, non-string keys, iteration order → `Map<K, V>`. Objects used as maps invite prototype-key bugs (`"constructor"`).

## Functions

- **Overloads**: for 2–4 concrete signatures where the return depends on the input shape. Order most-specific first; the implementation signature is invisible to callers and may be loose internally.

```ts
function query(sql: string): Row[];
function query(sql: string, one: true): Row | undefined;
function query(sql: string, one?: boolean): Row[] | Row | undefined { ... }
```

  Prefer a union parameter + conditional return *only* when overloads would explode combinatorially — overload error messages are far kinder.
- **Callbacks**: type them with property syntax for strict variance (`onSelect: (item: T) => void`). Accept `readonly T[]` in parameters — callers with mutable arrays still pass; you promise not to mutate.
- Return types: annotate exports (contract + faster compile + better errors at the *implementation* instead of every call site); infer internals.
- `void` return in a callback type means "return value ignored" — `(x) => list.push(x)` is assignable to `() => void` on purpose; don't "fix" it.
- Rest tuples type variadic APIs: `function emit<E extends keyof Events>(evt: E, ...args: Events[E]): void` — the event-map pattern; args are checked per event name.

## `as const`, tuples, and deriving

```ts
const STATUSES = ["draft", "active", "archived"] as const;
type Status = (typeof STATUSES)[number];              // union from the array

const COLORS = { primary: "#f45536", ink: "#dadfe2" } as const;
type ColorName = keyof typeof COLORS;
```

The array/object is iterable at runtime *and* the type derives from it — one source of truth. This kills 90% of enum use cases.

## Enums — why to skip, and the replacement

`enum` problems: runtime object emitted (breaks type-stripping runtimes, `erasableSyntaxOnly` bans it), numeric enums accept any number (unsound until 5.0, still weird), const enums break under isolatedModules/bundlers. Replacement:

```ts
const Role = { Admin: "admin", Member: "member" } as const;
type Role = (typeof Role)[keyof typeof Role];        // "admin" | "member"
```

Value-namespace + type of the same name — reads like an enum, erases cleanly, and the values are plain strings in logs and JSON. (In codebases already using string enums consistently, don't crusade — consistency wins.)

## Classes — the short version

- Use for stateful things with identity and methods (connections, caches, entities); plain functions + object types for everything else.
- `implements` checks shape but doesn't inherit anything. `private` (TS) is compile-time only; `#field` is runtime-private — prefer `#` for real secrecy.
- Constructor parameter properties (`constructor(private db: DB)`) are non-erasable syntax — avoid in type-stripped runtimes.
- Prefer honest factory functions returning interfaces when the class would only ever have one implementation and no inheritance.

## Readonly & immutability

- `readonly` fields and `readonly T[]` / `ReadonlyArray`, `ReadonlyMap/Set` are compile-time only — but that's enough for design discipline. Accept readonly in parameters, return mutable only if the caller owns it.
- `Readonly<T>` is shallow; deep-freeze at runtime only where it matters (config), and remember `as const` already gave you deep readonly for literals.
