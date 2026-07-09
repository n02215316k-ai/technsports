#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/docker/websites/technsports}"
BRANCH="${BRANCH:-main}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root or with sudo."
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "No git checkout found at $APP_DIR."
  echo "Clone the GitHub repository there first, then rerun this script."
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  echo "Missing $APP_DIR/.env. Keep production secrets in this file before deploying."
  exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
  echo "Missing docker-compose.yml in $APP_DIR."
  exit 1
fi

echo "Updating TechnSports from origin/$BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Building and restarting containers..."
docker compose build
docker compose up -d

echo "Running database migrations..."
docker compose exec -T api npx prisma migrate deploy

echo "Current TechnSports containers:"
docker compose ps

echo "Deployment update complete."
