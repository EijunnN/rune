# UI Component Testing — Testing Library Doctrine

Component tests sit between unit and E2E: real rendering, real events, fake network — one component (or small tree) at a time. The guiding principle is Testing Library's: **test what the user perceives and does**, never component internals (state, instance methods, child props).

(React-specific patterns — hooks, Suspense, server components, act() nuances — are the react-mastery rune's territory; everything here applies across React/Vue/Svelte/Solid adapters.)

## Queries — same hierarchy as Playwright, same reason

```ts
render(<CheckoutForm />);

screen.getByRole("button", { name: /pay now/i });   // 1st choice — enforces semantics
screen.getByLabelText(/card number/i);              // form fields
screen.getByText(/order total/i);                   // content
screen.getByTestId("line-chart");                   // last resort, justified in a comment
```

- `getBy*` throws (assert presence), `queryBy*` returns null (assert **absence**: `expect(screen.queryByRole("alert")).not.toBeInTheDocument()`), `findBy*` awaits appearance (async UI).
- If `getByRole` can't find it, users of assistive tech can't either — fix the markup (real buttons, labels wired with `htmlFor`, `aria-*` only when semantics don't exist natively).
- Scope with `within(screen.getByRole("row", { name: /order 42/i }))` instead of test-ids on every cell.

## Interactions — userEvent, never fireEvent

```ts
const user = userEvent.setup();
await user.type(screen.getByLabelText(/email/i), "a@b.co");
await user.click(screen.getByRole("button", { name: /save/i }));
await user.keyboard("{Escape}");
```

`userEvent` simulates the full browser event chain (pointer→focus→keydown→input…), catching disabled states, focus traps, and handlers on the wrong element — `fireEvent.click` bypasses all of that and green-lights broken UIs. `fireEvent` survives only for events userEvent can't express (scroll, custom events).

## Async UI

- `await screen.findByText(/saved/i)` for appearance; `await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"))` for spinners.
- `waitFor` wraps **assertions**, not actions; keep one concern per waitFor and no side effects inside (it retries!).
- Empty `waitFor(() => {})` or arbitrary `setTimeout` in tests = flake seeds — there is always a user-visible condition to await instead.

## The seams: render helper + MSW

```ts
// tests/helpers/render.tsx — ONE place where app context lives
export function renderApp(ui: ReactNode, { route = "/", user = aUser() } = {}) {
  return { user: userEvent.setup(), ...render(ui, { wrapper: makeWrapper({ route, user }) }) };
}
```

- All providers (router, query client, theme, i18n) live in the wrapper; tests never hand-assemble context. New provider in the app = one-line change here.
- Network: the same MSW handlers as everywhere (mocks-and-doubles.md) — components fetch normally, tests override per scenario. Never mock your data-fetching hook/module; that's implementation coupling AND it skips serialization bugs.
- A fresh query-client (etc.) per test — module-level singletons in the wrapper are cross-test state leaks.

## What to assert (and not)

Assert: rendered text/roles, enabled/disabled reality, what got submitted (MSW captures the request body), navigation results, focus placement after actions (a11y-critical: modal close returns focus to trigger), announced errors (`role="alert"`).

Never assert: internal state values, "component X received prop Y", child mock render counts, CSS classes as behavior proxies (assert `toBeDisabled()`, not `.opacity-50`), snapshot of the whole tree (unit-tests.md snapshot rules apply).

## Accessibility as a test dimension

- Role-based queries already enforce the floor. Add `vitest-axe`/`jest-axe` on key screens: `expect(await axe(container)).toHaveNoViolations()` — cheap, catches contrast/label/landmark regressions.
- Keyboard-only versions of critical flows: tab order reaches everything, `Enter`/`Space` activate, `Escape` closes, focus visible. `await user.tab()` makes these one-liners.

## Environment notes

- jsdom/happy-dom don't do layout: no real sizes, no `IntersectionObserver`/`ResizeObserver` (polyfill or stub them once in setup), CSS media queries need `matchMedia` stubs. When a component's behavior *is* layout (virtualization, drag), test it in a real browser (Vitest browser mode / Playwright component tests) instead of stubbing physics.
- Portals render outside `container` — query via `screen` (document-wide), not `container` scoping.
- `user-event` needs timers advanced when fake timers are on: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

## Smell checklist

`fireEvent.click` on things users click · `container.querySelector(".btn-primary")` · mocking `useQuery`/fetch-hook instead of MSW · asserting props of a mocked child · `data-testid` where a role exists · snapshots of trees · tests that pass with the submit button disabled (assert the request happened, not just "no crash").
