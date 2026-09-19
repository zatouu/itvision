#!/bin/bash
# Entrypoint replica set single-node pour l'image mongo officielle.
# Avec --auth + --replSet, MongoDB exige un keyFile pour l'authentification
# interne du replica set — on le génère dans un volume persistant si absent.
set -e

KEYFILE_DIR=/data/keyfile
KEYFILE="$KEYFILE_DIR/mongo-keyfile"
mkdir -p "$KEYFILE_DIR"
if [ ! -f "$KEYFILE" ]; then
  openssl rand -base64 756 > "$KEYFILE"
fi
chmod 400 "$KEYFILE"
chown mongodb:mongodb "$KEYFILE" 2>/dev/null || true

exec /usr/local/bin/docker-entrypoint.sh "$@"
