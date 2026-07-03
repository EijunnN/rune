# Game Feel & Juice — Feedback as Physics

Game feel is the perceived physicality of interaction: the sense that pressing a button *does something in a world with weight*. Juice is the layer of amplified feedback that carries it. This is not garnish — feel is **information delivered through the body**: what hit, how hard, what's charged, what's dying. A mechanically identical game with tuned feel plays "better" in every blind test, and players can't articulate why. That's the point.

(Theory and budgets live here; code patterns — tweens, shake implementations, particles — live in the stack runes: web-games / threejs.)

## Input feel — the foundation under all juice

Juice on top of mushy input is lipstick on latency. In order of importance:

- **Latency**: input→visible response under ~100ms total; for action games, the *first frame* of response (even just a flash or sound) on the very next frame, with the full animation following. Never let animation priority eat inputs silently.
- **Buffering & grace**: input buffering (a jump pressed 100ms early fires on landing), **coyote time** (~80–120ms to jump after leaving a ledge), wider-than-visual pickup/interaction ranges. These forgiveness systems are invisible and universally make controls feel "tight" — the paradox of feel: responsive = slightly dishonest in the player's favor.
- **Acceleration curves**: instant-start with eased-stop reads as responsive-but-weighty; symmetric momentum reads as ice. Tune run/stop/turn curves before anything else in a movement game; a good movement game is a good game before it has any content.
- **Commitment windows**: cancellable start-up, committed active frames — decide per action and stay consistent (difficulty-progression.md's fairness rules).

## The juice catalog (stack them; each carries different information)

For any significant event (hit, jump, land, collect, die), layer from this menu — great games fire 5–8 of these per impact within ~100ms:

| Technique | Communicates | Notes |
| --- | --- | --- |
| **Hitstop/freeze** (2–6 frames on impact) | weight, connection | the single highest value-per-effort trick in action games; scale with damage |
| **Screenshake** | magnitude | small & directional > big & random; decay fast; ALWAYS add intensity setting + reduce-motion respect |
| **Squash & stretch** | elasticity, energy | on jumps, lands, hits; 10–20% deformation, snappy return |
| **Knockback/recoil** | force direction | on both target and attacker (recoil sells power) |
| **Flash** (target white/red 1–3 frames) | damage registered | the universal "hit confirmed" |
| **Particles** | material, magnitude | sparks/debris/dust — emit on state changes; more = harder hit |
| **Sound layers** | material + magnitude + success | thwack (base) + crunch (crit) + chime (kill); pitch-vary ±10% per instance to kill repetition fatigue |
| **Trails/smears** | speed, arc | on fast movers and swings |
| **Anticipation** (wind-up frames) | incoming weight | pre-impact makes post-impact land harder; also the fairness telegraph |
| **Follow-through/overshoot** | momentum | UI and characters: ease past the target, settle back |
| **Camera punch/zoom** (2–4%) | significance | reserve for kills/crits — everything-punches = nothing-punches |
| **Time-scale ripple** (0.05–0.2s slow-mo) | climax | final blows, dodges-just-made; ration hard |

**Easing doctrine**: nothing moves linearly — ease-out for entrances/responses (fast start reads as eager), ease-in for exits, overshoot (back/elastic) for playful UI. Duration discipline: micro-feedback 50–150ms, transitions 200–350ms; juice that delays the next input is friction wearing a costume.

## Proportionality & hierarchy (the taste part)

- **Feedback scales with meaning**: basic hit < crit < kill < boss kill, each a visibly bigger stack. Flat feedback across importance levels wastes the channel; inflated feedback on trivia (level-up fireworks for +1 wood) causes fatigue and devalues real moments.
- **One thing screams at a time**: juice competes for attention — during a boss's telegraph, *its* animation owns the screen; your particles yield. Readability outranks spectacle in any conflict (a gorgeous explosion that hides the next attack is a design bug wearing VFX).
- Build a **feel budget per event type** in a spreadsheet (event → shake px, hitstop frames, sound layers, particle count) — consistency across the game is what reads as "polished"; ad-hoc juice per feature reads as noisy.
- The mute test / the blindfold test: play muted — do impacts still land visually? Play eyes-closed — does audio alone tell you what happened? Each channel should carry the story alone; together they compound.

## Death, failure & reward feel

- Failure deserves juice too: a great death (slow-mo, crunch, fade) converts frustration into drama — then instant retry (difficulty-progression.md). A limp death animation into a 5s reload is churn choreography.
- Reward moments: delay the payoff a beat (chest opens → shine → *then* loot burst) — anticipation is half the dopamine; but keep *repeated* rewards fast (10th chest opens quick; hold ceremony for rarity).
- Idle/ambient feel: breathing idles, cloth in wind, blinking lights — a world that moves when the player doesn't reads as alive and makes player-caused motion pop by contrast.

## Accessibility & restraint (non-optional)

Screenshake/flash intensity sliders and a photosensitivity pass (no full-screen strobes) ship with the juice, not after · reduce-motion honored · juice never obscures hitboxes or telegraphs · test on the smallest screen you support (mobile shake at desktop values is soup) · and know your genre's register — a contemplative puzzle game wants tactile, quiet confirmation (soft snaps, paper sounds), not arcade explosions. Feel serves fantasy (SKILL.md #1); the catalog is the palette, the direction picks the colors.
