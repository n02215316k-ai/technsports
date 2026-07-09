#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/docker/websites/technsports}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE_PATH="${COMPOSE_FILE_PATH:-deploy/axiom-vps.docker-compose.yml}"

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

if [ ! -f "$COMPOSE_FILE_PATH" ]; then
  echo "Missing $COMPOSE_FILE_PATH in $APP_DIR."
  exit 1
fi

echo "Updating TechnSports from origin/$BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Building and restarting containers..."
docker compose -f "$COMPOSE_FILE_PATH" build
docker compose -f "$COMPOSE_FILE_PATH" up -d

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE_PATH" exec -T api npx prisma migrate deploy

echo "Current TechnSports containers:"
docker compose -f "$COMPOSE_FILE_PATH" ps

echo "Deployment update complete."
