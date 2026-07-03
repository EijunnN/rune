# Difficulty & Progression — The Curve Players Climb

Difficulty is the gap between what the game demands and what the player can currently do. Progression narrows it (power, knowledge, skill); design widens it back on schedule. Done right, the player lives at the edge of ability — flow. Done wrong, they're bored (gap closed) or defeated (gap uncrossable) — and both report as "the game isn't fun".

## The rhythm: teach → test → twist → rest

Every mechanic and every difficulty step follows the same beat:

1. **Teach** — introduce in a safe, legible context (onboarding-teaching.md owns this beat).
2. **Test** — demand it under pressure; failure available and instructive.
3. **Twist** — recombine with known elements (the spike enemy… on a moving platform… during the timer). Twists are where content *multiplies* instead of just accumulating.
4. **Rest** — a valley: lower intensity, space to feel powerful, breathe, absorb. Rests make peaks readable; sawtooth beats staircase — a curve that only rises numbs.

Boss = a formal exam of the chapter's mechanics, telegraphed as such. The player should be able to predict *what* will be tested, not *how*.

## Legibility before numbers (the "too hard" triage)

Players almost never quit because a game is hard; they quit because it's **illegible or unfair**. Before touching HP/damage values, audit:

- **Cause of death visible?** The player must know what killed them and what they'd do differently. Kill-cams, death recaps, damage direction indicators, distinct enemy attack sounds — all cheaper than nerfs and better received.
- **Telegraphs sufficient?** Wind-ups, glints, audio cues sized to required reaction time (human ~250ms + read time; attacks faster than that must be positional/pattern-based, not reaction-based).
- **Fair failure rules**: no off-screen hits, no input eaten during animations the player can't cancel (or teach commitment explicitly, Souls-style — commitment is a legitimate design, surprise commitment is not), hitboxes matching visuals, checkpoints before hard sections, not before the cutscene before them.
- **Practice affordance**: can the player retry the *hard part* quickly? Retry loop length is the single strongest lever on perceived difficulty — 3 seconds to retry makes brutal acceptable (Celeste, Super Meat Boy); 90 seconds makes moderate unbearable.

Only after legibility passes should numbers move — and then in honest steps (±30%) against defined player bands.

## Difficulty options without shame

- **Difficulty settings**: change demands, not just sponginess — enemy aggression, telegraph windows, resource scarcity. "+50% enemy HP" is the laziest knob and mostly makes fights *longer*, not harder.
- **Assist/accessibility options** (game speed, invulnerability toggles, aim assist) cost you nothing, are used by exactly the players who need them, and expand your audience — ship them, unshamed, separate from "difficulty" branding.
- **Dynamic difficulty (DDA)**: powerful and dangerous — players who detect it feel patronized (rubber-band racers) or exploited. Safe DDA is invisible and one-directional: more health drops after repeated deaths, never enemies getting stronger because you're good.
- **Player-selected risk**: the best difficulty system is opt-in stakes — optional hard routes, betting systems, challenge modifiers for better rewards (risk-as-currency). Players never resent difficulty they chose.

## Progression systems — power, knowledge, skill

Three parallel tracks; know which each reward feeds:

- **Skill** (the player got better): free, infinite, the most durable motivation. Design must *reveal* it — recurring challenge types, returnable early areas that now feel trivial, mastery-expressive verbs (core-loop.md).
- **Knowledge** (the player knows more): builds, routes, enemy patterns, recipes. Roguelikes run almost entirely on this + skill. Protect it from wikis by making in-game discovery satisfying and *sufficient*.
- **Power** (the numbers got bigger): the classic carrot, and the only one that inflates. Vertical power needs matching demand growth or the game trivializes itself (balance-economy.md curves). Orthogonal unlocks (new verbs, options — not bigger numbers) extend engagement without the treadmill.

Pacing doctrine: **front-load the unlock rate** (something new every few minutes early, spacing out as investment deepens), never gate the *core fun* behind progression (the double-jump that makes movement feel good on hour 4 should be hour 0 — progression seasons the meal, it isn't the meal), and give late-game a horizon (prestige, mastery ranks, self-set goals) rather than a cliff.

## Gates: skill vs power vs content

- **Skill gates** ("git gud walls") filter your audience — place them consciously (a genre statement at hour 1 is honest; at hour 20 after casual-friendly content, it's a betrayal of the audience you built).
- **Power gates** (stat checks) are pacing tools that read as "come back later" — fine in exploration structures (Metroidvania keys), toxic when they mean "grind here".
- Never *disguise* one as the other: a boss that's beatable with skill at current power, or clearly signposted as "you're under-leveled" — ambiguity between the two is where players waste hours and quit bitter.

## Retention without dark patterns

Retention is the *by-product* of a loop that keeps generating desire — never the goal optimized directly (that road ends in dailies, FOMO, and streaks: friction dressed as engagement, and "retention built on friction is churn on a delay"). The honest retention toolkit:

- **Curiosity hooks**: the locked door glimpsed, the character silhouette not yet unlocked, the "???" in the collection — open questions cost nothing and outperform obligations.
- **Appointment mechanics only if the fantasy earns them** (crops growing fits a farm; login streaks fit nothing) — and always with catch-up grace, never punishment for absence.
- **Mastery visibility**: rank labels, personal bests, replays of old clears — showing the player their own growth is the retention system with zero content cost (the skill track from above).
- **Fresh questions per session**: rotating modifiers, daily *seeds* (same run for everyone — social comparison for free), drafting variety. The test: does the returning player face a new decision, or the same chores?
- The metric truth: retention problems at day 1 are onboarding, day 7 are loop depth, day 30 are content/mastery horizon — diagnose by *when* they leave, fix in that layer, and never paper a layer's hole with another layer's rewards.

## Onboarding cliff & endgame — the two mortality peaks

Churn concentrates in minute 0–15 (onboarding-teaching.md) and at content end. For the end: telegraph the horizon honestly, convert to mastery/self-expression loops (NG+, challenge modes, leaderboards, builds), and end cleanly if the game is a finite story — a game that respects its own ending is remembered better than one that dilutes into chores. "Forever games" are a business model choice, not a design default.
