# Transforms & Rendering — Space, Sprites, Meshes, Cameras

## Transform doctrine

- `Transform` = local (relative to parent); `GlobalTransform` = world, **computed by the engine in PostUpdate**. You write `Transform`, you read `GlobalTransform` — writing Global does nothing lasting; reading local as if it were world breaks the moment hierarchy appears.
- Same-frame staleness: a system moving a parent and another reading the child's `GlobalTransform` in the same Update sees *last frame's* propagation. Where exactness matters same-frame, compute manually (`parent_global * child_local`) or order after propagation.
- Hierarchy via relationships: `commands.entity(child).insert(ChildOf(parent))` (or spawn with `children![…]` / `with_children`). Children inherit transform and (by default) despawn with the parent — ownership design per events-observers.md.
- Y-up, right-handed, Z toward the camera in 3D; in 2D, Z is draw order (higher = in front) and the camera looks down -Z at the XY plane. Rotations are quaternions (`Quat`) — compose with multiplication, build from `Quat::from_rotation_z(angle)`; Euler storage invites gimbal bugs (threejs rune sings the same song).
- Units: pick meters-ish for 3D/physics (Avian expects sane scales — gameplay-patterns.md); 2D commonly uses pixels-as-units with an orthographic camera — fine, just be consistent and scale physics config accordingly.

## Cameras

```rust
// 2D
commands.spawn((Camera2d, Transform::from_xyz(0.0, 0.0, 0.0)));
// 3D
commands.spawn((Camera3d::default(), Transform::from_xyz(0., 6., 12.).looking_at(Vec3::ZERO, Vec3::Y)));
```

- Camera follow lives in `Update` (presentation!), smoothed frame-rate-independently: `pos.lerp(target, 1.0 - (-k * dt).exp())` — the same exponential damping doctrine as every other rune.
- Multiple cameras: `order` fields sequence them; `RenderLayers` split what each sees (minimap, UI-world split, first-person viewmodel). UI (bevy_ui) renders via its own camera association — one `Camera2d`/`Camera3d` marked as UI target when mixing.
- Pixel-art 2D: `ImagePlugin::default_nearest()` at plugin setup (app-architecture.md), integer-ish zoom via orthographic scaling, and snap *rendered* positions if you see shimmer — never snap the simulation (web-games doctrine, Bevy edition).
- Projections: `OrthographicProjection` scaling modes (`FixedVertical`, `WindowSize`) decide your virtual-resolution story — pick one deliberately so gameplay space doesn't change meaning per monitor.

## 2D: sprites & atlases

```rust
commands.spawn((
    Sprite { image: assets.load("hero.png"), ..default() },
    Transform::from_xyz(0., 0., 10.),                       // Z = layer
));

// atlas animation: TextureAtlasLayout (grid of frames) + an index you tick
Sprite { image, texture_atlas: Some(TextureAtlas { layout, index: 0 }), ..default() }
```

- Frame animation = a `Timer` + advancing `atlas.index` in a system, data-driven from an anim table (the web-games pattern in ECS clothes: animation state is a component, the render just shows the index).
- Sprite flipping (`flip_x`), color tint (`color` — also your hit-flash channel: set white/red, restore by timer), anchor points for feet-alignment.
- Layering: explicit Z constants module (`const Z_ENEMIES: f32 = 10.0;`) beats magic numbers scattered; y-sorting for top-down = a system setting `z = base - y * epsilon`.
- Text in world: `Text2d`; UI text is separate (input-ui.md).

## 3D: meshes, materials, lights

```rust
commands.spawn((
    Mesh3d(meshes.add(Sphere::new(0.5))),                     // Assets<Mesh> resource
    MeshMaterial3d(materials.add(StandardMaterial {
        base_color: Color::srgb(0.9, 0.3, 0.2),
        perceptual_roughness: 0.4,
        ..default()
    })),
    Transform::from_xyz(0., 1., 0.),
));
commands.spawn((DirectionalLight { shadows_enabled: true, illuminance: 10_000., ..default() },
                Transform::default().looking_to(Vec3::new(-1., -2., -0.5), Vec3::Y)));
```

- PBR mirrors the threejs rune's doctrine: `StandardMaterial` metalness/roughness, environment lighting (skybox/`EnvironmentMapLight`) is what makes materials read, tone mapping on the camera. Share `Handle<Mesh>`/`Handle<StandardMaterial>` across entities — clones of handles are cheap, duplicate assets are not.
- glTF is the format here too: `SceneRoot(assets.load("model.glb#Scene0"))` spawns the whole hierarchy; named nodes reachable for attachment points. Animations via `AnimationPlayer` on the loaded rig.
- Shadow budget discipline transfers: one shadow-casting directional light + ambient/environment fill; per-light cost is real on low-end.
- Custom shaders/materials exist (`AsBindGroup` materials in WGSL) — a deep-end door; for tints/flashes/dissolves check ecosystem shader crates before hand-rolling (troubleshooting-ecosystem.md map).

## Visibility & culling

`Visibility` (Inherited/Hidden/Visible) on entities — hide UI panels and holstered weapons instead of despawning when they'll return (despawn/respawn churn vs archetype move: hiding is cheaper and keeps state). `ViewVisibility` is the computed result; frustum culling is automatic for meshes/sprites with correct bounds. For "exists but sleeps" world streaming, prefer disabling *behavior* (remove marker / gate systems) over hiding — invisible-but-simulating entities are a classic perf leak (performance.md).

## Gizmos & debug drawing

```rust
fn debug_ranges(mut gizmos: Gizmos, q: Query<(&GlobalTransform, &AggroRadius)>) {
    for (gt, r) in &q { gizmos.circle_2d(gt.translation().truncate(), r.0, Color::srgb(1., 0.3, 0.3)); }
}
```

Immediate-mode, zero-setup, cfg-gate the systems into your `DevPlugins`. The first debugging tool to reach for on any spatial bug — hitboxes, paths, aggro ranges, velocities as rays. (The "show me what the game thinks the world is" doctrine from web-games' tilemap debugging, engine edition.) Pair with `bevy-inspector-egui` for live component editing — together they replace printf-debugging for 90% of gameplay work.
