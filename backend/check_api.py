import sqlite3
conn = sqlite3.connect('hex_scans.db')
conn.row_factory = sqlite3.Row

# Check actual column names
cols = [d[1] for d in conn.execute('PRAGMA table_info(scans)').fetchall()]
print("Actual column names:", cols)

# Check one row
row = conn.execute("SELECT id, filename, scanned_at, total_issues, critical, high, medium, low, security_score, security_grade, verdict, scanned_by FROM scans LIMIT 1").fetchone()
if row:
    print("\nRow values:")
    for key in row.keys():
        val = str(row[key])[:60] if row[key] else None
        print(f"  {key}: {val}")
conn.close()
