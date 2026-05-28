> **DEPRECATED**: Content migrated to `docs/FUTURE_PLANS.md` (NOW/NEXT/LATER items, active phases, known risks). This file is retained for reference but is no longer the source of truth.

# AI Backlog

## Purpose
Living backlog for future Codex sessions. Keep this updated in every implementation PR so future agents can choose focused work without broad source scanning.

## Current Implementation
This backlog is organized by execution horizon:

- **NOW**: high-risk correctness/security/data-loss issues that should be prioritized.
- **NEXT**: important product, reliability, and maintainability improvements after NOW is stable.
- **LATER**: larger investments, polish, or future architecture work.

Each item includes priority, status, files, acceptance criteria, and validation notes.

## Important Files
- `docs/ai/*.md`: docs that must stay in sync.
- `trpc/routers/*`: API/security backlog.
- `components/list/*`, `components/views/*`: dashboard UX backlog.
- `hooks/useOptimisticSync.ts`, `lib/dashboard-cache.ts`: sync/cache backlog.
- `prisma/schema.prisma`: data/model backlog.
- `app/layout.tsx`, `public/*`: metadata/PWA backlog.

## Data Flow
When implementation work completes:

1. Mark completed backlog items or add follow-ups.
2. Update the relevant feature doc.
3. Add decision-log entries for architectural choices.
4. Keep item metadata accurate: priority, status, files, acceptance criteria, and validation notes.

## Invariants
- Every future implementation must update the relevant docs and backlog in the same PR.
- Keep security and data-loss risks near the top of execution priority.
- Do not delete unresolved items without explanation; mark as completed, superseded, or moved with a short note.
- Do not edit runtime source for documentation-only backlog maintenance.

## Status Legend
- `Open`: not started.
- `In progress`: currently being implemented in an active branch.
- `Blocked`: cannot proceed without an external decision/dependency.
- `Done`: completed and should include a PR/commit note before eventual archival.
- `Superseded`: no longer applicable because another change made it obsolete.

## Local-First Product Readiness
- Dexie local database foundation
- Outbox mutation queue
- Operation coalescing
- Sync worker
- Sync status UI
- Rollback-safe error handling
- Query splitting and scale prep
- Security hardening later
- Observability later
- Background jobs later

## Phase 1: Dexie Foundation
- **Priority:** High / local-first foundation.
- **Status:** In progress.
- **Phase log:** `docs/ai/phase-logs/phase-1-dexie-foundation.md`.
- **Umbrella branch:** `phase/dexie-foundation`.
- **Checkpoint branches:**
  - `checkpoint/docs-roadmap`
  - `checkpoint/install-dexie-db-shell`
  - `checkpoint/local-schema-types`
  - `checkpoint/outbox-operation-types`
  - `checkpoint/local-repository-helpers`
  - `checkpoint/sync-status-model`
  - `checkpoint/first-dexie-integration`
  - `checkpoint/expand-dexie-coverage`
- **Acceptance criteria:**
  - Each checkpoint stays scoped to one concern.
  - Runtime checkpoints add/update matching tests.
  - `npm run test:ci` is the default implementation validation command.
  - `phase/dexie-foundation` does not merge to `master` with partially working local-first or sync behavior.
- **Validation notes:**
  - Use `docs/testing-validation.md`, `docs/testing.md`, `ai-docs/testing-workflow.md`, and `docs/ai/13-testing-and-validation.md` as validation source of truth.
  - Docs-only checkpoints do not require new tests unless test infrastructure changes.

## Phase 2: Outbox Sync Queue
- **Priority:** High / durable sync foundation.
- **Status:** Done on `phase/outbox-sync-queue`; pending phase merge review.
- **Phase log:** `docs/ai/phase-logs/phase-2-outbox-sync-queue.md`.
- **Umbrella branch:** `phase/outbox-sync-queue`.
- **Checkpoint branches:**
  - `checkpoint/phase-two-roadmap`
  - `checkpoint/outbox-model-finalization`
  - `checkpoint/outbox-repository-helpers`
  - `checkpoint/outbox-coalescing-rules`
  - `checkpoint/sync-replay-client`
  - `checkpoint/sync-endpoint-contract`
  - `checkpoint/basic-sync-status-surface`
  - `checkpoint/phase-two-regression-docs`
- **Acceptance criteria:**
  - Done: each checkpoint stayed scoped to one concern.
  - Done: runtime checkpoints added matching unit tests.
  - Done: outbox replay and sync status work was introduced as isolated foundation code.
  - Done: no unstable auto-running sync behavior or hidden full dashboard local-first rewrite was introduced.
- **Validation notes:**
  - Use `docs/testing-validation.md`, `docs/testing.md`, `ai-docs/testing-workflow.md`, and `docs/ai/13-testing-and-validation.md` as validation source of truth.
  - Authenticated E2E is required when dashboard behavior changes and credentials/storage state are available.
  - Docs-only checkpoints do not require new tests unless test infrastructure changes.
  - Final checkpoint validation: typecheck, lint, unit tests, and non-auth E2E passed; `npm run build` must be rerun in an environment with access to Next Google font fetches or after fonts are made local.

## Phase 3: View Filter Hardening
- **Priority:** High / projection correctness.
- **Status:** In progress.
- **Phase log:** `docs/ai/phase-logs/phase-3-view-filter-hardening.md`.
- **Umbrella branch:** `phase/view-filter-hardening`.
- **Checkpoint branches:**
  - `checkpoint/phase-three-roadmap`
  - `checkpoint/reproduce-view-filter-bug`
  - `checkpoint/add-projection-regression-tests`
  - `checkpoint/fix-view-list-projection`
  - `checkpoint/fix-tag-relation-consistency`
  - `checkpoint/fix-cross-view-list-moves`
  - `checkpoint/manual-regression-docs`
- **Problem:**
  - Lists created in All Lists or custom views do not consistently appear in other custom views even when filter tags should match.
- **Acceptance criteria:**
  - All Lists shows all user lists.
  - ANY custom views include lists with at least one required tag.
  - ALL custom views include lists with all required tags.
  - Retagging, creating, moving, reordering, refreshing, and switching views keeps projection deterministic.
  - Runtime checkpoints add/update matching projection tests.
  - No Dexie expansion, dashboard source-of-truth rewrite, drag/drop rewrite, or broad tRPC rewrite is introduced.
- **Validation notes:**
  - Start with `lib/dashboard-cache.ts`, `tests/unit/dashboard-cache.test.ts`, view/list/tag components, and tRPC view/tag/list routers.
  - Use `docs/testing-validation.md`, `docs/testing.md`, `ai-docs/testing-workflow.md`, and `docs/ai/13-testing-and-validation.md` as validation source of truth.
  - Authenticated E2E is required for dashboard behavior if credentials/storage state are available.

## NOW

### NOW-1: Close list item ownership gaps
- **Priority:** P0 / security.
- **Status:** Open.
- **Files:** `trpc/routers/listItemRouter.ts`, `docs/ai/04-auth-and-api.md`, `docs/ai/03-data-model.md`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** `listItem.getListItems`, `renameListItem`, `deleteListItem`, and `setCompletionListItem` are protected but do not verify `parentList.userId`.
- **Acceptance criteria:**
  - Each affected procedure scopes reads/writes through `parentList.userId === ctx.userId` or an equivalent prechecked owned parent list.
  - Foreign item ids return `FORBIDDEN` or `NOT_FOUND` consistently without mutating data.
  - Existing optimistic item rename/delete/completion behavior and return shapes remain compatible with current components.
  - Relevant AI docs describe the final ownership behavior.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Add or run API-level ownership tests if a test harness exists.
  - Manually verify item rename, delete, and completion still work for the owning user.

### NOW-2: Verify target list ownership in item reorder/move
- **Priority:** P0 / security + data integrity.
- **Status:** Open.
- **Files:** `trpc/routers/listItemRouter.ts`, `components/list/ListsContainer.tsx`, `docs/ai/04-auth-and-api.md`, `docs/ai/07-drag-and-drop.md`.
- **Problem:** `listItem.reorderListItems` verifies existing item ownership, but the raw SQL update accepts target `listId` values from the client and should explicitly prove all target lists belong to the same user.
- **Acceptance criteria:**
  - Reorder validates both item ids and target list ids against `ctx.userId` before raw SQL runs.
  - Cross-list moves among the user's own lists still work.
  - Empty reorder input still returns `{ success: true }`.
  - Error behavior for foreign target lists is documented.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually drag an item within one list and across two owned lists.
  - Add an API/security regression test when test infrastructure exists.

### NOW-3: Add automated coverage for dashboard cache projection
- **Priority:** P1 / data-loss and regression prevention.
- **Status:** In progress.
- **Files:** `lib/dashboard-cache.ts`, `components/list/types.ts`, test config/files to be introduced, `docs/ai/05-dashboard-state-cache.md`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** Cross-cache projections drive optimistic list/tag/item behavior, but no automated tests currently protect custom-view filtering, selected-view projection, or rollback assumptions.
- **Acceptance criteria:**
  - Tests cover `selectedViewFromCache`, `projectView`, list update/removal helpers, tag add/remove projection, and view-selection cache projection.
  - Tests include custom views matching all tags and all-lists behavior.
  - Test setup is documented in `13-testing-and-validation.md`.
- **Validation notes:**
  - Initial `tests/unit/dashboard-cache.test.ts` coverage exists for `selectedViewFromCache`, `projectView`, and `listMatchesView`.
  - Still add coverage for list update/removal helpers, tag add/remove projection, and view-selection cache projection.
  - Run the new targeted test command plus `npm run typecheck` and `npm run lint`.
  - Verify tests do not require a live database unless explicitly documented.

### NOW-4: Add ownership/API tests for protected tRPC procedures
- **Priority:** P1 / security regression prevention.
- **Status:** Open.
- **Files:** `trpc/init.ts`, `trpc/routers/*.ts`, test setup/files to be introduced, `docs/ai/04-auth-and-api.md`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** Security-sensitive ownership behavior is mostly documented but not automatically enforced by tests.
- **Acceptance criteria:**
  - Tests cover at least list, list item, tag, and view ownership failures.
  - Tests prove unauthenticated calls to protected procedures fail with `UNAUTHORIZED`.
  - Test data setup/teardown is repeatable and documented.
- **Validation notes:**
  - Prefer router-level tests with a test database or a documented mock strategy.
  - Run `npm run typecheck`, `npm run lint`, and the new API test command.

### NOW-5: Fix obvious metadata/asset mismatch
- **Priority:** P1 / production correctness.
- **Status:** Open.
- **Files:** `app/layout.tsx`, `public/icon-clean.png`, optional `public/apple-icon.png`, `docs/ai/02-repo-map.md`, `docs/ai/10-mobile-and-pwa-readiness.md`.
- **Problem:** Metadata references `/apple-icon.png`, but the current public file list only includes `icon-clean.png`.
- **Acceptance criteria:**
  - Either add a valid Apple icon asset or remove/update the metadata reference.
  - Metadata continues to reference existing icon assets.
  - Docs/backlog no longer claim the asset is missing after the fix.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - If adding/changing image assets, inspect the file and confirm dimensions/type are appropriate.

## NEXT

### NEXT-1: Fix auth and landing-page copy polish
- **Priority:** P2 / UX polish.
- **Status:** Open.
- **Files:** `components/auth/Register.tsx`, `app/page.tsx`, `docs/ai/01-product-current-state.md`, `docs/ai/09-ui-components.md`.
- **Problem:** Register button copy says `Login`, and the landing page contains the typo `optimisic` plus generic `Simple Todo App` branding.
- **Acceptance criteria:**
  - Register submit button uses account-creation language.
  - Landing copy spelling is fixed and better aligned with Tidy branding.
  - No auth flow behavior changes.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually load `/`, `/register`, and `/login` if a browser session is available.

### NEXT-2: Review and simplify tag remove recompute path
- **Priority:** P2 / performance + consistency.
- **Status:** Open.
- **Files:** `trpc/routers/tagRouter.ts`, `trpc/routers/viewHelpers.ts`, `docs/ai/04-auth-and-api.md`, `docs/ai/08-views-tags-system.md`.
- **Problem:** `tag.removeFromList` recomputes all custom views inside the transaction and then recomputes tag-specific custom views outside the transaction.
- **Acceptance criteria:**
  - Recompute happens once per logical remove operation unless a documented reason remains.
  - Custom view membership remains correct after removing a tag from a list.
  - Transaction duration remains short enough to avoid Prisma timeout issues.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually remove a tag that affects one or more custom views and verify list membership updates.
  - Add/update view-helper tests if available from NOW-3.

### NEXT-3: Consolidate dashboard key construction
- **Priority:** P2 / maintainability.
- **Status:** Open.
- **Files:** `components/list/ListAdder.tsx`, `components/list/ListsContainer.tsx`, `components/list/ListComponent.tsx`, `components/list/ListTagPicker.tsx`, `lib/dashboard-cache.ts`, `docs/ai/05-dashboard-state-cache.md`.
- **Problem:** Multiple components reconstruct all-lists/current/selected dashboard query keys, increasing drift risk.
- **Acceptance criteria:**
  - Shared helper or hook returns dashboard keys without changing existing key shapes.
  - Optimistic updates and invalidation behavior remain unchanged.
  - Docs define the canonical key-construction pattern.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually verify create list, rename list, tag changes, selected-view switch, and list deletion.

### NEXT-4: Replace broad view-payload invalidation predicate
- **Priority:** P2 / maintainability + cache precision.
- **Status:** Open.
- **Files:** `lib/dashboard-cache.ts`, components that call `invalidateViewPayloadQueries`, `docs/ai/05-dashboard-state-cache.md`.
- **Problem:** `invalidateViewPayloadQueries` currently stringifies query keys and checks for `getViewListsWithItems`.
- **Acceptance criteria:**
  - Invalidation uses typed/stable query-key matching if tRPC/TanStack exposes a safer pattern.
  - Existing invalidated payload set is not narrowed incorrectly.
  - Fallback behavior is documented if typed matching is not practical.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually verify stale view payloads refresh after list/tag/view changes.

### NEXT-5: Split large dashboard components carefully
- **Priority:** P2 / maintainability.
- **Status:** Open.
- **Files:** `components/views/ViewsSidebarPreview.tsx`, `components/list/ListTagPicker.tsx`, `components/list/ListComponent.tsx`, `components/list/ListsContainer.tsx`, `docs/ai/09-ui-components.md`.
- **Problem:** Several components own substantial UI, mutation, optimistic, and cache logic directly.
- **Acceptance criteria:**
  - Extracted hooks/helpers are small, named around existing responsibilities, and do not change public component contracts.
  - No query keys, mutation inputs, optimistic rollback behavior, or drag/drop invariants change accidentally.
  - Docs map the new helper/component ownership.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Manually smoke test the feature area touched by each extraction.
  - Prefer one component/concern per PR.

### NEXT-6: Add view-helper recompute tests
- **Priority:** P2 / correctness.
- **Status:** Open.
- **Files:** `trpc/routers/viewHelpers.ts`, test setup/files, `docs/ai/08-views-tags-system.md`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** Custom-view recompute logic is central to tags/views but lacks tests for matching and order preservation.
- **Acceptance criteria:**
  - Tests cover empty tag sets, all-tags matching, previous order preservation, all-lists order fallback, and no-match behavior.
  - Tests document whether they use a real test database or mocks.
- **Validation notes:**
  - Run the new test command plus `npm run typecheck` and `npm run lint`.

### NEXT-7: Add e2e coverage for core dashboard flows
- **Priority:** P2 / regression prevention.
- **Status:** Open.
- **Files:** e2e test setup/files to be introduced, `components/list/*`, `components/views/*`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** List creation races, tag recompute, fast view switching, and drag/drop are not protected by end-to-end tests.
- **Acceptance criteria:**
  - E2E tests cover list creation, tag changes affecting custom views, fast selected-view switching, and drag/drop reorder.
  - Auth/test-user setup is documented and repeatable.
  - CI guidance documents any required env vars or services.
- **Validation notes:**
  - Run e2e command locally/CI with documented environment.
  - Keep tests resilient to animation/timing differences.

### NEXT-8: Document env vars and deployment checks
- **Priority:** P2 / production readiness.
- **Status:** Open.
- **Files:** `README.md`, `docs/ai/14-production-readiness.md`, `docs/ai/00-ai-entrypoint.md`, `.env.example` if introduced.
- **Problem:** Required env vars and deployment checks are not fully documented in a single operator-friendly place.
- **Acceptance criteria:**
  - Docs list `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and Vercel/port fallback behavior where relevant.
  - Build/deploy steps mention Prisma generate and database migration expectations.
  - No secrets are committed.
- **Validation notes:**
  - Run docs checks manually; no runtime tests required unless files with code change.

## LATER

### LATER-1: Design durable optimistic sync/offline strategy
- **Priority:** P3 / future architecture.
- **Status:** Open.
- **Files:** `hooks/useOptimisticSync.ts`, `lib/dashboard-cache.ts`, `docs/ai/06-optimistic-sync.md`, `docs/ai/10-mobile-and-pwa-readiness.md`, `docs/ai/15-decision-log.md`.
- **Problem:** Current optimistic queues are in-memory; pending writes can be lost on refresh/crash and there is no conflict policy for offline replay.
- **Acceptance criteria:**
  - Design documents durable queue storage, retry/backoff, dead-letter behavior, conflict handling for reorder/delete/tag operations, and cache rehydration boundaries.
  - Implementation, if attempted, preserves current optimistic UI semantics for online use.
- **Validation notes:**
  - Start with a design PR before runtime changes.
  - Include manual offline/refresh scenarios in `13-testing-and-validation.md` before implementation.

### LATER-2: Add real PWA manifest, icon set, and service-worker plan
- **Priority:** P3 / PWA readiness.
- **Status:** Open.
- **Files:** `app/layout.tsx`, `public/*`, `docs/ai/10-mobile-and-pwa-readiness.md`, `docs/ai/14-production-readiness.md`.
- **Problem:** PWA/offline support is not implemented despite product goals.
- **Acceptance criteria:**
  - Manifest and icon set are valid and referenced by metadata.
  - Service-worker strategy is documented and intentionally deferred or implemented after sync durability is designed.
  - Mobile install behavior is manually validated if implemented.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint` for metadata/code changes.
  - Use browser devtools/Lighthouse checks when a runnable environment is available.

### LATER-3: Add order compaction strategy
- **Priority:** P3 / long-term data health.
- **Status:** Open.
- **Files:** `trpc/routers/listRouter.ts`, `trpc/routers/listItemRouter.ts`, `trpc/routers/viewRouter.ts`, `prisma/schema.prisma`, `docs/ai/03-data-model.md`, `docs/ai/07-drag-and-drop.md`.
- **Problem:** Top insertion can create increasingly sparse or negative order values over long-lived accounts.
- **Acceptance criteria:**
  - Define when and how list/item/view orders are compacted.
  - Compaction preserves visible ordering and does not fight optimistic reorder writes.
  - Migration/backfill impact is documented if needed.
- **Validation notes:**
  - Add tests around order preservation before/after compaction.
  - Manually verify drag/drop and create-at-top behavior.

### LATER-4: Add rate limiting and abuse controls for write-heavy procedures
- **Priority:** P3 / production hardening.
- **Status:** Open.
- **Files:** `trpc/init.ts`, `trpc/routers/*.ts`, deployment/config files if introduced, `docs/ai/04-auth-and-api.md`, `docs/ai/14-production-readiness.md`.
- **Problem:** Write-heavy mutations have no rate limiting or abuse controls.
- **Acceptance criteria:**
  - Rate-limit policy is defined per user/IP/procedure class.
  - Write-heavy procedures fail gracefully with documented errors when limited.
  - Configuration and deployment implications are documented.
- **Validation notes:**
  - Add tests or manual scripts for rate-limit boundaries.
  - Run `npm run typecheck` and `npm run lint`.

### LATER-5: Add observability for API and sync failures
- **Priority:** P3 / operations.
- **Status:** Open.
- **Files:** `hooks/useOptimisticSync.ts`, `trpc/routers/*.ts`, `lib/optimistic-debug.tsx`, `docs/ai/14-production-readiness.md`.
- **Problem:** Failed optimistic tasks and mutation failures are mostly surfaced through console/toasts without structured production telemetry.
- **Acceptance criteria:**
  - Chosen error-reporting/logging strategy captures mutation failures without leaking task content.
  - User-visible sync failure state is designed for queued writes that cannot be saved.
  - Request counts/latency for reorder/tag/view recompute paths can be observed.
- **Validation notes:**
  - Validate telemetry in a non-production environment.
  - Confirm no sensitive task/list names are logged unless explicitly allowed.

### LATER-6: Profile and optimize large accounts
- **Priority:** P3 / performance.
- **Status:** Open.
- **Files:** `components/list/ListsContainer.tsx`, `components/list/ListComponent.tsx`, `components/views/ViewsSidebarPreview.tsx`, `trpc/routers/viewHelpers.ts`, `lib/dashboard-cache.ts`, `docs/ai/14-production-readiness.md`.
- **Problem:** Large accounts with many lists/items/tags/views may stress query payload size, custom-view recompute, and dashboard rendering.
- **Acceptance criteria:**
  - Establish benchmark data sizes and baseline timings.
  - Identify whether virtualization, pagination, query splitting, or recompute optimizations are needed.
  - Document chosen thresholds and follow-up implementation tasks.
- **Validation notes:**
  - Profile with seeded large data.
  - Measure both API latency and browser rendering interactions.

### LATER-7: Improve mobile/touch drag-drop and responsive QA
- **Priority:** P3 / UX.
- **Status:** Open.
- **Files:** `components/list/ListsContainer.tsx`, `components/list/ListComponent.tsx`, `components/list/ListItemComponent.tsx`, `components/views/ViewsSidebarPreview.tsx`, `docs/ai/10-mobile-and-pwa-readiness.md`, `docs/ai/13-testing-and-validation.md`.
- **Problem:** Touch-device drag/drop, small-screen card heights, and sidebar usability need a stronger manual checklist and screenshots.
- **Acceptance criteria:**
  - Manual mobile viewport checklist exists.
  - Touch drag/drop behavior is validated or limitations are documented.
  - Any layout fixes preserve desktop behavior.
- **Validation notes:**
  - Test common mobile widths and a touch-capable browser/device when available.
  - Take screenshots if a perceptible UI change is made.

### LATER-8: Accessibility and UI polish pass
- **Priority:** P3 / UX accessibility.
- **Status:** Open.
- **Files:** `components/list/*`, `components/views/ViewsSidebarPreview.tsx`, `components/ui/*` only if primitive-level fixes are needed, `docs/ai/09-ui-components.md`.
- **Problem:** Drag handles, menus, empty states, toast copy, text wrapping, and keyboard behavior need an accessibility/polish review.
- **Acceptance criteria:**
  - Drag handles and menus have appropriate labels/keyboard behavior.
  - Empty states for custom views/tagless accounts are clear.
  - Toast copy is consistent and actionable.
  - Text truncation/wrapping is audited for compact list cards.
- **Validation notes:**
  - Run `npm run typecheck` and `npm run lint`.
  - Use keyboard-only navigation and screen-reader-oriented checks where available.

### LATER-9: Sync or retire older docs
- **Priority:** P3 / documentation hygiene.
- **Status:** Open.
- **Files:** `docs/optimistic-updates.md`, `docs/app-reverse-engineering.md`, `README.md`, `docs/ai/*`.
- **Problem:** Older docs may drift from source and from the AI docs.
- **Acceptance criteria:**
  - Older docs are either updated with links to current AI docs or explicitly marked historical.
  - `README.md` links to `docs/ai/00-ai-entrypoint.md` if future agents rely on it.
  - No contradictory implementation guidance remains.
- **Validation notes:**
  - Documentation-only validation is sufficient unless code snippets are changed.

### LATER-10: Create migration/backfill playbook for view/list data changes
- **Priority:** P3 / data operations.
- **Status:** Open.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/*`, `trpc/routers/viewHelpers.ts`, `docs/ai/03-data-model.md`, `docs/ai/14-production-readiness.md`.
- **Problem:** View/list membership changes can require careful backfills, but no playbook exists.
- **Acceptance criteria:**
  - Playbook documents migration creation, dry-run/backfill strategy, rollback considerations, and validation queries.
  - Raw SQL reorder statements and ownership prechecks are explained for future migrations.
- **Validation notes:**
  - Review against current schema and migrations.
  - Do not modify historical migrations unless explicitly required.

## Known Cross-Cutting Risks
- No automated tests currently prove most optimistic race behavior.
- PWA/offline support is not implemented despite product goals.
- In-memory queues can lose pending writes on refresh or crash.
- Large components increase risk when making focused changes.
- API ownership gaps should be fixed before expanding API surface area.

## What Codex Should Read Before Editing
- Read the NOW/NEXT/LATER item matching the task.
- Read corresponding feature docs before source files.
- For security items, read `04-auth-and-api.md` and the target router.
- For cache/optimistic items, read `05-dashboard-state-cache.md` and `06-optimistic-sync.md`.

## What Codex Must Update After Editing
- Mark completed items as `Done` with a short note or remove them only with explanation.
- Add new risks discovered during implementation.
- Add validation follow-ups when tests or manual coverage remain incomplete.
- Keep this file specific to the current repo state.
