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

echo "==> Deploy complete."
