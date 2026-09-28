#!/bin/bash
# HiveOS Stats - deploy the latest main on the Linux server.
# Run from the project directory as the app user (not with sudo).
set -euo pipefail

cd "$(dirname "$0")"

echo "[1/4] Checking Node.js..."
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
    echo "ERROR: Node.js 20+ is required (found: $(node -v 2>/dev/null || echo none))."
    echo "Install it with nvm: nvm install 20 && nvm use 20"
    exit 1
fi
echo "Node.js $(node -v) OK"

echo "[2/4] Backing up data/..."
scripts/backup-data.sh

echo "[3/4] Updating code to origin/main..."
git fetch origin
git checkout main
git pull --ff-only origin main

echo "[4/4] Installing exact dependencies and building..."
npm ci
npm run build

echo ""
echo "Build complete. Restart the app to pick up the new version"
echo "(e.g. 'sudo systemctl restart hiveos-stats', or stop and re-run 'npm start')."
