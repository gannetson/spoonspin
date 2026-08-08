# Production deploy (spoonspin.nl)

App path on the server: `/var/www/soonspin/spoonspin`

## Layout

| File | Installs to |
|------|-------------|
| [`nginx/spoonspin.nl.conf`](nginx/spoonspin.nl.conf) | `/etc/nginx/sites-available/spoonspin.nl` (HTTP / certbot) |
| [`nginx/spoonspin.nl.ssl.conf`](nginx/spoonspin.nl.ssl.conf) | same path after TLS (or merge with certbot) |
| [`supervisor/spoonspin.conf`](supervisor/spoonspin.conf) | `/etc/supervisor/conf.d/spoonspin.conf` |
| [`install-server.sh`](install-server.sh) | copies configs + reloads services |

## Prerequisites (once per server)

```bash
# Debian/Ubuntu example
sudo apt update
sudo apt install -y nginx supervisor certbot python3-certbot-nginx postgresql postgresql-contrib
# Node 22+ via NodeSource or nvm; ensure `node` and `npm` are on PATH for www-data
```

Postgres:

```bash
sudo -u postgres createuser -P spoonspin   # set a password
sudo -u postgres createdb -O spoonspin spoonspin
```

DNS: `spoonspin.nl` and `www.spoonspin.nl` → this server.

## App setup

```bash
sudo mkdir -p /var/www/soonspin
sudo chown "$USER":www-data /var/www/soonspin
cd /var/www/soonspin
git clone git@github.com:gannetson/spoonspin.git spoonspin
cd spoonspin

cp .env.example .env
# edit .env — must include:
#   NODE_ENV=production
#   DATABASE_URL=postgresql://spoonspin:PASS@localhost:5432/spoonspin
#   API_PORT=3001
#   OPENAI_API_KEY=...
#   GOOGLE_PLACES_API_KEY=...

npm ci
npm run build

# www-data must read the tree and .env
sudo chown -R www-data:www-data /var/www/soonspin
sudo chmod 640 /var/www/soonspin/spoonspin/.env
```

## Install nginx + supervisor

```bash
cd /var/www/soonspin/spoonspin
chmod +x deploy/install-server.sh
./deploy/install-server.sh
sudo certbot --nginx -d spoonspin.nl -d www.spoonspin.nl
```

## Update / redeploy

```bash
cd /var/www/soonspin/spoonspin
sudo -u www-data git pull   # or pull as deploy user then chown
sudo -u www-data npm ci
sudo -u www-data npm run build
sudo supervisorctl restart spoonspin
```

Frontend-only: `npm run build` is enough (no API restart).

## Smoke checks

```bash
cd /var/www/soonspin/spoonspin
./deploy/smoke-check.sh              # defaults to https://spoonspin.nl
./deploy/smoke-check.sh http://127.0.0.1  # local via nginx before DNS/TLS
```

Or manually:

```bash
curl -sI https://spoonspin.nl
curl -s https://spoonspin.nl/api/health
sudo supervisorctl status spoonspin
sudo supervisorctl tail -f spoonspin
```

Expect health JSON with `"ok": true` and `"dbOk": true`.
