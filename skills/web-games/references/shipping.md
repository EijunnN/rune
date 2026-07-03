# Shipping — Saves, Lifecycle, Distribution

The last 10% that separates "a build" from "a game people play": progress that never vanishes, a tab lifecycle handled honestly, and distribution to where players actually are.

## Save systems

```ts
const SAVE_KEY = "mygame:save";
const SAVE_VERSION = 3;

interface SaveV3 { version: 3; settings: Settings; progress: Progress; stats: Stats }

function save(state: GameState) {
  const data: SaveV3 = { version: SAVE_VERSION, ...pickSaveFields(state) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch { /* quota/private mode: keep playing, surface a subtle warning — never crash on save */ }
}

function load(): SaveV3 | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));          // version switch: v1→v2→v3 stepwise, each step tested
  } catch { return null; }                    // corrupt = fresh start, not a crash loop
}
```

- **Version + migrate from save one.** The save you ship in the jam becomes the save your update must read; an unversioned blob forces a wipe (players leave) or archaeology (you suffer). Each migration step is small and unit-tested (testing doctrine applies to saves more than anything — it's the one system whose failure is unforgivable, SKILL.md #12).
- **When to save**: on meaningful events (level clear, purchase, settings change) + `visibilitychange → hidden` (the only reliable "closing" signal on mobile web; `beforeunload` is unreliable and hurts bfcache). Autosave beats save-buttons on the web — tabs die without warning.
- **What to save**: progress and decisions, never runtime state dumps (entity positions mid-combat) unless mid-run saving is a feature — then design a checkpoint serialization explicitly (architecture.md's state-as-data makes both easy).
- localStorage: 5MB-ish, synchronous (fine for <100KB saves; don't write per-frame — debounce). Bigger (replays, user levels) → IndexedDB via `idb-keyval`. Never trust either as the *only* copy for a game people sink 50 hours into: offer export/import (download/paste a base64 blob) — cheap cloud-save substitute, and your support inbox will thank you.
- Cheating via localStorage editing: on a solo web game, irrelevant — don't spend complexity there. Competitive/leaderboards: the authority is the server, full stop (obfuscation is theater).

## Lifecycle & platform integration

- The **visibility trio** (SKILL.md #3, #13): hidden → pause loop + suspend audio + save; visible → resume audio context, reset the frame clock, land on the pause menu (never instantly unpause into an ambush).
- **Fullscreen**: `canvas.requestFullscreen()` from a user gesture (same rule as audio); Esc exits (browser-owned); recompute canvas sizing on `fullscreenchange` like any resize.
- **Pointer lock** for mouse-aim games (`canvas.requestPointerLock()`), also gesture-gated; handle the Esc-exit event by pausing.
- Prevent the annihilators: `contextmenu` preventDefault on the canvas (right-click), `touch-action: none` (pull-to-refresh), key whitelist preventDefault (space/arrows scrolling — input.md), and warn-on-close (`beforeunload`) **only** during genuinely unsaved critical moments (roguelike mid-run) — otherwise never; it's hostile.
- Orientation (mobile): lock via manifest when packaged; on web, detect and show a friendly "rotate your device" overlay (CSS `@media (orientation)`) rather than a broken layout.

## Distribution targets (web games have four)

**itch.io** — the indie home. ZIP with `index.html` at root, all paths *relative* (the #1 upload failure: absolute `/assets/...` breaks in their iframe — set your bundler `base: "./"`). Enable SharedArrayBuffer toggle only if you need it; set viewport dimensions to your aspect; test *embedded*, not just the direct file link. Jam uploads: leave time for this step, every jam has casualties here.

**Web portals (Poki, CrazyGames, GameDistribution)** — real revenue for casual games. Their constraints are product requirements: aggressive load budgets (<3–5MB to interactive), their SDK for ads (rewarded/interstitial hooks you design around — natural break points, revive-for-ad), localization mattering (they're global), and QA on low-end Android. Integrate the SDK's `gameplayStart/Stop` + loading events early; retrofit is painful.

**PWA / self-hosted** — install prompt, offline via service worker (cache-first for assets, the game is a perfect offline candidate), your own domain, zero gatekeepers. Combine with itch for discovery + own-site for the real home.

**Steam/desktop via wrapper** — Electron (heavy, easy) or **Tauri** (light, Rust — pairs with rust-mastery). Steam expectations are a tier up: gamepad-first UI, achievements (Steamworks via the wrapper), cloud saves (write to the FS API instead of localStorage behind your save interface — the save module's one abstraction pays here), and real QA. Mobile stores via Capacitor follow the same shape. The doctrine: the *game* doesn't know its platform; a thin platform adapter (save backend, fullscreen, achievements, ads) does.

## Release hygiene

- A `?debug` build gate (debug panels, level select, invincibility — input.md/juice tuning panels) that's OFF in production but *shippable* (testers use production builds + the flag).
- Version visible in a corner of the menu (`v1.3.2` from package.json at build time) — bug reports without versions are riddles.
- Sentry-or-similar for runtime errors (games throw in the wild in ways devtools never showed; a week-one error feed is worth a month of QA), plus the minimal analytics funnel from game-design's playtesting.md if you'll act on it.
- Post-release cadence: the day-one patch is normal (players find everything in hours); batch fixes (design's iteration doctrine — constant tiny churn exhausts), and keep old save compatibility in every patch (the migrate chain grows; its tests keep you honest).
- Capture the launch: itch analytics + portal dashboards tell you funnel truth (loads → plays → session-2) — the same three numbers that decide whether the next game inherits this one's engine or its lessons.
