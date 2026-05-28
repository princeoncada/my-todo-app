# Views Tags System

## Purpose
Explain how tags, list membership, and saved views work across client cache and server recompute.

## Current Implementation
Tags are user-owned labels attached to lists through `ListTag`. Custom views are user-owned filters requiring one or more tags through `ViewTag`. Matching lists are materialized into `ViewList` rows, which also store list order inside that view.

The UI for both tags and views is concentrated in:

- `components/list/ListTagPicker.tsx`
- `components/views/ViewsSidebarPreview.tsx`

## Important Files
- `prisma/schema.prisma`: `Tag`, `ListTag`, `View`, `ViewTag`, `ViewList`.
- `trpc/routers/tagRouter.ts`: tag CRUD and batch list tag mutations.
- `trpc/routers/viewRouter.ts`: view CRUD, selected view, view reorder.
- `trpc/routers/viewHelpers.ts`: All Lists/default view helpers and custom view recompute.
- `lib/dashboard-cache.ts`: client-side `listMatchesView`, projection, tag reconciliation.
- `components/list/ListTagPicker.tsx`: tag picker UI, optimistic tag batching.
- `components/views/ViewsSidebarPreview.tsx`: view sidebar, dialog, optimistic view creation and selection.

## Data Flow
Tag attach/detach:

1. User toggles a tag in `ListTagPicker`.
2. Cache updates immediately through `applyTagChangeToCaches`.
3. Operations are compacted in `pendingTagOperationsRef`.
4. After a 150 ms batch window, `tag.applyListTagChanges` sends final operations.
5. Server writes `ListTag` rows, then recomputes affected custom views outside the short write transaction.
6. Client reconciles saved `listTags` and `affectedViews`.

Tag creation:

1. User searches a missing tag name and chooses create.
2. Client creates an optimistic tag in `tag.getAll`.
3. Server creates `Tag` with client UUID.
4. Client replaces optimistic tag data and schedules attach to the current list.

Custom view creation:

1. User chooses name and required tags.
2. Client builds an optimistic view and selects it.
3. Server creates `View` and `ViewTag` rows, then recomputes `ViewList`.
4. Client fetches `getViewListsWithItems` for the new view and writes current view cache.

View selection:

1. Client immediately marks one view `isDefault`.
2. Client projects dashboard from All Lists when possible.
3. `view.saveSelectedView` persists the selection.
4. Only the latest selected view may write current view cache after async fetch completes.

## Invariants
- The All Lists view should exist for every active user; `ensureAllListsView` creates/backfills it.
- A default selected view should exist; `ensureDefaultView` falls back to All Lists.
- Custom views require at least one tag in current API validation.
- Custom view matching currently means all required tags must be present.
- Custom view membership is materialized in `ViewList`, not computed only at read time.
- Tag deletes require custom view recompute and cache reconciliation.
- Optimistic views use `userId: "optimistic"` and should not be sent to reorder saves.

## Known Risks
- Schema supports `ViewMatchMode.ANY` and `ViewType.UNTAGGED`, but UI/server logic does not expose them.
- Deleting a tag can leave custom views with fewer/no tags; recompute runs, but product behavior for empty custom views should be reviewed.
- `tag.removeFromList` calls recompute inside a transaction and again after; `applyListTagChanges` is the more optimized path used by the picker.
- Tag batching is component-local rather than using shared `useOptimisticSync`.

## What Codex Should Read Before Editing
- `ListTagPicker`, `ViewsSidebarPreview`, `tagRouter`, `viewRouter`, `viewHelpers`, `dashboard-cache`.
- Also read `03-data-model.md` and `05-dashboard-state-cache.md`.

## What Codex Must Update After Editing
- Update this file for any tag/view workflow, match mode, recompute, or cache reconciliation change.
- Update `03-data-model.md` for schema or enum changes.
- Update `docs/FUTURE_PLANS.md` with view/tag UX, performance, or consistency follow-ups.
