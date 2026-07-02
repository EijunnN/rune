# Aesthetic Direction — Choosing One and Committing

Design quality is downstream of one decision made early: *what is this, visually?*
Skipping that decision doesn't produce neutrality — it produces the statistical
average of every interface ever made, which is exactly what "AI-generated" looks like.

## The direction vocabulary

Directions worth reaching for, each with a spine (never mix two):

- **Editorial / magazine** — serif display, generous measure, ink-on-paper palette,
  ruled lines, drop caps, asymmetric columns. For content, journals, portfolios.
- **Brutalist / raw** — system-adjacent type pushed huge, hard borders, no radius, no
  shadow, harsh contrast, exposed structure. For statements, studios, anti-corporate.
- **Terminal / retro-computing** — monospace everything, scanlines/CRT glow, pixel
  fonts for display, hard offset shadows, square edges. For dev tools, hacker culture.
- **Luxury / refined** — high-contrast serif, near-black on warm cream, hairline
  rules, huge whitespace, small caps, restrained gold/oxblood accent. For premium.
- **Playful / toy-like** — rounded everything, springy motion, saturated primaries,
  chunky borders, sticker shadows. For consumer, kids, community.
- **Organic / natural** — earthy palette, soft asymmetric blobs, grain, humanist
  sans, photography with warmth. For wellness, food, sustainability.
- **Industrial / utilitarian** — dense data, narrow grotesque, functional color
  coding, visible grid, zero decoration. For dashboards, ops, pro tools.
- **Retro-futuristic / synth** — dark ground, neon accents, chrome gradients, wide
  tracking, glow. For gaming, music, crypto-adjacent.
- **Swiss / international** — strict grid, one grotesque family, one accent red,
  flush-left rag-right, mathematical spacing. Timeless for anything serious.
- **Soft / pastel** — low-chroma palette, diffuse shadows, rounded-but-not-bubbly,
  gentle motion. For health, education, calm tools.

These are starting points, not a menu to pick from mechanically — invent hybrids-with-
a-dominant, era-specific flavors ("1970s NASA manual"), domain-native looks ("ledger
paper fintech"). What matters is that the result has a *name*.

## The naming ritual

Before any code: write one sentence that a stranger could design from.

- ❌ "clean and modern" — describes nothing, produces the average.
- ✅ "washi paper and sumi ink — zen editorial, one vermilion accent"
- ✅ "8-bit terminal: near-black CRT, JetBrains Mono, Press Start 2P display,
  hard pixel shadows"
- ✅ "Dieter Rams calculator: warm gray plastic, orange action key, engraved type"

The name is a *decision function*: every later choice (radius? shadow? easing? icon
style?) gets tested against it. If the sentence can't answer, the sentence is too
vague — sharpen it.

## Sources of direction

When nothing is specified, derive rather than default:

1. **The domain's material culture** — finance has ledgers and terminals; music has
   posters and vinyl; dev tools have terminals and manuals; cooking has menus and
   butcher paper. Steal from the physical world of the product.
2. **The audience's taste graph** — what do these users already love looking at?
3. **The anti-competitor move** — if every competitor is blue-gradient SaaS, severe
   monochrome editorial wins attention by contrast.
4. **The brand seed** — a name like "Rune" implies carved marks, seals, arcana; a name
   like "Meadow" implies something else entirely. Let the name pull.

## One memorable thing

Every screen ships with exactly one element a visitor could describe the next day:

- a headline set in an enormous, characterful display face
- a signature layout move (the sidebar that's actually a timeline)
- a themed interaction (the card that lifts with a hard pixel shadow)
- an atmospheric ground (the scanline texture, the grain, the gradient wash)

Discipline: **one**. Two memorable things compete; five is a theme park. Choose where
the energy goes and keep everything else quiet in service of it.

## Commitment and coherence

- The direction dictates the *whole* system: type, palette, radius (a luxury serif
  brand does not get `rounded-2xl`; a toy brand does not get hairline borders),
  shadows (hard offset vs diffuse vs none), motion personality (steps() vs springs vs
  slow fades), icon style, photo treatment, copy voice.
- **Coherence beats intensity.** A quiet direction executed perfectly outclasses a
  loud one executed 80%. The last 20% — optical alignment, consistent details — is
  where "designed" lives.
- When a direction changes mid-project, migrate the tokens and sweep *everything*.
  A half-migrated theme reads worse than either theme.
- Vary across projects. If every design you produce converges on the same look, the
  look has become your Inter — see slop-catalog.md on second-order slop.
