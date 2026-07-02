---
name: rust-mastery
description: Expert Rust doctrine with performance as a first-class concern — ownership and borrowing without fighting the checker, type-driven design, error handling, allocation discipline, profiling and optimization (criterion, flamegraphs, release profiles, SIMD, rayon), fearless concurrency and async/tokio, disciplined unsafe with Miri, API design, and decoding compiler errors. Use whenever working in a Rust codebase — writing or reviewing Rust, fixing borrow-checker or lifetime errors, making Rust code faster, tuning Cargo profiles, writing async/tokio code, auditing unsafe blocks, designing crate APIs, or migrating hot paths from another language to Rust.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Rust Mastery

Rust's founding bet: **the safe code and the fast code are the same code.** Ownership isn't a tax you pay for safety — it's the information that lets the compiler optimize without a GC, elide bounds checks, vectorize loops, and share data across threads without races. So the doctrine has two halves that reinforce each other: *don't fight the borrow checker, redesign until it agrees* (safety), and *measure, then remove work* (speed). Code that fights the checker with `clone()` everywhere is slow AND ugly; `unsafe` sprinkled for "performance" without measurement is usually neither faster nor sound.

## Fit the codebase first

1. Check `Cargo.toml`: edition (2021 vs 2024 — small but real differences), MSRV (`rust-version`), existing lints config, workspace layout, and which async runtime / error crates are already in play. Never introduce a second error-handling style or a second runtime.
2. Run what CI runs: `cargo clippy --all-targets -- -D warnings`, `cargo fmt --check`, `cargo test`. Match the bar that exists; raise it deliberately, not accidentally.
3. **Know which profile you're measuring.** `cargo run` is a debug build — 10–100x slower. Every performance claim comes from `--release` (and every benchmark from criterion), or it's noise.

## Reference map — read before deciding in that area

| Task involves | Read |
| --- | --- |
| Borrow-checker fights, lifetimes, clones, smart pointers (Box/Rc/Arc/RefCell), Cow | [references/ownership-borrowing.md](references/ownership-borrowing.md) |
| Enums, newtypes, traits, generics vs `dyn`, builders, typestate, conversions | [references/types-traits.md](references/types-traits.md) |
| Result/Option, `?`, thiserror/anyhow, panic policy, designing library errors | [references/errors.md](references/errors.md) |
| Making code faster: profiling, allocations, layout, iterators, SIMD, rayon, build profiles | [references/performance.md](references/performance.md) |
| Threads, channels, Arc/Mutex/atomics, async/tokio, cancellation, `Send` errors | [references/concurrency-async.md](references/concurrency-async.md) |
| Writing/reviewing `unsafe`, UB catalog, Miri, FFI with C | [references/unsafe-ffi.md](references/unsafe-ffi.md) |
| Crate/API design, modules, workspaces, features, semver, cargo tooling | [references/api-design.md](references/api-design.md) |
| Tests (unit/integration/doc/property), benchmarks, snapshots, sanitizers | [references/testing-quality.md](references/testing-quality.md) |
| Decoding compiler errors (E0382, E0502, "not Send"…), slow builds, perf footguns | [references/troubleshooting.md](references/troubleshooting.md) |

## Non-negotiables

1. **Clippy and rustfmt are the floor**: `cargo clippy --all-targets -- -D warnings` clean, `cargo fmt` applied. Turn on `clippy::pedantic` selectively per-crate and allow specific lints with reasons — silence is a decision, not a default.
2. **No `.unwrap()`/`.expect()` on fallible paths in production code.** `?` with real error types. `expect("invariant: queue is non-empty after push")` is acceptable only for genuinely impossible states, with the invariant written in the message. Tests and examples may unwrap freely.
3. **Errors: `thiserror` (or hand-rolled enums) for libraries, `anyhow`/`eyre` for application tops.** Library callers need to match on causes; binaries need context chains. Never `Box<dyn Error>` in a public library API.
4. **A `clone()` must be justifiable in one sentence.** "The checker complained" is not a sentence. Restructure (split borrows, scope the borrow, take ownership honestly) before copying; when sharing is the real need, `Rc`/`Arc` *is* the honest clone. See the ladder in ownership-borrowing.md.
5. **Make illegal states unrepresentable**: enums over boolean blizzards, newtypes over primitive obsession (`UserId(u64)`, `Meters(f64)`), non-empty/validated types at boundaries. The type system is the cheapest test suite you'll ever own.
6. **APIs borrow, callers own**: take `&str`, `&[T]`, `impl AsRef<Path>`; return owned values or iterators. Storing? Take `String`/`Vec<T>` by value and let the caller decide to clone. Don't take `&String` ever.
7. **Iterators over index loops.** Clearer, and the optimizer elides bounds checks in iterator chains it can't always elide in `v[i]`. Reach for indices only when the access pattern is genuinely non-linear.
8. **Measure before optimizing, always in `--release`.** criterion for micro, flamegraph/hyperfine for macro. The three most common "Rust is slow" causes are: debug build, allocation in a hot loop, and lock contention — check them in that order before touching algorithms.
9. **Allocation discipline in hot paths**: `Vec::with_capacity` when size is knowable, reuse buffers across iterations, avoid `collect()` for intermediates that could stay lazy, `format!` outside loops. Allocations are the GC pause Rust never took away.
10. **`unsafe` is a contract, not a shortcut**: every block carries a `// SAFETY:` comment stating the invariant that makes it sound, lives behind a safe API, and runs under Miri in CI. Unsound-but-passing is the worst state a Rust codebase can reach — worse than slow.
11. **Locks are scoped and never held across `.await`.** Extract the value, drop the guard, then await. Prefer message passing or sharding over one big Mutex; prefer `std::sync::Mutex` for sync code and short critical sections even inside async.
12. **Async code is cancellation-aware**: every `.await` is a point where your future may be dropped. `select!`/timeouts make this real. `spawn_blocking` for CPU/blocking work — never block the runtime.
13. **`#[derive]` generously** (`Debug` always; `Clone, PartialEq, Eq, Hash, Default` when semantics allow). A type without `Debug` makes every future debugging session worse.
14. **Doc comments with examples on every public item** — rustdoc examples are compiled tests (free correctness). `#![warn(missing_docs)]` on libraries.
15. **Dependencies are attack surface and compile time**: prefer std, audit with `cargo audit`/`cargo deny`, disable default features you don't use, and check a crate's maintenance before adopting it. Every dependency is a bet.

## Decision framework — the ownership ladder

When the checker rejects a design, walk down; stop at the first rung that fits:

1. **Restructure** — split the struct, narrow the borrow's scope, use `entry()`, `mem::take`, or compute-then-mutate. (Fixes ~70% of fights and improves the design.)
2. **Borrow with lifetimes** — when the relationship is real, name it. If lifetimes infect every signature, the design wants owned data.
3. **Clone deliberately** — small/cold data: fine, say why. `Cow<'_, T>` when it's *sometimes* owned.
4. **Shared ownership** — `Rc<T>` (single-thread) / `Arc<T>` (crossing threads). Add `RefCell`/`Mutex` only when shared *mutation* is truly required — and question that requirement once more.
5. **`unsafe`** — you're now writing a data structure the standard library forgot. You probably aren't; check crates.io (and read unsafe-ffi.md if truly yes).

## Decision framework — performance triage

In order, because each step is cheaper than the next:

1. Release build? (`--release`, and for deploys: `lto = "thin"`, `codegen-units = 1` — see performance.md)
2. Algorithmic: is there an O(n²) hiding (nested `contains` on a Vec, N+1 queries)? Fix complexity before constants.
3. Allocations: profile with heaptrack/dhat; apply #9.
4. Copies & serialization: needless `to_owned`, serde round-trips, `String` where `&str` lives long enough.
5. Contention: flamegraph shows lock wait? Shard, use channels, or go lock-free (atomics) with proof.
6. Parallelize: rayon `par_iter` for data-parallel CPU work (one line, often 4–8x).
7. Micro: layout (`Box` huge enum variants, SoA), `#[inline]` on tiny cross-crate hot functions, SIMD — only with a criterion benchmark proving each step.

## Review checklist (sweep before shipping Rust)

Clippy clean with warnings denied · no stray `unwrap`/`expect`/`panic!` on fallible paths · every `clone` defensible · every `unsafe` has SAFETY + a safe wrapper + Miri coverage · no lock held across `.await` · public API takes borrows, docs with examples compile · errors matchable by callers · hot paths benchmarked in release, allocations checked · dependencies minimal and audited.
