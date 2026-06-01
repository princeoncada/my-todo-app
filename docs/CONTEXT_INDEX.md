# Context Index

Routing-only map for choosing the smallest correct document and source read set
for a task. This file is for scoping context; it is not an active rules surface.

This file does not define:

- workflow rules
- implementation rules
- roadmap state
- versioning rules
- product invariants
- historical phase guidance

Startup should stay compact. Use this index during scoping to choose the
smallest correct document set. Do not automatically expand every startup read
unless the startup protocol is changed later by a dedicated workflow phase.

---

## Source Of Truth

- `STATE.json` = machine-readable version, state, phase, nextPhase oracle
- `docs/FUTURE_PLANS.md` = roadmap owner
- `docs/AI_HANDOFF.md` = current product state, invariants, risks, next-session guidance
- `docs/CODEX_RULES.md` = implementation rules, validation boundaries, testing rules, commit discipline
- `docs/WORKFLOW.md` = process and phase workflow
- `docs/VERSIONING.md` = versioning rules and history table
- `docs/PHASE_LOG.md` = historical traceability only, not active guidance
- `docs/SESSION_LOG/` = historical session continuity logs only, not active guidance
- `docs/SESSION_LOG.md` = session log index/pointer only, not active guidance
- `docs/NEW_CHATHEAD_OPENER.md` = standard next-chat opener reference only, not active guidance
- `docs/DECISIONS.md` = durable architecture decisions
- `codebase-graph.json` = routing/orientation only, not source of truth

---

## Task Routes

### Startup

- `STATE.json`
- `codebase-graph.json`
- `docs/FUTURE_PLANS.md`

### Docs-Only Roadmap Phase

- `docs/FUTURE_PLANS.md`
- `docs/WORKFLOW.md` only if process changes
- `docs/VERSIONING.md` only if versioning rules change

### Product Implementation

- `docs/AI_HANDOFF.md`
- `docs/CODEX_RULES.md`
- graph-selected source files

### Debugging Failing Test

- `docs/CODEX_RULES.md`
- failing test file
- smallest suspected implementation file set
- test helper only if failure classification points there

### Versioning/Script Phase

- `docs/VERSIONING.md`
- `docs/WORKFLOW.md`
- affected scripts

### Historical Investigation

- `docs/PHASE_LOG.md`
- `docs/SESSION_LOG/`
- `docs/SESSION_LOG.md`
- relevant completed phase notes only

### Architecture Decision

- `docs/DECISIONS.md`
- `docs/AI_HANDOFF.md` if current architecture invariants are affected
- `docs/FUTURE_PLANS.md` if follow-up roadmap work is needed

---

## Do Not Read By Default

- `docs/PHASE_LOG.md` for active implementation
- `docs/SESSION_LOG/` for active implementation
- `docs/SESSION_LOG.md` for active implementation
- `docs/NEW_CHATHEAD_OPENER.md` as a substitute for reading source-of-truth docs
- full repository tree
- product source files unrelated to the graph-selected task
- old deprecated docs unless explicitly scoped
- generated Prisma output
