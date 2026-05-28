# Decisions

Captures important implementation decisions so future sessions preserve intent. Add dated entries when changes alter architecture or behavior. Include the reason — not only the outcome.

If a decision invalidates another doc, update both. Decisions that affect production risk should also update `docs/AI_HANDOFF.md` Known Risks section.

---

## 2026-05-28: Adopted HFK-style AI workflow

Migrated tidy's docs to an HFK-style workflow: STATE.json oracle, five-location versioning, ChromaDB doc query, CODEX_RULES.md, AI_HANDOFF.md, PHASE_LOG.md, FUTURE_PLANS.md, DECISIONS.md, validate/promote scripts.

**Reason**: Tidy and HFK are structurally similar apps (UI-heavy, optimistic updates, growing AI docs). As docs/ai/ grows beyond 20 files, session-start overhead compounds. ChromaDB query-first retrieval reduces this 60–70% and makes the workflow scale with the project.

**Impact**: Old docs/ai workflow-layer files (00-entrypoint, 01-state, 12-rules, 15-decisions, backlog, codex-template, phase-logs/) are deprecated but their content is preserved in the new docs.

---

## 2026-05-09: AI docs are mandatory maintenance surface

Every future implementation must update the relevant AI docs and backlog in the same PR.

**Reason**: Future Codex sessions should read compact repo-specific docs instead of scanning the whole repo.

---

## Existing: All Lists is the canonical full dashboard payload

`view.getViewListsWithItems({ viewId: allListsView.id })` is treated as the full list/item/tag payload. Selected/custom views are explicit payloads or projections from All Lists plus view metadata.

**Reason**: Custom view order and membership are view-specific and should not collapse into a single current-view source of truth.

---

## Existing: View membership is materialized in `ViewList`

Custom views store matching lists in `ViewList`, not only computed on every read.

**Reason**: Each view needs stable list ordering and efficient payload reads.

---

## Existing: Drag hover is local-only

List, item, and view drag hover updates local preview state. Drop commits cache once and schedules one server save.

**Reason**: Hover fires too frequently and should not rewrite large query caches.

---

## Existing: Reorders use batch SQL

`view.reorderViews`, `view.reorderViewLists`, and `listItem.reorderListItems` use raw SQL `UPDATE ... FROM (VALUES ...)`.

**Reason**: Many small individual Prisma updates caused timeout/performance issues.

---

## Existing: Reorder and selection saves replace pending work

Reorders and selected-view saves use `replacePending`.

**Reason**: Only the newest final visible state matters.

---

## Existing: Heavy view recompute should avoid long transactions

Several flows recompute custom views after short write transactions rather than inside them.

**Reason**: Prisma interactive transactions can timeout on large accounts.

---

## Existing: Client UUIDs support optimistic creation

Lists, items, tags, and views accept client-generated IDs.

**Reason**: UI can render optimistic objects immediately and reconcile them with server responses.
