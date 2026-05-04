import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "hex_scans.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_registry_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS model_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                version TEXT NOT NULL,
                scan_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                registered_at TEXT NOT NULL,
                registered_by TEXT,
                notes TEXT,
                UNIQUE(model_name, version)
            )
        """)
        conn.commit()


def register_model(model_name: str, version: str, scan_id: str, filename: str, registered_by: str, notes: str = ""):
    with get_conn() as conn:
        try:
            conn.execute("""
                INSERT INTO model_registry (model_name, version, scan_id, filename, registered_at, registered_by, notes)
                VALUES (?,?,?,?,?,?,?)
            """, (model_name, version, scan_id, filename, datetime.utcnow().isoformat(), registered_by, notes))
            conn.commit()
            return True
        except Exception:
            return False


def get_all_models():
    """Get unique model names with their latest scan info"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT r.model_name,
                   COUNT(*) as version_count,
                   MAX(r.registered_at) as last_updated,
                   r.version as latest_version,
                   s.security_grade,
                   s.security_score,
                   s.total_issues,
                   s.critical
            FROM model_registry r
            LEFT JOIN scans s ON r.scan_id = s.id
            GROUP BY r.model_name
            ORDER BY last_updated DESC
        """).fetchall()
    return [dict(r) for r in rows]


def get_model_versions(model_name: str):
    """Get all versions of a specific model with scan details"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT r.id, r.model_name, r.version, r.scan_id, r.filename,
                   r.registered_at, r.registered_by, r.notes,
                   s.security_grade, s.security_score, s.total_issues,
                   s.critical, s.high, s.medium, s.low, s.verdict
            FROM model_registry r
            LEFT JOIN scans s ON r.scan_id = s.id
            WHERE r.model_name = ?
            ORDER BY r.registered_at DESC
        """, (model_name,)).fetchall()
    return [dict(r) for r in rows]


def delete_model_version(registry_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM model_registry WHERE id=?", (registry_id,))
        conn.commit()


def get_model_trend(model_name: str):
    """Get security score trend for a model across versions"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT r.version, r.registered_at,
                   s.security_score, s.security_grade,
                   s.total_issues, s.critical, s.high
            FROM model_registry r
            LEFT JOIN scans s ON r.scan_id = s.id
            WHERE r.model_name = ?
            ORDER BY r.registered_at ASC
        """, (model_name,)).fetchall()
    return [dict(r) for r in rows]
