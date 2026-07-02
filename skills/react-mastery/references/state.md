# State Management

## Placement algorithm

For every piece of data, in order:

1. **Derivable?** Compute in render. Not state.
2. **Server-owned?** Server Component / query library (TanStack Query, SWR). Not `useState`.
3. **Shareable/bookmarkable** (filters, tab, page, search)? URL search params.
4. **One component?** `useState`/`useReducer` there. Colocate ruthlessly.
5. **Siblings share it?** Lift to nearest common parent — no higher.
6. **App-wide, low-frequency** (theme, session, locale)? Context.
7. **App-wide, high-frequency?** Store with selectors (Zustand, `useSyncExternalStore`).

Every level you lift state costs re-render scope and coupling. Every level too low
costs prop-drilling and duplication. When both fight, restructure with composition
(see architecture.md) before reaching for context.

## Derive, don't store

```tsx
// ❌ stored + synced: three sources of truth, one guaranteed bug
const [items, setItems] = useState<Item[]>([]);
const [visible, setVisible] = useState<Item[]>([]);
const [total, setTotal] = useState(0);
useEffect(() => {
  setVisible(items.filter((i) => i.active));
  setTotal(items.reduce((s, i) => s + i.price, 0));
}, [items]);

// ✅ one source of truth, the rest is arithmetic
const [items, setItems] = useState<Item[]>([]);
const visible = items.filter((i) => i.active);
const total = items.reduce((s, i) => s + i.price, 0);
```

Wrap in `useMemo` only when profiling shows the computation is expensive *and* the
Compiler isn't enabled. Correctness first: derived-in-render can never go stale.

Do not mirror props into state. The one legitimate variant is *seeding*:

```tsx
function Editor({ initialDraft }: { initialDraft: string }) {
  const [draft, setDraft] = useState(initialDraft); // reads once, on purpose
}
// caller resets it by remounting:
<Editor key={documentId} initialDraft={doc.body} />
```

## Structuring state

- **One `status`, not boolean piles.** `{ status: "idle" | "loading" | "success" | "error" }`
  makes `isLoading && isError` unrepresentable.
- **No duplication.** Store the `selectedId`, not a copy of the selected object.
- **Normalize** deeply nested collections into `Record<Id, Entity>` + `Id[]` when you
  update items individually; nested spread pyramids are the tell.
- **Group what changes together** (`{ x, y }` for a pointer), split what doesn't.

## useState vs useReducer

Reach for a reducer when: the next state depends on the previous across several fields;
one event updates multiple fields; update logic needs unit tests; or updates arrive from
many handlers that must stay consistent.

```tsx
type Action =
  | { type: "add"; item: Item }
  | { type: "remove"; id: string }
  | { type: "setQuantity"; id: string; qty: number };

function cartReducer(state: Cart, action: Action): Cart {
  switch (action.type) {
    case "add": /* … */
    case "remove": /* … */
    case "setQuantity": /* … */
    default: {
      action satisfies never; // exhaustiveness
      return state;
    }
  }
}
```

Always use the functional form when the next value depends on the previous:
`setCount((c) => c + 1)` — mandatory inside intervals, async callbacks, and anywhere
batching or staleness could bite.

## Context, done right

Context is a *dependency injection* mechanism, not a state manager. Every consumer
re-renders when the value changes — so:

```tsx
const SessionCtx = createContext<Session | null>(null);

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // memoize the value — otherwise every provider render invalidates all consumers
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <SessionCtx value={value}>{children}</SessionCtx>; // React 19: Ctx as provider
}
```

- **Split state and dispatch** into two contexts when many components only dispatch —
  dispatchers get a never-changing value and never re-render.
- Keep providers low in the tree, near their consumers.
- If the value changes many times per second (pointer, scroll, live prices), context is
  the wrong tool — use a store with subscriptions.

## External stores

`useSyncExternalStore` is the primitive for anything living outside React:

```tsx
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const useOnline = () =>
  useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
```

**Gotcha:** `getSnapshot` must return a *cached/stable* value. Returning a fresh object
each call (`() => ({ width: innerWidth })`) causes an infinite render loop — return
primitives or cache the object until it actually changes.

For app state, Zustand is the pragmatic store: subscribe with selectors so components
re-render only for the slice they read.

```tsx
const useCart = create<CartStore>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
}));
const count = useCart((s) => s.items.length); // selector = minimal re-renders
```

Adopt Redux Toolkit when you need its ecosystem (devtools time-travel, RTK Query,
listener middleware) — not by default.

## URL as state

Filters, sort, pagination, active tab, open modal id — if the user would want to share
or refresh into it, it belongs in the URL, not in `useState`. Use the router's search
params API (e.g. `useSearchParams` in Next.js) and treat the URL as the source of truth;
components read from it and navigate to update it.

## Server state is not client state

Fetched data belongs to a cache that owns freshness, deduping, and revalidation —
Server Components or TanStack Query. Copying query results into `useState` creates a
stale fork. The exception is *seeding an editable draft* — then use `initial*` naming
and a `key` so re-fetches remount the editor deliberately.

## Form state

- Default to **uncontrolled + FormData** — with React 19 actions this is the platform
  path (see modern-react.md).
- Controlled inputs only when the UI reacts per-keystroke (live filters, character
  counts, dependent fields).
- Complex multi-step/validation-heavy client forms: React Hook Form — it keeps inputs
  uncontrolled and re-renders surgically.
