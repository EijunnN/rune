# Effects, Refs & Synchronization

An effect synchronizes React with an **external system**: a non-React widget, a
subscription, a socket, a timer, analytics, the document. If no external system is
involved, the effect is almost certainly a bug factory. This file is the long form of
the "do I need an effect?" framework.

## The eight impostors (and their real fix)

**1. Deriving data → compute in render**

```tsx
// ❌
useEffect(() => setFullName(first + " " + last), [first, last]);
// ✅
const fullName = `${first} ${last}`;
```

**2. Expensive derivation → `useMemo` (or the Compiler)**

```tsx
const visible = useMemo(() => filterExpensive(items, query), [items, query]);
```

**3. Resetting state on prop change → `key`**

```tsx
// ❌ useEffect(() => setDraft(""), [contactId])
// ✅ remount with identity:
<MessageDraft key={contactId} contactId={contactId} />
```

**4. Adjusting *some* state on prop change → set during render (rare) or derive**

```tsx
function List({ items }: { items: Item[] }) {
  const [prevItems, setPrevItems] = useState(items);
  const [selection, setSelection] = useState<Item | null>(null);
  if (items !== prevItems) {       // runs during render — React re-renders immediately,
    setPrevItems(items);           // before committing; no flash, no extra effect pass
    setSelection(null);
  }
}
```

Better still: store `selectedId` and derive `selection` — often removes the need entirely.

**5. Logic that belongs to an event → event handler**

Buying, submitting, showing a toast on click: these are caused by *interactions*, not by
*rendering*. `useEffect(() => { if (submitted) toast(); }, [submitted])` fires on
render-after-the-fact and re-fires in odd ways — call `toast()` in the submit handler.

**6. Notifying the parent → call the callback in the same event**

```tsx
// ❌ useEffect(() => onChange(isOn), [isOn, onChange])
// ✅
function toggle() {
  const next = !isOn;
  setIsOn(next);
  onChange(next); // same event, one pass, parent and child stay in sync
}
```

**7. Chains of effects → one handler / reducer**

Effect A sets X, which triggers effect B setting Y… Each link is a full render pass and
the chain is unreadable. Compute the whole transition in one place.

**8. App initialization → module scope (guarded), not an effect**

```tsx
if (typeof window !== "undefined") { loadFromStorage(); }
```

## Writing a real effect

Think in **lifecycles of synchronization**, not mount/unmount: an effect describes how
to *start* syncing and how to *stop*. React may run that cycle many times.

```tsx
useEffect(() => {
  const conn = createConnection(serverUrl, roomId);
  conn.connect();
  return () => conn.disconnect();  // cleanup mirrors setup, always
}, [serverUrl, roomId]);           // every reactive value used inside, honestly listed
```

- **Strict Mode dev double-invoke** (setup → cleanup → setup) is a correctness test,
  not a nuisance. If it breaks your effect, the effect was broken.
- Cleanup symmetry: `addEventListener/removeEventListener`, `setInterval/clearInterval`,
  `subscribe/unsubscribe`, `observe/disconnect`, `connect/disconnect`, `fetch/abort`.

## Fetching in an effect (when you must)

Every fetch-in-effect has a race: fast typing means older responses can land last.

```tsx
useEffect(() => {
  const controller = new AbortController();
  let ignore = false;
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then((r) => r.json())
    .then((data) => { if (!ignore) setResults(data); })
    .catch((e) => { if (e.name !== "AbortError") setError(e); });
  return () => { ignore = true; controller.abort(); };
}, [query]);
```

This still lacks caching, deduping, retries, and revalidation — which is why the real
recommendation is a query library or Server Components (see modern-react.md).

## useEffectEvent — reading fresh values without re-syncing

Stable in React 19.2. Use it when an effect must *read* a value whose changes should
**not** restart the synchronization:

```tsx
import { useEffect, useEffectEvent } from "react";

function ChatRoom({ roomId, theme }: Props) {
  const onConnected = useEffectEvent(() => {
    showToast("Connected!", theme);      // always sees latest theme
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on("connected", onConnected);   // theme change must NOT reconnect the room
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]);                          // effect events are never dependencies
}
```

Rules: declare next to the effect that uses it; call only from inside effects; never
pass it to other components/hooks; never list it in deps.

## Dependency honesty

Deps are not a control knob — they're a *description* of what the effect reads. To
remove a dependency, change the code so it genuinely isn't read:

- Move functions/objects **inside** the effect (or to module scope) so identity churn
  disappears.
- Depend on **primitives**: `[user.id]`, not `[user]`.
- Use **functional updates** to drop state deps: `setCount((c) => c + 1)`.
- Use **useEffectEvent** for values that should be read fresh but not react.
- Suppressing the lint hides the bug until production. Don't.

```tsx
// interval that never needs resetting:
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []); // honest: reads nothing reactive
```

## useLayoutEffect

Only for **reading layout and synchronously re-rendering before paint** (measure a
tooltip, then position it). It blocks painting — keep it tiny. It doesn't run on the
server; in SSR apps gate the component behind mount or restructure. Everything else:
`useEffect`.

## Refs

A ref is a box React doesn't watch. Two uses:

1. **DOM handles** — focus, scroll, measure:
   `const inputRef = useRef<HTMLInputElement>(null)`. In React 19, `ref` is a normal
   prop — no `forwardRef` — and ref callbacks may return a cleanup function.
2. **Mutable non-render values** — timer ids, imperative instances, "latest value"
   mirrors. If a value affects what renders, it's state, not a ref.

Rules: don't read/write refs during render (except lazy init); mutate in handlers and
effects. When a ref must be populated conditionally or on dynamic lists, use a callback
ref with cleanup:

```tsx
<li ref={(node) => {
  map.set(id, node!);
  return () => map.delete(id);   // 19: cleanup instead of null-call
}} />
```

## When an effect is the right answer

Page-view analytics on route change; mounting a non-React library into a DOM node
(chart, map, editor) with a matching `destroy()`; websocket/subscription lifecycles;
`document.title` (or React 19 `<title>` hoisting); `IntersectionObserver` wiring.
Anything else — run it through the eight impostors first.
