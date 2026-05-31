# Compact Strategy

Context is finite. This doc explains how Claude Code and Codex minimize session-start overhead and keep context windows clean throughout long-running phases.

---

## Priority Reading Order

Always read in this sequence  -  stop as soon as you have enough context:

1. **`STATE.json`** (always first, ~20 lines)  -  version, phase, active branch, notes
2. **ChromaDB query** (when available)  -  2 - 3 relevant chunks in seconds, not thousands of tokens
3. **`docs/AI_HANDOFF.md`**  -  product snapshot, invariants, known risks
4. **`docs/CODEX_RULES.md`** task routing table  -  pick the smallest source file set for the task
5. **`docs/FUTURE_PLANS.md`**  -  only when choosing or updating roadmap scope
6. **`docs/DECISIONS.md`**  -  only when a durable architecture decision changes
7. **Targeted source files/tests**  -  only the files directly affected by the change

Never scan the repo broadly. Never open files speculatively.

Active product work uses `docs/FUTURE_PLANS.md`, `docs/AI_HANDOFF.md`,
`docs/CODEX_RULES.md`, `docs/DECISIONS.md` only when architecture decisions
change, and targeted source files/tests. `docs/PHASE_LOG.md` is historical and
not part of the normal active read path.

---

## STATE.json Is the Oracle

Read `STATE.json` at session start. It contains everything needed to orient before reading anything else:

- `version`  -  current version string (e.g., `1.0.0-alpha`)
- `state`  -  `alpha` or `stable`
- `phase`  -  phase number
- `phaseTitle`  -  what the current phase is about
- `nextPhase`  -  what comes after

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
- `docs/AI_HANDOFF.md`, `docs/PHASE_LOG.md` (historical archive), `docs/FUTURE_PLANS.md`, `docs/DECISIONS.md`, `docs/CODEX_RULES.md`
- `docs/VERSIONING.md`, `docs/WORKFLOW.md`, `docs/COMPACT_STRATEGY.md`

ChromaDB runs locally on `localhost:8000`  -  no cloud dependencies.

---

## ChatGPT Architect Context Boundary

Local ChromaDB is accessible to local agents/tools, not ChatGPT chat directly.
ChatGPT architect can use ChromaDB only when the user pastes `query_docs.py`
output. Query-first still applies in ChatGPT architect mode, but the query
result must be provided by the user/controller when ChatGPT cannot access
localhost.

Committed `codebase-graph.json` is available to ChatGPT after push through
GitHub. Local regenerated graph output is invisible to ChatGPT until pushed or
pasted. The graph is an orientation map only; it does not replace direct file
reads or pasted local evidence.

---

## Token Budget Targets

| Session Phase | Target Overhead |
|---|---|
| STATE.json only | < 500 tokens |
| STATE.json + 1 ChromaDB query | < 1,500 tokens |
| + CODEX_RULES routing table | < 1,000 tokens additional |
| + active phase log (if needed) | < 2,000 tokens additional |
| **Total session-start budget** | **< 8,000 tokens** |

Before this strategy: opening entrypoint + all feature docs + phase logs at session start cost ~12,000 - 15,000 tokens and grew with every new doc. Query-first retrieval cuts this by 60 - 70% and scales with project size.

---

## Graphify Code Navigation

tidy's graph is the committed `codebase-graph.json` (a normalized symbol/import
map). It is a static artifact, not a live service:

1. Read `codebase-graph.json` before touching source files to pick the smallest direct-read set
2. For deeper orientation, read more of `codebase-graph.json` or the source files it points to
3. Regenerate it with `npm run graph:codebase` after layout changes; `validate.ps1` gates freshness
4. Do NOT run the live graphify CLI (`graphify query`, `graphify path`, `graphify explain`); tidy does not generate `graphify-out/`, so those commands error here

The graph maps files/symbols by name, not meaning. Use it to find which file owns a symbol, not to answer "what handles X" questions. For those, use ChromaDB (`query_docs.py`) or read the appropriate doc.

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
