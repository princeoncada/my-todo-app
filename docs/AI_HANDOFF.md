<!-- Current Version: 1.0.0 -->

# AI Handoff

**Current Version**: 1.0.0 — read `STATE.json` for the machine-readable oracle.
**Current Phase**: 1.0.0 â€” AI Workflow Foundation
**Next**: Complete Phase 3 (View Filter Hardening) â†’ v1.2.0

---

## What Was Last Done

**Phase 1.0.0** (this PR) introduced the full AI workflow infrastructure:
- `STATE.json` oracle, `docs/VERSIONING.md`, `docs/WORKFLOW.md`, `docs/COMPACT_STRATEGY.md`
- `docs/AI_HANDOFF.md` (this file), `docs/PHASE_LOG.md`, `docs/FUTURE_PLANS.md`, `docs/DECISIONS.md`, `docs/CODEX_RULES.md`
- `scripts/ingest_docs.py`, `scripts/query_docs.py`, `scripts/validate.ps1`, `scripts/promote.ps1`
- Updated AGENTS.md with Session Start Protocol and Implementation Gate

**Pre-versioning phases** (documented fully in `docs/PHASE_LOG.md`):
- **Phase 1: Dexie Foundation** â€” âœ… merged to master
- **Phase 2: Outbox Sync Queue** â€” âœ… ready for merge review
- **Phase 3: View Filter Hardening** â€” ðŸ”„ active on `checkpoint/fix-cross-view-list-moves` (3 of 7 checkpoints done)

## Active Branch

`checkpoint/fix-cross-view-list-moves` â€” fixing cross-view list move projection consistency (Phase 3, checkpoint 6)

## What the Next Session Should Do

1. Read `STATE.json`
2. Query ChromaDB: `python scripts/query_docs.py "view filter hardening checkpoint cross-view list moves"`
3. Read `docs/PHASE_LOG.md` Phase 3 section for full checkpoint context
4. Continue Phase 3 `checkpoint/fix-cross-view-list-moves`: fix cross-view behavior when a list is created, moved, retagged, or reordered while switching views

---

## Current Product Snapshot

Tidy is an authenticated personal todo workspace with optimistic-first updates.

**User actions**: Create lists; add items; mark completion; rename/delete lists and items; tag lists; create custom tag-based views (ANY/ALL match modes); switch views; drag-and-drop reorder lists/items/views.

**Routes**:
- `/` â€” landing card
- `/register`, `/login`, `/forgot-password`, `/reset-password` â€” Supabase auth
- `/auth/confirm`, `/api/auth/confirm` â€” Supabase callbacks
- `/dashboard` â€” authenticated app (guarded by `proxy.ts`)

**Key files**:
- `app/dashboard/page.tsx` â†’ `components/Dashboard.tsx` â†’ `components/list/ListsContainer.tsx`
- `hooks/useOptimisticSync.ts` â€” module-level write queue
- `lib/dashboard-cache.ts` â€” centralized TanStack Query cache helpers
- `trpc/routers/_app.ts` â€” tRPC router root
- `trpc/init.ts` â€” auth context + `protectedProcedure`
- `prisma/schema.prisma` â€” database schema

---

## Architecture Invariants

**Data model:**
- Models: `List`, `ListItem`, `Tag`, `View`, `ViewList` (join; owns list order per view), `ViewTag`, `ListTag`
- Enums: `ViewType` (`ALL_LISTS`, `UNTAGGED`, `CUSTOM`), `ViewMatchMode` (`ALL`, `ANY`), `TagColor` (gray/red/orange/yellow/green/blue/purple/pink)
- Unique: `View.name` per user, `Tag.name` per user; `ViewList` PK is `[viewId, listId]`
- Cascades: deleting a list removes items, list-tags, and view-list memberships; deleting a tag removes list-tags/view-tags then triggers custom view recompute
- Sparse/negative order values used for top insertion â€” no compaction implemented yet

**Cache and state:**
- `view.getViewListsWithItems({ viewId: allListsView.id })` is the **canonical full dashboard payload**
- Selected view is an explicit payload, not a filtered copy of All Lists
- `ViewList.order` owns list order inside each view; `ListItem.order` owns item order inside each list
- `View.order` owns custom view order
- Dashboard cache key aliases: `views` â†’ `view.getAll`, `allLists` â†’ `view.getViewListsWithItems({ viewId: allListsView.id })`, `currentView` â†’ `view.getCurrentViewListsWithItems`, `selectedView` â†’ `view.getViewListsWithItems({ viewId: selectedViewId })`
- Projection: `ALL_LISTS` returns all lists; `CUSTOM` filters with `listMatchesView` then applies per-view order from `ViewList`

**Optimistic updates:**
- Dashboard writes cache first, queues server saves second
- Drag hover stays local â€” cache writes happen only on drop, create, delete, rename, tag toggle, completion toggle
- Optimistic-only IDs must not be sent to server reorder endpoints
- Use `replacePending` for reorders and selections (only newest matters)
- Use `enqueue` for every action that must persist
- Active scopes: `views`, `list-tags`, `list-order`, `item-order`, `view-selection`, `list-edits`, `item-edits`
- Optimistic markers: `isOptimistic: true` on list/item shapes; `userId: "optimistic"` on view shapes
- List creation race: `ListComponent` waits for the optimistic list to be replaced by the saved server row before sending item creation requests

**Views and tags:**
- Custom view membership is materialized in `ViewList` rows â€” not computed at read time
- Tag operations batch with a 150ms window via `pendingTagOperationsRef` in `ListTagPicker`; `tag.applyListTagChanges` is the preferred batch write path
- View selection uses `replacePending`; only the newest in-flight fetch may write the current view cache after async completes
- `tag.removeFromList` recomputes custom views twice (once inside transaction, once after) â€” known duplication; `applyListTagChanges` avoids this

**Drag and drop:**
- Drag ids: `list-${id}` (list card), `list-item-${id}` (item row), `list-drop-${id}` (list drop zone)
- List reorder writes `ViewList.order`, not `List.order`
- Item cross-list move writes both `ListItem.listId` and `ListItem.order`
- `ALL_LISTS` view is pinned â€” not sortable; only custom views are reorderable

**Authentication:**
- All dashboard data is user-scoped by Supabase user id
- Use `protectedProcedure` for all user data
- Server-side ownership checks are mandatory even if UI only exposes owned IDs
- `absoluteUrl` resolves: `window.location.origin` (browser) â†’ `NEXT_PUBLIC_SITE_URL` â†’ `VERCEL_URL` â†’ localhost fallback

**Performance:**
- Batch raw SQL for reorder operations (`UPDATE ... FROM (VALUES ...)`) â€” individual Prisma updates caused timeout/performance issues
- Heavy custom view recompute should stay outside short Prisma interactive transactions

**Local-first (Dexie â€” Phases 1â€“2, foundation only):**
- Dexie is the local foundation layer â€” not the dashboard source of truth yet
- No auto-running sync worker is mounted
- No outbox replay is wired to dashboard mutations yet
- Dashboard data still comes from the server/TanStack/tRPC flow

---

## Data Flow

1. Browser renders `app/layout.tsx` â€” mounts `TRPCReactProvider`, `QueryClientProvider`, `AuthSync`
2. `/dashboard` guarded by `proxy.ts` â†’ `lib/supabase/proxy.ts` refreshes/verifies Supabase auth
3. `Dashboard.tsx` renders: account nav, `ListAdder`, `ViewsSidebarPreview`, `ListsContainer`
4. Components call tRPC query options from `trpc/client.tsx`
5. tRPC requests hit `app/api/trpc/[trpc]/route.ts` â†’ `trpc/init.ts` creates context â†’ `protectedProcedure` exposes `ctx.userId`
6. Routers in `trpc/routers/` read/write PostgreSQL via `lib/db.ts` + Prisma client
7. Optimistic changes write to TanStack Query cache first; server saves are queued via `useOptimisticSync`

---

## Known Risks

**Security (P0 â€” fix before expanding API surface):**
- `listItem.renameListItem`, `deleteListItem`, `setCompletionListItem` â€” protected but no parent list ownership check
- `listItem.reorderListItems` â€” verifies item ownership but not target list ownership
- `listItem.getListItems` â€” filters by `listId` only, no `parentList.userId` check

**Optimistic race scenarios (manual testing only):**
- Optimistic list creation followed by immediate item/tag changes before server save
- Fast view switching with multiple fetches in flight â€” stale fetch must not repaint dashboard
- Reorders involving optimistic-only rows â€” IDs must be filtered before sending to server
- Tag deletes or toggles that affect custom view membership mid-operation

**Data model gaps:**
- `ViewType.UNTAGGED` and `ViewMatchMode.ANY` exist in schema but are not implemented in UI or server logic
- `tag.removeFromList` triggers duplicate custom view recompute (inside transaction + after)

**Testing:**
- No API-level ownership tests yet
- Authenticated E2E requires Supabase credentials (`tests/.auth/user.json` + real env vars)
- No automated drag/drop tests; no keyboard drag accessibility validation

**Sync/durability:**
- Optimistic queues are in-memory â€” pending writes lost on refresh/crash
- No conflict policy for offline replay

**Product polish:**
- Register submit button says "Login" (wrong copy)
- Landing page typo "optimisic" + generic "Simple Todo App" branding
- `apple-icon.png` referenced in metadata but missing from `public/`
