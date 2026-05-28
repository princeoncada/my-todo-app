<!-- Current Version: 1.0.0-alpha -->

> **DEPRECATED — WORKFLOW LAYER**: This file's orientation and invariants content has been migrated to `docs/AI_HANDOFF.md`. Implementation rules have moved to `docs/CODEX_RULES.md`. The feature doc routing table below remains useful as a reference; for the full session start protocol read `AGENTS.md` and `docs/WORKFLOW.md`.

# AI Entrypoint

## Purpose
This is the first file future Codex sessions should read for Tidy. Its job is to reduce repo scanning by pointing to compact, repo-specific docs before touching code.

## Versioning and Workflow

Read `STATE.json` before this file. It is the compact oracle for the current version, active phase, and any in-progress branch — faster than reading VERSIONING.md.

- `STATE.json` — current version, phase, nextPhase, active branch
- `docs/WORKFLOW.md` — full Claude Code + Codex session protocol (prompt format, phase cycle, session checkpoints)
- `docs/VERSIONING.md` — version history, pre-versioning baseline, planned phases
- `docs/COMPACT_STRATEGY.md` — token budget rules, ChromaDB query discipline, what not to read
- `docs/SESSION_LOG/` — per-session checkpoint logs (written at end of unfinished phases)

Every implementation PR must update the relevant `docs/ai/*.md` file and `docs/ai/backlog.md` in the same PR.

Every implementation must add or update matching tests in the same branch. Read `docs/testing-validation.md` before implementation work so the happy path, common cases, edge cases, unit coverage, and E2E coverage are identified before coding.

Use `docs/ai/task-routing-guide.md` before opening many files. The routing guide is intended to keep future AI sessions focused on the smallest relevant docs and source files. `docs/ai/codex-prompt-template.md` provides a reusable prompt format for handing focused implementation tasks from ChatGPT to Codex.

Read `docs/ai/16-local-first-product-roadmap.md` before implementing major sync, persistence, offline, rollback, or product-readiness work.

Read `docs/ai/phase-logs/phase-1-dexie-foundation.md` before any Phase 1 Dexie/local-first foundation checkpoint work.

Read `docs/ai/phase-logs/phase-2-outbox-sync-queue.md` before any Phase 2 outbox sync queue checkpoint work.

Read `docs/ai/phase-logs/phase-3-view-filter-hardening.md` before any Phase 3 view/filter/tag projection checkpoint work.

## Mandatory Branch Isolation For Architecture Work

Before implementing:

- local-first persistence
- sync systems
- rollback rewrites
- reorder rewrites
- offline support
- database architecture changes
- heavy query refactors
- background job systems

You MUST:

1. Create a dedicated `phase/*` branch.
2. Keep the implementation isolated.
3. Validate stability before merge.
4. Avoid direct development on master/main.

This is mandatory for all future product-readiness phases.

## Current Implementation
Tidy is a Next.js 16, React 19, TypeScript strict productivity app with Supabase auth, tRPC 11, TanStack Query 5, Prisma 7, PostgreSQL, dnd-kit, shadcn/radix, and Tailwind v4.

The main product surface is the authenticated dashboard:

- Route: `app/dashboard/page.tsx`
- Shell: `components/Dashboard.tsx`
- Interaction-heavy grid: `components/list/ListsContainer.tsx`
- Optimistic queue: `hooks/useOptimisticSync.ts`
- Dashboard cache helpers: `lib/dashboard-cache.ts`
- API router root: `trpc/routers/_app.ts`
- Auth middleware/context: `trpc/init.ts`
- Prisma schema: `prisma/schema.prisma`
- Prisma generated client output: `app/generated/prisma`

## Important Files
- `AGENTS.md`: mandatory repo instruction. This project uses a newer Next.js with breaking changes. If `node_modules/next/dist/docs/` exists, read the relevant Next guide before editing app code.
- `docs/ai/codex-prompt-template.md`: copy-paste handoff template for ChatGPT-planned, Codex-executed tasks.
- `docs/ai/task-routing-guide.md`: task-to-doc routing map to avoid broad repo scanning.
- `docs/ai/01-product-current-state.md`: what the app currently does.
- `docs/ai/02-repo-map.md`: where code lives and what owns what.
- `docs/ai/03-data-model.md`: Prisma models, ownership, ordering, and view membership.
- `docs/ai/04-auth-and-api.md`: Supabase, tRPC, protected procedures, request flow.
- `docs/ai/05-dashboard-state-cache.md`: TanStack Query cache shape and projection rules.
- `docs/ai/06-optimistic-sync.md`: queue semantics and optimistic mutation contracts.
- `docs/ai/07-drag-and-drop.md`: list, item, and view drag flow.
- `docs/ai/08-views-tags-system.md`: custom views, tags, recompute behavior.
- `docs/ai/09-ui-components.md`: component map and UI conventions.
- `docs/ai/10-mobile-and-pwa-readiness.md`: responsive and PWA state.
- `docs/ai/11-known-issues.md`: current bugs and risky areas.
- `docs/ai/12-implementation-rules.md`: must-follow engineering rules.
- `docs/ai/13-testing-and-validation.md`: what to run and what to manually verify.
- `docs/ai/14-production-readiness.md`: deployment and operational gaps.
- `docs/ai/15-decision-log.md`: important decisions and why they exist.
- `docs/ai/16-local-first-product-roadmap.md`: product-readiness roadmap for local-first sync, outbox queues, rollback safety, scale prep, security, observability, and background jobs.
- `docs/ai/phase-logs/phase-1-dexie-foundation.md`: Phase 1 Dexie foundation checkpoints, validation gates, and phase log.
- `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`: Phase 2 outbox sync queue checkpoints, validation gates, and phase log.
- `docs/ai/phase-logs/phase-3-view-filter-hardening.md`: Phase 3 view/filter/tag projection hardening checkpoints, validation gates, and phase log.
- `docs/ai/backlog.md`: living implementation backlog.

## Data Flow

1. Browser renders `app/layout.tsx`, which mounts `TRPCReactProvider`, `QueryClientProvider`, and `AuthSync`.
2. `/dashboard` is guarded by `proxy.ts`, which calls `lib/supabase/proxy.ts` to refresh/verify Supabase auth.
3. `app/dashboard/page.tsx` renders `components/Dashboard.tsx`.
4. `Dashboard` lays out account nav, `ListAdder`, `ViewsSidebarPreview`, and `ListsContainer`.
5. Client components call tRPC query options from `trpc/client.tsx`.
6. tRPC requests hit `app/api/trpc/[trpc]/route.ts`, then `trpc/init.ts` creates context from Supabase and `protectedProcedure` exposes `ctx.userId`.
7. Routers in `trpc/routers/` read/write PostgreSQL through `lib/db.ts` and the generated Prisma client.
8. The dashboard writes optimistic changes into TanStack Query caches first, then queues server saves.

## Invariants
- All dashboard data is user-scoped by Supabase user id.
- `ViewList.order` owns list order inside each view.
- `ListItem.order` owns item order inside each list.
- `view.getViewListsWithItems({ viewId: allListsView.id })` is the canonical full dashboard list/item/tag payload.
- `view.getCurrentViewListsWithItems` is a bootstrap query for the persisted selected view, not the only source of current dashboard state.
- Drag hover state stays local. Cache writes happen on stable events such as drop, create, delete, rename, tag toggle, or completion toggle.
- Optimistic-only objects must not be sent to server reorder endpoints.
- Heavy custom view recompute work should stay outside short Prisma interactive transactions unless there is a proven reason.

## Known Risks
- Some list item mutations do not currently verify ownership through the parent list. See `docs/ai/11-known-issues.md`.
- There is no automated test suite yet beyond lint/type/build scripts.
- PWA/offline support is aspirational. The app has responsive UI and metadata, but no service worker, manifest, or offline queue persistence.
- `node_modules` may not exist in fresh Codex workspaces. If so, do not claim Next.js 16 docs were checked locally.

## What Codex Should Read Before Editing
- Any code task: this file, `task-routing-guide.md`, `12-implementation-rules.md`, and `13-testing-and-validation.md`.
- Any implementation task: also read `docs/testing-validation.md` before coding and plan matching tests.
- Use `task-routing-guide.md` first, then read only the smallest matching feature docs.
- Dashboard/list/item task: `05-dashboard-state-cache.md`, `06-optimistic-sync.md`, `07-drag-and-drop.md`, `09-ui-components.md`.
- Tags/views task: `05-dashboard-state-cache.md`, `08-views-tags-system.md`, `03-data-model.md`.
- Auth/API task: `04-auth-and-api.md`, `03-data-model.md`.
- Prisma/database task: `03-data-model.md`, `14-production-readiness.md`.
- Mobile/PWA task: `10-mobile-and-pwa-readiness.md`, `09-ui-components.md`.
- Major sync, persistence, offline, rollback, or product-readiness task: `16-local-first-product-roadmap.md`, `06-optimistic-sync.md`, `14-production-readiness.md`.
- Phase 1 Dexie/local-first foundation task: `phase-logs/phase-1-dexie-foundation.md`, `16-local-first-product-roadmap.md`, `06-optimistic-sync.md`.
- Phase 2 outbox sync queue task: `phase-logs/phase-2-outbox-sync-queue.md`, `phase-logs/phase-1-dexie-foundation.md`, `16-local-first-product-roadmap.md`, `06-optimistic-sync.md`.
- Phase 3 view/filter/tag projection task: `phase-logs/phase-3-view-filter-hardening.md`, `05-dashboard-state-cache.md`, `08-views-tags-system.md`, `06-optimistic-sync.md`.

## What Codex Must Update After Editing
- Update the most relevant `docs/ai/*.md` file with changed behavior, files, data flow, invariants, or risks.
- Update `docs/ai/backlog.md`: mark completed work, add discovered bugs/risks, and add follow-up validation tasks.
- If a decision changes, update `docs/ai/15-decision-log.md`.
- If a new API procedure, model, query key, or optimistic scope is added, update the relevant docs in the same PR.
