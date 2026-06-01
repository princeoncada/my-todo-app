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

- ~~1.2.4 - Handoff Drift Cleanup~~ (stable 2026-05-30)

- ~~1.2.5 - Phase Routing Guardrail Cleanup~~ (stable 2026-05-30)

- ~~1.2.6 - Roadmap Next-Phase Gate~~ (stable 2026-05-30)

- ~~1.2.7 - Prompt Fence Safety Hardening~~ (stable 2026-05-30)

- ~~1.3.0 - ChatGPT Architect Local Context Workflow~~ (stable 2026-05-30)

- ~~1.3.1 - ChatGPT Architect Workflow Proof and Layout Review~~ (stable 2026-05-30)

- ~~1.3.2 - ChatGPT Architect Real Workflow Test~~ (stable 2026-05-30)

- ~~1.3.3 - Docs Surface and Product Roadmap Rebaseline~~ (stable 2026-05-30)

- ~~1.4.0 - View Projection Reproduction Tests~~ (stable 2026-05-31)

- ~~1.4.1 - AI Handoff Next Session Cleanup~~ (stable 2026-05-31)

- ~~1.4.2 - Backend View Membership Contract~~ (stable 2026-05-31)

- ~~1.4.3 - Dashboard Cache Projection Contract~~ (stable 2026-05-31)

- ~~1.4.4 - Open Phase Roadmap Status Automation~~ (stable 2026-05-31)

- ~~1.4.5 - Tag Mutation Projection Regression~~ (stable 2026-05-31)

- ~~1.4.6 - View Switching Race Regression~~ (stable 2026-05-31)

- ~~1.4.7 - Create List + Create Item Race Regression~~ (stable 2026-05-31)

- ~~1.4.8 - Drag/Reorder Persistence Regression~~ (stable 2026-05-31)

- ~~1.4.9 - Branch-Based Phase Workflow Draft~~ (stable 2026-05-31)

- ~~1.4.10 - Context Index Routing Map~~ (stable 2026-05-31)

- ~~1.4.11 - AI Handoff Compression~~ (stable 2026-05-31)

- ~~1.4.12 - Validation-Gated Assistant Response Hardening~~ (stable 2026-05-31)

Pre-versioning (full detail in `docs/PHASE_LOG.md`):
- ~~Phase 1 - Dexie Foundation~~ (merged to master)
- ~~Phase 2 - Outbox Sync Queue~~ (ready for merge review)

---

## In Progress


- 1.4.13 - Codex Debugging Discipline Hardening (active) - see Planned
---

## Planned

### 1.4.13 - Codex Debugging Discipline Hardening
- **Status:** In progress | Priority: P1 debugging efficiency
- **Files:** docs/CODEX_RULES.md, docs/WORKFLOW.md if needed
- **Problem:** 1.4.8 showed that repeated in-alpha fixes can burn tokens and time when failure mode is not classified before changes.
- **Scope:** Add Karpathy-style engineering discipline as an improvement to the existing workflow, including failure classification, hypothesis blocks, allowed file sets, expected proof, rollback conditions, and product-code/test-helper separation rules.
- **Acceptance:** Codex must classify failures before fixes and avoid stacking speculative changes; existing validation boundaries and scope control remain intact.

### 1.4.14 - Phase Branch Commit Workflow Finalization
- **Status:** Open | Priority: P1 workflow reliability
- **Files:** docs/WORKFLOW.md, docs/CODEX_RULES.md, AGENTS.md, scripts/* only if enforcement is explicitly needed
- **Problem:** The workflow needs a finalized branch-based phase lifecycle that keeps master stable while preserving meaningful alpha/debugging commit history.
- **Scope:** Finalize phase branch lifecycle, merge strategy, meaningful commit rules, and optional script guardrails after the draft has been reviewed.
- **Acceptance:** master remains stable-only; phase branches preserve useful engineering history; fake activity commits are forbidden; workflow remains validation-gated and prompt-safe.

### 1.4.15 - Custom View Reorder E2E Stabilization
- **Status:** Open | Priority: P1 reorder test stability
- **Files:** components/views/ViewsSidebarPreview.tsx, tests/e2e/drag-drop.spec.ts, tests/e2e/utils/app.ts, tests/e2e/utils/assertions.ts, tests/e2e/utils/drag.ts, tests/e2e/utils/seed.ts
- **Problem:** Custom view reorder product code exists, but the authenticated E2E path was unstable and expanded 1.4.8 into helper/harness stabilization.
- **Scope:** stabilize custom view reorder setup, drag targeting, console-noise handling, and reload assertion without weakening the order expectation.
- **Acceptance:** authenticated custom view reorder E2E reliably proves final order persists after drop and refresh.

### 1.5.0 - Ownership Failure Test Baseline
- **Status:** Open | Priority: P0 security test baseline
- **Files:** trpc/routers/listItemRouter.ts, trpc/routers/*.ts, tests/
- **Problem:** Ownership/security gaps need explicit tests before router fixes are made.
- **Scope:** add tests for unauthenticated access, cross-user IDs, foreign list/item/tag/view IDs, and empty reorder input behavior.
- **Acceptance:** tests identify current ownership expectations; failures are explicit if current code is unsafe.

### 1.5.1 - List Item Ownership Fixes
- **Status:** Open | Priority: P0 security
- **Files:** trpc/routers/listItemRouter.ts, tests/
- **Problem:** listItem getListItems, renameListItem, deleteListItem, and setCompletionListItem are protected but do not consistently verify parentList.userId.
- **Scope:** verify parent list ownership before reading or mutating list items; preserve optimistic response shapes.
- **Acceptance:** foreign IDs cannot mutate or read another user's data; owned flows still work; tests pass.

### 1.5.2 - Reorder Target List Ownership Fix
- **Status:** Open | Priority: P0 security
- **Files:** trpc/routers/listItemRouter.ts, tests/
- **Problem:** reorderListItems validates item ownership but must also verify every target listId belongs to the user before raw SQL updates.
- **Scope:** validate item ids and target list ids before reorder; preserve empty input behavior as success; preserve owned cross-list moves.
- **Acceptance:** foreign target lists are rejected without mutation; owned cross-list reorder works; tests cover both.

### 1.5.3 - Ownership Regression Sweep
- **Status:** Open | Priority: P1 security regression
- **Files:** trpc/routers/*.ts, tests/
- **Problem:** After targeted ownership fixes, the router surface needs a final regression sweep.
- **Scope:** add or update coverage for list, listItem, tag, and view ownership failures; document remaining intentional gaps only if unavoidable.
- **Acceptance:** ownership behavior is repeatable, tested, and safe enough before expanding API surface.

### 1.6.0 - Optimistic Queue Race Test Baseline
- **Status:** Open | Priority: P0 optimistic stability
- **Files:** hooks/useOptimisticSync.ts, lib/dashboard-cache.ts, tests/
- **Problem:** Most optimistic race behavior is not automatically proven, even though the app depends on optimistic-first UX.
- **Scope:** add tests or test harnesses for enqueue, replacePending, rollback, cancellation, and independent mutation scopes.
- **Acceptance:** test baseline captures current queue behavior and known race risks.

### 1.6.1 - Scope Rollback Rules
- **Status:** Open | Priority: P0 optimistic stability
- **Files:** hooks/useOptimisticSync.ts, lib/dashboard-cache.ts, tests/
- **Problem:** Rollbacks must not wipe unrelated newer optimistic work or repaint stale cache snapshots.
- **Scope:** define and implement safer rollback rules per optimistic scope; add regression tests.
- **Acceptance:** failed mutations only rollback their own intended changes; newer visible user actions are preserved.

### 1.6.2 - Pending Mutation Cancellation Rules
- **Status:** Open | Priority: P1 optimistic stability
- **Files:** hooks/useOptimisticSync.ts, components/list/*, components/views/*, tests/
- **Problem:** replacePending is correct for newest-state-wins flows, but unsafe if applied to actions where every mutation must persist.
- **Scope:** review and test replacePending usage for reorder and view selection; keep enqueue for actions that must persist.
- **Acceptance:** only newest-state-wins flows cancel earlier work; required user actions are not dropped.

### 1.6.3 - Refresh/Crash Pending Work Decision
- **Status:** Open | Priority: P1 local-first decision
- **Files:** hooks/useOptimisticSync.ts, lib/local-db/*, docs/DECISIONS.md, docs/FUTURE_PLANS.md
- **Problem:** In-memory queues can lose pending writes on refresh or crash.
- **Scope:** decide whether to keep in-memory queues temporarily or begin Dexie-backed pending writes; record durable decision in DECISIONS.md if architecture changes.
- **Acceptance:** future direction is explicit; no accidental half-offline rewrite.

### 1.7.0 - Local DB Role Audit Through Tests
- **Status:** Open | Priority: P1 local-first clarity
- **Files:** lib/local-db/*, hooks/use-local-db-health-check.ts, tests/unit/*
- **Problem:** Dexie/local DB exists as foundation but is not the dashboard source of truth.
- **Scope:** prove what local DB currently does and does not do through tests; clarify that runtime behavior remains server/TanStack-driven unless later changed.
- **Acceptance:** local DB role is tested and understood before offline integration work.

### 1.7.1 - Outbox Replay Integration Test Plan
- **Status:** Open | Priority: P2 offline architecture
- **Files:** lib/local-db/sync-replay-client.ts, lib/sync/sync-endpoint-contract.ts, tests/
- **Problem:** Outbox replay helpers exist but are not connected to real app mutations.
- **Scope:** plan and test the integration contract before wiring replay into runtime behavior.
- **Acceptance:** replay integration risks are covered by tests or explicit follow-up phases.

### 1.7.2 - Offline Write Path Prototype
- **Status:** Open | Priority: P2 offline prototype
- **Files:** hooks/useOptimisticSync.ts, lib/local-db/*, lib/sync/*, tests/
- **Problem:** Offline/PWA goals require a proven write path, but a broad source-of-truth rewrite is risky.
- **Scope:** prototype the smallest safe offline write path; keep feature flags or isolation if needed.
- **Acceptance:** prototype is tested, scoped, and does not silently replace dashboard source of truth.

### 1.8.0 - Dashboard Component Responsibility Audit
- **Status:** Open | Priority: P1 maintainability planning
- **Files:** components/list/*, components/views/ViewsSidebarPreview.tsx, lib/dashboard-cache.ts
- **Problem:** Large dashboard components increase risk for focused changes.
- **Scope:** identify extraction targets and invariants without changing behavior.
- **Acceptance:** extraction sequence is clear and test-backed; no extra product audit doc is added.

### 1.8.1 - Extract Dashboard Query Key Helper
- **Status:** Open | Priority: P1 maintainability
- **Files:** lib/dashboard-cache.ts or new small helper, components/list/*, components/views/ViewsSidebarPreview.tsx, tests/
- **Problem:** Query key construction is duplicated across components.
- **Scope:** extract shared helper without changing key shapes.
- **Acceptance:** query keys remain identical; tests or assertions prove no key-shape change.

### 1.8.2 - Extract List Mutation Cache Helpers
- **Status:** Open | Priority: P1 maintainability
- **Files:** lib/dashboard-cache.ts, components/list/ListAdder.tsx, components/list/ListComponent.tsx, components/list/ListsContainer.tsx, tests/
- **Problem:** List mutations duplicate cache logic.
- **Scope:** move list mutation cache behavior into named helpers while preserving optimistic behavior.
- **Acceptance:** existing behavior and tests remain stable; new or updated tests cover helper behavior.

### 1.8.3 - Extract View Mutation Cache Helpers
- **Status:** Open | Priority: P1 maintainability
- **Files:** lib/dashboard-cache.ts, components/views/ViewsSidebarPreview.tsx, tests/
- **Problem:** View mutation logic is concentrated in a large component.
- **Scope:** extract view create/update/delete/select cache helpers.
- **Acceptance:** view behavior, query keys, and rollback behavior do not change; tests cover extracted helpers.

### 1.8.4 - Extract Tag Mutation Cache Helpers
- **Status:** Open | Priority: P1 maintainability
- **Files:** lib/dashboard-cache.ts, components/list/ListTagPicker.tsx, tests/
- **Problem:** Tag mutation cache behavior is complex and easy to regress.
- **Scope:** extract tag mutation cache helpers after projection behavior is stable.
- **Acceptance:** affected custom views update correctly; tests cover helper behavior.

### 1.9.0 - Deploy Env Documentation
- **Status:** Open | Priority: P2 production readiness
- **Files:** README.md, .env.example
- **Problem:** Deployment environment expectations must be clear before production use.
- **Scope:** document DATABASE_URL, Supabase env vars, site URL, and local/prod differences.
- **Acceptance:** new setup can follow docs without guessing.

### 1.9.1 - Build/Migration Readiness
- **Status:** Open | Priority: P2 production readiness
- **Files:** README.md, prisma/*, package.json only if needed
- **Problem:** Build and migration expectations need a repeatable release path.
- **Scope:** document Prisma generate, migration, and build steps.
- **Acceptance:** production build/migration flow is clear and repeatable.

### 1.9.2 - Production Smoke Checklist
- **Status:** Open | Priority: P2 production readiness
- **Files:** README.md, docs/FUTURE_PLANS.md
- **Problem:** Production changes need a small smoke checklist after deploy.
- **Scope:** document login, dashboard load, create list, create item, tag view, reorder, and refresh smoke checks.
- **Acceptance:** smoke checklist exists and does not duplicate full test docs.

### 1.10.0 - Copy and Metadata Hygiene
- **Status:** Open | Priority: P3 late polish
- **Files:** app/layout.tsx, public/*, README.md if needed
- **Problem:** Metadata and public assets need cleanup, but this should happen after core behavior is trustworthy.
- **Scope:** fix missing asset references and metadata consistency.
- **Acceptance:** metadata references existing assets; no behavior change.

### 1.10.1 - Auth Flow Copy Polish
- **Status:** Open | Priority: P3 late polish
- **Files:** components/auth/Register.tsx, auth components if needed
- **Problem:** Auth copy should be clearer after core behavior is stable.
- **Scope:** fix misleading copy such as Register submit language.
- **Acceptance:** copy is clear; auth behavior unchanged.

### 1.10.2 - Landing Page Branding Polish
- **Status:** Open | Priority: P3 late polish
- **Files:** app/page.tsx
- **Problem:** Landing copy and generic branding can be improved after product correctness.
- **Scope:** fix typo and improve lightweight Tidy positioning.
- **Acceptance:** copy improves without changing app behavior.

### 1.10.3 - Visual Review Pass
- **Status:** Open | Priority: P3 late UI/UX
- **Files:** components/list/*, components/views/ViewsSidebarPreview.tsx, app/page.tsx
- **Problem:** Subjective UI/UX polish should be last because correctness matters first.
- **Scope:** perform a small visual review pass only after state correctness, ownership, optimistic behavior, and tests are stable.
- **Acceptance:** visual changes are small, reviewable, and do not alter data behavior.

---

## Potential Next Directions (unversioned)

Assigned a version only when scoped.
- Rate limiting and abuse controls
- Observability
- Scale/performance profiling
- Order compaction
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

- No automated tests prove most optimistic race behavior yet.
- PWA/offline is not implemented despite product goals.
- In-memory queues can lose pending writes on refresh or crash.
- Large components increase risk for focused changes.
- API ownership gaps should land in 1.5.x before expanding API surface area.
- Frontend projection and backend refresh must agree before UI/UX polish.

