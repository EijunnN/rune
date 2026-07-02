# Concurrency & Async — Fearless, Not Careless

The compiler eliminates data races (`Send`/`Sync` are checked, not hoped). What it can't eliminate: deadlocks, contention, starvation, and cancellation bugs. Those are yours — this file is the discipline for them.

## Pick the right model first

| Workload | Model |
| --- | --- |
| CPU-bound, data-parallel | **rayon** (`par_iter`) — not async |
| CPU-bound, task-shaped | `std::thread` + channels, or a thread pool |
| IO-bound, thousands of connections/timers | **async (tokio)** |
| A few background jobs in a sync app | plain threads — don't drag a runtime in |
| Mixed | async app + `spawn_blocking`/rayon for the CPU parts |

Async is not "faster threads" — it's cheaper *waiting*. Ten thousand sleeping tasks are cheap; ten thousand spinning tasks are not.

## Threads & channels (sync side)

- `std::thread::scope` borrows local data into threads safely — no `Arc` ceremony for fork-join work.
- Channels: `std::sync::mpsc` is fine; `crossbeam-channel`/`flume` are faster and support `select`. Bounded channels by default — unbounded = an OOM with extra steps; the bound is your backpressure.
- Share state by communicating when the data flows one way (pipeline stages, work queues); share memory (`Arc<Mutex>`) when it's genuinely shared state. Pipelines scale simpler.

## Locks — the discipline

```rust
let value = {
    let guard = state.lock().unwrap();   // scope the guard tightly
    guard.compute_summary()              // extract what you need
};                                        // lock released HERE
expensive_io(value);                      // never under the lock
```

- Critical sections: tiny. No IO, no allocation storms, no calls into unknown code under a lock.
- Lock ordering: if two locks must be held, define one global order and document it — deadlocks are ordering violations.
- `RwLock` only when reads vastly outnumber writes AND read sections are long enough to matter; otherwise Mutex is simpler and often faster (RwLock has more overhead and write-starvation risk).
- Contention shows up in flamegraphs as futex/park time. Fixes in order: shrink the critical section → shard the data (`dashmap`, or N maps keyed by hash) → message passing → atomics.
- Atomics for scalars (counters, flags): `Ordering::Relaxed` for statistics, `Acquire/Release` for handoffs (publish-then-read patterns), `SeqCst` when reasoning fails you (then re-reason). Inventing lock-free algorithms beyond scalars = you now owe a proof; use crossbeam's structures instead.
- `parking_lot` mutexes: smaller, faster, no poisoning — a fine default in applications.

## Send/Sync literacy (decoding the wall of text)

- `Send` = value may *move* to another thread; `Sync` = `&T` may be *shared* across threads. Auto-derived structurally.
- The classics: `Rc`/`RefCell` are not Send/Sync (use `Arc`/`Mutex`); raw pointers aren't Send (wrappers must promise manually — unsafe-ffi.md); `MutexGuard` is not Send (can't hold across threads… or awaits, see below).
- "future is not Send" almost always means a non-Send thing is alive across an `.await` — see troubleshooting.md for surgical fixes.

## Async / tokio doctrine

**Never block the runtime.** A blocking call on a worker thread starves every task scheduled there:

```rust
let parsed = tokio::task::spawn_blocking(move || heavy_parse(bytes)).await??;
// std::fs, reqwest::blocking, diesel, zip crunching, bcrypt → all spawn_blocking (or rayon bridge)
```

**Never hold a lock across `.await`** (non-negotiable #11):

```rust
// WRONG: guard alive across await — blocks all contenders while IO runs; deadlock bait
let mut g = state.lock().await; g.push(fetch().await?);
// RIGHT: await first, lock briefly after
let item = fetch().await?;
state.lock().await.push(item);
```

Prefer `std::sync::Mutex` even in async code when critical sections are short and never cross awaits (cheaper than `tokio::sync::Mutex`); use tokio's only when holding across awaits is genuinely required by design (rare; usually redesign).

**Spawning & structure**:
- `tokio::spawn` tasks are independent; the returned `JoinHandle` must be awaited or consciously detached (a dropped-and-forgotten handle hides panics — errors.md).
- Fan-out with structure: `JoinSet` (dynamic N, cancel-on-drop), `try_join!` (fixed few, fail-fast), `FuturesUnordered` (stream-style). Bound concurrency: `buffer_unordered(n)` on streams or a `Semaphore` — unbounded fan-out DoSes your own dependencies.
- Tasks need `'static`: move owned/`Arc` data in. Cloning an Arc per spawn is the honest pattern.

**Cancellation is everywhere.** Any future can be dropped at any `.await` — by `select!`, timeouts, or a dropped handle:
- Write cancel-safe critical sequences: don't leave half-written state across an await; commit atomically after the awaits, or use scopeguard/Drop for cleanup.
- `tokio::select!` races futures and *drops the losers* — in loops, beware losing a partially-received message (use cancellation-safe ops like `recv()` on tokio channels, which are documented cancel-safe).
- Graceful shutdown: a `CancellationToken` (tokio-util) or watch channel checked in loops + `select!` on it around long awaits; then `JoinSet::shutdown`/await drains.

**Timeouts at every boundary**: `tokio::time::timeout(dur, fut)` around network calls — a missing timeout is an unbounded queue of stuck tasks.

**Runtime hygiene**: one runtime per process (`#[tokio::main]`); never `block_on` inside a runtime thread (panics or deadlocks); async trait methods are native now (`impl Trait` in traits) — `async-trait` crate only for dyn dispatch.

## Async performance notes

- Tasks are cheap (~KB) but not free: batching tiny operations beats task-per-item; a `for` loop of awaits is sequential — `join_all`/`buffer_unordered` for real concurrency.
- Don't `spawn` for concurrency you could get with `join!` in one task — spawning costs synchronization (Send bounds, Arc'ing) that plain composition doesn't.
- Channels as backpressure: `mpsc::channel(bound)` — the await on `send` when full *is* the flow control. `watch` for latest-value state, `broadcast` for fan-out events, `oneshot` for request/reply.
- Measure async services with `tokio-console` (task stalls, busy loops) and normal flamegraphs (`--release`, `tokio = { features = ["rt-multi-thread"] }`).

## Testing concurrent code

`#[tokio::test(start_paused = true)]` fake time: `tokio::time::advance()` makes timeout/retry tests instant and deterministic. `loom` model-checks handwritten atomics/locks (small models only — but if you wrote novel atomics, you owe it a loom test). Race-condition regression tests: spawn N contenders with `Promise.all`-style joins and assert the invariant held (single winner, no double-spend).
