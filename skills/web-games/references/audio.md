# Game Audio — WebAudio Without Tears

Audio is half of game feel (the game-design rune's blindfold test: sound alone should tell the story). The web adds three traps: the autoplay-unlock policy, decode/memory costs, and lifecycle (tab switches, iOS). Handle those three and the rest is creative work.

## The unlock (the #1 web-audio bug)

Browsers refuse audio until a user gesture. The canonical boot flow:

```ts
const ctx = new AudioContext();                       // may start "suspended"

// The "click to start" screen every web game needs anyway (fullscreen prompt, focus):
startButton.addEventListener("click", async () => {
  await ctx.resume();                                  // THE unlock — inside the gesture handler
  startGame();                                         // only start music after this
});

// Belt-and-suspenders: resume on any first input, and on tab return:
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ctx.state === "suspended") ctx.resume();
});
```

Symptoms of getting it wrong: silence + `The AudioContext was not allowed to start` warnings, or iOS-only silence (iOS is strictest — also check the physical mute switch expectation and route through the gesture *every* time). Libraries (Howler, Phaser sound) handle unlock — but only if you play the first sound after a gesture; design the boot screen regardless.

## Stack choice

- **Howler.js** — the pragmatic default: sprites, pooling-ish behavior, HTML5/WebAudio fallback, loop points, per-sound volume/rate. Use it unless you need graphs.
- **Raw WebAudio** — when you want the mixer: per-bus gain nodes, filters (underwater lowpass!), dynamic music layers, spatial panning. ~100 lines gets a real mixer (below).
- **Phaser sound** — fine inside Phaser; same concepts.

Formats: **OGG + M4A/AAC fallback** covers everything (Safari needs the M4A); never WAV in production (10x size); music ~96–128kbps, SFX can go lower. Load SFX as decoded buffers (instant playback); **stream long music** via a media element source (`new Audio` + `createMediaElementSource`) — decoding a 3-minute track into a buffer costs tens of MB of RAM (mobile killer).

## The mixer (raw WebAudio worth owning)

```ts
const master = ctx.createGain();  master.connect(ctx.destination);
const sfxBus = ctx.createGain();  sfxBus.connect(master);
const musicBus = ctx.createGain(); musicBus.connect(master);

function playSfx(buf: AudioBuffer, { vol = 1, rate = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * (0.92 + Math.random() * 0.16);  // ±8% pitch — kills repetition fatigue
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g).connect(sfxBus);
  src.start();
}                                                    // sources are one-shot & GC'd — cheap by design
```

- Volume settings = bus gains, persisted in the save (master/music/sfx sliders — table stakes).
- **Never set gain to 0/1 instantly for stops/pauses** — clicks. `gain.setTargetAtTime(0, ctx.currentTime, 0.02)` or linear ramps; same for music fades (1–2s crossfades between tracks).
- Pitch variation on repeated SFX (footsteps, hits, coins) is the cheapest audio-quality doubling available. Also: round-robin 2–4 recorded variants for the most-heard sounds.
- **Voice management**: cap instances per sound (~4–6) and per-frame triggers — 30 coins collected in one explosion = play 3 with rising pitch, not 30 (clipping + mush). A tiny "last played at" throttle per sound id suffices.
- Ducking: sidechain-lite — dialogue/big-moment plays → `musicBus.gain` ramps to 0.4 and back. One function, huge polish.

## Music: loops & layers

- **Seamless loops need loop points** (intro → loopable body): `src.loop = true; src.loopStart = 4.32; src.loopEnd = 36.48` on a buffer source — encode-safe formats (OGG) preserve timing; MP3 adds encoder gaps (avoid for loops).
- **Vertical layering** (the modern game-music pattern): stems (drums/bass/lead) started *simultaneously* on synchronized sources, mixed by gameplay — combat intensity = fade stems in/out. Start them all at once and only touch gains; starting stems late never re-syncs.
- Horizontal sequencing (calm→combat tracks): schedule the next track on the same `ctx.currentTime` timeline (`src.start(bar Boundary)`) — WebAudio's sample-accurate clock is the one part of the web that's *better* than native; use it instead of `setTimeout` for anything musical.
- Interactive stingers (level-up fanfare over music): quantize starts to the next beat/bar for musicality — `nextBarTime = musicStart + Math.ceil((now - musicStart) / barLen) * barLen`.

## Spatial & dynamic touches (cheap wins)

`StereoPannerNode` panned by `(x - cam.x) / (screenW/2)` clamped — instant spatial reads for off-screen shots · volume falloff by distance for big levels (linear is fine; nobody needs inverse-square in 2D) · lowpass filter on the master while paused (`BiquadFilterNode`, freq 800) = the "muffled pause" every polished game has, 5 lines · slow-mo moments: drop `playbackRate` of music slightly (0.9) with the timeScale (juice-implementation.md) — subtle, visceral.

## Lifecycle & performance

- Pause = suspend the whole context (`ctx.suspend()/resume()`) — perfect freeze incl. scheduled sounds, and saves battery; do it on `visibilitychange` (SKILL.md #3).
- Preload & decode SFX at boot (they're small); lazy-load per-world music. Decoded buffers live in RAM: budget ~10MB decoded on mobile — stream anything long (above).
- No allocations per play beyond the nodes themselves (they're designed disposable); don't pool buffer sources (they're one-shot by spec — pooling them is a classic wasted afternoon).
- Silence is a state to test: every sound failing to load must degrade to a *playable* game (missing-audio warnings in console, not crashes in `play`).
