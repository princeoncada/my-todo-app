# Agent Workflow

<!-- Current Version: 1.0.7-alpha -->

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

1. `git pull origin master` - sync latest
2. **Read `STATE.json`** - report: version, state, phase, phaseTitle, nextPhase, any in-progress branch, pre-versioning notes
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
QUERY (ChromaDB) -> READ (STATE.json + minimal docs) -> CONFIRM (user direction)
  -> PLAN -> CLARIFY -> PROMPT (write Codex prompt)
  -> BUILD (Codex implements) -> TEST (user runs npm run test:ci)
  -> ANALYZE (pass/fail) -> FIX (if needed)
  -> PROMOTE (.\scripts\promote.ps1) -> COMMIT (user runs git)
```

### Alpha vs. Stable Scope Rule

Check STATE.json before deciding how to respond to a fix or change request:

- state = "alpha" - apply the fix directly as an in-alpha correction.
  No new Codex prompt, no version bump, no re-scope. Extend the current
  phase prompt with the additional changes only.
- state = "stable" - open a new phase. Write a full Codex prompt with
  version bump, READ THESE FILES FIRST, IMPLEMENTATION REQUIREMENTS,
  SAFETY CONSTRAINTS, and STOP AND SUMMARIZE.

Never re-scope a full phase for a fix when the current version is already alpha.

---

## Codex Prompt Format

Every Codex prompt uses a two-section format. Section headings are markdown
headers sitting above their code block - not inside it.

### Section 1 - Master Prompt

A plain text code block containing all of the following blocks in this exact order:

    You are implementing Phase X.Y.Z - [Name] for Tidy.
    Current stable version: X.Y.Z-stable.
    This implementation opens X.Y.Z-alpha.

    ---

    READ THESE FILES FIRST before writing any code:

    - STATE.json
    - docs/AI_HANDOFF.md
    - docs/CODEX_RULES.md
    - [2-3 source files directly relevant to this change]
    - [if the phase creates or modifies scripts: list scripts/ to check for
      existing implementations before scoping anything new]

    ---

    CURRENT PROJECT STATE:

    Version: X.Y.Z-alpha
    Series: [series label]
    Last phase: [title] ([one-line result])
    Next phase: [this prompt title]

    ---

    IMPLEMENTATION REQUIREMENTS:

    Every requirement is mandatory. Do not skip, defer, or partially implement.

    [Numbered items. Label each CREATE or MODIFY.
     MODIFY items include exact OLD TEXT and NEW TEXT pairs.
     Do not alter any text outside the specified pairs.]

    ---

    SAFETY CONSTRAINTS:

    - Do not commit, push, or create branches
    - Do not run npm scripts, git commands, or validation scripts
    - Do not modify app/generated/prisma
    - Do not touch unrelated files
    - [phase-specific constraints]

    ---

    STOP AND SUMMARIZE:

    After completing all changes, stop and provide:
    1. Files created (path + one-sentence purpose)
    2. Files modified (path + what changed)
    3. Any assumptions made during implementation

### Section 2 - Validation

A PowerShell code block. Structure:

    # Baseline
    .\scripts\validate.ps1

    # Phase-specific spot checks
    [Select-String and Test-Path checks for this phase's invariants]
---

## Post-Validation Workflow

After npm run test:ci passes, Claude Code provides all of the following
in a single message:

1. Validation summary - pass counts, any warnings
2. commit.ps1 call sequence - one call per changed file, in commit order:

    .\scripts\commit.ps1 -Files "path/to/file" -Message "type(scope): message"

3. Promote block (run immediately after all commits complete):

    .\scripts\promote.ps1

4. Stable-promotion commit sequence - one call per versioning file:

    .\scripts\commit.ps1 -Files "STATE.json" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
    .\scripts\commit.ps1 -Files "docs/VERSIONING.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
    .\scripts\commit.ps1 -Files "docs/AI_HANDOFF.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
    .\scripts\commit.ps1 -Files "package.json" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
    .\scripts\commit.ps1 -Files "docs/WORKFLOW.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"

5. Push block (user decides when to run):

    git push origin master
---

## Session Checkpoint (Pausing Mid-Phase)

When a session ends before a phase is complete, Claude Code provides a Codex prompt (plain text, no 2-section format) to write a session log:

**Target file**: `docs/SESSION_LOG/YYYY-MM-DD-session-NN.md`

**Required sections**:
1. **What Was Done** - commits made, files changed, tests updated
2. **In Progress** - active checkpoint name, branch name, last stable state
3. **Current Version State** - from STATE.json (version, state, phase)
4. **Open Decisions** - unresolved questions or architectural choices
5. **Known Issues** - bugs discovered but not yet fixed
6. **Uncommitted Work** - staged or unstaged changes and their purpose
7. **Next Recommended Action** - exact next step for the resuming session

After writing the session log, update docs/NEW_CHATHEAD_OPENER.md:
- Set "Current expected state" to the just-promoted stable version
- Set "Next planned work" to the next phase from STATE.json nextPhase

---

## Post-Stable Bug Rule

Any bug discovered after a stable release always opens a `Z+1` patch:

1. Never modify a stable release in place
2. The Codex prompt must bump all five versioning locations to `X.Y.(Z+1)-alpha`
3. Follow the standard phase cycle: implement -> test -> promote -> commit

See `docs/VERSIONING.md` for the five versioning locations and the full bump rules.

---

## Versioning Locations (All Five, Every Bump)

1. `STATE.json` - `version` + `state` fields
2. `docs/VERSIONING.md` - history table + current state row
3. `docs/AI_HANDOFF.md` - `<!-- Current Version: X.Y.Z -->` comment at top
4. `package.json` - `version` field
5. `docs/WORKFLOW.md` - `<!-- Current Version: X.Y.Z -->` comment at top (this file)

`.\scripts\promote.ps1` handles all five automatically.
