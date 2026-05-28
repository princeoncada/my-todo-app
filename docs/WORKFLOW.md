# Agent Workflow

<!-- Current Version: 1.0.0 -->

This file governs how Claude Code and Codex operate together in Tidy. Read it at session start alongside `STATE.json`. It is the authoritative protocol for all implementation phases.

---

## Roles

### Claude Code (Planning, Validation, Commit Blocks)

Claude Code is the **planning and validation layer**. It reads project state, scopes work, writes Codex prompts, validates output, and provides commit blocks for the user to run.

Claude Code does **not**: implement code, commit, push, run `npm run test:ci`, create branches, or run validation scripts.

**Exception**: Claude Code may implement directly only when explicitly unlocked with the [Implementation Gate](#implementation-gate) phrase.

### Codex (Implementation)

Codex is the **implementation layer**. It reads docs, edits source files, and summarizes what changed.

Codex does **not**: commit, push, run `npm run test:ci`, create branches, or run any scripts.

---

## Session Start Protocol (Every Session)

Run these steps at the start of every Claude Code session before asking for direction:

1. `git pull origin master` â€” sync latest
2. **Read `STATE.json`** â€” report: version, state, phase, phaseTitle, nextPhase, any in-progress branch, pre-versioning notes
3. **Query ChromaDB** (when running on `localhost:8000`):
   ```bash
   python scripts/query_docs.py "<your question about the current task>"
   ```
   One query per topic. Trust the first result. Only open the full doc file if the query returns zero relevant content. State why if falling back: "Query returned zero results for X, falling back because..."
4. **Report findings**. Wait for explicit user direction before scoping or implementing.

See `docs/COMPACT_STRATEGY.md` for token budget targets and the full context-minimization protocol.

---

## Implementation Gate

Claude Code implements directly **only** when the user provides this exact phrase:

```
I AUTHORIZE CLAUDE CODE TO IMPLEMENT - [reason]
```

Without this phrase, Claude Code writes Codex prompts using the 2-section format below.

Even when authorized, Claude Code never commits, pushes, creates branches, or runs `npm run test:ci`.

---

## Standard Phase Cycle

```
QUERY (ChromaDB) â†’ READ (STATE.json + minimal docs) â†’ CONFIRM (user direction)
  â†’ PLAN â†’ CLARIFY â†’ PROMPT (write Codex prompt)
  â†’ BUILD (Codex implements) â†’ TEST (user runs npm run test:ci)
  â†’ ANALYZE (pass/fail) â†’ FIX (if needed)
  â†’ PROMOTE (.\scripts\promote.ps1) â†’ COMMIT (user runs git)
```

---

## Codex Prompt Format (2 Sections)

Every Codex prompt must use this 2-section format:

### Section 1 â€” Plain Text Block (Codex reads and implements)

```
SECTION 1 â€” FOR CODEX

Read first:
- STATE.json
- docs/AI_HANDOFF.md
- docs/CODEX_RULES.md
- [phase log section from docs/PHASE_LOG.md if phase work]
- [2â€“3 source files directly affected]

Current state:
Version: [X.Y.Z-alpha]
Phase: [phase title]
Branch: [branch name]

Implementation requirements:
[Numbered list of exact changes to make]

Safety constraints:
- Do not modify unrelated files
- Do not rename public APIs, tRPC procedures, query keys, or Prisma models
- Do not modify app/generated/prisma
- Do not commit, push, or run npm scripts
- Preserve optimistic update and TanStack Query cache behavior
- Preserve drag-and-drop invariants (local hover, stable drop writes)
- Preserve Supabase user scoping in all procedures

Files to change:
[Explicit list of files to edit]

Documentation to update:
- docs/AI_HANDOFF.md â€” note any changed invariants, data flow, risks, or key files
- docs/FUTURE_PLANS.md â€” mark completed work, add discovered risks or follow-up tasks

After implementing: stop and summarize changes made. Do not run any scripts.
```

### Section 2 â€” PowerShell Block (User runs after Codex finishes)

```powershell
# Run AFTER Codex implementation is complete

# 1. Full CI validation
npm run test:ci

# 2. Phase-specific spot checks
# Select-String -Path "lib/..." -Pattern "..."
# (add targeted grep checks here for the specific invariants this phase touches)
```

---

## Post-Validation Workflow (Claude Code provides, user runs)

After `npm run test:ci` passes, Claude Code provides **all of the following in a single message**:

1. **Validation summary** â€” typecheck/lint/test pass counts, any warnings
2. **Implementation commit block**:
   ```
   git add [specific files â€” never git add -A]
   git commit -m "feat([scope]): [what changed and why]"
   ```
3. **Promote block** (run immediately after implementation commit):
   ```
   .\scripts\promote.ps1
   ```
4. **Stable-promotion commit block** (run immediately after promote.ps1):
   ```
   git add STATE.json docs/VERSIONING.md docs/AI_HANDOFF.md package.json docs/WORKFLOW.md
   git commit -m "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
   ```
5. **Push block** (same message, user decides when to run):
   ```
   git push origin [branch]
   ```

All five are provided together. User runs them in order.

---

## Session Checkpoint (Pausing Mid-Phase)

When a session ends before a phase is complete, Claude Code provides a Codex prompt (plain text, no 2-section format) to write a session log:

**Target file**: `docs/SESSION_LOG/YYYY-MM-DD-session-NN.md`

**Required sections**:
1. **What Was Done** â€” commits made, files changed, tests updated
2. **In Progress** â€” active checkpoint name, branch name, last stable state
3. **Current Version State** â€” from STATE.json (version, state, phase)
4. **Open Decisions** â€” unresolved questions or architectural choices
5. **Known Issues** â€” bugs discovered but not yet fixed
6. **Uncommitted Work** â€” staged or unstaged changes and their purpose
7. **Next Recommended Action** â€” exact next step for the resuming session

---

## Post-Stable Bug Rule

Any bug discovered after a stable release always opens a `Z+1` patch:

1. Never modify a stable release in place
2. The Codex prompt must bump all five versioning locations to `X.Y.(Z+1)-alpha`
3. Follow the standard phase cycle: implement â†’ test â†’ promote â†’ commit

See `docs/VERSIONING.md` for the five versioning locations and the full bump rules.

---

## Versioning Locations (All Five, Every Bump)

1. `STATE.json` â€” `version` + `state` fields
2. `docs/VERSIONING.md` â€” history table + current state row
3. `docs/AI_HANDOFF.md` â€” `<!-- Current Version: X.Y.Z -->` comment at top
4. `package.json` â€” `version` field
5. `docs/WORKFLOW.md` â€” `<!-- Current Version: X.Y.Z -->` comment at top (this file)

`.\scripts\promote.ps1` handles all five automatically.
