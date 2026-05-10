#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "vercel.json" || ! -f "package.json" ]]; then
  echo "Expected to run from the Wandr repo root, but project files are missing."
  exit 1
fi

echo "Deploying Wandr web from: $ROOT_DIR"
echo "Target Vercel project: moodbods/wandr"

npx vercel link --yes --scope moodbods --project wandr
npx vercel pull --yes --environment production --scope moodbods
npx vercel build --prod --yes --scope moodbods
npx vercel deploy --prebuilt --prod --scope moodbods
