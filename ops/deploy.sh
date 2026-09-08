#!/usr/bin/env bash
# Deploy the WorkCatch web client. Run from this repo's root.
#
# The API lives in a separate repository (workcatch-api) and deploys separately.
# If you are shipping a change that depends on a new API shape, deploy the API
# first, or the SPA will call an endpoint that does not exist yet.
set -euo pipefail

HOST="${WORKCATCH_HOST:?set WORKCATCH_HOST, e.g. root@goskillup.me}"

echo "==> building"
npm ci
npm run build

echo "==> guard: no secret may appear in the browser bundle"
# Vite inlines every VITE_* variable as a literal string. Everything in dist/ is
# public the moment it ships.
if grep -rIlE 'CHANNEL_SECRET|channelSecret|CHANNEL_ACCESS_TOKEN|-----BEGIN' dist/ 2>/dev/null | head -1 | grep -q .; then
  echo "FATAL: a secret-looking string is present in dist/" >&2
  exit 1
fi

echo "==> uploading"
rsync -az --delete dist/ "$HOST:/tmp/workcatch-web/"

echo "==> swapping"
ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
sudo rsync -a --delete /tmp/workcatch-web/ /var/www/workcatch/
sudo chown -R www-data:www-data /var/www/workcatch
rm -rf /tmp/workcatch-web
REMOTE

echo "==> verifying"
curl -fsS -o /dev/null -w 'workcatch -> %{http_code}\n' https://workcatch.goskillup.me/
curl -fsS -o /dev/null -w 'goskillup.me -> %{http_code}\n' https://goskillup.me/ \
  || echo "WARNING: goskillup.me did not respond"
