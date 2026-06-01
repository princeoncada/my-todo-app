<!-- Current Version: 1.4.13-alpha -->
# AI Handoff

## Current Version / Phase

**Current Version**: 1.4.13-alpha - read `STATE.json` for the machine-readable oracle.
**Current Phase**: 1.4.13 - Codex Debugging Discipline Hardening
**Next**: 1.4.14 - Phase Branch Commit Workflow Finalization

Use these source-of-truth pointers instead of treating this file as a full history dump:
- `STATE.json` - version, state, phase, phase title, next phase.
- `docs/FUTURE_PLANS.md` - roadmap and next planned backlog item.
- `docs/CONTEXT_INDEX.md` - routing/scoping map for the smallest correct read set.
- `docs/VERSIONING.md` - version rules and version history.
- `docs/PHASE_LOG.md` - historical traceability only, not active implementation guidance.

---

## Latest Completed Change

**1.4.12 - Validation-Gated Assistant Response Hardening** added staged assistant response rules so command instructions advance only as far as user-provided validation and status evidence allows. It prevents jumping ahead to commit, merge, promote, or push commands.

---

## Current Product Snapshot

Tidy is an authenticated personal todo workspace with optimistic-first updates.

**User actions**:
- Create lists and items.
- Complete and uncomplete items.
- Rename and delete lists and items.
- Create tags and attach/detach them from lists.
- Create custom tag-based views using ALL/ANY match modes.
- Switch views.
- Drag-and-drop reorder lists, items, and custom views.

**Routes**:
- `/` - landing card.
- `/register`, `/login`, `/forgot-password`, `/reset-password` - Supabase auth.
- `/auth/confirm`, `/api/auth/confirm` - Supabase callbacks.
- `/dashboard` - authenticated app guarded by `proxy.ts`.

**Key files**:
- `app/dashboard/page.tsx` -> `components/Dashboard.tsx` -> `components/list/ListsContainer.tsx`.
- `components/views/ViewsSidebarPreview.tsx` - custom view UI and view selection/reorder behavior.
- `components/list/ListAdder.tsx`, `ListComponent.tsx`, `ListItemComponent.tsx`, `ListTagPicker.tsx` - dashboard list/item/tag workflows.
- `hooks/useOptimisticSync.ts` - module-level write queue.
- `lib/dashboard-cache.ts` - centralized TanStack Query cache helpers.
- `trpc/routers/_app.ts`, `trpc/init.ts`, `trpc/routers/*` - tRPC API and auth context.
- `prisma/schema.prisma` - database schema.

---

## Architecture Invariants

**Data model:**
- Models: `List`, `ListItem`, `Tag`, `View`, `ViewList`, `ViewTag`, `ListTag`.
- `ViewList` owns list order per view; `ListItem.order` owns item order inside a list; `View.order` owns custom view order.
- Unique constraints: `View.name` per user, `Tag.name` per user, and `ViewList` primary key `[viewId, listId]`.
- Cascades remove dependent list items, list-tags, view-list memberships, view-tags, and list-tags as defined by Prisma relations.
- Sparse/negative order values are used for top insertion. No order compaction is implemented yet.

**Cache and state:**
- `view.getViewListsWithItems({ viewId: allListsView.id })` is the canonical full dashboard payload.
- Selected view payloads are explicit server/query payloads, not filtered copies of All Lists.
- Dashboard cache key aliases are stable: `views`, `allLists`, `currentView`, and `selectedView`.
- `ALL_LISTS` projection returns all lists.
- `CUSTOM` projection uses `listMatchesView` with `ALL`/`ANY`; custom views with zero tags match no lists.
- `UNTAGGED` projection returns lists with no tags, although it is not exposed as a full UI/server flow.
- Projected views apply per-view `ViewList.order` with list order fallback and deterministic tie-breaking.
- Latest-selected-view guards prevent stale view fetches or rollbacks from repainting `currentView`.
- Created-list reconciliation preserves optimistic child items, tags, and order when the saved list replaces an optimistic list.

**Optimistic updates:**
- Dashboard writes cache first and queues server saves second.
- Drag hover is local-only; cache/server writes happen on committed events such as drop, create, delete, rename, tag toggle, and completion toggle.
- Optimistic-only IDs must not be sent to server reorder endpoints.
- Reorder payload builders exclude optimistic-only list/item/view rows and compact saved-row order before persistence.
- Reorders and view selection use `replacePending` because only the newest final state matters.
- Actions that must all persist use `enqueue`.
- Active optimistic scopes include `views`, `list-tags`, `list-order`, `item-order`, `view-selection`, `list-edits`, and `item-edits`.
- Optimistic markers are `isOptimistic: true` on list/item shapes and `userId: "optimistic"` on view shapes.

**Views and tags:**
- Custom view membership is materialized in `ViewList`; it is not computed at read time.
- Frontend projection helpers and backend refresh behavior must agree before UI/UX polish.
- Tag operations batch through `pendingTagOperationsRef` in `ListTagPicker`; `tag.applyListTagChanges` is the preferred batch write path.
- Tag mutations keep writes in short transactions, then recompute affected custom views and return refreshed affected-view projection payloads.
- View selection uses `replacePending`; only the newest in-flight fetch or matching selected-view payload may write current view cache.

**Drag and drop:**
- Drag ids: `list-${id}` for list cards, `list-item-${id}` for item rows, and `list-drop-${id}` for list drop zones.
- List reorder writes `ViewList.order`, not `List.order`.
- Item cross-list move writes both `ListItem.listId` and `ListItem.order`.
- `ALL_LISTS` view is pinned and not sortable; only custom views are reorderable.
- Authenticated drag/drop E2E waits for reorder mutation success before reload assertions.
- Custom view reorder product behavior exists, but its authenticated E2E stabilization is deferred to `1.4.15 - Custom View Reorder E2E Stabilization`.

**Authentication and API:**
- All dashboard data is user-scoped by Supabase user id.
- Use `protectedProcedure` for user data.
- Server-side ownership checks are mandatory even if UI only exposes owned IDs.
- `absoluteUrl` resolves from `window.location.origin`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL`, then localhost fallback.

**Performance and local-first boundary:**
- Reorder endpoints use batch raw SQL (`UPDATE ... FROM (VALUES ...)`) because individual Prisma updates timed out.
- Heavy custom view recompute should stay outside short Prisma interactive transactions unless proven safe.
- Dexie/local DB is foundation only. It is not the dashboard source of truth.
- No auto-running sync worker is mounted.
- No outbox replay is wired to dashboard mutations yet.
- Dashboard data still flows through server/TanStack/tRPC.

---

## Known Risks

**Security (P0 before API expansion):**
- `listItem.renameListItem`, `deleteListItem`, and `setCompletionListItem` are protected but do not consistently verify parent list ownership.
- `listItem.reorderListItems` verifies item ownership but not target list ownership.
- `listItem.getListItems` filters by `listId` only and does not verify `parentList.userId`.

**Optimistic and race behavior:**
- Most optimistic race behavior is not automatically proven yet.
- In-memory optimistic queues can lose pending writes on refresh or crash.
- Reorders involving optimistic-only rows must keep filtering optimistic-only IDs before server writes.
- Tag deletes or rapid tag toggles can affect custom view membership mid-operation.
- Fast view switching depends on latest-selected-view guards to avoid stale repaints.
- Immediate item creation after list creation is covered, but nearby optimistic list/tag/item races remain risk areas.

**Local-first and sync:**
- PWA/offline behavior is not implemented despite product goals.
- No conflict policy exists for offline replay.
- Outbox replay helpers exist but are not connected to runtime dashboard mutations.

**Testing and polish:**
- No API-level ownership tests yet.
- Authenticated E2E requires Supabase credentials (`tests/.auth/user.json` plus real env vars).
- No keyboard drag accessibility validation.
- UI/UX polish is intentionally late, after projection correctness, ownership, optimistic behavior, and test baselines.
- Register submit button says "Login".
- Landing page has typo/generic branding.
- `apple-icon.png` is referenced in metadata but missing from `public/`.

**Workflow:**
- Assistant responses can drift if they provide commit, merge, promote, or push commands before the user/controller has supplied validation and status evidence. `docs/WORKFLOW.md` owns the stage-gated response rule.
- Codex debugging attempts can drift if failure classes and hypotheses are not stated before fixes. `docs/CODEX_RULES.md` owns the debugging attempt discipline.

---

## Next Session Should Do

1. Read `STATE.json`, `codebase-graph.json`, and `docs/FUTURE_PLANS.md` first.
2. Use `docs/CONTEXT_INDEX.md` to choose any additional task-specific read set.
3. If 1.4.13 is stable, scope `1.4.14 - Phase Branch Commit Workflow Finalization`.
4. Keep `docs/PHASE_LOG.md` historical only. Do not use it as active phase guidance.
5. Preserve the Codex validation boundary.

### Prompt Fence Safety

Do not include nested fenced code blocks inside fenced master prompts. Generated Codex prompts must remain copy-paste safe.

---

## Local Evidence Boundary

ChatGPT architect sees pushed GitHub state plus pasted evidence only. It cannot read local uncommitted files, local ChromaDB, local git status/diff, local-only branches, or local graph changes unless the user/controller pastes that evidence or pushes it.

For source-heavy or local-sensitive scoping, provide a Local Evidence Packet with:
- `git status --short`
- `git log --oneline -5`
- `Get-Content STATE.json`
- `python scripts/query_docs.py "<question about the current task>"`
- `npm run graph:codebase`
- `git diff --stat`

Optional targeted evidence can include file-specific diffs or `Select-String` output from relevant docs. Pasted validation output is evidence, but it does not replace direct file reads when implementation details matter.
