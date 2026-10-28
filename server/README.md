# Rift Keepers server (Nakama)

Three containers: **postgres** (data), **nakama** (accounts, chat, storage, game RPCs in `nakama/modules/index.js`) and **web** (nginx: serves the game and proxies Nakama on the same origin). Players only ever talk to `web`.

## Deploy with Coolify
1. **New Resource → Docker Compose**, from the `talkingpixelsgit/RiftKeepersBeta` repo, branch `systems/m1` (later `main`). Set the compose file to `server/docker-compose.yml`.
2. **Environment:** set every variable in `server/.env.example`. Generate each secret with `openssl rand -hex 32`.
   - `PUBLIC_HOST` is the domain players use. A test domain works without DNS: `rk.179-236-253-120.sslip.io`.
3. **Domain:** give the **web** service that domain (port 80). Coolify issues the HTTPS certificate.
4. **Deploy.** Then check `https://<domain>/healthcheck` returns `{}`, and open `https://<domain>/play`.
5. **Become the Creator:** create an account in the game, then enter `RK_CREATOR_CODE` in Settings (or as the invite code).

## Deploy by hand (any Docker host)
```bash
cd server && cp .env.example .env   # fill it in
docker compose up -d --build
```
Put a TLS proxy (Caddy, Traefik) in front of `web:80`.

## Nakama console
Not published. Tunnel to it: `ssh -L 7351:<nakama container IP>:7351 root@<server>`, then open `http://localhost:7351` (user `admin`, password `NAKAMA_CONSOLE_PASSWORD`).

## What works and what's next
- **Works:** email accounts, Keeper names (reserved names blocked), cloud saves, area/world/every-world chat, the shared world (players, market stalls, mail, gifts, caves, rooms, gates, world events, world firsts), live content, the server-kept purse, reports, and staff roles with bans and mutes.
- **Coming back next** (they were on the old `/mmo` service; the game shows "moving to the new Hall"): party/Fellowship battles, guilds, arena brackets and tournaments, Honest Drew's tavern, trading, the Patron quest, duels and ambush.
