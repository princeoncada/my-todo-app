# Future Plans

Single version-sequenced plan for Tidy. This file is the ONE owner of the roadmap;
`docs/VERSIONING.md` holds history + rules only. Every committed item carries its
target version. Only Potential Next Directions are unversioned. Update every phase.

Current version: see `STATE.json` (do not restate it here).

Version rules: patches (Z) may ship under the current minor before the next X/Y.
Inserting a new minor/major pushes later Planned numbers back to stay monotonic
(see the Planned Renumber Rule in `docs/VERSIONING.md`).

## Status Legend
- `Open`: not started
- `In progress`: active branch
- `Blocked`: needs an external decision/dependency
- `Done`: completed (struck through under Completed)

---

## Completed

- ~~1.0.0 - AI Workflow Foundation~~ (stable 2026-05-28)
- ~~1.0.1 - AGENTS.md Hardening~~ (stable 2026-05-28)
- ~~1.0.2 - Commit Automation and Prompt Format Hardening~~ (stable 2026-05-28)
- ~~1.0.3 - Promote Encoding Fix and Source-of-Truth Hardening~~ (stable 2026-05-28)
- ~~1.0.4 - Validate Script Output Compression~~ (stable 2026-05-28)
- ~~1.0.5 - New Chathead Opener~~ (stable 2026-05-28)
- ~~1.0.6 - Mojibake Resolution and Scan~~ (stable 2026-05-28)
- ~~1.0.7 - Anti-Drift Baseline~~ (stable 2026-05-29)
- ~~1.0.8 - Doc Continuity Model~~ (stable 2026-05-29)
- ~~1.0.9 - Promote Self-Verify and CLAUDE.md Continuity~~ (stable 2026-05-29)
- ~~1.0.10 - Roadmap Consolidation~~ (stable 2026-05-29)
- ~~1.0.11 - Session Continuity and Bounded Initiative~~ (stable 2026-05-29)

- ~~1.0.12 - Phase Identity Sync~~ (stable 2026-05-29)

- ~~1.0.13 - Prompt and Commit Output Format Hardening~~ (stable 2026-05-29)

- ~~1.1.0 - Graphify Integration~~ (stable 2026-05-29)

- ~~1.1.1 - Graph Stable Refresh Fix~~ (stable 2026-05-29)

- ~~1.1.2 - Graph Audit Harness~~ (stable 2026-05-29)

- ~~1.1.3 - Codex Validation Boundary Hardening~~ (stable 2026-05-29)

- ~~1.1.4 - Graph Routing Usage Contract~~ (stable 2026-05-29)

- ~~1.2.0 - ChromaDB Bootstrap~~ (stable 2026-05-30)

- ~~1.2.1 - Graph Navigation Doc Consistency~~ (stable 2026-05-30)

- ~~1.2.2 - Chroma Visibility Fix~~ (stable 2026-05-30)

- ~~1.2.3 - Startup Oracle Cleanup~~ (stable 2026-05-30)

Pre-versioning (full detail in `docs/PHASE_LOG.md`):
- ~~Phase 1 - Dexie Foundation~~ (merged to master)
- ~~Phase 2 - Outbox Sync Queue~~ (ready for merge review)

---

## In Progress


- 1.2.4 - Handoff Drift Cleanup (active) - see Planned
---

## Planned

### 1.2.4 - Handoff Drift Cleanup
- **Status:** In progress | Priority: P0 workflow anti-drift
- **Files:** docs/AI_HANDOFF.md, docs/VERSIONING.md, docs/PHASE_LOG.md
- **Problem:** AI_HANDOFF contains stale next-session instructions pointing to completed 1.1.4 work; VERSIONING has a stable 1.2.2 row that still says in progress; PHASE_LOG has old 1.0.0 wording that says promotion is pending.
- **Scope:** update handoff next-session instructions to point to the current cleanup sequence and then 1.3.0; fix stale historical wording without changing app behavior.
- **Acceptance:** no doc tells the architect to resume completed 1.1.x work; stable history does not say in progress; old promotion-pending wording is removed or corrected.

### 1.2.5 - Phase Routing Guardrail Cleanup
- **Status:** Open | Priority: P0 workflow anti-drift
- **Files:** AGENTS.md, docs/WORKFLOW.md, docs/CODEX_RULES.md, docs/FUTURE_PLANS.md, docs/AI_HANDOFF.md, docs/PHASE_LOG.md
- **Problem:** Phase 3 checkpoint count and routing language are inconsistent across docs; startup protocol differs between AGENTS and WORKFLOW; Codex roadmap-update wording can be misread as permission to move roadmap state manually.
- **Scope:** normalize Phase 3 checkpoint count and treatment of manual-regression docs; align startup protocol wording around `git pull origin master`; tighten Codex roadmap-update boundaries.
- **Acceptance:** one Phase 3 checkpoint model exists across docs; startup protocol has no AGENTS/WORKFLOW contradiction; Codex cannot misread FUTURE_PLANS wording as broad permission to move roadmap state.

### 1.3.0 - Phase 3 Completion: View Filter Hardening
- **Status:** Open | Priority: projection correctness
- **Phase log:** docs/PHASE_LOG.md (Phase 3)
- **Problem:** Lists created in All Lists or custom views do not consistently appear in other custom views when filter tags match.
- **Scope:** finish checkpoints 4-6; includes dashboard cache projection test coverage (selectedViewFromCache, projectView, list update/removal helpers, tag add/remove projection, view-selection projection).
- **Acceptance:** All Lists shows all lists; ANY/ALL custom views correct; retag/create/move/reorder/refresh/switch deterministic; matching projection tests; no Dexie expansion, source-of-truth rewrite, drag/drop rewrite, or broad tRPC rewrite.

### 1.4.0 - Ownership Hardening (Security)
- **Status:** Open | Priority: P0/P1 security
- **Files:** trpc/routers/listItemRouter.ts, components/list/ListsContainer.tsx, trpc/init.ts, trpc/routers/*.ts
- **Problem:** listItem getListItems/renameListItem/deleteListItem/setCompletionListItem are protected but do not verify parentList.userId; reorderListItems does not verify target list ownership.
- **Scope:** scope each listItem procedure through parentList.userId === ctx.userId (foreign ids -> FORBIDDEN/NOT_FOUND without mutating); reorder validates item ids AND target list ids before raw SQL (empty input still { success: true }); add ownership/API tests for list/listItem/tag/view ownership failures and unauthenticated -> UNAUTHORIZED.
- **Acceptance:** optimistic rename/delete/completion shapes unchanged; cross-list moves among owned lists still work; tests repeatable and documented.

### 1.5.0 - Product Polish
- **Status:** Open | Priority: P1/P2 UX + correctness
- **Files:** app/layout.tsx, public/icon-clean.png, components/auth/Register.tsx, app/page.tsx
- **Scope:** fix metadata/asset mismatch (metadata references /apple-icon.png missing from public/ - add the asset or update the reference); Register submit copy says "Login" -> account-creation language; fix landing typo "optimisic" and generic "Simple Todo App" branding.
- **Acceptance:** metadata references existing assets only; no auth flow behavior change.

### 1.6.0 - Cache & Tag Maintainability
- **Status:** Open | Priority: P2 maintainability + consistency
- **Files:** trpc/routers/tagRouter.ts, trpc/routers/viewHelpers.ts, components/list/ListAdder.tsx, components/list/ListsContainer.tsx, components/list/ListComponent.tsx, components/list/ListTagPicker.tsx, lib/dashboard-cache.ts
- **Scope:** tag.removeFromList recompute once per logical remove; shared dashboard query-key helper (no key-shape change); replace string-matching invalidateViewPayloadQueries with typed/stable key matching.
- **Acceptance:** optimistic + invalidation behavior unchanged; custom-view membership correct after tag remove.

### 1.7.0 - Component Decomposition
- **Status:** Open | Priority: P2 maintainability
- **Files:** components/views/ViewsSidebarPreview.tsx, components/list/ListTagPicker.tsx, components/list/ListComponent.tsx, components/list/ListsContainer.tsx
- **Scope:** extract small named hooks/helpers from the large dashboard components.
- **Acceptance:** no query keys, mutation inputs, optimistic rollback behavior, or drag/drop invariants change.

### 1.8.0 - Test Coverage Expansion
- **Status:** Open | Priority: P2 correctness + regression prevention
- **Files:** trpc/routers/viewHelpers.ts, tests/, components/list/*, components/views/*
- **Scope:** view-helper recompute tests (empty tag sets, all-tags matching, previous-order preservation, all-lists fallback, no-match); E2E for list creation, tag changes affecting custom views, fast view switching, drag/drop reorder; documented auth/test-user setup.
- **Acceptance:** tests repeatable; authenticated E2E setup documented.

### 1.9.0 - Deploy Readiness
- **Status:** Open | Priority: P2 production readiness
- **Files:** README.md, .env.example
- **Scope:** document DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL; build/deploy steps note Prisma generate + migration expectations.

### 2.0.0 - Phase 4: Operation Coalescing
- **Status:** Open | Priority: P3 architecture
- **Files:** hooks/useOptimisticSync.ts, lib/dashboard-cache.ts
- **Scope:** outbox coalescing + replay client wiring.

### 2.1.0 - Phase 5: Rollback Safety
- **Status:** Open | Priority: P3 architecture
- **Files:** hooks/useOptimisticSync.ts, lib/dashboard-cache.ts
- **Scope:** Dexie-backed rollback for optimistic write failures; durable optimistic sync/offline strategy (in-memory queues currently lose pending writes on refresh/crash).

### 2.2.0 - Order Compaction
- **Status:** Open | Priority: P3 long-term data health
- **Files:** trpc/routers/listRouter.ts, trpc/routers/listItemRouter.ts, trpc/routers/viewRouter.ts, prisma/schema.prisma
- **Scope:** compaction strategy for sparse/negative order values over long-lived accounts.

### 3.0.0 - Phase 6: Scale Prep
- **Status:** Open | Priority: P3 performance
- **Files:** components/list/ListsContainer.tsx, trpc/routers/viewHelpers.ts, lib/dashboard-cache.ts
- **Scope:** performance + query optimization; profile and optimize large accounts.

### 3.1.0 - Rate Limiting & Abuse Controls
- **Status:** Open | Priority: P3 production hardening
- **Files:** trpc/init.ts, trpc/routers/*.ts
- **Scope:** rate limiting + abuse controls.

### 3.2.0 - Phase 8: Observability
- **Status:** Open | Priority: P3 operations
- **Files:** hooks/useOptimisticSync.ts, trpc/routers/*.ts, lib/optimistic-debug.tsx
- **Scope:** logging, error tracking, monitoring for API + sync failures.

---

## Potential Next Directions (unversioned)

Assigned a version only when scoped.
- PWA manifest, icon set, service-worker plan (app/layout.tsx, public/*)
- Mobile/touch drag-drop + responsive QA (components/list/*)
- Accessibility + UI polish pass (components/list/*, components/views/ViewsSidebarPreview.tsx)
- Sync or retire older root docs (docs/deprecated/*, README.md)
- Migration/backfill playbook (prisma/schema.prisma, prisma/migrations/*)

---

## Discarded / Won't Do

(none recorded yet)

---

## Known Cross-Cutting Risks

- No automated tests prove most optimistic race behavior yet
- PWA/offline is not implemented despite product goals
- In-memory queues can lose pending writes on refresh or crash
- Large components increase risk for focused changes
- API ownership gaps (1.4.0) should land before expanding API surface area
