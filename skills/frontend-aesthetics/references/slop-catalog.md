# The Slop Catalog — What "AI-Generated" Looks Like, and the Antidotes

"AI slop" is not one mistake; it's the *statistical average* of a million interfaces,
reproduced without context. Each entry below is a tell that instantly reads as
generated — with the move that fixes it. Sweep this list before shipping anything.

## Typography tells

**1. Inter/Roboto/system-default for everything.**
The non-decision. → Pick fonts *for this product* (typography.md); pair a
characterful display with a workhorse body.

**2. Second-order slop: Space Grotesk / Poppins / Montserrat / Playfair reflexes.**
Yesterday's fix is today's tell — these became the automated "make it designed"
substitutions. → If a font is the reflexive alternative, it's burned; choose from the
direction, not from the reflex.

**3. Untuned display type.**
Huge headlines with default tracking/leading, 400-weight everywhere. → Negative
tracking on display, weight extremes (300/700), leading 1.0–1.1 on heroes.

**4. Gradient text on headings.**
Especially purple→blue. → Solid ink; if emphasis is needed, one accent-colored *word*.

## Color tells

**5. Purple-to-blue gradient on white.** The uniform. → Build the palette from the
direction: tinted neutrals, one dominant, one scarce accent (color.md).

**6. Pure grays (`gray-50` page, white cards, `gray-200` borders).**
Temperature-less = machine-made. → Warm or cool the whole neutral ramp.

**7. Evenly-loud multi-color palettes** (teal + purple + pink + orange dashboard).
→ Neutral until it matters; one accent with a job.

**8. Dark mode as inverted grays with the same accent.**
→ Re-tuned dark theme: hued near-black surfaces, desaturated fields, adjusted accent
(color.md).

## Layout tells

**9. The centered hero formula**: badge pill ("✨ New!") → gradient H1 → gray
subtitle → two pill buttons (filled + outline) → dashboard screenshot in a browser
frame. → Recompose: offset grid, editorial split, type-as-hero; kill the badge; one
CTA with conviction.

**10. Three feature cards** (icon in rounded square, four words, two lines), then
"How it works" in three steps, then logo wall, then pricing trio, then dark footer.
The template of templates. → Vary the presentation per section: numbered editorial
list, alternating rows, one annotated screenshot, a spec table; cut sections that
say nothing.

**11. Everything centered, every section `py-24`, same width.**
→ Asymmetry, varied rhythm, one grid-break (layout.md).

**12. Bento grid of identical cells.** The new three-cards. → Bento only with real
hierarchy (one hero cell), else a different pattern.

**13. Emoji as design system** (🚀 in the hero, ✨ in bullets, 💡 in features).
→ A real icon set, one stroke weight — or no icons; typography can carry lists.

## Surface tells

**14. `rounded-xl` + `shadow-md` + `p-6` on every element.**
The utility-class default palette. → One radius language and one shadow language
chosen from the direction (atmosphere.md); some directions want radius 0 and no
shadows at all.

**15. Glassmorphism cards on mesh-gradient blobs.**
→ Glass only where there's content to refract (sticky header); grounds built from
temperature + texture, not blobs.

**16. Flat default backgrounds** — untreated white/black voids. → Minimum viable
atmosphere: tint + grain or pattern at 2–5% (atmosphere.md).

**17. Stock 3D illustration packs / undraw people.**
→ Treated imagery (duotone to palette), real product screenshots, typography-as-art,
or nothing.

## Copy tells

**18. "Supercharge your workflow" / "Unlock the power of X" / "Build faster, ship
smarter."** Interchangeable hype. → Say what the product concretely does, in the
product's voice; specificity is credibility.

**19. "Get Started" + "Learn More" as the eternal CTA pair.**
→ CTAs with contract: "Browse the runes", "Read the doctrine", "Start a project" —
verbs from the domain.

**20. Feature names that are categories** ("Analytics", "Collaboration",
"Integrations"). → Name what's *different*, not the aisle it sits in.

## Component tells

**21. Unthemed shadcn/ui (or any kit) shipped as-is** — zinc palette, default radius,
default shadows. Kits are *starting points*; the defaults are recognizable across
ten thousand sites. → Retheme the tokens to the direction before building screens.

**22. Mixed icon families / stroke weights** (a Heroicon next to a Lucide next to an
emoji). → One family, one weight, one size grid.

**23. Uniform card grids for content with non-uniform importance.**
→ Hierarchy: featured item larger/first/styled differently; or a list, which is
honest about linearity.

**24. Carousel/slider for content nobody asked to rotate.** → Show the best one;
list the rest.

## Motion tells

**25. Hover effects everywhere, no entrance choreography.**
→ Invert the budget: one staggered reveal; quiet consistent micro-interactions
(motion.md).

**26. Slow fade-up on *every* scroll element, re-triggering both directions.**
→ Section-level reveals, once, fast (≤700ms).

## The meta-tell

**27. It could be any product.** Swap the logo and nothing breaks — no domain
vocabulary in the design, no memorable element, no opinion. → Return to
direction.md: name the direction, add the one memorable thing, let the domain feed
the visuals.

## Sweep protocol

Before shipping: scan the build against entries 1–27. Each hit is either **fixed** or
**explicitly defended** (some directions legitimately center heroes; a terminal
aesthetic legitimately uses a mono default font — the difference is the *decision*).
"It's the default" is never a defense.
