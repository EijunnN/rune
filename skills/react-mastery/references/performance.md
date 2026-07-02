# Performance & the React Compiler

## Mental model

A **render** is React calling your function and diffing the result; a **commit** applies
the diff to the DOM. Renders are usually cheap — the expensive failure modes are *many*
renders of *heavy* subtrees, layout thrash, unvirtualized lists, network waterfalls, and
oversized bundles. Optimizing un-measured code is how codebases fill with `useCallback`
noise that fixes nothing.

A component re-renders when: (a) its own state changed, (b) its parent re-rendered
(unless memoized with stable props), (c) a context it consumes changed, (d) its external
store slice changed. Props "changing" alone never triggers a render — a parent render
does.

## Profile first — the workflow

1. Reproduce the slow interaction.
2. **React DevTools Profiler**: record it. Read the flamegraph — which components
   rendered, how long, and *why* ("Why did this render?" in settings).
3. React 19.2 adds **Performance Tracks** to the Chrome Performance panel — see
   scheduler priorities and component work on the timeline.
4. Name the culprit precisely ("`<Table>` re-renders on every keystroke of `<Search>`
   because state lives in their common parent") — then fix with the ladder below.

## The fix ladder

Ordered: prefer architectural fixes (1–2) — they can't go stale — before memoization.

**1. Colocate state down.** State used by one subtree lives in that subtree.

```tsx
// ❌ typing re-renders the whole page
function Page() {
  const [query, setQuery] = useState("");
  return <><SearchInput value={query} onChange={setQuery} /><HeavyTable /></>;
}
// ✅ extract the stateful island
function Page() {
  return <><Search /><HeavyTable /></>; // typing re-renders only <Search>
}
```

**2. Lift content up (children pattern).** A stateful wrapper re-renders, but the
element it received as `children` is referentially identical — React skips it:

```tsx
function ScrollTracker({ children }: { children: ReactNode }) {
  const [y, setY] = useState(0); // updates constantly…
  return <div onScroll={(e) => setY(e.currentTarget.scrollTop)}>{children}</div>;
} // …but {children} (e.g. <HeavyTable/>) does not re-render
```

**3. Memoize.** `memo` on the heavy leaf, `useMemo`/`useCallback` to keep its props
stable. **If the React Compiler is enabled, skip this rung — it's automatic.** Memo is
defeated by: inline object/array/function props, unstable `children` elements, and
spread props of unknown stability.

**4. Split context / use selectors.** Separate state-context from dispatch-context;
move high-frequency values to a store where components subscribe to slices.

**5. Virtualize** lists beyond a few hundred rows: `@tanstack/react-virtual` or
`react-window`. Render the viewport, not the dataset.

**6. Defer non-urgent work.**

```tsx
// urgent: the input echoes the keystroke; deferred: the heavy results re-filter later
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => filterHuge(items, deferredQuery), [items, deferredQuery]);
```

`useTransition` marks *updates you own* as interruptible (tab switches, filter clicks) —
`isPending` gives you the pending UI. `useDeferredValue` lags *a value you receive*.
Neither replaces network debouncing.

**7. Code-split** heavy/below-the-fold/route-level chunks:

```tsx
const Chart = lazy(() => import("./Chart"));
<Suspense fallback={<ChartSkeleton />}><Chart data={d} /></Suspense>
```

## React Compiler

Build-time auto-memoization (components, hooks, and the values inside them). What it
means in practice:

- **Write plain code.** New code shouldn't hand-roll `useMemo`/`useCallback`/`memo` for
  render performance; existing ones can stay until cleanup.
- It requires **Rules of React** compliance: pure render, no mutating props/state,
  hooks called unconditionally. Enforce with `eslint-plugin-react-hooks` v6+ — the
  compiler simply *skips* components that violate the rules (they stay correct, just
  unmemoized).
- Enable: Next.js `reactCompiler: true`; Vite/others via `babel-plugin-react-compiler`.
  Escape hatch per component: `"use no memo"` directive.
- It does **not** fix: expensive effects, network waterfalls, unvirtualized lists,
  bundle size, or state placed too high. The ladder's rungs 1–2 and 5–7 remain yours.

## Keys and lists

`key` declares identity across renders. Index keys on dynamic lists cause state
bleeding between rows and full-list re-reconciliation on reorder/insert. Use the data's
stable id. Never `key={Math.random()}` / `crypto.randomUUID()` in render — that's a
remount per render. Generated-once ids for client-created items are fine.

## Responsiveness (INP)

- Keep event handlers under ~50ms; move heavy reactions behind `startTransition`.
- Batching is automatic (18+): multiple `set` calls in any handler/async body = one render.
- Don't interleave DOM reads (`getBoundingClientRect`, `offsetHeight`) with writes —
  batch reads, then writes; layout thrash multiplies handler cost.
- Debounce *network*; defer *render* (rung 6). Different tools, different problems.

## Waterfalls & Suspense

Fetch-on-render cascades (parent fetches → renders child → child fetches…) are the
biggest real-world latency source:

- Hoist data needs to the route/server level; in Server Components start requests in
  parallel (`Promise.all`, or kick off promises before `await`ing).
- Pass *promises* down and `use()` them under one `Suspense` boundary (modern-react.md).
- Place `Suspense` boundaries where a *meaningful* unit of UI appears — one per
  independent island, not one per component. Pair with error boundaries at the same level.
- Preload on intent: `preload(url, { as: "fetch" })`, router prefetching, warm caches on
  hover/viewport.

## Bundle

- Measure first: `@next/bundle-analyzer` / `rollup-plugin-visualizer` / source-map-explorer.
- Route-level splitting comes free with frameworks; add `lazy()` for heavy widgets
  (editors, charts, maps) and rarely-open dialogs.
- Import surgically: `date-fns` per-function, direct icon imports (`lucide-react`
  tree-shakes named imports), no barrel-of-everything internal imports in hot paths.
- Keep client islands small in RSC apps — every `"use client"` boundary drags its
  imports into the browser bundle.
- Fonts: `display: swap`, subset; images: explicit dimensions (no CLS), lazy-load
  below-the-fold, prioritize the LCP image.
