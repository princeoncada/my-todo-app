> **DEPRECATED**: Content consolidated into `docs/PHASE_LOG.md` (Phase 1: Dexie Foundation section). This file is retained for detailed checkpoint reference.

# Phase 1: Dexie Foundation

## Goal
Add the local-first foundation in small validated checkpoints without changing runtime behavior until the integration checkpoint.

## Current Baseline
Tidy already has optimistic updates, TanStack Query cache coordination, debounced reorder saves, dnd-kit drag/drop, and tRPC server persistence.

Current pending writes are not durable across refresh, crash, or offline state. Phase 1 starts by adding Dexie foundation pieces safely before UI integration.

## Branch Structure
- Umbrella branch: `phase/dexie-foundation`
- Checkpoint branches branch from `phase/dexie-foundation`.
- Checkpoint branches merge back into `phase/dexie-foundation` only after validation.
- `phase/dexie-foundation` merges into `master` only after all Phase 1 checkpoints pass.

Checkpoint branches:

- `checkpoint/docs-roadmap`
- `checkpoint/install-dexie-db-shell`
- `checkpoint/local-schema-types`
- `checkpoint/outbox-operation-types`
- `checkpoint/local-repository-helpers`
- `checkpoint/sync-status-model`
- `checkpoint/first-dexie-integration`
- `checkpoint/expand-dexie-coverage`

## Checkpoint Rules
- One checkpoint = one narrow concern.
- Do not combine dependency install, schema, repositories, UI integration, and sync behavior in one checkpoint.
- Keep docs, runtime code, tests, and validation updates in separate commits where practical.
- Runtime checkpoints must add or update matching tests in the same branch.
- Docs-only checkpoints do not need new tests unless they change test infrastructure.
- Every checkpoint must update this phase log with files changed, validation run, risks, and next step.

## Phase 1 Checkpoint Plan

### 1. checkpoint/docs-roadmap
Purpose:

- Create this phase log.
- Link Phase 1 from the AI entrypoint/backlog if needed.
- No runtime behavior change.

Validation:

- `git status`
- `git diff --stat`
- Confirm only `docs/ai` files changed.
- No package files changed.
- No runtime source changed.

### 2. checkpoint/install-dexie-db-shell
Purpose:

- Install Dexie.
- Create local DB shell only.
- Do not connect UI yet.

Expected validation:

- `npm install`
- `npm run test:ci`
- `npm run build` if environment supports it.
- Manual app smoke through `npm run dev` if available.

### 3. checkpoint/local-schema-types
Purpose:

- Define local entity types and table shape.
- Keep server schema unchanged.
- No UI integration yet.

Expected validation:

- `npm run typecheck`
- `npm run test`
- `npm run test:ci` when practical.

### 4. checkpoint/outbox-operation-types
Purpose:

- Define outbox operation types.
- Include `operationId`, `entityType`, `operationType`, `payload`, `status`, `retryCount`, and timestamps.
- No sync worker yet.

Expected validation:

- `npm run typecheck`
- `npm run test`
- Unit tests if helper logic is introduced.

### 5. checkpoint/local-repository-helpers
Purpose:

- Add local repository helper functions.
- Keep helpers pure and isolated.
- Do not replace existing TanStack/tRPC flow yet.

Expected validation:

- Add/update unit tests for helper behavior.
- `npm run test`
- `npm run test:ci` when practical.

### 6. checkpoint/sync-status-model
Purpose:

- Add sync status model only.
- Define `local`, `pending`, `syncing`, `synced`, and `failed`.
- No user-facing sync UI yet unless explicitly scoped.

Expected validation:

- `npm run typecheck`
- `npm run test`
- Update docs if model semantics change.

### 7. checkpoint/first-dexie-integration
Purpose:

- Connect one small low-risk feature to Dexie.
- Keep existing server behavior compatible.
- Do not rewrite drag/drop or all mutations.

Expected validation:

- Add/update tests matching the changed behavior.
- `npm run test:ci`
- Authenticated E2E if the changed behavior touches dashboard persistence and credentials are available.
- Manual dashboard check from `docs/testing-validation.md`.

### 8. checkpoint/expand-dexie-coverage
Purpose:

- Expand local-first coverage only after first integration is stable.
- Keep scope controlled.
- Do not introduce full sync worker unless this branch is explicitly re-scoped.

Expected validation:

- Add/update tests matching the changed behavior.
- `npm run test:ci`
- `npm run test:e2e:auth` when credentials/storage state are available.
- Manual drag/drop, refresh, and rapid-action validation.

## Validation Source Of Truth
Do not duplicate the full testing rules here.

Reference these docs instead:

- `docs/testing-validation.md`
- `docs/testing.md`
- `ai-docs/testing-workflow.md`
- `docs/ai/13-testing-and-validation.md`

Validation rules for Phase 1:

- `npm run test:ci` is the default implementation validation command.
- Authenticated dashboard E2E requires `tests/.auth/user.json`, real Supabase public env vars, and `DATABASE_URL`.
- If authenticated E2E cannot run, document the exact missing credential/service.
- Do not silently skip dashboard-auth validation for dashboard behavior.

## Manual Phase 1 Regression Checklist
Use this list when runtime behavior changes:

- App starts with `npm run dev`.
- User can log in.
- Dashboard loads existing data.
- Create, rename, delete, and refresh a list.
- Create, rename, delete, and refresh an item.
- Reorder items within the same list.
- Move an item across lists.
- Drop an item into an empty list.
- Reorder lists.
- Switch views.
- Create tag/view filtering still works.
- Rapid create/rename/reorder does not duplicate or lose records.
- Refresh after actions keeps the expected state.
- Browser console has no new Dexie, hydration, dnd-kit, tRPC, or React errors.
- Network tab does not show unexpected request spam.

## Merge Gate
A checkpoint can merge into `phase/dexie-foundation` only when:

- Scope stayed inside the checkpoint.
- Required docs were updated.
- Required tests were added or updated for runtime changes.
- Required validation commands were run or skipped with exact reason.
- No unrelated source churn exists.
- Known risks are written in this phase log.

`phase/dexie-foundation` can merge into `master` only when:

- All checkpoints are complete or intentionally deferred.
- `npm run test:ci` passes.
- `npm run build` passes where environment supports it.
- Authenticated E2E was run if dashboard behavior changed and credentials are available.
- Manual dashboard validation is documented.
- No partially working local-first/sync system is merged.

## Non-Goals For Phase 1
- Do not implement Redis.
- Do not implement Sentry.
- Do not implement QStash.
- Do not implement Inngest.
- Do not implement full CRDT/multiplayer sync.
- Do not rewrite drag/drop.
- Do not rewrite all tRPC endpoints.
- Do not make Dexie the full source of truth until integration is intentionally scoped.
- Do not merge unstable sync behavior into master.

## Checkpoint Log

### checkpoint/docs-roadmap
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `docs/ai/phase-logs/phase-1-dexie-foundation.md`, `docs/ai/00-ai-entrypoint.md`, `docs/ai/backlog.md`.
- Validation run: File review, `git status --short --branch`, `git diff --stat`, and scope check.
- Manual validation: Confirmed this checkpoint is documentation-only and references existing testing docs instead of duplicating them.
- Known risks: Later runtime checkpoints can still overreach unless each branch keeps to one narrow concern and updates this log before merge.
- Next checkpoint: `checkpoint/install-dexie-db-shell`.

### checkpoint/install-dexie-db-shell
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `package.json`, `package-lock.json`, `lib/local-db/tidy-db.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm install dexie`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e:smoke`, `npm run test:ci`, `npm run build`, and a temporary `npm run dev` browser console check for `/` and `/login`.
- Manual validation: Public landing page and `/login` loaded through the dev server with zero browser console errors. No UI/server/query/DND behavior was intentionally changed, and the Dexie shell is not imported by app UI.
- Known risks: The DB shell currently exposes only a placeholder metadata store. Future checkpoints must add real local schema/types before any UI integration and must keep IndexedDB access browser-safe.
- Next checkpoint: `checkpoint/local-schema-types`.

### checkpoint/local-schema-types
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/local-schema.ts`, `lib/local-db/tidy-db.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test` attempted without escalation and failed with sandbox `spawn EPERM`; `npm run test:ci` passed and included unit tests plus non-auth E2E; `npm run build` passed; temporary `npm run dev` browser console check for `/` and `/login` passed.
- Manual validation: Public landing page and `/login` loaded through the dev server with zero browser console errors. Local schema remains disconnected from UI, tRPC, TanStack Query, drag/drop, repositories, and sync behavior.
- Known risks: Local schema names and indexes are initial foundation choices and may need adjustment once repository helpers and outbox operation types make access patterns concrete. Version remains `1` because no released local data migration exists yet.
- Next checkpoint: `checkpoint/outbox-operation-types`.

### checkpoint/outbox-operation-types
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/outbox-schema.ts`, `lib/local-db/tidy-db.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck` passed; `npm run lint` passed; `npm run test` passed; `npm run build` passed; `npm run test:ci` first failed when `tsc --noEmit` started before generated Prisma browser files were available while `npm run build` was running, then passed on rerun after Prisma generation completed.
- Manual validation: Existing dev server browser check loaded `/` and `/login` with zero browser console errors. Outbox types and the Dexie store remain disconnected from UI, tRPC, TanStack Query, drag/drop, repositories, sync workers, and server replay.
- Known risks: Outbox payloads are JSON-compatible but not yet entity-specific. Operation coalescing, replay ordering, idempotency semantics, retry behavior, and user-facing sync failure handling are intentionally deferred. The outbox store is part of the pre-release Dexie `version(1)` schema.
- Next checkpoint: `checkpoint/local-repository-helpers`.

### checkpoint/local-repository-helpers
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/local-repositories.ts`, `tests/unit/local-repositories.test.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck` passed; `npm run lint` passed; `npm run test` passed with 2 files and 13 tests; `npm run test:ci` passed including 4 non-auth E2E tests; `npm run build` passed.
- Manual validation: Existing dev server browser check loaded `/` and `/login` with zero browser console errors. Repository helpers remain disconnected from UI, tRPC, TanStack Query, drag/drop, sync workers, and server replay.
- Known risks: Dexie-backed `put*` helpers are thin wrappers and are not integrated or E2E-covered yet because no user-facing behavior changed. Outbox creation is generic and does not yet enforce entity-specific payload contracts. No repository read/query helpers, transactions, sync replay, or conflict handling exist yet.
- Next checkpoint: `checkpoint/sync-status-model`.

### checkpoint/sync-status-model
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/sync-status.ts`, `tests/unit/sync-status.test.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck` passed; `npm run lint` passed; `npm run test` passed with 3 files and 20 tests; `npm run build` passed; `npm run test:ci` first failed when broad app types could not resolve cleanly while `npm run build` was generating Prisma output, then passed on rerun after build completed including 4 non-auth E2E tests.
- Manual validation: Existing dev server browser check loaded `/` and `/login` with zero browser console errors. Sync status constants and guards remain disconnected from UI, tRPC, TanStack Query, drag/drop, Dexie repository behavior, sync workers, and server replay.
- Known risks: Status helpers define only local type guards and terminal/retryable semantics. They do not enforce state transitions, operation replay order, conflict handling, user-visible sync status, or server idempotency yet.
- Next checkpoint: `checkpoint/first-dexie-integration`.

### checkpoint/first-dexie-integration
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/metadata-repository.ts`, `hooks/use-local-db-health-check.ts`, `trpc/client.tsx`, `tests/unit/local-db-metadata.test.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck` first failed because test fakes depended on the full Dexie `Table` type; the helper dependency was narrowed to the `get`/`put` methods it uses. After that fix, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e:smoke`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Existing dev server browser check loaded `/` and `/login` with zero browser console errors and confirmed `localDbSchemaVersion`, `localDbInitializedAt`, and `lastLocalDbHealthCheckAt` metadata exist in `tidy-local-db`. No authenticated dashboard validation was run because dashboard behavior was not changed.
- Known risks: This is metadata-only Dexie integration. It does not make views, lists, items, tags, relations, or outbox operations local-first. It does not add sync UI, sync workers, replay, rollback, conflict handling, or server idempotency. IndexedDB failures are reported by helper snapshots but are not surfaced to users yet.
- Next checkpoint: `checkpoint/expand-dexie-coverage`.

### checkpoint/expand-dexie-coverage
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/local-db-diagnostics.ts`, `tests/unit/local-db-diagnostics.test.ts`, `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e:smoke`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Existing dev server browser check loaded `/` and `/login` with zero browser console errors, confirmed `localDbSchemaVersion` is `1`, and confirmed the expected Dexie stores exist: `views`, `lists`, `listItems`, `tags`, `viewTags`, `listTags`, `viewLists`, `outboxOperations`, and `metadata`. Authenticated E2E was skipped because dashboard behavior was not changed.
- Known risks: Diagnostics are read-only and do not validate real dashboard local-first behavior. Phase 1 still has no sync worker, outbox replay, operation coalescing, conflict handling, rollback recovery, or user-facing sync status UI.
- Next checkpoint: Phase 1 final review / merge gate.

## Final Phase 1 Merge-Gate Note
- Do not merge `phase/dexie-foundation` into `master` until `npm run test:ci` passes.
- `npm run build` should pass when the environment supports Prisma and Next build requirements.
- Manual dashboard regression should be documented before the phase branch merge.
- No partially working sync worker, outbox replay, or dashboard local-first source-of-truth behavior should be present in the merge.
