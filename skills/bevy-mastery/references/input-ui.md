# Input & UI — Intents In, Interface Out

## Input doctrine: devices → intents → gameplay

The same three-layer separation as every stack (web-games input.md): systems in `Update` sample devices into **intent components/resources**; `FixedUpdate` gameplay consumes intents. Gameplay never reads keycodes.

```rust
#[derive(Component, Default)]
struct MoveIntent { dir: Vec2, jump: bool, jump_buffered_at: Option<f32> }

fn sample_input(
    keys: Res<ButtonInput<KeyCode>>,
    pads: Query<&Gamepad>,
    mut q: Query<&mut MoveIntent, With<Player>>,
    time: Res<Time>,
) {
    let Ok(mut intent) = q.single_mut() else { return };
    let mut dir = Vec2::ZERO;
    if keys.pressed(KeyCode::KeyA) { dir.x -= 1.0; }          // KeyCode = physical position
    if keys.pressed(KeyCode::KeyD) { dir.x += 1.0; }
    if let Ok(pad) = pads.single() {
        let stick = Vec2::new(pad.get(GamepadAxis::LeftStickX).unwrap_or(0.),
                              pad.get(GamepadAxis::LeftStickY).unwrap_or(0.));
        if stick.length() > 0.2 { dir = stick; }               // radial deadzone, last-device-wins
    }
    intent.dir = dir.clamp_length_max(1.0);
    if keys.just_pressed(KeyCode::Space) { intent.jump_buffered_at = Some(time.elapsed_secs()); }
}
```

- `ButtonInput<T>`: `pressed` (held) / `just_pressed` / `just_released` — edge methods are per-frame, so **sampling once in Update and buffering into intents** is what makes them safe to consume from FixedUpdate (which may run 0 or 2+ times per frame — reading `just_pressed` there drops or doubles inputs; the cross-clock bug this architecture exists to kill).
- The forgiveness layer (buffer ~100ms, coyote ~90ms) lives in gameplay against the intent timestamps — identical doctrine and constants as web-games, ECS shapes. (Clock nit: `Time` in Update is the virtual clock; in FixedUpdate, the fixed clock, which lags it by up to one tick. For ~100ms windows the skew is harmless — just don't use these timestamps for frame-exact comparisons across the two schedules.)
- Mouse: `Res<ButtonInput<MouseButton>>`, cursor via window query + `Camera::viewport_to_world` (2D: `viewport_to_world_2d`) — the world-space conversion goes through the camera, always.
- **leafwing-input-manager** is the ecosystem action-mapping standard (Actionlike enum, per-player maps, rebinding, chords) — adopt it the moment you have >1 device or rebinding on the roadmap; it *is* the action-map layer, maintained.
- Window/system events (`bevy::window::WindowFocused`, close-requested) — pause on focus loss per the universal lifecycle doctrine.

## bevy_ui — flexbox in ECS

```rust
commands.spawn((
    Node {                                     // layout component (Taffy/flexbox under the hood)
        width: Val::Percent(100.), height: Val::Percent(100.),
        justify_content: JustifyContent::Center, align_items: AlignItems::Center,
        ..default()
    },
    StateScoped(GameState::Menu),              // UI trees are state-scoped, always
)).with_children(|root| {
    root.spawn((Button, Node { padding: UiRect::all(Val::Px(12.)), ..default() },
                BackgroundColor(NORMAL)))
        .with_children(|b| { b.spawn(Text::new("Play")); });
});

fn buttons(mut q: Query<(&Interaction, &mut BackgroundColor), (Changed<Interaction>, With<Button>)>,
           mut next: ResMut<NextState<GameState>>) {
    for (i, mut bg) in &mut q {
        match i {
            Interaction::Pressed => next.set(GameState::Playing),
            Interaction::Hovered => *bg = HOVER.into(),
            Interaction::None => *bg = NORMAL.into(),
        }
    }
}
```

- It's flexbox (plus CSS grid): `Node` fields mirror web layout vocabulary — the frontend instincts transfer. `Val::Px/Percent/Vw/Vh/Auto`.
- `Interaction` + `Changed<Interaction>` is the entire button pattern. Focus/keyboard-nav and widget richness are still maturing in core — menus needing gamepad navigation either hand-roll a focus index (a resource + highlight system; fine for game menus) or use ecosystem UI crates.
- **HUD sync via change detection**: `Query<&Health, Changed<Health>>` → update the bar's `Node.width` / `Text` — O(changed), the events-observers.md doctrine applied to UI. Never rebuild UI trees per frame.
- Text: `Text::new(...)` + `TextFont`/`TextColor` components; dynamic values via marker components on the text entity (`ScoreText`) targeted by sync systems.
- Screen-space lives in bevy_ui; world-space labels (damage numbers, nameplates) are `Text2d`/sprites in world coordinates (transforms-rendering.md) — mixing the two spaces through one system is the classic misalignment source.
- UI ownership: each state's UI spawns `OnEnter` + `StateScoped` — no manual teardown, no orphan menus (SKILL.md #9).

## egui — the dev/tools answer

`bevy_egui` (immediate-mode) for debug panels, editors, and tooling: sliders bound to your tuning resources = the live juice/feel panel doctrine (web-games) in ten lines. It's the right tool for *developer* UI; bevy_ui for *player* UI — different audiences, different tools, don't ship egui panels to players out of momentum.

## Feel constants live in a resource

```rust
#[derive(Resource)]
struct Tuning { move_speed: f32, jump_v: f32, coyote: f32, buffer: f32 }
```

One tunable resource (serialized from a RON asset for hot reload — assets-scenes.md custom assets) + an egui dev panel editing it live. Feel iteration at runtime, values persisted to the asset when happy. Every rune with a game loop says the same sentence: tuning via recompile is tuning that doesn't happen — in Rust the recompile is pricier, so this pattern pays double.
