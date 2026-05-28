> **DEPRECATED**: Content migrated to `docs/DECISIONS.md`. This file is retained for reference but is no longer the source of truth.

# Decision Log

## Purpose
Capture important implementation decisions so future Codex sessions preserve intent.

## Current Implementation
This log records decisions inferred from current code and existing docs. Add dated entries when future changes alter architecture or behavior.

## Important Files
- `docs/optimistic-updates.md`
- `docs/app-reverse-engineering.md`
- `lib/dashboard-cache.ts`
- `hooks/useOptimisticSync.ts`
- `components/list/ListsContainer.tsx`
- `components/views/ViewsSidebarPreview.tsx`
- `trpc/routers/viewHelpers.ts`
- `trpc/routers/viewRouter.ts`
- `trpc/routers/listItemRouter.ts`
- `trpc/routers/tagRouter.ts`

## Data Flow
Decisions usually affect one of these paths:

- Local UI state vs TanStack cache vs server state.
- All Lists canonical payload vs selected view payload.
- Materialized custom view membership vs computed-on-read membership.
- Immediate optimistic feedback vs durable server truth.

## Invariants
- New decisions should include the reason, not only the outcome.
- If a decision invalidates another doc, update both.
- Decisions that affect production risk should also update `14-production-readiness.md`.

## Known Risks
- Entries before this AI docs system are reconstructed from source rather than original PR notes.

## Decisions

### 2026-05-09: AI docs are mandatory maintenance surface
Every future implementation must update the relevant AI docs and backlog in the same PR. Reason: future Codex sessions should read compact repo-specific docs instead of scanning the whole repo.

### Existing: All Lists is the canonical full dashboard payload
`view.getViewListsWithItems({ viewId: allListsView.id })` is treated as the full list/item/tag payload. Selected/custom views are explicit payloads or projections from All Lists plus view metadata. Reason: custom view order and membership are view-specific and should not collapse into a single current-view source of truth.

### Existing: View membership is materialized in `ViewList`
Custom views store matching lists in `ViewList`, not only computed on every read. Reason: each view needs stable list ordering and efficient payload reads.

### Existing: Drag hover is local-only
List, item, and view drag hover updates local preview state. Drop commits cache once and schedules one server save. Reason: hover fires too frequently and should not rewrite large query caches.

### Existing: Reorders use batch SQL
`view.reorderViews`, `view.reorderViewLists`, and `listItem.reorderListItems` use raw SQL `UPDATE ... FROM (VALUES ...)`. Reason: many small Prisma updates caused timeout/performance issues.

### Existing: Reorder and selection saves replace pending work
Reorders and selected-view saves use `replacePending`. Reason: only the newest final visible state matters.

### Existing: Heavy view recompute should avoid long transactions
Several flows recompute custom views after short write transactions. Reason: Prisma interactive transactions can timeout on large accounts.

### Existing: Client UUIDs support optimistic creation
Lists, items, tags, and views accept client-generated ids. Reason: UI can render optimistic objects immediately and reconcile them with server responses.

## What Codex Should Read Before Editing
- This file for changes that alter state ownership, sync strategy, API shape, schema behavior, or UX contracts.
- Relevant feature docs for implementation details.

## What Codex Must Update After Editing
- Add a decision entry when behavior or architecture changes.
- Update the affected feature docs and `backlog.md`.
