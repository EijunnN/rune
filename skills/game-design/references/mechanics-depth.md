# Mechanics & Depth — Rules That Multiply

Mechanics are rules; **dynamics** are what emerges when rules meet players. You design mechanics but you're accountable for dynamics — "my systems are fine, players just play wrong" is the design equivalent of "works on my machine".

## Depth vs complexity (the ratio that decides everything)

- **Complexity** = what the player must learn (rules, stats, exceptions, UI).
- **Depth** = the space of interesting decisions those rules generate.
- The goal is maximal depth-per-complexity. Go's ratio is legendary (2 rules, infinite depth); a bad RPG's is inverted (40 systems, one viable build).
- Every mechanic pays complexity tax *forever*: tutorial space, UI space, balance interactions with all future mechanics, player working memory. Price it like debt, not like content.

**Where depth actually comes from:**
- **Interacting systems**: fire spreads + wind direction + wooden shields = tactics no single rule dictated. Design mechanics as inputs/outputs that touch shared state (position, heat, noise, light) so they compose.
- **Trade-off axes**: speed↔safety, damage↔range, now↔later, greed↔security. Two axes crossing = a decision space; every option should sit at a *different* point (options at the same point are duplicates — merge them).
- **Constrained resources shared across desires**: one mana pool for healing AND damage creates decisions; separate pools for each create rotations (spam everything off cooldown).
- **Asymmetry against symmetry**: symmetric rules with asymmetric situations (chess) or asymmetric abilities on a symmetric field (fighting games). Full symmetry everywhere = solved; full asymmetry everywhere = unbalanceable.

## Meaningful choice — the anatomy

A choice is meaningful iff: real trade-off · predictable-enough consequences to reason about · feedback that reveals how it played out · and **permanence proportional to information** (big irreversible choices demand the player could know what they were choosing; blind permanent choices are gotchas, not decisions).

Degenerate forms to hunt down:
- **Calculations** — one option is arithmetically best (see dominant strategies, balance-economy.md). Player behavior tell: everyone picks the same thing.
- **Blind picks** — options whose consequences can't be foreseen ("choose your class" before playing any). Fix: delay the choice, make it reversible, or preview honestly.
- **False choices** — different buttons, same outcome. Players detect this fast and disengage from *all* choices afterward (trust is a resource).
- **Overloaded choices** — 12 similar options with 3-stat differences. Comparison fatigue reads as depth but is complexity; curate to the distinct archetypes.

## Emergence — designing for surprises you didn't script

- Prefer **simulation-y rules over scripted outcomes** where your fantasy allows: "arrows are physical objects" enables shooting a rope, pinning a sleeve, missing dramatically. Scripted special-cases do exactly one thing forever.
- Shared, readable world-state is the multiplier: if stealth reads light level, and spells create light, and mushrooms glow when struck — you never designed "mushroom stealth puzzle", players did.
- Emergence needs **legibility to be fun**: players must attribute outcomes to rules ("the oil I spilled ignited") not to chaos. Consistent rules > realistic rules; if fire sometimes spreads and sometimes doesn't for hidden reasons, the system reads as random and dies.
- Accept the cost: emergent systems produce exploits and comedy. Patch the *degenerate* (skips all challenge), keep the *delightful* (rocket jumping, animal cannons) — communities are built on sanctioned exploits.

## Elegance moves (make one rule do three jobs)

- **Dual-purpose resources**: health as casting cost, ammo as currency, time as both score and hazard — instant tension without new systems.
- **Reuse verbs in new contexts** before adding verbs: the grappling hook that traverses also pulls enemies also disarms traps. Each context reuses learned skill (cheap complexity), adds decisions (real depth).
- **Diegetic mechanics**: reload as a timed minigame, map as an item the character holds — theme and system in one, no UI tax.
- **Cut-and-fold test** before shipping any system: list your mechanics; for each, ask "what breaks if removed?" If the honest answer is "we'd need less tutorial", fold its purpose into a neighbor and cut it.

## Systems literacy for balance (light math, heavy consequences)

- **Feedback loops**: positive (winning → stronger → win more) accelerate games to a close but snowball unfairness (mitigate: rubber-banding, diminishing returns, catch-up mechanics — disguised, or players resent them). Negative loops (leader gets targeted, costs scale) stabilize and extend games but can make winning feel punished. Every economy/combat system has these loops whether you designed them or not — find them on paper first.
- **Dominant strategy check per addition**: does this new option beat existing ones *in all situations*? Then it's not an option, it's a patch deleting old content. Situational dominance is the design target ("best against armor, worst in rain").
- **Orthogonal power** beats vertical power for choice preservation: +20% damage (vertical) obsoletes; "attacks pierce but ricochet randomly" (orthogonal/sidegrade) diversifies. Vertical growth belongs to progression pacing (difficulty-progression.md); orthogonal belongs to build variety.

## When you're stuck adding, subtract

The mature move in a bloated design is the **mechanic diet**: rank systems by (decisions generated ÷ complexity cost), cut the bottom third, re-playtest. Games almost always improve — remaining systems get more attention, screen space, and balance care. Depth was hiding under the pile.
