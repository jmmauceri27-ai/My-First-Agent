import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path

_DB_DIR = Path.home() / ".utilizecore_analyst"
_DB_PATH = _DB_DIR / "memory.db"


def init_db():
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS insights (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            dataset_name TEXT,
            tags TEXT,
            created_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS file_history (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            dataset_id TEXT NOT NULL,
            rows INTEGER,
            columns INTEGER,
            loaded_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_insight(title: str, content: str, dataset_name: str = None, tags: list = None) -> str:
    init_db()
    record_id = str(uuid.uuid4())[:8]
    tags_json = json.dumps(tags or [])
    created_at = datetime.now().isoformat()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO insights (id, title, content, dataset_name, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (record_id, title, content, dataset_name, tags_json, created_at),
    )
    conn.commit()
    conn.close()
    return f"Insight saved with ID '{record_id}': {title}"


def recall_memory(query: str = None, limit: int = 10) -> str:
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    if query:
        pattern = f"%{query}%"
        cur.execute(
            """
            SELECT id, title, content, dataset_name, tags, created_at
            FROM insights
            WHERE title LIKE ? OR content LIKE ? OR dataset_name LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (pattern, pattern, pattern, limit),
        )
    else:
        cur.execute(
            "SELECT id, title, content, dataset_name, tags, created_at FROM insights ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return "No memories found." + (f" (searched for: '{query}')" if query else "")

    parts = [f"Found {len(rows)} memory record(s):\n"]
    for row in rows:
        record_id, title, content, dataset_name, tags_json, created_at = row
        tags = json.loads(tags_json) if tags_json else []
        parts.append(f"[{record_id}] {title}")
        if dataset_name:
            parts.append(f"  Dataset: {dataset_name}")
        if tags:
            parts.append(f"  Tags: {', '.join(tags)}")
        parts.append(f"  Saved: {created_at[:19]}")
        parts.append(f"  {content}")
        parts.append("")
    return "\n".join(parts)


def log_file_load(filename: str, dataset_id: str, rows: int, columns: int):
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO file_history (id, filename, dataset_id, rows, columns, loaded_at) VALUES (?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4())[:8], filename, dataset_id, rows, columns, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
