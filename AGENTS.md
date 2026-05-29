# AI Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This project uses newer framework versions with breaking changes  -  APIs, conventions, and file structure may differ from older assumptions. Follow existing repo patterns first. If you are changing Next.js app APIs and `node_modules/next/dist/docs/` exists, read the relevant local Next guide before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Session Start Protocol

At the start of every session, before reading other docs or writing code:

1. Read `STATE.json` and `docs/FUTURE_PLANS.md`  -  together these give version, active phase, next phase, and the full work backlog.
2. Query ChromaDB if available on `localhost:8000`:
        python scripts/query_docs.py "<question about current task>"
   One query per topic. Trust the first result. Fall back to direct file read only if query returns zero results  -  state why when falling back.
3. Output the startup report (see Startup Report Format below).
4. If the user provided scope in their opening message: proceed directly to writing Codex prompts. Do not ask for confirmation.
   If no scope was provided: wait for the user's go-ahead.

Repo docs are the only source of truth. Never answer state queries,
version questions, or "what's next" from session memory of docs.
Always read STATE.json and docs/FUTURE_PLANS.md fresh.

## Drift Guardrails

These rules exist so lower-capability models cannot silently drift:

- STATE.json is the single source of truth for version and state. If any
  other doc disagrees with STATE.json, STOP and flag the conflict - never
  guess which is correct and never reconcile silently.
- "Next phase" (roadmap, from STATE.json nextPhase) and "Next backlog item"
  (docs/FUTURE_PLANS.md first Open item) are different questions with
  different answers. Report both, labeled distinctly. Never conflate them.
- If ChromaDB is offline, say so explicitly and read files directly. Never
  fabricate or paraphrase query results that were not actually returned.
- Never state version, phase, or "what's next" from memory. Read the files
  fresh every session.
- scripts/validate.ps1 enforces version consistency across all five
  versioning locations. A failing consistency gate blocks promotion.

## Startup Report Format

Always output this exact structure at session start:

    Version: X.Y.Z-[state]
    Phase: [phaseTitle]
    Next phase (roadmap): [nextPhase from STATE.json]
    Next backlog item: [title of first Open item in docs/FUTURE_PLANS.md]
    ChromaDB: [online | offline]
    [one of:]
    Proceeding to Codex prompts for [scope].
    Waiting for your go-ahead.

## File Read Priority

| Task type | Read these |
|-----------|-----------|
| Startup | `STATE.json` + `docs/FUTURE_PLANS.md` |
| Implementation | `docs/AI_HANDOFF.md` + `docs/CODEX_RULES.md` + 2 - 3 source files |
| Patch / docs work | `docs/CODEX_RULES.md` + affected files only |
| Session close | Write `SESSION_LOG` -> update `STATE.json` |

Do not read `docs/WORKFLOW.md` at startup. Read it only when writing or reviewing a Codex prompt format or the post-validation workflow.

## Claude Code Command Vocabulary

| Phrase | What Claude Code does |
|--------|----------------------|
| "scope it out" | Write the full Codex prompt + Section 2 validation block |
| "what's next" | Read docs/FUTURE_PLANS.md fresh, report the next Open backlog item and summarize it. This is the backlog item, not the roadmap "Next phase" (which comes from STATE.json nextPhase) - distinguish them if both are relevant |
| "session start" / "continue" | Run Session Start Protocol and output Startup Report |
| "session checkpoint" / "handoff" | Write SESSION_LOG entry, then update docs/NEW_CHATHEAD_OPENER.md with current stable version and next phase |
| "I AUTHORIZE CLAUDE CODE TO IMPLEMENT - [reason]" | Fallback only  -  use when Codex hits its token limit mid-implementation. Claude Code never suggests this phrase; the user initiates it. |

When validation checks fail after a Codex implementation, Claude Code must provide a fix master prompt immediately. Never ask the user to authorize direct implementation.

## Implementation Gate

Claude Code may implement directly **only** when the user provides this exact phrase:

    I AUTHORIZE CLAUDE CODE TO IMPLEMENT - [reason]

Without this phrase, Claude Code writes Codex prompts using the 2-section format in `docs/WORKFLOW.md`. Claude Code never commits, pushes, creates branches, or runs `npm run test:ci` regardless of authorization.

Exception  -  in-alpha fixes: when STATE.json state = "alpha", fixes and
corrections extend the current phase directly. Do not write a new full
Codex prompt and do not bump versions. Only open a new phase when the
current version is stable.

The authorization phrase exists only as a fallback when Codex hits its
token limit mid-implementation and cannot continue. Claude Code must
never suggest it as an alternative to writing a Codex prompt.

## Required Reading Path

Before editing any file, route yourself through the repo-specific AI docs instead of scanning the whole repository:

0. Read `STATE.json` first  -  compact project oracle (version, active phase, notes).
1. Read `docs/AI_HANDOFF.md`  -  current product snapshot, invariants, data flow, known risks, and next action.
2. Read `docs/CODEX_RULES.md` before implementation  -  scope control, invariants, commit discipline, required tests, task routing table.

See `docs/PHASE_LOG.md` for active phase checkpoint context. See `docs/FUTURE_PLANS.md` for the prioritized work backlog.

Do not broadly inspect the repo unless the task cannot be understood from the AI docs plus the smallest relevant source files.

## Required Test Workflow

Every Codex implementation must update or add tests in the same branch. Before coding, identify the happy path, common cases, edge cases, unit coverage, and E2E coverage. After coding, run `npm run test:ci` and report exact results. Do not mark complete if tests were not added or updated unless clearly justified.

Use `docs/CODEX_RULES.md` (Required Tests section) as the source of truth for test commands, the manual regression checklist, and definition of done.

## Scope Control

- Keep diffs small and focused on the requested task.
- Do not touch unrelated files.
- Do not broadly refactor while implementing a narrow change.
- Do not rename public APIs, routes, models, query keys, or component contracts unless the task explicitly requires it.
- Do not modify generated Prisma output under `app/generated/prisma`.
- Do not modify lockfiles unless the package manager automatically requires it for an explicitly requested dependency change.
- Do not update package versions unless explicitly asked.
- Before scoping any phase that involves scripts or tooling, read the
  scripts/ directory to check for existing implementations.

## Commit Discipline

- Claude Code writes commit.ps1 call sequences; the user runs each call.
- Do not batch multiple files into one commit.
- Do not add Co-Authored-By or any AI co-author trailer to commit messages.

## Behavior to Preserve

Unless the task specifically changes these areas, preserve:

- Optimistic updates and rollback behavior.
- TanStack Query keys and cache shapes.
- Dashboard cache projection rules.
- Drag-and-drop invariants, including local-only hover state and stable cache/server writes on committed actions.
- View/list/item ordering semantics.
- Supabase user scoping and protected tRPC procedure patterns.

## Documentation Expectations

- Update `docs/AI_HANDOFF.md` when behavior, data flow, invariants, or risks change.
- Update `docs/FUTURE_PLANS.md` when completing documented work or discovering follow-up risks.
- Prefer concise docs updates that help future agents avoid extra repo scanning.
