# TechnSports

TechnSports is a PostgreSQL-backed Zimbabwe football data platform. React/Next.js renders public data from the NestJS API; Prisma is the only runtime source for competitions, seasons, teams, fixtures, players, contributors, transfers, articles and verified match facts.

## Local setup with npm

Requirements: Node.js 22+ and PostgreSQL 16+.

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Create the PostgreSQL database named in `DATABASE_URL`.
3. Install and migrate:

```powershell
npm install
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`. The API health check is `http://localhost:4000/api/v1/health` and now verifies the database connection.

There is deliberately no runtime demo dataset. Use `/admin` with an ADMIN account to create a competition, season, teams, season registrations and fixtures. Use `npm run db:studio` for controlled local database inspection.

## Local setup with Docker

Requirements: Docker Desktop with at least several GB of free disk space for image builds.

The Compose stack includes PostgreSQL, Redis, Mailpit, the NestJS API and the Next.js web app:

```powershell
docker compose up -d postgres redis mailpit
docker compose up --build -d api web
```

Open:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/v1/health`
- Mailpit inbox: `http://localhost:8025`
- Docker PostgreSQL host port: `5433`

To load demo data into the Docker database:

```powershell
$env:ALLOW_DEMO_SEED='true'
docker compose --profile seed run --rm seed
```

The demo accounts are:

```txt
admin@demo.technsports.test
collector1@demo.technsports.test
collector2@demo.technsports.test
reviewer@demo.technsports.test
editor@demo.technsports.test
```

Use the password in `DEMO_PASSWORD`.

Compose uses Mailpit by default for local container email delivery, so verification emails are visible in the Mailpit inbox. For production, replace the `DOCKER_SMTP_*` values with real SMTP secrets and do not enable `ALLOW_DEMO_SEED`.

## Email verification

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM` and `WEB_URL`. Signup stores only a SHA-256 hash of the 30-minute verification token. Accounts cannot sign in until the link is confirmed. When SMTP is omitted in development, Nodemailer uses its JSON transport; production refuses to start without SMTP configuration.

For real delivery, configure SPF, DKIM and DMARC for the domain used by `EMAIL_FROM`.

## Security

- Opaque, random sessions are stored hashed in PostgreSQL and delivered through HttpOnly, SameSite=Strict cookies. Production uses the `__Host-` cookie prefix and Secure cookies.
- Passwords use salted scrypt plus a deployment-specific `PASSWORD_PEPPER`.
- Signup, verification and login routes are rate limited. Five failed logins trigger a 15-minute account lock.
- Helmet security headers, an explicit CORS allowlist, request-size limits and DTO allowlisting are enabled.
- Admin endpoints require an authenticated ADMIN role. Editorial uploads also accept EDITOR. `ADMIN_API_KEY` is an optional operational fallback and has no built-in default.
- Uploaded logos and covers are limited to 5 MB, renamed with random identifiers, and validated from file signatures. SVG and executable content are rejected.

## Team administration

The club form supports name, short name, city, founded year, website, brand colours and a logo. Logos can be uploaded as validated JPG, PNG or WebP files or supplied as a trusted URL. The resulting `crestUrl` is stored on `Team` and returned through all public team and fixture APIs.

## Fixtures, league table and ticket payments

The public fixtures page uses paginated match data from `/api/v1/public/matches-page`, with upcoming and finished matches separated. The league table is not manually edited: `/api/v1/public/standings/:seasonId` recalculates played, wins, draws, losses, goals, goal difference, points and last-five form from fixtures marked `FINISHED`.

Ticket orders can be paid manually by an admin or automatically through payment webhooks. Configure `PAYMENT_WEBHOOK_SECRET` or a provider-specific secret such as `PAYNOW_WEBHOOK_SECRET`, then point the gateway to:

```txt
POST /api/v1/tickets/webhooks/:provider
```

Send `publicRef`, successful `status`, optional `paymentReference`, `amountMinor` and `currency`, with the shared secret in `X-TechnSports-Webhook-Secret`. Successful webhooks mark the ticket order paid and issue QR tickets.

## Production

For a single-server Docker deployment, use `docker-compose.prod.yml` with Caddy HTTPS:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

See `docs/deployment.md` for the full production runbook.

Apply migrations before starting the API if you run outside Docker. Use unique PostgreSQL, `PASSWORD_PEPPER`, SMTP and optional admin-key secrets from a secret manager. Serve the web and API over HTTPS. Uploaded files should be moved to private object storage with CDN delivery for horizontally scaled deployments.
