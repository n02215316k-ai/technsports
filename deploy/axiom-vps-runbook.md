# TechnSports deployment on the Axiom Africa VPS

This deployment is designed for the existing VPS architecture:

- Nginx Proxy Manager routes public traffic.
- The public container name remains `technsports`.
- The API runs privately as `technsports-api`.
- PostgreSQL and Redis use the existing `backend` network.
- No random public ports are bound.

## Server path

```bash
/srv/docker/websites/technsports
```

## Required one-time PostgreSQL setup

Run as root/sudo on the server. Replace the password with the same `POSTGRES_APP_PASSWORD` from `.env`.

```bash
docker exec -i postgres psql -U admin -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'technsports') THEN
    CREATE ROLE technsports LOGIN PASSWORD 'REPLACE_WITH_POSTGRES_APP_PASSWORD';
  ELSE
    ALTER ROLE technsports WITH PASSWORD 'REPLACE_WITH_POSTGRES_APP_PASSWORD';
  END IF;
END
$$;

SELECT 'CREATE DATABASE technsports OWNER technsports'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'technsports')\gexec

GRANT ALL PRIVILEGES ON DATABASE technsports TO technsports;
SQL
```

## Start or update app

From `/srv/docker/websites/technsports`:

```bash
docker compose down
docker compose build
docker compose up -d
docker compose logs -f api web
```

## Nginx Proxy Manager

The existing proxy host for `technsports.co.zw` should forward to:

```text
Forward Hostname/IP: technsports
Forward Port: 3000
Scheme: http
```

Enable:

```text
Block Common Exploits
Websockets Support
Force SSL
HTTP/2 Support
```

## Optional demo seed

Only for a demo deployment, not a real production database:

```bash
ALLOW_DEMO_SEED=true DEMO_PASSWORD='DemoPass!2026' docker compose --profile seed run --rm seed
```

## Verify

```bash
curl -I https://technsports.co.zw/
curl https://technsports.co.zw/api/v1/health
docker logs --tail=100 technsports-api
docker logs --tail=100 technsports
```
