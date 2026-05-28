> **DEPRECATED**: Superseded by the 2-section Codex prompt format defined in `docs/WORKFLOW.md`. This file is retained for reference.

# Codex Prompt Template

Use this template when ChatGPT has already acted as architect, debugger, or prompt writer and Codex should execute a focused implementation directly.

```md
You are working in the Tidy repo.

## Context
- ChatGPT has already analyzed the issue and is using Codex as the direct implementation executor.
- This is a focused implementation task, not an invitation to broadly refactor.
- Start with `AGENTS.md` and `docs/ai/00-ai-entrypoint.md`.
- Use `docs/ai/task-routing-guide.md` to choose the smallest relevant set of docs before opening source files.

## Goal
[Describe the exact outcome wanted.]

## Current Problem
[Describe what is broken, confusing, missing, or risky today. Include errors, screenshots, logs, or reproduction steps if available.]

## Expected Behavior
[Describe the desired behavior after the change, including edge cases.]

## Files to Read
- `docs/ai/00-ai-entrypoint.md`
- `docs/ai/12-implementation-rules.md`
- `docs/ai/13-testing-and-validation.md`
- [Add only task-specific docs from `docs/ai/task-routing-guide.md`.]
- [Add specific source files if known.]

## Files Allowed to Edit
- [List exact files or narrow folders Codex may edit.]

## Files Forbidden to Edit
- `app/generated/prisma/**`
- `package.json` / lockfiles unless explicitly required by this task
- [List any task-specific forbidden files.]

## Existing Behavior to Preserve
- Do not alter optimistic update behavior unless explicitly instructed.
- Preserve rollback behavior for failed mutations.
- Preserve existing TanStack Query keys and cache shapes unless this task explicitly changes them.
- Preserve drag-and-drop invariants unless this task is specifically about drag-and-drop.
- Preserve public API names, route names, model names, and component contracts unless required.

## Implementation Requirements
- Inspect existing patterns before making changes if uncertain.
- Keep the diff as small as possible.
- Do not broadly refactor.
- Do not rewrite unrelated code.
- Do not rename public APIs unless required.
- Do not update package versions unless explicitly asked.
- Update relevant `docs/ai/*.md` files if behavior, validation, risks, or invariants change.

## Validation Command
Run the smallest validation that covers the change:
- Prefer `npm run typecheck` for TypeScript validation when relevant.
- Run `npm run lint` when relevant and feasible.
- Do not invent or add new testing tools unless explicitly requested.

## Output Requirements
Return:
1. Files changed.
2. What changed in each file.
3. Validation results, including exact commands.
4. Any risks or follow-up suggestions.
```
