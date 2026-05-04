import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "hex_scans.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                scanned_at TEXT NOT NULL,
                scanned_by TEXT,
                total_issues INTEGER,
                critical INTEGER,
                high INTEGER,
                medium INTEGER,
                low INTEGER,
                security_score INTEGER,
                security_grade TEXT,
                verdict TEXT,
                full_result TEXT NOT NULL
            )
        """)
        conn.commit()
    # Add scanned_by column if upgrading from old schema
    try:
        with get_conn() as conn:
            conn.execute("ALTER TABLE scans ADD COLUMN scanned_by TEXT")
            conn.commit()
    except Exception:
        pass


def save_scan(scan_id: str, filename: str, result: dict, scanned_by: str = None):
    summary = result.get("summary", {})
    owner = scanned_by or result.get("scanned_by")
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO scans (id, filename, scanned_at, total_issues, critical, high, medium, low, security_score, security_grade, verdict, full_result, scanned_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            scan_id, filename, datetime.utcnow().isoformat(),
            summary.get("total_issues", 0), summary.get("critical", 0),
            summary.get("high", 0), summary.get("medium", 0),
            summary.get("low", 0), summary.get("security_score"),
            summary.get("security_grade"), summary.get("verdict"),
            json.dumps(result), owner
        ))
        conn.commit()


def get_all_scans(username: str = None, is_admin: bool = False):
    with get_conn() as conn:
        if is_admin:
            rows = conn.execute(
                "SELECT id, filename, scanned_at, total_issues, critical, high, medium, low, security_score, security_grade, verdict, scanned_by FROM scans ORDER BY scanned_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, filename, scanned_at, total_issues, critical, high, medium, low, security_score, security_grade, verdict, scanned_by FROM scans WHERE scanned_by=? OR scanned_by IS NULL ORDER BY scanned_at DESC",
                (username,)
            ).fetchall()
    return [dict(r) for r in rows]

def get_scan_by_id(scan_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT full_result, scanned_at FROM scans WHERE id=?", (scan_id,)).fetchone()
    if not row or not row["full_result"]:
        return None
    try:
        result = json.loads(row["full_result"])
        result["scanned_at"] = row["scanned_at"]
        return result
    except json.JSONDecodeError:
        return None


def delete_scan(scan_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM scans WHERE id=?", (scan_id,))
        conn.commit()


def get_scan_stats():
    """Admin-only: aggregate stats across all users"""
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
        by_user = conn.execute(
            "SELECT COALESCE(scanned_by, 'system') as scanned_by, COUNT(*) as count FROM scans GROUP BY scanned_by ORDER BY count DESC"
        ).fetchall()
    return {"total_scans": total, "by_user": [dict(r) for r in by_user]}
