#!/bin/bash
# HiveOS Stats Dashboard - Linux Server Deployment Script
# Run this on your Linux server from the project directory
set -e

echo "========================================="
echo "HiveOS Stats - Server Deployment"
echo "========================================="

# 1. Check Node.js version
echo ""
echo "[1/6] Checking Node.js version..."
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
echo "Current Node.js: $NODE_VERSION"

# Extract major version number
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)

if [ "$NODE_VERSION" = "none" ] || [ "$NODE_MAJOR" -lt 18 ]; then
    echo ""
    echo "ERROR: Node.js 18+ is required (20+ recommended)."
    echo ""
    echo "To install Node.js 20 on Ubuntu/Debian:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    echo "Or with nvm (no sudo needed):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo ""
    echo "After installing Node.js 20+, run this script again."
    exit 1
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "WARNING: Node.js $NODE_VERSION works but 20+ is recommended."
    echo "Continuing anyway..."
fi

echo "Node.js version OK: $NODE_VERSION"

# 2. Pull latest code
echo ""
echo "[2/6] Pulling latest code..."
git pull origin dev_improvements

# 3. Verify we have Tailwind v3 (not v4) in package.json
echo ""
echo "[3/6] Verifying package.json..."
if grep -q '"tailwindcss": "\^3' package.json; then
    echo "OK: Tailwind CSS v3 detected in package.json"
else
    echo "ERROR: package.json does not have Tailwind v3. Something is wrong with the code."
    exit 1
fi

if grep -q '"next": "\^15' package.json; then
    echo "OK: Next.js 15 detected in package.json"
else
    echo "WARNING: Unexpected Next.js version in package.json"
fi

# 4. Nuclear clean of all cached/installed packages
echo ""
echo "[4/6] Cleaning node_modules, .next cache, and npm cache..."
rm -rf node_modules
rm -rf .next
rm -f package-lock.json
npm cache clean --force

# 5. Fresh install
echo ""
echo "[5/6] Installing dependencies (fresh)..."
npm install

# Verify no Tailwind v4 packages snuck in
echo ""
echo "Verifying no Tailwind v4 packages installed..."
if [ -d "node_modules/@tailwindcss/oxide" ]; then
    echo "ERROR: @tailwindcss/oxide found in node_modules! Removing..."
    rm -rf node_modules/@tailwindcss/oxide
    rm -rf node_modules/@tailwindcss/postcss
fi

if npm ls @tailwindcss/oxide 2>/dev/null | grep -q "oxide"; then
    echo "WARNING: @tailwindcss/oxide is still somehow referenced"
else
    echo "OK: No @tailwindcss/oxide found (expected for v3)"
fi

# 6. Test build
echo ""
echo "[6/6] Building the application..."
npm run build

echo ""
echo "========================================="
echo "SUCCESS! Deployment complete."
echo ""
echo "To start the app:"
echo "  npm run dev          # Development mode"
echo "  npm start            # Production mode (after build)"
echo ""
echo "App will be available at http://$(hostname -I | awk '{print $1}'):8050"
echo "========================================="
