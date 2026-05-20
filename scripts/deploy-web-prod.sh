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

bunx vercel link --yes --scope moodbods --project wandr
bunx vercel pull --yes --environment production --scope moodbods
bunx vercel build --prod --yes --scope moodbods
bunx vercel deploy --prebuilt --prod --scope moodbods
