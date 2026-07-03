# Input — State, Actions, Forgiveness

Input is where "feels tight" is engineered. Three layers, strictly ordered: **devices → action state → gameplay**. Gameplay never reads `event.code` — it reads `actions.jumpPressed`. That indirection is what makes rebinding, gamepad support, touch controls, and replays all trivial instead of rewrites.

## Layer 1: device capture (events fill state; the loop reads it)

```ts
const keys = new Set<string>();
addEventListener("keydown", (e) => {
  if (e.repeat) return;                      // OS key-repeat is not gameplay input
  keys.add(e.code);                          // e.code = physical key, layout-independent
  if (GAME_KEYS.has(e.code)) e.preventDefault();  // stop space-scrolling the page — only for game keys
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());     // alt-tab: else the hero runs forever
```

- `e.code` (`"KeyW"`, physical) for movement — WASD works on AZERTY; `e.key` only for typed text.
- Don't `preventDefault` everything: you'll break F5, F12, and accessibility. Whitelist your game keys.
- Pointer: `pointerdown/move/up` (unifies mouse+touch+pen), coordinates converted to world space through the camera inverse (canvas-rendering.md), `setPointerCapture` for drags.

## Layer 2: the action map (the load-bearing abstraction)

```ts
const BINDINGS: Record<Action, string[]> = {
  jump:  ["Space", "KeyZ", "pad:0"],         // multiple bindings per action, pad buttons included
  left:  ["ArrowLeft", "KeyA", "pad:axis0-"],
  fire:  ["KeyX", "pad:2"],
};

// sampled ONCE per fixed step (architecture.md order: input first):
interface ActionState {
  held: Set<Action>;
  pressed: Set<Action>;                       // edge: down this step, not last — computed by diffing
  released: Set<Action>;
}
```

- **Edges are computed in the sample step** (diff current vs previous held), not via `keydown` handlers — event-time "justPressed" flags get double-consumed or missed across fixed steps (the Phaser `justDown` bug generalizes: sample once, read everywhere).
- Rebinding UI = editing `BINDINGS` + persisting to the save (shipping.md). This is 30 minutes of work with the layer, a rewrite without it.
- Replays/demos/tests: record the ActionState stream per step; playback = feeding it back in. Determinism (non-negotiable #11) makes this exact.

## Gamepad (the polling API)

```ts
// No events for sticks/buttons — poll in the sample step:
const pad = navigator.getGamepads()[0];
if (pad) {
  const x = Math.abs(pad.axes[0]) > DEADZONE ? pad.axes[0] : 0;   // radial deadzone better: |v| on the vector
  const jump = pad.buttons[0].pressed;
}
```

- Deadzone ~0.15–0.25, **radial** (on the stick vector's magnitude, then rescale so the edge of deadzone = 0, full tilt = 1 — without rescaling, low-speed control is lost).
- `gamepadconnected` event to detect presence; show the right glyphs (Xbox/PS/generic via `pad.id` sniff) and switch prompt icons to the **last used device** — the polish players notice.
- Standard mapping (`pad.mapping === "standard"`): 0=A/Cross, 1=B/Circle, 9=Start, axes 0/1 left stick. Non-standard pads exist; a rebind screen absolves you.
- Analog-to-action: movement stays analog end-to-end when the game supports it (walk/run); digital actions threshold at ~0.5 with hysteresis (press at 0.6, release at 0.4) to stop edge flicker.

## Touch (design problem first, tech second)

- Best mobile-web controls are **not** virtual joysticks: tap/hold/swipe zones native to the mechanic (tap = jump, hold = charge, left/right halves = steer) beat a fake DualShock. Redesign controls for touch; port the *game*, not the keyboard.
- If a stick is unavoidable: **floating** (spawns where the thumb lands), radial deadzone, fat visuals ≥ 96px, and never under a hand that also needs to see.
- Multi-touch: track by `pointerId` in a Map — two-thumb play sends interleaved events; `touch-action: none` on the canvas kills browser gesture stealing (pull-to-refresh mid-game).
- Show touch UI only when touched: detect via first `pointerType === "touch"`, not user-agent.

## Layer 3: forgiveness (implemented, not aspirational)

The game-design rune's feel doctrine, as timers in the sample/update steps:

```ts
// Input buffer: remember presses briefly; consume when valid
if (actions.pressed.has("jump")) jumpBufferT = 0.1;          // seconds
jumpBufferT -= dt;

// Coyote time: grounded grace after leaving a ledge
coyoteT = grounded ? 0.09 : coyoteT - dt;

if (jumpBufferT > 0 && coyoteT > 0) {                        // the actual jump check
  jumpBufferT = 0; coyoteT = 0;
  vy = -JUMP_V;
}
// + variable jump: on release while rising, vy *= 0.45 (jump cut)
```

Same pattern serves attack queuing (buffer next swing during current), dash chaining, and menu navigation repeat (initial delay 300ms, repeat 100ms — hand-rolled, since key-repeat was filtered at layer 1).

## Menus & pause (input modes)

Input routing follows game state (architecture.md scenes): `Play` consumes gameplay actions, `Pause` consumes UI actions — a mode switch, not `if (paused)` sprinkled through handlers. Standard bindings both modes: Esc/Start toggles pause (and `blur` auto-pauses, non-negotiable #3); menu accepts arrows/WASD/stick + confirm/cancel; mouse hover and keyboard focus coexist (last-used-device rule again).

## Testing input

The action layer makes it mechanical: unit-test forgiveness logic by scripting ActionState sequences against the fixed step ("press jump 80ms after walking off ledge → jumps; 120ms → doesn't"). Feel constants (buffer/coyote windows, deadzones) live in one tunable config object — playtest with a debug panel (query-param gated) exposing them live; feel tuning via redeploy is feel tuning that doesn't happen.
