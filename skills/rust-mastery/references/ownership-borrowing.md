# Ownership & Borrowing — Stop Fighting, Start Designing

The rules are three: every value has one owner; you may have many `&T` XOR one `&mut T`; borrows can't outlive the owner. Everything else is technique for designing *with* them. A borrow-checker error is the compiler telling you your data's ownership story is ambiguous — the fix is to make the story explicit, not to clone until it compiles.

## The classic fights and their real fixes

**"cannot borrow `self.x` because `self` is also borrowed" — split borrows.** The checker tracks fields independently *within one function*, but a `&self` method borrows all of self:

```rust
// FIGHT: self.log(format!(...)) while iterating self.items — two overlapping self borrows
// FIX 1: borrow fields directly (field-level splitting works inline):
let (items, log) = (&self.items, &mut self.log);
for item in items { log.push(item.describe()); }
// FIX 2: extract a free function taking the two fields
// FIX 3: restructure — maybe Log doesn't belong inside the same struct
```

**"cannot borrow as mutable while immutable borrow exists" — narrow the borrow's life.** Compute first, mutate after:

```rust
// FIGHT: let first = &v[0]; v.push(x); use(first);
// FIX: copy/clone the small thing out, or reorder:
let first = v[0].clone();   // deliberate: small value, borrow would block growth
v.push(x);
```

**HashMap double-access — the `entry` API exists for this:**

```rust
*counts.entry(word).or_insert(0) += 1;               // one lookup, no fight
map.entry(k).or_insert_with(Vec::new).push(v);
```

Caveat: `entry()` takes the key **by value** — costly when keys are heap strings and most lookups hit existing entries. Hot-path arbitration: pre-check with `get_mut` (`if let Some(v) = map.get_mut(key) { ... } else { map.insert(key.to_owned(), init) }` — allocates only on first insertion), or use hashbrown's `entry_ref()` which borrows the key and clones only on vacancy.

**"cannot move out of borrowed content" — take ownership honestly:**

```rust
let owned = std::mem::take(&mut self.buffer);        // leaves Default in place
let state = std::mem::replace(&mut self.state, State::Idle);
// Option fields: self.pending.take()
```

**Self-referential structs ("store a thing and a reference into it") — don't.** Store indices/keys instead of references, split into two structs, or reach for `ouroboros`/`Pin` only after accepting you're in expert territory. This design is the #1 generator of unfixable lifetime errors.

**Returning references to locals — you can't; return owned or restructure** so the caller owns the storage and you return `&`s *into arguments*: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`.

## Lifetimes — what you actually need

- Elision covers most signatures: one input reference → output borrows from it; `&self` → output borrows from self. Write explicit lifetimes only when there are multiple sources and the compiler asks.
- A lifetime parameter never *extends* anything — it only names a relationship that already exists. If the fix seems to be "add lifetimes until it compiles", the real fix is usually owned data.
- `'static` means "no borrowed data" (owned counts!) — `String` is `'static`. The bound `T: 'static` on spawn/threads rejects references, not owned values.
- Structs holding references (`struct Parser<'a> { input: &'a str }`) are great for *transient* views (parsers, iterators) and miserable for long-lived state. Rule: references flow *down* the call stack; owned data lives *up* in long-lived structs.
- `for<'a>` (HRTB) appears mostly in closure bounds (`F: Fn(&str) -> &str` desugars to it) — when the compiler mentions it, you usually need `-> String` or a different closure signature, not deeper lifetime surgery.

## The pointer/container ladder (memorize the defaults)

| Need | Reach for | Notes |
| --- | --- | --- |
| Just data | `T` on the stack | the default; move semantics are free |
| Heap / huge / recursive type | `Box<T>` | also: shrink enum variants; `dyn Trait` |
| Many readers, one thread | `Rc<T>` | cheap non-atomic refcount |
| Many readers, across threads | `Arc<T>` | atomic refcount — don't pay it single-threaded |
| Shared mutation, one thread | `RefCell<T>` (inside `Rc`) | runtime-checked borrows; panics on violation — treat a `BorrowMutError` as a design smell |
| Shared mutation, threads | `Mutex<T>` / `RwLock<T>` (inside `Arc`) | see concurrency-async.md |
| Single atomic scalar | `AtomicUsize` etc. | counters/flags; beware inventing lock-free protocols |
| Maybe-owned | `Cow<'a, T>` | "borrow usually, allocate when modified" — great for normalize-if-needed APIs |
| One-time init | `OnceLock<T>` / `LazyLock<T>` | replaces lazy_static/once_cell in std |

Cycles: `Rc`/`Arc` cycles leak (refcounts never hit zero). Parent↔child = child holds `Weak` to parent, or use indices/arena (`slotmap`, `Vec` + generational keys) — the arena pattern is also faster (cache locality).

## Clones: the honest taxonomy

- **Good clone**: small value (`i32`s, short `String` at a boundary), config fanned out at startup, crossing a thread/task boundary where sharing would couple lifetimes.
- **Lazy clone**: `Cow` or restructuring would avoid it in the hot path.
- **Checker-appeasement clone**: the sentence "because it wouldn't compile" — go back to the ladder.
- `Arc::clone(&x)` is a refcount bump, not a data copy — idiomatically written that way to *say so*. Cloning an `Arc` per loop iteration is still a smell (clone once before the loop / pass a reference).
- For "clone-heavy" domains (immutable trees, undo history): `im`/persistent structures or plain `Arc`-shared snapshots beat deep clones.

## Moves, `Copy`, and API consequences

- Move semantics are memcpy-at-most, often optimized away — never avoid moves "for performance".
- Derive `Copy` only for small plain data (≤ ~2 machine words guideline: numbers, small enums, `[u8; N]`). `Copy` on big arrays makes silent expensive copies *easier* to write.
- Taking `self` by value is an API tool: builders (`fn build(self) -> App`), typestate transitions (`fn start(self) -> Running`) — the old state is *consumed*, invalid states can't be touched again. That's ownership as correctness, not ceremony.
