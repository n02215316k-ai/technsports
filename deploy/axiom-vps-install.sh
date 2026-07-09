#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/docker/websites/technsports"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root or with sudo." >&2
  exit 1
fi

if ! docker network inspect proxy >/dev/null 2>&1; then
  echo "Missing external Docker network: proxy" >&2
  exit 1
fi

if ! docker network inspect backend >/dev/null 2>&1; then
  echo "Missing external Docker network: backend" >&2
  exit 1
fi

mkdir -p /srv/docker/websites

if [ -d "$APP_DIR" ] && [ ! -f "$APP_DIR/.technsports-app-installed" ]; then
  BACKUP_DIR="${APP_DIR}.wordpress-backup-${STAMP}"
  echo "Backing up existing TechnSports folder to ${BACKUP_DIR}"
  mv "$APP_DIR" "$BACKUP_DIR"
fi

mkdir -p "$APP_DIR"

echo "Copying application files into ${APP_DIR}"
if [ -f "$APP_DIR/.technsports-app-installed" ]; then
  find "$APP_DIR" -mindepth 1 \
    ! -name '.env' \
    ! -name '.technsports-app-installed' \
    -exec rm -rf {} +
fi

tar -C "$SRC_DIR" \
  --exclude './.env' \
  --exclude './.env.production' \
  --exclude './node_modules' \
  --exclude './apps/*/node_modules' \
  --exclude './apps/*/.next' \
  --exclude './apps/*/dist' \
  --exclude './uploads' \
  --exclude './*.log' \
  -cf - . | tar -C "$APP_DIR" -xf -

cp "$APP_DIR/deploy/axiom-vps.docker-compose.yml" "$APP_DIR/docker-compose.yml"
touch "$APP_DIR/.technsports-app-installed"

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/deploy/axiom-vps.env.example" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Created ${APP_DIR}/.env"
  echo "Edit it with real secrets, then rerun this script."
  exit 2
fi

set -a
# shellcheck disable=SC1091
. "$APP_DIR/.env"
set +a

required_values=(DOMAIN POSTGRES_APP_PASSWORD PASSWORD_PEPPER SMTP_HOST EMAIL_FROM)
for key in "${required_values[@]}"; do
  value="${!key:-}"
  if [ -z "$value" ] || [[ "$value" == replace-* ]]; then
    echo "Set a real value for ${key} in ${APP_DIR}/.env, then rerun this script." >&2
    exit 3
  fi
done

if [[ "${SMTP_PASS:-}" == replace-* ]]; then
  echo "Set SMTP_PASS in ${APP_DIR}/.env, then rerun this script." >&2
  exit 3
fi

echo "Ensuring PostgreSQL database and role exist"
docker exec -i postgres psql -U admin -d postgres -v app_password="$POSTGRES_APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE technsports LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'technsports')\gexec

SELECT format('ALTER ROLE technsports WITH PASSWORD %L', :'app_password')\gexec

SELECT 'CREATE DATABASE technsports OWNER technsports'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'technsports')\gexec

GRANT ALL PRIVILEGES ON DATABASE technsports TO technsports;
SQL

cd "$APP_DIR"

echo "Stopping existing TechnSports compose project if present"
docker compose down --remove-orphans || true

echo "Building TechnSports images"
docker compose build

echo "Starting TechnSports"
docker compose up -d

echo "Deployment complete. Check with:"
echo "  docker compose ps"
echo "  docker compose logs -f api web"
