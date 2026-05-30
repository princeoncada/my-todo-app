# Codex Rules

Standing ruleset for every Codex implementation session. Read this before writing any code.

---

## Never Do (Absolute)

- Do not commit, push, or create branches
- Do not run `npm run test:ci`, `npm run build`, validation scripts, graph audit commands, git commands, or commit commands
- Do not modify `app/generated/prisma` (generated Prisma output)
- Do not modify lockfiles unless the package manager automatically requires it for an explicitly requested dependency change
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
4. Use the task routing table below to pick the smallest relevant source file set
5. Identify required test coverage before coding (see Required Tests below)
6. Read the active phase log from `docs/PHASE_LOG.md` (if implementing phase work)
7. Read 2 - 3 source files directly relevant to the change
8. Make the code change and matching test change in the same branch
9. Identify the validation commands required after implementation and provide them for the user/controller to run
10. Update `docs/AI_HANDOFF.md` if invariants or risks changed; update `docs/FUTURE_PLANS.md` for new gaps

## Graphify / Codebase Graph

- Use `codebase-graph.json` to choose a small relevant direct-read set for implementation tasks.
- Do not use the graph as a replacement for reading actual files before editing.
- If modifying graph scripts or tooling, list `scripts/` first and avoid duplicate scripts.
- Keep protected/generated paths excluded from graph output.
- For Graphify or graph-routing changes, do not claim graph workflow quality
  solely from freshness; use the audit harness to prove required graph nodes and
  routing metadata exist.
- Do not expand startup reads just to prove graph quality.

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

Default pattern:
1. Commit the new or updated doc first
2. Commit entrypoint/backlog references separately
3. Commit source changes by feature area
4. Commit validation/test updates separately

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
- Add Co-Authored-By or any AI co-author trailer to commit messages

When updating workflow docs involving assistant output, preserve copy-paste safety:
- Code blocks must contain only content intended for the named target tool.
- Do not place explanatory markdown inside runnable PowerShell command blocks.
- Do not combine Codex prompt content and PowerShell commands in the same code block.

---

## Required Tests

Every implementation PR must:
- Update or add tests in the same branch
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
- Update `docs/AI_HANDOFF.md` if invariants, risks, data flow, or key files changed
- Update `docs/FUTURE_PLANS.md`: mark completed items `Done`, add discovered bugs/risks, add follow-up tasks
- Update `docs/PHASE_LOG.md` when a phase checkpoint completes
- Update `docs/AI_HANDOFF.md` when the active branch or next recommended action changes
- If a decision changes, update `docs/DECISIONS.md`

---

## What to Read For Specific Tasks

| Task type | Read these source files |
|---|---|
| Any task | `STATE.json`, `docs/AI_HANDOFF.md`, this file |
| Dashboard cache / optimistic mutation | `lib/dashboard-cache.ts`, `hooks/useOptimisticSync.ts`, target component |
| Drag and drop | `components/list/ListsContainer.tsx`, `ListComponent.tsx`, `ListItemComponent.tsx` |
| Tags / custom views | `trpc/routers/tagRouter.ts`, `viewHelpers.ts`, `ListTagPicker.tsx`, `ViewsSidebarPreview.tsx`, `lib/dashboard-cache.ts` |
| Auth / tRPC / API procedures | `trpc/init.ts`, `trpc/routers/_app.ts`, target router file |
| Prisma schema / data model | `prisma/schema.prisma`, `lib/db.ts` |
| Phase work | `docs/PHASE_LOG.md` (active phase section) |
| Security fix | target router file + `trpc/init.ts` |
| Mobile / PWA / metadata | `app/layout.tsx`, `next.config.ts`, `public/` |

---

## Next.js Version Warning

This project uses **Next.js 16**  -  not a version you can assume from training data. If changing Next.js app APIs and `node_modules/next/dist/docs/` exists, read the relevant local Next guide before writing code. Heed deprecation notices.
