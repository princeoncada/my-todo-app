# Versioning

## Version Format

```
X.Y.Z-[state]
```

- **X** - Major: architectural shift (new persistence layer, framework upgrade, full system replacement)
- **Y** - Minor: significant feature or phase completion
- **Z** - Patch: bug fix, doc correction, minor tweak
- **State**: `alpha` (implemented, not validated) | `stable` (fully validated, committed to master)

## Five Versioning Locations

Every version bump must update **all five** in the same commit:

1. `STATE.json` - `version` + `state` fields (machine-readable oracle; read first every session)
2. `docs/VERSIONING.md` - version history table + current state (this file)
3. `docs/AI_HANDOFF.md` - version comment at top
4. `package.json` - `version` field
5. `docs/WORKFLOW.md` - version comment at top

Use `.\scripts\promote.ps1` to promote `-alpha` -> `-stable` across all five locations automatically.

## Doc Continuity Model

Every fact that appears in more than one doc has exactly ONE owner. Other docs must
either reference the owner (Point), be synced from it by a script (Sync), or be
checked against it by `validate.ps1` (Gate). Never hand-copy an owned fact into a
new place - that is how drift starts.

| Fact | Owner | Where it also appears | Kept in sync by |
|------|-------|-----------------------|-----------------|
| Version + state string | `STATE.json` (`version`, `state`) | VERSIONING (current + history), AI_HANDOFF (comment + prose), package.json, WORKFLOW (comment) | Sync: `promote.ps1` + Gate: `validate.ps1` |
| Phase identity (number + title) | `STATE.json` (`phase`, `phaseTitle`) | VERSIONING, AI_HANDOFF, PHASE_LOG | Manual today - GAP (FUTURE_PLANS NEXT-9) |
| Next phase (roadmap) | `STATE.json` (`nextPhase`) | VERSIONING (Next phase + Planned Phases), AI_HANDOFF | Manual today - GAP (FUTURE_PLANS NEXT-9) |
| Next backlog item | `docs/FUTURE_PLANS.md` (first Open) | reported at startup | Point: read fresh each session |
| Roadmap <-> backlog | VERSIONING Planned Phases <-> FUTURE_PLANS | each other | Manual - update both on any renumber |
| Session state snapshot | `STATE.json` + `docs/FUTURE_PLANS.md` | the chathead opener | Point: opener tells the AI to read them; it must NOT embed a snapshot |

Rules:
- Adding a new copy of an owned fact is drift. Point to the owner instead.
- On any phase renumber, update VERSIONING Planned Phases, FUTURE_PLANS, and
  PHASE_LOG target-version references together - they are not auto-synced.
- The chathead opener instructs reading `STATE.json` + `docs/FUTURE_PLANS.md`; it
  must never embed a "current state" or "next work" snapshot.

## Rules

**Bug Fix Rule**: Any bug discovered after a stable release always opens a `Z+1` patch. Never modify a stable release in place. The implementation prompt must bump all five locations to `X.Y.(Z+1)-alpha`.

**Version Ordering Rule**: Versions must be monotonically increasing and reflect actual implementation order, not planned order. If a phase is built out of sequence, assign the next available `Y.Z` after the last stable release - never fill gaps or retrofit.

**Alpha Rule**: A version stays `-alpha` until `npm run test:ci` passes clean. Do not promote to stable until the full validation suite is green.

---

## Current State

- **Current version:** 1.0.8
- **Current phase:** 1.0.8 - Doc Continuity Model
- **Next phase:** 1.1.0 - Graphify Integration

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

### Phase 1: Dexie Foundation (pre-1.0.0) - COMPLETE

Branch merged to master. Added local-first persistence layer:

- Dexie v4 local database + schema (`lib/local/db.ts`)
- Outbox operation types and metadata repository helpers
- Sync status model foundation
- No server sync triggered (intentional: foundation only, runtime behavior unchanged)

Phase log: `docs/PHASE_LOG.md` (Phase 1 section)

### Phase 2: Outbox Sync Queue (pre-1.0.0) - COMPLETE

Branch ready for merge review at time of versioning introduction. Added durable write queue infrastructure:

- `OutboxOperation` model with coalescing rules
- Replay client contract and sync endpoint scaffolding
- Sync status surface in UI
- Runtime behavior intentionally unchanged (auto-sync deferred to Phase 4)

Phase log: `docs/PHASE_LOG.md` (Phase 2 section)

### Phase 3: View Filter Hardening (pre-1.0.0) - IN PROGRESS

Active branch: `checkpoint/fix-cross-view-list-moves`. Fixing projection consistency for custom views (ANY-mode list visibility, cross-view list moves, tag relation consistency):

| Checkpoint | Branch | Status |
|---|---|---|
| 1: fix-view-list-projection | `checkpoint/fix-view-list-projection` | Done |
| 2: fix-tag-relation-consistency | `checkpoint/fix-tag-relation-consistency` | Done |
| 3: fix-cross-view-list-moves | `checkpoint/fix-cross-view-list-moves` | Active |
| 4-6 | TBD | Planned |

Phase log: `docs/PHASE_LOG.md` (Phase 3 section)

---

## Version History

| Version | State | Date | Phase | Notes |
|---------|-------|------|-------|-------|
| 1.0.8 | stable | 2026-05-29 | Doc Continuity Model | Doc Continuity Model added to VERSIONING.md; opener state snapshot removed and AGENTS.md/WORKFLOW.md updated to point at STATE.json + FUTURE_PLANS; stale PHASE_LOG target-version fixed (1.2.0 -> 1.3.0). |
| 1.0.7 | stable | 2026-05-29 | Anti-Drift Baseline | Version-consistency gate added to validate.ps1; Drift Guardrails + Startup Report disambiguation in AGENTS.md; 1.1.0/1.2.0 roadmap entries added; stale version markers removed. |
| 1.0.6 | stable | 2026-05-28 | Mojibake Resolution and Scan | fix-mojibake.ps1 created; AI_HANDOFF.md, VERSIONING.md, WORKFLOW.md repaired; mojibake scan step added to validate.ps1. |
| 1.0.5 | stable | 2026-05-28 | New Chathead Opener | docs/NEW_CHATHEAD_OPENER.md created with START/END copy-paste format; WORKFLOW.md session checkpoint updated to reference opener file; AGENTS.md command vocabulary extended with handoff command. |
| 1.0.4 | stable | 2026-05-28 | Validate Script Output Compression | validate.ps1 rewritten to suppress output on pass, surface on fail, add e2e step, fix -Encoding UTF8 on STATE.json read. WORKFLOW.md Section 2 template updated to use validate.ps1. |
| 1.0.3 | stable | 2026-05-28 | Promote Encoding Fix and Source-of-Truth Hardening | promote.ps1 Get-Content calls fixed with -Encoding UTF8; AGENTS.md repo source-of-truth rule added; FUTURE_PLANS v1.0.2 marked Done. |
| 1.0.2 | stable | 2026-05-28 | Commit Automation and Prompt Format Hardening | commit.ps1 canonical commit helper; WORKFLOW.md prompt format rewrite; CODEX_RULES.md and AGENTS.md commit discipline updated. |
| 1.0.1 | stable | 2026-05-28 | AGENTS.md Hardening | Rewrites AGENTS.md startup guidance, removes inline-breaking fenced blocks, documents Claude Code command vocabulary, and tracks the v1.0.2 commit automation patch. |
| 1.0.0 | stable | 2026-05-28 | AI Workflow Foundation | First versioned release. STATE.json, VERSIONING, WORKFLOW, COMPACT_STRATEGY, ChromaDB scripts, validate/promote automation, AGENTS.md + entrypoint updates. |

---

## Planned Phases

| Version | Phase | Description |
|---------|-------|-------------|
| 1.0.0 | AI Workflow Foundation | STATE.json, versioning, workflow docs, ChromaDB doc query scripts, automation scripts. |
| 1.0.1 | AGENTS.md Hardening | LF-only AGENTS.md rewrite, indented command examples, streamlined startup protocol, and Claude Code command vocabulary. |
| 1.0.2 | Commit Automation and Prompt Format Hardening | Single-file commit helper and structured Codex prompt/post-validation workflow. |
| 1.0.7 | Anti-Drift Baseline | Version-consistency gate, Drift Guardrails, Startup Report disambiguation, roadmap grooming |
| 1.0.8 | Doc Continuity Model | Per-fact owner map (Point/Sync/Gate) in VERSIONING.md; opener state snapshot removed; PHASE_LOG renumber fix |
| 1.1.0 | Graphify Integration | Port hfk-system graphify wiring (generate-codebase-graph scripts, .graphifyignore, CODEBASE_GRAPH.md), generate codebase-graph.json, route orientation through the graph in AGENTS.md |
| 1.2.0 | ChromaDB Bootstrap | Operationalize ChromaDB: reconcile query/ingest scripts, npm run chroma, create + ingest chroma-data, validate.ps1 auto-start + ingest |
| 1.3.0 | Phase 3 Completion | Finish View Filter Hardening checkpoints 4-6 |
| 2.0.0 | Phase 4: Operation Coalescing | Outbox coalescing + replay client wiring |
| 2.1.0 | Phase 5: Rollback Safety | Dexie-backed rollback for optimistic write failures |
| 3.0.0 | Phase 6: Scale Prep | Performance + query optimization |
| 3.1.0 | Phase 7: Security Hardening | Ownership checks, auth gap closure |
| 3.2.0 | Phase 8: Observability | Logging, error tracking, monitoring |
