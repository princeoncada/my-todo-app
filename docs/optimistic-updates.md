# Optimistic Updates Notes

This dashboard should feel instant without making every small movement rewrite every cache.

## What Changed

- Dragging now uses local preview state while the pointer is moving. This keeps hover events away from the main TanStack cache.
- Dropping commits the final order once, then queues one server save. Older drag positions are ignored because they are no longer visible to the user.
- The all-lists cache is treated as the main list/item data source for now. The current view is projected from views plus all-lists data, so avoid treating it as a second place to manually keep in sync.
- Optimistic saves use named queues. Reorder queues replace older pending saves with the latest one, because only the newest order matters.
- Dev-only debug logs measure render counts, cache writes, request counts, and drag events. They are there to explain slow paths, not to power app behavior.

## Editing Rules

- Keep fast pointer movement in local state first.
- Write TanStack cache only when the user reaches a stable point, like drop, save, create, delete, or toggle.
- Queue server writes after the cache change so the UI stays responsive.
- When changing this flow, leave a short plain comment near the code explaining why the state belongs locally, in cache, or on the server.

For a fuller map of the app, read `docs/app-reverse-engineering.md`.
