# Troubleshooting — Errors, Performance, Debugging Types

## Decoding the classic errors

**"Type 'X' is not assignable to type 'Y'"** — read it inside-out: the *last* "Types of property ... are incompatible" line names the actual culprit; everything above is the path to it. With long unions, the elaboration is truncated — re-check the single failing property in isolation (`const t: Y['prop'] = x.prop`).

**"X is not assignable to X"** (same name!) — two declarations of the type exist: duplicated package in node_modules (`npm ls`), mixed TS versions in a monorepo, or a global vs module-local declaration clash. Never cast past this; fix the tree.

**"Property does not exist on type 'never'"** — narrowing eliminated *everything*: an impossible check upstream (comparing incompatible literals), or a union that never included what you think. Hover the variable one line earlier to see what the compiler believed.

**"Object is possibly 'undefined'"** — the compiler is right (index access, optional chain, pre-check mutation — see narrowing.md walls). Fix with evidence (check + const copy), not `!`.

**"'T' could be instantiated with an arbitrary type"** — variance, see generics.md. The signature promises any `T`; the body delivers a specific one.

**"Type instantiation is excessively deep and possibly infinite"** — runaway recursive/conditional type, often via accidental distribution or giant template-literal cross-products. Restructure with accumulators, or move the logic to runtime (type-level.md).

**"Expression produces a union type that is too complex to represent"** — same family; usually a mapped type over a huge union or spreading gigantic const objects. Widen deliberately at the choke point.

**"The inferred type of X cannot be named without a reference to Y"** — an exported value's inferred type mentions a type from a non-exported/deep path. Export the type or annotate the value explicitly (the annotation is the fix, not a workaround).

**"has no call signatures" / "not all constituents are callable"** — calling a union of functions requires parameters acceptable to *every* member; narrow the union first.

**Cannot find module / has no default export / "did you mean 'X'"** — module *resolution*, not types: check `moduleResolution` vs runtime, file extensions under `nodenext`, `esModuleInterop`, and whether the package's `exports` map even exposes that path (config.md / declarations-publishing.md).

## Editor disagrees with CI (or with itself)

- Editor uses its bundled TS unless told otherwise → **"TypeScript: Select TypeScript Version → Use Workspace Version"** in VS Code. Version skew = ghost errors.
- File outside `include` gets default compiler options — check which tsconfig the editor picked (status bar / "go to project configuration").
- Stale state: restart TS server first (`> TypeScript: Restart TS Server`), delete `tsBuildInfoFile` if incremental info corrupted.
- CI must run `tsc --noEmit` (or `tsc -b` for references) — the bundler passing means nothing about types.

## Compile & IDE performance

Measure before optimizing: `tsc --extendedDiagnostics` (check *Check time*, *Types*, *Instantiations*), `tsc --generateTrace ./trace` + `@typescript/analyze-trace` for the flame view.

Highest-leverage fixes, in order:
1. `skipLibCheck: true` and `incremental: true` (with `tsBuildInfoFile`).
2. **Shrink the program**: tight `include`, project references so packages check in isolation, don't glob tests into the app project.
3. Kill pathological types: giant unions (>1k members), template-literal cross-products, deep intersection chains (prefer `interface extends`), enormous inferred return types on exported functions (annotate them — also speeds up *incremental* checks dramatically).
4. Barrel files (`index.ts` re-exporting everything) make every import pull the world — import from source modules; it helps tsc, the editor, *and* bundle treeshaking.
5. Editor-specific: huge auto-import graphs and `strict` monorepo-wide `paths` slow IntelliSense; project references fix both.
6. The nuclear option arriving in the ecosystem: the native compiler port (tsgo / TS 7) — ~10x. Check availability for your toolchain before heroics.

## Debugging a type (techniques)

```ts
type Show<T> = { [K in keyof T]: T[K] } & {};   // force-expand hovers
const probe: never = x;                          // error message reveals x's exact type
type _check = Assert<Equal<Result, Expected>>;   // type-level unit test (expect-type lib)
```

- Bisect big types: comment out half the union/intersection, re-hover.
- `satisfies` as a probe: `x satisfies ExpectedShape` errors with a precise diff without changing `x`'s type.
- For "why is this `any`?": follow the data — an untyped import, a `.json` import without `resolveJsonModule`, an implicit-any parameter upstream (`noImplicitAny` catches at source), or a lodash-style deep path.

## When to suppress, correctly

Real life has deadline moments. The discipline: `// @ts-expect-error TICKET-123: zod version mismatch, remove after upgrade` — reason + expiry hook, and it self-reports when fixed. Never `@ts-ignore`; never suppress inside shared/library code where the error will re-manifest in every consumer.
