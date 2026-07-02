# Motion — Choreography, Not Seasoning

Motion answers two questions: *where did this come from?* (continuity) and *what kind
of thing is this place?* (personality). Scattered hover effects answer neither. One
orchestrated moment answers both.

## The hierarchy of motion spend

Budget motion effort in this order:

1. **The entrance** — one staggered page/section reveal on load. Highest impact,
   seen by everyone, sets the personality in 700ms.
2. **State transitions** — panels, tabs, accordions, dialogs entering/leaving with
   continuity (things grow from where they were summoned).
3. **Micro-interactions** — hover/press feedback on interactive elements. Quiet,
   fast, consistent.
4. **Ambient motion** — background drift, marquees, floating artifacts. Optional,
   direction-dependent, first cut under `prefers-reduced-motion`.

Generated UI inverts this: twelve hover effects, zero choreography.

## The orchestrated entrance

The signature move worth doing on every marketing page and many app shells:

```css
@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.rise { animation: rise .6s cubic-bezier(.22,1,.36,1) both; }
```

```html
<h1 class="rise">…</h1>
<p  class="rise" style="animation-delay: 80ms">…</p>
<div class="rise" style="animation-delay: 160ms">…</div>
```

- **Stagger 60–100ms** between siblings, 3–6 elements max — beyond that the user is
  waiting, not delighting. Total sequence under ~900ms.
- Elements move a *small* distance (8–16px) in the reading direction; 100px flying
  entrances are 2015.
- The easing carries the personality (below); the pattern is universal.

## Timing & easing vocabulary

Durations as tokens, by role:

- Micro feedback (hover, press, toggles): **120–200ms**
- Local transitions (dropdown, tooltip, tab): **200–300ms**
- Structural (panel, dialog, page section): **300–500ms**
- Entrances/hero reveals: **500–800ms**
- Anything over 1s is cinema — needs narrative justification.

Easing by physics, then by direction:

- **Enter**: ease-out (fast start, soft landing) — `cubic-bezier(.22,1,.36,1)` is a
  beautiful default ("quart-out with overshoot-adjacent settle").
- **Exit**: ease-in or plain fast fade — leaving elements don't deserve drama.
- **Move within view**: ease-in-out.
- Personality dialects: springs (playful/toy — bounce via overshoot beziers or JS
  springs), `steps(n)` (8-bit/terminal — motion that *ticks*), long soft fades
  (luxury/editorial), instant + hard (brutalist — motion off is a direction too).
- `linear()` easing can express real spring curves in pure CSS when supported.

## Micro-interactions

- Interactive elements acknowledge the pointer within 150ms: background wash,
  underline slide, icon nudge (`translate-x-0.5`), shadow growth. Pick **one house
  style** of acknowledgment and apply it consistently — the consistency, not the
  effect, is the craft.
- Press states compress (scale .98 / translate 1px) — tactility beats color swap.
- Transition *specific properties*, never `transition: all` (perf + accidental
  animations of layout).
- Hover is progressive enhancement — touch users must lose nothing.

## Transform & opacity only

Animate `transform` and `opacity` (compositor-friendly); animating
width/height/top/left/margin causes layout thrash and jank. Need height animation
(accordions)? — `grid-template-rows: 0fr → 1fr` with an inner `overflow: hidden`, or
`interpolate-size: allow-keywords` where supported. `will-change` only on elements
about to animate, removed after — it's a hint, not a vitamin.

## Scroll & continuity

- **Scroll-triggered reveals**: same rise pattern, fired by `IntersectionObserver`
  (or CSS `animation-timeline: view()` where supported), `once: true` — content
  re-animating on every scroll direction is noise. Threshold so elements reveal
  *before* fully in view (~15%).
- Reveal *sections*, not every paragraph — chapter beats, not a puppet show.
- Parallax: one layer, subtle (0.9× scroll rate), marketing-only.
- **View Transitions API** for page/route morphs (supported in React 19.2's
  experimental `<ViewTransition>` and natively via `document.startViewTransition`):
  shared-element continuity (card → detail hero) is the highest-craft navigation
  move currently available. Feature-detect and let it degrade to instant.
- Scroll-jacking (hijacked wheel speed, forced full-page snapping on long content) is
  hostile; `scroll-snap` belongs to carousels and galleries, not documents.

## Reduced motion is a first-class theme

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

Ship the guard globally, *and* design what remains: opacity-only fades are acceptable
under reduce; translation/scale/parallax/ambient loops are not. Autoplaying ambient
motion (marquees, video) gets a pause affordance. Motion that conveys state (loading
spinners) stays; motion that conveys *style* yields.
