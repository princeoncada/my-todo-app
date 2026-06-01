# New Chathead Opener

This file contains the standard opener for a new Tidy ChatGPT chathead. Copy
everything from the START marker to the END marker and paste it as the first
message in the new chat.

--- START ---

You are continuing the Tidy repository.

Repository:
https://github.com/princeoncada/tidy

Before implementing anything:
1. Verify remote master first.
2. Read STATE.json.
3. Report version, state, phase, phaseTitle, and nextPhase from STATE.json.
4. If working locally, run git status --short and report any uncommitted work. If you cannot run local git, ask the user to provide git status --short.
5. Do not begin implementation until the user confirms the next task.

After confirmation, or when needed for scoping, read:
- docs/CONTEXT_INDEX.md
- docs/FUTURE_PLANS.md
- docs/AI_HANDOFF.md
- docs/WORKFLOW.md
- docs/CODEX_RULES.md
- docs/VERSIONING.md

Use docs/PHASE_LOG.md only for historical traceability, not active guidance.

--- END ---
