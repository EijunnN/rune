# Assets & Scenes — Handles, Loading States, Content

## The handle model (asynchrony made visible)

```rust
#[derive(Resource)]
struct GameAssets {                       // ONE registry resource per asset domain
    hero: Handle<Image>,
    boom: Handle<AudioSource>,
    level: Handle<Scene>,
}

fn preload(mut commands: Commands, assets: Res<AssetServer>) {
    commands.insert_resource(GameAssets {
        hero: assets.load("sprites/hero.png"),
        boom: assets.load("audio/boom.ogg"),
        level: assets.load("levels/one.glb#Scene0"),
    });
}
```

- `load()` returns instantly with a `Handle<T>` — a typed claim ticket; the bytes arrive later on the async task pool. Handles are cheap clones (ids); the `Assets<T>` resource stores the real data (`assets.get(&handle)` → `Option<&T>` — the Option is the honesty).
- **The registry-resource pattern** beats scattered `asset_server.load` calls at use sites: one place declares content, systems depend on `Res<GameAssets>`, and typos fail at boot instead of mid-run. Paths are relative to `assets/` by default.
- Labeled sub-assets: `"model.glb#Scene0"`, `"model.glb#Animation1"`, `"atlas.png"` + a separately-built `TextureAtlasLayout` — one file, many handles.
- Dropping all handles unloads the asset (reference counting): keep the registry alive for the asset's lifetime, or clone handles onto a keepalive resource per level and drop it on exit for streaming behavior.

## Loading states (never gate gameplay on hope)

The doctrine (SKILL.md #12): a `Loading` state that watches readiness, then transitions:

```rust
fn check_ready(
    assets: Res<AssetServer>,
    game_assets: Res<GameAssets>,
    mut next: ResMut<NextState<GameState>>,
) {
    use bevy::asset::LoadState;
    let all = [game_assets.hero.id().untyped(), game_assets.boom.id().untyped()];
    if all.iter().all(|id| matches!(assets.get_load_state(*id), Some(LoadState::Loaded))) {
        next.set(GameState::Menu);
    }
}
```

- In practice, use **`bevy_asset_loader`** (the ecosystem standard): declare an `AssetCollection` derive, bind it to a loading state, get typed resources injected when ready + progress tracking for the bar. It turns the above into attributes; hand-roll only to understand it once.
- Failure path: `LoadState::Failed` → log the path loudly and show something (magenta placeholder doctrine) — a silently missing asset is hours of "why is it invisible".
- `AssetEvent<T>` (Created/Modified/Removed) for reacting to loads/hot-reloads — e.g. rebuilding atlas layouts when the image lands.

## Hot reload & the dev loop

File-watching hot reload (enabled via the asset plugin's watch feature / `--features bevy/file_watcher` in dev) makes art/audio/scene iteration instant — pair with `bevy-inspector-egui` and your gizmos DevPlugin for the live-tuning triad. Content tuning via redeploy is tuning that doesn't happen (the universal doctrine). Rust code changes still recompile — that's what dynamic_linking is for (performance.md).

## Custom assets (your own file formats)

```rust
#[derive(Asset, TypePath, serde::Deserialize)]
struct EnemySpec { health: f32, speed: f32, sprite: String }

// implement AssetLoader (extension "enemy.ron", async read + ron::de) and register:
app.init_asset::<EnemySpec>().init_asset_loader::<EnemySpecLoader>();
```

Data-driven design in Bevy = game content as RON/JSON assets with custom loaders: enemy stats, waves, dialogue, loot tables editable without recompiling, hot-reloadable in dev. The pipeline: spec asset → spawn function reads spec → entities. This is the tilemaps-worlds "editor owns layout, code owns behavior" doctrine generalized — and the antidote to constants scattered through systems.

## Scenes — spawning content (version-sensitive!)

- **glTF scenes** (3D): `SceneRoot(handle)` spawns the file's hierarchy as entities; traverse by `Name` to attach gameplay components post-spawn (an observer on `SceneInstanceReady` is the clean hook).
- **Bevy scenes**: the area most in flux — **0.19 introduced BSN** (Bevy Scene Notation), the reworked composable scene system replacing the old DynamicScene-centric workflow as the intended authoring path. Doctrine that holds across the shift: scenes declare *entities + components* (data), spawn functions/observers add runtime behavior; check your version's scene docs before committing to an authoring workflow, and prefer code-driven spawning + custom assets (above) when in doubt — it's version-proof and debuggable.
- For 2D levels, the LDtk pipeline lives in ecosystem crates (`bevy_ecs_ldtk`) — the web-games tilemap doctrine (editor as source of truth, entities as spawn points with fields) maps 1:1.

## Embedded & release assets

- `embedded_asset!`/include-bytes patterns compile small critical assets into the binary (jam-friendly, no folder to ship); the `assets/` folder ships beside the executable otherwise — CI zips must include it (the #1 "works locally, black screen in itch upload" cause, alongside WASM paths — troubleshooting-ecosystem.md).
- Asset processing (Bevy's processor: compressed textures, meta files) is maturing per release — for shipping-size discipline the web-games budget doctrine applies: compressed audio (OGG), texture sizes honest to display size, and measure the final bundle.
