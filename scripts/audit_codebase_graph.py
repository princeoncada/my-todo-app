#!/usr/bin/env python3
"""Audit Tidy's committed codebase graph for orientation quality."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
GRAPH_PATH = ROOT / "codebase-graph.json"
STATE_PATH = ROOT / "STATE.json"
SCHEMA_VERSION = "tidy-codebase-graph/v1"
MIN_NODE_COUNT = 40

READ_FIRST_REQUIRED = [
    "STATE.json",
    "codebase-graph.json",
    "docs/CODEX_RULES.md",
    "docs/VERSIONING.md",
    "docs/AI_HANDOFF.md",
    "docs/FUTURE_PLANS.md",
    "docs/PHASE_LOG.md",
    "docs/WORKFLOW.md",
]

REQUIRED_NODES = [
    "AGENTS.md",
    "STATE.json",
    "package.json",
    "docs/AI_HANDOFF.md",
    "docs/CODEX_RULES.md",
    "docs/FUTURE_PLANS.md",
    "docs/VERSIONING.md",
    "docs/WORKFLOW.md",
    "docs/CODEBASE_GRAPH.md",
    "scripts/generate-codebase-graph.ps1",
    "scripts/generate_codebase_graph.py",
    "scripts/promote.ps1",
    "scripts/validate.ps1",
    "app/dashboard/page.tsx",
    "components/Dashboard.tsx",
    "components/list/ListsContainer.tsx",
    "hooks/useOptimisticSync.ts",
    "lib/dashboard-cache.ts",
    "trpc/init.ts",
    "trpc/routers/_app.ts",
    "trpc/routers/listItemRouter.ts",
    "trpc/routers/tagRouter.ts",
    "trpc/routers/viewHelpers.ts",
    "prisma/schema.prisma",
]

EXPECTED_KINDS = {
    "AGENTS.md": "root_doc",
    "STATE.json": "root_doc",
    "docs/AI_HANDOFF.md": "documentation",
    "docs/CODEX_RULES.md": "documentation",
    "scripts/promote.ps1": "script",
    "scripts/validate.ps1": "script",
    "app/dashboard/page.tsx": "page_route",
    "components/Dashboard.tsx": "component",
    "components/list/ListsContainer.tsx": "component",
    "hooks/useOptimisticSync.ts": "hook",
    "lib/dashboard-cache.ts": "library",
    "trpc/init.ts": "trpc",
    "trpc/routers/listItemRouter.ts": "trpc_router",
    "trpc/routers/tagRouter.ts": "trpc_router",
    "trpc/routers/viewHelpers.ts": "trpc_router",
    "prisma/schema.prisma": "prisma",
}

PROTECTED_PREFIXES = [
    "app/generated/prisma",
    "node_modules",
    ".next",
    "graphify-out",
    "chroma-data",
    "coverage",
    "test-results",
    "playwright-report",
    "docs/SESSION_LOG",
]


def load_json(path: Path, errors: list[str], label: str) -> Any:
    if not path.exists():
        errors.append(f"{label} missing: {path.relative_to(ROOT).as_posix()}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{label} is not valid JSON: {exc}")
    except OSError as exc:
        errors.append(f"{label} could not be read: {exc}")
    return None


def normalize_path(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.replace("\\", "/").lstrip("./")


def node_path(node: Any) -> str:
    if isinstance(node, str):
        return normalize_path(node)
    if not isinstance(node, dict):
        return ""
    for key in ["path", "file", "id", "name", "label"]:
        path = normalize_path(node.get(key))
        if path:
            return path
    return ""


def node_kind(node: Any) -> str:
    if not isinstance(node, dict):
        return ""
    value = node.get("kind", node.get("type", ""))
    return value if isinstance(value, str) else ""


def node_imports(node: Any) -> list[Any]:
    if not isinstance(node, dict):
        return []
    imports = node.get("imports", [])
    return imports if isinstance(imports, list) else []


def main() -> int:
    errors: list[str] = []
    graph = load_json(GRAPH_PATH, errors, "codebase-graph.json")
    state = load_json(STATE_PATH, errors, "STATE.json")
    if graph is None or state is None:
        return fail(errors)

    if graph.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion must be {SCHEMA_VERSION}, got {graph.get('schemaVersion')!r}")
    if graph.get("version") != state.get("version"):
        errors.append(f"graph.version {graph.get('version')!r} does not match STATE.json {state.get('version')!r}")
    if not graph.get("generatedAt"):
        errors.append("generatedAt is missing")
    if not isinstance(graph.get("graphify"), dict):
        errors.append("graphify metadata is missing")

    read_first = graph.get("readFirst")
    if not isinstance(read_first, list):
        errors.append("readFirst must be a list")
        read_first = []
    for required in READ_FIRST_REQUIRED:
        if required not in read_first:
            errors.append(f"readFirst missing {required}")

    nodes = graph.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        errors.append("nodes must be a non-empty list")
        nodes = []
    if len(nodes) < MIN_NODE_COUNT:
        errors.append(f"nodes has {len(nodes)} entries; expected at least {MIN_NODE_COUNT}")

    path_to_node = {node_path(node): node for node in nodes if node_path(node)}
    for required in REQUIRED_NODES:
        if required not in path_to_node:
            errors.append(f"required node missing: {required}")

    for path, expected in EXPECTED_KINDS.items():
        node = path_to_node.get(path)
        if node is None:
            continue
        actual = node_kind(node)
        if actual and actual != expected:
            errors.append(f"{path} kind/type expected {expected}, got {actual}")

    for path in path_to_node:
        for protected in PROTECTED_PREFIXES:
            if path == protected or path.startswith(f"{protected}/"):
                errors.append(f"protected path included as node: {path}")

    edges = graph.get("edges")
    has_edges = isinstance(edges, list) and len(edges) > 0
    has_node_imports = any(len(node_imports(node)) > 0 for node in nodes)
    if not has_edges and not has_node_imports:
        errors.append("graph has no edges and no node imports; routing metadata is missing")

    if errors:
        return fail(errors)

    print(
        "codebase graph audit passed: "
        f"{len(nodes)} nodes, "
        f"{len(edges) if isinstance(edges, list) else 0} edges, "
        f"{len(REQUIRED_NODES)} required nodes"
    )
    return 0


def fail(errors: list[str]) -> int:
    print("codebase graph audit failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
