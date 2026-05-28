# Drag And Drop

## Purpose
Document dnd-kit usage for lists, list items, and views.

## Current Implementation
The repo uses `@dnd-kit/react` and `@dnd-kit/react/sortable`.

Drag/drop surfaces:

- Lists and list items: `components/list/ListsContainer.tsx`, `ListComponent.tsx`, `ListItemComponent.tsx`.
- Views: `components/views/ViewsSidebarPreview.tsx`.

Drag hover is local-only. Drop commits to cache and schedules a server save.

## Important Files
- `components/list/ListsContainer.tsx`: `DragDropProvider`, local drag preview, reorder helpers, drop saves.
- `components/list/ListComponent.tsx`: `useSortable` for list cards, `useDroppable` for list item drop zone.
- `components/list/ListItemComponent.tsx`: `useSortable` for item rows.
- `components/views/ViewsSidebarPreview.tsx`: view row `DragDropProvider`, preview, reorder save.
- `trpc/routers/viewRouter.ts`: `reorderViews`, `reorderViewLists`.
- `trpc/routers/listItemRouter.ts`: `reorderListItems`.

## Data Flow
List reorder:

1. `ListComponent` registers a sortable list id `list-${list.id}`.
2. `ListsContainer.onDragStart` copies current `lists` into `dragPreviewLists`.
3. `onDragOver` detects source/target type `list` and calls `reorderListsForDrag`.
4. Preview state is updated while dragging.
5. `onDragEnd` clears preview and calls `scheduleReorderListsSave`.
6. Cache updates use different paths for All Lists vs custom view order.
7. Server calls `view.reorderViewLists` for the current view id.

Item reorder:

1. `ListItemComponent` registers sortable id `list-item-${item.id}`.
2. `ListComponent` registers droppable id `list-drop-${list.id}` for dropping into list body.
3. `ListsContainer.onDragOver` calls `reorderItemsForDrag`.
4. Moving across lists updates the moved item's `listId` in preview.
5. Drop writes changed lists into All Lists, selected view, and current view caches.
6. Server calls `listItem.reorderListItems` with item id, list id, and order.

View reorder:

1. `ViewsSidebarPreview` only makes custom views sortable.
2. `ALL_LISTS` is fixed outside the custom view drag list.
3. Drag hover updates `dragPreviewViews`.
4. Drop commits custom view order into `view.getAll`.
5. Server calls `view.reorderViews`.

## Invariants
- Drag start snapshots visible data into local preview refs/state.
- Drag hover never writes TanStack cache or server.
- Canceled drag clears preview and leaves cache/server untouched.
- Drop saves only the final order.
- Reorder saves use `replacePending`.
- List reorder writes `ViewList.order`, not `List.order`.
- Item reorder writes `ListItem.listId` and `ListItem.order`.
- View reorder only sends non-optimistic custom views.

## Known Risks
- Keyboard-accessible drag behavior has not been validated.
- Touch behavior exists through CSS classes such as `touch-none` and `touch-pan-y`, but mobile drag ergonomics need testing.
- There are no automated drag/drop tests.
- Active drop target highlighting depends on dnd-kit ids and string prefixes.

## What Codex Should Read Before Editing
- List/item DnD: `ListsContainer`, `ListComponent`, `ListItemComponent`, this doc.
- View DnD: `ViewsSidebarPreview`, this doc.
- Server reorder: `viewRouter`, `listItemRouter`, `03-data-model.md`.
- Cache writes: `05-dashboard-state-cache.md`.

## What Codex Must Update After Editing
- Update this file for new draggable types, id conventions, reorder payloads, or hover/drop behavior.
- Update `13-testing-and-validation.md` with manual DnD checks.
- Add mobile/accessibility follow-ups to `docs/FUTURE_PLANS.md` when discovered.
