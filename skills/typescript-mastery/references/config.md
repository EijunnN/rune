# tsconfig & Project Setup

The compiler has ~100 flags; a handful decide everything. Configuration errors masquerade as type errors and import errors — check config before debugging those.

## The base that's right for almost everything

```jsonc
{
  "compilerOptions": {
    /* Type safety — the non-negotiable block */
    "strict": true,
    "noUncheckedIndexedAccess": true,   // arr[i] is T | undefined — because it is
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true, // `a?: T` no longer accepts explicit undefined; opt out if it fights your codebase

    /* Modules — modern app default */
    "module": "esnext",
    "moduleResolution": "bundler",      // apps built by Vite/Next/esbuild/Bun
    "verbatimModuleSyntax": true,       // forces `import type`; makes transpile-safe files
    "isolatedModules": true,
    "resolveJsonModule": true,

    /* Emit — usually someone else's job */
    "noEmit": true,                     // bundler emits; tsc only type-checks
    "target": "es2022",
    "lib": ["es2023", "dom", "dom.iterable"],

    /* Ergonomics */
    "skipLibCheck": true,               // don't type-check node_modules' d.ts (huge speedup; loses little)
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

## The decisions that actually vary

**`module`/`moduleResolution`** — pick by who resolves imports at runtime:
| Scenario | Setting |
| --- | --- |
| Bundled app (Vite, Next, esbuild, Bun) | `module: "esnext"`, `moduleResolution: "bundler"` — extensionless imports OK |
| Node library / server run by Node | `module: "nodenext"` (resolution follows) — ESM files must use explicit `.js` extensions in relative imports (yes, `.js` even in `.ts` source) |
| Legacy CommonJS-only | `module: "commonjs"`, resolution `node10` — avoid for new code |

The #1 confusing error class ("Cannot find module", "has no default export", ESM/CJS interop) is a mismatch between this setting, `package.json` `"type"`, and how the code actually runs.

**Running TS directly (Node 22+ `--experimental-strip-types`/23+ default, Bun, Deno)**: types are erased, not compiled. Add `"erasableSyntaxOnly": true` (TS 5.8+) to ban the non-erasable constructs: `enum`, `namespace` with runtime code, constructor parameter properties, `import =`.

**Libraries** additionally want: `"declaration": true`, `"declarationMap": true`, `"noEmit": false` with `"emitDeclarationOnly": true` if a bundler makes the JS. And `"isolatedDeclarations": true` (TS 5.5+) if you want fast parallel d.ts generation — it requires explicit return types on exports (aligned with non-negotiable #2 anyway).

**Strict-family flags not in `strict`** worth knowing: `noUncheckedIndexedAccess` (use it), `exactOptionalPropertyTypes` (use on new code), `noPropertyAccessFromIndexSignature` (taste), `noFallthroughCasesInSwitch`, `noUnusedLocals`/`noUnusedParameters` (or leave to the linter).

## Multi-package repos

- Each package: its own `tsconfig.json` extending a shared `tsconfig.base.json`.
- **Project references** (`"composite": true` + `"references": [...]` + `tsc -b`) give incremental cross-package checking and go-to-source. Worth it above ~3 packages; below that, workspace `paths` or just letting the bundler resolve is simpler.
- `paths` aliases (`"@app/*": ["./src/*"]`) are **type-time only** — the runtime/bundler must mirror them (Vite `resolve.alias`, `tsconfig-paths`, or Node subpath imports `#app/*` in package.json, which are the modern answer).

## Migration ratchet (JS → TS or loose → strict)

1. `allowJs: true, checkJs: false` → rename files incrementally.
2. Turn on `strict` for the whole repo but freeze existing errors: generate a baseline (e.g. `tsc-baseline` or suppressions), forbid new ones.
3. Per-directory ratchet via project references or per-folder configs if the codebase is huge.
4. Kill `any`s from the boundaries inward: type the edges (API/DB/storage) first — inference then fixes much of the interior for free.

## Facts that prevent whole bug classes

- `tsconfig.json` affects **editors and `tsc`** — bundlers ignore most of it (they don't type-check at all; Vite/esbuild just strip types). CI must run `tsc --noEmit` (or `tsc -b`) or type errors ship.
- `include`/`exclude` control what's checked; a file open in the editor outside `include` gets default (loose) settings — the classic "no errors in editor, errors in CI" inversion.
- `lib` declares what platform APIs *exist* — targeting Node without `dom` makes `fetch` typing come from `@types/node`. Don't add `dom` to backend code to silence an error; find the right lib/types.
- `skipLibCheck: true` is the pragmatic default; drop it temporarily when debugging a broken dependency's types.
