# Layout & Spatial Composition

Layout is where intention is most visible from across the room. The generated tell:
everything centered, every section the same width and rhythm, every card the same
size — symmetry as the absence of decisions.

## The grid — follow it or break it, knowingly

- Work on a 12-column mental grid (CSS Grid makes it literal) with a consistent
  gutter token. Content max-widths by role: prose ~65ch, forms ~28rem, marketing
  sections 64–80rem, data tables full-bleed.
- **Alignment is credibility**: pick edges and hold them. Mixed centered/left within
  a section reads as accident. Optical alignment overrides box alignment (icons,
  quotes, hanging bullets).
- **One deliberate grid-break per view** is a signature move: an image that bleeds
  past the container, a heading that starts in the margin, a card that straddles two
  sections (negative margin), an element rotated 1–2°. One break = tension; many =
  noise.

## Asymmetry — the cheapest distinctiveness

Centered-everything is the default of no-decision. Alternatives that immediately read
as designed:

- **Offset hero**: headline and copy in columns 1–7, supporting visual/terminal/card
  in 8–12 — or push content low-left with the top-right intentionally empty.
- **Editorial split**: a narrow meta-column (labels, numbers, timestamps) beside a
  wide content column — magazine DNA, great for docs/changelogs/portfolios.
- **Alternating rhythm**: sections that swap emphasis side, with *varied* vertical
  padding (a dense band after an airy one) instead of uniform `py-24` stripes.
- **Overlap**: elements that cross section boundaries or stack on each other
  (negative margins / grid areas) create depth without shadows.
- Diagonal flow: reading path that steps down-right across three elements — needs a
  strong grid underneath to read as intent.

Center only what earns it: a manifesto line, a single CTA moment, a logo wall. The
center is a spotlight, not a home.

## Whitespace as material

- **Generous emptiness** is a luxury/editorial statement: double the padding you
  think a hero needs, let one line of type own a viewport. Emptiness signals
  confidence.
- **Controlled density** is a pro-tool statement: tight rows, visible grid, every
  pixel informative (terminals, dashboards, tables). Density done evenly is craft.
- The failure mode is the middle: medium padding everywhere, nothing breathing,
  nothing dense — texture-less. Choose zones: airy marketing sections vs dense data
  regions, and make the contrast legible.
- Spacing scale discipline: one token scale (4/8-based), *jumping* levels for
  hierarchy — 8px within a cluster, 48px between clusters, 128px between chapters.
  Related things touch; unrelated things are far. Proximity is hierarchy.

## Section design (marketing pages)

- A page is chapters, not stripes: vary ground (paper/ink flip, tinted band), width,
  and rhythm so scrolling has a narrative. Repeated identical card-grids are visual
  white noise.
- **Bento grids** replace the three-equal-cards pattern only when cells genuinely
  differ in weight (one 2×2 hero cell, satellites around it). A bento of equal cells
  is the old pattern with new borders.
- Feature presentation alternatives: numbered editorial list (01/02/03 with rules),
  alternating text/visual rows, a single annotated screenshot, a dense spec table
  (technical audiences respect tables).
- Headers/footers: the header is chrome — quiet, small, sticky-with-blur *only* if
  the direction wants glass; the footer is the coda — a place for the one flourish
  (huge wordmark, sitemap-as-typography).

## Product UI structure

- Shell hierarchy: nav rail / sidebar / content / inspector — pick a canonical
  arrangement and keep landmarks stable; users navigate by muscle memory.
- Tables: tabular numerals, right-aligned numbers, left-aligned text, row hover,
  sticky header — density is respect for the operator.
- Empty regions in app UI are opportunities (see craft-details.md), not voids to
  center a sad icon in.

## Responsive — recompose, don't shrink

- Breakpoints change *composition*: the offset hero stacks with the visual first or
  cropped, the meta-column becomes a top strip, the bento linearizes by priority.
  Same components, re-choreographed.
- Fluid type + `clamp()` spacing carry most of the work between breakpoints.
- Test the awkward middle (~768–1024px) where generated layouts fall apart: two-column
  grids with one orphan card, heroes with 8-word lines. Design the middle, not just
  phone and desktop.
- Touch targets ≥ 44px, hover-only affordances get touch equivalents — mobile is not
  the desktop minus features.
