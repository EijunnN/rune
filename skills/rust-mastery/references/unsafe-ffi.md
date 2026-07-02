# Unsafe & FFI — The Contract Zone

`unsafe` doesn't turn off the borrow checker — it unlocks five extra powers (deref raw pointers, call unsafe fns, implement unsafe traits, mutate statics, access unions) and transfers the proof obligation from compiler to you. The obligation is *soundness*: no possible use of your safe API may trigger UB. Unsound code that "works" is a time bomb rearmed by every compiler upgrade.

## When unsafe is justified (short list)

1. FFI — calling C/C++/system APIs.
2. A data structure std genuinely lacks (intrusive lists, custom allocators, lock-free beyond scalars) — *after* checking crates.io (someone already wrote and fuzzed it).
3. A **measured** hot-path win the safe version can't reach (bounds checks the optimizer won't elide, `from_utf8_unchecked` on pre-validated bytes) — with the criterion delta recorded in the PR.
4. Platform intrinsics (SIMD beyond `std::simd`, syscalls).

Not justified: appeasing the borrow checker, "clone felt wasteful", transmuting to skip API design, or speed hunches without benchmarks.

## The non-negotiable form

```rust
/// Returns the first chunk as a fixed array.
/// (Public API is SAFE — the unsafety is encapsulated and locally proven.)
pub fn first_chunk<const N: usize>(v: &[u8]) -> Option<&[u8; N]> {
    if v.len() < N { return None; }
    // SAFETY: we just checked v.len() >= N, so the pointer covers N valid,
    // initialized, aligned bytes borrowed for the same lifetime as `v`.
    Some(unsafe { &*(v.as_ptr() as *const [u8; N]) })
}
```

- **`// SAFETY:` comment on every unsafe block**, stating the invariant and where it's established. Clippy `undocumented_unsafe_blocks` enforces this — turn it on.
- **Smallest possible scope**: one expression per block beats a 40-line unsafe body; each gets its own proof.
- **Safe wrapper**: the module boundary is the soundness boundary. All inputs that could break the invariant are checked (or the function itself is marked `unsafe fn` with documented preconditions under `# Safety`).
- **Encapsulation includes fields**: if safe code in the same module can set `len` beyond capacity, your unsafe block's proof is void. Keep invariant-carrying fields private; audit the whole module, not the block.

## The UB catalog (what you're promising never happens)

- Dangling/unaligned/null derefs; out-of-bounds access.
- **Aliasing violations**: a `&mut T` coexisting with any other live reference to the same data — this is stricter than C, and the #1 way "it works in C" code is UB in Rust. Never create two `&mut` from raw pointers to overlapping data.
- **Invalid values**: `bool` that's 3, uninhabited enums, non-UTF-8 `str`, uninitialized integers (`MaybeUninit` exists precisely so you never "read" uninit memory).
- Data races (unsynchronized cross-thread access) — implementing `unsafe impl Send/Sync` is *claiming* your synchronization story; write it down next to the impl.
- `transmute` size/validity violations — prefer `bytemuck`/`zerocopy` (checked, derive-based casting) over raw transmute for POD data; they turn most transmutes into safe code.

References vs pointers rule of thumb: convert raw → reference as *late* as possible, keep raw pointer arithmetic in one place, and never let a reference produced from a raw pointer outlive the buffer's true lifetime.

## Verification — unsafe without tooling is vibes

- **Miri** (`cargo +nightly miri test`): interprets your tests and catches UB (aliasing, OOB, uninit, leaks in tests). Every crate containing `unsafe` runs Miri in CI on the modules that exercise it. Miri can't see FFI — isolate FFI behind features so the rest still runs.
- **Sanitizers** (`RUSTFLAGS="-Zsanitizer=address"` etc., nightly): ASan/TSan for the FFI-heavy parts Miri can't reach.
- **Fuzzing** (`cargo fuzz`): parsers and anything taking untrusted bytes across an unsafe boundary. Fuzz targets are tiny; the payoff is huge.
- `#[deny(unsafe_op_in_unsafe_fn)]` — makes unsafe operations inside `unsafe fn` require their own blocks (and their own SAFETY comments).
- `cargo geiger` counts unsafe in your dependency tree when auditing.

## FFI with C — the mechanics

```rust
// build.rs: cc crate compiles vendored C; bindgen generates declarations from headers
#[repr(C)]
pub struct Point { x: f64, y: f64 }

unsafe extern "C" {
    fn lib_process(data: *const u8, len: usize, out: *mut Point) -> i32;
}

pub fn process(data: &[u8]) -> Result<Point, LibError> {
    let mut out = MaybeUninit::<Point>::uninit();
    // SAFETY: data ptr/len come from a valid slice; out is writable for one Point;
    // lib_process (docs §3.2) writes out fully iff it returns 0.
    let code = unsafe { lib_process(data.as_ptr(), data.len(), out.as_mut_ptr()) };
    match code {
        0 => Ok(unsafe { out.assume_init() }),
        c => Err(LibError::from_code(c)),
    }
}
```

- `#[repr(C)]` on every shared struct; `bindgen` (C→Rust) and `cbindgen` (Rust→C) generate the boilerplate — don't hand-transcribe headers.
- Strings: `CString`/`CStr` (NUL-terminated, no interior NULs); never pass `&str` raw. Ownership across the boundary must be documented per function: who frees? (If C allocates, C frees — expose a `lib_free` and wrap in a Drop guard.)
- **Panics must not cross FFI** — UB. `extern "C"` callbacks wrap bodies in `catch_unwind` and translate to error codes.
- Callbacks with state: pass a `Box::into_raw` user-data pointer, reconstitute with `Box::from_raw` exactly once (double-free otherwise); document threading assumptions — C calling you from arbitrary threads means your state must be Sync.
- Error codes ↔ `Result` translation lives at the boundary; inside, it's normal Rust errors (errors.md).

## Pin (the two-sentence version)

`Pin` guarantees a value won't move again — needed by self-referential futures and intrusive structures. You'll *use* it (Box::pin, pin! macro, poll fns) far more than you'll ever need to write `unsafe` pin projections; if you're hand-writing them, use the `pin-project` crate instead of raw unsafe.
