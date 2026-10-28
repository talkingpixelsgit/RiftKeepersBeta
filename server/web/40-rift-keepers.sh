#!/bin/sh
# Writes server.json at start-up so the client signs in to this deployment's Nakama (same origin, port 443).
set -eu
cat > /usr/share/nginx/html/server.json <<EOF
{"host":"${PUBLIC_HOST}","port":443,"ssl":true,"serverKey":"${NAKAMA_SERVER_KEY}"}
EOF
