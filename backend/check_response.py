import sqlite3
import json

conn = sqlite3.connect('hex_scans.db')
conn.row_factory = sqlite3.Row

rows = conn.execute(
    "SELECT id, filename, scanned_at, total_issues, critical, high, medium, low, security_score, security_grade, verdict, scanned_by FROM scans ORDER BY scanned_at DESC LIMIT 3"
).fetchall()

for r in rows:
    d = dict(r)
    print(json.dumps(d, indent=2))
    print("---")

conn.close()
