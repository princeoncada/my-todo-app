<!-- Current Version: 1.0.5-alpha -->
# AI Handoff
**Current Version**: 1.0.5-alpha - read `STATE.json` for the machine-readable oracle.
**Current Phase**: 1.0.5 - New Chathead Opener
**Next**: 1.1.0 - Graphify Integration
---
## What Was Last Done
**Phase 1.0.5** opened new chathead handoff support:
- Created `docs/NEW_CHATHEAD_OPENER.md` with START/END copy-paste instructions for new Claude Code sessions
- Updated the workflow session checkpoint guidance to refresh the opener after writing session logs
- Added the session checkpoint and handoff command vocabulary entry in AGENTS.md
- Bumped all versioning locations to 1.0.5-alpha
**Pre-versioning phases** (documented fully in `docs/PHASE_LOG.md`):
- **Phase 1: Dexie Foundation** â€” done, merged to master
- **Phase 2: Outbox Sync Queue** â€” done, ready for merge review
- **Phase 3: View Filter Hardening** â€” in progress, active on
  `checkpoint/fix-cross-view-list-moves` (3 of 7 checkpoints done)
## Active Branch
`master`
## What the Next Session Should Do
1. Read `STATE.json` and `docs/FUTURE_PLANS.md`
2. Query ChromaDB: `python scripts/query_docs.py "Graphify Integration v1.1.0"`
3. Scope out v1.1.0 - Graphify Integration
---

## Current Product Snapshot

Tidy is an authenticated personal todo workspace with optimistic-first updates.

**User actions**: Create lists; add items; mark completion; rename/delete lists and items; tag lists; create custom tag-based views (ANY/ALL match modes); switch views; drag-and-drop reorder lists/items/views.

**Routes**:
- `/` Ã¢â‚¬â€ landing card
- `/register`, `/login`, `/forgot-password`, `/reset-password` Ã¢â‚¬â€ Supabase auth
- `/auth/confirm`, `/api/auth/confirm` Ã¢â‚¬â€ Supabase callbacks
- `/dashboard` Ã¢â‚¬â€ authenticated app (guarded by `proxy.ts`)

**Key files**:
- `app/dashboard/page.tsx` -> `components/Dashboard.tsx` -> `components/list/ListsContainer.tsx`
- `hooks/useOptimisticSync.ts` Ã¢â‚¬â€ module-level write queue
- `lib/dashboard-cache.ts` Ã¢â‚¬â€ centralized TanStack Query cache helpers
- `trpc/routers/_app.ts` Ã¢â‚¬â€ tRPC router root
- `trpc/init.ts` Ã¢â‚¬â€ auth context + `protectedProcedure`
- `prisma/schema.prisma` Ã¢â‚¬â€ database schema

---

## Architecture Invariants

**Data model:**
- Models: `List`, `ListItem`, `Tag`, `View`, `ViewList` (join; owns list order per view), `ViewTag`, `ListTag`
- Enums: `ViewType` (`ALL_LISTS`, `UNTAGGED`, `CUSTOM`), `ViewMatchMode` (`ALL`, `ANY`), `TagColor` (gray/red/orange/yellow/green/blue/purple/pink)
- Unique: `View.name` per user, `Tag.name` per user; `ViewList` PK is `[viewId, listId]`
- Cascades: deleting a list removes items, list-tags, and view-list memberships; deleting a tag removes list-tags/view-tags then triggers custom view recompute
- Sparse/negative order values used for top insertion Ã¢â‚¬â€ no compaction implemented yet

**Cache and state:**
- `view.getViewListsWithItems({ viewId: allListsView.id })` is the **canonical full dashboard payload**
- Selected view is an explicit payload, not a filtered copy of All Lists
- `ViewList.order` owns list order inside each view; `ListItem.order` owns item order inside each list
- `View.order` owns custom view order
- Dashboard cache key aliases: `views` -> `view.getAll`, `allLists` -> `view.getViewListsWithItems({ viewId: allListsView.id })`, `currentView` -> `view.getCurrentViewListsWithItems`, `selectedView` -> `view.getViewListsWithItems({ viewId: selectedViewId })`
- Projection: `ALL_LISTS` returns all lists; `CUSTOM` filters with `listMatchesView` then applies per-view order from `ViewList`

**Optimistic updates:**
- Dashboard writes cache first, queues server saves second
- Drag hover stays local Ã¢â‚¬â€ cache writes happen only on drop, create, delete, rename, tag toggle, completion toggle
- Optimistic-only IDs must not be sent to server reorder endpoints
- Use `replacePending` for reorders and selections (only newest matters)
- Use `enqueue` for every action that must persist
- Active scopes: `views`, `list-tags`, `list-order`, `item-order`, `view-selection`, `list-edits`, `item-edits`
- Optimistic markers: `isOptimistic: true` on list/item shapes; `userId: "optimistic"` on view shapes
- List creation race: `ListComponent` waits for the optimistic list to be replaced by the saved server row before sending item creation requests

**Views and tags:**
- Custom view membership is materialized in `ViewList` rows Ã¢â‚¬â€ not computed at read time
- Tag operations batch with a 150ms window via `pendingTagOperationsRef` in `ListTagPicker`; `tag.applyListTagChanges` is the preferred batch write path
- View selection uses `replacePending`; only the newest in-flight fetch may write the current view cache after async completes
- `tag.removeFromList` recomputes custom views twice (once inside transaction, once after) Ã¢â‚¬â€ known duplication; `applyListTagChanges` avoids this

**Drag and drop:**
- Drag ids: `list-${id}` (list card), `list-item-${id}` (item row), `list-drop-${id}` (list drop zone)
- List reorder writes `ViewList.order`, not `List.order`
- Item cross-list move writes both `ListItem.listId` and `ListItem.order`
- `ALL_LISTS` view is pinned Ã¢â‚¬â€ not sortable; only custom views are reorderable

**Authentication:**
- All dashboard data is user-scoped by Supabase user id
- Use `protectedProcedure` for all user data
- Server-side ownership checks are mandatory even if UI only exposes owned IDs
- `absoluteUrl` resolves: `window.location.origin` (browser) -> `NEXT_PUBLIC_SITE_URL` -> `VERCEL_URL` -> localhost fallback

**Performance:**
- Batch raw SQL for reorder operations (`UPDATE ... FROM (VALUES ...)`) Ã¢â‚¬â€ individual Prisma updates caused timeout/performance issues
- Heavy custom view recompute should stay outside short Prisma interactive transactions

**Local-first (Dexie Ã¢â‚¬â€ Phases 1Ã¢â‚¬â€œ2, foundation only):**
- Dexie is the local foundation layer Ã¢â‚¬â€ not the dashboard source of truth yet
- No auto-running sync worker is mounted
- No outbox replay is wired to dashboard mutations yet
- Dashboard data still comes from the server/TanStack/tRPC flow

---

## Data Flow

1. Browser renders `app/layout.tsx` Ã¢â‚¬â€ mounts `TRPCReactProvider`, `QueryClientProvider`, `AuthSync`
2. `/dashboard` guarded by `proxy.ts` -> `lib/supabase/proxy.ts` refreshes/verifies Supabase auth
3. `Dashboard.tsx` renders: account nav, `ListAdder`, `ViewsSidebarPreview`, `ListsContainer`
4. Components call tRPC query options from `trpc/client.tsx`
5. tRPC requests hit `app/api/trpc/[trpc]/route.ts` -> `trpc/init.ts` creates context -> `protectedProcedure` exposes `ctx.userId`
6. Routers in `trpc/routers/` read/write PostgreSQL via `lib/db.ts` + Prisma client
7. Optimistic changes write to TanStack Query cache first; server saves are queued via `useOptimisticSync`

---

## Known Risks

**Security (P0 Ã¢â‚¬â€ fix before expanding API surface):**
- `listItem.renameListItem`, `deleteListItem`, `setCompletionListItem` Ã¢â‚¬â€ protected but no parent list ownership check
- `listItem.reorderListItems` Ã¢â‚¬â€ verifies item ownership but not target list ownership
- `listItem.getListItems` Ã¢â‚¬â€ filters by `listId` only, no `parentList.userId` check

**Optimistic race scenarios (manual testing only):**
- Optimistic list creation followed by immediate item/tag changes before server save
- Fast view switching with multiple fetches in flight Ã¢â‚¬â€ stale fetch must not repaint dashboard
- Reorders involving optimistic-only rows Ã¢â‚¬â€ IDs must be filtered before sending to server
- Tag deletes or toggles that affect custom view membership mid-operation

**Data model gaps:**
- `ViewType.UNTAGGED` and `ViewMatchMode.ANY` exist in schema but are not implemented in UI or server logic
- `tag.removeFromList` triggers duplicate custom view recompute (inside transaction + after)

**Testing:**
- No API-level ownership tests yet
- Authenticated E2E requires Supabase credentials (`tests/.auth/user.json` + real env vars)
- No automated drag/drop tests; no keyboard drag accessibility validation

**Sync/durability:**
- Optimistic queues are in-memory Ã¢â‚¬â€ pending writes lost on refresh/crash
- No conflict policy for offline replay

**Product polish:**
- Register submit button says "Login" (wrong copy)
- Landing page typo "optimisic" + generic "Simple Todo App" branding
- `apple-icon.png` referenced in metadata but missing from `public/`
