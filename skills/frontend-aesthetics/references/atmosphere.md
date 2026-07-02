# Atmosphere — Backgrounds, Texture, Depth

Atmosphere is the difference between a UI that exists on a screen and one that exists
in a *place*. It's almost free in code and almost always skipped — which is why
adding it reads instantly as craft.

## The ground is never nothing

A default white or black page is an unpainted wall. Minimum viable atmosphere — pick
per direction:

- **Temperature**: tint the background toward the palette
  (`oklch(0.985 0.006 90)` cream instead of white; `oklch(0.17 0.006 260)` ink
  instead of black). Costs nothing, changes everything.
- **Grain/noise**: a faint noise layer kills the sterile flatness of large fills.
  SVG turbulence as a data-URI overlay at 2–4% opacity, or a tiny repeating PNG.
  Editorial, organic, and retro directions almost always want it.
- **Pattern**: dot matrix, hairline grid, ruled lines, scanlines
  (`repeating-linear-gradient(0deg, rgb(255 255 255 / .02) 0 1px, transparent 1px 3px)`),
  graph paper — patterns carry direction (grid = engineering, ruled = editorial,
  scanlines = CRT). Keep them near-subliminal: 2–5% contrast with the ground.
- **Wash**: one large, soft radial/linear tint anchored to a corner or the hero —
  light falling into the page. Same-hue, neighboring-lightness only (see color.md on
  slop gradients).
- Fixed vs scrolling: a `background-attachment: fixed` wash (or a fixed decorative
  layer behind scrolling content) creates cheap parallax depth — use sparingly and
  never on mobile-heavy targets (jank).

## Shadow languages

Shadows are a *language*, not a utility class — pick exactly one per direction:

- **None (flat/editorial)**: hierarchy from borders, spacing, and ground tints.
  Confident and current; pairs with hairlines.
- **Hard offset (neo-brutalist / 8-bit / print)**: `box-shadow: 4px 4px 0 0 var(--shadow-color)`
  — no blur, full opacity, often the accent or ink color. Interactive elements
  translate `-2px,-2px` on hover so the shadow *grows*: tactile, playful, loud.
- **Layered soft (elevated product UI)**: two or three stacked shadows — a tight
  contact shadow + a wide ambient one
  (`0 1px 2px rgb(...)/.06, 0 8px 24px -8px rgb(...)/.15`). Never a single
  `shadow-md` slab. Elevation levels are tokens (raised / overlay / modal), not
  per-component improvisation.
- **Tinted**: whatever the language, shadows carry the theme's ink hue, not neutral
  black — gray-black shadows on a warm palette look like dirt.

In dark themes, shadows barely read: elevation becomes *lighter surface* + a
hairline; keep at most a soft contact shadow.

## Borders as protagonists

- Hairlines (1px, low-contrast token) structure editorial and utilitarian designs:
  full-bleed horizontal rules between chapters, column dividers, underlined links
  with offset. A ruled page needs no cards at all.
- Card borders vs shadows: pick one as the primary separator; both at once is noise.
- Signature moves: a 2–3px border in ink color (brutalist), corner-only borders
  (technical/HUD), a single accent-colored top border on the active card, dashed
  borders for drafts/empty states, double rules for headers (ledger DNA).
- Radius is part of the border language and a direction token: 0 (brutal, terminal,
  Swiss), 4–8px (product neutral), 16+px (soft, toy). One radius scale — a 0-radius
  card with rounded-full buttons inside is two directions fighting. Concentric
  radii: inner = outer − padding, or nesting looks warped.

## Depth stack

Layering model for a page, back to front: ground (temperature) → texture
(grain/pattern) → wash (light) → decorative artifacts (oversized watermark glyph,
rotated type, blueprint fragments — at 3–6% opacity, `pointer-events-none`) →
content surfaces → overlays. Two or three layers suffice; the point is that the page
has a *back*, not that it has ten planes.

`backdrop-filter: blur()` (glass) is a direction citizen, not a default: sticky
headers over rich content justify it; glass cards floating on mesh gradients are the
2021 slop preset. If the ground is flat, glass has nothing to refract — skip it.

## Imagery & media treatment

Untreated stock photos and pastel 3D illustration packs flatten any direction.
Treat media so it joins the palette:

- **Duotone/monochrome mapping** to theme hues (CSS `filter` or blend modes) unifies
  wildly different sources.
- **Blend into the ground**: `mix-blend-mode: multiply` (light themes) / `screen`
  (dark) sits imagery *in* the page rather than on it.
- Grain over photos, slight desaturation toward the palette, consistent crop
  geometry (all 4:3, all square) — consistency is the treatment.
- Icons are imagery too: one family, one stroke weight, one size grid, `currentColor`
  so they inherit the text hierarchy. Mixed icon packs read as generated instantly.

## Restraint protocol

Atmosphere fails loud: if a texture is noticeable in a screenshot thumbnail, halve
its opacity. The test — remove the layer; the page should feel *worse* but you
shouldn't be able to name why it felt better. Subliminal is the target. And every
decorative layer respects `prefers-reduced-motion` (if it moves) and never intercepts
pointer events.
