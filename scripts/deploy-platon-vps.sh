#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/catalogos-api-lab/app}"
APP_NAME="${APP_NAME:-catalogos-api-lab}"
APP_PORT="${APP_PORT:-3000}"
APP_DOMAIN="${APP_DOMAIN:-catalogofacil.solucaoviavel.com}"
BRANCH="${BRANCH:-main}"
PM2_HOME="${PM2_HOME:-${HOME}/.pm2}"

export PM2_HOME

cd "$APP_DIR"

if [[ ! -f package.json ]]; then
  echo "package.json not found in ${APP_DIR}" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo ".env not found in ${APP_DIR}" >&2
  exit 1
fi

echo "== Validando remoto =="
git remote -v

remote_names="$(git remote)"
if [[ "$remote_names" != "origin" ]]; then
  echo "Expected exactly one git remote named origin." >&2
  exit 1
fi

echo "== Atualizando branch =="
git fetch origin "$BRANCH" --prune
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi
git pull --ff-only origin "$BRANCH"

echo "== Instalando dependencias =="
npm ci --no-audit --no-fund

echo "== Prisma =="
npx prisma migrate deploy
npx prisma generate

echo "== Build =="
npm run build

echo "== Garantindo Chromium do Playwright =="
npx playwright install chromium

echo "== Reiniciando app =="
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  HOSTNAME=0.0.0.0 PORT="$APP_PORT" pm2 start .next/standalone/server.js --name "$APP_NAME"
fi
pm2 save

echo "== Aguardando app subir =="
sleep 8

echo "== Validando =="
ss -ltnp | grep ":${APP_PORT}" || true
curl -fsSI "http://127.0.0.1:${APP_PORT}/dashboard"
if [[ -n "$APP_DOMAIN" ]]; then
  curl -fsSI "https://${APP_DOMAIN}/dashboard" || true
fi

echo "DEPLOY_OK branch=${BRANCH} app=${APP_NAME} port=${APP_PORT}"
