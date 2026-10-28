# Rift Keepers: Systems Roadmap

Owner: Claude (systems and code). Design is GPT's, in `docs/DESIGN-BRIEF-GPT.md`. Started 28 October 2026.

Product direction from the owner:
- A persistent browser-MMO/PBBG feel, with Isekai Guardians: Celestria as the reference.
- Keep Rift Keepers' own lore, chat and PvP.
- Free to play with no subscription; a cosmetic cash shop comes later.
- Ship a **desktop client** and a **browser version**. The browser version may be cut if it costs too much.
- Closed-alpha player data is disposable, and **anything here can be scrapped** if a rebuild is better.

## 1. How the game is built today

| Layer | What it is | Where |
|---|---|---|
| Solo state | One save object `S` (level, souls, bag, stamina, professions, gates, quests…), saved in localStorage. Cloud checkpoints go through `/account/*`. | `play/index.html` (`freshSave`, `migrate`, `doSave`), `preview/cloud-account.js` |
| Shared/authoritative state | `RKParty.state`, polled from the **`/mmo/*` API**: `session`, `name`, `state`, `command` (party, guild, arena, tavern, trade, patron quest, roster, world chat, duels/ambush). | `preview/social.js` and every module that reads `RKParty.state` |
| Nakama path | Full Nakama client (auth, chat channels, storage, RPCs `whoami`, `db`, `content_get`, `features`, `module_get`). **Dormant**: `server.json` has `host: null`. | `play/index.html` (`onlineBoot` etc.), `vendor/nakama-js.js` |
| Server | One Docker app on the Coolify server (`179.236.253.120`) serving the static client plus the `/mmo`, `/account` and `/launch-status` API. | **Not in any repo.** See section 3, step S0. |
| Delivery | Browser at `/play`; an installable PWA (`manifest.webmanifest`, `start_url /play`); the Talking Pixels Game Launcher (Tauri) reads `launcher.json` and opens `playUrl`. | repo root, `C:\Talking Pixels\Pixel Launcher` |

Code health: `play/index.html` is about 7,300 lines, and about 60 `preview/*.js` modules patch core functions in place (`render`, `go`, `uiIcon`, `wIco`, …) and inject their own nav entries. About 45 stylesheets override each other in load order. It works, but every new system has to be threaded through these monkey-patches.

## 2. What exists versus the reference feature list

| Feature (reference) | Rift Keepers today | Gap | Client or server |
|---|---|---|---|
| **Energy** budget, restorable via potions and a daily tavern visit | `stamina()` 0–100, refills fully in 30 min (`STAM_REGEN=100/30` per min). Costs: travel 3–10 by zone, search 6, crafting 2–4, world shout 25. Low stamina weakens attacks and capture (`restState`). | It's a short-cycle stamina, not a daily budget. No energy items, no daily refill. | Client now; server-checked once rewards are shared |
| **Attributes** (Power/Agility/Accuracy/Defense) | 5 attributes: Might, Resolve, Swiftness, Vitality, Mind. Per-type skills train by use; level-ups grow attributes (`attrLevelUp`, `applyAttrs`). | Already covered with our own names. Keep them. | Client |
| **Races** (4) | None. Identity is a **calling** (Hourblade, Evoker, Dawnward, Guardian, Slipstream), a cloak, a body and a companion. | Owner decision: add an "origin world" for the lesser god? Section 4. | Both |
| **Dungeons**: solo, or parties up to 6 | Solo **Rift Gates** (generated runs from three words: fights, events, rests, boss). Co-op/Fellowship party board and practice matches on `/mmo`. | No group dungeon with shared loot; party size and content limits are server-side. | Server |
| **Life sim**: fishing, farming, crafting, housing | Professions: Fishing, Foraging, Mining, Cooking, Brewing, Smithing (+ Keeper), with minigames. **"My door"**: a personal room with themes and decor that others can visit. **Away/idle progress**: up to 24 h, full rate for 8 h. | **No farming.** No house upgrades beyond theme/decor. | Client, server for visits |
| **Quests and story** | Island of Nowhere tutorial, god quests, player-authored quests (Quest Workshop), the Lady of the Last Door, Patron story quest ("The Guest Who Never Left"), Rift Gate words. | Content, not systems. | Client and server |
| **Guilds**: castle conquest, fishing raids | Guild hall on `/mmo` (ranks, members, events). | No castle or territory events, no group gathering events. | Server |
| **Arena**: weekly-reset rankings | Local arena against player snapshots and bots, with a rating. Server arena brackets and wars; tournament grounds. | No weekly season or reset; ladder fragmented across three screens. | Server |
| **Marketplace** | NPC market (books, stones, draughts, weapons), player stalls, trading with trade gold on `/mmo`, patron droplet shop. | Four separate markets. Unify into one player marketplace. | Server |
| **Collectibles**: 100+ companions | About 126 soul arts, codex, variants (tints, never-tamed, twists), evolutions and branches, titles, secrets, weapons and relics. | Already there. | Client |
| **Chat and PvP** | Area, world and every-world chat (world shouts cost stamina or items), mail with travel time, party chat, caves. Duels; ambush with safe/contested/lawless zones and the Hollow Mark. | Keep as is. Chat delivery needs a server (`/mmo` or Nakama). | Server |
| **Cash shop**, cosmetic only | No monetization code. **Cosmetic hooks already exist**: `shared-looks.js` (colors, frames, name styles), room decor, cloaks. | Store front + entitlements later. | Server |

## 3. Plan

**S0. Get the server under control (blocked on the owner).**
- This PC has no SSH key or known-host entry for `179.236.253.120` (likely lost in the reset). The `READ-ME-FIRST.txt` key setup no longer works from here.
- Options: (a) the owner says which key to use or adds a new key to the server; (b) the owner opens a terminal through Coolify. Then copy the `/mmo` server source out of the container into `server/` in this repo.
- If it can't be recovered, go straight to the rebuild in S1.

**S1. Decide: patch or rebuild.** Recommendation: **rebuild the server, keep and gradually clean the client.**
- The server source is out of reach and the player data is disposable, so an owned, versioned server in this repo is worth more than an image on a box.
- Proposed stack: **Nakama** (PostgreSQL) with TypeScript server modules in `server/`, deployed as a Coolify Docker Compose app on the same server.
  - It covers accounts, chat channels, storage, leaderboards with **weekly reset schedules**, authoritative matches for duels and dungeons, and groups for guilds.
  - The client already has a dormant Nakama path, and Broken Rift's server kit has a Nakama module (staff model, reserved names) to reuse.
- Port the `/mmo` features (party, guild, arena, tavern, trade, patron, presence) onto it one at a time behind the same `RKParty`-style client interface.

**S2. Client and browser builds.**
- **Desktop client**: a Tauri shell, consistent with the Talking Pixels Game Launcher, that ships the game files locally and talks to the server. It gives offline-capable assets, a fixed engine (no browser quirks), gamepad focus, window-size control, and a version check against `launcher.json` `minClient`.
- **Browser**: the same files served by the server at `/play`. If cost forces a cut, drop the browser build and keep the PWA/launcher route.
- One codebase, one build script producing both.

**S3. Screen registry (supports design milestone 1).** One list of screens (id, section, label, icon, availability) that `renderNav` and the phone nav read, replacing the per-module nav injections. Done after GPT's nav regrouping lands, so the two don't conflict.

**S4. Energy rework.** Larger pool with slow regeneration as a daily budget; energy draughts via Brewing; a daily tavern refill at Honest Drew's; costs rebalanced. Away/idle progress stays.

**S5. Farming and house upgrades** in "My door": planters that grow on real time, house tiers unlocking rooms and storage, visits through the server.

**S6. Weekly arena season** (Nakama leaderboard with a weekly reset, rewards on reset) and **one unified marketplace** (stalls + trading + droplet shop).

**S7. Group dungeons** (up to 6, authoritative match) and **guild castle events**.

**S8. Cosmetic cash shop** built on the existing looks system, with server-side entitlements and no gameplay items.

## 4. Decided (28 October 2026)
- **Desktop client:** its own app (not a mode inside the Game Launcher). The browser version may be cut.
- **Races:** none. Callings, cloaks, bodies and companions stay the identity.
- **Server:** rebuild rather than recover. Where it runs is section 5.

## 5. Which back end runs the game

| Option | Good at | Fit for Rift Keepers |
|---|---|---|
| **Nakama** (PostgreSQL), deployed through **Coolify** on our server | Always-on shared world: accounts, chat channels, presence, friends, groups (guilds), storage, leaderboards with weekly resets, authoritative matches (duels, dungeons), server-side TypeScript modules | **Best fit.** It's also the studio's planned social layer (`tp-social` in the Platform plan), and the client already has a dormant Nakama path. |
| **Platform server** (Next.js + Postgres + Better Auth + Stripe) | Accounts, store, payments, community pages | Not a real-time game server. Use it for **sign-in** (Platform account → Nakama custom auth) and later for **cash-shop payments**. |
| **RealmForge** (multiplayer client/host) | Session worlds hosted on a player's PC or our servers, invite links, one Godot server per world | Built for many separate worlds (Broken Rift), not one persistent shared world. Possible later use: private realms or dungeon instances. Not the main server. |
| **Coolify** | Hosting panel | Not an alternative: it's **how** the Nakama stack gets deployed and run. |

**Plan:** Nakama for the game, deployed via Coolify on our server. Platform accounts for sign-in and the later cash shop. RealmForge is optional, later.

## 6. Proposed energy numbers (S4)
- **Pool:** 150 energy. Regenerates 1 per 4 minutes, so a full refill takes 10 hours: two check-ins a day, the browser-MMO rhythm.
- **Costs:**
  - travel to a zone: 2 (near) to 8 (Riftscar, other worlds)
  - explore or search: 5
  - start a Rift Gate run: 15
  - gathering: 2
  - crafting: 3
  - shout to the whole world: 10
  - town actions (market, tavern, arena browsing): free
- **Restores:**
  - Honest Drew's daily meal: +50, once a day
  - Energy Draught (Brewing): +30, up to 3 a day
  - every Keeper level-up: full refill
  - items may overfill up to 2× the pool
- **No combat penalty** for low energy: energy gates *starting* actions; it never weakens you mid-fight (today's `restState` attack and capture penalties go).
- Away/idle progress stays as is (8 h full rate, 24 h cap).

## 7. Decisions still open
1. Confirm Nakama (section 5) and the energy numbers (section 6).
2. **Deploying needs server access:** an SSH key for `179.236.253.120`, or the owner adding the Nakama Compose app in Coolify from `server/` once it's built and tested locally.
