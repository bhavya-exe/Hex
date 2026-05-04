"""
Fixes corrupted scan records where columns were inserted in wrong order.
The old save_scan inserted: id, filename, scanned_at, scanned_by, total_issues...
The new schema has: id, filename, scanned_at, total_issues, ..., full_result, scanned_by
"""
import sqlite3
import json

conn = sqlite3.connect('hex_scans.db')

# Get all rows with raw column access
rows = conn.execute("SELECT * FROM scans").fetchall()
col_names = [d[1] for d in conn.execute('PRAGMA table_info(scans)').fetchall()]
print("Columns:", col_names)

fixed = 0
for row in rows:
    row_dict = dict(zip(col_names, row))
    scan_id = row_dict['id']
    
    # Detect corrupted rows: total_issues should be a number, not a string
    total_issues_val = row_dict.get('total_issues')
    if isinstance(total_issues_val, str) and not total_issues_val.isdigit():
        # This row has scanned_by in total_issues position
        # The full_result is in scanned_by position
        full_result_json = row_dict.get('scanned_by', '')
        scanned_by_val = row_dict.get('total_issues', '')  # actually scanned_by
        
        try:
            result = json.loads(full_result_json)
            summary = result.get('summary', {})
            
            conn.execute("""
                UPDATE scans SET
                    total_issues = ?,
                    critical = ?,
                    high = ?,
                    medium = ?,
                    low = ?,
                    security_score = ?,
                    security_grade = ?,
                    verdict = ?,
                    full_result = ?,
                    scanned_by = ?
                WHERE id = ?
            """, (
                summary.get('total_issues', 0),
                summary.get('critical', 0),
                summary.get('high', 0),
                summary.get('medium', 0),
                summary.get('low', 0),
                summary.get('security_score'),
                summary.get('security_grade'),
                summary.get('verdict'),
                full_result_json,
                result.get('scanned_by', scanned_by_val),
                scan_id
            ))
            fixed += 1
            print(f"Fixed: {row_dict['filename']} ({scan_id[:8]}...)")
        except Exception as e:
            print(f"Skipped {scan_id[:8]}: {e}")

conn.commit()
print(f"\nDone. Fixed {fixed} corrupted rows.")
conn.close()
