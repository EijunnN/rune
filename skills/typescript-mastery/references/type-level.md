# Type-Level Programming

Conditional, mapped, and template-literal types compute types from types. Powerful, and expensive for readers — deploy behind named, documented aliases, and prefer deriving from values (`as const` + `typeof`) over hand-built towers.

## Conditional types & `infer`

```ts
type IsString<T> = T extends string ? true : false;
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type FirstArg<F> = F extends (a: infer A, ...rest: any[]) => any ? A : never;
```

- `infer` declares a type variable to be solved by matching the pattern. Multiple `infer`s per pattern are fine; add constraints inline: `infer S extends string`.
- **Distributivity**: when the checked type is a *naked* type parameter, conditionals map over union members: `Unwrap<Promise<A> | B>` → `A | B`. This is usually what you want; to switch it off, wrap both sides in tuples: `[T] extends [string] ? ... : ...`.
- `never` distributes to nothing — `IsString<never>` is `never`, not `false`. Test with `[T] extends [never]` to detect `never` deliberately.
- Built-ins you should reach for before writing your own: `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`, `ConstructorParameters`, `InstanceType`.

## Mapped types

```ts
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];   // key remapping
};

type Mutable<T> = { -readonly [K in keyof T]: T[K] };              // modifier removal: -readonly, -?
```

- `as` in the key position remaps or filters keys — map to `never` to drop: `[K in keyof T as T[K] extends Function ? never : K]: T[K]` (methods stripped).
- **Homomorphic** mapped types (`[K in keyof T]`) preserve modifiers (`readonly`, `?`) and — crucially — distribute over unions and keep tuples/arrays as tuples/arrays. `{ [K in "a" | "b"]: ... }` is not homomorphic and gets none of that.
- `Partial/Required/Readonly/Pick/Omit/Record` cover 90% of needs — compose them before writing raw mapped types. Note `Omit` doesn't distribute over unions; when you need that: `type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never`.

## Template literal types

```ts
type EventName = `on${Capitalize<"click" | "focus">}`;          // "onClick" | "onFocus"
type Route = `/users/${string}`;                                 // pattern type — matches any such string
type Split<S> = S extends `${infer H}/${infer Rest}` ? [H, ...Split<Rest>] : [S];
```

- Unions inside interpolation produce cross-products — combinatorial explosion is real (`${A}${B}${C}` with 10 members each = 1000). The compiler errors past ~100k members.
- Great for: typed event maps, route params (`ExtractParams<"/users/:id">`), dotted paths for config access, SQL-ish DSL fragments. Pair with `infer` to *parse* strings at the type level.
- Intrinsics: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`.

## Recursion — limits and technique

- Conditional types recurse; the practical depth limit is ~50 (tail-call-optimized recursion, ~1000 with accumulator style). Hitting `Type instantiation is excessively deep` means restructure: use an accumulator parameter, or question whether this belongs at the type level at all.
- Recursive shapes are fine and cheap: `type Json = string | number | boolean | null | Json[] | { [k: string]: Json }`.

## Deriving from values — the better tower

Most "impressive" type-level code is avoidable by making the value the source of truth:

```ts
const ROUTES = {
  home: "/",
  user: "/users/:id",
} as const;

type RouteName = keyof typeof ROUTES;                 // "home" | "user"
type RoutePath = (typeof ROUTES)[RouteName];          // "/" | "/users/:id"
```

Same for zod schemas (`z.infer<typeof schema>`), lookup maps, config objects. Writing the type by hand *and* the value is the drift bug waiting to happen.

## Reading & debugging type-level code

- **Name intermediate steps.** `type Rows<T> = ...; type Filtered<T> = ...` beats one 8-line nested ternary — and hovers become meaningful.
- Expand an opaque computed type for inspection: `type Show<T> = { [K in keyof T]: T[K] } & {}` (forces evaluation in hovers).
- Unit-test types: `type Assert<T extends true> = T; type _t1 = Assert<IsString<"a">>;` or a library like `expect-type` / `tsd`. Type-level code without tests rots exactly like runtime code.
- If the error mentions huge unions or deep instantiation, check for accidental distribution (naked `T`) and cross-product template literals first.

## Honesty checklist before shipping a fancy type

Does a discriminated union express it? Do 2–3 overloads read better? Can it derive from a value? Will the *error message* a misuser sees point anywhere useful? Is it tested? If any answer embarrasses the type, simplify it.
