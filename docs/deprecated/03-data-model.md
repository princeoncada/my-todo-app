# Data Model

## Purpose
Document the Prisma/PostgreSQL model and the behavioral meaning of each relation, especially view membership and ordering.

## Current Implementation
The canonical schema is `prisma/schema.prisma`. Prisma 7 generates the client into `app/generated/prisma`. The database provider is PostgreSQL. `lib/db.ts` creates `PrismaClient` with `PrismaPg` and `DATABASE_URL`.

Core models:

- `List`: user-owned todo list.
- `ListItem`: task inside a list.
- `Tag`: user-owned reusable label.
- `View`: user-owned saved list view.
- `ViewList`: join table between views and lists, with order per view.
- `ViewTag`: join table between views and tags.
- `ListTag`: join table between lists and tags.

Enums:

- `TagColor`: `gray`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`.
- `ViewType`: `ALL_LISTS`, `UNTAGGED`, `CUSTOM`.
- `ViewMatchMode`: `ALL`, `ANY`; current code creates custom views with `ALL`.

## Important Files
- `prisma/schema.prisma`: source of truth for models.
- `prisma/migrations/*`: migration history.
- `lib/db.ts`: Prisma client setup.
- `trpc/routers/viewHelpers.ts`: default All Lists view, selected view, custom view recompute.
- `trpc/routers/listRouter.ts`: list creation and All Lists membership.
- `trpc/routers/listItemRouter.ts`: item CRUD and item reordering.
- `trpc/routers/tagRouter.ts`: tag CRUD and view recompute after tag changes.
- `trpc/routers/viewRouter.ts`: view CRUD and view/list ordering.
- `lib/dashboard-cache.ts`: frontend mirror of view/list/tag relationships.

## Data Flow
List creation:

1. Client sends `id`, `name`, optional `viewId` to `list.createList`.
2. Router ensures All Lists view exists.
3. If creating inside a custom selected view, new list inherits that view's required tags.
4. New list is inserted into All Lists `ViewList`.
5. Matching custom views receive `ViewList` rows.

Custom view creation/update:

1. View stores required tags in `ViewTag`.
2. `recomputeCustomView` deletes old `ViewList` rows for that view.
3. Matching lists are found by requiring all `ViewTag` tag ids.
4. `ViewList` rows are recreated with previous order where available, then All Lists order fallback.

Ordering:

- View order is `View.order`.
- List order inside a view is `ViewList.order`.
- Item order inside a list is `ListItem.order`.
- Reorder mutations write batches with raw SQL `UPDATE ... FROM (VALUES ...)`.

## Invariants
- Every persisted list belongs to exactly one `userId`.
- Every persisted tag belongs to exactly one `userId`.
- Every persisted view belongs to exactly one `userId`.
- `View.name` is unique per user.
- `Tag.name` is unique per user.
- `ViewList` primary key is `[viewId, listId]`.
- `ListTag` primary key is `[listId, tagId]`.
- `ViewTag` primary key is `[viewId, tagId]`.
- Deleting a list cascades list items, list tags, and view-list memberships.
- Deleting a tag cascades list tags and view tags, then custom views must be recomputed.

## Known Risks
- `ViewType.UNTAGGED` exists in schema but no clear UI/server implementation uses it yet.
- `ViewMatchMode.ANY` exists but current logic only implements `ALL`; `listMatchesView` and `recomputeCustomView` both require every tag.
- `listItem.renameListItem`, `deleteListItem`, and `setCompletionListItem` currently identify by item id without explicit parent-list user ownership checks.
- Sparse/negative order values are used for top insertion. This is fast, but long-term order compaction is not implemented.

## What Codex Should Read Before Editing
- Any schema change: this file, `prisma/schema.prisma`, relevant migration files, and `14-production-readiness.md`.
- View/list membership: `trpc/routers/viewHelpers.ts`, `trpc/routers/listRouter.ts`, `lib/dashboard-cache.ts`.
- Reorder behavior: `trpc/routers/viewRouter.ts`, `trpc/routers/listItemRouter.ts`, `07-drag-and-drop.md`.

## What Codex Must Update After Editing
- Update this doc for any model, relation, enum, unique constraint, index, cascade, or ordering change.
- Update `04-auth-and-api.md` for router input/output changes.
- Update `05-dashboard-state-cache.md` if response shapes change.
- Update `docs/FUTURE_PLANS.md` with migration, backfill, or production data tasks.
