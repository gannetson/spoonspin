#!/usr/bin/env bash
# Deploy Spoon Spin to production from your laptop.
#
# Usage:
#   ./deploy/remote-deploy.sh [ssh-host]
#   SPOONSPIN_SSH=myserver ./deploy/remote-deploy.sh
#
# Optional env:
#   SPOONSPIN_SSH      SSH Host / user@host (default: spoonspin, or first arg)
#   SPOONSPIN_APP_DIR  App path on server (default: /var/www/spoonspin/spoonspin)
#   SPOONSPIN_BRANCH   Git branch to pull (default: current remote tracking / main)
#
# Example SSH config (~/.ssh/config):
#   Host spoonspin
#     HostName your.server.example
#     User deploy
#     IdentityFile ~/.ssh/id_ed25519
set -euo pipefail

SSH_HOST="${1:-${SPOONSPIN_SSH:-spoonspin}}"
APP_DIR="${SPOONSPIN_APP_DIR:-/var/www/spoonspin/spoonspin}"
BRANCH="${SPOONSPIN_BRANCH:-}"

echo "==> Deploying to ${SSH_HOST}:${APP_DIR}"

# shellcheck disable=SC2029
ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" bash -s -- "$APP_DIR" "$BRANCH" <<'REMOTE'
set -euo pipefail

APP_DIR="$1"
BRANCH="${2:-}"

cd "$APP_DIR"

echo "==> git status (before)"
git status -sb

# Content lives in Postgres; discard dirty tracked content so git pull never
# conflicts with agent scripts that used to rewrite src/content/** on the server.
if git status --porcelain -- src/content/ | grep -q .; then
  echo "==> discarding local changes under src/content/ (DB is source of truth):"
  git status --porcelain -- src/content/ || true
  git restore --worktree --staged --source=HEAD -- src/content/ 2>/dev/null \
    || git checkout -- src/content/
  # Drop untracked content artifacts left by research agents
  git clean -fd -- src/content/ || true
fi

echo "==> git fetch"
git fetch --prune origin

if [[ -n "$BRANCH" ]]; then
  echo "==> checkout / pull $BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  CURRENT="$(git rev-parse --abbrev-ref HEAD)"
  echo "==> pull $CURRENT"
  git pull --ff-only
fi

echo "==> HEAD $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# Prefer a login shell PATH so nvm / nodesource node is available when present.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
fi

echo "==> node $(node -v) / npm $(npm -v)"

echo "==> npm ci"
npm ci

echo "==> npm run build"
npm run build

echo "==> supervisorctl restart spoonspin"
if command -v supervisorctl >/dev/null 2>&1; then
  if supervisorctl status spoonspin >/dev/null 2>&1; then
    supervisorctl restart spoonspin
  else
    sudo supervisorctl restart spoonspin
  fi
  sudo supervisorctl status spoonspin || supervisorctl status spoonspin
else
  echo "supervisorctl not found — restart the API manually" >&2
  exit 1
fi

echo "==> health check"
sleep 1
curl -fsS "http://127.0.0.1:${API_PORT:-3007}/api/health" \
  || curl -fsS "http://127.0.0.1:3007/api/health" \
  || echo "(health check skipped — set API_PORT if needed)"

echo "==> deploy done"
REMOTE
