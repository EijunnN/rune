# Balance & Economy — Numbers in Service of Feelings

An economy is every system where players earn, hold, and spend anything (gold, XP, ammo, time, health, attention). Balance is not equality — it's the property that **multiple strategies remain viable and the intended experience survives contact with optimizers**. Players will optimize the fun out of your game if you let them; balance is protecting them from themselves.

## Economy architecture: sources, sinks, and flow

Draw the graph before tuning any number: every resource, its **sources** (kills, quests, time), its **sinks** (purchases, upgrades, consumption, fees), and conversion paths between resources.

- **No sink = dead resource.** Currency that accumulates without desirable spends becomes a meaningless score (endgame gold in most RPGs). Sinks must scale with the player: early (potions), mid (gear), late (prestige/cosmetics/percentage taxes).
- **Faucet > drain = inflation**: numbers balloon, early content trivializes, new rewards feel small. Drain > faucet = starvation frustration. Target: earn rate slightly *behind* desire rate — the player can almost always afford the next exciting thing *soon*. Desire, not wealth, is the pacing instrument.
- **Conversion paths need friction** (fees, time, lossy rates) or one resource becomes all resources and your carefully separated decisions collapse into one number.
- **Time is a currency** — every "free" reward priced in minutes of repetition has an exchange rate players feel precisely. Grind is a price; price it honestly.

## Curves — the shapes that pace everything

- **Cost curves** (upgrades, levels): linear feels flat; exponential (×1.15–1.5 per step) creates natural chapter boundaries where players shift activities. Pair exponential costs with exponential *power* or progress stalls.
- **Power curves**: additive bonuses (+5 damage) shrink relatively over time (self-balancing, eventually boring); multiplicative bonuses (+15%) compound (exciting, runaway risk). Most robust: additive within a tier, multiplicative between tiers.
- **XP/level curves** set expected minutes-per-level: decide the *feeling* per phase (early: level-per-session; late: level-per-week?) then derive the curve backwards from content length. Never let the curve outrun the content.
- **Diminishing returns** on stackables (each armor point worth less) is your quiet guardian against degenerate stacking — build it into formulas from day one (`reduction = armor / (armor + K)` style), because retrofitting it nerfs real players.

## Balancing methodology (the loop, not the spreadsheet)

1. **Intentions first**: write what each option is *for* ("shotgun: dominant <5m, useless >15m; dagger build: highest skill ceiling, highest DPS *if* mastered"). You can't balance toward an undefined target.
2. **Cost everything in one common unit** where possible (damage-per-second-equivalent, gold-per-minute) to spot outliers on paper — then immediately distrust the paper: paper ignores fun, APM, risk, and legibility.
3. **Tune one knob at a time, in big honest steps** (±30%, not ±3% — you're searching for the right neighborhood first, fine-tuning later), against a written test scenario.
4. **Watch behavior, not sentiment**: pick rates, win rates by strategy, where money pools, what nobody ever buys. An option nobody picks is either weak, illegible, or boring — three different fixes (buff / clarify / redesign), so diagnose before buffing.
5. **Buff before nerf when reputation allows**: nerfs feel like theft (loss aversion), buffs feel like gifts. But never let a true dominant strategy live because nerfing is unpopular — one dominant option silently deletes every alternative and *then* the game is "boring" for reasons nobody can name.
6. Balance for **each skill band separately**: the noob-stomper weapon and the pro-only combo both need verdicts at their bands. Perfect high-level balance that makes low-level play miserable is a niche-game decision — make it consciously.

## Randomness in economies & drops

- Loot tables: pure uniform rolls produce brutal droughts at scale. Use **pity timers / escalating odds** (each miss raises the chance) — keeps the thrill, caps the misery. Players never need to know.
- Reward variance is spice: predictable base income (quests) + variance on top (rares) beats all-variance (casino fatigue) and all-predictable (payroll).
- Input-vs-output randomness applies (SKILL.md #12): random *offers* (which three upgrades appear) create builds and stories; random *outcomes* (crit fails on the plan you executed) create rage. Roguelike drafting is the industry's best pattern — copy it shamelessly.

## Multiplayer-specific balance notes

- Symmetric games balance the *map/economy* (spawn distances, resource parity); asymmetric games balance *win rates across the roster* while keeping identities extreme — a 50% win rate achieved by making everyone similar is a failure.
- Counterpicks and rock-paper-scissors structures are load-bearing: intransitive relationships (A beats B beats C beats A) prevent solved metas without perfect numeric balance.
- Ban/pick systems, and rotating content are balance *valves* — cheaper than perfect tuning.
- Never balance PvE and PvP with shared numbers; split the stats the moment both exist.

## Smells & red flags

Everyone converges on one build within a week · a currency's balance only ever grows · players skip content because rewards lag its difficulty · the optimal strategy is the boring one (fun tax: optimizing = not-fun means design failure, not player failure) · you're afraid to touch a number because "everything depends on it" (missing diminishing returns / too many multiplicative couplings) · new content must powercreep to be adopted (reward structure only values vertical power — add orthogonal value: new verbs, new contexts, cosmetics, mastery).
