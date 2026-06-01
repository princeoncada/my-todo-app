# Agent Workflow

<!-- Current Version: 1.4.10-alpha -->

This file governs how Claude Code and Codex operate together in Tidy. Read it at session start after `STATE.json` and `codebase-graph.json` orientation. It is the authoritative protocol for all implementation phases.

---

## Roles

### Claude Code (Planning, Validation, Commit Blocks)

Claude Code is the **planning and validation layer**. It reads project state, scopes work, writes Codex prompts, validates output, and provides commit blocks for the user to run.

Claude Code does **not**: implement code, commit, push, run `npm run test:ci`, create branches, or run validation scripts.

**Exception**: Claude Code may implement directly only when explicitly unlocked with the [Implementation Gate](#implementation-gate) phrase.

### Codex (Implementation)

Codex is the **implementation layer**. It reads docs, edits source files, and summarizes what changed.

Codex does **not**: commit, push, run `npm run test:ci`, create branches, run validation scripts, run npm scripts, run graph audit commands, or claim validation results unless the user/controller provided the output.

---

## Session Start Protocol (Every Session)

Run these steps at the start of every Claude Code session before asking for direction:

1. If operating in a local repo, run `git pull origin master` - sync latest. If local git is unavailable, report why and continue with remote/direct reads only.
2. **Read `STATE.json`** - report: version, state, phase, phaseTitle, nextPhase, and any in-progress branch when present
3. **Read `codebase-graph.json` if present** - use it only as an orientation map to choose the smallest direct-read source/doc set. If it is missing, stale, or invalid, state that and fall back to direct file reads.
4. **Read `docs/FUTURE_PLANS.md` fresh** - report the first Planned backlog item separately from STATE.json `nextPhase`.
5. **Query ChromaDB** (when running on `localhost:8000`):
   ```bash
   python scripts/query_docs.py "<your question about the current task>"
   ```
   One query per topic. Trust the first result. Only open the full doc file if the query returns zero relevant content. State why if falling back: "Query returned zero results for X, falling back because..."
6. **Report findings**. Wait for explicit user direction before scoping or implementing.

See `docs/COMPACT_STRATEGY.md` for token budget targets and the full context-minimization protocol.

---

### ChatGPT Architect Mode

ChatGPT architect works from remote GitHub state plus pasted local evidence.
Remote master is authoritative only after push. The local working tree is
authoritative for uncommitted work, active branch edits, local ChromaDB output,
local validation output, and regenerated graph output.

Before source-heavy scoping, the user/controller must paste a Local Evidence
Packet into ChatGPT chat. For docs-only roadmap/workflow phases, remote GitHub
reads plus pasted validation output are usually sufficient. For product/source
phases, ChatGPT must not scope from stale remote-only context when local changes
matter. If the Local Evidence Packet is absent, ChatGPT must state whether the
scope is remote-only.

LOCAL EVIDENCE PACKET TEMPLATE:

    git status --short
    git log --oneline -5
    Get-Content STATE.json
    python scripts/query_docs.py "<question about the current task>"
    npm run graph:codebase
    git diff --stat

OPTIONAL LOCAL EVIDENCE:

    git diff -- <path>
    Select-String -Path "docs\FUTURE_PLANS.md" -Pattern "<phase>"
    Select-String -Path "docs\AI_HANDOFF.md" -Pattern "<topic>"

Paste the packet into ChatGPT chat before scoping whenever local state can
change the architecture decision or implementation prompt.

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
QUERY (ChromaDB) -> READ (STATE.json + codebase graph + minimal docs) -> CONFIRM (user direction)
  -> PLAN -> CLARIFY -> PROMPT (write Codex prompt)
  -> OPEN (.\scripts\open-phase.ps1) -> BUILD (Codex implements) -> TEST (user runs npm run test:ci)
  -> ANALYZE (pass/fail) -> FIX (if needed)
  -> PROMOTE (.\scripts\promote.ps1) -> COMMIT (user runs git)
```

### Planned Phase Capture

When the user and AI architect agree on a patch or phase sequence before implementation, the next scoped implementation phase must record that agreed sequence in `docs/FUTURE_PLANS.md`.

Rules:
- Insert newly agreed patch phases before the next minor/major phase when they must happen first.
- Preserve monotonic version order.
- Patches under the current minor may be inserted before the next minor without renumbering the next minor.
- New minor or major insertions must push later Planned versions back according to the Planned Renumber Rule in `docs/VERSIONING.md`.
- Do not leave the roadmap implying the next implementation is a later phase when cleanup patches have been agreed first.
- This does not make `docs/FUTURE_PLANS.md` a versioning location. It remains the roadmap owner only.

### Product Phase Planning

Product implementation phases should be small and test-backed. Every product implementation phase must add or update useful tests unless explicitly scoped as docs-only/test-only with a reason.

Product behavior audits should become reproduction tests or roadmap acceptance criteria, not new standalone docs by default. UI/UX polish should stay late unless it blocks correctness or usability.

### Roadmap Next-Phase Gate

When `STATE.json` is stable, `STATE.json.nextPhase` must equal the first Planned heading in `docs/FUTURE_PLANS.md`.
Plain assertion: STATE.json.nextPhase must equal the first Planned heading.

When opening an alpha phase, `STATE.json.nextPhase` must exist as a Planned heading unless the phase is explicitly scoped to add or renumber `docs/FUTURE_PLANS.md` in the same patch.

Use `open-phase.ps1 -AllowMissingNextPhase` only for explicitly scoped roadmap rewrite patches. No phase may be promoted stable while `STATE.json.nextPhase` and the first Planned roadmap item disagree. `docs/FUTURE_PLANS.md` remains roadmap state, not a sixth versioning location.

### Prompt Fence Safety

When an implementation prompt is delivered inside a fenced code block, do not place additional triple-backtick fenced blocks inside it. Nested fences can prematurely terminate the outer prompt and make copy-paste instructions unsafe.

Inside a fenced master prompt, represent commands/templates using plain text labels or indented lines, not nested fences. Keep Section 1 master prompts and Section 2 validation commands as separate top-level code blocks in the assistant response.

If the master prompt needs to include command examples, use labels like POWERSHELL COMMANDS, VALIDATION COMMANDS, or LOCAL EVIDENCE PACKET, followed by indented command lines. Do not use markdown triple-backtick fences inside a fenced master prompt.

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

### Assistant Output Formatting Contract

- Keep markdown section headings outside code blocks.
- Section 1 - Master Prompt heading must stay outside the code block.
- Section 2 - Validation heading must stay outside the code block.
- The Codex prompt must be one text code block containing only the prompt intended for Codex.
- The validation block must be one PowerShell code block containing only validation commands.
- The alpha commit sequence must be one PowerShell code block containing all alpha commit commands, one command per line.
- The stable promotion commit sequence must be one separate PowerShell code block containing all stable promotion commit commands, one command per line.
- Never place `Section 1 - Master Prompt` or `Section 2 - Validation` inside
  copyable code blocks.
- Do not wrap both sections in one code block.
- Do not combine Codex prompt text and PowerShell commands in the same code block.
- The push command must be separate from commit command blocks.
- Code blocks must be copy-paste runnable for their target tool.
- Do not place explanatory prose, bullets, markdown headings, wrappers, or
  comments inside copyable command blocks unless they are commands the user
  should actually run.
- Use `text` for Codex prompt blocks.
- Use `powershell` for validation and command blocks.
- Codex implementation summaries must not include "Verified directly" or equivalent self-validation sections.
- Validation sections in Codex output must only contain commands for the user/controller to run.
- If Codex did not run validation, it must say "Validation not run by Codex."
- Codex must not claim validation/test/audit results unless the user provided them.

When scoping implementation prompts, include `codebase-graph.json` as an early
read after `STATE.json` when it exists. The graph narrows file selection; it
does not replace `docs/AI_HANDOFF.md`, `docs/CODEX_RULES.md`, or direct reads of
affected source files.

Use `docs/CONTEXT_INDEX.md` as the routing-only scoping map for choosing the
smallest correct document/source read set. It does not define process rules,
phase workflow, prompt format, or validation boundaries.

### Graph Routing Usage Contract

When scoping implementation prompts, include a short Graph Routing Summary
before Section 1 - Master Prompt. The Graph Routing Summary must stay outside code blocks and must not be included inside the Codex prompt block.

The summary must explain how `codebase-graph.json` narrowed file selection, list
selected files and why, list intentionally skipped broad docs/files, and state
whether source files still need direct reads before editing. It must not require
running graph audit during startup, must not require token benchmarking, and
must not add graph drills to every loop.

Graph Routing Summary:
- Task category: workflow/docs patch
- Graph-selected files: AGENTS.md, docs/WORKFLOW.md, docs/CODEX_RULES.md
- Intentionally skipped: app source, tRPC routers, Prisma output
- Direct reads still required: yes, read selected docs before editing

Refresh the graph after graphable source, docs, or script changes:

```powershell
npm run graph:codebase
```

`scripts/validate.ps1` checks that the committed graph is present, versioned to
`STATE.json`, excludes protected paths, and is fresh against fallback generator
output.

`npm run graph:audit` proves graph quality by checking required nodes,
classifications, protected-path exclusions, and routing metadata. It runs
through validation, not every startup. Do not add graph drill or audit docs to
the normal read loop.

### Section 1 - Master Prompt

A single `text` code block containing only the prompt intended for Codex. It
contains all of the following blocks in this exact order:

```text
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
3. Whether app behavior changed
4. Validation not run by Codex
5. Commands for the user/controller to run next
```

### Section 2 - Validation

A single `powershell` code block containing only PowerShell validation commands:

```powershell
.\scripts\validate.ps1
Select-String -Path "docs\WORKFLOW.md" -Pattern "Section 1 - Master Prompt"
Test-Path "STATE.json"
```

---

## Post-Validation Workflow

After npm run test:ci passes, Claude Code provides all of the following
in a single message:

1. Validation summary - pass counts, any warnings
2. Alpha commit sequence - The alpha commit sequence must be one PowerShell code block containing all alpha commit commands, one command per line.

```powershell
.\scripts\commit.ps1 -Files "path/to/file" -Message "type(scope): message"
```

3. Promote block - the promote command may be its own `powershell` code block
   run immediately after all alpha commits complete:

```powershell
.\scripts\promote.ps1
```

   promote.ps1 promotes the five versioning locations, closes the promoted
   phase in `docs/FUTURE_PLANS.md` as roadmap state, and refreshes
   `codebase-graph.json` when graph tooling exists. FUTURE_PLANS is not a
   sixth versioning location, and `codebase-graph.json` is a generated graph
   artifact, not a sixth versioning location. The script self-verifies that all
   five versioning locations carry the new stable version, roadmap closeout
   succeeded, and the graph artifact matches the stable version/schema. If
   promote.ps1 reports roadmap closeout or graph refresh failure, stop and do
   not commit the promotion. Do NOT re-run the full validation suite after
   promote unless the user chooses to - app code did not change, only version
   strings, roadmap state, and generated graph metadata. If promote reports
   success, proceed directly to the promotion commits.

4. Stable-promotion commit sequence - The stable promotion commit sequence must be one separate PowerShell code block containing all stable promotion commit commands, one command per line.

```powershell
.\scripts\commit.ps1 -Files "STATE.json" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
.\scripts\commit.ps1 -Files "docs/VERSIONING.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
.\scripts\commit.ps1 -Files "docs/AI_HANDOFF.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
.\scripts\commit.ps1 -Files "package.json" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
.\scripts\commit.ps1 -Files "docs/WORKFLOW.md" -Message "chore(release): promote X.Y.Z-alpha to X.Y.Z-stable"
.\scripts\commit.ps1 -Files "docs/FUTURE_PLANS.md" -Message "chore(release): close X.Y.Z roadmap item"
.\scripts\commit.ps1 -Files "codebase-graph.json" -Message "chore(graph): refresh graph for X.Y.Z-stable"
```

Include the `codebase-graph.json` commit only when `promote.ps1` changes it.

5. Push block - separate from commit command blocks; user decides when to run:

```powershell
git push origin master
```

Do not emit each commit command as its own separate code block. Use one-by-one
blocks only when the user explicitly asks for them. Do not combine alpha commits
and stable promotion commits in the same code block. Commit command blocks must
be copy-paste runnable as-is in PowerShell.

---

## Session Checkpoint (Pausing Mid-Phase)

Checkpoint proactively (see Session Continuity in AGENTS.md): Claude Code offers a
session log - without being asked - when context may compact, after a promotion,
before a large or risky operation, or when the user signals stopping. The user
decides whether to write it.

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

After writing the session log, do NOT embed state into docs/NEW_CHATHEAD_OPENER.md.
The opener intentionally points to STATE.json + docs/FUTURE_PLANS.md (see the Doc
Continuity Model in docs/VERSIONING.md). Only edit the opener if its instructions
change - never to update a version/phase snapshot.

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

`.\scripts\open-phase.ps1` opens a new alpha phase across all five versioning locations automatically.
`.\scripts\promote.ps1` handles all five versioning locations automatically and
also closes the promoted roadmap item in `docs/FUTURE_PLANS.md` when present.
It refreshes `codebase-graph.json` when graph tooling exists; the graph is a
generated artifact, not a sixth versioning location.
