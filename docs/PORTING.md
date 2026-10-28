# Porting round-2 shared play to Nakama

Started 28 October 2026. Every system is **online now** through the `/mmo` bridge (`server/mmo-bridge`). It runs the recovered round-2 services (`server/legacy-round2`) on Nakama sign-ins. Each step below moves one service into `server/nakama/modules` behind the same `/mmo` state and command shapes, so the client keeps working throughout. When a service is ported, the bridge stops handling its commands.

| # | Service (round-2 file) | Size | Nakama target | Status |
|---|---|---|---|---|
| 0 | Name policy (`name-policy.cjs`) | 1.5 KB | `nameProblem` in the module | **Done** |
| 1 | Bulletin and news (`bulletin-service.cjs`) | 6 KB | System storage + `bulletin` RPC; staff posting | Next |
| 2 | Guilds (`guild-service.cjs`) | 5 KB | Nakama **groups** (members, ranks, history in group metadata) | |
| 3 | Trading and crafting wallet (`trade-service.cjs`) | 7 KB | User storage (wallet) + RPCs; merge with `econ_apply` so one purse exists | |
| 4 | Honest Drew's tavern (`tavern-service.cjs`) | 15 KB | User and system storage + RPCs | |
| 5 | Arena brackets and wars (`arena-service.cjs`) | 6 KB | **Leaderboards with a weekly reset** (`0 0 * * 1`) + RPCs: the weekly-season goal | |
| 6 | World presence, duels and ambush (`world-service.cjs`) | 5 KB | Realtime chat channels and presence, with server checks in RPCs | |
| 7 | Party board and battles (`social-service.cjs` + `battle-core.cjs`) | 30 KB | **Authoritative match handler** (turns, timing, rewards) | |
| 8 | Patron quest (`patron-service.cjs` + `patron-story.cjs`) | 35 KB | Story data as module content + RPCs; story battles use step 7 | |
| — | Round-2 accounts (`account-service.cjs`, `account-http.cjs`) | 10 KB | **Retired**: Nakama email accounts and cloud saves replace them | Done |
| — | Launch gate, hotfix, operator panel | 12 KB | `/launch-status` in nginx; operator tools move to the Nakama console | Done / later |

## Rules for each step
- Keep the response shape the client reads from `RKParty.state` (`guild`, `arena`, `tavern`, `trade`, `patron`, `world`, `party`, `match`).
- Test on the server with real Nakama sessions before switching the route.
- Players' round-2 data lives in the `mmostate` volume (`combat03.json`, `nakama-links.json`). Migrate it into Nakama storage once, when a service moves.
