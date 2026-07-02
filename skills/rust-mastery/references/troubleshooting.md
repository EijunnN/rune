# Troubleshooting — Compiler Errors, Slow Builds, Perf Footguns

First rule: **read the whole error.** rustc errors include the explanation, the span, and usually the fix; `rustc --explain E0382` expands any code. The error is almost never wrong — it's pointing at a design ambiguity.

## Decoding the classic errors

**E0382 "borrow of moved value"** — the value went somewhere by value (function call, `for` loop over `vec` instead of `&vec`, closure with `move`, struct construction). Fixes by intent: pass `&`/iterate `&vec` (most common), `.clone()` *with justification*, or restructure so the mover is last user. Watch `for x in collection` — it consumes; `&collection` borrows.

**E0502 "cannot borrow as mutable because also borrowed as immutable"** — overlapping borrows; see the fight catalog in ownership-borrowing.md (split borrows, narrow scopes, entry API, compute-then-mutate).

**E0499 "cannot borrow as mutable more than once"** — two `&mut` into one structure. `split_at_mut` for slices, `iter_mut()` instead of indexing twice, or restructure (one mutation site).

**E0106/E0621 "missing lifetime specifier" / "explicit lifetime required"** — the compiler can't infer which input the output borrows from; name it (`fn pick<'a>(a: &'a str, b: &'a str) -> &'a str`). If you're adding lifetimes to *store* references long-term, the design likely wants owned data (ownership-borrowing.md).

**"lifetime may not live long enough" returning from methods** — you're returning a reference derived from a temporary or a shorter borrow. Return owned, or make the storage live in the caller.

**E0507 "cannot move out of borrowed content"** — take ownership honestly: `mem::take`, `Option::take`, `mem::replace`, or clone deliberately.

**"the trait bound `X: Y` is not satisfied"** — usually one of: missing `use` (traits must be in scope to call their methods!), missing derive, missing feature flag on the dependency (serde's `derive`, tokio's `full`/specific features), or wrong version of a shared dep (two `serde` majors in tree: `cargo tree -d` shows duplicates — unify versions).

**"future cannot be sent between threads safely"** — a non-`Send` value is alive across an `.await`. Find it (the error names the type): drop the `MutexGuard`/`Rc`/`RefCell` before the await (scope it in a block), switch `Rc→Arc`/`RefCell→Mutex`, or keep the whole task on one thread (`tokio::task::LocalSet`/`spawn_local`) when single-threaded-ness is the design.

**"cannot return value referencing local variable"** — returning `&` into something the function owns. Return the owned value, or take the storage as a parameter.

**"type annotations needed"** — inference dead-ends around `collect()`, `parse()`, `into()`: turbofish it (`collect::<Vec<_>>()`, `parse::<u32>()`) or annotate the binding.

**Trait method exists but "no method named …"** — the trait isn't imported (`use std::io::Read;`), the receiver is behind one too many references (`(*x).method()` — rare), or the method needs a bound the type lacks.

**E0277 with iterators & closures** — closure type mismatches often mean a `move` is needed (borrowed local escaping) or the closure's captured borrow conflicts; let the "closure may outlive the current function" hint guide the `move`.

## Build & iteration speed

- Inner loop: `cargo check` (or rust-analyzer's) — don't `cargo build` to find type errors. `cargo nextest` runs tests faster.
- Slow linking dominates incremental builds: use `lld` (`-C link-arg=-fuse-ld=lld`) or `mold` on Linux — often the single biggest dev-loop win.
- `[profile.dev.package."*"] opt-level = 2` — optimized deps, debuggable app code (also makes dev-mode perf realistic enough to notice regressions).
- `cargo build --timings` shows the crate-graph critical path; heavy proc-macros (serde on 300 types) and monomorphization bloat (`cargo llvm-lines`) are the usual suspects. Generic-heavy public functions can add a thin non-generic inner fn (`fn run(x: impl Into<T>) { _run(x.into()) }`) to cut duplicate codegen.
- Feature unification surprises: a workspace member enabling `tokio/full` enables it for everyone in that build. Audit with `cargo tree -e features`.
- sccache/incremental CI caches; split giant crates at real seams (api-design.md).

## Performance footguns checklist (before deep profiling)

1. **Debug build** — the eternal #1. Benchmarks/deploys: `--release`.
2. Allocation in a hot loop — `format!`, `to_string`, `collect`, `Vec::new` per iteration (performance.md).
3. `clone()` of large data per call — especially hidden in closures or `map(|x| x.clone())` where `iter().cloned()` on Copy types or borrowing would do.
4. Unbuffered IO — `File` reads/writes without `BufReader`/`BufWriter`; println! per line (locks stdout each call — lock once: `let mut out = stdout().lock()`).
5. `HashMap` with default hasher in hot internal paths — FxHashMap/ahash (trusted keys only).
6. Reading a Mutex in a tight loop — clone out or use atomics/watch.
7. `async` for CPU work / rayon for IO work — model mismatch (concurrency-async.md).
8. Accidental O(n²): `Vec::contains`/`retain-with-contains` in loops → HashSet; `remove(0)` in a loop → `VecDeque`.
9. Logging/tracing formatting on hot paths even when the level is off — use the macros' lazy forms and check `enabled!`.
10. Overflow checks in release are OFF (wrapping) — a "works in release, panics in debug" arithmetic difference is a real bug; use explicit `checked_*`/`wrapping_*` (errors.md).

## When the compiler seems wrong

It almost never is, but: rust-analyzer and cargo can disagree (stale cache — `cargo clean -p crate` or restart RA); two-versions-of-a-crate makes identical-looking types incompatible ("expected `Foo`, found `Foo`" — `cargo tree -d`); macro-generated code produces spans pointing at the macro call (expand with `cargo expand` to see reality); and orphan-rule/coherence errors mean the impl belongs in the crate that owns the trait or the type — newtype-wrap to claim ownership (types-traits.md).
