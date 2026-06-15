# World Cup 2026 Squads

Mobile-first PWA for browsing FIFA World Cup 2026 team squads, player profiles, and match schedules.

**Stack:** Flask + SQLAlchemy 2 + Postgres (Docker on Hetzner) · React + Vite PWA · Resend (magic-link auth) · Google AdSense · GitHub Actions → Hetzner

## Features

- 48 national team squads with player bios
- Data from [openfootball](https://github.com/openfootball/worldcup.json), [Wikidata](https://www.wikidata.org/wiki/Q133699268), and scraper fallbacks (Wikipedia, Al Jazeera, ESPN)
- Match schedule with venues and live scores
- Email magic-link sign-in with synced profile preferences
- Installable PWA with offline API caching
- Google AdSense (disabled until domain approved)

## Local development

```bash
cp .env.example .env
docker compose up -d
docker compose exec api flask db upgrade
docker compose exec api flask sync-data
```

- PWA: http://localhost:5173
- API: http://localhost:5001/api/v1/teams

Skip scrapers in dev: `SYNC_SCRAPERS=false` in `.env`

In development, magic-link URLs are logged to the API container stdout when `RESEND_API_KEY` is unset.

## Production deploy (Hetzner)

### One-time server setup

```bash
# On your Hetzner VPS
git clone https://github.com/oos/world-cup-2026.git /opt/world-cup-2026
cd /opt/world-cup-2026
cp .env.example .env
# Edit .env with production values (see below)
chmod +x deploy/scripts/deploy.sh deploy/scripts/backup-db.sh
```

On a **shared VPS** (host nginx already on :80/:443), Docker nginx binds to `127.0.0.1:8083`. One-time host setup as root after first deploy:

```bash
cd /opt/world-cup-2026
sudo DOMAIN=worldcupstats.org bash deploy/scripts/install-host-nginx.sh
```

Install daily backups, live score sync, and hourly result sync:

```bash
sudo bash deploy/scripts/install-cron.sh
# Or manually add lines from deploy/cron/*.cron via crontab -e
```

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `HETZNER_HOST` | Server IP or hostname |
| `HETZNER_USER` | SSH user |
| `HETZNER_SSH_KEY` | Private SSH key for Actions |
| `POSTGRES_PASSWORD` | Strong password for the production Postgres container |
| `POSTGRES_USER` | Optional (default `wc26`) |
| `POSTGRES_DB` | Optional (default `wc26`) |
| `DOMAIN` | Production domain |
| `FLASK_SECRET_KEY` | Random 32+ char secret |
| `RESEND_API_KEY` | Resend API key for magic-link emails |
| `AUTH_FROM_EMAIL` | Verified sender, e.g. `noreply@YOUR_DOMAIN` |
| `ADSENSE_CLIENT_ID` | `ca-pub-…` (optional until AdSense approved) |
| `VITE_ENABLE_ADS` | `false` initially, `true` after AdSense approval |

### Postgres on Hetzner

Production runs Postgres 16 in Docker alongside the API (`docker-compose.prod.yml`). The database is **not** exposed publicly — only the API container connects over the Docker network.

**Migrating from Supabase (optional one-time):**

```bash
# Dump from Supabase
pg_dump "$SUPABASE_DATABASE_URL" > supabase_dump.sql

# After first deploy with the new compose stack
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U wc26 wc26 < supabase_dump.sql
```

Supabase auth users are not migrated — users re-sign-in via email magic link.

### Resend setup

1. Create an account at [resend.com](https://resend.com)
2. Verify your production domain (DNS records)
3. Set `RESEND_API_KEY` and `AUTH_FROM_EMAIL` in GitHub Secrets (used by deploy) and verify locally if needed

### Auto-deploy

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Run backend tests
2. Build frontend
3. SSH to Hetzner → pull → migrate → sync-data → restart

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/magic-link` | Request email sign-in link |
| POST | `/api/v1/auth/verify` | Verify magic link, start session |
| GET | `/api/v1/auth/me` | Current user + profile |
| PATCH | `/api/v1/auth/me` | Update profile preferences |
| POST | `/api/v1/auth/logout` | End session |
| GET | `/api/v1/teams` | List teams (`?group=Group A`) |
| GET | `/api/v1/teams/stats` | Tournament stats |
| GET | `/api/v1/teams/:id` | Team + squad |
| GET | `/api/v1/teams/:id/squad` | Squad by position |
| GET | `/api/v1/players/:id` | Player detail |
| GET | `/api/v1/matches` | Match schedule |

## Data sync

```bash
flask sync-data
flask sync-history
```

Squad/schedule waterfall: openfootball → Wikidata → scrapers (gap fill only).

API-Football (optional, recommended for squads/clubs/photos):

```bash
# Add API_FOOTBALL_KEY to .env (never commit the key)
docker compose exec api flask --app wsgi sync-api-football
```

Uses ~70–100 requests on first run (Free tier: 100/day). **Free plan does not include 2026** — use Pro+ for World Cup 2026, or test with `--season 2022`. See [API-Football docs](https://www.api-football.com/documentation-v3).

`sync-history` downloads match results for every World Cup from 1930 through the current
2026 tournament and stores them in Postgres (`nations`, `tournament_teams`, `matches`).
On production, `deploy/cron/sync-history.cron` runs this hourly so live scores feed into
team history W–D–L and goals as matches are played.

### Live scores (2026)

During the tournament, scores are polled from ESPN and written to `matches.score`.

**Local development:**

```bash
docker compose up -d live-scores   # polls every 60s via sync-live-scores
docker compose exec api flask --app wsgi apply-known-scores  # one-shot backfill
```

**Production** uses the Docker `live-scores` worker (started by `deploy/scripts/deploy.sh`) plus host cron as a backup:

```bash
sudo bash deploy/scripts/install-cron.sh
```

This installs:

| Schedule | Command | Log |
|----------|---------|-----|
| Every minute | `sync-live-scores` | `/var/log/wc26-live-scores.log` |
| Every hour | `sync-history` | `/var/log/wc26-sync-history.log` |
| Every 15 min | `apply-known-scores` | `/var/log/wc26-apply-known-scores.log` |

**One-time backfill** after deploy or if scores are missing:

```bash
docker compose -f docker-compose.prod.yml up -d live-scores
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi apply-known-scores
docker compose -f docker-compose.prod.yml exec -T api flask --app wsgi sync-history
```

Verify with `GET /api/v1/matches` — played fixtures should include `score.ft`.

## Google AdSense

1. Deploy with `VITE_ENABLE_ADS=false`
2. Apply at [adsense.google.com](https://www.google.com/adsense/) with your live domain
3. Update `frontend/public/ads.txt` with your publisher ID
4. Set `ADSENSE_CLIENT_ID` secret and `VITE_ENABLE_ADS=true`
5. Redeploy

## Project structure

```
backend/     Flask API, ingestion, scrapers
frontend/    React PWA
deploy/      Nginx config, deploy script, backups
```

## License

MIT
