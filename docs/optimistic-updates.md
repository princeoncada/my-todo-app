# Optimistic Updates Notes

This dashboard should feel instant without making every small movement rewrite every cache.

## What Changed

- Dragging now uses local preview state while the pointer is moving. This keeps hover events away from the main TanStack cache.
- Dropping commits the final order once, then queues one server save. Older drag positions are ignored because they are no longer visible to the user.
- The All Lists payload is the canonical full list/item/tag payload, and it is fetched with `view.getViewListsWithItems({ viewId: allListsView.id })`.
- The current view payload is an explicit selected-view payload. Update All Lists first for shared list facts, then update or refetch the affected selected-view payload.
- Optimistic saves use named queues. Reorder queues replace older pending saves with the latest one, because only the newest order matters.
- Dev-only debug logs measure render counts, cache writes, request counts, and drag events. They are there to explain slow paths, not to power app behavior.

## View Switching

View switching uses explicit view payloads after the initial page load.

- `view.getCurrentViewListsWithItems` is only for bootstrapping the persisted selected view on refresh.
- `view.getViewListsWithItems({ viewId })` is used when the user selects a specific view.
- Fast switching can leave older save/fetch requests in flight, so fetched data may only write the current-view cache when its `viewId` still matches the latest selected view id.
- Do not invalidate the current-view bootstrap query from `saveSelectedView`; doing so can let an older selection repaint the dashboard.


## Editing Rules

- Keep fast pointer movement in local state first.
- Write TanStack cache only when the user reaches a stable point, like drop, save, create, delete, or toggle.
- Queue server writes after the cache change so the UI stays responsive.
- When changing this flow, leave a short plain comment near the code explaining why the state belongs locally, in cache, or on the server.

For a fuller map of the app, read `docs/app-reverse-engineering.md`.
