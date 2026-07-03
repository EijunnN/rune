# Playtesting & Scope — Reality Contact Protocol

Design documents are hypotheses; playtests are experiments; shipped scope is what survived. The two disciplines in this file — testing honestly and cutting ruthlessly — are the difference between finished games and ambitious folders.

## Prototyping (cheapest truth first)

- **Prototype the riskiest assumption, not the whole game**: if the game lives on "is deceiving other players fun?", test that with index cards before writing netcode. Paper, spreadsheets, and single hand-made levels answer design questions at 1% of the cost.
- Grey-box always: placeholder art keeps feedback on mechanics (pretty prototypes get compliments; ugly ones get truth). Exception: prototype *feel* with real juice on one interaction (game-feel.md) because feel IS mechanics.
- Timebox: a loop prototype earns more development in days or it doesn't (the 30-minute test, core-loop.md). Three cheap dead prototypes beat one expensive zombie.

## The playtest protocol (silent observation is sacred)

1. **Say nothing.** No context beyond what the shipped game would give. Every word you say is a patch the build doesn't have.
2. **Watch behavior, take timestamps**: where they stall >60s, what they never use, what they try that doesn't work (reveals expected affordances), where they die, where they smile, where they check their phone (the honest boredom metric).
3. **Never help until the test is over.** The moment you explain, that tester is spent for that section. If they're hard-stuck: note it (that's your finding!), then move them past it and keep watching.
4. **Ask about feelings, not fixes**: "what was going through your head there?" > "was the boss too hard?". Players are unimpeachable about how they felt and unreliable about why, and their proposed solutions are usually wrong while the *problem behind them* is usually real (the classic: "buff my class" means "I feel weak" means maybe "feedback under-sells my damage" — a game-feel fix, not a number).
5. **Fresh testers are a scarce resource**: first impressions happen once per human. Spend newcomers on onboarding tests; reuse veterans for balance/depth. Teammates are the least valid testers (they know too much) — good for feel iteration, useless for clarity.
6. Sample sizes: 5 observed testers surface ~80% of usability-class problems; balance and economy need dozens+ and telemetry. Match the tool to the question.

## Telemetry (when the game can phone home)

Minimum viable analytics: funnel (install → finished tutorial → session 2 → …), death heatmaps/causes, session length distribution, feature usage rates, where sessions *end* (the last thing before quit is your suspect list). Read it as hypothesis fuel, then confirm with observation — data says *where*, watching says *why*. Anti-pattern: designing to maximize a metric (session length) instead of diagnosing with it; that road ends in dark patterns and a game you're not proud of.

## Iteration discipline

- Change **one variable per test round** when diagnosing (else you learn nothing), but ship *bundles* of vetted changes to players (constant tiny churn exhausts communities).
- Keep a design journal: hypothesis → change → observed result. Memory lies about why numbers are what they are, and new team members inherit the reasoning, not just the values.
- **Two-strike rule** (SKILL.md #15): a mechanic that fails two playtests after a genuine redesign gets cut. Write the funeral in the journal and move on — the version of you that pitched it is not the version that must carry it.

## Scope — the design skill nobody teaches

The finished-game equation: *scope small enough to polish everything that touches the player*. Practical doctrine:

- **Core loop complete and juicy before any meta.** A vertical slice (one level of final quality) beats a horizontal spread (all systems at 40%) for every purpose: fun verification, pitching, morale, and knowing your true cost-per-content.
- **Content costs multiply; systems that recombine divide.** Before scoping "40 levels", check the twist math (mechanics-depth.md): 5 mechanics recombining well *generate* 40 levels' worth of situations; 40 handcrafted set pieces are 40 bills.
- The **cut order** when reality arrives (it arrives): breadth of content → optional systems → polish on rare paths — never the core verb's feel, never onboarding, never retry speed. Players remember depth and feel; nobody misses the third biome they never knew about.
- **A game jam is a scope masterclass**: one verb, one twist, one juice pass, one difficulty ramp, in 48h. If you can't scope a jam, the year-long project has no chance. (Jam-tested loops are also the best seeds for full games — the industry's open secret.)
- Feature creep firewall: every mid-production idea goes to a "version 2 list", not the build. The list is where good ideas wait to learn whether they were in-scope; most discover they were enthusiasm, not necessity.

## Knowing when it's done

Done = the intended player has the intended experience without you in the room, and the rough edges left are ones you *chose*. The last 10% (menus, options, difficulty select, save robustness, that one janky animation everyone sees) is invisible when present and defining when absent — schedule it as real work, not residue. Ship it; a released 7/10 teaches you more than a private 9/10 ever will, and the sequel inherits everything.
