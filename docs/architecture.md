# TechnSports product and architecture blueprint

## Product surfaces

1. Public data: live scores, fixtures, match centres, tables, team/player profiles, transfers and searchable season history.
2. Editorial: Zimbabwe football news, analysis, match previews and structured story links to players, clubs and competitions.
3. Contributor operations: match assignments, scoped collection tasks, low-connectivity capture, submission history and quality/reputation feedback.
4. Data administration: identity resolution, conflict review, fixture/roster management, audit logs and publication controls.
5. Data science: derived metrics, player comparisons, form models, exports and (later) a paid API.

## Crowdsourcing integrity model

Raw observations are immutable. A submission records contributor, assignment, match clock, device time, received time and an idempotency key. The consensus service groups candidate observations by match, event type, subject and a configurable time window. Agreement between independent contributors raises confidence; disagreement creates a review case. High-impact facts such as goals, cards and final lineups require either two-source agreement or editor approval. Published facts retain provenance back to every observation.

Collectors are assigned narrow scopes such as lineup, event timeline, player actions or team totals. This permits several people to work on one match without duplicating every action. Offline submissions queue locally and synchronize when connectivity returns.

## Automatic statistics and profile records

Club and player totals are projections of verified `MatchFact` records, never separately entered totals. Every query can be filtered by season, competition, venue and home/away/neutral context. A goal fact contributes to the scoring club and player career record; card facts contribute to club discipline and the player's club-period record; approved lineups produce appearances and minutes. Corrections supersede facts and trigger affected projections to rebuild.

Transfers retain actual fee, currency, disclosure status and source independently of estimated market value. Market valuations are timestamped estimates with a named methodology and confidence; they must never be presented as confirmed transfer fees. Articles link to players through structured relevance records, allowing player and club news pages to populate automatically.

## Player identity and missing lineups

All player events reference the permanent canonical `Player.id`; names, aliases, clubs and shirt numbers never act as identifiers. The match collector candidate list is built in priority order from a confirmed lineup, season registrations and recent appearances. This means collection can start before a lineup is available.

If a player is absent from those candidates, the collector submits an identity claim containing the supplied name and team. Claims are normalized so independent collectors can agree on the same provisional subject, but they remain excluded from player career totals. A reviewer resolves the claim to an existing canonical player or deliberately creates a new player after checking aliases, registration, date of birth and prior clubs. Resolving a claim relinks its observations and rebuilds affected aggregates. A transfer creates a new registration, never a new player.

## Event aggregation and possession

Verified events include goals, shots, touches, free kicks, corners, fouls, penalties, cards, substitutions and timed possession intervals. Goal and shot events retain scoring method and distance; foul events retain both the offender and fouled player. Numerical observations use bounded consensus tolerances (for example, two metres for distance) while categorical values must agree exactly.

Possession is never inferred from touches. Collectors record team possession intervals, and the published percentage is `team verified seconds / both teams verified seconds × 100`. With no verified duration, both sides return zero rather than a fabricated 50/50 value.

## Offline-first collection

The web application installs a service worker for its collection shell and stores failed or offline POST requests in IndexedDB with their original idempotency keys. It flushes the queue in creation order on reconnection. Server-side duplicate protection makes retries safe. The production application should additionally surface queue age, device clock drift and assignments that require manual conflict review.

## Crowdsourced transfers

Transfer reports are separate from confirmed transfers. A report includes canonical player ID, origin and destination clubs, type, effective date, disclosed fee/currency and source URL. Two independent matching contributors establish consensus; an editor must still approve the claim before it creates the canonical transfer and a new player registration.

## Recommended production stack

- Web: Next.js + React + TypeScript, CSS design tokens, TanStack Query for mutable/live views, Recharts for visual analytics.
- API: NestJS REST/OpenAPI plus WebSocket gateways. Keep the API modular (identity, competitions, matches, stats, contributions, editorial).
- Data: PostgreSQL with Prisma; Redis for presence, pub/sub, caching and BullMQ jobs; S3-compatible object storage for media.
- Analytics: a separate Python service using FastAPI, Polars and scikit-learn once derived models justify it. Start with SQL materialized views.
- Search: PostgreSQL full-text first; OpenSearch only when search volume or faceting requires it.
- Operations: Docker Compose locally; managed containers and managed PostgreSQL in production; GitHub Actions, OpenTelemetry, Prometheus/Grafana and Sentry.

## Delivery phases

- Phase 1: competition/season registry, fixtures, match centre, table, players, news and manual admin.
- Phase 2: contributor onboarding, assignments, offline capture, consensus, review queue and audit trail.
- Phase 3: advanced player/team metrics, transfer registry, data-quality dashboards and public API.
- Phase 4: predictive models, video-event linking, club dashboards and commercial data feeds.

## Zimbabwe-specific considerations

Model stadium aliases, neutral venues, postponed/abandoned matches, incomplete historical squads, multiple player-name spellings, promotion/relegation and competition rule changes per season. Keep bandwidth low, support installable PWA/offline capture, expose Africa/Harare times, and design SMS/WhatsApp operational alerts as adapters rather than core data channels.
# Runtime data and security update

As of July 2026, PostgreSQL through Prisma is the sole runtime system of record. Public Next.js pages call `/api/v1/public/*`; no frontend demo-data module or JSON persistence fallback remains. Match observations, identity claims, transfer reports, published facts, users and sessions are persisted relationally.

Authentication uses verified email addresses, salted scrypt password hashes with a deployment pepper, opaque hashed database sessions, strict cookies, login throttling and temporary account lockout. SMTP delivery is provided by Nodemailer. Administrative writes use authenticated roles, with an optional deployment-defined emergency API key.

Team images pass through the authenticated image endpoint, which validates file signatures, applies a 5 MB limit and stores a random filename. Local disk is supported for a single-node installation; production clusters should replace this adapter with S3-compatible object storage.
