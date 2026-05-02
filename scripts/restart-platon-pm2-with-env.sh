#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/catalogos-api-lab/app}"
APP_NAME="${APP_NAME:-catalogos-api-lab}"
APP_PORT="${APP_PORT:-3000}"
PM2_HOME="${PM2_HOME:-${HOME}/.pm2}"

export PM2_HOME

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo ".env not found in ${APP_DIR}" >&2
  exit 1
fi

set -a
source .env
set +a

echo "== Runtime env (Varejonline sync) =="
echo "VAREJONLINE_PRODUCTS_MAX_ITEMS=${VAREJONLINE_PRODUCTS_MAX_ITEMS:-<unset>}"
echo "VAREJONLINE_PRODUCTS_PAGE_SIZE=${VAREJONLINE_PRODUCTS_PAGE_SIZE:-<unset>}"
echo "VAREJONLINE_PRODUCTS_BATCH_SIZE=${VAREJONLINE_PRODUCTS_BATCH_SIZE:-<unset>}"
echo "VAREJONLINE_PRODUCTS_ONLY_ACTIVE=${VAREJONLINE_PRODUCTS_ONLY_ACTIVE:-<unset>}"

echo "== Reiniciando app com env carregado do .env =="
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  HOSTNAME=0.0.0.0 PORT="$APP_PORT" pm2 start .next/standalone/server.js --name "$APP_NAME"
fi

pm2 save
