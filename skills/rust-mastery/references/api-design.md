# API & Project Design — Crates Worth Depending On

## Function signatures (the caller's bill of rights)

- **Take the least you need**: `&str` not `&String`, `&[T]` not `&Vec<T>`, `impl AsRef<Path>` for paths, `impl Into<T>` for cheap conversions at ergonomic boundaries, `impl Iterator<Item = T>` instead of forcing a `Vec` allocation.
- **Storing it? Take it owned** (`String`, `Vec<T>`) — the caller sees the cost honestly and can move instead of clone.
- **Return concrete owned types or `impl Iterator`** — not references into hidden internals (lifetime handcuffs for callers), not `Box<dyn ...>` unless heterogeneity demands it.
- Booleans in signatures rot: `fn render(dark: bool, compact: bool)` → two-variant enums (`Theme::Dark`) read at call sites and grow later.
- Getters return `&T`/`Option<&T>`; expose iterators (`fn items(&self) -> impl Iterator<Item = &Item>`) rather than `&Vec<Item>` (which locks your internal representation forever).

## Constructors & configuration

- `new()` for the obvious case; `Default` when a no-argument value makes sense; associated constructors for meaningful variants (`Duration::from_secs`).
- 3+ optional knobs → builder (consuming, so it can move data in and typestate can gate `build()`); or a Config struct with `..Default::default()`.
- Fallible construction returns `Result` (parse-don't-validate: the constructed type *is* the proof — types-traits.md). No `fn new() -> Self` that half-initializes and hopes you call `init()`.

## Module & crate layout

```
src/lib.rs        // re-exports the public surface: pub use module::{Thing, ...}
src/config.rs     // flat modules; create a dir module only when it has real children
src/store/        // mod.rs (or store.rs + store/) with submodules private by default
tests/            // integration tests: compile as external users of your API
benches/          // criterion
examples/         // run in CI; double as living docs
```

- **The public API is curated at lib.rs** — deep paths are implementation detail; users import `mycrate::Store`, not `mycrate::store::backend::sqlite::Store`. `pub(crate)` liberally; `pub` is a semver promise.
- Visibility is architecture: if module A pokes module B's fields, they're one module pretending otherwise.
- **Workspaces** when the codebase has real seams (core/cli/server, or a proc-macro sibling): shared `[workspace.dependencies]` pins versions once; small crates parallelize compilation. Don't shard into 15 nano-crates that all depend on each other — that's one crate with extra steps.

## Features & dependencies

- Features are **additive only** (unioned across the dep graph) — a feature must never *remove* or change behavior, only add. Mutually exclusive features break downstream builds.
- Gate heavy/optional integrations: `serde = { version = "1", optional = true }` + `#[cfg(feature = "serde")]` derives. Keep `default` features lean; document each feature in Cargo.toml comments and the crate docs.
- Adopt dependencies like hires: maintenance pulse, unsafe count (`cargo geiger`), transitive weight (`cargo tree`), MSRV policy. `cargo audit` + `cargo deny check` (licenses, bans, advisories) in CI.
- Re-export foundational types you expose (`pub use bytes::Bytes;`) so users don't need version-matched direct deps.

## Semver & evolution

- Breaking = major (or 0.x minor): removing/renaming pub items, adding trait methods without defaults, changing signatures, tightening bounds, MSRV bumps (declare `rust-version` and treat raising it as at least minor).
- Future-proofing valves: `#[non_exhaustive]` on public enums/structs you'll extend (callers must use `_`/`..` — you can then add variants in a minor); sealed traits for traits you'll grow (types-traits.md).
- `cargo semver-checks` in CI catches accidental breakage mechanically.
- Deprecate before deleting: `#[deprecated(since = "1.4.0", note = "use `Store::open`")]` for one minor cycle.

## Documentation (part of the API, not garnish)

```rust
/// Opens the store at `path`, creating it if absent.
///
/// # Examples
/// ```
/// let store = mycrate::Store::open(tmp.path())?;
/// # Ok::<(), mycrate::StoreError>(())
/// ```
///
/// # Errors
/// Returns [`StoreError::Io`] if the directory is not writable.
```

- Doc examples compile and run as tests — every public item gets one; they're the first code users paste.
- Sections in house style: `# Examples`, `# Errors`, `# Panics`, `# Safety` (for unsafe fns — mandatory).
- Crate root docs (`//!` in lib.rs): the 30-second pitch, a complete quick-start, and a map of the main types. `#![warn(missing_docs)]` keeps you honest.
- `#[doc(hidden)]` for macro plumbing that must be pub but isn't API.

## Lint & CI baseline for a crate

```toml
[lints.rust]
missing_docs = "warn"
unsafe_op_in_unsafe_fn = "deny"

[lints.clippy]
pedantic = { level = "warn", priority = -1 }   # then allow specific pedantic lints with reasons
undocumented_unsafe_blocks = "deny"
unwrap_used = "warn"                            # in lib code; tests may allow
```

CI ladder: `fmt --check` → `clippy --all-targets --all-features -D warnings` → `test --all-features` → docs build with `-D warnings` (`RUSTDOCFLAGS`) → `cargo semver-checks` + `cargo deny` on release PRs. Test the feature matrix you actually support (`--no-default-features`, each major feature) — feature-gated code that never compiles in CI is broken code on a delay.

## Binaries (CLI apps)

`clap` (derive) for args; errors to stderr with context chains (anyhow), data to stdout; exit codes meaningful (`std::process::exit` only at the very top); `--json` output mode for scriptability; config precedence CLI > env > file, parsed into one validated Config at startup (errors.md pattern). Keep `main.rs` thin — a `run(args) -> Result<()>` in lib.rs makes the whole binary testable.
