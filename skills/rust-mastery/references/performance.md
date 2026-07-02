# Performance — Measure, Then Remove Work

Rust gives you C-class speed *by default* — when you don't accidentally give it back. Most "Rust is slow" reports are one of: a debug build, allocation in a hot loop, needless copies/serialization, or lock contention. Check those before any cleverness. And the iron law: **no optimization without a measurement in `--release`, before and after.**

## Profiles — free speed first

```toml
# Cargo.toml — the deploy profile that should be your release default
[profile.release]
lto = "thin"          # cross-crate inlining; "fat" squeezes a bit more, builds slower
codegen-units = 1     # better codegen, slower compile — worth it for deploys
# panic = "abort"     # smaller/faster; forfeits unwinding — decide per app (errors.md)

[profile.release-debug]  # for profiling: optimized + symbols
inherits = "release"
debug = true
```

- `RUSTFLAGS="-C target-cpu=native"` when the binary runs where it's built (or pick a baseline like `x86-64-v3`) — unlocks AVX2+ autovectorization. Portable binaries: leave default.
- Allocator: `jemalloc`/`mimalloc` as global allocator often gives 5–20% on allocation-heavy servers for two lines of code. Measure.
- Debug-build slowness of *dependencies* during dev: `[profile.dev.package."*"] opt-level = 2` keeps your code debuggable while deps run fast.

## Measure — the toolbox

| Question | Tool |
| --- | --- |
| Which function burns CPU? | `cargo flamegraph` (or `samply` — great UI); on Linux, `perf record`/`perf report` |
| Is this change faster? (micro) | `criterion` benches — statistical, catches regressions in CI |
| Is this change faster? (whole program) | `hyperfine 'app-old args' 'app-new args'` |
| Who allocates? | `dhat` (heap profiling as a test), `heaptrack` (Linux) |
| Cache misses / branch mispredicts? | `perf stat -d` |
| What did the compiler generate? | `cargo asm` / godbolt with `-O` |

Criterion shape — benchmark realistic inputs, guard against optimizer deletion with `black_box`:

```rust
fn bench_parse(c: &mut Criterion) {
    let input = std::fs::read_to_string("bench_data/real.log").unwrap();
    c.bench_function("parse_log_10k", |b| b.iter(|| parse(black_box(&input))));
}
```

## Allocation discipline (the biggest everyday win)

- **Preallocate**: `Vec::with_capacity(n)`, `String::with_capacity` — growth reallocations copy everything. `collect()` from exact-size iterators preallocates automatically.
- **Reuse buffers** across iterations: `buf.clear()` keeps capacity. The pattern for parsers/servers: one scratch buffer owned by the worker, cleared per message.
- **Don't collect intermediates** — iterator chains fuse lazily: `iter.filter(..).map(..).sum()` allocates nothing; `.collect::<Vec<_>>()` mid-chain allocates and defeats fusion.
- **Strings**: `format!` in a loop → `write!(&mut buf, ...)` into a reused String. Concatenating pairs: `[a, b].concat()` or push_str. Small strings that copy a lot: `compact_str`/`smartstring` (inline up to ~24 bytes).
- **Small collections**: `smallvec`/`arrayvec` for hot Vecs that are usually ≤ N elems (inline storage, no heap). `tinyvec` if you need 100% safe code.
- **Arenas**: many same-lifetime allocations (AST nodes, per-request graphs) → `bumpalo` — allocation becomes a pointer bump, deallocation is dropping the arena. Transformative for compilers/parsers.
- Passing `&mut Vec<T>` as an out-param beats returning fresh `Vec`s in per-frame/per-request loops.

## Layout & data-oriented design

- `size_of` audit hot types: enum size = largest variant; `Box` the fat rare ones. Option<Box<T>>/Option<&T> are pointer-sized (niche optimization) — free.
- Struct-of-arrays beats array-of-structs when you scan one field of many records (`positions: Vec<Vec3>, healths: Vec<f32>` vs `Vec<Entity>`): cache lines carry only what you read, and autovectorization gets contiguous data. Worth it in genuinely hot loops, not everywhere.
- Indices > pointers for graphs (arena + `u32` keys): halves memory, kills lifetime pain, improves locality (ownership-borrowing.md).
- `#[repr(C)]` only for FFI/layout contracts — default repr lets the compiler reorder fields to pack tighter.
- HashMaps: std's SipHash is DoS-resistant but slow-ish; internal maps keyed by trusted data → `rustc-hash`(FxHashMap)/`ahash` for 2-5x. Sorted `Vec` + `binary_search` beats HashMap for small/frozen sets; linear scan beats both under ~32 elements.

## Iterators, bounds checks, and letting the optimizer work

- Iterator chains typically compile to the same asm as hand loops, *minus* the bounds checks `v[i]` can force. Prefer `iter().zip()`, `chunks_exact`, `windows` — `chunks_exact` especially (the compiler knows each chunk's length → vectorizes).
- If profiling truly fingers a bounds check: restructure (`let s = &v[a..b];` hoists one check), assert length upfront (`assert!(v.len() >= n)` lets later checks fold), or — last resort with proof — `get_unchecked` under `unsafe` + SAFETY (unsafe-ffi.md).
- Branchless helps in inner loops: `cmov`-friendly code (`if` on values, not on control flow), sort data to make branches predictable, lookup tables.
- `#[inline]` on small public functions in *libraries* (cross-crate inlining without LTO); `#[inline(always)]` rarely, with a benchmark that proves it. Don't inline big functions — icache is finite.
- Beware accidental `Debug`/`Display` formatting, logging serialization, and `.clone()` inside `tracing`/log macros on hot paths — gate with level checks or use cheap fields.

## Parallelism & SIMD

- **rayon** for data-parallel CPU work: `data.par_iter().map(..).sum()` — one line, near-linear scaling for chunky tasks. Wrong for tiny per-item work (scheduling overhead) and IO (use async). Config: rayon owns a global pool; don't nest it inside per-request handlers without thought.
- **SIMD**: first let autovectorization try (`chunks_exact` + simple arithmetic, `target-cpu`), verify with `cargo asm`. Explicit: `std::simd` (portable, nightly-ish) or `wide`/intrinsics for stable — justified for byte-crunching (parsing, hashing, image/audio DSP). Keep a scalar fallback and a criterion bench proving the gain.
- Concurrency-related perf (contention, channels, async) → concurrency-async.md.

## Zero-copy & IO

- Parse borrowing from the input: `&str`/`&[u8]` slices into the buffer, `serde` with `#[serde(borrow)]`, or zerocopy/bytemuck casts for binary formats — deserialization becomes pointer math. The buffer must outlive the parsed view (ownership rules make this safe, not just fast).
- `bytes::Bytes` for network payloads shared across tasks: refcounted slices, no copies per consumer.
- Buffered IO by default (`BufReader`/`BufWriter` — unbuffered `File` reads are a classic 100x footgun); `read_to_string` once beats line-by-line syscalls; memory-map (`memmap2`) huge read-mostly files.
- Batch syscalls and DB round-trips — latency dominates; this is architecture, not Rust, and it dwarfs micro-opts.

## The honesty rules

Optimize the profile, not the vibes: the hot spot is where the flamegraph says, not where it feels dirty. Keep the naive version in a comment or bench for comparison. Every unsafe-for-speed carries its benchmark delta in the PR description — "unsafe with no measured win" reverts to safe. And when the win is real but small, weigh it against the reader: a 3% gain that doubles review time is often a loss.
