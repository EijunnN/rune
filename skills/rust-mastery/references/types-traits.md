# Types & Traits — Design the Invariants In

## Enums are the language's superpower — use them structurally

```rust
// Not this bag of maybes:
struct Job { running: bool, result: Option<Output>, error: Option<Error>, started: Option<Instant> }

// This — each state carries exactly its own data:
enum Job {
    Queued { since: Instant },
    Running { started: Instant },
    Done(Output),
    Failed(Error),
}
```

- `match` + non-exhaustive-by-default = adding a variant breaks every unhandled site at compile time. Avoid `_ =>` arms on enums you own — they silently swallow future variants (the same sin as an untyped `default:`).
- Data-carrying enums replace: flag+optionals structs, sentinel values (-1, ""), parallel bools, and most inheritance instincts.
- Big variant + small variants = the enum is as big as the biggest: `Box` the large one (`Failed(Box<ErrorReport>)`) — check with `std::mem::size_of` (performance.md).

## Newtypes — types are the cheapest tests

```rust
pub struct UserId(u64);
pub struct Meters(pub f64);
pub struct Sanitized(String);   // constructor validates; possessing one = proof
```

- Mixing up two `u64` parameters compiles; mixing `UserId` and `OrderId` doesn't. Zero runtime cost.
- Validated newtypes with private fields + smart constructors (`Email::parse(s) -> Result<Email, _>`) move validation to the boundary once — everything inside trusts the type (same doctrine as parse-don't-validate).
- Implement only the traits that make sense (`Add` for `Meters`, not for `UserId`); derive `Copy` if small. `#[repr(transparent)]` when FFI/casting needs layout identity.
- Escape hatch ergonomics: `impl Deref` for newtypes is controversial — prefer explicit `.as_str()`/`.0` in libraries; Deref only for true smart-pointer semantics.

## Typestate & consuming APIs

Encode protocol phases in types; transitions consume the old state:

```rust
struct Request<Unsigned>;              // marker generics or separate structs
impl Request<Unsigned> { fn sign(self, key: &Key) -> Request<Signed> }
impl Request<Signed>   { fn send(self) -> Result<Response> }
// Request::new().send()  ← does not compile: no send() on Unsigned
```

Use when misuse is expensive (crypto, connections, state machines); don't typestate everything — it multiplies API surface.

## Generics vs `dyn Trait` — static vs dynamic dispatch

| | `fn f<T: Trait>(x: T)` / `impl Trait` | `dyn Trait` |
| --- | --- | --- |
| Dispatch | static, monomorphized, inlinable — **zero-cost** | vtable call, no inlining |
| Binary/compile | one copy per T (bloat, slower builds) | one copy |
| Collections of mixed types | ✗ | `Vec<Box<dyn Trait>>` ✓ |
| Returning "some type" | `-> impl Trait` (one concrete type) | `-> Box<dyn Trait>` (any) |

Default to generics in hot paths and libraries; reach for `dyn` for heterogeneous collections, plugin registries, cutting compile times in cold paths, and object-safe API boundaries. `&dyn Trait` costs nothing to create; `Box<dyn Trait>` allocates once — neither is "slow" outside tight loops; measure before contorting.

Dyn-compatibility (object safety): no generic methods, no `Self` returns by value. Design traits you'll box accordingly; add `where Self: Sized` on the offending methods to keep the rest usable via dyn.

## Trait design patterns

- **Accept generously, return concretely**: parameters `impl AsRef<str>`, `impl Into<Config>`, `impl Iterator<Item = T>`; returns owned types or `impl Iterator`.
- **Associated types vs generic parameters**: one natural output type per implementor → associated (`Iterator::Item`); caller chooses per call → generic parameter. `Deserialize<'de>`-style: lifetime relationships need generics.
- **Conversions**: implement `From` (get `Into` free); fallible → `TryFrom`. Error enums: `#[from]` via thiserror makes `?` conversions automatic. Don't implement `Into` directly.
- **Default + builder** for configs with many knobs: `Config::builder().timeout(…).build()?` (crate `bon` or hand-rolled consuming builder). Options structs with `..Default::default()` are the lightweight alternative.
- **Sealed traits** (private supertrait module trick) when you must add methods later without breaking downstream impls.
- **Extension traits** (`trait StrExt { fn …(&self) }` + blanket impl) to hang helpers off foreign types — name them `*Ext`, keep them focused.
- **Blanket impls** (`impl<T: Display> MyTrait for T`) are powerful and permanent — coherence means you can't add overlapping impls later; introduce them early or never.
- Operator overloading (`Add`, `Index`) only when the math metaphor is real.

## Const generics & arrays

`fn chunks<const N: usize>(data: &[u8]) -> impl Iterator<Item = &[u8; N]>` — sizes in the type system: no runtime length checks, enables stack allocation and vectorization. Great for crypto blocks, fixed matrices, protocol frames. Arrays `[T; N]` implement the traits you expect and stay on the stack — prefer over `Vec` for small fixed sizes in hot code.

## Trait objects the optimizer loves anyway

`enum` dispatch beats `dyn` when the variant set is closed and known: match on an enum of strategies inlines fully and stays branch-predictable (`enum_dispatch` crate automates it). Closed set → enum; open/plugin set → dyn.

## Derive & std-trait hygiene

- Always `Debug` (custom impl if fields are sensitive — redact, don't skip). `Clone/PartialEq/Eq/Hash/Default` when semantics allow; `PartialOrd/Ord` only with a real total order.
- `Display` = user-facing; `Debug` = developer-facing. Errors implement both (errors.md).
- `Serialize/Deserialize` behind a `serde` feature flag in libraries (don't force the dependency).
- `Send`/`Sync` are auto-derived structurally — you *remove* them by holding non-Send types, and you assert them manually only inside unsafe code with proof (unsafe-ffi.md).
