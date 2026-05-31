# Phase Log

Chronological record of all implementation phases and their checkpoint validation results.

---

## Phase 1.0.0: AI Workflow Foundation  -  COMPLETE

**Version**: 1.0.0-alpha -> 1.0.0-stable
**Date**: 2026-05-28
**Branch**: (committed directly to master / current branch)

### What Was Done
Introduced the full HFK-style AI workflow infrastructure to tidy:
- `STATE.json` oracle (version, state, phase, phase title, next phase)
- `docs/VERSIONING.md`  -  version history, five-location versioning rules
- `docs/WORKFLOW.md`  -  Claude Code + Codex session protocol
- `docs/COMPACT_STRATEGY.md`  -  token budget rules, ChromaDB query discipline
- `docs/AI_HANDOFF.md`, `docs/PHASE_LOG.md`, `docs/FUTURE_PLANS.md`, `docs/DECISIONS.md`, `docs/CODEX_RULES.md`
- `scripts/ingest_docs.py`, `scripts/query_docs.py`  -  ChromaDB doc querying
- `scripts/validate.ps1`, `scripts/promote.ps1`  -  validation and promotion automation
- `requirements.txt`, `docs/SESSION_LOG/`
- Updated `AGENTS.md` with Session Start Protocol and Implementation Gate
- Updated `docs/ai/00-ai-entrypoint.md` with version comment; deprecated old workflow docs

### Known Risks
- ChromaDB is not yet seeded (requires `npm run chroma` + `python scripts/ingest_docs.py` to activate query discipline)
- Graphify integration is planned for v1.1.0  -  code navigation still requires direct file reads

---

## Phase 3: View Filter Hardening  -  IN PROGRESS (pre-1.0.0)

**Target version**: 1.3.0
**Branch**: `phase/view-filter-hardening` (checkpoints on `checkpoint/*`)
**Phase log detail**: this section (consolidated from `docs/ai/phase-logs/phase-3-view-filter-hardening.md`)

### Goal
Fix and harden view/list/tag projection consistency without changing the dashboard source of truth or expanding Dexie coverage.

**Known issue**: Lists created in All Lists or custom views do not consistently appear in other custom views even when their filter tags should match. The `listMatchesView` ANY-mode logic was the root cause.

### Hard Restrictions
- Do not expand Dexie coverage
- Do not make Dexie the dashboard source of truth
- Do not rewrite drag/drop, all TanStack Query behavior, or all tRPC endpoints
- Do not touch Prisma schema unless a real relation bug requires it
- Do not combine multiple checkpoints

### Target Projection Rules
- All Lists shows all user lists
- ANY mode: lists with at least one required tag
- ALL mode: lists with all required tags
- Custom views with no required tags: match no lists (current design)
- Creating, moving, or retagging a list must update all qualifying custom views consistently
- Reordering must not change tag-based visibility

### Checkpoint Log

**checkpoint/phase-three-roadmap**  -  Done (2026-05-10)
- Files: `phase-3-view-filter-hardening.md`, `00-ai-entrypoint.md`, `backlog.md`
- Validation: docs-only scope check
- Risks: Later checkpoints must prove bugs with tests before broad fixes

**checkpoint/reproduce-view-filter-bug**  -  Done (2026-05-10)
- Files: `tests/unit/dashboard-cache.test.ts`, phase log
- Validation: typecheck [done] lint [done] test [done] (11 files, 90 tests, 1 expected failure documenting ANY-mode bug)
- Risks: Uses `it.fails` to document the bug; next checkpoint adds broader tests

**checkpoint/add-projection-regression-tests**  -  Done (2026-05-10)
- Files: `tests/unit/dashboard-cache.test.ts`, phase log
- Validation: typecheck [done] lint [done] test [done] (11 files, 96 tests, 2 expected failures for ANY-mode gaps)
- Risks: ANY-mode tests remain expected failures until fix checkpoint

**checkpoint/fix-view-list-projection**  -  Done (2026-05-10)
- Files: `lib/dashboard-cache.ts`, `tests/unit/dashboard-cache.test.ts`, phase log
- Validation: typecheck [done] lint [done] test [done] (11 files, 98 tests, 0 expected failures)
- Risks: Fixes core ANY-mode helper; live tag relation cache consistency and cross-view moves still untested

**checkpoint/fix-tag-relation-consistency**  -  Done (2026-05-10)
- Files: `tests/unit/dashboard-cache.test.ts`, phase log
- Validation: typecheck [done] lint [done] test [done] (11 files, 102 tests); `test:e2e:smoke` timed out (180s)
- Risks: Tag relation covered at cache helper level; live authenticated dashboard tag flows need manual/auth E2E. Smoke E2E should rerun before phase merge.

**checkpoint/fix-cross-view-list-moves**  -  [in progress] ACTIVE
- Purpose: Fix cross-view behavior when a list is created, moved, retagged, or reordered while switching views. A list must appear in every view it qualifies for and disappear from views it no longer qualifies for. Reorder must not alter tag membership.
- Target validation: add/update tests -> typecheck [done] lint [done] test [done] `test:e2e:smoke` [done]

### Final Validation / Merge Documentation
- Purpose: Finalize docs, validation evidence, known risks, and next phase recommendations before merge/promotion.
- Target: `npm run test:ci` [done], `npm run build` [done], smoke E2E [done], auth E2E if available.
- This is a merge-gate documentation step, not a numbered implementation checkpoint.

### Merge Gate
`phase/view-filter-hardening` -> `master` requires:
- Projection regression tests pass
- `npm run test:ci` passes
- Authenticated E2E runs if credentials available
- Manual dashboard regression documented
- No hidden dashboard source-of-truth rewrite

---

## Phase 2: Outbox Sync Queue  -  COMPLETE (pre-1.0.0)

**Branch**: `phase/outbox-sync-queue` (ready for merge review)

### Goal
Build a durable outbox sync queue on top of Phase 1 without replacing the whole app data flow at once.

### What Was Done
All 8 checkpoints completed. Added:
- Outbox operation model finalization + type guards
- Isolated outbox repository helpers (enqueue, getPending, markSyncing/Synced/Failed, etc.)
- Pure operation coalescing rules (collapse updates, delete discards, create+delete discardable)
- Client-side sync replay service with injected transport, retry handling, status transitions
- Server sync endpoint contract validation helpers
- Hidden/debug sync status display model
- Unit test coverage for every runtime helper layer

### Runtime Behavior Intentionally Unchanged
Dashboard data still from server/TanStack/tRPC. No auto-running sync worker. No live sync endpoint registered. No visible sync status UI. No Redis/Sentry/QStash/CRDT/local-first rewrite.

### Phase 2 Remaining Gaps
- Live server endpoint still needs: database ownership, entity existence, permission, payload semantics, order value, idempotency persistence checks
- Replay ordering needs entity dependency review before connecting to real mutations
- Dexie discard/sync transitions implemented as helpers only  -  no global worker applies them
- Failed operation UX is display model only  -  no drawer, retry control, or user-facing recovery

### Checkpoint Log (Summary)

| Checkpoint | Status | Date | Key Files |
|---|---|---|---|
| phase-two-roadmap | Done | 2026-05-10 | docs only |
| outbox-model-finalization | Done | 2026-05-10 | `lib/local-db/outbox-schema.ts`, tests |
| outbox-repository-helpers | Done | 2026-05-10 | `lib/local-db/outbox-repository.ts`, tests |
| outbox-coalescing-rules | Done | 2026-05-10 | `lib/local-db/outbox-coalescing.ts`, tests |
| sync-replay-client | Done | 2026-05-10 | `lib/local-db/sync-replay-client.ts`, tests |
| sync-endpoint-contract | Done | 2026-05-10 | `lib/sync/sync-endpoint-contract.ts`, tests |
| basic-sync-status-surface | Done | 2026-05-10 | `lib/sync/sync-status-surface.ts`, tests |
| phase-two-regression-docs | Done | 2026-05-10 | docs only; build blocked by Google font fetch in env |

All validation: typecheck [done] lint [done] unit tests [done] (11 files, 90 tests); smoke E2E [done] where run.

---

## Phase 1: Dexie Foundation  -  COMPLETE (pre-1.0.0)

**Branch**: `phase/dexie-foundation` (merged to master)

### Goal
Add the local-first foundation in small validated checkpoints without changing runtime behavior until the integration checkpoint.

### What Was Done
All 8 checkpoints completed. Added:
- Dexie v4 package install + local DB shell (`lib/local-db/tidy-db.ts`)
- Local schema + entity types (`lib/local-db/local-schema.ts`)
- Outbox operation types with store registration (`lib/local-db/outbox-schema.ts`)
- Local repository helpers  -  `putLocalList`, `putLocalListItem`, etc. (`lib/local-db/local-repositories.ts`)
- Sync status model + constants + terminal/retryable guards (`lib/local-db/sync-status.ts`)
- Metadata-only Dexie integration  -  health check hook, `localDbSchemaVersion`, `localDbInitializedAt` (`lib/local-db/metadata-repository.ts`, `hooks/use-local-db-health-check.ts`)
- Local DB diagnostics  -  stores existence check, schema version read (`lib/local-db/local-db-diagnostics.ts`)
- Unit tests: 3 files, 20 tests at merge

### Invariants
- Dexie stores: `views`, `lists`, `listItems`, `tags`, `viewTags`, `listTags`, `viewLists`, `outboxOperations`, `metadata`
- `localDbSchemaVersion` = 1 (pre-release; no migration needed before go-live)
- All helpers are isolated from UI, tRPC, TanStack Query, drag/drop, sync workers

### Non-Goals
Redis, Sentry, QStash, Inngest, full CRDT/multiplayer sync, drag/drop rewrite, full tRPC endpoint rewrite, Dexie as full source of truth.

### Checkpoint Log (Summary)

| Checkpoint | Status | Date | Key Files |
|---|---|---|---|
| docs-roadmap | Done | 2026-05-10 | docs only |
| install-dexie-db-shell | Done | 2026-05-10 | `package.json`, `lib/local-db/tidy-db.ts` |
| local-schema-types | Done | 2026-05-10 | `lib/local-db/local-schema.ts`, `tidy-db.ts` |
| outbox-operation-types | Done | 2026-05-10 | `lib/local-db/outbox-schema.ts`, `tidy-db.ts` |
| local-repository-helpers | Done | 2026-05-10 | `lib/local-db/local-repositories.ts`, tests |
| sync-status-model | Done | 2026-05-10 | `lib/local-db/sync-status.ts`, tests |
| first-dexie-integration | Done | 2026-05-10 | `lib/local-db/metadata-repository.ts`, `hooks/use-local-db-health-check.ts`, `trpc/client.tsx`, tests |
| expand-dexie-coverage | Done | 2026-05-10 | `lib/local-db/local-db-diagnostics.ts`, tests |

All validation: typecheck [done] lint [done] test [done] (progressing to 3 files, 20 tests) smoke E2E [done] build [done].
