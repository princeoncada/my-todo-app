> **DEPRECATED**: Content consolidated into `docs/PHASE_LOG.md` (Phase 3: View Filter Hardening section). This file is retained for detailed checkpoint reference.

# Phase 3: View Filter Hardening

## Goal
Fix and harden view/list/tag projection consistency without changing the dashboard source of truth or expanding Dexie coverage.

## Current Baseline
Tidy still uses the existing server, TanStack Query, tRPC, and optimistic cache flow for dashboard data.

The known issue is projection consistency: switching views works, but lists created in All Lists or custom views do not consistently appear in other custom views even when their filter tags should match.

This is not primarily a Dexie problem. Phase 3 focuses on dashboard cache projection, view filter matching, tag relation consistency, and cross-view list behavior.

Current risk found during roadmap review:

- `lib/dashboard-cache.ts` owns `listMatchesView` and `projectView`.
- Existing unit tests cover ALL custom view matching and empty custom view filters.
- The current projection tests do not cover ANY mode, retagging reprojection, cross-view creation, or reorder visibility invariants.

## Branch Structure
- Umbrella branch: `phase/view-filter-hardening`
- Checkpoint branches branch from `phase/view-filter-hardening`.
- Checkpoint branches merge back into `phase/view-filter-hardening` only after validation.
- `phase/view-filter-hardening` merges into `master` only after all Phase 3 gates pass.

Checkpoint branches:

- `checkpoint/phase-three-roadmap`
- `checkpoint/reproduce-view-filter-bug`
- `checkpoint/add-projection-regression-tests`
- `checkpoint/fix-view-list-projection`
- `checkpoint/fix-tag-relation-consistency`
- `checkpoint/fix-cross-view-list-moves`
- `checkpoint/manual-regression-docs`

## Hard Restrictions
- Do not expand Dexie coverage.
- Do not make Dexie the dashboard source of truth.
- Do not rewrite drag/drop.
- Do not rewrite all TanStack Query behavior.
- Do not rewrite all tRPC endpoints.
- Do not touch Prisma schema unless a real relation bug requires it and is documented first.
- Do not add Redis, Sentry, QStash, Inngest, or CRDT.
- Do not do unrelated UI redesign.
- Do not combine multiple checkpoints into one.

## Target Projection Rules
- All Lists shows all user lists.
- Custom views show lists whose tags match the view filter rules.
- ANY mode shows lists with at least one required tag.
- ALL mode shows lists with all required tags.
- Custom views with no required tags should preserve the current intended rule: match no lists unless a later checkpoint documents and validates a different product decision.
- Creating a list in All Lists should not hide it forever from qualifying custom views.
- Creating a list inside a custom view should attach or project required tags consistently, depending on the current app design.
- Moving or retagging a list should update visible custom views consistently.
- Reordering should not change tag-based visibility.
- Refresh should preserve expected view/list visibility.
- Rapid tag, view, and list operations should not leave stale projections.

## Checkpoint Plan

### 1. checkpoint/phase-three-roadmap
Purpose:

- Create this Phase 3 log.
- Document the known bug.
- Document expected view projection rules.
- Link Phase 3 from the AI entrypoint/backlog if needed.
- No runtime behavior change.

Validation:

- `git status`
- `git diff --stat`
- Confirm docs-only change.

### 2. checkpoint/reproduce-view-filter-bug
Purpose:

- Find the exact projection path.
- Add a minimal failing or skipped regression test if the bug can be reproduced.
- Do not fix the bug yet unless the fix is trivial and explicitly separated.

Focus areas:

- `lib/dashboard-cache.ts`
- `tests/unit/dashboard-cache.test.ts`
- optimistic list creation
- optimistic tag attachment
- custom view selection
- targeted cache invalidation after tag/list updates

Validation:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 3. checkpoint/add-projection-regression-tests
Purpose:

- Add deterministic tests for view projection behavior before broad fixes.
- Cover All Lists, ANY, ALL, no-tag custom views, creation projection, retagging, reorder visibility, cross-view behavior, and refresh/reprojection determinism.

Validation:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 4. checkpoint/fix-view-list-projection
Purpose:

- Fix the core projection logic.
- Prefer pure projection helpers.
- Avoid patching symptoms inside components.
- Avoid broad query invalidation as the only fix.

Validation:

- Projection unit tests pass.
- Existing cache tests pass.
- `npm run typecheck`
- `npm run lint`
- `npm run test`

### 5. checkpoint/fix-tag-relation-consistency
Purpose:

- Fix tag relation consistency if the bug is caused by stale `listTags`, `viewTags`, or `viewLists`.
- Ensure optimistic tag changes update the correct cache slice.
- Avoid over-invalidation unless targeted invalidation is unsafe.

Validation:

- Add/update tag relation projection tests.
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e:smoke`

### 6. checkpoint/fix-cross-view-list-moves
Purpose:

- Fix cross-view behavior when a list is created, moved, retagged, or reordered while switching views.
- A list should appear in every view it qualifies for and disappear from views it no longer qualifies for.
- Reorder must not alter tag membership.

Validation:

- Add/update tests.
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e:smoke`

### 7. checkpoint/manual-regression-docs
Purpose:

- Finalize docs, validation evidence, known risks, and next phase recommendations.

Validation:

- `npm run test:ci`
- `npm run build` if environment supports it.
- `npm run test:e2e:smoke`
- `npm run test:e2e:auth` if dashboard auth state and required env are available.

## Manual Regression Checklist
Use when runtime behavior changes:

- Open app.
- Login.
- Create tags.
- Create custom view with ANY mode.
- Create custom view with ALL mode.
- Create list in All Lists and assign matching tag.
- Confirm it appears in matching custom view.
- Confirm it does not appear in nonmatching custom view.
- Create list inside custom view.
- Confirm expected tags/projection.
- Switch All Lists -> custom view -> another custom view repeatedly.
- Rename list.
- Reorder list.
- Retag list.
- Refresh page.
- Confirm visibility stays correct.
- Reorder items inside list.
- Move item between lists.
- Confirm list visibility does not break.
- Browser console clean.
- Network tab does not show unexpected spam.

## Merge Gate
A checkpoint can merge into `phase/view-filter-hardening` only when:

- Scope stayed inside the checkpoint.
- Runtime checkpoints added or updated matching tests.
- Validation commands were run or skipped with exact reason.
- No unrelated Dexie, sync, drag/drop, schema, or UI redesign work exists.
- This phase log is updated.
- Known risks are documented.

`phase/view-filter-hardening` can merge into `master` only when:

- Projection regression tests pass.
- `npm run test:ci` passes.
- `npm run build` passes where environment supports it.
- Authenticated E2E runs if credentials/storage state are available.
- Manual dashboard regression is documented.
- No hidden dashboard source-of-truth rewrite was introduced.

## Checkpoint Log

### checkpoint/phase-three-roadmap
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `docs/ai/phase-logs/phase-3-view-filter-hardening.md`, `docs/ai/00-ai-entrypoint.md`, `docs/ai/backlog.md`.
- Validation run: `git status --short --branch`, `git diff --stat`, and docs-only scope review.
- Manual validation: Confirmed no runtime source files were intentionally changed.
- Known risks: Later checkpoints must prove the suspected ANY-mode and cross-view projection bugs with tests before broad fixes. Do not use broad invalidation or component-local patches as the primary fix unless pure projection fixes are insufficient.
- Next checkpoint: `checkpoint/reproduce-view-filter-bug`

### checkpoint/reproduce-view-filter-bug
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `tests/unit/dashboard-cache.test.ts`, `docs/ai/phase-logs/phase-3-view-filter-hardening.md`.
- Validation run: `npm run typecheck`, `npm run lint`, and `npm run test` passed. Unit test result: 11 files passed, 90 tests passed, 1 expected failure documenting the ANY-mode projection bug.
- Manual validation: Not required for this checkpoint because the repro is a pure projection unit test and no runtime behavior was changed.
- Known risks: The repro uses `it.fails` to document the current bug without making the whole suite fail. The next checkpoint should add broader deterministic projection tests, then the fix checkpoint should remove the expected-failure wrapper when ANY-mode projection is corrected.
- Next checkpoint: `checkpoint/add-projection-regression-tests`

### checkpoint/add-projection-regression-tests
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `tests/unit/dashboard-cache.test.ts`, `docs/ai/phase-logs/phase-3-view-filter-hardening.md`.
- Validation run: `npm run typecheck`, `npm run lint`, and `npm run test` passed. Unit test result: 11 files passed, 96 tests passed, 2 expected failures documenting ANY-mode projection gaps.
- Manual validation: Not required for this checkpoint because this adds pure projection regression tests and no runtime behavior was changed.
- Known risks: ANY-mode tests remain expected failures until `checkpoint/fix-view-list-projection`. Current tests still do not exercise live authenticated dashboard UI; that belongs in later checkpoints/manual regression.
- Next checkpoint: `checkpoint/fix-view-list-projection`

### checkpoint/fix-view-list-projection
- Status: Ready for review.
- Date: 2026-05-10.
- Files changed: `lib/dashboard-cache.ts`, `tests/unit/dashboard-cache.test.ts`, `docs/ai/phase-logs/phase-3-view-filter-hardening.md`.
- Validation run: `npm run typecheck`, `npm run lint`, and `npm run test` passed. Unit test result: 11 files passed, 98 tests passed, 0 expected failures.
- Manual validation: Not performed. The fix is pure projection logic and no UI, tRPC, TanStack Query wiring, drag/drop, Dexie, or schema behavior was intentionally changed.
- Known risks: This fixes the core ANY-mode projection helper but does not yet prove live tag relation cache consistency, cross-view moves, or authenticated dashboard behavior. Those remain in later checkpoints.
- Next checkpoint: `checkpoint/fix-tag-relation-consistency`

### checkpoint/fix-tag-relation-consistency
- Status: Ready for review with smoke E2E timeout noted.
- Date: 2026-05-10.
- Files changed: `tests/unit/dashboard-cache.test.ts`, `docs/ai/phase-logs/phase-3-view-filter-hardening.md`.
- Validation run: `npm run typecheck`, `npm run lint`, and `npm run test` passed. Unit test result: 11 files passed, 102 tests passed. `npm run test:e2e:smoke` was attempted and timed out after 180 seconds while running the three smoke tests.
- Manual validation: Not performed. This checkpoint adds cache helper coverage only and does not intentionally change runtime behavior.
- Known risks: Tag relation behavior is covered at the cache helper level, but live authenticated dashboard tag flows still need manual/auth E2E validation. Smoke E2E should be rerun outside this timed-out shell before phase merge.
- Next checkpoint: `checkpoint/fix-cross-view-list-moves`
