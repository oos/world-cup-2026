#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-2026}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/world-cup-2026}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/wc26_${TIMESTAMP}.sql.gz"

POSTGRES_USER="${POSTGRES_USER:-wc26}"
POSTGRES_DB="${POSTGRES_DB:-wc26}"

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

find "$BACKUP_DIR" -name "wc26_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup written to $BACKUP_FILE"
