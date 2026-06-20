#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-2026}"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building containers..."
docker compose -f docker-compose.prod.yml build

echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm api flask --app wsgi db upgrade

echo "==> Syncing World Cup data..."
docker compose -f docker-compose.prod.yml run --rm api flask --app wsgi sync-data

echo "==> Cleaning invalid player records..."
docker compose -f docker-compose.prod.yml run --rm api flask --app wsgi cleanup-players

echo "==> Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Syncing historical World Cup results..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi sync-history

echo "==> Ensuring match notification worker is running..."
docker compose -f docker-compose.prod.yml up -d notifier

echo "==> Ensuring live score worker is running..."
docker compose -f docker-compose.prod.yml up -d live-scores

echo "==> Ensuring lineup sync worker is running..."
docker compose -f docker-compose.prod.yml up -d lineup-sync

echo "==> Applying authoritative match scores..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi apply-known-scores

echo "==> Installing host cron jobs..."
bash deploy/scripts/install-cron.sh || echo "Warning: cron install failed (non-fatal)"

echo "==> Running API-Football proof sync (WC 2022 showcase)..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi sync-api-football-proof || echo "Warning: proof sync skipped or failed (check API_FOOTBALL_KEY)"

echo "==> Seeding competition registry..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi seed-competitions || echo "Warning: seed-competitions failed"

echo "==> Running API-Football competition backfill pass..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi sync-api-football-competitions || echo "Warning: competition backfill skipped or failed (check API_FOOTBALL_KEY)"

echo "==> Deploy complete."

if command -v nginx >/dev/null 2>&1 && [ -f deploy/nginx/worldcupstats.org.host.conf ]; then
  SITE_DOMAIN="$(grep -E '^DOMAIN=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
  SITE_DOMAIN="${SITE_DOMAIN:-worldcupstats.org}"
  echo "==> Updating host nginx vhost..."
  if sudo -n cp deploy/nginx/worldcupstats.org.host.conf "/etc/nginx/sites-available/${SITE_DOMAIN}" 2>/dev/null \
    && sudo -n nginx -t \
    && sudo -n systemctl reload nginx; then
    echo "==> Host nginx reloaded (sudo)."
  elif command -v docker >/dev/null 2>&1 \
    && docker run --rm \
      -v "$PWD/deploy/nginx/worldcupstats.org.host.conf:/src/worldcupstats.org.host.conf:ro" \
      -v "/etc/nginx/sites-available:/etc/nginx/sites-available" \
      alpine sh -c "cp /src/worldcupstats.org.host.conf /etc/nginx/sites-available/${SITE_DOMAIN}" \
    && docker run --rm --privileged --pid=host alpine nsenter -t 1 -m -u -i -n -- nginx -t \
    && docker run --rm --privileged --pid=host alpine nsenter -t 1 -m -u -i -n -- systemctl reload nginx; then
    echo "==> Host nginx reloaded (docker)."
  else
    echo "Warning: host nginx reload skipped (run install-host-nginx.sh as root if needed)"
  fi
fi
