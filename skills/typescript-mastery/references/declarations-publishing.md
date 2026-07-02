# Declarations, Publishing & the Types Ecosystem

## Where types come from (resolution order matters when they conflict)

1. The package's own types: `types`/`exports.types` in its package.json, or `.d.ts` siblings.
2. `@types/<name>` from DefinitelyTyped (community-authored; can lag or diverge).
3. Your local declarations (`declare module`).

`skipLibCheck: true` means broken dependency types don't fail your build — but your *usage* of them is still checked.

## Publishing a typed package (the part everyone gets wrong)

```jsonc
// package.json — dual-format done correctly
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",     // MUST be first key in the conditions object
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

- `exports` replaces `main`/`types` for modern resolvers; keep top-level `main`+`types` as legacy fallback.
- CJS+ESM duals technically want *two* d.ts files (`.d.ts`/`.d.cts`) since types follow module format under `nodenext`; single-format ESM-only publishing avoids the whole mess and is increasingly the right call.
- **Validate with `attw`** (`npx @arethetypeswrong/cli --pack`): catches the classic misconfigurations (types pointing at the wrong format, missing conditions) before your users do. `publint` complements it.
- Generate declarations with `tsc --emitDeclarationOnly --declaration --declarationMap` (declarationMap → consumers' go-to-definition lands in your *source*). `isolatedDeclarations` (5.5+) makes d.ts generation parallelizable but requires explicit types on all exports.
- **Don't leak internals**: everything reachable from an exported signature gets baked into your public d.ts — including that `internal/helpers.ts` type. Curate the root export; consider `@internal` + `stripInternal`.

## Writing declarations for untyped things

```ts
// globals.d.ts — make sure it's inside `include`
declare module "legacy-lib" {                 // untyped npm package
  export function init(opts: { key: string }): void;
}

declare module "*.svg" {                      // asset imports (bundler feature)
  const url: string;
  export default url;
}

declare global {                              // window extensions, injected globals
  interface Window { analytics?: { track(e: string): void } }
}
export {};                                    // keeps the file a module so `declare global` works
```

A file with any top-level import/export is a **module**; without, a **script** whose declarations are global automatically. The `export {}` trick flips a script into a module on purpose. If your `.d.ts` "stopped working", it fell out of `include` or gained an import and stopped being global.

## Module augmentation & declaration merging

Extending someone else's interfaces — the sanctioned use of interface merging:

```ts
// express request user, vue route meta, fastify decorators, theme tokens…
declare module "express-serve-static-core" {
  interface Request { user?: SessionUser }
}
```

- Augment the module that *declares* the interface (find it via go-to-definition), which may differ from the package you import.
- Library authors: design extension points as interfaces (`interface Register {}` pattern à la TanStack) so users augment instead of casting.

## Consuming JS with JSDoc (when .ts isn't an option)

`checkJs` + JSDoc gets you 90% of TS in .js files: `/** @type {import('./types').Config} */`, `@param`, `@returns`, `@template` for generics, `@satisfies` (5.0+). Good for configs (`next.config.js`) and gradual migration — same compiler, same strictness.

## Monorepo type hygiene

- Internal packages can point `exports.types` (or a `development` condition) at **source** `.ts` during dev for instant cross-package feedback, building d.ts only for publish. TS 5.5+ auto-resolves this pattern; otherwise use `customConditions`.
- One `typescript` version for the whole repo (syncpack/renovate rule) — mixed versions produce "same type is not identical" ghosts.
- Shared tsconfig base; per-package `references` if using project builds (config.md).

## Type-ecosystem facts that save hours

- `@types/node` version should track your Node major (`"@types/node": "^22"` for Node 22). DOM types come from `lib`, not a package.
- Version skew: a library's types describing a newer/older API than installed → check both versions; pin `@types` to match.
- Two copies of a package (npm dedupe failure) = "Type 'X' is not assignable to type 'X'" — fix the dependency tree (`npm ls <pkg>`), don't cast.
- `typesVersions` is legacy; `exports` conditions replaced it.
- Generate types from external contracts instead of hand-writing: `openapi-typescript` (REST), `graphql-codegen`, Prisma/Drizzle (DB), `wrangler types` (Cloudflare bindings). Hand-written copies of remote schemas are drift bugs.
