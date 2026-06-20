#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-2026}"
DOMAIN="${DOMAIN:-worldcupstats.org}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@worldcupstats.org}"
SITE_NAME="${DOMAIN}"
AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

mkdir -p /var/www/certbot
ln -sf "${AVAILABLE}" "${ENABLED}"

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "==> Bootstrapping HTTP vhost for certificate issuance..."
  cat > "${AVAILABLE}" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8083;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOF
  nginx -t
  systemctl reload nginx

  echo "==> Obtaining Let's Encrypt certificate..."
  certbot certonly --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${CERTBOT_EMAIL}"
fi

echo "==> Installing TLS vhost..."
cp "${APP_DIR}/deploy/nginx/worldcupstats.org.host.conf" "${AVAILABLE}"
nginx -t
systemctl reload nginx
echo "==> Host nginx configured for https://www.${DOMAIN} (apex redirects to www)"
