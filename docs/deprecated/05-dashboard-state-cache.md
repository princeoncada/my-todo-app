# Dashboard State Cache

## Purpose
Explain the dashboard TanStack Query cache shape, projection helpers, and reconciliation rules.

## Current Implementation
Dashboard state is cached through tRPC query keys. `lib/dashboard-cache.ts` centralizes helpers that update multiple dashboard payloads without scattering cache logic everywhere.

Primary caches:

- `view.getAll`: all views, view tags, and view-list order metadata.
- `view.getCurrentViewListsWithItems`: bootstrap payload for the server-persisted default selected view.
- `view.getViewListsWithItems({ viewId: allListsView.id })`: canonical All Lists payload.
- `view.getViewListsWithItems({ viewId: selectedViewId })`: explicit selected view payload.

The frontend often builds `dashboardKeys`:

- `views`
- `allLists`
- `currentView`
- `selectedView`

## Important Files
- `lib/dashboard-cache.ts`: projection and cache update helpers.
- `components/list/ListsContainer.tsx`: reads/fetches dashboard payloads and commits reorder drops.
- `components/list/ListAdder.tsx`: optimistic list creation and cache replacement.
- `components/list/ListComponent.tsx`: list rename/delete and item creation cache updates.
- `components/list/ListItemComponent.tsx`: item rename/delete/complete cache updates.
- `components/list/ListTagPicker.tsx`: tag cache batching and affected view reconciliation.
- `components/views/ViewsSidebarPreview.tsx`: view cache updates, view selection, view projection.
- `components/list/types.ts`: cache-derived list/item types.

## Data Flow
Initial dashboard load:

1. `ListsContainer` queries `view.getAll`.
2. It finds the `ALL_LISTS` view and selected default view.
3. It queries bootstrap `getCurrentViewListsWithItems`.
4. It queries explicit All Lists payload.
5. It queries explicit selected view payload when a selected view id exists.
6. It mirrors selected view payload into the current view query cache.

Projection:

- `selectedViewFromCache` picks `isDefault` view, falling back to All Lists.
- `projectView(view, allListsSnapshot)` returns a `CurrentViewSnapshot`.
- For `ALL_LISTS`, projection returns all lists.
- For `CUSTOM`, projection filters lists with `listMatchesView` and applies per-view order from `view.viewLists`.

Reconciliation:

- `updateListInDashboardCaches` updates All Lists, current view, and selected view once per distinct key.
- `applyTagChangeToCaches` applies immediate tag changes and re-filters custom views.
- `reconcileSavedListTags` replaces optimistic tag rows with saved rows.
- `reconcileAffectedViewLists` updates view metadata and reprojects affected current/selected snapshots.
- `invalidateViewPayloadQueries` invalidates all `getViewListsWithItems` queries by predicate.

## Invariants
- Shared list facts should update All Lists first.
- Custom selected views should be projected from All Lists plus view metadata when possible.
- Query keys may duplicate each other; use `queryKeysEqual` or `setDashboardQueryDataOnce` to avoid double writes.
- `currentView` is a compatibility/bootstrap cache, while explicit selected view payloads are the stronger source after selection.
- Custom views with no required tags should show no lists.
- Only saved lists/items should be sent to server reorder mutations.

## Known Risks
- Query-key comparisons use `JSON.stringify`, which is practical here but brittle if query key shape changes.
- Several components construct `dashboardKeys` independently. A future abstraction could reduce drift.
- Invalidation by string predicate can catch all view payloads, but it is broad and depends on tRPC query key serialization.
- Cache projection currently implements `ALL` match mode only.

## What Codex Should Read Before Editing
- Always read `lib/dashboard-cache.ts` before changing dashboard cache behavior.
- Read the component that owns the mutation path.
- For views/tags, also read `08-views-tags-system.md`.
- For optimistic ordering, read `06-optimistic-sync.md` and `07-drag-and-drop.md`.

## What Codex Must Update After Editing
- Update this file for new query keys, cache helpers, projection rules, or reconciliation behavior.
- Update `06-optimistic-sync.md` if queue semantics change.
- Update `08-views-tags-system.md` if view membership/filtering changes.
- Add cache consistency risks or follow-ups to `docs/FUTURE_PLANS.md`.
