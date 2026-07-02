# TypeScript Patterns for React

Baseline: `"strict": true`. Types are the design tool — if the props type is hard to
write, the component API is wrong.

## Props

```tsx
type ButtonProps = {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
} & ComponentProps<"button">;   // inherit every native prop, incl. ref (React 19)

function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  return <button className={cx(styles[variant], styles[size], className)} {...rest} />;
}
```

- `ComponentProps<"button">` (or `ComponentPropsWithoutRef`) for native wrappers —
  callers get `disabled`, `aria-*`, `onClick` for free. Merge `className`, don't clobber.
- `children: ReactNode` — the widest correct type. `ReactElement` only when you truly
  require an element.
- Plain functions over `React.FC` — better with generics and defaults.
- Prefer `type` for props (composition via `&`); either is fine — be consistent.

## Make impossible states unrepresentable

**Discriminated unions for variant props:**

```tsx
type Linkish =
  | ({ as: "a"; href: string } & ComponentProps<"a">)
  | ({ as?: "button"; onClick: MouseEventHandler<HTMLButtonElement> } & ComponentProps<"button">);
// <Card as="a" onClick> without href is now a compile error
```

**Discriminated unions for async state:**

```tsx
type Query<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }     // data EXISTS only on success
  | { status: "error"; error: Error }; // error EXISTS only on error

// narrow with the discriminant:
if (q.status === "success") return <List items={q.data} />;
```

**Exhaustiveness** in reducers/switches: `default: { action satisfies never; }` — adding
a case breaks the build instead of silently no-oping.

## Generic components

```tsx
type ListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((i) => <li key={getKey(i)}>{renderItem(i)}</li>)}</ul>;
}
// <List items={users} …/> infers T = User in the callbacks — no casts at call sites
```

## Events and handlers

```tsx
function onChange(e: ChangeEvent<HTMLInputElement>) {}
function onSubmit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); }
const onClick: MouseEventHandler<HTMLButtonElement> = (e) => {};
```

Prefer inferring from JSX (write the handler inline, extract once stable). For props,
use the `XxxEventHandler<T>` aliases. Never type events as `any` to silence an error —
the error is telling you the element type is wrong.

## Refs

```tsx
const inputRef = useRef<HTMLInputElement>(null);   // DOM ref: null-initialized
const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined); // mutable box

// accepting a ref (React 19 — plain prop):
function Field({ ref }: { ref?: Ref<HTMLInputElement> }) { return <input ref={ref} />; }

// element type of an existing component:
const dialogRef = useRef<ComponentRef<typeof Dialog>>(null);
```

## Hooks

```tsx
// widen nullable state explicitly:
const [user, setUser] = useState<User | null>(null);

// custom hook returning a tuple: const-assert so positions keep their types
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const;
}
// 3+ values → return a named object instead
```

## Config objects: `as const` + `satisfies`

```tsx
const ROUTES = {
  home: "/",
  skill: (slug: string) => `/skills/${slug}`,
} as const satisfies Record<string, string | ((...a: never[]) => string)>;
// satisfies validates the shape; as const keeps literal types for the values
```

Use unions instead of `enum` (erasable, tree-shakeable, no runtime surprises).

## Boundaries

- External data (APIs, forms, storage, URL params) is `unknown` until validated —
  parse with zod (or similar) at the edge and export the inferred type:
  `type Post = z.infer<typeof PostSchema>`.
- No `any` in exported signatures. Local `any` is a TODO with a deadline; `unknown` +
  narrowing is the honest version.
- Don't type-assert (`as User`) what you can validate; assertions are how stale shapes
  sneak past the compiler.
