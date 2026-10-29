//! Rift Keepers for Windows: a start page that checks the chosen server and shows its news,
//! then the game itself, loaded from that server in the same window.

mod server;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use server::{classify, origin_of, parse_server, stays_in_window, LauncherFeed, Probe, ServerInfo, StatusReport};
use tauri::ipc::CapabilityBuilder;
use tauri::{AppHandle, Manager, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Lets the game page use F11 and its own Fullscreen button, and get back to the start page.
const GAME_BRIDGE: &str = include_str!("game-bridge.js");

#[derive(Default)]
struct Game {
    /// The server the window is allowed to show, once Play was pressed.
    origin: Mutex<Option<String>>,
    /// Servers whose pages were given the window commands this run.
    granted: Mutex<Vec<String>>,
    /// The start page's own address, to come back to.
    home: Mutex<Option<Url>>,
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main").ok_or_else(|| "The game window is gone.".to_string())
}

async fn fetch(client: &reqwest::Client, url: Url) -> Option<reqwest::Response> {
    client.get(url).header("Cache-Control", "no-store").send().await.ok()
}

async fn json<T: serde::de::DeserializeOwned>(res: Option<reqwest::Response>) -> (bool, Option<T>) {
    match res {
        Some(r) if r.status().is_success() => (true, r.json().await.ok()),
        Some(_) => (true, None),
        None => (false, None),
    }
}

/// Reads the server's status files from here rather than from the start page, which the
/// server's CORS rules would block.
#[tauri::command]
async fn server_info(app: AppHandle, server: String) -> Result<ServerInfo, String> {
    let base = parse_server(&server)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(7))
        .user_agent(format!("RiftKeepersDesktop/{}", app.package_info().version))
        .build()
        .map_err(|e| e.to_string())?;
    let at = |path: &str| base.join(path).expect("fixed path");
    let started = Instant::now();
    let health = async {
        // The game's own service answers here (the old Nakama /healthcheck is gone).
        let res = fetch(&client, at("mmo/bulletin")).await;
        (res.map(|r| r.status().as_u16()), started.elapsed().as_millis() as u64)
    };
    let ((health, ms), (got_report, report), (got_feed, feed), (_, access)) = tokio::join!(
        health,
        async { json::<StatusReport>(fetch(&client, at("status.json")).await).await },
        async { json::<LauncherFeed>(fetch(&client, at("launcher.json")).await).await },
        async { json::<serde_json::Value>(fetch(&client, at("launch-status")).await).await },
    );
    let probe = Probe {
        health,
        ms: Some(ms),
        reached: got_report || got_feed,
        report,
        open: access.and_then(|v| v.get("open").and_then(|o| o.as_bool())),
        local: matches!(base.host_str(), Some("localhost" | "127.0.0.1" | "[::1]")),
        feed,
    };
    let origin = origin_of(&base).unwrap_or_default();
    Ok(classify(origin, probe, &app.package_info().version.to_string()))
}

/// Gives pages from this server the window commands, and nothing else.
fn grant(app: &AppHandle, game: &Game, origin: &str) -> Result<(), String> {
    let mut granted = game.granted.lock().unwrap();
    if granted.iter().any(|g| g == origin) {
        return Ok(());
    }
    let capability = CapabilityBuilder::new(format!("game-page-{}", granted.len()))
        .remote(format!("{origin}/*"))
        .window("main")
        .permission("allow-toggle-fullscreen")
        .permission("allow-set-fullscreen")
        .permission("allow-go-home");
    app.add_capability(capability).map_err(|e| e.to_string())?;
    granted.push(origin.to_string());
    Ok(())
}

#[tauri::command]
fn play(app: AppHandle, game: State<'_, Game>, server: String) -> Result<(), String> {
    let base = parse_server(&server)?;
    let origin = origin_of(&base).ok_or("That doesn't look like a server address.")?;
    grant(&app, &game, &origin)?;
    *game.origin.lock().unwrap() = Some(origin);
    // "/play" with no trailing slash: the game's relative paths resolve from the site root.
    let target = base.join("play").map_err(|e| e.to_string())?;
    main_window(&app)?.navigate(target).map_err(|e| e.to_string())
}

/// Opens the server's website in the player's browser, where the downloads live.
#[tauri::command]
fn open_site(app: AppHandle, server: String) -> Result<(), String> {
    let base = parse_server(&server)?;
    app.opener().open_url(base.as_str(), None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fullscreen(app: AppHandle) -> Result<bool, String> {
    let window = main_window(&app)?;
    let on = !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(on).map_err(|e| e.to_string())?;
    Ok(on)
}

#[tauri::command]
fn set_fullscreen(app: AppHandle, on: bool) -> Result<(), String> {
    main_window(&app)?.set_fullscreen(on).map_err(|e| e.to_string())
}

#[tauri::command]
fn go_home(app: AppHandle, game: State<'_, Game>) -> Result<(), String> {
    let home = game.home.lock().unwrap().clone().ok_or("The start page is missing.")?;
    *game.origin.lock().unwrap() = None;
    let window = main_window(&app)?;
    let _ = window.set_fullscreen(false);
    window.navigate(home).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(Game::default())
        .invoke_handler(tauri::generate_handler![
            server_info,
            play,
            open_site,
            toggle_fullscreen,
            set_fullscreen,
            go_home
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Rift Keepers")
                .inner_size(1600.0, 1000.0)
                .min_inner_size(1024.0, 640.0)
                .center()
                .theme(Some(tauri::Theme::Dark))
                .background_color(tauri::window::Color(0, 0, 0, 255))
                .initialization_script(GAME_BRIDGE)
                .on_navigation(move |url| {
                    let game = handle.state::<Game>();
                    let origin = game.origin.lock().unwrap().clone();
                    if stays_in_window(url, origin.as_deref()) {
                        return true;
                    }
                    if matches!(url.scheme(), "http" | "https") {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    false
                })
                .build()?;
            *app.state::<Game>().home.lock().unwrap() = Some(window.url()?);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Rift Keepers could not start");
}
