#!/usr/bin/env bash
# Run on the production host as a user with sudo.
# Expects the app already at /var/www/spoonspin/spoonspin (git clone/pull + npm ci + build).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/spoonspin/spoonspin}"
REPO_DEPLOY="${APP_ROOT}/deploy"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "Missing app directory: $APP_ROOT" >&2
  exit 1
fi

if [[ ! -f "$APP_ROOT/.env" ]]; then
  echo "Create $APP_ROOT/.env from .env.example before installing." >&2
  exit 1
fi

if [[ ! -d "$APP_ROOT/dist" ]]; then
  echo "Missing $APP_ROOT/dist — run: cd $APP_ROOT && npm ci && npm run build" >&2
  exit 1
fi

echo "==> Installing supervisor program"
sudo install -m 0644 "$REPO_DEPLOY/supervisor/spoonspin.conf" \
  /etc/supervisor/conf.d/spoonspin.conf
sudo mkdir -p /var/log/supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart spoonspin || sudo supervisorctl start spoonspin
sudo supervisorctl status spoonspin

echo "==> Installing nginx HTTP site (certbot-ready)"
sudo install -m 0644 "$REPO_DEPLOY/nginx/spoonspin.nl.conf" \
  /etc/nginx/sites-available/spoonspin.nl
sudo ln -sfn /etc/nginx/sites-available/spoonspin.nl /etc/nginx/sites-enabled/spoonspin.nl
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Next:"
echo "  1. Point DNS A/AAAA for spoonspin.nl + www to this server"
echo "  2. sudo certbot --nginx -d spoonspin.nl -d www.spoonspin.nl"
echo "  3. Optionally replace the site with the SSL template:"
echo "       sudo install -m 0644 $REPO_DEPLOY/nginx/spoonspin.nl.ssl.conf /etc/nginx/sites-available/spoonspin.nl"
echo "       sudo nginx -t && sudo systemctl reload nginx"
echo "  4. Smoke: curl -sI https://spoonspin.nl && curl -s https://spoonspin.nl/api/health"
