# Optimistic Sync

## Purpose
Document how Tidy keeps the UI instant while serializing server writes safely.

## Current Implementation
`hooks/useOptimisticSync.ts` exposes a shared optimistic queue API:

- `enqueue(scope, task, options)`: run every task in order for a scope.
- `replacePending(scope, task, options)`: cancel queued work in a scope and enqueue only the newest task.
- `cancelScope(scope)`: mark entries canceled, clear entries, reset chain.

Queues are module-level, so they are shared across all hook instances and components.

Current scopes:

- `views`
- `list-tags`
- `list-order`
- `item-order`
- `view-selection`
- `list-edits`
- `item-edits`

## Important Files
- `hooks/useOptimisticSync.ts`: queue implementation.
- `components/list/ListsContainer.tsx`: list/item reorder queue.
- `components/views/ViewsSidebarPreview.tsx`: view reorder and selection queue.
- `components/list/ListComponent.tsx`: list delete and item creation after optimistic list creation.
- `components/list/ListItemComponent.tsx`: item delete queue.
- `components/list/ListTagPicker.tsx`: has local tag batching chain, separate from `useOptimisticSync`.
- `lib/optimistic-debug.tsx`: dev-only measurement labels.
- `docs/deprecated/optimistic-updates.md`: older high-level notes (deprecated).

## Data Flow
General optimistic mutation:

1. Capture previous cache state if rollback is needed.
2. Update local state or TanStack cache immediately.
3. Enqueue server work.
4. On success, reconcile optimistic rows with server rows.
5. On error, rollback if possible, cancel that queue scope, and log an error.

Reorder mutation:

1. Drag hover uses local preview state.
2. Drop writes final order to cache once.
3. A short timeout debounces the save.
4. `replacePending` drops older pending order saves.
5. Server receives only saved entity ids.

List creation race:

1. `ListAdder` inserts an optimistic list with a client UUID.
2. User can add items before the list is saved.
3. `ListComponent` waits for the optimistic parent list to be replaced by a saved list before sending item creation.
4. `ListAdder` preserves locally added items when replacing the optimistic list with the server response.

## Invariants
- Use `enqueue` when every user action must persist, such as create/delete sequences.
- Use `replacePending` when only the newest state matters, such as reorder and view selection.
- Rollbacks should restore every dashboard cache touched by the optimistic update.
- Optimistic objects are marked with `isOptimistic` or `userId: "optimistic"` depending on type.
- Server reorder payloads must filter out optimistic-only rows.
- Do not let high-frequency pointer movement write TanStack cache.

## Known Risks
- The queue is in memory only. Refresh, tab close, crash, or offline mode loses pending writes.
- Queue failures log to console and rollback locally, but there is no user-facing sync error center.
- Tag batching in `ListTagPicker` uses a local chain instead of the shared `list-tags` scope. That is intentional today but a source of conceptual duplication.
- Cancellation depends on a custom `CancelledError` message check, but current code mostly cancels by marking entries and resetting chains.

## What Codex Should Read Before Editing
- Queue changes: `hooks/useOptimisticSync.ts`, all scope users listed above.
- Any optimistic cache mutation: `05-dashboard-state-cache.md`.
- Drag/drop changes: `07-drag-and-drop.md`.
- Tag changes: `08-views-tags-system.md`.

## What Codex Must Update After Editing
- Update this file for new scopes, changed queue semantics, rollback rules, or offline persistence.
- Update `docs/FUTURE_PLANS.md` with sync reliability, retry, observability, or offline-first work.
- Update `13-testing-and-validation.md` with new manual race cases.
