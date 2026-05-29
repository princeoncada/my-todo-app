# New Chathead Opener

This file contains the standard opener for every new Claude Code session.
Copy everything from the START marker to the END marker and paste it as
your first message in the new session.

--- START ---

You are continuing the Tidy project in Claude Code.

Before doing anything else:
1. Run: git pull origin master
2. Read: STATE.json and docs/FUTURE_PLANS.md
3. Report state using the Startup Report Format from AGENTS.md:
   - Version and state
   - Current phase
   - Next phase
   - ChromaDB status
   - FUTURE_PLANS next Open item
4. Run: git status --short and report any uncommitted work

Current expected state: 1.0.5-stable.
Next planned work: 1.1.0 - Graphify Integration. Install graphify,
generate codebase-graph.json, add graph navigation discipline to AGENTS.md.

Do not read other docs or begin implementation until I confirm.
See CLAUDE.md and docs/CODEX_RULES.md for full rules after confirmation.

--- END ---
