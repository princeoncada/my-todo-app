# Todo App Reverse Engineering Guide

This app is a Next.js dashboard for lists, list items, tags, and filtered views. The hard part is not the UI by itself. The hard part is making the UI feel instant while the server catches up safely.

## First Map

- `app/` contains routes and page shells.
- `components/Dashboard.tsx` lays out the dashboard, list area, and views sidebar.
- `components/list/` contains list cards, list items, tag picker, empty state, and the list creation dialog.
- `components/views/ViewsSidebarPreview.tsx` contains view selection, view editing, and view reorder.
- `trpc/routers/` contains server endpoints for lists, list items, tags, and views.
- `lib/dashboard-cache.ts` explains how dashboard cache data is shaped and updated.
- `hooks/useOptimisticSync.ts` queues server saves after the UI has already changed.

## Data Model

The database has five main ideas:

- `List`: a todo list owned by a user.
- `ListItem`: a task inside a list.
- `Tag`: a reusable label.
- `ListTag`: the join table between lists and tags.
- `View`: a saved filter. The all-lists view shows everything. Custom views show lists that match required tags.
- `ViewList`: the join table that stores which lists appear in a view and their order inside that view.
- `ViewTag`: the join table that stores which tags a custom view requires.

## Cache Shape

The frontend mostly uses three tRPC query caches:

- `view.getAll`: all views, their tags, and view-list order metadata.
- `view.getViewListsWithItems({ viewId: allListsView.id })`: the explicit All Lists payload. Treat this as the canonical full list/item/tag cache.
- `view.getViewListsWithItems({ viewId })`: the explicit payload for a selected view, including custom views and All Lists.
- `view.getCurrentViewListsWithItems`: the bootstrapping payload for the persisted selected view on refresh.

The important rule is:

`ViewList.order owns list order for every view`

All Lists is a permanent system view whose `ViewList` rows include every list. Custom views are tag-filtered views whose `ViewList` rows include matching lists only.

## Why Caches Stay Separate

If every mutation treats the current view as a filtered copy of All Lists, custom view order and membership can drift. The app keeps All Lists and the selected view as separate explicit payloads.

Plain version:

- Update All Lists first when a shared list, item, or tag fact changes.
- Update the selected-view payload only if the changed list is visible there, or refetch affected explicit view payloads.
- Keep each view's order in its own `ViewList.order` rows.

## Optimistic UI Rule

The app follows this order:

1. Local UI first.
2. TanStack cache second.
3. Server last.

Examples:

- While dragging, keep order in local component state.
- On drop, write the final order to cache once.
- After cache is updated, queue one server save.

This keeps pointer movement fast and avoids rewriting a giant cache on every hover.

## Shared Optimistic Queues

`useOptimisticSync` is a shared queue system. It is module-level on purpose, so two different components do not send competing writes at the same time.

Scopes:

- `views`: view reorder saves.
- `view-selection`: selected-view saves.
- `list-tags`: tag add/remove saves.
- `list-order`: list reorder saves.
- `item-order`: list item reorder saves.
- `list-edits`: list create/delete style work.
- `item-edits`: item create/delete style work.

Use `enqueue` when every task matters.

Use `replacePending` when only the newest task matters. Reorder and selected-view saves use this because old intermediate states are no longer visible.

## Drag Flow

List and item drag lives in `components/list/ListsContainer.tsx`.

View drag lives in `components/views/ViewsSidebarPreview.tsx`.

The flow is:

1. `onDragStart`: copy the current visible order into local preview state.
2. `onDragOver`: update only local preview state.
3. `onDragEnd`: clear local preview, commit final order to cache, queue server save.
4. Cancelled drag: clear local preview and do not touch cache or server.

The reason is simple: hover fires too often. It should not mutate the server cache.

## Tag Flow

Tag picking lives in `components/list/ListTagPicker.tsx`.

The UI updates the cache immediately so the user sees the tag change. Server writes are batched for a short time, then sent through the shared `list-tags` queue.

Backend tag writes in `trpc/routers/tagRouter.ts` do two steps:

1. Add/remove rows in `ListTag` quickly.
2. Recompute affected custom views after the short write transaction.

The recompute is outside the write transaction because Prisma interactive transactions time out after 5 seconds by default. Heavy view rebuilding must not sit inside that timeout.

## View Flow

The views sidebar does several jobs:

- Select current view.
- Create custom view.
- Rename custom view.
- Change custom view tag filter.
- Delete custom view.
- Reorder custom views.

Important details:

- Selecting a view updates the cache immediately.
- Only the latest selected view is saved to the server.
- Reordering views stays local while dragging.
- Optimistic views are not sent to reorder saves until the server has created them.

## List Creation Race

A user can create a list and immediately add items to it before the server finishes saving the list.

To support that:

- `ListAdder` creates an optimistic list in cache.
- If items are added before the list save finishes, they stay in the list when the server response replaces the optimistic list.
- `ListComponent` waits for the parent list to exist on the server before sending item creation.

This avoids the old race:

`item save -> server cannot find parent list -> 403`

## Backend Reorder Writes

Reorder endpoints should not loop over rows with many separate Prisma updates. That caused transaction timeout errors.

The app now uses one SQL statement per reorder save:

- `view.reorderViews`
- `view.reorderViewLists`
- `listItem.reorderListItems`

The pattern is:

`UPDATE table SET order = data.order FROM (VALUES ...) data WHERE ids match`

Plain version:

- Send all changed order numbers at once.
- Let the database update them in one go.
- Avoid a long transaction full of tiny updates.

## Dev Measurement

`lib/optimistic-debug.tsx` logs useful dev-only information:

- render counts
- React profiler timing
- cache write payload size
- request labels
- drag events

These logs explain slow paths. They should not control app behavior.

## How To Debug New Problems

Start with the browser/server log label.

Examples:

- `view.reorderViewLists`: list order inside a selected view.
- `listItem.reorderListItems`: item movement across lists.
- `tag.applyListTagChanges`: tag picker batch save.
- `view.saveSelectedView`: selected-view save.

Then check:

- Did the UI update local state, cache, or server first?
- Did the payload include an optimistic object that does not exist in the database yet?
- Is an expensive recompute happening inside a Prisma transaction?
- Is the app sending many requests when only the latest one matters?

## Rules For Future Edits

- Do not update TanStack cache inside drag hover.
- Do not send optimistic-only IDs to server reorder saves.
- Do not put heavy recompute work inside a short database transaction.
- Do not create a second source of truth for current view data.
- Add a plain comment near any tricky state split.
- Prefer one batch server write over many tiny writes.
- If a user action can happen many times quickly, queue or replace pending saves.
