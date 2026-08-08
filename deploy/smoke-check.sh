#!/usr/bin/env bash
# Run on the production host after install (or against public HTTPS).
set -euo pipefail

BASE_URL="${1:-https://spoonspin.nl}"

echo "==> HEAD $BASE_URL"
curl -fsSI "$BASE_URL" | head -n 15

echo "==> GET $BASE_URL/api/health"
HEALTH=$(curl -fsS "$BASE_URL/api/health")
echo "$HEALTH"
echo "$HEALTH" | grep -q '"ok":true\|"ok": true'

if command -v supervisorctl >/dev/null 2>&1; then
  echo "==> supervisorctl status spoonspin"
  sudo supervisorctl status spoonspin
fi

echo "Smoke checks passed for $BASE_URL"
