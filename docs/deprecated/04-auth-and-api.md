# Auth And API

## Purpose
Document Supabase auth, tRPC setup, protected procedures, procedure-level contracts, and API boundaries so future implementation tasks can avoid broad router/source scanning.

## Current Implementation
Supabase owns authentication. tRPC owns type-safe API calls. TanStack Query owns client cache.

`trpc/init.ts` creates context by calling the Supabase server client and reading `supabase.auth.getUser()`. `protectedProcedure` requires a user and exposes `ctx.userId` to handlers. The proxy layer separately calls `supabase.auth.getClaims()` while guarding `/dashboard`.

The API root is `trpc/routers/_app.ts`:

- `test`
- `user`
- `list`
- `listItem`
- `tag`
- `view`

The HTTP endpoint is `app/api/trpc/[trpc]/route.ts`.

## Important Files
- `trpc/init.ts`: context, `superjson` transformer, `baseProcedure`, `protectedProcedure`, auth middleware.
- `trpc/routers/_app.ts`: router root and `AppRouter` type.
- `trpc/routers/testRouter.ts`: public smoke query.
- `trpc/routers/userRouter.ts`: authenticated identity queries.
- `trpc/routers/listRouter.ts`: list procedures.
- `trpc/routers/listItemRouter.ts`: list item procedures.
- `trpc/routers/tagRouter.ts`: tag and list-tag procedures.
- `trpc/routers/viewRouter.ts`: view procedures.
- `trpc/routers/viewHelpers.ts`: helper functions used by list/tag/view routers.
- `trpc/client.tsx`: browser tRPC client, `httpBatchLink`, `QueryClientProvider`, and `AuthSync` mount.
- `trpc/server.tsx`: server-side tRPC options proxy, cached query client, hydration helpers.
- `trpc/query-client.ts`: query defaults (`staleTime: 30s`) and `superjson` hydration.
- `app/api/trpc/[trpc]/route.ts`: tRPC fetch handler.
- `lib/supabase/client.ts`: browser Supabase client.
- `lib/supabase/server.ts`: server Supabase client using Next cookies.
- `lib/supabase/proxy.ts`: auth refresh and dashboard redirect.
- `proxy.ts`: matcher for `/dashboard`.
- `lib/supabase/auth-confirm.ts`: email confirmation and OTP callback.
- `components/AuthSync.tsx`: clears React Query cache on logout.
- `hooks/useUser.ts`: user query wrapper.
- `components/auth/Login.tsx`, `Register.tsx`, `ResetPassword.tsx`: auth forms.
- `app/forgot-password/page.tsx`: reset-email request form.

## Auth Data Flow
1. `TRPCReactProvider` creates/reuses a browser QueryClient, creates a tRPC client with `httpBatchLink`, mounts `AuthSync`, and renders children.
2. Register uses `supabase.auth.signUp` with `emailRedirectTo: absoluteUrl("/auth/confirm?next=/dashboard")`.
3. Login uses `supabase.auth.signInWithPassword`.
4. Forgot password uses `supabase.auth.resetPasswordForEmail` with `redirectTo: absoluteUrl("/auth/confirm?next=/reset-password")`.
5. Confirmation routes call `handleAuthConfirmRequest`, which accepts either `code` (`exchangeCodeForSession`) or `token_hash` + `type` (`verifyOtp`) and redirects to a safe relative `next` path.
6. Supabase auth state changes are observed by `AuthSync`.
7. `AuthSync` stores the user in `['user']` and clears the entire QueryClient when the session disappears.
8. `/dashboard` requests pass through `proxy.ts`; unauthenticated users redirect to `/login`.
9. Dashboard logout calls `supabase.auth.signOut()`, clears QueryClient, and routes to `/`.

## tRPC Request Flow
1. Client components call `useTRPC()` generated query/mutation options from `trpc/client.tsx`.
2. `httpBatchLink` posts browser requests to `/api/trpc`; server URL construction uses `absoluteUrl('/api/trpc')`.
3. `fetchRequestHandler` invokes `createTRPCContext({ headers: req.headers })`.
4. Context creates a server Supabase client and reads `supabase.auth.getUser()`.
5. `baseProcedure` is public. `protectedProcedure` throws `UNAUTHORIZED` if there is no Supabase user and adds `ctx.userId`.
6. Routers enforce ownership with `ctx.userId` where implemented.
7. Responses are serialized with `superjson`.

## Procedure-Level tRPC Contracts

### `testRouter`

#### `test.hello`
- Type: public query (`baseProcedure`).
- Input: `{ text: string }`.
- Returns: `{ greeting: string }` with `hello ${text}`.
- Auth/ownership: none; use only for smoke testing.

### `userRouter`

#### `user.getUser`
- Type: protected query.
- Input: none.
- Returns: current Supabase user object from context.
- Auth/ownership: requires authenticated Supabase user.

#### `user.getUserId`
- Type: protected query.
- Input: none.
- Returns: authenticated Supabase user id string.
- Auth/ownership: requires authenticated Supabase user.

### `listRouter`

#### `list.createList`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed string <= 255, viewId?: uuid }`.
- Returns: created or existing `List` with `listTags.tag` and ordered `listItems`.
- Auth/ownership: uses `ctx.userId`; if `id` already exists for the same user, returns that list idempotently.
- Side effects:
  - Ensures an `ALL_LISTS` view exists and is backfilled.
  - If `viewId` is omitted, ensures/uses the default view.
  - Requires the selected view to belong to the user or throws `NOT_FOUND`.
  - If creating from a custom selected view, copies that view's tags onto the list.
  - Creates `ViewList` rows for `ALL_LISTS` and matching custom views.
  - Inserts at the top of the all-lists order by using the current minimum order minus one, or `0`.
- Client notes: used by `ListAdder` with optimistic cache insertion across all-lists/current/selected view payloads.

#### `list.getLists`
- Type: protected query.
- Input: none.
- Returns: all lists owned by `ctx.userId` without relations.
- Auth/ownership: filters by `userId`.
- Client notes: legacy/simple fetch; dashboard generally uses view payload queries.

#### `list.getListsWithItems`
- Type: protected query.
- Input: none.
- Returns: user lists with `listTags.tag` and `listItems` ordered ascending by item `order`.
- Auth/ownership: filters by `userId`.
- Client notes: older dashboard shape; current selected-view flow generally uses `view.getCurrentViewListsWithItems` or `view.getViewListsWithItems`.

#### `list.renameList`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed string <= 255 }`.
- Returns: updated `List`.
- Auth/ownership: `updateManyAndReturn` scoped by `id` and `userId`; throws `NOT_FOUND` if no owned list was changed.

#### `list.deleteList`
- Type: protected mutation.
- Input: `{ listId: uuid }`.
- Returns: `{ id: listId }` even if no row was deleted.
- Auth/ownership: `deleteMany` scoped by `id` and `userId`.
- Side effects: Prisma cascades should remove dependent list items/list tags/view-list rows according to schema relationships.

### `listItemRouter`

#### `listItem.getListItems`
- Type: protected query.
- Input: `{ listId: uuid }`.
- Returns: items for the list ordered ascending by `order`.
- Auth/ownership: currently filters only by `listId`; it does not verify `parentList.userId`. Treat as a known security follow-up before using in new UI.
- Client notes: marked deprecated in source comments; dashboard generally receives items through view/list payloads.

#### `listItem.createListItem`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed string <= 255, listId: uuid }`.
- Returns: created `ListItem`.
- Auth/ownership: verifies parent list belongs to `ctx.userId`; throws `FORBIDDEN` otherwise.
- Side effects: inserts at the top of the parent list by using the current minimum item order minus one, or `0`; sets `completed: false`.

#### `listItem.renameListItem`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed string <= 255 }`.
- Returns: updated `ListItem`.
- Auth/ownership: currently updates by item `id` only; it does not verify `parentList.userId`.
- Errors: source checks for a falsy update result after `update`, but Prisma throws if the row is missing.
- Security note: known ownership gap; fix before relying on it for stricter isolation.

#### `listItem.deleteListItem`
- Type: protected mutation.
- Input: `{ id: uuid }`.
- Returns: `{ deleted: boolean }`.
- Auth/ownership: currently `deleteMany` by item `id` only; it does not verify `parentList.userId`.
- Security note: known ownership gap.

#### `listItem.setCompletionListItem`
- Type: protected mutation.
- Input: `{ id: uuid, completed: boolean }`.
- Returns: updated `ListItem`.
- Auth/ownership: currently updates by item `id` only; it does not verify `parentList.userId`.
- Security note: known ownership gap.

#### `listItem.reorderListItems`
- Type: protected mutation.
- Input: `{ items: Array<{ id: uuid, listId: uuid, order: integer >= 0 }> }`.
- Returns: `{ success: true }`.
- Auth/ownership: empty input succeeds; otherwise verifies every item id belongs to a list owned by `ctx.userId`; throws `FORBIDDEN` on mismatch.
- Side effects: raw SQL bulk-updates `ListItem.listId` and `ListItem.order` for the supplied item ids.
- Important risk: ownership check verifies existing item ownership but does not separately verify the target `listId` values are owned by the same user. Preserve/fix deliberately.

### `tagRouter`

Allowed tag colors are `gray`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, and `pink`.

#### `tag.getAll`
- Type: protected query.
- Input: none.
- Returns: tags owned by `ctx.userId`, ordered by `name` ascending, including `listTags`.
- Auth/ownership: filters by `userId`.

#### `tag.create`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed non-empty string <= 255, color?: tagColor = 'gray' }`.
- Returns: created `Tag`.
- Auth/ownership: writes `userId` from context.

#### `tag.update`
- Type: protected mutation.
- Input: `{ id: uuid, name?: trimmed non-empty string <= 255, color?: tagColor }`.
- Returns: updated `Tag`.
- Auth/ownership: `updateManyAndReturn` scoped by `id` and `userId`; throws `NOT_FOUND` if no owned tag was changed.

#### `tag.delete`
- Type: protected mutation.
- Input: `{ id: uuid }`.
- Returns: `{ deleted: boolean, affectedViews: CustomView[] }`, where affected views include `viewTags.tag` and ordered `viewLists` projections.
- Auth/ownership: deletes by `id` and `userId` inside a transaction.
- Side effects: recomputes all custom views for the user after deletion, then returns all custom views as affected views.

#### `tag.addToList`
- Type: protected mutation.
- Input: `{ listId: uuid, tagId: uuid }`.
- Returns: upserted `ListTag` join row.
- Auth/ownership: verifies both list and tag belong to `ctx.userId`; throws `NOT_FOUND` if either is missing.
- Side effects: upserts the join row, then recomputes custom views that reference the tag.

#### `tag.removeFromList`
- Type: protected mutation.
- Input: `{ listId: uuid, tagId: uuid }`.
- Returns: `{ detached: boolean }`.
- Auth/ownership: deletes only when list and tag are both owned by `ctx.userId`.
- Side effects: recomputes all custom views inside the transaction, then recomputes custom views for the tag again outside the transaction.
- Risk: duplicate recompute path is tracked in the backlog.

#### `tag.applyListTagChanges`
- Type: protected mutation.
- Input: `{ listId: uuid, operations: Array<{ tagId: uuid, action: 'add' | 'remove' }> }`.
- Returns: `{ listId, listTags, affectedViews }`, where `listTags` include `tag` and `affectedViews` include custom views referencing changed tags with `viewTags.tag` and ordered `viewLists`.
- Auth/ownership:
  - Compacts operations so the last action per tag wins.
  - Verifies the list belongs to the user.
  - Verifies every tag being added belongs to the user.
  - Remove operations are scoped by owned list/tag relations.
- Side effects: applies createMany/deleteMany in a short transaction, recomputes affected custom views outside the transaction, and returns refreshed list tags plus affected custom views.
- Client notes: preferred path for batched tag picker writes.

### `viewRouter`

Custom views currently use `ViewMatchMode.ALL`; a custom view must have at least one tag id in create/update inputs.

#### `view.getAll`
- Type: protected query.
- Input: none.
- Returns: views owned by `ctx.userId`, ordered by view `order` ascending, including `viewTags.tag` and ordered `viewLists` (`listId`, `order`).
- Auth/ownership: filters by `userId`.
- Side effects: ensures a default view exists before fetching.

#### `view.getViewListsWithItems`
- Type: protected query.
- Input: `{ viewId: uuid }`.
- Returns: `{ view, lists }`; `view` includes `viewTags.tag` and ordered `viewLists`, and `lists` are the view's lists with `listTags.tag`, ordered `listItems`, and an `order` field copied from `ViewList.order`.
- Auth/ownership: verifies the view belongs to `ctx.userId`; view-list query scopes joined lists by `userId`; throws `NOT_FOUND` if the view is missing.

#### `view.getCurrentViewListsWithItems`
- Type: protected query.
- Input: none.
- Returns: same shape as `getViewListsWithItems`, using the selected/default view.
- Auth/ownership: ensures default view belongs to the user, then scopes joined lists by `userId`.
- Side effects: creates/sets a default view if needed.

#### `view.saveSelectedView`
- Type: protected mutation.
- Input: `{ viewId: uuid }`.
- Returns: selected `View`.
- Auth/ownership: `setSelectedView` verifies the view belongs to `ctx.userId`; throws `NOT_FOUND` if not found.
- Side effects: clears `isDefault` from other user views and marks `viewId` as default.

#### `view.create`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed non-empty string <= 255, tagIds: uuid[] with at least 1 }`.
- Returns: created custom view including `viewTags.tag` and ordered `viewLists`.
- Auth/ownership: verifies all unique tag ids belong to `ctx.userId`; throws `FORBIDDEN` on mismatch.
- Side effects:
  - Ensures `ALL_LISTS` exists.
  - Inserts the custom view at the top (`topView.order - 1` or `0`).
  - Marks all user views non-default, then creates the new view as `isDefault: true`.
  - Creates `ViewTag` rows.
  - Recomputes custom view membership outside the interactive transaction.
- Errors: maps unique `(userId, name)` Prisma conflicts to `CONFLICT` with message `A view with this name already exists.`; logs unexpected create failures.

#### `view.rename`
- Type: protected mutation.
- Input: `{ id: uuid, name: trimmed non-empty string <= 255 }`.
- Returns: updated custom `View`.
- Auth/ownership: only custom views owned by `ctx.userId` can be renamed; throws `NOT_FOUND` otherwise.

#### `view.updateFilter`
- Type: protected mutation.
- Input: `{ id: uuid, tagIds: uuid[] with at least 1 }`.
- Returns: updated custom view including `viewTags.tag` and ordered `viewLists`.
- Auth/ownership: verifies all unique tags belong to the user and the view is an owned custom view; throws `FORBIDDEN` for foreign tags and `NOT_FOUND` for missing/non-custom view.
- Side effects: sets `matchMode` to `ALL`, replaces all `ViewTag` rows, and recomputes custom view membership inside the transaction.

#### `view.delete`
- Type: protected mutation.
- Input: `{ id: uuid }`.
- Returns: `{ deleted: true }`.
- Auth/ownership: only custom views owned by `ctx.userId` can be deleted; throws `NOT_FOUND` otherwise.
- Side effects: deletes the view. If it was default, ensures `ALL_LISTS` and selects it.

#### `view.reorderViews`
- Type: protected mutation.
- Input: `{ views: Array<{ id: uuid, order: integer >= 0 }> }`.
- Returns: `{ success: true }`.
- Auth/ownership: empty input succeeds; otherwise verifies every supplied id is an owned custom view and throws `FORBIDDEN` on mismatch.
- Side effects: raw SQL bulk-updates `View.order` for the supplied custom views scoped by `userId` and `type = 'CUSTOM'`.

#### `view.reorderViewLists`
- Type: protected mutation.
- Input: `{ viewId: uuid, lists: Array<{ id: uuid, order: integer >= 0 }> }`.
- Returns: `{ success: true }`.
- Auth/ownership: empty input succeeds; verifies the view belongs to the user and every supplied list id is present in that view and belongs to the user; throws `NOT_FOUND` for missing view and `FORBIDDEN` for mismatched list membership.
- Side effects: raw SQL bulk-updates `ViewList.order` for the supplied view/list pairs.

## Shared View Helper Contracts
- `ensureAllListsView(userId, client = db)`: finds or creates the user's `ALL_LISTS` view, makes it default only if the user has no default view, then calls `backfillAllListsView`.
- `ensureDefaultView(userId, client = db)`: returns current default view, or selects/creates the `ALL_LISTS` view as default.
- `setSelectedView(userId, viewId, client = db)`: verifies ownership, clears other default views, and marks the chosen view default; returns `null` if not owned/found.
- `backfillAllListsView(userId, viewId, client = db)`: adds missing user lists to an all-lists view, appending after the current max order.
- `recomputeCustomView(userId, viewId, client = db)`: for owned custom views, replaces `ViewList` membership with lists matching all view tags and preserves previous/all-lists order where possible.
- `recomputeCustomViewsForUser(userId, client = db)`: recomputes every custom view for the user.
- `recomputeCustomViewsForTags(userId, tagIds, client = db)`: recomputes custom views that reference any unique tag id in the input.

## Invariants
- All app data procedures that expose user data should use `protectedProcedure`.
- Server code should trust `ctx.userId`, not client-submitted `userId`.
- API inputs use Zod, including UUID validation for ids.
- Client-generated UUIDs are accepted for optimistic list, item, tag, and view creation.
- On logout, call `queryClient.clear()` to prevent previous user cache leaks.
- `absoluteUrl` uses `window.location.origin` in the browser, then `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`, then localhost fallback on the server.
- View/list/item reorder endpoints expect non-negative integer order values.
- Custom views require at least one tag and currently match lists that have all selected tags.
- Raw SQL reorder procedures must keep ownership prechecks and SQL `WHERE` scoping aligned.

## Known Risks
- `listItem.getListItems`, `renameListItem`, `deleteListItem`, and `setCompletionListItem` need ownership checks through `parentList.userId`.
- `listItem.reorderListItems` verifies current item ownership but should also verify target `listId` ownership before allowing cross-list moves.
- `tag.removeFromList` recomputes custom views twice: all custom views inside the transaction and tag-specific views afterward.
- `proxy.ts` only matches `/dashboard`, not nested dashboard paths if added later.
- Auth form redirects use `redirect()` inside client callbacks after timeout. Future Next versions may prefer router navigation in client event handlers.
- Register button copy says `Login`.
- Error handling is mostly toast/log based; no structured API error telemetry.

## What Codex Should Read Before Editing
- Auth flow: `lib/supabase/*`, `proxy.ts`, auth components, this doc.
- Router work: `trpc/init.ts`, `_app.ts`, target router, `03-data-model.md`, and the procedure contract above.
- Client API usage: `trpc/client.tsx`, `trpc/query-client.ts`, relevant component, and `05-dashboard-state-cache.md` if dashboard payloads are involved.
- View/tag/list interactions: `08-views-tags-system.md`, `viewHelpers.ts`, target router(s), and `lib/dashboard-cache.ts`.

## What Codex Must Update After Editing
- Update this file for new routers, procedures, inputs, return shapes, auth guards, env vars, redirects, side effects, or session behavior.
- Update `03-data-model.md` if API changes depend on model changes.
- Update `05-dashboard-state-cache.md` if query keys or payload shapes change.
- Update `13-testing-and-validation.md` with new validation steps.
- Add security or ownership follow-ups to `docs/FUTURE_PLANS.md`.
