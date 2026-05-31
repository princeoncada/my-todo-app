<!-- Current Version: 1.4.5-alpha -->
# AI Handoff
**Current Version**: 1.4.5-alpha - read `STATE.json` for the machine-readable oracle.
**Current Phase**: 1.4.5 - Tag Mutation Projection Regression
**Next**: 1.4.6 - View Switching Race Regression
---
## What Was Last Done
**Phase 1.3.2** completed ChatGPT architect real workflow test:
- Replaced static workflow review doc with export-chatgpt-architect-context.ps1
- Added validation coverage for the real context packet layout
- Confirmed ChatGPT architecture should use pushed GitHub state plus pasted local evidence
**Phase 1.3.1** completed ChatGPT workflow proof/layout review:
- Added a static workflow review document
- Added validation coverage for the review document
- Confirmed 1.4.0 remained the next planned product phase
- Later superseded by 1.3.2 because the user wanted a real workflow export/test instead of a static review document
**Phase 1.3.0** completed ChatGPT architect local context workflow:
- Added ChatGPT Architect Mode
- Added Local Evidence Packet requirements
- Documented local ChromaDB and local graph limitations
- Required Codex prompts to state local evidence status
- Added validation coverage for ChatGPT architect workflow docs
**Phase 1.2.7** completed prompt fence safety hardening:
- Documented that fenced master prompts must not contain nested fenced code blocks
- Added safe alternatives using plain labels and indented command lines
- Added validation coverage for prompt fence safety documentation
- Preserved 1.3.0 as the next planned phase
**Phase 1.2.6** completed roadmap next-phase gate:
- Inserted `1.3.0 - ChatGPT Architect Local Context Workflow` as the next planned phase
- Renumbered product View Filter Hardening to 1.4.0
- Added validation, open-phase, and promote guards for nextPhase/FUTURE_PLANS drift
- Documented the stable nextPhase/first Planned invariant
**Phase 1.2.5** completed phase routing guardrail cleanup:
- Aligned AGENTS.md and WORKFLOW.md local git pull fallback behavior
- Tightened Codex roadmap movement boundaries
- Normalized Phase 3 to one checkpoint model
- Reclassified manual-regression docs as merge-gate documentation, not a numbered implementation checkpoint
**Phase 1.2.4** completed handoff drift cleanup:
- Removed stale next-session instructions pointing to completed 1.1.4 graph-routing work
- Corrected stale stable history notes for 1.2.2 and 1.2.3
- Fixed old Phase 1.0.0 promotion wording in the phase log
- Pointed the next handoff to 1.2.5 Phase Routing Guardrail Cleanup
**Phase 1.2.3** completed startup oracle cleanup:
- Removed `preVersioningBaseline` from `STATE.json`
- Kept pre-versioning history in `docs/VERSIONING.md` and `docs/PHASE_LOG.md`
- Added Planned Phase Capture workflow rules
- Inserted the 1.2.4 and 1.2.5 cleanup patches before 1.3.0 in `docs/FUTURE_PLANS.md`
**Phase 1.2.2** completed Chroma visibility cleanup:
- Kept ChromaDB status explicit during startup and validation
- Preserved direct-read fallback behavior when ChromaDB is unavailable
**Phase 1.2.1** opens graph navigation doc consistency:
- Rewrote docs/COMPACT_STRATEGY.md graphify section to the static codebase-graph.json path (removed broken graphify-out/live-CLI steps)
- Added a validate.ps1 "graph usage" guard that FAILs if any doc instructs the unavailable live graphify CLI
- Aligns COMPACT_STRATEGY.md with AGENTS.md and CODEBASE_GRAPH.md so the graph is utilized via the committed artifact only
**Phase 1.2.0** opens ChromaDB bootstrap:
- ingest_docs.py reads docs BOM-safe (utf-8-sig), uses cosine space, and indexes CODEBASE_GRAPH.md
- validate.ps1 auto-starts ChromaDB on :8000, ingests docs, and FAILs loudly if unreachable
- chroma-data is created and ingested on the first validate run; query_docs.py returns real tidy_docs chunks
**Phase 1.1.4** opens graph routing usage hardening:
- Requires Graph Routing Summary before implementation prompts
- Makes graph-selected file choices visible
- Requires intentionally skipped broad files/docs to be listed
- Confirms direct source reads are still required before editing
- Defers actual token measurement to a separate token dashboard
**Phase 1.1.3** opens validation boundary hardening:
- Fixes Codex self-validation output drift
- Clarifies validation is user/controller-run
- Removes contradictory Required Tests wording
- Forbids "Verified directly" style Codex summaries
- Keeps validation commands as user-run instructions only
**Phase 1.1.2** opens graph audit proof:
- Adds a graph audit harness
- Proves required graph nodes and classifications
- Proves protected paths are excluded
- Proves routing metadata exists
- Wires the audit into validation only, not startup
**Phase 1.1.1** opens a graph stable refresh fix:
- Fixes `codebase-graph.json` staying on alpha after stable promotion
- Regenerates the graph during `promote.ps1`
- Adds promote self-verification for graph version/schema
- Keeps Graphify CLI optional and fallback mode valid
**Phase 1.1.0** opens Graphify integration:
- Adds Graphify/fallback codebase graph generation
- Adds `codebase-graph.json` as a committed orientation artifact
- Adds `docs/CODEBASE_GRAPH.md`
- Updates startup workflow to read `STATE.json` plus `codebase-graph.json` early
- Adds validation/freshness guardrails for the graph
**Phase 1.0.13** opens copy-paste safety hardening:
- Documents strict output formatting for Codex prompt and validation sections
- Requires section headings outside code blocks
- Requires alpha commit commands in one PowerShell code block
- Requires stable promotion commit commands in one separate PowerShell code block
- Keeps push commands separate from commit blocks
**Phase 1.0.12** opens phase identity and roadmap closeout sync:
- Corrects stale 1.0.11 FUTURE_PLANS state
- Updates the Doc Continuity Model for phase identity, next phase, and roadmap closeout
- Extends `scripts/promote.ps1` to close FUTURE_PLANS during stable promotion
- Extends `scripts/validate.ps1` to catch stale phase/backlog drift
**Phase 1.0.11** opened session continuity and bounded initiative:
- Added a Session Continuity section to `AGENTS.md` (proactively offer a SESSION_LOG checkpoint before context loss)
- Added a Working Posture section to `AGENTS.md` (strict rails + active initiative)
- Cross-referenced proactive checkpointing in `docs/WORKFLOW.md` Session Checkpoint
- Fixed stale "first Open item" references to point at the FUTURE_PLANS Planned section
**Phase 1.0.10** opened roadmap consolidation:
- Rewrote `docs/FUTURE_PLANS.md` into a single version-sequenced plan (Completed / In Progress / Planned / Potential Directions)
- Removed the duplicate Planned Phases table from `docs/VERSIONING.md`; it now holds history + rules only
- Added the Planned Renumber Rule and updated the Doc Continuity Model to name FUTURE_PLANS as the single roadmap owner
- Assigned target versions to all former NOW/NEXT/LATER backlog items
**Phase 1.0.9** opened promote self-verify and CLAUDE.md continuity:
- `scripts/promote.ps1` now self-verifies all five versioning locations and exits non-zero on mismatch
- `scripts/promote.ps1` "next steps" echo now uses commit.ps1 (one file per commit), not raw git add
- `docs/WORKFLOW.md` Post-Validation no longer re-runs full validation after promote
- Doc Continuity Model now accounts for `CLAUDE.md` (thin `@AGENTS.md` import; never restates rules)
**Phase 1.0.8** opened the doc continuity model:
- Added the Doc Continuity Model to `docs/VERSIONING.md` (per-fact owner + Point/Sync/Gate rule)
- Removed the state snapshot from `docs/NEW_CHATHEAD_OPENER.md`; it now points to STATE.json + FUTURE_PLANS
- Updated `AGENTS.md` and `docs/WORKFLOW.md` so the handoff no longer writes state into the opener
- Fixed a stale Phase 3 target-version reference in `docs/PHASE_LOG.md` (1.2.0 -> 1.3.0)
**Phase 1.0.7** opened the anti-drift baseline:
- Bumped all five versioning locations to 1.0.7-alpha and removed stale version markers
- Added a version-consistency gate to `scripts/validate.ps1` (fails when the five locations disagree)
- Added a Drift Guardrails section and disambiguated the Startup Report in `AGENTS.md`
- Added 1.1.0 (Graphify) and 1.2.0 (ChromaDB Bootstrap) to the roadmap; renumbered Phase 3 Completion to 1.3.0
**Phase 1.0.6** opened mojibake resolution and scan hardening:
- Created `scripts/fix-mojibake.ps1` for idempotent repair of known bad sequences in docs
- Repaired `docs/AI_HANDOFF.md`, `docs/VERSIONING.md`, `docs/WORKFLOW.md`, and scanned `AGENTS.md`
- Added a mojibake scan step to `scripts/validate.ps1`
- Bumped all versioning locations to 1.0.6-alpha
**Pre-versioning phases** (documented fully in `docs/PHASE_LOG.md`):
- **Phase 1: Dexie Foundation** - done, merged to master
- **Phase 2: Outbox Sync Queue** - done, ready for merge review
- **Phase 3: View Filter Hardening** - in progress, active on `checkpoint/fix-cross-view-list-moves` (checkpoint 3 of 6 complete; final manual-regression documentation is a merge-gate step, not an implementation checkpoint)
## Active Branch
`master`
## Current 1.4.5 Context
1.4.5 aligns tag mutation recompute and affected-view payloads with the backend membership contract and dashboard-cache projection contract. Tag mutations should use short write transactions first, then recompute affected custom views after the transaction and return refreshed affected view projection payloads.

## What the Next Session Should Do
1. Read `STATE.json`, `codebase-graph.json`, and `docs/FUTURE_PLANS.md`.
2. If 1.4.5 is stable, scope `1.4.6 - View Switching Race Regression`.
3. Use the 1.4.0 reproduction tests, the 1.4.2 backend membership contract, the 1.4.3 dashboard projection contract, and the 1.4.5 tag mutation affected-view contract as the source for expected view switching behavior.
4. Do not use `docs/PHASE_LOG.md` as active phase guidance; it is historical only.
5. Do not create a product audit doc by default; capture product behavior through tests, FUTURE_PLANS acceptance criteria, AI_HANDOFF risks, and DECISIONS only for durable architecture choices.
6. Keep all generated implementation prompts prompt-fence safe.
7. Do not include nested fenced code blocks inside fenced master prompts.
---

## Architecture Boundary

- ChatGPT architect sees pushed GitHub state plus pasted evidence only.
- Local ChromaDB and local uncommitted changes must be pasted or pushed before they can influence ChatGPT architecture decisions.

---

## Current Product Snapshot

Tidy is an authenticated personal todo workspace with optimistic-first updates.

**User actions**: Create lists; add items; mark completion; rename/delete lists and items; tag lists; create custom tag-based views (ANY/ALL match modes); switch views; drag-and-drop reorder lists/items/views.

**Routes**:
- `/` - landing card
- `/register`, `/login`, `/forgot-password`, `/reset-password` - Supabase auth
- `/auth/confirm`, `/api/auth/confirm` - Supabase callbacks
- `/dashboard` - authenticated app (guarded by `proxy.ts`)

**Key files**:
- `app/dashboard/page.tsx` -> `components/Dashboard.tsx` -> `components/list/ListsContainer.tsx`
- `hooks/useOptimisticSync.ts` - module-level write queue
- `lib/dashboard-cache.ts` - centralized TanStack Query cache helpers
- `trpc/routers/_app.ts` - tRPC router root
- `trpc/init.ts` - auth context + `protectedProcedure`
- `prisma/schema.prisma` - database schema

---

## Architecture Invariants

**Data model:**
- Models: `List`, `ListItem`, `Tag`, `View`, `ViewList` (join; owns list order per view), `ViewTag`, `ListTag`
- Enums: `ViewType` (`ALL_LISTS`, `UNTAGGED`, `CUSTOM`), `ViewMatchMode` (`ALL`, `ANY`), `TagColor` (gray/red/orange/yellow/green/blue/purple/pink)
- Unique: `View.name` per user, `Tag.name` per user; `ViewList` PK is `[viewId, listId]`
- Cascades: deleting a list removes items, list-tags, and view-list memberships; deleting a tag removes list-tags/view-tags then triggers custom view recompute
- Sparse/negative order values used for top insertion - no compaction implemented yet

**Cache and state:**
- `view.getViewListsWithItems({ viewId: allListsView.id })` is the **canonical full dashboard payload**
- Selected view is an explicit payload, not a filtered copy of All Lists
- `ViewList.order` owns list order inside each view; `ListItem.order` owns item order inside each list
- `View.order` owns custom view order
- Dashboard cache key aliases: `views` -> `view.getAll`, `allLists` -> `view.getViewListsWithItems({ viewId: allListsView.id })`, `currentView` -> `view.getCurrentViewListsWithItems`, `selectedView` -> `view.getViewListsWithItems({ viewId: selectedViewId })`
- Projection: `ALL_LISTS` returns all lists; `CUSTOM` filters with `listMatchesView` using `ALL`/`ANY` match modes and zero-tag custom views match no lists; `UNTAGGED` returns only lists without tags; projected views apply per-view order from `ViewList` with list order fallback

**Optimistic updates:**
- Dashboard writes cache first, queues server saves second
- Drag hover stays local - cache writes happen only on drop, create, delete, rename, tag toggle, completion toggle
- Optimistic-only IDs must not be sent to server reorder endpoints
- Use `replacePending` for reorders and selections (only newest matters)
- Use `enqueue` for every action that must persist
- Active scopes: `views`, `list-tags`, `list-order`, `item-order`, `view-selection`, `list-edits`, `item-edits`
- Optimistic markers: `isOptimistic: true` on list/item shapes; `userId: "optimistic"` on view shapes
- List creation race: `ListComponent` waits for the optimistic list to be replaced by the saved server row before sending item creation requests

**Views and tags:**
- Custom view membership is materialized in `ViewList` rows - not computed at read time
- Frontend projection and backend refresh agree for dashboard-cache helper behavior before UI/UX polish.
- Tag operations batch with a 150ms window via `pendingTagOperationsRef` in `ListTagPicker`; `tag.applyListTagChanges` is the preferred batch write path
- Tag mutations keep writes in short transactions, then recompute affected custom views and return refreshed affected view projection payloads.
- View selection uses `replacePending`; only the newest in-flight fetch may write the current view cache after async completes

**Drag and drop:**
- Drag ids: `list-${id}` (list card), `list-item-${id}` (item row), `list-drop-${id}` (list drop zone)
- List reorder writes `ViewList.order`, not `List.order`
- Item cross-list move writes both `ListItem.listId` and `ListItem.order`
- `ALL_LISTS` view is pinned - not sortable; only custom views are reorderable

**Authentication:**
- All dashboard data is user-scoped by Supabase user id
- Use `protectedProcedure` for all user data
- Server-side ownership checks are mandatory even if UI only exposes owned IDs
- `absoluteUrl` resolves: `window.location.origin` (browser) -> `NEXT_PUBLIC_SITE_URL` -> `VERCEL_URL` -> localhost fallback

**Performance:**
- Batch raw SQL for reorder operations (`UPDATE ... FROM (VALUES ...)`) - individual Prisma updates caused timeout/performance issues
- Heavy custom view recompute should stay outside short Prisma interactive transactions

**Local-first (Dexie - Phases 1-2, foundation only):**
- Dexie is the local foundation layer - not the dashboard source of truth yet
- No auto-running sync worker is mounted
- No outbox replay is wired to dashboard mutations yet
- Dashboard data still comes from the server/TanStack/tRPC flow

---

## Data Flow

1. Browser renders `app/layout.tsx` - mounts `TRPCReactProvider`, `QueryClientProvider`, `AuthSync`
2. `/dashboard` guarded by `proxy.ts` -> `lib/supabase/proxy.ts` refreshes/verifies Supabase auth
3. `Dashboard.tsx` renders: account nav, `ListAdder`, `ViewsSidebarPreview`, `ListsContainer`
4. Components call tRPC query options from `trpc/client.tsx`
5. tRPC requests hit `app/api/trpc/[trpc]/route.ts` -> `trpc/init.ts` creates context -> `protectedProcedure` exposes `ctx.userId`
6. Routers in `trpc/routers/` read/write PostgreSQL via `lib/db.ts` + Prisma client
7. Optimistic changes write to TanStack Query cache first; server saves are queued via `useOptimisticSync`

---

## Known Risks

**Security (P0 - fix before expanding API surface):**
- `listItem.renameListItem`, `deleteListItem`, `setCompletionListItem` - protected but no parent list ownership check
- `listItem.reorderListItems` - verifies item ownership but not target list ownership
- `listItem.getListItems` - filters by `listId` only, no `parentList.userId` check

**Optimistic race scenarios (manual testing only):**
- Optimistic list creation followed by immediate item/tag changes before server save
- Fast view switching with multiple fetches in flight - stale fetch must not repaint dashboard
- Reorders involving optimistic-only rows - IDs must be filtered before sending to server
- Tag deletes or toggles that affect custom view membership mid-operation

**Data model gaps:**
- `ViewMatchMode.ANY` is supported by backend custom view recompute and frontend dashboard-cache projection helpers, but is not exposed in UI.
- `ViewType.UNTAGGED` exists in schema and frontend dashboard-cache projection helpers, but is not implemented as an exposed UI/server flow.

**Testing:**
- Tests should protect every product implementation phase unless a phase is explicitly docs-only or test-only.
- No API-level ownership tests yet
- Authenticated E2E requires Supabase credentials (`tests/.auth/user.json` + real env vars)
- No automated drag/drop tests; no keyboard drag accessibility validation

**Sync/durability:**
- Optimistic queues are in-memory - pending writes lost on refresh/crash
- No conflict policy for offline replay

**Product polish:**
- UI/UX polish is intentionally late, after projection correctness, ownership, optimistic behavior, and test baselines.
- Register submit button says "Login" (wrong copy)
- Landing page typo "optimisic" + generic "Simple Todo App" branding
- `apple-icon.png` referenced in metadata but missing from `public/`
