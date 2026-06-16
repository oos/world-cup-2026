#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-2026}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/world-cup-2026}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
S3_PREFIX="${S3_PREFIX:-database/}"
S3_RETENTION_DAYS="${S3_RETENTION_DAYS:-30}"

cd "$APP_DIR"

if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/wc26_${TIMESTAMP}.sql.gz"
REMOTE_KEY="${S3_PREFIX}wc26_${TIMESTAMP}.sql.gz"

POSTGRES_USER="${POSTGRES_USER:-wc26}"
POSTGRES_DB="${POSTGRES_DB:-wc26}"

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

find "$BACKUP_DIR" -name "wc26_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup written to $BACKUP_FILE"

S3_ENDPOINT="${S3_ENDPOINT:-${AWS_ENDPOINT_URL:-}}"
if [[ -z "${S3_BUCKET:-}" || -z "$S3_ENDPOINT" ]]; then
  echo "S3 upload skipped (set S3_BUCKET and S3_ENDPOINT in .env to enable)."
  exit 0
fi

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  echo "S3 upload skipped (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set)." >&2
  exit 0
fi

aws_cli() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-central-1}" \
    -v "$BACKUP_FILE:/backup.sql.gz:ro" \
    amazon/aws-cli:latest \
    "$@"
}

aws_cli s3 cp "/backup.sql.gz" "s3://${S3_BUCKET}/${REMOTE_KEY}" \
  --endpoint-url "$S3_ENDPOINT"

echo "Backup uploaded to s3://${S3_BUCKET}/${REMOTE_KEY}"

if [[ "$S3_RETENTION_DAYS" -gt 0 ]]; then
  cutoff_date="$(date -u -d "${S3_RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null \
    || date -u -v-"${S3_RETENTION_DAYS}"d +%Y%m%d)"

  mapfile -t stale_keys < <(
    docker run --rm \
      -e AWS_ACCESS_KEY_ID \
      -e AWS_SECRET_ACCESS_KEY \
      -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-central-1}" \
      amazon/aws-cli:latest \
      s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
      --endpoint-url "$S3_ENDPOINT" \
      --recursive \
      | awk -v cutoff="$cutoff_date" '
          $4 ~ /wc26_[0-9]{8}_[0-9]{6}\.sql\.gz$/ {
            key = $4
            date = substr(key, index(key, "wc26_") + 5, 8)
            if (date < cutoff) print key
          }'
  )

  for key in "${stale_keys[@]}"; do
    [[ -z "$key" ]] && continue
    docker run --rm \
      -e AWS_ACCESS_KEY_ID \
      -e AWS_SECRET_ACCESS_KEY \
      -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-central-1}" \
      amazon/aws-cli:latest \
      s3 rm "s3://${S3_BUCKET}/${key}" \
      --endpoint-url "$S3_ENDPOINT"
    echo "Removed stale remote backup s3://${S3_BUCKET}/${key}"
  done
fi
