# Craft Details — The Finishing Pass

The last 10% is where "designed" actually lives. Users can't name these details, but
they feel their absence. Run this pass after the screens work and before anything
ships.

## Interaction states

- **Focus**: `:focus-visible` styling that belongs to the theme — an accent ring
  (`outline: 2px solid var(--ring); outline-offset: 2px`), or the direction's dialect
  (hard offset ring for brutalist, glow for synth). Never `outline: none` without a
  replacement; never the browser-default blue on a themed page.
- **Selection**: `::selection` in the accent — a two-line signature
  (color.md).
- **Hover/press house style**: one acknowledgment pattern applied everywhere
  (motion.md). Audit for orphans: links that do nothing on hover, buttons without
  press states.
- **Disabled**: reduced opacity + `cursor: not-allowed` is fine — but prefer not
  showing disabled primary actions at all; say what's missing instead.
- **Scroll**: `scroll-behavior: smooth` for anchor nav (guarded by reduced-motion);
  `overscroll-behavior` on modals/drawers so the page doesn't scroll behind;
  scrollbars — leave native unless the direction demands (terminal themes may thin
  them via `scrollbar-width: thin` + themed `scrollbar-color`; never hide scrollbars
  on scrollable content).

## Designed states (empty, loading, error)

- **Empty states** are first-run real estate: a themed mark, one line of voice-true
  copy, and the action that fills the void ("No runes match — clear the filters").
  Never a lone gray icon with "No data".
- **Loading**: skeletons that match the real layout geometry (no spinner-in-a-void
  for content areas); shimmer restrained; spinners only for sub-second operations
  and inside the control that triggered them (button spinner beats page takeover).
  Instant-feeling: optimistic UI where safe.
- **Error states** stay in voice without being cute about data loss: what happened,
  what survives, the retry. A themed error page (404 especially) is a cheap
  personality moment — the one place whimsy is nearly always right.

## Content details

- **Punctuation**: real em dashes (—), curly quotes (“ ”), ellipsis (…), `&nbsp;`
  between number and unit. Straight quotes in display type are a tell.
- **Truncation**: `line-clamp` with intention (cards: 2–3 lines), `text-wrap:
  balance` on headings, `text-wrap: pretty` on prose — orphan words under a huge
  headline are a craft miss.
- **Numbers**: tabular figures in tables/timers (typography.md); thousands
  separators; localized dates. `1234567` in a UI is a bug with extra steps.
- **Links in prose**: underlined (offset + thickness tuned:
  `text-underline-offset: 3px`), not color-only — and the underline can be the
  house hover style.
- Alt text, page `<title>`s per route, and metadata — copy is part of design; the
  browser tab is a surface.

## Identity surfaces

- **Favicon**: the mark, legible at 16px, with a dark-scheme variant
  (`<link media="(prefers-color-scheme: dark)">`) — the default framework favicon in
  a shipped product is entry #0 of the slop catalog.
- **OG image**: 1200×630, the direction distilled — ground + mark + display type.
  Links get shared; this is the design's first impression more often than the hero.
- **Theme color**: `<meta name="theme-color">` matched to the ground (both schemes)
  so mobile chrome joins the page.
- The `<html>` background matches the page ground — white flash during load on a
  dark theme is a broken first frame.

## Micro-geometry

- **Optical alignment over mathematical**: icons next to text sit on the x-height
  line; play-triangle glyphs shift 1px right; oversized punctuation hangs into the
  margin. If it looks off but measures even, fix the look.
- **Concentric radii**: nested radius = parent radius − padding (a 16px card with
  4px-padded 16px-radius children looks warped; the child wants 12px).
- **Hairline discipline**: 1px means 1px — check dividers at 2× DPR for doubled
  strokes; `transform: translateZ(0)` artifacts; borders vs outlines on rounded
  elements.
- **Spacing audit**: same-role gaps identical across screens (all card paddings, all
  section gaps) — token drift is entropy; measure, don't trust.

## Performance is aesthetic

Jank reads as cheap regardless of visual quality:

- Fonts preloaded with metric-matched fallbacks — zero CLS (typography.md).
- Images with explicit dimensions, `loading="lazy"` below the fold, `priority` on
  the LCP hero; modern formats (AVIF/WebP).
- Animations on transform/opacity only (motion.md); test on a throttled CPU.
- The first paint shows the *designed* ground (inline critical theme tokens), not a
  flash of unstyled default.

## The ship gate

Final question, honestly answered: **"Would a designer who cares put their name on
this screen?"** Check: direction nameable · one memorable thing · type tuned · slop
catalog swept · states designed · focus/selection themed · favicon/OG real · no
jank. If any answer is no, the design isn't done — it's merely rendered.
