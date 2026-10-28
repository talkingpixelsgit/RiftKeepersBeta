# Rift Keepers Beta

The rework of **Rift Keepers**, the Time Keepers prequel browser MMORPG by Talking Pixels Studios. It starts from the live closed-alpha client (Playtest Build 28, copied from `playtk.talkingpixels.games` on 22 October 2026).

## Run it locally
```
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```
Open `http://localhost:8080/play` with no trailing slash. On localhost, solo play works without the game server. Online features (party, guild, arena, trading, chat delivery) need the `/mmo` and `/account` server.

## Layout
- `play/index.html`: the core client (data, state, rendering, combat, online code).
- `preview/`: feature modules and their styles, loaded in order at the end of `play/index.html`.
- `rift-ui/`, `rift-play/`: shared UI and play styles, visuals.
- `art/`: backgrounds, portraits, poses, souls, icons, sound effects (`art/art.json`, `art/souls.json`).
- `vendor/nakama-js.js`: Nakama client (only used when `server.json` names a host).
- `docs/`: briefs, logs and roadmaps.

## Who works on what
- Visual and interface design: see `docs/DESIGN-BRIEF-GPT.md` (branch `design/m1-interface`).
- Systems and game logic: see `docs/SYSTEMS-ROADMAP.md`.

**Private.** Don't make this repository public.
