import sqlite3
conn = sqlite3.connect('hex_scans.db')
cols = [d[0] for d in conn.execute('PRAGMA table_info(scans)').fetchall()]
print("Columns:", cols)
row = conn.execute("SELECT * FROM scans LIMIT 1").fetchone()
if row:
    for i, col in enumerate(cols):
        val = str(row[i])[:80] if row[i] else None
        print(f"  {col}: {val}")
conn.close()
