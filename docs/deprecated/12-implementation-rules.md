> **DEPRECATED**: Content migrated to `docs/CODEX_RULES.md` (standing Codex ruleset, commit discipline, invariants, implementation workflow). This file is retained for reference.

# Implementation Rules

## Purpose
Define repo-specific rules every future implementation must follow.

## Current Implementation
This is a docs-only rules file. It reflects the current architecture and the user's explicit requirement:

Every future implementation must update the relevant docs and backlog in the same PR.

Every future implementation must update or add tests in the same branch. Before coding, identify the happy path, common cases, edge cases, unit coverage, and E2E coverage. After coding, run `npm run test:ci` and report exact results. Do not mark complete if tests were not added or updated unless clearly justified.

## Commit Discipline

Default rules:

- Prefer one commit per file for documentation and small focused changes.
- For code changes, prefer one commit per logical unit when a single file is not enough.
- Do not mix unrelated files in the same commit.
- Do not combine unrelated docs updates, feature implementation, refactors, dependency changes, and formatting cleanup in one commit.
- Keep commits small, scoped, understandable, and revertable.
- Architecture phase branches must avoid large dump commits.
- Do not use one broad commit for a whole local-first phase, sync rewrite, query split, or rollback rewrite.
- If a commit cannot be described with one direct sentence, split it.

Default commit pattern:

1. Commit the new or updated roadmap/doc file.
2. Commit entrypoint/backlog references separately.
3. Commit source changes by feature area.
4. Commit validation/test updates separately.

Commit message format:

```text
type(scope): short imperative summary
```

Examples:

```text
docs(ai): add local-first roadmap
docs(ai): add phase branch rules
docs(ai): document commit discipline
feat(sync): add outbox operation model
fix(dnd): validate target list ownership
test(cache): cover dashboard projection helpers
refactor(cache): centralize dashboard query keys
```

Avoid vague dump commit messages:

```text
update stuff
local-first work
big sync changes
wip
```

## Important Files

- `AGENTS.md`: local instruction about Next.js docs.
- `docs/ai/00-ai-entrypoint.md`: reading path.
- `docs/ai/backlog.md`: living backlog.
- `docs/ai/15-decision-log.md`: decision history.
- Feature docs in this folder.

## Data Flow
Implementation workflow:

1. Read `00-ai-entrypoint.md`.
2. Read `docs/testing-validation.md`.
3. Read the feature-specific docs.
4. Identify required unit and E2E coverage before coding.
5. Read the smallest set of source files needed.
6. Make the code change and matching test change.
7. Validate with `npm run test:ci` plus any targeted/auth checks appropriate to risk.
8. Update docs and backlog in the same PR.

## Invariants

- Do not modify app behavior for documentation-only tasks.
- Do not ship implementation without matching tests unless the untested behavior is explicitly documented as a gap with a reason.
- Do not refactor unrelated source code while fixing a narrow bug.
- Use existing patterns before adding abstractions.
- Keep dashboard cache mutations centralized in `lib/dashboard-cache.ts` when behavior crosses components.
- Keep drag hover local; do not write cache or server during hover.
- Do not send optimistic-only ids to server reorder endpoints.
- Use `protectedProcedure` for user data.
- Validate ownership on server, even if UI only exposes owned ids.
- Prefer batch server writes for reorder operations.
- Keep expensive custom view recompute work outside short Prisma transactions unless proven safe.
- If changing Next app APIs, read relevant local Next docs under `node_modules/next/dist/docs/` when available.

## Known Risks

- The repo does not currently contain `node_modules` in every environment, so local Next docs may be unavailable.
- Some existing implementation violates ideal ownership rules; fix incrementally and document.
- Broad invalidation or cache refetch can hide consistency bugs during manual testing.

## What Codex Should Read Before Editing

- This file.
- `docs/testing-validation.md`.
- Feature docs relevant to the change.
- `13-testing-and-validation.md`.
- `11-known-issues.md`.

## What Codex Must Update After Editing

- Relevant `docs/ai/*.md`.
- `docs/ai/backlog.md`.
- `docs/ai/15-decision-log.md` for behavior/architecture decisions.
- `docs/ai/13-testing-and-validation.md` for new validation commands or manual regression cases.
