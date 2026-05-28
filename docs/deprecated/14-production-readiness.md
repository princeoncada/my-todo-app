# Production Readiness

## Purpose
Track what is required to make Tidy safer for production deployment and ongoing operation.

## Current Implementation
The app has a production-oriented stack but limited operational scaffolding.

Implemented:

- Supabase auth.
- PostgreSQL through Prisma 7 and `@prisma/adapter-pg`.
- tRPC protected procedures.
- Next metadata.
- Batched SQL reorder writes for performance.
- Dev measurement utilities for optimistic flows.

Missing or incomplete:

- Automated tests.
- Production telemetry/error reporting.
- Durable offline queue.
- Rate limiting.
- Audit logs.
- PWA manifest/service worker.
- Data migration/backfill playbooks.
- Security review of every mutation.

## Important Files
- `package.json`: build/start scripts.
- `next.config.ts`: currently empty.
- `app/layout.tsx`: metadata and providers.
- `lib/db.ts`: database connection.
- `lib/supabase/*`: auth/session.
- `trpc/init.ts`: protected procedure middleware.
- `trpc/routers/*`: API surface.
- `prisma/schema.prisma`: indexes, constraints, cascades.
- `lib/optimistic-debug.tsx`: development instrumentation.

## Data Flow
Production request:

1. Browser hits Next route.
2. `proxy.ts` guards `/dashboard`.
3. Client tRPC requests batch to `/api/trpc`.
4. tRPC creates context from Supabase cookies/session.
5. Routers perform Prisma reads/writes.
6. Optimistic UI may show success before server confirmation.

Operationally sensitive flows:

- Reorders use raw SQL batch updates.
- Tag changes trigger custom view recompute.
- Logout clears client cache.
- Auth confirmation redirects based on sanitized `next`.

## Invariants
- Never expose cross-user data. Server-side ownership checks are required.
- Raw SQL must include ownership or prior ownership validation.
- Production logging should not leak sensitive task content.
- Database migrations must preserve existing users' view/list memberships.
- Recompute jobs should avoid long interactive transactions.

## Known Risks
- No central error reporting means failed optimistic saves may be console-only.
- No retry/backoff strategy for failed queued writes.
- No rate limiting on tRPC procedures.
- No health checks documented.
- No explicit env var docs beyond inferred `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL`, `PORT`.
- Missing `public/apple-icon.png` while metadata references it.

## What Codex Should Read Before Editing
- Deployment/build changes: `package.json`, `next.config.ts`, this doc.
- Database changes: `03-data-model.md`, `prisma/schema.prisma`, migrations.
- Auth/API changes: `04-auth-and-api.md`.
- Sync/offline changes: `06-optimistic-sync.md`, `10-mobile-and-pwa-readiness.md`.

## What Codex Must Update After Editing
- Update this file for env vars, deployment scripts, observability, rate limits, migrations, PWA/offline production behavior, or security posture.
- Update `docs/FUTURE_PLANS.md` production readiness and observability sections.
- Update `13-testing-and-validation.md` with deployment validation steps.
