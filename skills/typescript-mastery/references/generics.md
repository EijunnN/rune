# Generics — Parameters That Pay Rent

A generic is a *relationship* between types: input↔output, element↔collection, key↔value. If a type parameter doesn't relate at least two positions (or constrain one usefully for the caller), delete it.

```ts
function first<T>(arr: readonly T[]): T | undefined   // relates array to element — earns it
function log<T>(x: T): void                            // relates nothing — just use unknown
```

## Inference does the work — design for it

Callers should almost never write `f<Explicit>()`. Inference flows from arguments:

```ts
function prop<T, K extends keyof T>(obj: T, key: K): T[K]
const port = prop(config, "port");  // T, K, and the return all inferred
```

Design rules that keep inference working:

- **Put the inferable thing in argument position.** If `T` only appears in the return type, the caller must specify it (`fetchJson<User>(url)`) — sometimes intended (a deliberate "trust me" API), but then say so and consider making it validate instead (runtime-boundaries.md).
- **Constraints (`K extends keyof T`) both restrict and improve inference.** Unconstrained parameters infer too wide; overly clever constraints break inference entirely. If callers hit "T could be instantiated with a different subtype…", your constraints are fighting variance — often the sign to simplify.
- **Contextual inference is positional**: in `useHandler(config, (evt) => ...)`, `evt` gets its type from `config` only if the callback parameter's type references the same type parameter. Order arguments so the "source" comes before the "consumer".
- **`NoInfer<T>`** (TS 5.4+) excludes a position from inference — for `createState<T>(initial: T, defaults: NoInfer<Partial<T>>)` where only `initial` should drive `T`.
- **`const` type parameters** (TS 5.0+): `function tuple<const T extends readonly unknown[]>(...args: T)` keeps callers' literals narrow without them writing `as const`.

## Generic functions vs generic types

- `type Box<T> = { value: T }` — a type family; each use picks a `T`.
- `const f: <T>(x: T) => T` — one value that works for all `T` (the caller chooses per call). Higher-order code that *passes generic functions around* needs this distinction; when a generic function loses its genericity through a pipeline, the pipeline's types instantiated it too early.
- Default type parameters (`<T = string>`) apply when neither inference nor explicit args decide — good for opt-in specificity, bad as a crutch for broken inference.

## Variance — why "it's a subtype" sometimes isn't

- Property/return positions are **covariant**: `Dog[]` assignable to `Animal[]` (unsound for writes, allowed anyway).
- Parameter positions are **contravariant** under `strictFunctionTypes`: `(a: Animal) => void` assignable to `(d: Dog) => void`, not vice versa.
- **Method shorthand is checked bivariantly** (loosely) — `interface E { on(e: MouseEvent): void }` accepts sloppier handlers than `on: (e: MouseEvent) => void`. Use property-function syntax when you want the strict check.
- The dreaded `'T' could be instantiated with an arbitrary type…` error = you're returning/accepting a *specific* type where the signature promised *any* `T`. Either the signature over-promises (fix the signature) or the implementation needs a locally-justified cast (fine inside the function, hidden behind the honest signature).

## Implementation guts vs public face

It's normal and acceptable for a perfectly-typed generic signature to have a few casts *inside* its implementation — the type system can't always follow value-level logic (reduce accumulators, object building, overload implementations). The contract is the signature; keep the lies internal, small, and commented:

```ts
export function groupBy<T, K extends PropertyKey>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;         // justified: built up below
  for (const item of items) (out[key(item)] ??= []).push(item);
  return out;
}
```

## When NOT to reach for generics

- **A union suffices**: `function fmt(x: string | number)` beats `fmt<T extends string | number>(x: T)` unless the return depends on which.
- **Overloads read better** than conditional-type returns for 2–3 concrete cases (objects-functions.md).
- **The "generic builder" trap**: chains where every method returns a more elaborate `Builder<...>` are impressive and unmaintainable; consider accepting a plain typed config object validated with `satisfies`.
- Deep conditional logic on `T` → you've left generics and entered type-level programming; read type-level.md and re-justify.

## Recipes that come up constantly

```ts
// Keyed lookup preserving per-key types
function get<T, K extends keyof T>(o: T, k: K): T[K]

// Tuple-preserving map
function pair<A, B>(a: A, b: B): [A, B]   // return type [A, B], not (A|B)[]

// Constrain to object with a specific field
function byId<T extends { id: string }>(items: T[]): Map<string, T>

// Factory bound to a class
function create<T>(Ctor: new (...args: any[]) => T): T

// Infer array element
type ElementOf<A> = A extends readonly (infer E)[] ? E : never
```
