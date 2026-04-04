#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".next/standalone" ]]; then
  echo "Standalone output not found. Run npm run build first." >&2
  exit 1
fi

mkdir -p .next/standalone/.next

rm -rf .next/standalone/public
rm -rf .next/standalone/.next/static

if [[ -d "public" ]]; then
  cp -R public .next/standalone/
fi

cp -R .next/static .next/standalone/.next/

echo "standalone-assets-ready"
