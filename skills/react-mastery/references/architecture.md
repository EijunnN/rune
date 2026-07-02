# Component Architecture & Composition

## Component roles

Keep three tiers distinct; mixing them is how god-components are born:

- **Route/page components** — wire data to features. Fetch (RSC/loader), compose, no
  business UI of their own.
- **Feature components** — own a use case (`CheckoutForm`, `InviteMembers`). May hold
  state, call mutations, compose primitives.
- **UI primitives** — stateless-ish, style + interaction only (`Button`, `Dialog`,
  `Tooltip`). Never fetch, never know about the domain.

A component earns extraction when it has a second *reason to change*, not a second
hundred lines. But length is a smell worth investigating around ~150–200 lines.

## Composition over configuration

### Children and slots

The parent doesn't need to know what it renders:

```tsx
// ❌ configuration: every new need grows the props API
<Card title="Team" subtitle="Manage" avatarUrl={u} onAvatarClick={f} footerText="…" />

// ✅ composition: Card owns layout, callers own content
<Card>
  <CardHeader>
    <Avatar src={u} onClick={f} />
    <CardTitle>Team</CardTitle>
  </CardHeader>
  <CardFooter>…</CardFooter>
</Card>
```

Named slots (props that take `ReactNode`) are fine when the layout has fixed regions:
`<PageShell sidebar={<Nav />} toolbar={<Actions />}>{content}</PageShell>`.

### Compound components

For cohesive widgets whose parts must coordinate, share state via internal context:

```tsx
const TabsCtx = createContext<TabsState | null>(null);

function Tabs({ defaultValue, children }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  return <TabsCtx value={{ value, setValue }}>{children}</TabsCtx>;
}
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger; // reads TabsCtx, renders <button role="tab">
Tabs.Panel = TabsPanel;

// usage stays declarative and rearrangeable:
<Tabs defaultValue="general">
  <Tabs.List>
    <Tabs.Trigger value="general">General</Tabs.Trigger>
    <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="general">…</Tabs.Panel>
</Tabs>
```

### Kill boolean-prop explosions

```tsx
// ❌ impossible states representable: small AND large, primary AND danger…
<Button isSmall isPrimary isDanger isLoading />

// ✅ unions constrain the space
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
} & ComponentProps<"button">;
```

If variants diverge in *behavior*, not just style, prefer separate components over a
mega-switch (`<LinkButton>` vs `<SubmitButton>`).

## Controlled vs uncontrolled

Pick one per prop and keep it for the component's lifetime:

- **Uncontrolled** (`defaultValue` + internal state): simplest; parent doesn't care.
- **Controlled** (`value` + `onChange`): parent is the source of truth.
- Reusable inputs support both — controlled when `value !== undefined`, otherwise
  internal state seeded from `defaultValue`. Never switch modes mid-life (React warns).

Prefix props that are only read once with `initial` (`initialQuery`) and reset with
`key` when the caller needs a fresh instance.

## Custom hooks

Extract a hook when logic (not JSX) repeats, or when a component's effects/state pile up
into a distinct concern:

- Name states the concern: `useDebouncedValue`, `useMediaQuery`, `useCheckoutTotals`.
- Narrow inputs, narrow outputs. Return an object for 3+ values; a `[value, actions]`
  tuple for simple pairs. Keep returned function identities stable (Compiler handles it;
  otherwise `useCallback`) so consumers can safely use them in deps.
- Hooks compose hooks; components should read like prose over a few well-named hooks.
- Don't wrap a single `useState` in a custom hook for ceremony.

Render props are legacy for logic sharing (hooks won) but still legitimate for
*rendering* delegation: `<List items={x} renderItem={(item) => …} />`.

## Props API design

- Accept and spread native props for wrapper primitives:
  `type Props = { variant?: Variant } & ComponentProps<"button">` — forward `className`,
  `disabled`, `aria-*` for free, and merge rather than clobber `className`.
- `ref` is a normal prop in React 19 — take `ref` in the props type and pass it down;
  `forwardRef` is legacy.
- Make impossible states unrepresentable (discriminated unions — see typescript.md).
- Callbacks are named `onX`; internal handlers `handleX`.
- Default values via parameter defaults (`function Button({ size = "md" })`) —
  `defaultProps` is removed in 19.

## Project structure

Organize by feature, not by kind. Kind-folders (`components/`, `hooks/`, `utils/`)
scale into junk drawers.

```
src/
  features/
    checkout/
      components/   # feature-private components
      hooks/
      api.ts        # fetchers/actions for this feature
      types.ts
      index.ts      # deliberate public surface (small!)
  components/ui/    # app-wide primitives (design system)
  lib/              # true cross-cutting utilities
```

- Import across features only through the feature's `index.ts`.
- Avoid deep re-export barrels for everything — they bloat bundles (broken
  tree-shaking) and invite circular imports. Barrel only intentional public APIs.
- Tests and styles sit next to the code they cover.

## Error boundaries

Function components can't be error boundaries; use a class or `react-error-boundary`.
Place them at *recovery* points, not everywhere: route level (full-page fallback) and
around independent islands (a failing widget shouldn't take down the page). Pair each
`Suspense` boundary with an error boundary at the same altitude when the data can fail.

```tsx
<ErrorBoundary fallback={<CartError />} onReset={refetch}>
  <Suspense fallback={<CartSkeleton />}>
    <Cart />
  </Suspense>
</ErrorBoundary>
```

## Abstraction discipline

- **Rule of three:** tolerate duplication twice; abstract on the third occurrence, when
  the real shape is visible.
- Wrong abstraction costs more than duplication — if an abstraction needs flags to serve
  its callers (`renderAsRow`, `skipHeader`), inline it back and re-split.
- Components that only pass props through ("middleman components") are a smell: collapse
  them or switch to composition so content skips the middle layer.
