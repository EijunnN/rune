# Color — Systems with Intention

A palette is not a list of colors you like; it's a *hierarchy of attention*. The
generated-UI tell is even distribution: five colors all shouting at the same volume,
or the opposite — gray-on-gray timidity with a purple gradient for "energy".

## Build order

1. **Neutrals with temperature.** Never pure `#fff`/`#000`/gray-N. Push the neutral
   ramp warm (cream, bone, ink-brown) or cool (slate, steel, near-navy) to match the
   direction — this single move de-generifies a UI more than any accent. The page
   background carries the temperature; surfaces sit near it, not on stark white
   islands.
2. **A dominant.** The color the design *is* — often the tinted neutral itself
   (editorial cream, terminal near-black), sometimes a brand color used structurally.
3. **One accent, scarce.** The accent marks *what matters*: primary action, active
   state, the one number that's on fire. Rule of thumb: if the accent covers more
   than ~5–10% of any screen, it has stopped being an accent. Two accents need a
   contract (e.g. brand vs. semantic-warning); three is a carnival.
4. **Semantic colors** (success/warning/destructive) tuned *to the palette* — the
   default green/yellow/red swatches clash with any direction; shift their hue and
   chroma toward the theme's temperature.

## OKLCH — build ramps that behave

Author in `oklch()` (widely supported) rather than hex/HSL:

- Perceptual lightness: L means the same thing across hues, so a 10-step ramp built
  by stepping L is *actually* even — HSL ramps go neon at yellow and mud at blue.
- Systematic scales: hold hue/chroma, step lightness for surface ramps
  (`oklch(0.16 0.006 260)` → `0.20` → `0.24`…); hold lightness, vary hue for
  same-weight categorical colors (charts, tags).
- Derivations in CSS: `color-mix(in oklch, var(--primary) 20%, transparent)` for
  tints/rings/hover washes without minting new tokens.

## Tokens

Semantic tokens, not color names: `--background`, `--foreground`, `--card`,
`--muted-foreground`, `--primary`, `--border`, `--ring` (the shadcn/Radix convention
is a good baseline). Components consume *roles*; themes redefine roles. Hardcoded hex
in a component is a bug. Radius, shadows, and durations belong in the same token
sheet — the theme is one object, swappable as one.

## Contrast is structural

- AA minimum: 4.5:1 body text, 3:1 large text and UI components — verified in *both*
  themes, not eyeballed. `muted-foreground` on `muted` is where violations hide.
- Contrast is also hierarchy: reserve the highest text contrast for what matters;
  drop secondary text to ~60–70% attention (via the muted token, not opacity on the
  same token — opacity stacks unpredictably over varied surfaces).
- Never encode meaning in hue alone (pair with icon/label/weight) — colorblind users
  and gray-scale screenshots both need the signal.

## Dark themes are designed, not inverted

- Surfaces: near-black with the theme's hue (`oklch(0.16–0.2 …)`), never `#000`;
  elevation = slightly *lighter* surface, not shadow.
- Desaturate large fields; saturated hues vibrate on dark ground. Text at ~90% white,
  not pure.
- The accent needs re-tuning: usually lighter and slightly less chromatic to keep
  contrast and avoid glow; sometimes a different hue entirely.
- Dim imagery (`filter: brightness(.85)`) and re-check semantic colors — default red
  reads black-adjacent on dark.
- Dark-first is a legitimate direction (dev tools, terminal aesthetics) — then the
  *light* theme is the derived one, or doesn't exist. A direction may be single-theme
  on purpose.

## Gradients — with intent or not at all

Slop gradients: purple→blue at 135° on white heroes, gradient text on every heading,
mesh blobs behind glass cards. If the direction doesn't *require* gradients, skip
them entirely — flat color with texture (see atmosphere.md) is more current.

Gradients with intent: near-imperceptible surface washes (two neighbors on the L
scale), duotone imagery mapped to palette hues, a single dramatic direction-native
statement (synthwave horizon, thermal map) as *the* memorable thing. In OKLCH,
same-hue lightness gradients stay clean; cross-hue gradients should pass through a
deliberate midpoint (`in oklch longer hue` when the arc matters).

## Signature moves worth stealing

- **Selection as branding**: `::selection { background: var(--primary); }` — tiny,
  everyone notices.
- **The tinted shadow**: shadows carrying the ink color of the theme
  (`rgb(60 30 20 / .3)` on cream) instead of dead gray-black.
- **Semantic scarcity**: an interface that's entirely neutral until data demands
  color (monitoring dashboards: gray until red) — the restraint *is* the drama.
- **Paper & ink flip**: inverted sections (ink ground, paper text) to mark a chapter
  change on marketing pages — one flip, not stripes.
