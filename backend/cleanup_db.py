import sqlite3
conn = sqlite3.connect('hex_scans.db')
# Remove scans with empty or invalid full_result
rows = conn.execute("SELECT id, full_result FROM scans").fetchall()
removed = 0
for row in rows:
    if not row[1] or row[1].strip() == '':
        conn.execute("DELETE FROM scans WHERE id=?", (row[0],))
        removed += 1
conn.commit()
print(f"Removed {removed} corrupted scan records")
print(f"Remaining scans: {conn.execute('SELECT COUNT(*) FROM scans').fetchone()[0]}")
conn.close()
