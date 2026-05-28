#!/usr/bin/env python3
"""
Query ChromaDB tidy_docs collection for relevant doc chunks.
Returns the top N results with source, section, and a text preview.

Usage:
    python scripts/query_docs.py "your question about the task"

Requires ChromaDB running on localhost:8000 (npm run chroma).
Requires: pip install chromadb
"""
import sys

import chromadb

CHROMA_HOST = "localhost"
CHROMA_PORT = 8000
COLLECTION_NAME = "tidy_docs"
N_RESULTS = 5
PREVIEW_LENGTH = 300


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python scripts/query_docs.py "your question"')
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)

    try:
        client.heartbeat()
    except Exception as exc:
        print(f"ChromaDB not reachable at {CHROMA_HOST}:{CHROMA_PORT}: {exc}")
        print("Start ChromaDB with: npm run chroma")
        sys.exit(1)

    try:
        collection = client.get_collection(COLLECTION_NAME)
    except Exception:
        print(f"Collection '{COLLECTION_NAME}' not found. Run: python scripts/ingest_docs.py")
        sys.exit(1)

    results = collection.query(query_texts=[query], n_results=N_RESULTS)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    if not documents:
        print("No results found.")
        sys.exit(0)

    print(f"Query: {query}\n")
    for i, (doc, meta) in enumerate(zip(documents, metadatas), 1):
        source = meta.get("source", "?")
        section = meta.get("section", "?")
        preview = doc[:PREVIEW_LENGTH].replace("\n", " ")
        ellipsis = "..." if len(doc) > PREVIEW_LENGTH else ""
        print(f"[{i}] {source} > {section}")
        print(f"     {preview}{ellipsis}")
        print()


if __name__ == "__main__":
    main()
