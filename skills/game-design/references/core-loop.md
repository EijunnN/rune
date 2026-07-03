# The Core Loop — The Machine That Makes Fun

The core loop is the smallest cycle of action → feedback → consequence → renewed motivation the player repeats hundreds of times. Everything else (meta, story, progression) exists to recontextualize this loop and keep it fresh. If the loop is weak, nothing downstream saves it; if it's strong, players forgive almost everything else.

## Verbs first

Design starts with **verbs**, not features: jump, slash, trade, deceive, stack, aim, dodge, grow. The verb test:

- Can you describe the game as 1–2 verbs plus a twist? ("Jump — but you rewind your own ghost." "Trade — but every price is set by other players.")
- Is the verb *inherently* variable? A verb repeated identically 500 times must feel physically good (driving, slashing) or produce different situations each time (aiming at moving enemies). Verbs with neither — pure clicking through menus — need the decision layer to carry everything.
- **Verb depth checklist**: does mastery change how it's performed (spacing, timing, angles)? Does context change what it means (jump to travel / to dodge / to attack)? One deep verb beats four shallow ones.

## Loop layers — moment, session, meta

Design each explicitly; they answer different "why am I doing this?" horizons:

| Layer | Timescale | Question it answers | Example (roguelike) |
| --- | --- | --- | --- |
| Moment | 1–10 s | is *this action* satisfying? | dodge-slash-dodge feels crisp |
| Encounter/room | 30 s–3 min | is *this situation* interesting? | this enemy combo forces repositioning |
| Session/run | 15–60 min | did *this sitting* have an arc? | build came together, died to a choice |
| Meta | days–weeks | why *return*? | unlocks, mastery, next character |

- The most common structural bug: a strong meta (unlock trees, collections) taped over a weak moment layer. Players feel it as "I'm playing for the rewards, not the game" — pre-churn.
- Second most common: no session arc. Sessions need a shape — rising tension, a climax, a resolution point that says "good place to stop" (which paradoxically increases return rate; endless flat loops burn out).
- Each layer should *feed* the next: moment mastery unlocks encounter tactics; encounter results shape the run; run outcomes advance the meta. Test the connections, not just the layers.

## The motivation cycle inside the loop

For each pass through the loop, the player needs:
1. **A goal** they chose or accepted (kill this, reach that, afford this) — visible and proximate.
2. **A plan** they can form (which means legible systems — see mechanics-depth.md).
3. **Execution** that involves them (skill, timing, or at minimum an interesting click).
4. **Feedback** — immediate sensory (game-feel.md) plus state change they can read.
5. **A changed situation** that generates the next goal *automatically*.

When step 5 fails — the world is the same after the action — the loop stalls and the player asks "why continue?" This is why kill-10-rats quests bore: the 10th rat changes nothing the 1st didn't.

## Session shape patterns (pick to match your player's life)

- **Run-based** (roguelike/lite): fixed-length sessions with total arcs; meta between runs. Forgiving to interruption, high "one more run".
- **Checkpoint ladder** (platformer/action): 5–15 min segments; save points define session grain.
- **Appointment/simulation** (farming, idle): the game state creates future appointments (crops ready in 20 min) — powerful and dangerous (obligation curdles into chore; always allow catch-up).
- **Sandbox project** (builders): player-set goals; the game's job is suggesting the next project (blueprints, milestones) or drift sets in.

Match difficulty structure and save systems to the shape; a 45-minute unsaveable stretch in a commuter game is a design contradiction.

## Prototyping the loop (before believing in it)

- Build the moment layer with primitives (grey boxes, circles) in days, not weeks — the "find the fun" gate from the non-negotiables. Tune feel before content exists.
- **The 30-minute test**: can a playtester enjoy 30 minutes with zero meta, zero unlocks, placeholder art? If yes, you have a game; everything else is amplification. If no, no amount of content changes the verdict.
- Fake expensive parts: numbers on paper for the economy, a spreadsheet combat sim, one hand-placed level pretending to be procedural. Validate the *decision structure* cheaply.

## Loop smells

- Player optimal play = ignoring your favorite system (the system is decorative; integrate or cut).
- "It gets fun after hour 2" (it doesn't get played after minute 20 — restructure so the real loop starts in minute 1).
- Watching a stream of your game is as informative as playing it (execution layer is empty — add skill or meaningful input).
- Players describe progress in numbers, not stories ("got 3 upgrades" vs "finally beat the ice caves") — consequence legibility or session arc is missing.
- You keep adding content to fix boredom (content is the most expensive medicine and treats only the symptom).
