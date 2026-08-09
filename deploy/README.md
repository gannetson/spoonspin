# Production deploy (spoonspin.nl)

App path on the server: `/var/www/spoonspin/spoonspin`

## Layout

| File | Installs to |
|------|-------------|
| [`nginx/spoonspin.nl.conf`](nginx/spoonspin.nl.conf) | `/etc/nginx/sites-available/spoonspin.nl` (HTTP / certbot) |
| [`nginx/spoonspin.nl.ssl.conf`](nginx/spoonspin.nl.ssl.conf) | same path after TLS (or merge with certbot) |
| [`supervisor/spoonspin.conf`](supervisor/spoonspin.conf) | `/etc/supervisor/conf.d/spoonspin.conf` |
| [`install-server.sh`](install-server.sh) | copies configs + reloads services |

## Remote deploy (from your laptop)

```bash
# once: add an SSH host alias, e.g. in ~/.ssh/config
# Host spoonspin
#   HostName your.server.tld
#   User youruser

chmod +x deploy/remote-deploy.sh
npm run deploy:prod
# or: ./deploy/remote-deploy.sh spoonspin
# or: SPOONSPIN_SSH=user@host ./deploy/remote-deploy.sh
```

The script SSHs in, discards dirty tracked files under `src/content/` (content lives in Postgres), `git pull`s, runs `npm ci` + `npm run build`, and `supervisorctl restart spoonspin`.

Content is **not** redeployed from git. Bootstrap or refresh DB content with `npm run db:import-content` (from a dump created via `npm run db:export-content`). Never run agents that rewrite tracked content files on the production checkout.

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
sudo mkdir -p /var/www/spoonspin
sudo chown "$USER":www-data /var/www/spoonspin
cd /var/www/spoonspin
git clone git@github.com:gannetson/spoonspin.git spoonspin
cd spoonspin

cp .env.example .env
# edit .env — must include:
#   NODE_ENV=production
#   DATABASE_URL=postgresql:///spoonspin   # peer/trust via Unix socket (no password)
#   # If the API runs as www-data, create a matching DB role, e.g.:
#   #   sudo -u postgres createuser www-data
#   #   sudo -u postgres createdb -O www-data spoonspin
#   # If tables were created by another role (e.g. spoonspin) while the app
#   # connects as www-data, migrations fail with "must be owner of table …".
#   # Fix ownership once (replace roles as needed):
#   #   sudo -u postgres psql spoonspin -c "REASSIGN OWNED BY spoonspin TO www-data;"
#   #   sudo -u postgres psql spoonspin -c "ALTER DATABASE spoonspin OWNER TO www-data;"
#   API_PORT=3007
#   OPENAI_API_KEY=...
#   GOOGLE_PLACES_API_KEY=...

npm ci
npm run build

# www-data must read the tree and .env
sudo chown -R www-data:www-data /var/www/spoonspin
sudo chmod 640 /var/www/spoonspin/spoonspin/.env
```

## Install nginx + supervisor

```bash
cd /var/www/spoonspin/spoonspin
chmod +x deploy/install-server.sh
./deploy/install-server.sh
sudo certbot --nginx -d spoonspin.nl -d www.spoonspin.nl
```

## Update / redeploy

From your laptop (preferred):

```bash
npm run deploy:prod
```

Or on the server:

```bash
cd /var/www/spoonspin/spoonspin
# Discard local content file dirt if any agents were run here:
git restore --source=HEAD -- src/content/ || true
sudo -u www-data git pull
sudo -u www-data npm ci
sudo -u www-data npm run build
sudo supervisorctl restart spoonspin
```

Frontend-only: `npm run build` is enough (no API restart).

## Smoke checks

```bash
cd /var/www/spoonspin/spoonspin
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
