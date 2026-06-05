# World Cup 2026 Squads

Mobile-first PWA for browsing FIFA World Cup 2026 team squads, player profiles, and match schedules.

**Stack:** Flask + SQLAlchemy 2 + Postgres (Supabase in prod) · React + Vite PWA · Google AdSense · GitHub Actions → Hetzner

## Features

- 48 national team squads with player bios
- Data from [openfootball](https://github.com/openfootball/worldcup.json), [Wikidata](https://www.wikidata.org/wiki/Q133699268), and scraper fallbacks (Wikipedia, Al Jazeera, ESPN)
- Match schedule with venues and live scores
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
- API: http://localhost:5000/api/v1/teams

Skip scrapers in dev: `SYNC_SCRAPERS=false` in `.env`

## Production deploy (Hetzner)

### One-time server setup

```bash
# On your Hetzner VPS
git clone https://github.com/oos/world-cup-2026.git /opt/world-cup-2026
cd /opt/world-cup-2026
cp .env.example .env
# Edit .env with production values
chmod +x deploy/scripts/deploy.sh
```

Ensure Certbot certs exist at `/etc/letsencrypt/live/YOUR_DOMAIN/` and update `deploy/nginx/nginx.prod.conf` `server_name` / `${DOMAIN}`.

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `HETZNER_HOST` | Server IP or hostname |
| `HETZNER_USER` | SSH user |
| `HETZNER_SSH_KEY` | Private SSH key for Actions |
| `DATABASE_URL` | Supabase Postgres connection string (Session pooler) |
| `DOMAIN` | Production domain |
| `FLASK_SECRET_KEY` | Random 32+ char secret |
| `ADSENSE_CLIENT_ID` | `ca-pub-…` (optional until AdSense approved) |
| `VITE_ENABLE_ADS` | `false` initially, `true` after AdSense approval |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the **Session pooler** connection string (Settings → Database)
3. Set as `DATABASE_URL` in GitHub Secrets and server `.env`

Local dev uses Docker Postgres — same schema via Alembic migrations.

### Auto-deploy

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Run backend tests
2. Build frontend
3. SSH to Hetzner → pull → migrate → sync-data → restart

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/teams` | List teams (`?group=Group A`) |
| GET | `/api/v1/teams/stats` | Tournament stats |
| GET | `/api/v1/teams/:id` | Team + squad |
| GET | `/api/v1/teams/:id/squad` | Squad by position |
| GET | `/api/v1/players/:id` | Player detail |
| GET | `/api/v1/matches` | Match schedule |

## Data sync

```bash
flask sync-data
```

Waterfall: openfootball → Wikidata → scrapers (gap fill only).

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
deploy/      Nginx config, deploy script
```

## License

MIT
