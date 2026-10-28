# The game client, served by nginx, with Nakama proxied on the same origin.
# Build context is the repository root (see server/docker-compose.yml).
FROM nginx:1.27-alpine
COPY server/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY server/web/40-rift-keepers.sh /docker-entrypoint.d/40-rift-keepers.sh
RUN chmod +x /docker-entrypoint.d/40-rift-keepers.sh
WORKDIR /usr/share/nginx/html
RUN rm -f index.html 50x.html
COPY index.html manifest.webmanifest sw.js launcher.json status.json riftkeepers-logo.png icon-180.png icon-192.png icon-512.png ./
COPY play ./play
COPY preview ./preview
COPY rift-play ./rift-play
COPY rift-ui ./rift-ui
COPY vendor ./vendor
COPY art ./art
COPY welcome ./welcome
COPY coop ./coop
