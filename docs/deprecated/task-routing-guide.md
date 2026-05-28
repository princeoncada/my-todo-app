# Task Routing Guide

Use this guide after reading `docs/AI_HANDOFF.md` and before opening many source files. Pick the smallest doc set that matches the task.

## Always Read
- `docs/CODEX_RULES.md` before implementation.
- `docs/ai/13-testing-and-validation.md` before validation.
- `docs/ai/11-known-issues.md` for bug fixes or risky behavior changes.

## Route by Task Type

| Task type | Read these docs |
| --- | --- |
| Optimistic mutation, rollback, sync queue, or cache consistency issue | `docs/ai/05-dashboard-state-cache.md`, `docs/ai/06-optimistic-sync.md`, `docs/ai/11-known-issues.md` |
| TanStack Query key, dashboard projection, stale data, or invalidation issue | `docs/ai/05-dashboard-state-cache.md`, `docs/ai/06-optimistic-sync.md` |
| Drag-and-drop list/item/view issue | `docs/ai/07-drag-and-drop.md`, plus `docs/ai/05-dashboard-state-cache.md` if cache writes are involved |
| UI, styling, shadcn/radix, responsive layout, or component composition | `docs/ai/09-ui-components.md`, plus `docs/ai/10-mobile-and-pwa-readiness.md` for mobile behavior |
| Auth, Supabase session, tRPC context, protected route, or API ownership issue | `docs/ai/04-auth-and-api.md`, `docs/ai/03-data-model.md`, `docs/ai/11-known-issues.md` |
| PWA, offline, installability, metadata, or mobile readiness | `docs/ai/10-mobile-and-pwa-readiness.md`, `docs/ai/14-production-readiness.md` |
| Prisma schema, ordering fields, ownership model, migrations, or generated client usage | `docs/ai/03-data-model.md`, `docs/ai/14-production-readiness.md` |
| Tags, custom views, view membership, or recompute behavior | `docs/ai/08-views-tags-system.md`, `docs/ai/05-dashboard-state-cache.md`, `docs/ai/03-data-model.md` |
| Bugfix with unclear ownership | `docs/ai/11-known-issues.md`, `docs/CODEX_RULES.md`, then the smallest matching feature docs above |
| Production readiness, deployment, environment variables, or operational risk | `docs/ai/14-production-readiness.md`, `docs/ai/13-testing-and-validation.md` |
| Documentation-only AI workflow change | `docs/AI_HANDOFF.md`, `docs/CODEX_RULES.md`, `docs/ai/13-testing-and-validation.md` |

## Source File Strategy

- Open source files only after choosing the relevant docs.
- Prefer known entry points from `docs/AI_HANDOFF.md` and `docs/ai/02-repo-map.md`.
- Avoid whole-repo scans unless docs and targeted searches are insufficient.
- If behavior changes, update the relevant `docs/ai/*.md` file so future agents can route faster.
