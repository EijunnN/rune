---
name: typescript-mastery
description: Expert TypeScript doctrine for writing, reviewing, and debugging typed code — tsconfig strictness, narrowing and control flow, generics that pay rent, type-level programming (conditional/mapped/template-literal types), runtime validation at boundaries, declaration files and publishing, and decoding compiler errors. Use whenever working in a TypeScript codebase — designing types or APIs, fixing "not assignable" errors, configuring tsconfig, migrating JS to TS, typing a library, or reviewing code for type safety. Also use when the user asks about any/unknown/never, generics, zod/validation, enums, or slow tsc builds.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# TypeScript Mastery

TypeScript's type system is a proof assistant: types are **sets of values**, and the compiler only believes what it can prove from evidence in the code. Almost every type error and every bad typing decision comes from one of three failures: **lying to the compiler** (assertions, `any`), **withholding evidence** (types wider than what you know), or **proving in the wrong place** (type-level gymnastics where a runtime check belongs). Write code that hands the compiler evidence, and the types largely write themselves.

## Version awareness — do this first

TypeScript ships every ~3 months and behavior depends on configuration more than almost any other language. Before advising or writing code in an existing project:

1. Check the installed version (`package.json` / `npm ls typescript`) and read `tsconfig.json` — especially `strict`, `moduleResolution`, and `target`. Advice that assumes `strict` is wrong in a loose codebase, and vice versa.
2. Runtime matters: Node 22+/Bun/Deno run TypeScript directly by **erasing** types — enum, namespaces with values, and constructor parameter properties are not erasable and break there (`erasableSyntaxOnly` enforces this). Bundler setups (Vite/Next) have their own rules.
3. When an API seems missing or errors read oddly, suspect version: check the release notes at https://www.typescriptlang.org/docs/handbook/release-notes/overview.html before working around it.

## Reference map — read before deciding in that area

| Task involves | Read |
| --- | --- |
| tsconfig, strictness flags, module/moduleResolution, monorepos, build setup | [references/config.md](references/config.md) |
| Type guards, discriminated unions, exhaustiveness, "why didn't it narrow?" | [references/narrowing.md](references/narrowing.md) |
| Writing/reviewing generic functions and types, inference, constraints | [references/generics.md](references/generics.md) |
| Conditional/mapped/template-literal types, `infer`, building utility types | [references/type-level.md](references/type-level.md) |
| Parsing JSON/APIs/forms, zod/valibot, assertions discipline, branded types | [references/runtime-boundaries.md](references/runtime-boundaries.md) |
| interface vs type, objects, functions, overloads, enums, classes, `satisfies` | [references/objects-functions.md](references/objects-functions.md) |
| .d.ts files, publishing a typed package, augmenting modules, JS→TS migration | [references/declarations-publishing.md](references/declarations-publishing.md) |
| Decoding compiler errors, slow tsc, editor perf, debugging types | [references/troubleshooting.md](references/troubleshooting.md) |

For React-specific typing (props, hooks, refs, events), the react-mastery rune's typescript reference is the authority — this rune covers the language itself.

## Non-negotiables

1. **`strict: true` always**, plus `noUncheckedIndexedAccess`. Loose TypeScript is JavaScript with extra steps and false confidence. In legacy codebases, ratchet toward strict; never away.
2. **Infer locally, annotate at boundaries.** Let inference do its job inside function bodies; write explicit types for exported function signatures, public APIs, and module edges — those are contracts and error-message anchors.
3. **`unknown` at every boundary, never `any`.** JSON, network, storage, `catch`, third-party escape hatches — type them `unknown` and prove the shape before use. `any` doesn't disable checking for one value; it leaks through everything it touches.
4. **Assertions (`as`) are claims without evidence — treat each as a small lie.** Prefer narrowing, guards, or validation. When one is genuinely needed (tests, deserialization you truly control), keep it local and commented with why it's safe.
5. **Suppress with `@ts-expect-error` (plus a reason), never `@ts-ignore`.** The former rots loudly when the error disappears; the latter rots silently.
6. **Model state as discriminated unions,** not bags of optionals. `{ status: 'ok', data } | { status: 'error', error }` makes illegal states unrepresentable — the compiler then enforces handling per state.
7. **Exhaustiveness is enforced, not hoped for**: end switches over unions with a `never` check (`default: return assertNever(x)`, or `x satisfies never` in expression position), so adding a variant breaks every unhandled site at compile time.
8. **`satisfies` for "check but don't widen"**: config objects, lookup maps, route tables. `const routes = {...} satisfies Record<string, Route>` keeps literal keys AND validates the shape; an annotation would erase what inference knew.
9. **`as const` is the default for literal data.** Readonly tuples and literal types out of the box; combine with `typeof` + indexed access to derive types from data instead of writing them twice.
10. **Avoid `enum`** — use `as const` objects with a derived union (`type Role = (typeof ROLES)[keyof typeof ROLES]`). Enums have runtime cost, structural quirks, and are non-erasable syntax.
11. **A type parameter must earn its place: it appears twice or it's noise.** `function f<T>(x: T): T` relates input to output — earns it. `function f<T>(x: T): string` is just `unknown` wearing a costume.
12. **Errors are `unknown`.** In `catch (e)`, prove it's an `Error` (or parse it) before touching `.message`. For expected failures, prefer returned result unions over thrown exceptions — throws are invisible to the type system.
13. **Brand identifiers** that must not cross-contaminate: `type UserId = string & { readonly __brand: 'UserId' }`. Structural typing happily passes an `OrderId` where a `UserId` goes; brands make that a compile error.
14. **Derive, don't duplicate.** Second copies of a shape drift: use `keyof typeof`, indexed access (`Config['db']`), `ReturnType`, `Parameters`, mapped types. One source of truth, everything else computed.
15. **Types serve readers.** A clever conditional type nobody can debug is worse than three honest overloads. Optimize for the error message the next person will see, and name intermediate types instead of inlining towers.

## Decision framework — `any` vs `unknown` vs `never` vs assertion

- Value exists but shape unproven → **`unknown`**, then narrow/validate.
- Value cannot exist (exhausted union, impossible branch) → **`never`** — use it to enforce exhaustiveness.
- You know more than the compiler *and can't express it* → last resort **`as`**, localized, with a comment. First try: a type guard, a validation parse, or restructuring so the evidence is visible.
- **`any`** → almost never. Acceptable inside a generic's implementation guts where variance fights you (hidden behind a well-typed signature), and in migration scaffolding with a deadline.

## Decision framework — where does this type live?

1. **Can it be derived from a value?** (`as const` data, a zod schema, an existing type) → derive it.
2. **Is it a boundary contract?** (API response, function signature, props) → explicit, named, exported.
3. **Is it internal glue?** → let inference carry it; don't name what nobody references.
4. **Is it becoming type-level programming?** → justify against the reader-cost rule (#15); read type-level.md first — half of "I need a fancy type" cases are better solved with a discriminated union or function overloads.

## Review checklist (sweep before shipping typed code)

`strict` on and no new suppressions · boundaries take/return explicit types · no `as` without a comment · state unions discriminated, switches exhaustive · no duplicated shapes that should be derived · generics all earn their parameter · catch blocks treat `e` as unknown · public API error messages tested (hover the failure cases) · `tsc --noEmit` clean, not just the editor.
