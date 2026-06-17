#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-2026}"
CRON_DIR="${APP_DIR}/deploy/cron"

if [[ ! -d "$CRON_DIR" ]]; then
  echo "Cron directory not found: $CRON_DIR" >&2
  exit 1
fi

MARKER="# world-cup-2026 cron"
CRON_FILES=(
  "backup-db.cron"
  "live-scores.cron"
  "lineup-sync.cron"
  "sync-history.cron"
  "apply-known-scores.cron"
  "api-football-proof.cron"
  "api-football-competitions.cron"
)

extract_job() {
  local file="$1"
  grep -E '^[^#[:space:]]' "$file" | head -n 1
}

existing="$(crontab -l 2>/dev/null || true)"
updated="$existing"

if ! grep -Fq "$MARKER" <<<"$updated"; then
  updated="${updated}"$'\n'"$MARKER"
fi

for cron_file in "$CRON_FILES"; do
  job="$(extract_job "${CRON_DIR}/${cron_file}")"
  if [[ -z "$job" ]]; then
    echo "No cron job found in ${cron_file}" >&2
    exit 1
  fi
  if grep -Fq "$job" <<<"$updated"; then
    echo "Already installed: $cron_file"
    continue
  fi
  updated="${updated}"$'\n'"$job"
  echo "Added: $cron_file"
done

printf '%s\n' "$updated" | crontab -

touch /var/log/wc26-backup.log /var/log/wc26-live-scores.log /var/log/wc26-lineup-sync.log /var/log/wc26-sync-history.log /var/log/wc26-apply-known-scores.log /var/log/wc26-api-football-proof.log /var/log/wc26-api-football-competitions.log 2>/dev/null || true

echo "Cron jobs installed. Current crontab:"
crontab -l
