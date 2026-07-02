# Errors & Panics — Fallibility as API

Two channels, never confused: **`Result`** for expected failure (input, IO, network — things the caller can react to), **panic** for broken invariants (bugs). A panic in a library because a file was missing is a bug in the library; a `Result` for "index out of internal bounds" is noise.

## The application/library split

**Applications (binaries)** — `anyhow` (or `eyre`): one flexible error type, rich context, question-mark everything:

```rust
use anyhow::{Context, Result};

fn load_config(path: &Path) -> Result<Config> {
    let raw = fs::read_to_string(path)
        .with_context(|| format!("reading config at {}", path.display()))?;
    toml::from_str(&raw).context("config is not valid TOML")
}
// main: fn main() -> anyhow::Result<()> — errors print as a caused-by chain
```

`context` at each boundary crossing is what turns "No such file or directory" into a diagnosable report. Lazy form (`with_context(|| …)`) when building the message costs anything.

**Libraries** — concrete, matchable error enums via `thiserror`:

```rust
#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("key not found: {0}")]
    NotFound(String),
    #[error("serialization failed")]
    Serde(#[from] serde_json::Error),      // ? auto-converts
    #[error("io error accessing store")]
    Io(#[from] std::io::Error),
}
```

- Callers must be able to `match` on what they can handle (`NotFound` → create; `Io` → retry). A library exposing `anyhow::Error` or `Box<dyn Error>` robs them of that.
- `#[from]` + `?` = ergonomic conversion; `#[source]` preserves the chain without conversion; `{0}`/`{field}` interpolation keeps messages beside variants.
- Don't make one giant crate-wide error enum with 30 variants that every function pretends it can return — per-module or per-operation errors keep signatures honest. (Coarser is fine while the crate is young; split when match arms start lying.)
- Messages: lowercase, no trailing period, no "Error:" prefix (composers add framing), include the *specific* subject (`key not found: {0}`), never include secrets.

## `?`, combinators, and Option

- `?` early-returns and converts via `From` — design your error types so `?` just works (`#[from]`), and reach for `.map_err(...)` only when adding information.
- Option→Result at the decision point: `.ok_or(StoreError::NotFound(key))?` / lazy `.ok_or_else(...)`.
- Combinator taste: chains of 2–3 (`.map`, `.and_then`, `.unwrap_or_else`, `.unwrap_or_default`) read well; deeper nesting reads worse than a `match` or `let ... else`:

```rust
let Some(user) = cache.get(&id) else {
    return Err(StoreError::NotFound(id.to_string()));
};
```

- `if let Ok(x) = fallible()` silently discards the error — legitimate only when the error truly doesn't matter; otherwise log it or bubble it.
- Iterators of Results: `collect::<Result<Vec<_>, _>>()` (fail-fast) vs `.filter_map(|r| r.map_err(|e| log(e)).ok())` (skip-and-log) — choose consciously; `partition` when you need both sides.

## Panic policy

- Panics are for bugs: violated invariants, impossible states. `unreachable!("state machine guarantees …")`, `assert!`/`debug_assert!` (the latter compiles out in release — use for expensive checks only, never for safety-critical ones guarding `unsafe`).
- Indexing `v[i]`, `unwrap`, integer overflow (panics in debug, wraps in release!) — all panic paths. Hot rule: arithmetic on untrusted input uses `checked_*`/`saturating_*`/`wrapping_*` *explicitly*, stating intent.
- Libraries: never panic on reachable-by-caller paths; document any panics (`# Panics` rustdoc section). Applications may choose `panic = "abort"` in release for smaller/faster binaries — but that kills unwind-based recovery, so decide once.
- `catch_unwind` is for isolation layers (FFI edges, thread pools keeping a worker alive), not error handling.
- Poisoned mutexes (a thread panicked while holding): `.lock().unwrap()` is conventional — poison means a bug already happened; propagating the panic is honest. `parking_lot` skips poisoning entirely.

## Error handling in async / concurrent code

- `JoinHandle` returns `Result<T, JoinError>` — a panicked task surfaces there; don't ignore join results.
- Fan-out: `try_join!`/`JoinSet` propagate the first error and let you cancel siblings — decide explicitly whether partial success is acceptable.
- Retries belong at the boundary with policy (backoff crate or hand-rolled with jitter), driven by matchable error kinds (`Io`/`Timeout` retryable; `NotFound` not) — which is exactly why library errors must be enums.

## Testing errors

Error paths are behavior: assert the variant, not the prose — `assert!(matches!(err, StoreError::NotFound(k) if k == "a"))`. For anyhow apps: `err.downcast_ref::<StoreError>()`. Every `#[from]` conversion and every context message that a human will read in an incident deserves one test that fails if it silently changes.
