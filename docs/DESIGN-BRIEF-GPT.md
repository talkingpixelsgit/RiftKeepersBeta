# Rift Keepers Beta: Interface & Design Brief (Milestone 1)

You are the **visual and interface designer** for Rift Keepers, a browser MMORPG/PBBG by Talking Pixels Studios. Another engineer (Claude) owns **systems and game logic**. Work autonomously: the owner is away. Make sound decisions yourself, keep a log, and leave the game working.

## 1. The goal

Milestone 1: **a less crowded interface and a better design overall.** Do not add game features.

The target feel is a calm, readable, persistent browser MMO with a city hub. Picture a game you keep open in a tab: a clear top bar, a handful of top-level sections, one focused main panel, and chat that stays out of the way until you want it. Use other persistent browser MMOs as genre references for that *feel*. Don't copy any other game's names, art, layout or text.

### Reference game: Isekai Guardians: Celestria
The owner's reference for the direction is **Isekai Guardians: Celestria**, a browser MMORPG/PBBG (Steam: https://store.steampowered.com/app/4171130/Isekai_Guardians/). Study it for **structure and feel only**. Its public pitch describes:
- **A persistent world** with long-term growth of one continuous character, mixing traditional MMORPG systems with a relaxed life-sim.
- **City hubs**: you travel between major cities, and each city works as a hub for its services.
- **Combat:** monsters, bosses, PvE and PvP, with character attributes (Power, Agility, Accuracy, Defense) shaping playstyle. Dungeons work solo or in parties of up to six.
- **Progression beyond combat:** fishing, farming, quests, crafting, collecting, and upgrading your house and gear.
- **Social and competitive play:** guilds (castle conquest events, group fishing raids), an arena with weekly-reset rankings, and a player marketplace.
- **Collection:** 100+ collectible companions, races, and hundreds of equipment pieces.
- **Energy:** an energy budget that refills over time, plus ways to restore it in-game (crafted potions, a daily tavern visit).
- **Monetization that isn't pay-to-win:** fully free to play; paid items are cosmetic or convenience.

Rift Keepers already has most of these in some form: stamina, fishing/foraging/mining/crafting, the market and trading, guilds, the arena and tournaments, the tavern, soul collecting and the codex, "My door" (a personal space), duels and PvP, and area/world chat. What it lacks is the **calm, organized hub presentation** that makes a game like this easy to live in. That's your job in this milestone. Take from the reference: one clear status bar (energy, gold, level, location), a few top-level sections, each town as a hub of service cards, and secondary panels (chat, online list) that stay quiet until needed.

**Don't copy** its names, cities, races, story, art, icons, UI layout or text. Everything on screen stays Rift Keepers' own (section 3 has the lore names).

The game is **free to play**. There is no subscription and no monetization code today. A cosmetic-only cash shop will come later; you may reserve a quiet place for it in the navigation, but don't design it. Note: "Patron" in the code (`preview/patron.js`, view `patron`) is **not** a subscription. It's a story quest at Honest Drew's ("The Guest Who Never Left"), so keep it reachable.

## 2. Repo and how to run it

- Repo: `C:\Talking Pixels\Talking Pixels Development\Games\Rift-Keepers-Live-Copy-2026-10-22\RiftKeepersBeta` (GitHub: `talkingpixelsgit/RiftKeepersBeta`).
- This is a copy of the live playtest (Build 28). The folder above it (`Rift-Keepers-Live-Copy-2026-10-22`) is a **read-only safety copy**. Never edit it.
- No build step, no Node, no bundler. Plain HTML/CSS/JS.
- Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080`
- Open **`http://localhost:8080/play`** with **no trailing slash**. Relative paths resolve from the site root, so `/play/` breaks.
- Locally there's no game server. Solo play works: on `localhost`, character creation keeps your name on the device (`LOCAL_DEV` in `play/index.html`). Online features (chat delivery, party, guild, arena opponents, trading, tournaments) show as disconnected. Design their screens and empty, offline and error states anyway.
- The beta **isn't connected to any server**. Connecting it to the game server (`playtk.talkingpixels.games`) is systems work, so do your design work locally: don't change `server.json` or the `/mmo` or `/account` URLs, and don't sign in there.
- To start over, clear site data for `localhost:8080` (localStorage and sessionStorage).
- Flow: title/character creation → the Island of Nowhere tutorial → Hall's Edge (the town hub) and the world map. Play through to the hub at least once.

### Browser and installed client: design for both
The same web client ships three ways, and your design has to work in all of them:
1. **Browser**: `/play` in Chrome, Edge, Safari or Firefox, on desktop and phone.
2. **Installed app (PWA)**: installed from the browser to the desktop or a phone home screen. `manifest.webmanifest` sets `display: standalone` and `start_url: /play`. It has **no browser chrome**: no back button or address bar. Every screen needs an in-app way back, and dialogs need a visible close. Respect the safe-area insets (notches, home indicator); `:root` already pads for `env(safe-area-inset-*)`. Test with Chrome/Edge "Install app", or check `@media (display-mode: standalone)` rules.
3. **Talking Pixels Game Launcher** (the desktop client, `C:\Talking Pixels\Pixel Launcher`, Tauri): it reads `launcher.json` for version and news and opens `playUrl` in a window.

   Desktop players often use a **gamepad**, so controller focus has to stay obvious on every screen.

Don't change `manifest.webmanifest` (`id`, `start_url`, `scope`), `sw.js` or the format of `launcher.json`. Installed apps and the launcher depend on them. You may change the manifest's `theme_color` and `background_color` to match the new palette.

Add both to the done checklist: the layout works in a standalone window at 1280×800 and 1600×1000 (the launcher's default window size), and at phone size in standalone mode.

### Asset library
- The studio's licensed asset library is at **`C:\Talking Pixels\Talking Pixels Development\Assets`**.
  - `2D\` holds zipped 2D packs: HUD_Sharp, tinyRPG_manaSoulGUI, alchemy/potion icon sets, fishing, tavern and inn props, food, pets and animals. `2D.zip` is an archive of the same folder.
  - `PS4 BUTTONS - Premium Assets.zip` has controller button glyphs.
- A second, larger library is **`D:\Assets.zip`** (5.2 GB, about 12,800 files). It's one archive, so extract only the folders you need. Useful parts:
  - `Assets/keepervariations/`: **Rift Keepers' own Keeper art**, including body styles, design originals D01–D20, weapons, concepts and a gallery. It has a top-level `README.txt` and `CONTENTS.json`. Read those first; the newest sets are the `030`/`031` folders. Use this for portraits and keeper visuals instead of inventing new keeper art.
  - `Assets/Input Prompts 1.5A/`: keyboard and mouse, touch, PlayStation, Xbox, Switch and Steam Deck button prompts, with a `License.txt`. Use it for controller and keyboard glyphs (`preview/pad-glyphs.*`, `controller-text.*`).
  - `MagicProjectilesVFX.zip`, `Free Dungeon Explorer.zip`, `Ultimate Animated Character Pack…zip`, `PS4 BUTTONS - Premium Assets.zip`, and `assets.zip` (1.3 GB, contents unknown). Check these, but use them only if they match the art direction.
  - Ignore `AI Text & Image to 3D Generator Pro/` (it's an application) and `keepervariations*.zip` (archives of the folder above).
  - Extract to a folder outside the repo, for example `D:\Assets-extracted\<pack>\`.
- **Don't extract packs inside the repo.** Unzip each one into its own new folder outside the repo, for example `C:\Talking Pixels\Talking Pixels Development\Assets\_extracted\<pack name>\`. Copy into the repo only the files the game actually uses.
- Before using a pack, read its license file. Copy that license next to the files you use (the same way `preview/assets/icons/LICENSE.txt` already does), and add a line per pack to `docs/CREDITS.md` (pack, author, license, which files). Skip any pack whose license is missing or forbids commercial use, and list it in your log.
- Prefer the library over drawing from scratch when a pack fits the game's style. Otherwise draw original SVGs. Never pull art from the web or from other games.

### Art inventory: pick the right size for each use
Measured from the files in this repo. **Never show an image larger than its native size** (it goes blurry). **Never use a small sprite where a character is the focus** (it looks like a thumbnail).

| Folder | Native size | What it is | Use it for |
|---|---|---|---|
| `art/poses/<id>.webp` (+ `_a1`–`_a3`, `_ult`, `_awakened_ult`) | **1536×1024** | Full-body character art with attack and ultimate frames. 31 characters: astergrave, axiom, beast, boltwarden, bram, brasswidow, cael, cinderpip, foxsonik, hingeling, inksnout, keeper, kilnfang, mossbell, nacresovereign, nullprior, orrix, palinode, reedkip, rowan, sable, saltlick, seren, soren, tibrs, velmora, vesper, veyra, voth, wrenna (a few are `.png`) | **Featured / selected character**, team cards, hero moments, "steps out of the door" |
| `art/portraits/<id>.webp` | 320–357×768 (tall) | Painted full-height portraits: voth, ruri, tibrs, beast, keeper_m1–m3, keeper_f1–f3 | Team cards, profile, character select |
| `preview/assets/voth-child/*.png` | 1638×1228 (+ 512×512 portrait) | Voth's large art and attack frames | Voth featured views |
| `preview/assets/keeper-idle-r2/composite-24.png` | 2304×2304 (24-frame sheet) | Keeper idle animation | Animated Keeper on Keeper and hub screens |
| `preview/assets/keeper-028/{world,battle}/…/composite.png` + `clip.json` | 2560×1600 sheets | Keeper walk, idle and battle clips (frame data in `clip.json`) | Keeper movement and battle |
| `preview/assets/keeper-tattered-r1/*.png` | 1536×1024 | Keeper per-weapon stances | Armoury, weapon previews |
| `art/souls/<id>.webp` | **256×256** | Small creature sprites (126 souls) | **List rows, codex grid, chips only.** Max about 128 px on screen. Not for featured views. |
| `art/bg/*_battle.jpg` | 1920×1080 | Painted area backdrops | Full-screen backgrounds for screens and battles |
| `art/bg/*.gif` | 832–1600 px | Animated area backdrops | Map cards, area headers, ambient backgrounds |
| `rift-play/areas/<id>.svg`, `<id>-scene.svg` | Vector | Area emblem and scene strip | Area icons, location chip, small banners |
| `rift-ui/icons/*.svg` | Vector | UI and element icons (47) | Nav, stats, buttons |
| `art/icons/i*.png` | 32×32 | Item icons | Bag and shop slots at 32 or 64 px (pixel-art scaling: `image-rendering: pixelated`) |
| `preview/assets/status/*.png` | 64×64 | Status effects | Battle and status chips |

Size rules of thumb:
- A featured character fills **at least 75% of its frame's height**, and may break out of the frame's top edge.
- A frame is never more than about 1.3× the size of what's inside it.
- Empty slots are clearly quieter and smaller than filled ones.

### Git workflow
1. The imported game is already committed on `main` ("Import live game (Playtest Build 28)").
2. Do all your work on a branch named `design/m1-interface`, created from `main` in this folder. Claude works on `systems/m1` in a separate worktree (`..\RiftKeepersBeta-systems`). Don't edit, check out or delete that worktree or branch. Commit in small, described steps.
3. **Don't push, merge into `main`, force-push or rewrite history.** The owner reviews first.
4. Never copy anything from `C:\Talking Pixels\Talking Pixels Development\Games\Rift-Keepers-Admin` into the repo. It holds server credentials. Don't open it.

## 3. How the client is built

- `play/index.html` (~7,300 lines) is the whole core game. Inline `<style>` and `<script>` blocks hold data tables, state, rendering, combat and online code.
- The shell is in the HTML body: `.app#app` is a 3-column grid (`230px | 1fr | 300px`):
  - `header.mobtop#mobtop` is the phone top bar.
  - `aside.side` holds the brand, `#tamerCard` (player card), `nav#nav` and `#syncState`.
  - `main#main` holds every screen.
  - `aside.social#social` holds Online now (`#online`), chat (`#chat`) and `form#chatForm` (`#chatScope`, `#chatIn`).
  - `nav.mobnav#mobnav` is the phone bottom nav, and `.chatfab` the phone chat button.
- `render()` switches on the global `view` and fills `#main` from `*HTML()` template-string functions (`mapHTML`, `teamHTML`, `keeperHTML`, `codexHTML`, `arenaHTML`, `marketHTML`, `bagHTML`, …), then calls `bind*()` to attach handlers. `go(v)` changes view. `renderNav()` builds the sidebar from `NAV` (around line 1892).
- Around 60 feature modules in `preview/*.js` load as plain scripts at the end of the file. Many wrap or replace core functions (for example `uiIcon = function(...)` in `preview/icons.js`) or inject their own nav entries and views (`navigation-hotfix.js`, `command-menu.js`, `build28-ui.js`, `guild.js`, `tavern.js`, `arena.js`, `workshop.js`, `world.js`, `patron.js`, …).
- About 45 stylesheets load in order (`rift-ui/`, `rift-play/`, `preview/*.css`), and **later files override earlier ones**. Years of hotfix layers sit on top of each other (`void-art-direction.css`, `void-ui-finish.css`, `build28-ui.css`, `navigation-hotfix.css`, `presentation-polish.css`, `small-screen-polish.css`, …). That stacking is a big part of why the UI feels inconsistent.
- Art lives in `art/` (backgrounds, portraits, poses, souls, icons, sfx) and is mapped in `art/art.json` and `art/souls.json`.
- Fonts: Alegreya Sans SC (display) and Alegreya Sans (body) from Google Fonts.
- Lore names to keep exactly: Rift Keepers, Time Keepers (prequel), the Hall of Worlds, Hall's Edge, the Island of Nowhere, the Riftscar, Glimmer Meadow, Emberwood, Sunken Shallows, Whispering Fen, Saltglass Flats, Bellfrey Cliffs, Frostvein Peaks, the Endless Night, Ironclock, Starlane, the Painted Court, the Undercroft, Tidewrought, the Lady of the Last Door, Keepers, souls/companions, callings (Hourblade, Evoker, Dawnward, Guardian, Slipstream), Honest Drew's (tavern). The player is a lesser god who woke with no memory under a cracked sky.

## 4. What's crowded or broken today (from a local run)

1. **23 sidebar entries:** Menu, Journey, Activities, Fellowship, Guild hall, Crafts, Rift Gate, Bag, Profile, Keeper, Team, Co-op, Codex, Arena, Market, Field guide, Workshop, Trading, Tournament grounds, Honest Drew's, Companion field notes, News & notices, Settings. Several overlap (Co-op / Fellowship / party board; Crafts / Workshop; Arena / Tournament grounds; Market / Trading; Field guide / Journey / Companion field notes).
2. **Three columns are always on:** nav, main and a permanent 300px chat/online column. Main gets squeezed on laptops.
3. **There's no top status bar on desktop.** Name, level, stamina, coins and location live in a dense sidebar card.
4. **Stacked override stylesheets** give inconsistent spacing, type sizes, button styles and panel styles from screen to screen.
5. **Missing icon files** (never captured from the live site) show as broken images:
   - `rift-ui/icons/`: rift, spirit, keeper, map, craft, fortress, reeds, metal, leaf, swords, shield, poison, coin, bag, book, crystal, water, cosmic, fire, ice, lightning, wind, sound, void, door, blood, earth, light, shadow. Only bell, scroll and time exist.
   - `preview/assets/icons/`: scythe, crossed-pistols, chakram, umbrella, handheld-fan, spear-feather, paddles, trident, kite, anchor, flying-flag, relic-blade, orange.
   - `preview/assets/status/*.png` (status effects such as `10_shielded`).

   Fill these at the same paths with one consistent icon set. Use the asset library (section 2) where a pack fits; otherwise draw original SVGs. Keep one visual language, `currentColor`-friendly where possible.
6. The phone layout has a top bar, bottom nav, chat button and full-screen menu, all competing.

## 5. What to deliver

1. **A design system.** One new stylesheet, `rift-ui/design-system.css`, loaded **last**. It holds tokens (color, type scale, spacing, radius, elevation, motion) and base components: buttons (primary/secondary/quiet/danger), panels/cards, tabs, lists/rows, badges, meters (HP, stamina, XP), inputs, toasts, modals/dialogs and empty states. Keep the dark, rift/void, cool-blue identity, but make it calmer and more legible. Check WCAG AA contrast.
2. **Navigation, regrouped into 5–6 top-level sections** with sub-tabs inside each. Suggested starting point (adjust if play-testing shows a better grouping):
   - **Journey**: world map, Rift Gate, field guide/quests
   - **Keeper**: keeper, team/companions, bag, codex, profile/titles
   - **Town**: market & trading, crafts & workshop, Honest Drew's, arena & tournaments (when at Hall's Edge, this works as the city hub)
   - **Social**: fellowship/party/co-op, guild hall, chat
   - **News**, and **Settings** (quiet, bottom)

   Every existing `data-v` view must stay reachable. Nothing gets deleted, only regrouped.
3. **A desktop top bar** with keeper name and portrait, level/XP, stamina, coins, current location and sync status. Slim the sidebar card down to match.
4. **Chat as a dock**: collapsible, closed by default under ~1280px wide, with an unread badge, and a remembered open/closed state (localStorage wrapped in try/catch). Online now goes inside the chat dock, not above it.
5. **A Hall's Edge hub screen** that reads like a town square (cards for Market, Workshop, Tavern, Arena, Guild, Rift Gate) instead of a dense list.
6. **Consistency passes** on: world map, team, keeper, bag, codex, market, arena, tavern, guild, settings and battle. For battle, only restyle chrome and panels (see section 6).
7. **Phone (375×812)**: at most 5 bottom-nav items, one top bar, chat reached from the bottom nav (no floating button on top of content), no horizontal scroll, and 44px+ touch targets.
8. **The missing icon set** from section 4.5.
9. Retire dead CSS where you're confident it's fully overridden. Delete a rule only when you've confirmed nothing uses it. When unsure, leave it, and record the candidates in your log.

## 6. Hard rules (so the game keeps working)

You **may** edit: all CSS; the HTML shell in `play/index.html`; markup inside `*HTML()` template functions; `renderNav()`, `NAV` and the mobile nav lists; presentation code in `preview/*.js` (markup, classes, layout); new SVG/PNG assets.

You **must not** change:
- **Game state and saves:** the `S` object, `freshSave()`, `migrate()`, save/load, localStorage/sessionStorage keys (`rk-*`, `tk-*`).
- **Rules and numbers:** combat math and turn logic, timing windows, QTE scoring, capture rates, drops, economy, stamina costs, and data tables (`TYPES`, `SPECIES`, `ARCH`, `MOVES`, `ZONES`, `ITEMS`, `RECIPES`, …).
- **Network code:** `nkRpc`, `onlineBoot`, `onlineSocket`, `onlinePost`, `makeOnlineDB`, and anything calling `/mmo/*`, `/account/*`, `/launch-status`, `healthcheck` or `status.json`.
- **Element IDs and data attributes JS relies on:** `#app #main #nav #mobnav #mobtop #social #online #chat #chatForm #chatIn #chatScope #tamerCard #syncState #onlineH #chatH #startBtn`, every `data-v`, `data-party-key`, and any id passed to `$()` / `getElementById` / `querySelector`. Before renaming or removing any id or class, grep `play/index.html` and `preview/*.js` for it.
- **Accessibility and input support:** keep `aria-*` labels, `role="dialog"` modals, visible `:focus-visible`, controller/gamepad focus (`padScope`, `focusables`, `moveFocus`, `preview/controller*.js`, `pad-glyphs`), and `prefers-reduced-motion` and the in-game reduced-motion setting.
- **Libraries:** no new frameworks, build steps or CDN libraries. Google Fonts are fine.

If a design change needs a logic change (new state, a new stat on the top bar that isn't computed yet, a different save field), **don't do it**. Write it up in `docs/requests-for-systems.md` (what, why, which screen) and design around a placeholder. Claude will pick these up.

## 7. Done checklist (verify every item before you stop)

- [ ] Game loads at `http://localhost:8080/play` with **no console errors** you introduced. Compare against `main`.
- [ ] Fresh character: creation → full Island of Nowhere tutorial → first battle and capture → arrive at Hall's Edge, with no dead ends.
- [ ] Every original nav destination opens from the new navigation.
- [ ] A battle plays end to end: timed strikes/blocks still register, the action dock is usable, and nothing covers the QTE prompts.
- [ ] Chat dock opens and closes, remembers its state, and the input still sends (it posts locally offline).
- [ ] No broken images (`[...document.images].filter(i=>i.complete&&!i.naturalWidth)` returns empty on each main screen).
- [ ] Layout holds at 1440×900, 1280×800, 1024×768, 768×1024 and 375×812, with no horizontal scroll.
- [ ] Keyboard-only: you can tab through nav and main screens, and focus is always visible.
- [ ] Before/after screenshots of the hub, map, keeper, team, market, a battle and phone views, saved in `docs/design-m1/`.

### Self-review before calling any screen done
Look at your own screenshot of each screen, at 1440×900 and 375×812, and fix anything that fails:
- [ ] **Proportions:** every featured character fills at least 75% of its frame's height. No character looks like a thumbnail inside a big empty frame.
- [ ] **Right asset:** featured characters use `art/poses` or `art/portraits`, never the 256 px `art/souls` sprites. No image is stretched past its native size.
- [ ] **Nothing cut off or overlapping:** no half-hidden rows behind tabs, no buttons (Fullscreen, Chat) covering content, every tab label on the same baseline.
- [ ] **Nothing unexplained:** no unlabelled bars, `???` chips, placeholder text or developer wording (prototype, snapshot, debug, preview).
- [ ] **Hierarchy:** the most important thing on the screen is the biggest and brightest. Empty states are quieter than filled ones. Background effects never compete with text.
- [ ] **Space:** information sits in open space, not box-in-box-in-box. No panel is more than half empty.
- [ ] **Above the fold:** the screen's main action and its key information are visible at 1440×900 without scrolling.

If any box fails, fix it before moving on. Note in the log what you changed because of this review.

## 8. Log and handoff

Keep `docs/DESIGN-LOG.md` up to date as you go:
- **What changed and why**, per screen, with screenshot links.
- **What you hid or removed** from the UI and where it was.
- **Dead CSS candidates** you didn't delete.
- **Open questions** for the owner.
- **Requests for systems** (also in `docs/requests-for-systems.md`).

Finish with a short summary at the top of `DESIGN-LOG.md`: done, not done, and what to review first.
