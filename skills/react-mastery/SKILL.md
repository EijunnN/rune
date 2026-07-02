---
name: react-mastery
description: Expert React doctrine for writing, reviewing, refactoring, and debugging React code — component architecture, state management, effects discipline, rendering performance and the React Compiler, React 19 APIs (actions, use(), Server Components), TypeScript patterns, Testing Library, and accessibility. Use whenever working in a React or Next.js codebase — building components or hooks, fixing re-renders or slow interactions, reviewing React PRs, writing component tests, or deciding where state and data fetching belong.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# React Mastery

Operating doctrine for production React (19+, Compiler era). Priority order: **correct,
then simple, then fast** — in React the three usually converge, because most performance
problems are architecture problems wearing a costume.

## Reference map

Read the matching reference **before** writing code in that area — not after review bounces.

| Task involves | Read |
| --- | --- |
| Designing/refactoring components, composition, props API, file structure | [references/architecture.md](references/architecture.md) |
| Deciding where state lives, derived state, context, stores, URL state | [references/state.md](references/state.md) |
| Any `useEffect`, subscriptions, timers, data races, refs | [references/effects.md](references/effects.md) |
| Re-renders, slow lists, INP, bundle size, React Compiler | [references/performance.md](references/performance.md) |
| Forms, actions, `use()`, Server Components, server actions, React 19/19.2 APIs | [references/modern-react.md](references/modern-react.md) |
| Typing props, generics, events, refs, hooks | [references/typescript.md](references/typescript.md) |
| Writing or fixing component/hook tests | [references/testing.md](references/testing.md) |
| Interactive widgets, focus, keyboard, ARIA, forms UX | [references/accessibility.md](references/accessibility.md) |

## Non-negotiables

1. **Derive, don't store.** Anything computable from existing props/state is computed in
   render — never mirrored into state and synced with an effect.
2. **Effects synchronize with external systems only** (DOM libs, subscriptions, network,
   timers). If no external system is involved, you don't need an effect.
3. **Never lie to the dependency array.** Fix the code, not the lint. A
   `eslint-disable react-hooks/exhaustive-deps` is a bug report, not a fix.
4. **State lives as low as possible, as high as necessary.** Colocate first; lift only
   when two components truly share it.
5. **`key` is identity, not an index.** Index keys are acceptable only for static,
   never-reordered, never-filtered lists.
6. **Semantic HTML before ARIA.** `<button>`, not `<div onClick>`. ARIA is the fallback,
   not the default.
7. **Test behavior through the accessibility tree.** Query by role and accessible name;
   `data-testid` is the last resort.
8. **Measure before memoizing.** Profile with React DevTools first. With the React
   Compiler enabled, hand-written `useMemo`/`useCallback`/`memo` is legacy — write plain
   code and let the compiler memoize.
9. **Server data belongs to a server cache** (Server Components or a query library), not
   to `useState` + `useEffect`.
10. **Mutations go through actions** (React 19): pending, error, and optimistic UI come
    from `useActionState`/`useOptimistic`/`useFormStatus`, not hand-rolled booleans.
11. **Every server action is a public HTTP endpoint.** Authenticate and validate input
    inside each action, every time — its callers are not only your UI.
12. **Type the boundaries.** No `any` in props or API edges; validate external data at
    runtime (e.g. zod) where it enters the app.
13. **One component, one job.** When JSX grows distinct responsibilities, extract — but
    apply the rule of three before abstracting.
14. **Colocate.** Code lives next to where it's used: styles, tests, hooks, types.
15. **Prefer deleting complexity over abstracting it.**

## Decision framework — where does this state live?

1. **Can it be derived** from existing props/state? → Not state. Compute in render.
2. **Does the server own it** (fetched data)? → Server Component / query library cache.
3. **Should it survive refresh or be shareable** (filters, tab, pagination)? → URL.
4. **Used by one component?** → `useState`/`useReducer` right there.
5. **Shared by siblings?** → Lift to the nearest common parent — and no higher.
6. **Needed far away, changes rarely** (theme, locale, session)? → Context.
7. **Needed far away, changes often?** → External store with selectors
   (`useSyncExternalStore`, Zustand) — context will re-render every consumer.

## Decision framework — do I need an effect?

- Transforming data for render? → **Compute in render** (memo if provably expensive).
- Resetting state when a prop changes? → **`key` on the component.**
- Responding to a user event? → **Event handler.**
- Notifying the parent? → **Call the callback in the handler**, same event.
- Chaining state updates? → **One handler or a reducer**, single pass.
- Fetching data? → **Framework loader / RSC / query library.** A raw fetch-in-effect
  needs an ignore flag or `AbortController` for races — see effects.md.
- Subscribing to an external store? → **`useSyncExternalStore`.**
- Actually synchronizing with a non-React system (widget, socket, analytics, title)?
  → Yes, that's an effect. Write symmetric setup/cleanup that survives Strict Mode's
  double-invoke.

## Decision framework — it's slow

Triage in this order; each step is cheaper and more durable than the next:

1. **Profile** (React DevTools Profiler; React 19.2 Performance Tracks). Name the exact
   component and the reason it renders. No guessing.
2. **Colocate state down** — move state into the component that uses it.
3. **Lift content up** — pass expensive subtrees as `children` so they keep referential
   identity while the stateful wrapper re-renders.
4. **Memoize** — `memo`/`useMemo`/`useCallback` (skip if the Compiler is on; it does this).
5. **Split context** — separate state from dispatch; or move to a store with selectors.
6. **Virtualize** long lists (hundreds+ rows).
7. **Defer** non-urgent updates — `useTransition` / `useDeferredValue`.
8. **Code-split** heavy, below-the-fold, or route-level chunks with `lazy` + `Suspense`.

## Anti-pattern quick table

| Smell | Fix | Reference |
| --- | --- | --- |
| `useState` + `useEffect` mirroring props/state | Derive in render; `key` for resets | effects.md |
| Effect that only calls `setState` | Compute in render or move to handler | effects.md |
| Fetch in effect without cancellation | Ignore flag / `AbortController`, or query lib | effects.md |
| `useCallback`/`useMemo` everywhere "just in case" | Profile; enable Compiler; delete | performance.md |
| Context holding fast-changing values | Split contexts or store + selectors | state.md |
| Boolean prop explosion (`isSmall`, `isPrimary`, …) | `variant`/`size` unions; composition | architecture.md |
| `<div onClick>` interactive elements | Native `<button>`/`<a>`; keyboard for free | accessibility.md |
| Index as `key` on dynamic lists | Stable ID from the data | performance.md |
| Multiple booleans encoding one state | One `status` union / reducer | state.md |
| Testing state values or mock internals | Test rendered behavior via roles | testing.md |
| `isSubmitting` state hand-rolled around fetch | Form action + `useActionState` | modern-react.md |
| Giant "god" component | Extract by responsibility; compose | architecture.md |

## Review checklist

**Rendering** — no derived state stored; no effect that a render or handler could
replace; stable keys; expensive work not in hot render paths.
**State** — minimal source of truth; status unions over boolean piles; reducers where
transitions are multi-field; context values memoized and split.
**Effects** — every dep honest; cleanup mirrors setup; races handled; survives Strict
Mode double-invoke.
**Performance** — profiled evidence for any memoization; lists virtualized past a few
hundred rows; heavy widgets lazy-loaded; Compiler-compatible (Rules of React hold).
**React 19** — mutations via actions; `ref` as prop (no `forwardRef`); no removed APIs
(`propTypes`, `defaultProps` on functions, string refs, legacy context).
**Server** — server actions authenticate + validate; only serializable props cross the
RSC boundary; client islands as small as possible.
**Types** — no `any` at edges; discriminated unions for variant props; events and refs
precisely typed.
**Tests** — behavior not implementation; roles-first queries; `user-event` over
`fireEvent`; MSW at the network edge; loading/error states covered.
**Accessibility** — semantic elements; every input labeled; focus managed in dialogs and
route changes; keyboard path complete; announcements for async results.

## Version notes (what's current)

- **React 19**: actions (`useActionState`, `useFormStatus`, `useOptimistic`), `use()`,
  `ref` as a regular prop with cleanup functions, document metadata hoisting,
  `preload`/`preinit`, Context rendered directly as a provider (`<Ctx value>`), Server
  Components + `"use server"` actions stable.
- **React 19.2**: `<Activity>` (keep-alive/hidden UI), `useEffectEvent` (stable — the
  right tool for "read latest value inside an effect without re-subscribing"),
  Performance Tracks in Chrome DevTools.
- **React Compiler 1.0**: auto-memoization at build time. Requires Rules of React
  compliance (lint with `eslint-plugin-react-hooks` v6+). Opt out per-file with
  `"use no memo"`. It does **not** fix expensive effects, network waterfalls, giant
  bundles, or unvirtualized lists.
- **Removed in 19** (do not suggest): `propTypes`, `defaultProps` on function components,
  string refs, legacy context, `findDOMNode`, `ReactDOM.render`/`hydrate`.
