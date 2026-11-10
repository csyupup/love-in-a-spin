#!/bin/sh
set -eu
umask 077
backup_dir=/var/backups/love-in-a-spin
mkdir -p "$backup_dir"
backup_file="$backup_dir/love-$(date -u +%Y%m%dT%H%M%SZ).db"
sqlite3 /opt/services/love-in-a-spin/data/love.db ".backup '$backup_file'"
test "$(sqlite3 "$backup_file" 'PRAGMA integrity_check;')" = ok
if [ -f /etc/love-in-a-spin/room.json ]; then
  install -m 0600 /etc/love-in-a-spin/room.json "$backup_dir/room-access.json"
fi
echo "SQLite backup verified."
