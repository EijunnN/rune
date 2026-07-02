---
name: frontend-aesthetics
description: Design-taste doctrine for building interfaces that look deliberately designed rather than AI-generated — choosing and committing to an aesthetic direction, typography with character, color systems with intention, spatial composition, atmosphere and texture, motion choreography, and an explicit anti-"AI slop" catalog with fixes. Use whenever building or styling any UI — landing pages, dashboards, components, full apps — when a design "looks generic", when picking fonts or colors, or when reviewing frontend work for visual quality.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Frontend Aesthetics

Doctrine for interfaces that feel *designed by someone* rather than assembled by
default. The core failure mode this rune exists to kill: output that is technically
correct and visually anonymous — the same font, the same gradient, the same three
cards as every other generated UI. Distinctiveness is not decoration; it is a set of
deliberate, connected choices, and every one of them is learnable.

**The prime directive: commit to a direction.** Bold maximalism and severe minimalism
both work. Timid middle-ground never does. Intentionality — not intensity — is what
reads as design.

## Reference map

Read the matching reference **before** making choices in that area; read
`slop-catalog.md` before shipping anything.

| Task involves | Read |
| --- | --- |
| Starting any new UI, picking a look, "make it beautiful" | [references/direction.md](references/direction.md) |
| Choosing fonts, pairing, scale, hierarchy | [references/typography.md](references/typography.md) |
| Palettes, themes, dark mode, tokens, gradients | [references/color.md](references/color.md) |
| Page structure, grids, whitespace, hero/section layouts | [references/layout.md](references/layout.md) |
| Backgrounds, texture, shadows, borders, depth | [references/atmosphere.md](references/atmosphere.md) |
| Animations, transitions, hover states, page-load reveals | [references/motion.md](references/motion.md) |
| Reviewing/fixing a design that "looks AI-generated" | [references/slop-catalog.md](references/slop-catalog.md) |
| Final polish: focus, selection, empty states, favicons, details | [references/craft-details.md](references/craft-details.md) |

## Non-negotiables

1. **Name the direction before writing code.** One sentence — "8-bit terminal, dark,
   neon vermilion accent" — and every subsequent choice obeys it. No name = no design.
2. **Every screen gets one memorable thing.** A striking type treatment, an unexpected
   layout move, a signature interaction. One. More dilutes; zero is anonymity.
3. **Typography carries the design.** Pick fonts with character; pair a distinctive
   display with a workhorse body. Never default to the fonts every generated UI uses —
   and know that yesterday's "safe alternative" is today's slop (see typography.md).
4. **Dominant color + disciplined accent** beats an evenly-distributed palette. The
   accent appears when something *matters* — if it's everywhere, it's nowhere.
5. **Tokens, not hardcodes.** Colors, radii, spacing, shadows, durations live in CSS
   variables/theme config. A design system of one-off values is neither.
6. **Negative space is a material.** Generous emptiness OR controlled density — chosen,
   not defaulted. Cramped-but-uniform is the tell of no decision at all.
7. **Backgrounds are never an afterthought.** Pure default white/black with no
   temperature, texture, or depth reads as unfinished. Atmosphere is cheap; use it.
8. **The grid is followed strictly or broken deliberately** — one intentional
   grid-break per view creates tension; accidental misalignment creates mess.
9. **One orchestrated motion moment** (a staggered page reveal, a considered
   transition) beats twenty scattered hover effects. Motion is choreography, not
   seasoning.
10. **Accessibility is part of the aesthetic.** Contrast ratios, visible focus,
    `prefers-reduced-motion` — a design that fails them is a failed design, and
    constraint-driven choices usually look better anyway.
11. **Consistency in the small systems**: one radius language, one shadow language, one
    spacing scale, one icon stroke weight. Mixed systems read as generated.
12. **Match code complexity to the vision.** Minimalism demands precision (spacing,
    optical alignment, type tuning); maximalism demands elaborate execution (layers,
    motion, texture). Simple vision + sloppy execution = slop.
13. **Context-specific character.** If the UI could belong to any product, it belongs
    to none. Let the domain feed the design (finance ≠ zine ≠ dev tool).
14. **Check the slop catalog before shipping.** It's a blocklist, and it's mandatory.
15. **States are designed, not defaulted**: empty, loading, error, focus, selection —
    the moments users actually remember.

## Decision framework — choosing a direction

1. **Purpose & audience**: what job does this UI do, for whom, in what mood?
   (A monitoring dashboard wants calm authority; a launch page wants a pulse.)
2. **Pick a position on the axes** — deliberately, toward an edge:
   minimal ↔ maximal · warm ↔ cool · organic ↔ geometric · retro ↔ futuristic ·
   playful ↔ severe · luxurious ↔ utilitarian.
3. **Name it** in one evocative sentence, with a reference point if useful
   ("editorial magazine, ink on cream", "terminal CRT, phosphor green",
   "Swiss poster, red accent, brutal grid").
4. **Derive the system from the name**: the direction dictates fonts, palette, radius,
   shadow style, motion personality. If a choice can't be justified by the direction,
   it's off-theme — cut it.
5. **Commit.** Mixing two directions produces mud. If the client/user asks for a pivot,
   pivot *everything* (this is why tokens matter).

## Decision framework — "it looks generic," triage order

Pull levers in this order; each is higher-leverage than the next:

1. **Typography** — swap the anonymous font for one with character; push weight
   contrast (300/700, not 400/500); tighten display tracking. 80% of "designed" feel.
2. **Color** — replace the timid palette: one dominant, one sharp accent, neutrals
   with temperature (never pure gray).
3. **Layout** — break the symmetry somewhere meaningful: offset the hero, overlap an
   element, vary section rhythm.
4. **Atmosphere** — give the background a life: tint, grain, pattern, or a shadow
   language with opinion.
5. **Motion** — add the one orchestrated moment (staggered reveal on load).
6. **Details** — focus/selection/scrollbar/empty states tuned to the theme.

## Anti-slop quick table

The full catalog with fixes lives in slop-catalog.md — these are the instant tells:

| Tell | Verdict |
| --- | --- |
| Inter/system font + purple-blue gradient on white | The uniform of generated UI. Change both. |
| Centered hero: gradient H1, subtitle, two pill buttons | Recompose asymmetrically or earn the center with type |
| Three feature cards, icon in rounded square, title, two lines | Vary structure: bento, editorial list, alternating rows |
| `rounded-xl` + `shadow-md` on every element | Pick a radius/shadow *language* per direction |
| Emoji as icon system (🚀 ✨ 💡) | Real icon set, one stroke weight, or none |
| "Supercharge / Unlock / Elevate your workflow" | Concrete copy about the actual product |
| ✨-badge above the H1 ("New: AI-powered…") | Delete it or design a real announcement |
| Gray-50 page, white cards, gray-200 borders everywhere | Give the page temperature and the surfaces hierarchy |
| Dark mode = inverted grays, same accent | Re-tune: desaturated surfaces, adjusted accent, dimmed imagery |
| Glassmorphism cards floating on a mesh gradient | 2021 called; pick a direction with a spine |

## Review checklist

**Direction** — nameable in one sentence; every choice traceable to it; one memorable
element present.
**Type** — non-default fonts; display/body pairing with contrast; fluid scale; tuned
tracking/leading; real hierarchy (not just size).
**Color** — dominant + scarce accent; neutrals with temperature; AA contrast verified
both themes; tokens only.
**Layout** — deliberate grid; at least one intentional asymmetry/tension; whitespace
as a choice; section rhythm varies.
**Atmosphere** — background has intention; one shadow language; borders consistent
with direction.
**Motion** — one orchestrated moment; micro-interactions ≤ 250ms; transform/opacity
only; `prefers-reduced-motion` honored.
**Slop** — full catalog checked; zero tells shipped.
**Details** — focus visible and themed; `::selection` themed; empty/loading/error
designed; favicon + OG present.
