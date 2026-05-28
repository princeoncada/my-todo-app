# Future Plans

Living backlog for future sessions. Keep this updated in every implementation PR so future agents can choose focused work without broad source scanning.

Organized by execution horizon:
- **NOW**: high-risk correctness/security/data-loss issues that should be prioritized
- **NEXT**: important product, reliability, and maintainability improvements after NOW is stable
- **LATER**: larger investments, polish, or future architecture work

Each item includes priority, status, files, acceptance criteria, and validation notes.

## Status Legend
- `Open`: not started
- `In progress`: currently being implemented in an active branch
- `Blocked`: cannot proceed without an external decision/dependency
- `Done`: completed â€” include PR/commit note before eventual archival
- `Superseded`: no longer applicable because another change made it obsolete

---

## Active Phases

### Phase 3: View Filter Hardening
- **Priority:** High / projection correctness
- **Status:** In progress
- **Phase log:** `docs/PHASE_LOG.md` (Phase 3 section)
- **Umbrella branch:** `phase/view-filter-hardening`
- **Active checkpoint:** `checkpoint/fix-cross-view-list-moves`
- **Problem:** Lists created in All Lists or custom views do not consistently appear in other custom views even when filter tags should match.
- **Acceptance criteria:**
  - All Lists shows all user lists
  - ANY custom views include lists with at least one required tag
  - ALL custom views include lists with all required tags
  - Retagging, creating, moving, reordering, refreshing, and switching views keeps projection deterministic
  - Runtime checkpoints add/update matching projection tests
  - No Dexie expansion, dashboard source-of-truth rewrite, drag/drop rewrite, or broad tRPC rewrite

---

## NOW

### NOW-1: Close list item ownership gaps
- **Priority:** P0 / security
- **Status:** Open
- **Files:** `trpc/routers/listItemRouter.ts`
- **Problem:** `listItem.getListItems`, `renameListItem`, `deleteListItem`, and `setCompletionListItem` are protected but do not verify `parentList.userId`.
- **Acceptance criteria:**
  - Each affected procedure scopes reads/writes through `parentList.userId === ctx.userId`
  - Foreign item ids return `FORBIDDEN` or `NOT_FOUND` consistently without mutating data
  - Existing optimistic item rename/delete/completion behavior and return shapes remain compatible
  - Relevant AI docs describe the final ownership behavior
- **Validation notes:**
  - `npm run typecheck && npm run lint`
  - Add or run API-level ownership tests if a test harness exists
  - Manually verify item rename, delete, and completion still work for the owning user

### NOW-2: Verify target list ownership in item reorder/move
- **Priority:** P0 / security + data integrity
- **Status:** Open
- **Files:** `trpc/routers/listItemRouter.ts`, `components/list/ListsContainer.tsx`
- **Problem:** `listItem.reorderListItems` verifies existing item ownership, but the raw SQL update accepts target `listId` values from the client and should explicitly prove all target lists belong to the same user.
- **Acceptance criteria:**
  - Reorder validates both item ids and target list ids against `ctx.userId` before raw SQL runs
  - Cross-list moves among the user's own lists still work
  - Empty reorder input still returns `{ success: true }`
  - Error behavior for foreign target lists is documented
- **Validation notes:**
  - `npm run typecheck && npm run lint`
  - Manually drag an item within one list and across two owned lists
  - Add an API/security regression test when test infrastructure exists

### NOW-3: Add automated coverage for dashboard cache projection
- **Priority:** P1 / data-loss and regression prevention
- **Status:** In progress
- **Files:** `lib/dashboard-cache.ts`, `components/list/types.ts`, `tests/unit/dashboard-cache.test.ts`
- **Problem:** Cross-cache projections drive optimistic behavior but limited automated tests protect against regression.
- **Acceptance criteria:**
  - Tests cover `selectedViewFromCache`, `projectView`, list update/removal helpers, tag add/remove projection, and view-selection cache projection
  - Tests include custom views matching all tags and all-lists behavior
  - Test setup is documented in 
- **Validation notes:**
  - Initial `tests/unit/dashboard-cache.test.ts` coverage exists (102 tests as of Phase 3 checkpoint 5)
  - Still add coverage for list update/removal helpers, tag add/remove projection, and view-selection cache projection

### NOW-4: Add ownership/API tests for protected tRPC procedures
- **Priority:** P1 / security regression prevention
- **Status:** Open
- **Files:** `trpc/init.ts`, `trpc/routers/*.ts`
- **Problem:** Security-sensitive ownership behavior is documented but not automatically enforced by tests.
- **Acceptance criteria:**
  - Tests cover list, list item, tag, and view ownership failures
  - Tests prove unauthenticated calls to protected procedures fail with `UNAUTHORIZED`
  - Test data setup/teardown is repeatable and documented
- **Validation notes:**
  - Prefer router-level tests with a test database or a documented mock strategy

### NOW-5: Fix obvious metadata/asset mismatch
- **Priority:** P1 / production correctness
- **Status:** Open
- **Files:** `app/layout.tsx`, `public/icon-clean.png`
- **Problem:** Metadata references `/apple-icon.png` but the file is missing from `public/`.
- **Acceptance criteria:**
  - Either add a valid Apple icon asset or remove/update the metadata reference
  - Metadata continues to reference existing icon assets

---

## NEXT

### NEXT-1: Fix auth and landing-page copy polish
- **Priority:** P2 / UX polish
- **Status:** Open
- **Files:** `components/auth/Register.tsx`, `app/page.tsx`
- **Problem:** Register button copy says "Login"; landing page contains typo "optimisic" and generic "Simple Todo App" branding.
- **Acceptance criteria:**
  - Register submit button uses account-creation language
  - Landing copy spelling fixed and better aligned with Tidy branding
  - No auth flow behavior changes

### NEXT-2: Review and simplify tag remove recompute path
- **Priority:** P2 / performance + consistency
- **Status:** Open
- **Files:** `trpc/routers/tagRouter.ts`, `trpc/routers/viewHelpers.ts`
- **Problem:** `tag.removeFromList` recomputes all custom views inside the transaction and again outside for tag-specific views.
- **Acceptance criteria:**
  - Recompute happens once per logical remove operation unless a documented reason remains
  - Custom view membership remains correct after removing a tag from a list

### NEXT-3: Consolidate dashboard key construction
- **Priority:** P2 / maintainability
- **Status:** Open
- **Files:** `components/list/ListAdder.tsx`, `components/list/ListsContainer.tsx`, `components/list/ListComponent.tsx`, `components/list/ListTagPicker.tsx`, `lib/dashboard-cache.ts`
- **Problem:** Multiple components reconstruct all-lists/current/selected dashboard query keys, increasing drift risk.
- **Acceptance criteria:**
  - Shared helper or hook returns dashboard keys without changing existing key shapes
  - Optimistic updates and invalidation behavior remain unchanged

### NEXT-4: Replace broad view-payload invalidation predicate
- **Priority:** P2 / maintainability + cache precision
- **Status:** Open
- **Files:** `lib/dashboard-cache.ts`
- **Problem:** `invalidateViewPayloadQueries` uses string-matching on query keys.
- **Acceptance criteria:**
  - Invalidation uses typed/stable query-key matching if tRPC/TanStack exposes a safer pattern

### NEXT-5: Split large dashboard components carefully
- **Priority:** P2 / maintainability
- **Status:** Open
- **Files:** `components/views/ViewsSidebarPreview.tsx`, `components/list/ListTagPicker.tsx`, `components/list/ListComponent.tsx`, `components/list/ListsContainer.tsx`
- **Problem:** Several components own substantial UI, mutation, optimistic, and cache logic directly.
- **Acceptance criteria:**
  - Extracted hooks/helpers are small, named around existing responsibilities
  - No query keys, mutation inputs, optimistic rollback behavior, or drag/drop invariants change

### NEXT-6: Add view-helper recompute tests
- **Priority:** P2 / correctness
- **Status:** Open
- **Files:** `trpc/routers/viewHelpers.ts`
- **Problem:** Custom-view recompute logic lacks tests for matching and order preservation.
- **Acceptance criteria:**
  - Tests cover empty tag sets, all-tags matching, previous order preservation, all-lists order fallback, no-match behavior

### NEXT-7: Add E2E coverage for core dashboard flows
- **Priority:** P2 / regression prevention
- **Status:** Open
- **Files:** `tests/`, `components/list/*`, `components/views/*`
- **Problem:** List creation races, tag recompute, fast view switching, and drag/drop are not protected by E2E tests.
- **Acceptance criteria:**
  - E2E tests cover list creation, tag changes affecting custom views, fast selected-view switching, and drag/drop reorder
  - Auth/test-user setup is documented and repeatable

### NEXT-8: Document env vars and deployment checks
- **Priority:** P2 / production readiness
- **Status:** Open
- **Files:** `README.md`, `.env.example`
- **Problem:** Required env vars and deployment checks are not fully documented in one operator-friendly place.
- **Acceptance criteria:**
  - Docs list `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`
  - Build/deploy steps mention Prisma generate and migration expectations

---

## LATER

### LATER-1: Design durable optimistic sync/offline strategy
- **Priority:** P3 / future architecture
- **Status:** Open (Phase 5 planned)
- **Files:** `hooks/useOptimisticSync.ts`, `lib/dashboard-cache.ts`
- **Problem:** Current optimistic queues are in-memory; pending writes lost on refresh/crash.

### LATER-2: Add real PWA manifest, icon set, and service-worker plan
- **Priority:** P3 / PWA readiness
- **Status:** Open
- **Files:** `app/layout.tsx`, `public/*`

### LATER-3: Add order compaction strategy
- **Priority:** P3 / long-term data health
- **Status:** Open
- **Files:** `trpc/routers/listRouter.ts`, `trpc/routers/listItemRouter.ts`, `trpc/routers/viewRouter.ts`, `prisma/schema.prisma`
- **Problem:** Top insertion can create increasingly sparse or negative order values over long-lived accounts.

### LATER-4: Add rate limiting and abuse controls
- **Priority:** P3 / production hardening
- **Status:** Open
- **Files:** `trpc/init.ts`, `trpc/routers/*.ts`

### LATER-5: Add observability for API and sync failures
- **Priority:** P3 / operations
- **Status:** Open
- **Files:** `hooks/useOptimisticSync.ts`, `trpc/routers/*.ts`, `lib/optimistic-debug.tsx`

### LATER-6: Profile and optimize large accounts
- **Priority:** P3 / performance
- **Status:** Open
- **Files:** `components/list/ListsContainer.tsx`, `trpc/routers/viewHelpers.ts`, `lib/dashboard-cache.ts`

### LATER-7: Improve mobile/touch drag-drop and responsive QA
- **Priority:** P3 / UX
- **Status:** Open
- **Files:** `components/list/ListsContainer.tsx`, `components/list/ListComponent.tsx`, `components/list/ListItemComponent.tsx`

### LATER-8: Accessibility and UI polish pass
- **Priority:** P3 / UX accessibility
- **Status:** Open
- **Files:** `components/list/*`, `components/views/ViewsSidebarPreview.tsx`

### LATER-9: Sync or retire older root docs
- **Priority:** P3 / documentation hygiene
- **Status:** Open
- **Files:** `docs/deprecated/optimistic-updates.md`, `docs/deprecated/app-reverse-engineering.md`, `README.md`
- **Problem:** Older root-level docs may drift from source and from the AI docs.
- **Acceptance criteria:**
  - Older docs are either updated with links to current docs or explicitly marked historical
  - No contradictory implementation guidance remains

### LATER-10: Create migration/backfill playbook
- **Priority:** P3 / data operations
- **Status:** Open
- **Files:** `prisma/schema.prisma`, `prisma/migrations/*`, `trpc/routers/viewHelpers.ts`

---

## Known Cross-Cutting Risks

- No automated tests currently prove most optimistic race behavior
- PWA/offline support is not implemented despite product goals
- In-memory queues can lose pending writes on refresh or crash
- Large components increase risk when making focused changes
- API ownership gaps should be fixed before expanding API surface area
