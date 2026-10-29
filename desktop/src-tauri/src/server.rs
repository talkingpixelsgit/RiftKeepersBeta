//! Which server the game is played on, and whether it is up. Kept free of Tauri so it can be
//! tested on its own.

use serde::{Deserialize, Serialize};
use tauri::Url;

/// Turns what a player typed into the server's origin. A bare name gets https; a bare IP
/// address or localhost gets http, because that is how RealmForge worlds and
/// `tools/serve.ps1` answer. The game only runs from the site root, so any path is dropped.
pub fn parse_server(input: &str) -> Result<Url, String> {
    let typed = input.trim();
    if typed.is_empty() {
        return Err("Type the server's address.".into());
    }
    let full = if typed.contains("://") {
        typed.to_string()
    } else {
        let host = typed.split(['/', ':']).next().unwrap_or("");
        let local = host == "localhost" || host.parse::<std::net::Ipv4Addr>().is_ok();
        format!("{}://{typed}", if local { "http" } else { "https" })
    };
    let bad = || "That doesn't look like a server address.".to_string();
    let url = Url::parse(&full).map_err(|_| bad())?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().map_or(true, str::is_empty)
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(bad());
    }
    Url::parse(&url.origin().ascii_serialization()).map_err(|_| bad())
}

/// The origin a page belongs to, for http(s) pages only.
pub fn origin_of(url: &Url) -> Option<String> {
    matches!(url.scheme(), "http" | "https").then(|| url.origin().ascii_serialization())
}

/// The app's own pages: tauri://localhost on Linux and macOS, http://tauri.localhost on Windows.
pub fn is_app_page(url: &Url) -> bool {
    url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost")
}

/// The game window may show the app's pages and the chosen server. Anything else (a link in
/// the news, a store page) opens in the player's browser instead.
pub fn stays_in_window(url: &Url, game_origin: Option<&str>) -> bool {
    if is_app_page(url) || url.as_str() == "about:blank" {
        return true;
    }
    matches!((origin_of(url), game_origin), (Some(o), Some(g)) if o == g)
}

/// status.json, written on the server every 20 s and served even while the game is down.
#[derive(Debug, Default, Deserialize)]
pub struct StatusReport {
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// launcher.json: the build on the server, the oldest client it accepts, and the news.
#[derive(Debug, Default, Deserialize)]
pub struct LauncherFeed {
    #[serde(default, rename = "serverVersion")]
    pub server_version: Option<String>,
    #[serde(default, rename = "minClient")]
    pub min_client: Option<String>,
    #[serde(default)]
    pub news: Vec<News>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct News {
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub tag: String,
}

/// What the start page shows for a server.
#[derive(Debug, Serialize)]
pub struct ServerInfo {
    pub origin: String,
    /// online, solo, closed, maintenance, down or unreachable.
    pub state: &'static str,
    pub title: String,
    pub message: String,
    pub ms: Option<u64>,
    pub build: Option<String>,
    pub min_client: Option<String>,
    pub needs_update: bool,
    pub news: Vec<News>,
}

/// What came back from the server's three status files.
pub struct Probe {
    /// HTTP status of /mmo/bulletin, or None when nothing answered.
    pub health: Option<u16>,
    pub ms: Option<u64>,
    /// True when status.json or launcher.json answered at all.
    pub reached: bool,
    pub report: Option<StatusReport>,
    /// From /launch-status: false while the team has closed player access.
    pub open: Option<bool>,
    /// A copy served on this computer (tools/serve.ps1), where the game allows solo play.
    pub local: bool,
    pub feed: Option<LauncherFeed>,
}

/// The same reading of the status files as the game's own sign-in screen (hallStatus in
/// play/index.html), plus the access switch and the client version check.
pub fn classify(origin: String, probe: Probe, app_version: &str) -> ServerInfo {
    let s = |t: &str| t.to_string();
    let reached = probe.reached || probe.health.is_some();
    let (state, title, message) = if probe.health == Some(200) && probe.open == Some(false) {
        ("closed", s("Player access is closed"), s("The team has closed the Hall to players for now. Check the news, or try again later."))
    } else if probe.health == Some(200) {
        ("online", s("Online"), s("The Hall is open."))
    } else if probe.local && reached {
        ("solo", s("Solo play only"), s("This copy runs on your computer with no game server behind it, so online features stay off."))
    } else if !reached {
        ("unreachable", s("Can't reach this server"), s("Nothing at this address is answering. Check the address and your connection, or the server may be off."))
    } else {
        match probe.report.as_ref().filter(|r| !r.state.is_empty() && r.state != "online") {
            Some(r) => (
                if r.state == "maintenance" { "maintenance" } else { "down" },
                r.title.clone().unwrap_or_else(|| s("The Hall is down")),
                r.message.clone().unwrap_or_else(|| s("The game server reports a problem. Try again in a few minutes.")),
            ),
            None => ("down", s("The game server isn't answering"), s("The website is up, but the game server behind it isn't responding. It's most likely restarting.")),
        }
    };
    let feed = probe.feed.unwrap_or_default();
    let needs_update = match (feed.min_client.as_deref(), semver::Version::parse(app_version)) {
        (Some(min), Ok(have)) => semver::Version::parse(min.trim_start_matches('v')).is_ok_and(|min| have < min),
        _ => false,
    };
    ServerInfo {
        origin,
        state,
        title,
        message,
        ms: probe.ms.filter(|_| state == "online"),
        build: feed.server_version,
        min_client: feed.min_client,
        needs_update,
        news: feed.news.into_iter().take(6).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LIVE: &str = "https://playtk.talkingpixels.games";

    fn origin(input: &str) -> String {
        parse_server(input).unwrap().as_str().trim_end_matches('/').to_string()
    }

    #[test]
    fn addresses() {
        assert_eq!(origin("playtk.talkingpixels.games"), LIVE);
        assert_eq!(origin(" https://playtk.talkingpixels.games/play "), LIVE);
        assert_eq!(origin("203.0.113.7:7801"), "http://203.0.113.7:7801");
        assert_eq!(origin("localhost:8080/play"), "http://localhost:8080");
        assert_eq!(origin("http://rift.example.com:7802/"), "http://rift.example.com:7802");
        assert!(parse_server("").is_err());
        assert!(parse_server("file:///C:/game").is_err());
        assert!(parse_server("javascript:alert(1)").is_err());
        assert!(parse_server("https://user:pw@example.com").is_err());
    }

    #[test]
    fn navigation() {
        let live = Some(LIVE);
        let u = |s: &str| Url::parse(s).unwrap();
        assert!(stays_in_window(&u("http://tauri.localhost/index.html"), live));
        assert!(stays_in_window(&u("tauri://localhost/index.html"), None));
        assert!(stays_in_window(&u("https://playtk.talkingpixels.games/play"), live));
        assert!(stays_in_window(&u("https://playtk.talkingpixels.games/"), live));
        assert!(!stays_in_window(&u("https://playtk.talkingpixels.games/play"), None));
        assert!(!stays_in_window(&u("http://playtk.talkingpixels.games/play"), live));
        assert!(!stays_in_window(&u("https://talkingpixels.games/"), live));
    }

    fn probe(health: Option<u16>) -> Probe {
        Probe { health, ms: Some(40), reached: health.is_some(), report: None, open: None, local: false, feed: None }
    }

    #[test]
    fn states() {
        let o = || LIVE.to_string();
        assert_eq!(classify(o(), probe(Some(200)), "0.3.0").state, "online");
        assert_eq!(classify(o(), probe(None), "0.3.0").state, "unreachable");
        assert_eq!(classify(o(), probe(Some(502)), "0.3.0").state, "down");
        let serve = Probe { local: true, ..probe(Some(404)) };
        assert_eq!(classify("http://localhost:8080".into(), serve, "0.3.0").state, "solo");
        let closed = Probe { open: Some(false), ..probe(Some(200)) };
        assert_eq!(classify(o(), closed, "0.3.0").state, "closed");
        let report = StatusReport { state: "maintenance".into(), title: Some("Back at 6".into()), message: None };
        let maint = Probe { report: Some(report), ..probe(Some(502)) };
        let info = classify(o(), maint, "0.3.0");
        assert_eq!((info.state, info.title.as_str(), info.ms), ("maintenance", "Back at 6", None));
    }

    #[test]
    fn client_version() {
        let with_min = |min: &str| Probe {
            feed: Some(LauncherFeed { min_client: Some(min.into()), ..Default::default() }),
            ..probe(Some(200))
        };
        assert!(!classify(LIVE.into(), with_min("0.1.1"), "0.3.0").needs_update);
        assert!(classify(LIVE.into(), with_min("0.4.0"), "0.3.0").needs_update);
        assert!(!classify(LIVE.into(), with_min("soon"), "0.3.0").needs_update);
    }
}
