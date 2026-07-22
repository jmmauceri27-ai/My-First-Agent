"""Persistent storage for uploaded datasets and saved dashboards (SQLite)."""
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

import pandas as pd

_DATA_DIR = Path(os.environ.get("APP_DATA_DIR", "data"))
_DB_PATH = _DATA_DIR / "app.db"


@contextmanager
def _connect():
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                table_name TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                category TEXT NOT NULL,
                source_filename TEXT,
                rows INTEGER,
                columns_json TEXT,
                uploaded_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                name TEXT PRIMARY KEY,
                config_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)


def _safe_table_name(display_name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_]", "_", display_name.strip())
    slug = re.sub(r"_+", "_", slug).strip("_").lower()
    return f"ds_{slug}" or "ds_dataset"


def ingest_dataframe(display_name: str, category: str, source_filename: str, df: pd.DataFrame) -> str:
    """Store a dataframe as a table, replacing any existing dataset with the same display name."""
    init_db()
    table_name = _safe_table_name(display_name)
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    with _connect() as conn:
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.execute("DELETE FROM datasets WHERE table_name = ?", (table_name,))
        conn.execute(
            """INSERT INTO datasets (table_name, display_name, category, source_filename, rows, columns_json, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                table_name,
                display_name,
                category,
                source_filename,
                len(df),
                json.dumps(list(df.columns)),
                datetime.now().isoformat(),
            ),
        )
    return table_name


def list_datasets() -> pd.DataFrame:
    init_db()
    with _connect() as conn:
        return pd.read_sql_query(
            "SELECT table_name, display_name, category, source_filename, rows, columns_json, uploaded_at "
            "FROM datasets ORDER BY uploaded_at DESC",
            conn,
        )


def get_dataset_columns(table_name: str) -> list:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT columns_json FROM datasets WHERE table_name = ?", (table_name,)
        ).fetchone()
    return json.loads(row[0]) if row else []


def get_dataframe(table_name: str) -> pd.DataFrame:
    init_db()
    with _connect() as conn:
        return pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)


def delete_dataset(table_name: str):
    init_db()
    with _connect() as conn:
        conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.execute("DELETE FROM datasets WHERE table_name = ?", (table_name,))


def save_dashboard(name: str, config: dict):
    init_db()
    now = datetime.now().isoformat()
    config_json = json.dumps(config)
    with _connect() as conn:
        existing = conn.execute("SELECT created_at FROM dashboards WHERE name = ?", (name,)).fetchone()
        created_at = existing[0] if existing else now
        conn.execute(
            """INSERT INTO dashboards (name, config_json, created_at, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at""",
            (name, config_json, created_at, now),
        )


def list_dashboards() -> list:
    init_db()
    with _connect() as conn:
        rows = conn.execute("SELECT name FROM dashboards ORDER BY name").fetchall()
    return [r[0] for r in rows]


def load_dashboard(name: str) -> dict:
    init_db()
    with _connect() as conn:
        row = conn.execute("SELECT config_json FROM dashboards WHERE name = ?", (name,)).fetchone()
    return json.loads(row[0]) if row else {"name": name, "cards": []}


def delete_dashboard(name: str):
    init_db()
    with _connect() as conn:
        conn.execute("DELETE FROM dashboards WHERE name = ?", (name,))
