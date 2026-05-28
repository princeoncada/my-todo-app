# Versioning

## Version Format

```
X.Y.Z-[state]
```

- **X** — Major: architectural shift (new persistence layer, framework upgrade, full system replacement)
- **Y** — Minor: significant feature or phase completion
- **Z** — Patch: bug fix, doc correction, minor tweak
- **State**: `alpha` (implemented, not validated) | `stable` (fully validated, committed to master)

## Five Versioning Locations

Every version bump must update **all five** in the same commit:

1. `STATE.json` — `version` + `state` fields (machine-readable oracle; read first every session)
2. `docs/VERSIONING.md` — version history table + current state (this file)
3. `docs/AI_HANDOFF.md` — version comment at top
4. `package.json` — `version` field
5. `docs/WORKFLOW.md` — version comment at top

Use `.\scripts\promote.ps1` to promote `-alpha` → `-stable` across all five locations automatically.

## Rules

**Bug Fix Rule**: Any bug discovered after a stable release always opens a `Z+1` patch. Never modify a stable release in place. The implementation prompt must bump all five locations to `X.Y.(Z+1)-alpha`.

**Version Ordering Rule**: Versions must be monotonically increasing and reflect actual implementation order, not planned order. If a phase is built out of sequence, assign the next available `Y.Z` after the last stable release — never fill gaps or retrofit.

**Alpha Rule**: A version stays `-alpha` until `npm run test:ci` passes clean. Do not promote to stable until the full validation suite is green.

---

## Pre-Versioning Baseline

Everything below was built before formal versioning was introduced (pre-1.0.0). Documented for traceability.

### Core Application Bootstrap (pre-1.0.0)

Tidy was bootstrapped as a Next.js 16 / React 19 / TypeScript strict productivity app:

- **Auth**: Supabase email/password + OTP; proxy-guarded `/dashboard` route (`proxy.ts`)
- **API**: tRPC 11 with protected procedures, Prisma 7 + PostgreSQL via `@prisma/adapter-pg`
- **Client state**: TanStack Query 5, `lib/dashboard-cache.ts` centralized cache helpers, `hooks/useOptimisticSync.ts` module-level queue
- **UI**: dnd-kit drag-and-drop, shadcn/radix, Tailwind v4, Framer Motion
- **Features**: Lists, items (with completion + ordering), custom views, tag system (ALL/ANY match modes), view reordering
- **Docs**: `docs/ai/` system with 14 feature reference docs (deprecated in v1.0.0; content consolidated into `docs/AI_HANDOFF.md` and `docs/CODEX_RULES.md`)

### Phase 1: Dexie Foundation (pre-1.0.0) — COMPLETE

Branch merged to master. Added local-first persistence layer:

- Dexie v4 local database + schema (`lib/local/db.ts`)
- Outbox operation types and metadata repository helpers
- Sync status model foundation
- No server sync triggered (intentional: foundation only, runtime behavior unchanged)

Phase log: `docs/PHASE_LOG.md` (Phase 1 section)

### Phase 2: Outbox Sync Queue (pre-1.0.0) — COMPLETE

Branch ready for merge review at time of versioning introduction. Added durable write queue infrastructure:

- `OutboxOperation` model with coalescing rules
- Replay client contract and sync endpoint scaffolding
- Sync status surface in UI
- Runtime behavior intentionally unchanged (auto-sync deferred to Phase 4)

Phase log: `docs/PHASE_LOG.md` (Phase 2 section)

### Phase 3: View Filter Hardening (pre-1.0.0) — IN PROGRESS

Active branch: `checkpoint/fix-cross-view-list-moves`. Fixing projection consistency for custom views (ANY-mode list visibility, cross-view list moves, tag relation consistency):

| Checkpoint | Branch | Status |
|---|---|---|
| 1: fix-view-list-projection | `checkpoint/fix-view-list-projection` | Done |
| 2: fix-tag-relation-consistency | `checkpoint/fix-tag-relation-consistency` | Done |
| 3: fix-cross-view-list-moves | `checkpoint/fix-cross-view-list-moves` | Active |
| 4–6 | TBD | Planned |

Phase log: `docs/PHASE_LOG.md` (Phase 3 section)

---

## Version History

| Version | State | Date | Phase | Notes |
|---------|-------|------|-------|-------|
| 1.0.0 | alpha | 2026-05-28 | AI Workflow Foundation | First versioned release. STATE.json, VERSIONING, WORKFLOW, COMPACT_STRATEGY, ChromaDB scripts, validate/promote automation, AGENTS.md + entrypoint updates. |

---

## Planned Phases

| Version | Phase | Description |
|---------|-------|-------------|
| **1.0.0** | AI Workflow Foundation | STATE.json, versioning, workflow docs, ChromaDB doc query scripts, automation scripts. **(current)** |
| 1.1.0 | Graphify Integration | Install graphify, generate codebase-graph.json, add graph navigation discipline to AGENTS.md |
| 1.2.0 | Phase 3 Completion | Finish View Filter Hardening checkpoints 4–6 |
| 2.0.0 | Phase 4: Operation Coalescing | Outbox coalescing + replay client wiring |
| 2.1.0 | Phase 5: Rollback Safety | Dexie-backed rollback for optimistic write failures |
| 3.0.0 | Phase 6: Scale Prep | Performance + query optimization |
| 3.1.0 | Phase 7: Security Hardening | Ownership checks, auth gap closure |
| 3.2.0 | Phase 8: Observability | Logging, error tracking, monitoring |
