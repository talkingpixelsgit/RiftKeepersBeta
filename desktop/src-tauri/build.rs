fn main() {
    // Listing the commands makes each one need a permission, so the game page can be given
    // only the window commands (capabilities/default.json is the start page's list).
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "server_info",
            "play",
            "open_site",
            "toggle_fullscreen",
            "set_fullscreen",
            "go_home",
        ]),
    ))
    .expect("failed to run the Tauri build script");
}
