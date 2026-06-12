#!/usr/bin/env bash
# Add Web Push VAPID secrets to GitHub Actions for production deploys.
# Run once from the repo root after generating keys with:
#   npx web-push generate-vapid-keys
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install from https://cli.github.com/"
  exit 1
fi

PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}"
PRIVATE_KEY="${VAPID_PRIVATE_KEY:-}"
CONTACT_EMAIL="${VAPID_CONTACT_EMAIL:-mailto:admin@example.com}"

if [[ -z "$PUBLIC_KEY" || -z "$PRIVATE_KEY" ]]; then
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source <(grep -E '^VAPID_' .env | sed 's/^/export /')
    PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}"
    PRIVATE_KEY="${VAPID_PRIVATE_KEY:-}"
    CONTACT_EMAIL="${VAPID_CONTACT_EMAIL:-$CONTACT_EMAIL}"
  fi
fi

if [[ -z "$PUBLIC_KEY" || -z "$PRIVATE_KEY" ]]; then
  echo "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env or the environment."
  exit 1
fi

echo "Setting GitHub Actions secrets for push notifications..."
gh secret set VAPID_PUBLIC_KEY --body "$PUBLIC_KEY"
gh secret set VAPID_PRIVATE_KEY --body "$PRIVATE_KEY"
gh secret set VAPID_CONTACT_EMAIL --body "$CONTACT_EMAIL"
echo "Done. Redeploy to apply on the server."
