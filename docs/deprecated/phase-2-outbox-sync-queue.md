> **DEPRECATED**: Content consolidated into `docs/PHASE_LOG.md` (Phase 2: Outbox Sync Queue section). This file is retained for detailed checkpoint reference.

# Phase 2: Outbox Sync Queue

## Goal
Build a durable outbox sync queue on top of the Phase 1 Dexie foundation without replacing the whole app data flow at once.

## Current Baseline
Phase 1 added Dexie foundation, local schema, outbox types, local repositories, sync status helpers, and metadata/diagnostics coverage.

The current UI still primarily uses the existing server/TanStack/tRPC flow. Lists, items, views, tags, drag/drop, and optimistic updates are not fully local-first yet.

Phase 2 starts making queued local operations reliable, testable, and ready for gradual integration.

## Branch Structure
- Umbrella branch: `phase/outbox-sync-queue`
- Checkpoint branches branch from `phase/outbox-sync-queue`.
- Checkpoint branches merge back into `phase/outbox-sync-queue` only after validation.
- `phase/outbox-sync-queue` merges into `master` only after all Phase 2 gates pass.

Checkpoint branches:

- `checkpoint/phase-two-roadmap`
- `checkpoint/outbox-model-finalization`
- `checkpoint/outbox-repository-helpers`
- `checkpoint/outbox-coalescing-rules`
- `checkpoint/sync-replay-client`
- `checkpoint/sync-endpoint-contract`
- `checkpoint/basic-sync-status-surface`
- `checkpoint/phase-two-regression-docs`

## Checkpoint Plan

### 1. checkpoint/phase-two-roadmap
Purpose:

- Create this Phase 2 log.
- Reconcile Phase 1 documentation status if needed.
- No runtime behavior change.

Validation:

- `git status`
- `git diff --stat`
- Confirm docs-only change.

### 2. checkpoint/outbox-model-finalization
Purpose:

- Finalize outbox operation shape and semantics.
- Ensure `operationId`, `idempotencyKey`, `status`, and retry metadata are consistent.
- Add type guards if needed.
- No replay worker yet.

Validation:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 3. checkpoint/outbox-repository-helpers
Purpose:
Add isolated Dexie helpers for:

- `enqueueOutboxOperation`
- `getPendingOutboxOperations`
- `markOutboxOperationSyncing`
- `markOutboxOperationSynced`
- `markOutboxOperationFailed`
- `markOutboxOperationDiscarded`
- `incrementRetryCount`
- `getOutboxOperationById`

Rules:

- Helpers must be isolated.
- Do not connect to UI yet.
- Do not connect to mutations yet.

Validation:

- Add/update unit tests.
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 4. checkpoint/outbox-coalescing-rules
Purpose:
Add pure coalescing logic for pending operations.

Coalescing rules:

- Multiple updates on the same entity collapse to latest update.
- Multiple reorders collapse to latest order payload.
- Delete discards pending updates for the same entity.
- Create followed by delete can be discarded if unsynced.
- Move plus reorder should keep only final visible state where possible.
- Coalescing must be pure/tested before runtime integration.

Validation:

- Add unit tests for each coalescing rule.
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 5. checkpoint/sync-replay-client
Purpose:
Add client-side sync replay foundation.

Allowed:

- A pure replay service that reads pending operations and calls a provided transport function.
- Retry handling.
- Status transitions.
- No automatic background interval yet unless explicitly tiny and disabled by default.

Required:

- `idempotencyKey` must be passed to transport.
- Replay must process in safe order.
- Replay must stop or isolate failures safely.
- Failed operations must not block unrelated safe operations unless ordering requires it.

Do not:

- Wire it into all app mutations yet.
- Auto-run sync globally without guardrails.
- Replace current server writes.

Validation:

- Unit tests with mocked transport.
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 6. checkpoint/sync-endpoint-contract
Purpose:
Add server-side sync endpoint contract or documented contract.

Preferred:

- Start with contract/types and validation helpers before full endpoint behavior.
- If endpoint is added, keep it disabled or unused by UI unless explicitly scoped.
- Validate `operationId`, `idempotencyKey`, user ownership, payload shape, entity type, and operation type.

Do not:

- Trust client ownership.
- Accept unlimited payload size.
- Replay destructive operations without validation.

Validation:

- Unit tests for validation helpers.
- API tests if endpoint is added.
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 7. checkpoint/basic-sync-status-surface
Purpose:
Add a tiny non-invasive sync status surface.

Allowed:

- Dev-only diagnostics component, or
- hidden/debug status utility, or
- minimal non-blocking indicator.

Do not:

- Add complex failed operation drawer yet.
- Redesign UI.
- Change dashboard data source.

Validation:

- Smoke E2E.
- Manual browser console check.
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e:smoke`

### 8. checkpoint/phase-two-regression-docs
Purpose:
Finalize Phase 2 docs, validation evidence, known risks, and next phase recommendations.

Validation:

- `npm run test:ci`
- `npm run build` if env supports it.
- Manual dashboard regression.
- Confirm no hidden local-first rewrite.

## Phase 2 Manual Regression Checklist
Use when runtime behavior changes:

- App starts with `npm run dev`.
- Landing page loads.
- Login page loads.
- Dashboard loads existing server data.
- Create list still works.
- Rename list still works.
- Delete list still works.
- Create item still works.
- Rename item still works.
- Delete item still works.
- Reorder items within same list still works.
- Move item across lists still works.
- Drop item into empty list still works.
- Reorder lists still works.
- Switch views still works.
- Refresh keeps expected server state.
- Browser console has no Dexie, IndexedDB, hydration, tRPC, DND, or React errors.
- Network tab does not show unexpected request spam.
- Failed sync test does not corrupt visible state, if sync replay is integrated.
- Outbox operations do not duplicate after retry.

## Phase 2 Merge Gate
A checkpoint can merge into `phase/outbox-sync-queue` only when:

- Scope stayed inside checkpoint.
- Tests were added or updated for runtime behavior.
- Validation commands were run or skipped with exact reason.
- No unrelated refactors.
- Phase log updated.
- Known risks documented.

`phase/outbox-sync-queue` can merge into `master` only when:

- `npm run test:ci` passes.
- `npm run build` passes where env supports it.
- Smoke E2E passes.
- Authenticated E2E runs if dashboard behavior changed and credentials are available.
- Manual dashboard regression is documented.
- No unstable sync worker behavior is auto-running unexpectedly.
- No full dashboard local-first rewrite snuck into this phase.

## Phase 2 Final Review
Phase 2 added the outbox sync queue foundation, not full local-first dashboard behavior.

Completed foundation pieces:

- Outbox operation model validation.
- Isolated outbox repository helpers.
- Pure operation coalescing rules.
- Client replay service with injected transport.
- Server sync endpoint contract validation helpers.
- Hidden/debug sync status display model.
- Unit coverage for each runtime helper layer.

Runtime behavior intentionally not changed:

- Dashboard data still comes from the existing server, TanStack Query, and tRPC flow.
- Existing list, item, view, tag, drag/drop, and optimistic update behavior was not replaced.
- No automatic background sync worker was mounted.
- No live sync endpoint was registered.
- No visible sync status UI was mounted.
- No Redis, Sentry, QStash, Inngest, CRDT, or full local-first rewrite was introduced.

Phase 2 remaining gaps:

- Live server endpoint implementation still needs database ownership, entity existence, permission, payload semantic, order value, and idempotency persistence checks.
- Replay ordering still needs entity dependency review before connecting to real mutations.
- Dexie discard/sync transitions are implemented as helpers, but no global worker applies them automatically.
- Failed operation UX is still only a display model, not a drawer, retry control, or user-facing recovery flow.
- Authenticated dashboard E2E should run before any future checkpoint that touches dashboard behavior.

Next recommended phase:

- `phase/sync-endpoint-integration` or a similarly scoped branch for the live server endpoint and first guarded client transport.
- Keep it isolated from dashboard local-first migration.
- Do not wire all dashboard mutations into outbox replay in one branch.
- Start with one low-risk operation and add ownership/idempotency tests before broader integration.

## Phase 1 Documentation Reconciliation
Reviewed `docs/ai/phase-logs/phase-1-dexie-foundation.md`.

No reconciliation edit was needed during `checkpoint/phase-two-roadmap`; the Phase 1 log already includes entries for:

- `checkpoint/local-repository-helpers`
- `checkpoint/sync-status-model`
- `checkpoint/first-dexie-integration`
- `checkpoint/expand-dexie-coverage`

## Checkpoint Log

### checkpoint/phase-two-roadmap
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`, `docs/ai/00-ai-entrypoint.md`, `docs/ai/backlog.md`.
- Validation run: `git status --short --branch`, `git diff --stat`, and docs-only scope review.
- Manual validation: Confirmed no runtime source files were intentionally changed.
- Known risks: Phase 2 can easily overreach into dashboard source-of-truth changes. Keep each checkpoint narrow and update this log before merge.
- Next checkpoint: `checkpoint/outbox-model-finalization`.

### checkpoint/outbox-model-finalization
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/outbox-schema.ts`, `tests/unit/outbox-schema.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Not required for this checkpoint because the changes are pure model/type guards and are not connected to UI, mutations, tRPC, TanStack Query, drag/drop, sync replay, or server endpoints.
- Known risks: Guards validate operation shape and JSON-compatible payloads only. They do not validate entity ownership, entity existence, payload semantics per operation type, replay order, coalescing behavior, or server idempotency yet.
- Next checkpoint: `checkpoint/outbox-repository-helpers`.

### checkpoint/outbox-repository-helpers
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/outbox-repository.ts`, `tests/unit/outbox-repository.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:ci`, `npm run build`, and `npm run test:e2e:smoke` passed.
- Manual validation: Not required for this checkpoint because the helpers are isolated and are not connected to UI, mutations, tRPC, TanStack Query, drag/drop, sync replay, or server endpoints.
- Known risks: Helpers only enqueue, read, and transition outbox records. They do not coalesce operations, replay operations, validate entity ownership, enforce server idempotency, or change dashboard data flow yet.
- Next checkpoint: `checkpoint/outbox-coalescing-rules`.

### checkpoint/outbox-coalescing-rules
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/outbox-coalescing.ts`, `tests/unit/outbox-coalescing.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Not required for this checkpoint because coalescing is pure logic and is not connected to UI, mutations, tRPC, TanStack Query, drag/drop, sync replay, or server endpoints.
- Known risks: Coalescing currently handles generic operation-level rules only. It does not apply discard markers to Dexie, inspect operation-specific payload semantics, validate entity ownership, or guarantee server replay safety. Move/reorder coalescing assumes the latest operation payload represents the final visible state.
- Next checkpoint: `checkpoint/sync-replay-client`.

### checkpoint/sync-replay-client
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/local-db/sync-replay-client.ts`, `tests/unit/sync-replay-client.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Not required for this checkpoint because replay is an isolated service with injected transport and is not connected to UI, mutations, tRPC, TanStack Query, drag/drop, automatic background jobs, or server endpoints.
- Known risks: Replay currently calls an injected transport only. It does not define the server endpoint contract, validate server ownership, auto-run in the app, persist advanced ordering constraints, or surface failed operations to users. Failed operations are isolated and retried later, but entity-level dependency ordering still needs endpoint/replay contract review.
- Next checkpoint: `checkpoint/sync-endpoint-contract`.

### checkpoint/sync-endpoint-contract
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/sync/sync-endpoint-contract.ts`, `tests/unit/sync-endpoint-contract.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Not required for this checkpoint because this adds contract validation helpers only. No tRPC router, API route, UI, mutation, TanStack Query, drag/drop, or automatic replay behavior was connected.
- Known risks: The live server endpoint is still not implemented. Contract validation checks request shape, idempotency key, authenticated user match, payload size, replayable status, entity/operation compatibility, and basic payload requirements, but it does not yet validate database ownership, entity existence, operation permission, order values against persisted state, or idempotency persistence.
- Next checkpoint: `checkpoint/basic-sync-status-surface`.

### checkpoint/basic-sync-status-surface
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/sync/sync-status-surface.ts`, `tests/unit/sync-status-surface.test.ts`, `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- Validation run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e:smoke`, `npm run test:ci`, and `npm run build` passed.
- Manual validation: Not required for this checkpoint because this adds a hidden/debug status display model only. No visible UI was mounted, and no tRPC, TanStack Query, drag/drop, mutation, automatic replay, or dashboard source-of-truth behavior was changed.
- Known risks: The status surface summarizes operation counts only. It does not read from Dexie, subscribe to live queue changes, expose a visible indicator, provide retry controls, or show failed operation details yet.
- Next checkpoint: `checkpoint/phase-two-regression-docs`.

### checkpoint/phase-two-regression-docs
- Status: Ready for review with build blocked by external font fetch.
- Date: 2026-05-10.
- Files changed: `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`, `docs/ai/backlog.md`.
- Validation run: `npm run test:ci` was attempted. `npm run typecheck`, `npm run lint`, and `npm run test` completed successfully inside that run with 11 unit test files and 90 tests passing. The command timed out during the Playwright segment. User reran `npm run test:e2e`, which passed 4 tests in 10.9s. `npm run build` was attempted and failed because Next/Turbopack could not fetch `Geist` and `Geist Mono` from Google Fonts. Network escalation for the build rerun was declined.
- Manual validation: Documentation review only. Runtime behavior is not changed in this checkpoint.
- Known risks: Phase 2 remains foundation-only. Future implementation can still overreach by wiring replay into dashboard mutations before the live endpoint, ownership checks, idempotency persistence, and failure UX are ready. Production build still needs to be rerun in an environment that can fetch Next Google fonts or after fonts are made local.
- Next checkpoint: Phase 2 merge gate / next phase planning.
