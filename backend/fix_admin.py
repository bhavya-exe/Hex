import sqlite3
conn = sqlite3.connect('hex_scans.db')
conn.execute("UPDATE users SET role='admin' WHERE username='admin'")
# Set all non-admin users to 'user' role
conn.execute("UPDATE users SET role='user' WHERE username != 'admin'")
# Fix seeded scans that have null or invalid scanned_by
conn.execute("UPDATE scans SET scanned_by='system' WHERE scanned_by IS NULL OR length(scanned_by) > 50")
conn.commit()
print('Users:', conn.execute('SELECT username, role FROM users').fetchall())
print('Scan owners:', conn.execute('SELECT scanned_by, COUNT(*) FROM scans GROUP BY scanned_by').fetchall())
conn.close()
