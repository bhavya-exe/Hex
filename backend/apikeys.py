import sqlite3
import os
import secrets
import hashlib
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "hex_scans.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_apikeys_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                key_prefix TEXT NOT NULL,
                username TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_used TEXT,
                enabled INTEGER NOT NULL DEFAULT 1
            )
        """)
        conn.commit()


def generate_api_key():
    """Generate a secure API key with hex_ prefix"""
    raw = secrets.token_urlsafe(32)
    return f"hex_{raw}"


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def create_api_key(name: str, username: str) -> str:
    key = generate_api_key()
    key_hash = hash_key(key)
    prefix = key[:12]  # show first 12 chars for identification
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO api_keys (name, key_hash, key_prefix, username, created_at) VALUES (?,?,?,?,?)",
            (name, key_hash, prefix, username, datetime.utcnow().isoformat())
        )
        conn.commit()
    return key  # only returned once


def get_user_api_keys(username: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, key_prefix, username, created_at, last_used, enabled FROM api_keys WHERE username=? ORDER BY created_at DESC",
            (username,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_api_keys():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, key_prefix, username, created_at, last_used, enabled FROM api_keys ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def validate_api_key(key: str):
    """Returns username if valid, None otherwise"""
    key_hash = hash_key(key)
    with get_conn() as conn:
        row = conn.execute(
            "SELECT username, enabled FROM api_keys WHERE key_hash=?", (key_hash,)
        ).fetchone()
        if row and row["enabled"]:
            conn.execute(
                "UPDATE api_keys SET last_used=? WHERE key_hash=?",
                (datetime.utcnow().isoformat(), key_hash)
            )
            conn.commit()
            return row["username"]
    return None


def delete_api_key(key_id: int, username: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM api_keys WHERE id=? AND username=?", (key_id, username))
        conn.commit()


def toggle_api_key(key_id: int, enabled: bool, username: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE api_keys SET enabled=? WHERE id=? AND username=?",
            (int(enabled), key_id, username)
        )
        conn.commit()
