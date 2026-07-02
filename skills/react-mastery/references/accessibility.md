# Accessibility in React

Baseline: WCAG 2.1 AA. Accessibility is architecture, not garnish — semantic structure
decided early costs nothing; retrofitted ARIA costs everything and usually lies.

## Semantics first

The first rule of ARIA: don't use ARIA when a native element exists.

| Need | Use | Never |
| --- | --- | --- |
| Click action | `<button>` | `<div onClick>` (no focus, no keyboard, no role) |
| Navigation | `<a href>` / router `<Link>` | `onClick` + `navigate()` on a span |
| Form field | `<input>` + `<label>` | unlabeled input with placeholder-as-label |
| On/off | `<button aria-pressed>` or `<input type="checkbox">` | clickable icon |
| Sections | `<nav> <main> <header> <footer>` + headings | div soup |

Native elements ship focus, keyboard handling, and screen-reader semantics for free.
A `<div role="button" tabIndex={0} onKeyDown…>` needs five attributes to poorly imitate
`<button>`.

Headings are an outline (one `<h1>`, no level skipping), not a font-size picker — style
with CSS, structure with levels.

## Forms

```tsx
function EmailField({ error }: { error?: string }) {
  const id = useId(); // SSR-safe unique ids
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input
        id={id}
        name="email"
        type="email"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && <p id={`${id}-err`} role="alert">{error}</p>}
    </>
  );
}
```

- Every input has a real `<label>`; `aria-label` is the fallback for icon-only controls.
- Errors are *associated* (`aria-describedby`), not just adjacent — and announced
  (`role="alert"` on submit-time errors).
- Group radios/related fields with `<fieldset><legend>`.
- Never disable the submit button as the only validation signal — say what's wrong.

## Keyboard

- Everything clickable is reachable with Tab and operable with Enter/Space. Native
  elements: free. Custom widgets: your job (Escape closes, arrows navigate lists/menus).
- DOM order = tab order. No positive `tabIndex` — restructure the DOM instead.
- `tabIndex={-1}` for programmatic-focus targets (headings after route change).
- Focus must be *visible*: never remove outlines without a replacement
  (`:focus-visible` styling).

## Focus management

React changes screens without page loads, so focus is your responsibility:

- **Dialogs**: focus enters on open (first field or the dialog itself), Tab is trapped,
  Escape closes, focus *returns to the trigger* on close. Use a proven primitive
  (Radix, `<dialog>`, react-aria) over hand-rolling.
- **Route changes**: move focus to the new page's `<h1 tabIndex={-1}>` (or a skip
  target) so screen readers don't sit on a dead link.
- **Deletion/collapse**: when the focused element disappears, send focus somewhere
  sensible (next item, list container) — not to `<body>`.
- Provide a "Skip to content" link as the first tabbable element.

## Announcing async results

Silent spinners and toasts don't exist for screen readers:

```tsx
<p role="status" className="sr-only">
  {isPending ? "Saving…" : saved ? "Changes saved" : ""}
</p>
```

- `role="status"` (polite) for progress/success; `role="alert"` (assertive) for errors.
- The live region must be *in the DOM before* the message lands — render it empty, then
  fill it; don't mount it with the message.

## ARIA that earns its place

- Disclosure: `aria-expanded` + `aria-controls` on the trigger.
- Current location: `aria-current="page"` on the active nav link.
- Icon-only buttons: `aria-label`, and `aria-hidden="true"` on the SVG.
- Decorative images: `alt=""` (never omit the attribute); informative images: alt text
  that carries the same information.
- Loading skeletons: `aria-hidden` — announce state via the live region instead.

## Visual & motion

- Contrast ≥ 4.5:1 body text, 3:1 large text/UI parts. Check both themes.
- Never encode meaning in color alone — pair with icon/text (error = red *and* message).
- Wrap non-essential animation in `@media (prefers-reduced-motion: reduce)` guards;
  React apps with view transitions/parallax must honor it.
- Touch targets ≥ 44×44px.

## React specifics

- `useId` for every generated id (label/description wiring) — never `Math.random()`.
- Portals (dialogs, tooltips) keep *reading* order sane, but you still own focus and
  `aria-modal`/inert background.
- Fragments (`<>`) avoid wrapper-div soup that breaks flex/grid *and* semantics.
- Verification loop: Tab through the feature; then RTL role-queries (a failing
  `getByRole` is an a11y bug report — see testing.md); then jest-axe as a smoke layer.
