import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

_DB_DIR = Path.home() / ".utilizecore_pain_points"
_DB_PATH = _DB_DIR / "pain_points.db"

CATEGORIES = [
    "Work Orders",
    "Clients",
    "Vendor Management",
    "Invoicing/Billing",
    "Reporting/Analytics",
    "Mobile App",
    "Integrations",
    "User Interface",
    "Performance/Reliability",
    "Customer Support",
    "Onboarding/Training",
    "Notifications",
    "Other",
]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
FREQUENCIES = ["Rare", "Occasional", "Frequent", "Constant"]
STATUSES = ["Open", "In Progress", "Resolved", "Won't Fix"]

_SEVERITY_ORDER = {s: i for i, s in enumerate(reversed(SEVERITIES))}


def init_db():
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pain_points (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            impact TEXT,
            severity TEXT NOT NULL,
            frequency TEXT NOT NULL,
            workaround TEXT,
            status TEXT NOT NULL DEFAULT 'Open',
            date_logged TEXT NOT NULL,
            date_resolved TEXT
        )
    """)
    conn.commit()
    conn.close()


def add_pain_point(
    title: str,
    category: str,
    description: str,
    severity: str,
    frequency: str,
    impact: str = "",
    workaround: str = "",
) -> str:
    init_db()
    record_id = str(uuid.uuid4())[:8]
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO pain_points
           (id, title, category, description, impact, severity, frequency, workaround, status, date_logged)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)""",
        (record_id, title, category, description, impact, severity, frequency,
         workaround, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return record_id


def list_pain_points(status: Optional[str] = None, category: Optional[str] = None) -> list[dict]:
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    query = "SELECT * FROM pain_points WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    rows.sort(key=lambda r: (_SEVERITY_ORDER.get(r["severity"], 0), r["date_logged"]), reverse=True)
    return rows


def get_pain_point(record_id: str) -> Optional[dict]:
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM pain_points WHERE id = ?", (record_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_status(record_id: str, status: str) -> bool:
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    date_resolved = datetime.now().isoformat() if status == "Resolved" else None
    cur.execute(
        "UPDATE pain_points SET status = ?, date_resolved = ? WHERE id = ?",
        (status, date_resolved, record_id),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated


_EDITABLE_FIELDS = {"title", "category", "description", "impact", "severity", "frequency", "workaround"}


def update_pain_point(record_id: str, **fields) -> bool:
    unknown = set(fields) - _EDITABLE_FIELDS
    if unknown:
        raise ValueError(f"Unknown field(s): {unknown}")
    if not fields:
        return False
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    cur.execute(
        f"UPDATE pain_points SET {set_clause} WHERE id = ?",
        (*fields.values(), record_id),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def delete_pain_point(record_id: str) -> bool:
    init_db()
    conn = sqlite3.connect(_DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM pain_points WHERE id = ?", (record_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_stats() -> dict:
    rows = list_pain_points()
    stats = {
        "total": len(rows),
        "by_status": {},
        "by_severity": {},
        "by_category": {},
    }
    for r in rows:
        stats["by_status"][r["status"]] = stats["by_status"].get(r["status"], 0) + 1
        stats["by_severity"][r["severity"]] = stats["by_severity"].get(r["severity"], 0) + 1
        stats["by_category"][r["category"]] = stats["by_category"].get(r["category"], 0) + 1
    return stats
