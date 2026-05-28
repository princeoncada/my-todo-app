# Compact Strategy

Context is finite. This doc explains how Claude Code and Codex minimize session-start overhead and keep context windows clean throughout long-running phases.

---

## Priority Reading Order

Always read in this sequence — stop as soon as you have enough context:

1. **`STATE.json`** (always first, ~20 lines) — version, phase, active branch, notes
2. **ChromaDB query** (when available) — 2–3 relevant chunks in seconds, not thousands of tokens
3. **`docs/AI_HANDOFF.md`** — product snapshot, invariants, known risks
4. **`docs/CODEX_RULES.md`** task routing table — pick the smallest source file set for the task
5. **Phase log for the active phase** — only if implementing phase-specific work
6. **Targeted source files** — only the files directly affected by the change

Never scan the repo broadly. Never open files speculatively.

---

## STATE.json Is the Oracle

Read `STATE.json` at session start. It contains everything needed to orient before reading anything else:

- `version` — current version string (e.g., `1.0.0-alpha`)
- `state` — `alpha` or `stable`
- `phase` — phase number
- `phaseTitle` — what the current phase is about
- `nextPhase` — what comes after
- `preVersioningBaseline` — history of pre-1.0.0 phases

Do not open `docs/VERSIONING.md` just to check the version. STATE.json is authoritative. Only read VERSIONING.md when you need the full history table or planned phases.

---

## ChromaDB Query Discipline

As phases accumulate, docs grow and session-start overhead compounds. ChromaDB ingests the 8 workflow docs and returns only the relevant chunks.

**Before opening any large doc file, run:**

```bash
python scripts/query_docs.py "your question"
```

Rules:
- One query per distinct topic
- Trust the first result; do not re-query the same topic
- Only open the full file if the query returns zero relevant content
- When falling back to a direct read, state: *"Query returned zero results for X, falling back to direct read because..."*

**Start ChromaDB:**
```bash
npm run chroma
```

**Refresh the index** after adding or updating any doc file:
```bash
python scripts/ingest_docs.py
```

ChromaDB ingests these files into the `tidy_docs` collection:
- `docs/AI_HANDOFF.md`, `docs/PHASE_LOG.md`, `docs/FUTURE_PLANS.md`, `docs/DECISIONS.md`, `docs/CODEX_RULES.md`
- `docs/VERSIONING.md`, `docs/WORKFLOW.md`, `docs/COMPACT_STRATEGY.md`

ChromaDB runs locally on `localhost:8000` — no cloud dependencies.

---

## Token Budget Targets

| Session Phase | Target Overhead |
|---|---|
| STATE.json only | < 500 tokens |
| STATE.json + 1 ChromaDB query | < 1,500 tokens |
| + CODEX_RULES routing table | < 1,000 tokens additional |
| + active phase log (if needed) | < 2,000 tokens additional |
| **Total session-start budget** | **< 8,000 tokens** |

Before this strategy: opening entrypoint + all feature docs + phase logs at session start cost ~12,000–15,000 tokens and grew with every new doc. Query-first retrieval cuts this by 60–70% and scales with project size.

---

## Graphify Code Navigation (Phase 1.1.0 — Planned)

After Graphify integration (v1.1.0):

1. Read `codebase-graph.json` before touching source files — compact normalized symbol map
2. Use `graphify-out/GRAPH_REPORT.md` for orientation-heavy or multi-file features
3. Run `graphify query . "<symbol>"` for BFS traversal to locate related files
4. Use `graphify explain . "<nodeName>"` for details on a specific symbol

Graphify is keyword/BFS-based — not semantic. Use it to find nodes by name, not to answer "what handles X" style questions. For those, use ChromaDB (`query_docs.py`) or read the appropriate feature doc.

Graphify setup instructions will be added to `docs/CODEX_RULES.md` after Phase 1.1.0 is complete.

---

## What Not to Read

| Situation | Skip this | Use this instead |
|---|---|---|
| Check current version | `docs/VERSIONING.md` | `STATE.json` |
| Find a file location | Broad `Glob` | `docs/AI_HANDOFF.md` Key Files + graphify |
| Understand data model | Scanning all routers | `prisma/schema.prisma` + Architecture Invariants in `docs/AI_HANDOFF.md` |
| Understand optimistic flow | `hooks/useOptimisticSync.ts` raw | Architecture Invariants in `docs/AI_HANDOFF.md` |
| Understand view/tag logic | Full component tree | Architecture Invariants in `docs/AI_HANDOFF.md` + `trpc/routers/viewHelpers.ts` |
| Know what to implement next | Full backlog scan | `docs/FUTURE_PLANS.md` + STATE.json `nextPhase` |
