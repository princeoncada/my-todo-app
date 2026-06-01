# Codex Rules

Standing ruleset for every Codex implementation session. Read this before writing any code.

---

## Never Do (Absolute)

- Do not commit, push, or create branches
- Do not run `npm run test:ci`, `npm run build`, validation scripts, graph audit commands, git commands, or commit commands
- Do not modify `app/generated/prisma` (generated Prisma output)
- Do not modify lockfiles unless the package manager automatically requires it for an explicitly requested dependency change
- Do not manually update any versioning location (STATE.json, package.json, docs/AI_HANDOFF.md, docs/WORKFLOW.md, docs/VERSIONING.md). Version changes happen only through .\scripts\open-phase.ps1 (alpha) and .\scripts\promote.ps1 (stable).
- Do not update docs/FUTURE_PLANS.md In Progress or Planned sections for versioning purposes; open-phase.ps1 and promote.ps1 handle roadmap state.
- Do not update package versions unless explicitly asked
- Do not rename public APIs, tRPC procedures, query keys, Prisma models, or component contracts unless the task explicitly requires it

---

## Scope Control

- Keep diffs small and focused on the requested task
- Do not touch unrelated files
- Do not broadly refactor while implementing a narrow change
- Do not add features, refactor, or introduce abstractions beyond what the task requires
- If a commit cannot be described with one direct sentence, split it
- Architecture phase branches must avoid large dump commits
- Before scoping any phase that creates scripts or tooling, list scripts/
  to verify no equivalent already exists  -  never duplicate an existing script
- When STATE.json state = "alpha", apply fixes as in-alpha corrections only  - 
  do not re-scope, do not bump versions

---

## Karpathy-Style Engineering Discipline

This discipline improves the existing Tidy workflow. It does not replace the
workflow, validation boundaries, versioning rules, branch process, or scope
control rules.

- Think before coding: state assumptions before modifying code and surface uncertainty early.
- Simplicity first: prefer one proven change over multiple speculative fixes.
- Surgical changes only: every changed line should trace directly to the task.
- Goal-driven execution: define the intended proof before changing files.

---

## Behavior to Preserve

Unless the task specifically changes these areas, never touch:

- Optimistic updates and rollback behavior
- TanStack Query keys and cache shapes
- Dashboard cache projection rules (`lib/dashboard-cache.ts`)
- Drag-and-drop invariants: local-only hover state, stable cache/server writes on committed events only
- View/list/item ordering semantics
- Supabase user scoping and `protectedProcedure` patterns
- Dexie isolation (Phase 1 - 2): no auto-running sync, no dashboard source-of-truth change

---

## Implementation Invariants

- Keep dashboard cache mutations centralized in `lib/dashboard-cache.ts` when behavior crosses components
- Keep drag hover local; do not write cache or server during hover
- Do not send optimistic-only IDs to server reorder endpoints
- Use `protectedProcedure` for all user data
- Validate ownership on the server, even if UI only exposes owned IDs
- Prefer batch server writes for reorder operations
- Keep expensive custom view recompute outside short Prisma transactions unless proven safe
- Use existing patterns before adding abstractions
- Do not ship implementation without matching tests unless the untested behavior is explicitly documented as a gap with a reason

---

## Implementation Workflow

1. Read `STATE.json`  -  current version, active phase, active branch
2. Read `codebase-graph.json` when present to pick the smallest relevant source file set
3. Read `docs/AI_HANDOFF.md`  -  product snapshot, invariants, known risks
4. Use `docs/CONTEXT_INDEX.md` to pick the smallest relevant task-specific read set
5. Identify required test coverage before coding (see Required Tests below)
6. Read 2 - 3 source files directly relevant to the change
7. Make the code change and matching test change in the same branch
8. Identify the validation commands required after implementation and provide them for the user/controller to run
9. Update `docs/AI_HANDOFF.md` if invariants or risks changed; update `docs/FUTURE_PLANS.md` for new gaps

## Debugging Attempt Discipline

Before fixing a failing validation or test issue, Codex must classify the
failure. The classification must be exactly one of:

- Product behavior bug
- Test interaction bug
- Test timing/wait bug
- Seed/data isolation bug
- Assertion bug
- Environment/tooling bug
- Documentation validation contract bug

Before any fix attempt, Codex must provide:

- Failing test/check name
- Exact failing assertion, timeout, validation message, or error
- Expected behavior
- Actual behavior
- Suspected failure class
- Smallest suspected file set
- One diagnostic observation or diagnostic change

Before changing files, Codex must also provide this before-fix attempt block:

    Hypothesis:
    Files to inspect:
    Files allowed to change:
    Expected proof:
    Rollback condition:

Rules:
- Codex must not modify product code and test helpers in the same attempt unless the failure classification proves both are involved.
- Each attempt may change only the files needed to prove or disprove the stated hypothesis.
- If the hypothesis fails, record why, reclassify, and do not stack speculative fixes.
- Do not convert a failing validation/check into broad cleanup. Fix the smallest validation contract or behavior issue first.

Bad example:

    Fix drag/drop test flakiness.

Good example:

    Hypothesis:
    Playwright releases the mouse before DnD Kit registers the target, causing no reorder mutation to fire.

    Files to inspect:
    tests/e2e/drag-drop.spec.ts
    tests/e2e/utils/drag.ts

    Files allowed to change:
    tests/e2e/utils/drag.ts

    Expected proof:
    Targeted drag reorder test reaches the reorder mutation and reload assertion passes.

    Rollback condition:
    If mutation still does not fire, revert the helper change and reclassify as product behavior or test interaction issue.

---

## Graphify / Codebase Graph

- Use `codebase-graph.json` to choose a small relevant direct-read set for implementation tasks.
- Do not use the graph as a replacement for reading actual files before editing.
- If modifying graph scripts or tooling, list `scripts/` first and avoid duplicate scripts.
- Keep protected/generated paths excluded from graph output.
- For Graphify or graph-routing changes, do not claim graph workflow quality
  solely from freshness; use the audit harness to prove required graph nodes and
  routing metadata exist.
- Do not expand startup reads just to prove graph quality.
- Use `codebase-graph.json` to keep direct file reads minimal, but do not broaden
  reads just because the graph exists.
- Do not treat the graph as source of truth; read graph-selected files directly
  before editing.
- Do not run graph audit unless explicitly asked by the user/controller.
- Do not claim token savings were achieved from graph routing alone.
- Say the graph was used for routing only if graph-selected files actually
  guided the direct-read set.

## ChatGPT Architect Evidence Boundary

- Codex prompts written by ChatGPT architect must state whether they were scoped
  from pushed remote state, pasted local evidence, or both.
- For source-heavy prompts, include the Local Evidence Packet in the prompt
  context or require Codex to read local files directly before editing.
- Codex must not assume remote GitHub state includes local working tree changes.
- Codex must not claim ChromaDB or graph query results unless they are provided
  in the prompt or generated locally by Codex within its allowed boundaries.
- If a prompt relies on local evidence, list the evidence under a "LOCAL
  EVIDENCE PROVIDED" section.
- If no local evidence was provided, list "LOCAL EVIDENCE PROVIDED: none,
  scoped from pushed remote state only."
- ChatGPT architect prompts must remain prompt-fence safe and must not nest
  markdown fences inside master prompts.

## Validation Boundary

Validation is user/controller-run, not Codex-run.

- Provide validation commands only; do not execute them.
- Codex must not claim validation passed unless the user provided the output.
- Do not include a "Verified directly" section in Codex output.
- Do not write "validated directly", "tests passed", "audit passed", or similar language unless those results were provided by the user in the same conversation.
- Codex implementation summaries must include `Validation not run by Codex` and `Commands for user/controller to run`.
- Codex may state that validation was not run because Codex is prohibited from running validation.
- Codex must provide graph audit, build, test, and validation commands as user/controller instructions only.

---

## Commit Discipline

Codex does not commit, push, create branches, or run git commands. The
user/controller owns git actions. Codex should propose meaningful commit units
for the user/controller to run through `.\scripts\commit.ps1`.

Default pattern:
1. Commit the new or updated doc first
2. Commit entrypoint/backlog references separately
3. Commit source changes by feature area
4. Commit validation/test updates separately

One commit should represent one reviewable engineering unit. Do not batch
unrelated changes.

Meaningful failed validation states may be committed on phase branches when
they document a real debugging checkpoint. Fake activity commits are forbidden.
Do not hide meaningful failed attempts by silently rewriting history during
alpha.

Commit message format:
```
type(scope): short imperative summary
```

Examples:
```
docs(ai): add local-first roadmap
feat(sync): add outbox operation model
fix(dnd): validate target list ownership
test(cache): cover dashboard projection helpers
refactor(cache): centralize dashboard query keys
chore(release): promote 1.0.0-alpha to 1.0.0-stable
```

Usage example:
```
.\scripts\commit.ps1 -Files "path/to/file" -Message "type(scope): message"
```

Avoid: `update stuff`, `local-first work`, `big sync changes`, `wip`

Never do:
- Use raw git add + git commit  -  always use .\scripts\commit.ps1
- Batch multiple files into one commit
- Batch unrelated changes into one commit
- Add Co-Authored-By or any AI co-author trailer to commit messages

When updating workflow docs involving assistant output, preserve copy-paste safety:
- Code blocks must contain only content intended for the named target tool.
- Do not place explanatory markdown inside runnable PowerShell command blocks.
- Do not combine Codex prompt content and PowerShell commands in the same code block.
- Master prompts must not contain nested markdown fences.
- If ChatGPT or Claude provides a fenced master prompt for Codex, commands inside that prompt must be plain text or indented lines.
- Validation commands should be placed in a separate top-level Section 2 code block outside the master prompt.
- Never put a powershell, bash, json, or any other fenced block inside the master prompt block.
- This applies to generated prompts, handoff prompts, and validation sections intended for copy/paste.

---

## Required Tests

Every implementation PR must:
- Update or add tests in the same branch
- New product phases must update tests in the same phase unless the phase is explicitly test-only or docs-only.
- Before coding: identify happy path, common cases, edge cases, unit coverage, and E2E coverage
- After coding: identify the required validation commands and provide them for the user/controller to run
- Not claim validation, test, build, or audit commands passed unless the user/controller provided the output in the same conversation
- Not mark complete if tests were not added or updated unless clearly justified with a documented reason

Test commands:
- `npm run test`  -  Vitest unit tests
- `npm run test:e2e`  -  non-authenticated Playwright E2E
- `npm run test:e2e:auth:setup`  -  write auth storage state to `tests/.auth/user.json`
- `npm run test:e2e:auth`  -  authenticated dashboard Playwright E2E (requires `tests/.auth/user.json` + Supabase env vars)
- `npm run test:ci`  -  typecheck + lint + unit + default E2E
- `npm run typecheck`  -  TypeScript only
- `npm run lint`  -  ESLint only

Manual dashboard regression checklist (run after any cache/optimistic/DnD change):
- Login, logout  -  confirm cache clears after logout
- Create list in All Lists; create list inside a custom view (verify required tags are inherited)
- Add item immediately after creating a list before server response settles
- Rename list and item, then refresh
- Complete/uncomplete item, then refresh
- Delete list and item, including rollback if API fails
- Drag lists in All Lists and in a custom view
- Drag item within a list and across lists
- Create, rename, update filter, delete, select, and reorder custom views
- Create tag, attach/detach tags quickly, delete tag  -  verify affected custom views update
- Fast-switch views  -  verify stale fetches do not repaint the dashboard

---

## Documentation Update Requirements

After every implementation:
- Update `docs/AI_HANDOFF.md` if invariants, risks, data flow, key files, active branch, or next recommended action changed.
- If a decision changes, update `docs/DECISIONS.md`
- Update `docs/FUTURE_PLANS.md` only when the prompt explicitly scopes roadmap maintenance, when adding discovered follow-up tasks/risks, or when recording a user-approved phase sequence.
- Product audit findings should be captured as tests, `docs/FUTURE_PLANS.md` updates, `docs/AI_HANDOFF.md` known risks, or `docs/DECISIONS.md` architecture records, not new standalone audit docs by default.
- Do not manually move items between Planned, In Progress, and Completed for versioning purposes unless the prompt explicitly scopes that roadmap maintenance.
- Version open/close movement remains owned by `open-phase.ps1` and `promote.ps1`.
- `docs/FUTURE_PLANS.md` remains roadmap state, not a sixth versioning location.

When a user-approved phase sequence exists before implementation, the scoped phase may update `docs/FUTURE_PLANS.md` to reflect that sequence before product work continues. Preserve monotonic version order and do not silently move roadmap items between Planned, In Progress, and Completed unless explicitly scoped.

Codex must not set or preserve a `STATE.json.nextPhase` that is absent from `docs/FUTURE_PLANS.md` unless the prompt explicitly scopes adding or renumbering that roadmap entry in the same phase. If a prompt changes `nextPhase`, the prompt must also update `docs/FUTURE_PLANS.md` or explicitly instruct `open-phase.ps1` to use `-AllowMissingNextPhase` and then fix `docs/FUTURE_PLANS.md` during the phase.

Preserve the invariant: stable STATE.json.nextPhase == first FUTURE_PLANS Planned heading.

FUTURE_PLANS remains roadmap state, not a sixth versioning location.

---

## What to Read For Specific Tasks

Use `docs/CONTEXT_INDEX.md` for task-based route selection. This file remains
the source of truth for implementation rules, validation boundaries, testing
rules, scope control, and commit discipline.

---

## Next.js Version Warning

This project uses **Next.js 16**  -  not a version you can assume from training data. If changing Next.js app APIs and `node_modules/next/dist/docs/` exists, read the relevant local Next guide before writing code. Heed deprecation notices.
