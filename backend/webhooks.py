import sqlite3
import json
import os
import threading
import urllib.request
import urllib.error
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "hex_scans.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_webhooks_table():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS webhooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'custom',
                enabled INTEGER NOT NULL DEFAULT 1,
                notify_critical INTEGER NOT NULL DEFAULT 1,
                notify_all INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()


def get_webhooks():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM webhooks ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def add_webhook(name: str, url: str, wtype: str, notify_critical: bool, notify_all: bool):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO webhooks (name, url, type, enabled, notify_critical, notify_all, created_at) VALUES (?,?,?,1,?,?,?)",
            (name, url, wtype, int(notify_critical), int(notify_all), datetime.utcnow().isoformat())
        )
        conn.commit()


def update_webhook(wid: int, enabled: bool):
    with get_conn() as conn:
        conn.execute("UPDATE webhooks SET enabled=? WHERE id=?", (int(enabled), wid))
        conn.commit()


def delete_webhook(wid: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM webhooks WHERE id=?", (wid,))
        conn.commit()


def _build_slack_payload(result: dict) -> dict:
    summary = result.get("summary", {})
    filename = result.get("filename", "unknown")
    grade = summary.get("security_grade", "N/A")
    score = summary.get("security_score", 0)
    critical = summary.get("critical", 0)
    verdict = summary.get("verdict", "")
    color = "#fc4444" if critical > 0 else "#68d391"

    return {
        "attachments": [{
            "color": color,
            "title": f"HEX Scan Complete: {filename}",
            "fields": [
                {"title": "Grade", "value": grade, "short": True},
                {"title": "Score", "value": str(score), "short": True},
                {"title": "Critical", "value": str(critical), "short": True},
                {"title": "Total Issues", "value": str(summary.get("total_issues", 0)), "short": True},
                {"title": "Verdict", "value": verdict, "short": False},
            ],
            "footer": "Layerd AI - HEX Scanner",
            "ts": int(datetime.utcnow().timestamp())
        }]
    }


def _build_discord_payload(result: dict) -> dict:
    summary = result.get("summary", {})
    filename = result.get("filename", "unknown")
    grade = summary.get("security_grade", "N/A")
    score = summary.get("security_score", 0)
    critical = summary.get("critical", 0)
    verdict = summary.get("verdict", "")
    color = 0xfc4444 if critical > 0 else 0x68d391

    return {
        "embeds": [{
            "title": f"HEX Scan Complete: {filename}",
            "color": color,
            "fields": [
                {"name": "Grade", "value": grade, "inline": True},
                {"name": "Score", "value": str(score), "inline": True},
                {"name": "Critical", "value": str(critical), "inline": True},
                {"name": "Total Issues", "value": str(summary.get("total_issues", 0)), "inline": True},
                {"name": "Verdict", "value": verdict, "inline": False},
            ],
            "footer": {"text": "Layerd AI - HEX Scanner"},
            "timestamp": datetime.utcnow().isoformat()
        }]
    }


def _build_custom_payload(result: dict) -> dict:
    summary = result.get("summary", {})
    return {
        "event": "scan_complete",
        "filename": result.get("filename"),
        "scan_id": result.get("scan_id"),
        "scanned_by": result.get("scanned_by"),
        "timestamp": datetime.utcnow().isoformat(),
        "summary": summary,
        "critical_count": summary.get("critical", 0),
        "security_grade": summary.get("security_grade"),
        "verdict": summary.get("verdict")
    }


def _send_webhook(webhook: dict, result: dict):
    try:
        wtype = webhook.get("type", "custom")
        if wtype == "slack":
            payload = _build_slack_payload(result)
        elif wtype == "discord":
            payload = _build_discord_payload(result)
        else:
            payload = _build_custom_payload(result)

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook["url"],
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "HEX-Scanner/1.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Webhook '{webhook['name']}' sent: {resp.status}")
    except Exception as e:
        print(f"Webhook '{webhook['name']}' failed: {e}")


def fire_webhooks(result: dict):
    """Fire all enabled webhooks in background threads"""
    summary = result.get("summary", {})
    critical = summary.get("critical", 0)

    webhooks = get_webhooks()
    for wh in webhooks:
        if not wh.get("enabled"):
            continue
        if critical > 0 and wh.get("notify_critical"):
            threading.Thread(target=_send_webhook, args=(wh, result), daemon=True).start()
        elif wh.get("notify_all"):
            threading.Thread(target=_send_webhook, args=(wh, result), daemon=True).start()
