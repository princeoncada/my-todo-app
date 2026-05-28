#!/usr/bin/env python3
"""
Ingest Tidy workflow docs into ChromaDB tidy_docs collection.
Run after adding or updating any doc file.

Usage:
    python scripts/ingest_docs.py

Requires ChromaDB running on localhost:8000 (npm run chroma).
Requires: pip install chromadb
"""
import os
import sys

import chromadb

CHROMA_HOST = "localhost"
CHROMA_PORT = 8000
COLLECTION_NAME = "tidy_docs"

DOC_PATHS = [
    "docs/AI_HANDOFF.md",
    "docs/PHASE_LOG.md",
    "docs/FUTURE_PLANS.md",
    "docs/DECISIONS.md",
    "docs/CODEX_RULES.md",
    "docs/VERSIONING.md",
    "docs/WORKFLOW.md",
    "docs/COMPACT_STRATEGY.md",
]


def split_on_h2(text: str, source: str) -> list[dict]:
    """Split markdown into chunks at H2 boundaries."""
    chunks: list[dict] = []
    current_section = "intro"
    current_lines: list[str] = []

    for line in text.splitlines():
        if line.startswith("## "):
            if current_lines:
                chunks.append(
                    {
                        "section": current_section,
                        "text": "\n".join(current_lines).strip(),
                        "source": source,
                    }
                )
            current_section = line[3:].strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        chunks.append(
            {
                "section": current_section,
                "text": "\n".join(current_lines).strip(),
                "source": source,
            }
        )

    return [c for c in chunks if c["text"]]


def main() -> None:
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

    try:
        client.heartbeat()
    except Exception as exc:
        print(f"ChromaDB not reachable at {CHROMA_HOST}:{CHROMA_PORT}: {exc}")
        print("Start ChromaDB with: npm run chroma")
        sys.exit(1)

    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = client.create_collection(COLLECTION_NAME)
    total_chunks = 0

    for path in DOC_PATHS:
        if not os.path.exists(path):
            print(f"  SKIP (not found): {path}")
            continue

        with open(path, encoding="utf-8") as f:
            text = f.read()

        chunks = split_on_h2(text, path)

        for i, chunk in enumerate(chunks):
            doc_id = f"{path}::{i}::{chunk['section'][:40]}"
            collection.add(
                ids=[doc_id],
                documents=[chunk["text"]],
                metadatas=[{"source": chunk["source"], "section": chunk["section"]}],
            )

        print(f"  OK ({len(chunks)} chunks): {path}")
        total_chunks += len(chunks)

    print(f"\nIngested {total_chunks} chunks into '{COLLECTION_NAME}'.")


if __name__ == "__main__":
    main()
