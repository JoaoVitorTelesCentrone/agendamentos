#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="backups/vivio-$stamp.dump"
temporary="backups/.vivio-$stamp.tmp"
trap 'rm -f "$temporary"' EXIT
docker compose -f compose.yaml -f compose.prod.yaml exec -T db sh -c \
  'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$temporary"
test -s "$temporary"
mv "$temporary" "$target"
trap - EXIT
echo "Backup created: $target"
echo 'Copy it off this VM and test a restore regularly.'
