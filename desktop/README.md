# Rift Keepers for Windows

A small desktop app (Tauri 2, about 10 MB installed) for playing Rift Keepers.

- **Start page:** pick a server, see whether it's up (the same reading as the game's own sign-in screen), the server's build and its news from `launcher.json`. The live playtest is always on the list; players can add others, such as a RealmForge world (`203.0.113.7:7801`) or a copy served by `tools/serve.ps1` (`localhost:8080`, solo play only).
- **Play:** loads `<server>/play` from that server in the same window, so the game is always the server's current build and cloud saves, chat and parties work as in the browser.
- **Desktop keys on the game page:** F11 toggles fullscreen (the game's own Fullscreen button does too), Ctrl+Shift+H goes back to the start page.
- **Safety:** the window only shows the app's pages and the chosen server. Other links open in the player's browser. Game pages get three window commands (fullscreen on/off, back to start) and nothing else.
- **Version check:** if `launcher.json`'s `minClient` is newer than this app, Play is off and the start page offers the website instead.

## Build

Needs Node 22 and Rust. On Windows:

```
cd desktop
npm ci
npx tauri build
```

The installer lands in `src-tauri/target/release/bundle/nsis/`. GitHub Actions builds it on every pull request that touches `desktop/` (workflow "Rift Keepers for Windows"); download it from the run's artifacts. Tag `desktop-vX.Y.Z` to build a release.

`npx tauri dev` runs it without installing. `cargo test --manifest-path src-tauri/Cargo.toml` runs the unit tests (address parsing, which pages stay in the window, server states, version check).

## Files

- `ui/`: the start page (plain HTML/CSS/JS, no build step). Fonts are Space Grotesk and Manrope (SIL OFL, licences next to them).
- `src-tauri/src/server.rs`: addresses, navigation rule, server states. `lib.rs`: the window and commands. `game-bridge.js`: the desktop keys on game pages.
- `src-tauri/installer/`: the installer's sidebar and header images (made from `art/bg/hall_battle.jpg` and the logo).
- To bump the version, change it in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`.
