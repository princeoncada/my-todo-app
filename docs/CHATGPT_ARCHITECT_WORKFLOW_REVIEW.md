# ChatGPT Architect Workflow Review

## Purpose

This document proves that Phase 1.3.0 was implemented and gives the user a visible workflow layout to approve before product work resumes. It is a review artifact for the ChatGPT architect workflow, not a product implementation plan.

## What Changed in 1.3.0

- ChatGPT Architect Mode was added.
- Local Evidence Packet was added.
- Local ChromaDB limitations were documented.
- Local generated graph limitations were documented.
- Codex prompts must state local evidence status.
- Validation checks now confirm ChatGPT architect docs exist.

## Proof That 1.3.0 Is Implemented

- [ ] `STATE.json` should report 1.3.0 stable before 1.3.1 opens.
- [ ] `docs/FUTURE_PLANS.md` should show 1.3.0 completed and 1.4.0 as next planned.
- [ ] `docs/AI_HANDOFF.md` should contain the ChatGPT architect boundary.
- [ ] `scripts/validate.ps1` should include the `chatgpt architect docs` validation result.
- [ ] `docs/WORKFLOW.md` should contain the Local Evidence Packet.
- [ ] `docs/COMPACT_STRATEGY.md` should document ChatGPT architect context boundaries.
- [ ] `docs/CODEX_RULES.md` should contain ChatGPT Architect Evidence Boundary.

## Before vs After

Before:

- ChatGPT read pushed GitHub state but local context was informal.
- Local ChromaDB results had to be pasted manually but this was not formalized.
- Local git diff/status was easy to forget.
- Product phases could be scoped from remote-only context by accident.

After:

- ChatGPT architect mode explicitly uses pushed GitHub state plus pasted local evidence.
- Anything not pushed or pasted does not exist to ChatGPT architect.
- Local Evidence Packet defines what must be pasted before source-heavy scoping.
- Codex prompts must state whether local evidence was provided.
- Validation keeps the workflow docs from silently disappearing.

## Context Flow Layout

1. User/controller runs local checks.
2. User/controller pastes Local Evidence Packet into ChatGPT.
3. ChatGPT architect scopes from remote GitHub state plus pasted local evidence.
4. ChatGPT produces a Codex prompt with LOCAL EVIDENCE PROVIDED.
5. Codex works locally and reads files directly before editing.
6. User/controller runs graph and validation locally.
7. User/controller commits, promotes, and pushes.
8. ChatGPT can read pushed stable state after push.

## Local Evidence Packet Layout

Required commands:

    git status --short
    git log --oneline -5
    Get-Content STATE.json
    python scripts/query_docs.py "<question about the current task>"
    npm run graph:codebase
    git diff --stat

Optional commands:

    git diff -- <path>
    Select-String -Path "docs\FUTURE_PLANS.md" -Pattern "<phase>"
    Select-String -Path "docs\AI_HANDOFF.md" -Pattern "<topic>"

## Remote-Only Mode

Remote-only mode is acceptable for:

- Docs-only review.
- Roadmap inspection.
- Pushed stable-state review.
- Asking what is next after push.

Remote-only mode is not enough when:

- Source-heavy implementation scoping is needed.
- Uncommitted local changes exist.
- Branch-specific work exists.
- Local ChromaDB query results matter.
- Local graph output differs from pushed `codebase-graph.json`.

## ChromaDB Context Flow

ChatGPT cannot access localhost ChromaDB directly. The user/controller or local agent must run `query_docs.py` locally, and the pasted query output becomes ChatGPT evidence. ChatGPT must not claim ChromaDB was queried unless results were pasted or the local agent generated them.

## Graph Context Flow

ChatGPT can read committed `codebase-graph.json` after push. Local regenerated graph changes are invisible until pushed or pasted. The graph is an orientation map only. Direct file reads are still required before editing.

## Example Good Packet

LOCAL EVIDENCE PROVIDED:

    git status --short
    clean

    git log --oneline -5
    317e427 chore(graph): refresh graph for 1.3.0-stable

    Get-Content STATE.json
    version 1.3.0, state stable, phaseTitle ChatGPT Architect Local Context Workflow, nextPhase 1.4.0 - Phase 3 Completion: View Filter Hardening

    python scripts/query_docs.py "Phase 3 View Filter Hardening context"
    query result summary: FUTURE_PLANS identifies 1.4.0 as projection correctness work; AI_HANDOFF lists dashboard projection and ownership risks.

    npm run graph:codebase
    graph generation succeeded and codebase-graph.json is current for the local workspace.

    .\scripts\validate.ps1
    validation result summary: all required workflow and documentation gates passed before promotion.

## Example Incomplete Packet

Bad example:

    Please scope 1.4.0 from memory.
    I think the repo is current.

This is incomplete because it has no git status, no ChromaDB query output, and no pasted evidence proving whether local files, graph output, or validation output differ from pushed GitHub state.

## 1.4.0 Scoping Layout Preview

After this review is approved, 1.4.0 scoping should require:

- Local Evidence Packet.
- ChromaDB query for Phase 3 / View Filter Hardening.
- Graph fresh status.
- Git status clean or explicit diff summary.
- Direct-read target files selected from graph and Chroma evidence.
- No product implementation until evidence is reviewed.

## Approval Checklist

- [ ] I understand what ChatGPT can see remotely.
- [ ] I understand what must be pasted from local context.
- [ ] I approve the Local Evidence Packet layout.
- [ ] I approve the Remote-Only Mode limits.
- [ ] I approve the ChromaDB context flow.
- [ ] I approve the graph context flow.
- [ ] I approve using this workflow to scope 1.4.0.
- [ ] I want revisions before product work resumes.

## Revision Notes

Record requested workflow review changes here before product work resumes.
