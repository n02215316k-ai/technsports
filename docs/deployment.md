# TechnSports production deployment

This deployment runs the full application on a Docker-enabled Linux server:

- Caddy terminates HTTPS and renews certificates automatically.
- Next.js serves the web app internally on port `3000`.
- NestJS serves the API internally on port `4000`.
- PostgreSQL and Redis are private Docker services with persistent volumes.
- Uploaded images are stored in the `uploads_data` Docker volume.

## 1. Server prerequisites

Point your domain's DNS `A` record to the server public IP before starting Caddy.

On the server, install:

```bash
docker --version
docker compose version
git --version
```

Open firewall ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Copy environment file

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set real values:

- `DOMAIN`
- `ACME_EMAIL`
- `POSTGRES_PASSWORD`
- `PASSWORD_PEPPER`
- SMTP settings
- `EMAIL_FROM`

Do not enable `ALLOW_DEMO_SEED` on a real production database.

Generate strong secrets with:

```bash
openssl rand -base64 48
```

## 3. Build and start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

The API container runs Prisma migrations automatically before starting.

Check status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api web caddy
```

Health check:

```bash
curl -I https://YOUR_DOMAIN/
curl https://YOUR_DOMAIN/api/v1/health
```

## 4. Backups

Create a PostgreSQL backup:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U technsports -d technsports > technsports-$(date +%F).sql
```

Copy the database backup and uploaded files off the server regularly.

## 5. Updates

After pulling or copying new code:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## 6. Rollback basics

Keep a database backup before major releases. If a deployment fails, inspect:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api web caddy
```

Then rebuild or redeploy the previous application version.
