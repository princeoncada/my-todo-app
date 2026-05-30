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
| Phase identity (number + title) | `STATE.json` (`phase`, `phaseTitle`) | VERSIONING (Current State), AI_HANDOFF (Current Phase), PHASE_LOG | Gate: `validate.ps1` checks current VERSIONING and AI_HANDOFF copies against STATE.json |
| Next phase | `STATE.json` (`nextPhase`) | VERSIONING (Next phase line), AI_HANDOFF (Next line) | Gate: `validate.ps1` checks current VERSIONING and AI_HANDOFF copies against STATE.json |
| Next backlog item | `docs/FUTURE_PLANS.md` (first Planned) | reported at startup | Point: read fresh each session |
| Roadmap (version-sequenced) | `docs/FUTURE_PLANS.md` (Planned) | VERSIONING holds history only; startup reads it | Point: FUTURE_PLANS is the single roadmap owner |
| Roadmap closeout | `docs/FUTURE_PLANS.md` (Completed / In Progress / Planned) | promotion workflow | Sync: `promote.ps1` closes the promoted roadmap item + Gate: `validate.ps1` catches stale phase/backlog drift |
| Session state snapshot | `STATE.json` + `docs/FUTURE_PLANS.md` | the chathead opener | Point: opener tells the AI to read them; it must NOT embed a snapshot |
| Project rules / entrypoint | `AGENTS.md` | `CLAUDE.md` (imports it via `@AGENTS.md`) | Point: CLAUDE.md must stay a one-line import and never restate rules |

Rules:
- Adding a new copy of an owned fact is drift. Point to the owner instead.
- `CLAUDE.md` is a thin `@AGENTS.md` import - never add rule text directly to it.
- The roadmap lives only in `docs/FUTURE_PLANS.md` (Planned). Do not keep a second
  roadmap table in VERSIONING.md.
- FUTURE_PLANS remains the single owner of the forward roadmap. Promotion may
  close the promoted roadmap item there, but FUTURE_PLANS is roadmap state, not
  a sixth versioning location.
- On any phase renumber, update FUTURE_PLANS (Planned) and PHASE_LOG target-version
  references together - they are not auto-synced.
- The chathead opener instructs reading `STATE.json` + `docs/FUTURE_PLANS.md`; it
  must never embed a "current state" or "next work" snapshot.

## Rules

**Bug Fix Rule**: Any bug discovered after a stable release always opens a `Z+1` patch. Never modify a stable release in place. The implementation prompt must bump all five locations to `X.Y.(Z+1)-alpha`.

**Version Ordering Rule**: Versions must be monotonically increasing and reflect actual implementation order, not planned order. If a phase is built out of sequence, assign the next available `Y.Z` after the last stable release - never fill gaps or retrofit.

**Planned Renumber Rule**: Planned (not-yet-built) versions in `docs/FUTURE_PLANS.md` may be renumbered to stay monotonic. Inserting a new minor or major pushes the later planned numbers back (e.g. inserting 1.2.0 pushed Phase 3 Completion 1.2.0 -> 1.3.0). Patches (Z) may ship under the current minor before the next X/Y. Renumber only planned items - never a released version.

**Alpha Rule**: A version stays `-alpha` until `npm run test:ci` passes clean. Do not promote to stable until the full validation suite is green.

---

## Current State

- **Current version:** 1.1.3-alpha
- **Current phase:** 1.1.3 - Codex Validation Boundary Hardening
- **Next phase:** 1.2.0 - ChromaDB Bootstrap

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
| 1.1.3 | alpha | 2026-05-29 | Codex Validation Boundary Hardening | Clarifies validation is user/controller-run, forbids Codex self-validation claims, and removes contradictory Required Tests wording. |
| 1.1.2 | stable | 2026-05-29 | Graph Audit Harness | Adds a graph audit harness that proves required nodes, classifications, protected-path exclusions, and routing metadata without adding startup-loop overhead. |
| 1.1.1 | stable | 2026-05-29 | Graph Stable Refresh Fix | Fixes stable promotion graph freshness by regenerating and verifying codebase-graph.json during promote.ps1. |
| 1.1.0 | stable | 2026-05-29 | Graphify Integration | Adds Graphify/fallback codebase graph generation, committed codebase-graph.json, startup graph orientation, and validate graph freshness checks. |
| 1.0.13 | stable | 2026-05-29 | Prompt and Commit Output Format Hardening | Hardens copy-paste-safe output rules for Codex prompts, validation blocks, alpha commit blocks, stable promotion commit blocks, and push blocks. |
| 1.0.12 | stable | 2026-05-29 | Phase Identity Sync | Adds phase identity and roadmap closeout guards; promote.ps1 closes the promoted roadmap item in FUTURE_PLANS.md; validate.ps1 catches stale phase/backlog drift. |
| 1.0.11 | stable | 2026-05-29 | Session Continuity and Bounded Initiative | AGENTS.md gains Session Continuity (proactive SESSION_LOG checkpoint) and Working Posture (strict rails + active initiative) sections; WORKFLOW.md checkpoint cross-reference; stale Open->Planned references fixed. |
| 1.0.10 | stable | 2026-05-29 | Roadmap Consolidation | FUTURE_PLANS.md rewritten as the single version-sequenced roadmap; Planned Phases table removed from VERSIONING.md; Planned Renumber Rule added; all former NOW/NEXT/LATER items assigned target versions. |
| 1.0.9 | stable | 2026-05-29 | Promote Self-Verify and CLAUDE.md Continuity | promote.ps1 self-verifies the five versioning locations and fixes its commit echo; WORKFLOW.md drops the redundant post-promote validation; Doc Continuity Model now covers CLAUDE.md. |
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

The forward roadmap lives in `docs/FUTURE_PLANS.md` (the `Planned` section) - the
single version-sequenced owner. This file keeps history + rules only. Do not
maintain a second roadmap table here.
