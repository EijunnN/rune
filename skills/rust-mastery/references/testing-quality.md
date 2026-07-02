# Testing & Quality — Proof at Every Level

Rust's type system is tier zero of the test suite: what the compiler proves (no nulls, no races, exhaustive matches) needs no test. Spend the testing budget on what it can't prove: logic, invariants, IO edges, and the soundness of `unsafe`.

## The three built-in test kinds (use all three)

```rust
// 1. Unit tests — same file, see private items:
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_expired_tokens() {
        let token = a_token(expired());
        assert!(matches!(validate(&token), Err(AuthError::Expired { .. })));
    }
}
```

```
// 2. Integration tests — tests/*.rs compile as EXTERNAL crates:
//    they can only use your public API — which makes them API-design tests too.
// 3. Doc tests — every ``` block in rustdoc runs in `cargo test`; free examples-that-can't-rot.
```

- Unit tests live beside the code (`#[cfg(test)]` costs nothing in builds); integration tests validate the public surface; doc tests keep documentation true. A library with zero doc tests has documentation on parole.
- Shared helpers for integration tests: `tests/common/mod.rs` (not `tests/common.rs`, which becomes its own test crate).
- Test names state behavior (`splits_utf8_on_char_boundaries`), asserts prefer `assert_eq!`/`matches!` with the failing values visible. `#[should_panic(expected = "...")]` sparingly — asserting `Err` variants beats asserting panics.

## Fallible tests & fixtures

- Tests return Results: `fn parses_config() -> anyhow::Result<()>` lets you use `?` instead of unwrap ladders.
- Builders over fixtures (same doctrine as any language): `fn a_user(over: impl FnOnce(&mut User))` or plain functions with struct-update. Fixed timestamps, seeded RNG (`StdRng::seed_from_u64(42)`), `tempfile::tempdir()` for FS (auto-cleans).
- Table-driven: a `Vec<(input, expected)>` loop, or `#[rstest]` for parametrized cases with per-case names.

## Property-based testing — where Rust shines

```rust
proptest! {
    #[test]
    fn roundtrip(input in any::<Vec<u8>>()) {
        prop_assert_eq!(decode(&encode(&input))?, input);
    }
    #[test]
    fn never_panics(s in "\\PC*") { let _ = parse(&s); }  // total functions stay total
}
```

- `proptest` (or `quickcheck`) for parsers, codecs, math, collections: state invariants ("output sorted", "roundtrips", "len preserved") and let the framework hunt counterexamples — it shrinks failures minimal and *persists* them as regression seeds (commit the `proptest-regressions/` dir).
- Pair with fuzzing for untrusted-input code: `cargo fuzz` targets are ~10 lines and run the same invariants under libFuzzer (unsafe-ffi.md for why this is mandatory around unsafe parsers).

## Snapshot & CLI testing

- `insta` for structured/large outputs (rendered templates, error reports, debug trees): `assert_snapshot!`/`assert_json_snapshot!`, review diffs with `cargo insta review`. Same discipline as any snapshot: small, read on review, never blind-accepted.
- CLI binaries: `assert_cmd` + `predicates` (spawn the real binary, assert exit/stdout/stderr) and `trycmd` for README-style transcript tests.

## Async & concurrent tests

- `#[tokio::test]` per test runtime; `start_paused = true` + `time::advance()` makes timeout/retry logic instant and deterministic — never real-sleep in tests.
- Race regressions: spawn N contenders (`JoinSet`), assert the invariant (exactly one winner, counter == N). Flaky concurrency tests are real races until proven otherwise.
- `loom` for hand-rolled atomics/lock protocols (exhaustively explores interleavings on a small model). If you wrote novel `unsafe` synchronization, a loom test is part of the definition of done.
- **Miri in CI** for every crate with unsafe (`cargo +nightly miri test`) — it's the UB detector; see unsafe-ffi.md.

## Benchmarks as tests

- `criterion` benches live in `benches/`, run against committed baselines (`--save-baseline main`, compare in PRs). Performance claims in code review link a criterion delta — same rule as the performance doctrine.
- For CI-stable perf gates prefer `iai-callgrind` (instruction counts — immune to noisy runners) or track criterion trends rather than hard thresholds.

## Coverage, mutation & the runner

- `cargo llvm-cov` for coverage — same doctrine as everywhere: a flashlight for forgotten risk on critical modules, not a target. `cargo mutants` for mutation testing where correctness is the product (parsers, money math).
- `cargo nextest`: faster parallel runner, per-test process isolation (a segfaulting test doesn't kill the run), retries-with-reporting for flake telemetry, JUnit output for CI. Worth adopting on any non-trivial suite.
- Compile-fail tests (`trybuild`) when your API's *misuse* must not compile (typestate, sealed traits, macro diagnostics) — asserting the error message pins your API's ergonomics.

## What NOT to test in Rust

Exhaustiveness the compiler enforces, `Send`/`Sync` (assert once with a static assertion if it's a contract: `fn _assert_send<T: Send>() {}`), derived trait output, and std behavior. And don't unit-test private helpers through contortions — test through the public API (integration tests literally enforce this), or the helper wants to be its own module.
