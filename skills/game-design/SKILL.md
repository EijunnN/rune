---
name: game-design
description: Game design doctrine, engine-agnostic — core loops, mechanics and depth, balance and economies, difficulty curves, progression and retention, onboarding that teaches through play, game feel/juice, playtesting, and scope discipline. Use whenever designing or reviewing a game or game feature — "make a game", "my game is boring/too hard/too easy", designing combat/economy/progression/levels, adding juice or polish, tuning difficulty, planning an MVP or game jam entry, or evaluating why players quit. Applies to any engine or platform (web, Godot, Unity, Bevy, board games) — this rune is the design judgment; implementation runes handle the code.
metadata:
  author: Fable 5
  version: 1.0.0
  compatibility: Claude Code, Codex
---

# Game Design

A game is a machine that generates **interesting decisions** wrapped in **feedback that feels good**. Fun is not decoration on top of mechanics — it *is* the loop: act → see consequence → learn → want to act again. When a game is boring, the loop is broken somewhere specific (no real choice, no visible consequence, nothing new to learn, or feedback that lands flat), and the fix is diagnosis, not "add more features". Design is subtractive: the best version of your game is usually a smaller one executed deeper.

## Before designing anything

1. **Name the fantasy and the core verb** in one sentence: "you are a tiny knight *parrying* impossible foes", "you *optimize* a factory that grows beyond your control". Every mechanic either serves that sentence or fights it.
2. **Know the target session**: 90 seconds (hypercasual), 15 minutes (roguelike run), 2 hours (session RPG)? Session shape dictates loop design, save systems, and difficulty structure more than genre does.
3. **Steal the genre's skeleton deliberately.** Conventions (WASD, health bars, checkpoint rhythm) are player knowledge you get for free — deviate only where your game's identity lives. Innovation budget: ~one or two systems; everything else, execute the standard well.
4. **Scope for the finish line**: a game jam is one mechanic + juice; an MVP is the core loop complete and *feeling good* before any meta. The graveyard is full of deep systems attached to loops nobody enjoyed.

## Reference map — read before deciding in that area

| Task involves | Read |
| --- | --- |
| The core loop, verbs, session structure, "is this fun on paper?" | [references/core-loop.md](references/core-loop.md) |
| Adding/cutting mechanics, depth vs complexity, emergence, meaningful choice | [references/mechanics-depth.md](references/mechanics-depth.md) |
| Economies, resources, sources/sinks, balancing numbers, dominant strategies | [references/balance-economy.md](references/balance-economy.md) |
| Too hard/too easy, difficulty curves, flow, progression and power growth | [references/difficulty-progression.md](references/difficulty-progression.md) |
| Tutorials, first minutes, teaching through level design, player onboarding | [references/onboarding-teaching.md](references/onboarding-teaching.md) |
| "It feels flat/floaty/unresponsive" — juice, feedback, animation, sound | [references/game-feel.md](references/game-feel.md) |
| Prototyping, playtesting protocol, metrics, cutting scope, shipping | [references/playtesting-scope.md](references/playtesting-scope.md) |

Implementation of these ideas in code (tweens, screenshake, physics, engines) belongs to the stack runes — web-games for the web, threejs for 3D rendering.

## Non-negotiables

1. **Find the fun in the first 10% of development.** Grey boxes and placeholder art, real loop. If moving/shooting/matching isn't enjoyable naked, no meta-system will rescue it — meta *amplifies* fun, it never creates it.
2. **One core verb, polished past reason,** before any second verb. Players forgive missing features; they never forgive a mushy core.
3. **A choice is only meaningful if the options trade off** and the player can *reason* about them. "Sword +5 vs Sword +3" is arithmetic, not choice; "fast-and-fragile vs slow-and-safe" is choice. No trade-off → cut the option or merge them.
4. **Depth over complexity**: depth = interesting states from few rules (chess); complexity = rules to memorize. Every added rule must buy disproportionate new decisions. When in doubt, cut — elegance is systems multiplying each other, not accumulating.
5. **Show consequences immediately and legibly.** Damage numbers, knockback, sound, state change — the player must *see* what their action did within ~100ms, even if the real effect resolves later. Invisible cause-and-effect reads as randomness, and perceived randomness kills learning.
6. **Every resource needs a sink, every sink a purpose.** Currencies that only accumulate become meaningless numbers; the economy is the pacing of desire (earn slightly slower than you want to spend).
7. **Difficulty is a curve you design, not an emergent accident**: teach → test → twist → rest. Spikes are fine when telegraphed (bosses); invisible spikes (a stat wall) read as unfair. And "unfair" — not "hard" — is what makes players quit.
8. **Failure must cost something but teach more.** The best deaths make the player say "my fault, one more try" — fast retry, visible cause of death, preserved learning. Long punishments (lost progress + load screens) convert deaths into quits.
9. **The tutorial is level design, not text.** Teach by making the mechanic necessary in a safe space, then testing it under pressure. If a mechanic needs a paragraph, either the mechanic or the level is wrong. (Players don't read. They *never* read.)
10. **Juice is not optional polish — it's information.** Hitstop, screenshake, squash-and-stretch, sound layers: they communicate weight, success, and damage state faster than any UI. A correct-but-dry game loses to a shallower juicy one every time. Budget juice into the schedule.
11. **Balance for the experience, not the spreadsheet.** Perfect numerical symmetry is boring; slight overpowered-feeling options that are all *viable* is the goal ("balanced but every choice feels like cheating"). Kill only true dominant strategies — options that erase all others.
12. **Randomness: input vs output.** Input randomness (the hand you're dealt → you plan around it) creates decisions; output randomness (your attack missed 5% of the time) removes agency — use it sparingly and always with mitigation the player controls.
13. **Respect the player's time**: no padding disguised as content (fetch quests, grind walls without choice), fast restarts, skippable repetition, saves that match session shape. Retention built on friction is churn on a delay.
14. **Playtest with silent observation early and often.** Watch where they die, where they wander, what they never use — behavior over opinions (players misreport why they quit, never *that* they got confused). One stranger playing beats ten teammates theorizing.
15. **Kill your darlings on schedule.** Any mechanic that playtests poorly twice after a redesign gets cut, no matter the sunk cost. Scope discipline is a design skill, not a project-management chore.

## Decision framework — "is this mechanic worth adding?"

1. Does it serve the core fantasy/verb? (No → cut, whatever it is.)
2. Does it create *new decisions*, or just new content? (Content wears out; decisions compound.)
3. Does it interact with ≥2 existing systems? (Isolated mechanics are expensive; multiplying ones are elegant.)
4. Can a player discover its depth without being told? (Discoverability is retention.)
5. What does it cost in UI, tutorial, and balance surface? (Every mechanic taxes every future mechanic.)
Score honestly; most proposed mechanics fail at 2 or 3 and should die as ideas, not as implemented features.

## Decision framework — "players say it's boring/too hard" triage

- **Boring, early**: core verb feedback is flat → game-feel.md first, loop second. It's almost never "needs more content" in the first 10 minutes.
- **Boring, mid**: decisions stopped mattering (dominant strategy, resources saturated, no new interactions) → balance-economy.md + mechanics-depth.md.
- **Too hard**: usually *illegible*, not hard — cause of death invisible, telegraphs missing, no safe practice → difficulty-progression.md + onboarding-teaching.md before touching numbers.
- **Too easy**: remove safety before adding damage — tighten resources, ask more of mastered skills, layer twists on known mechanics.
- **They quit at minute 2**: onboarding. Minute 20 *from difficulty* (deaths, walls): difficulty curve; minute 20 *from apathy* (nothing new mattered): the "boring, mid" line above. Hour 3: economy/progression. When unsure which, the phone-check test in playtests decides — frustration looks at the screen, boredom looks away.

## Review checklist (sweep any design)

Core verb nameable and fun naked · every option trades off · consequences visible <100ms · resources have sinks · difficulty follows teach-test-twist-rest · deaths teach and retry fast · tutorial plays, doesn't read · juice budgeted · no dominant strategy survived playtesting · randomness gives decisions, not coin flips · player time respected · scope fits the finish line.
