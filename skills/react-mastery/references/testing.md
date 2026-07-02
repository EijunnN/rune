# Testing React

## Doctrine

Test what the user experiences: rendered output, interactions, accessibility. Never
test implementation: internal state values, hook call order, child component props,
CSS classes. Implementation tests break on refactors that change nothing observable —
they punish exactly the work you want to encourage.

Stack: **Vitest (or Jest) + React Testing Library + @testing-library/user-event +
@testing-library/jest-dom + MSW**. Playwright owns cross-page flows; component tests
own everything else.

## Queries — accessibility-first, in priority order

1. `getByRole("button", { name: /save/i })` — role + accessible name. The default.
2. `getByLabelText` — form fields.
3. `getByPlaceholderText`, `getByText`, `getByDisplayValue` — content.
4. `getByAltText`, `getByTitle` — media.
5. `getByTestId` — last resort; its presence usually flags a semantics gap (fix the
   markup instead — see accessibility.md).

Variants: `getBy*` (must exist, throws), `queryBy*` (asserting absence:
`expect(queryByRole(...)).not.toBeInTheDocument()`), `findBy*` (async: waits). Scope
with `within(row).getByRole(...)` for repeated structures.

## Interactions — user-event, not fireEvent

`fireEvent` dispatches one synthetic event; `user-event` simulates the real sequence
(pointer → focus → keydown → input…), catching bugs fireEvent can't see.

```tsx
test("creates a todo", async () => {
  const user = userEvent.setup();
  render(<Todos />);

  await user.type(screen.getByRole("textbox", { name: /new todo/i }), "Ship it");
  await user.click(screen.getByRole("button", { name: /add/i }));

  expect(await screen.findByRole("listitem")).toHaveTextContent("Ship it");
});
```

Always `userEvent.setup()` per test; every interaction is `await`ed.

## Async UI

- `findBy*` = `getBy*` + `waitFor` — the tool for "appears after loading".
- `waitFor` for non-query assertions; `waitForElementToBeRemoved` for spinners.
- Never `setTimeout`-sleep in tests. With fake timers, wire them into user-event:
  `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

## Network — mock at the boundary with MSW

Mock HTTP, not modules. The component exercises its real fetching/caching code path.

```tsx
const server = setupServer(
  http.get("/api/todos", () => HttpResponse.json([{ id: "1", title: "First" }])),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("shows the error state", async () => {
  server.use(http.get("/api/todos", () => HttpResponse.error())); // per-test override
  render(<Todos />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load/i);
});
```

Mock modules only for true externals (analytics, heavy canvas/editor children) — never
to spy on your own internals.

## Providers — one custom render

```tsx
function renderApp(ui: ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
```

Export it from a test-utils module; tests import it instead of RTL's `render`. Disable
query retries in tests or error-state tests hang.

## Forms & actions

Test through the form contract: fill fields by label, submit by role, assert on the
*result* — success UI, validation messages (associated via `aria-describedby`), pending
state (`expect(button).toBeDisabled()` while in flight). Works identically for React 19
actions — the pending/disabled assertions catch missing `useFormStatus` wiring.

## Hooks

Prefer testing hooks through a component that uses them. `renderHook` for genuinely
reusable, UI-free logic:

```tsx
const { result } = renderHook(() => useToggle());
act(() => result.current[1]());
expect(result.current[0]).toBe(true);
```

If you need `act()` in a *component* test, you're usually working against RTL — its
utilities already wrap act; reach for `findBy*`/`waitFor` instead.

## What to cover (and not)

Cover per feature: the happy path; empty state; loading state; error state; validation
edges; keyboard operability of custom widgets. Add `jest-axe` as an a11y smoke test on
complex pages.

Skip: pixel styling (visual tools own it), library internals, exhaustive prop matrices
on primitives, and full-page snapshots (they assert everything, so they assert nothing —
tiny targeted snapshots only).
