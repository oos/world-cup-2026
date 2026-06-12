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

echo "==> Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Syncing historical World Cup results..."
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi sync-history

echo "==> Ensuring match notification worker is running..."
docker compose -f docker-compose.prod.yml up -d notifier

echo "==> Deploy complete."
