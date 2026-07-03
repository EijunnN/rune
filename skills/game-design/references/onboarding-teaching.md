# Onboarding & Teaching — The First Fifteen Minutes

More players are lost in the first session than in all later hours combined. Onboarding's job is not "explain the game" — it's to get the player to the fun *fast*, teach only what this moment needs, and make them feel clever while learning. The iron law: **players don't read**. Design for it instead of resenting it.

## Teach through play (the hierarchy of teaching tools)

Best to worst; use each level only when the one above can't work:

1. **Level design that makes it inevitable** — the low ceiling that forces crouch, the gap slightly too far without dash, the shiny item behind a breakable wall. The player *derives* the mechanic → it sticks forever and feels like their discovery. (The canonical craft: Mario 1-1 teaches goomba, mushroom, pipes, and jumping arcs with zero words.)
2. **Consistent visual/audio language** — red = damage, glowing = interactive, this silhouette = ranged enemy. Grammar you establish once and reuse teaches every future variant for free.
3. **Just-in-time prompts** — a single contextual keybind hint the first 1–2 times the situation appears, then never again. Prompt at the moment of need, not at the door of the dungeon.
4. **Reactive coaching** — after repeated failure, a targeted hint ("enemies flash white when about to strike"). Failure-triggered teaching lands because attention is maximal.
5. **Text/tutorial popups** — the last resort. If needed: one sentence, one concept, dismissible, never stacked, never during action. Three simultaneous popups = three unread popups + one annoyed player.

Never front-load: the 20-minute tutorial teaching all twelve systems produces retention of roughly zero systems. Spread teaching across the first hours — introduce a mechanic within minutes of when it's first *needed*.

## Structure of a strong first session

- **Minute 0–1: the core verb, hands on.** No logos-menus-lore gauntlet; input within seconds (even during "credits" — half the classics do this). The first interaction should showcase the game's feel at its best (game-feel.md) — first impressions are formed on the moment layer, not the feature list.
- **Minute 1–10: the teach-test loop on the core verb**, one twist introduced, one small victory that felt earned (a slightly-too-strong early challenge beaten on attempt two beats ten trivial wins).
- **Minute 10–15: the promise.** Show the horizon — the skill ceiling clip, the map zooming out, the class select, the base to build. The player should end session one able to say what the game is *and* what they want from session two.
- Give an early **safe sandbox** for experimenting with controls (a hub, a field of dummies) and a fast way back to it.

## Respecting prior knowledge

- Genre veterans arrive pre-taught: let them skip or fast-path (a harder optional route early doubles as a self-selection gate; "have you played games like this?" is honest and effective).
- Follow genre conventions by default (SKILL.md #3); every deviation is a mini-tutorial you now owe. Spend those deliberately on your identity mechanics.
- Diegetic framing beats abstract framing: "the elder teaches you the parry rite" carries lore *and* mechanic; a floating "PRESS L1 TO PARRY" carries neither well. But never let fiction obscure function — clarity wins ties.

## Failure during learning

- Early failure must be cheap (instant retry, zero lost progress) and *informative* — the death recap doctrine from difficulty-progression.md applies double in hour one.
- Design the first failure deliberately: many great games script a safe early defeat to teach that failure is part of the loop (and to calibrate expectations for a hard game — honesty up front filters kindly).
- Watch for the **silent fail state**: the player who doesn't die but doesn't progress — lost, stuck, wandering. Deaths are visible in data; confusion isn't. This is what live observation is for (playtesting-scope.md): note where testers stall >60s without intent, add affordances there (light, motion, sound, NPC gaze — attention magnets beat map markers).

## UI onboarding

- Reveal UI progressively: HUD elements appear when their system does (mana bar with first spell). A complete HUD on a new player is noise wearing information's clothes.
- Every icon gets a tooltip; every tooltip's first five words carry the meaning.
- Default control schemes follow platform conventions; remapping exists; the first prompt uses the player's actual input device glyphs.

## Anti-patterns (instant churn generators)

The unskippable 15-minute intro cutscene · tutorial island disconnected from the real game ("the game starts after the tutorial" = the game starts after many players left) · teaching systems in an order driven by lore instead of need · popups during combat · quizzing before playing (choose class/build/difficulty with zero context — delay or make reversible, mechanics-depth.md blind-pick rule) · gating the fun verb behind an hour of setup (give the double-jump now) · assuming session two (end session one with a hook: an unopened door, a glimpsed power, an appointment — curiosity is the cheapest retention system ever built).

## The test

Hand the build to a stranger, say nothing, watch 15 minutes: Did they experience the core verb at its best? Can they state the goal? Did they smile once? Where did they stall? "Would you play session two?" — asked at the door, not in the room. Iterate on the worst stall until this test passes cold.
