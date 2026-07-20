import sqlite3, re, sys
from datetime import datetime, timezone

db = 'C:/Users/liush/.workbuddy/skills/系统建设/holang-oa.db'
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
tables = [r['name'] for r in cur.fetchall()]

space_pat = re.compile(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$')
epoch_pat = re.compile(r'^\d{10,13}$')
iso_pat = re.compile(r'^\d{4}-\d{2}-\d{2}T')
skip_cols = {'wechat','whatsapp','status','category','flowStatus','approvalStatus',
             'orderStatus','attachments','operator','collaborators','filePath',
             'duplicateOf','createdBy','createdById'}

def to_iso(v):
    s = str(v).strip()
    if not s:
        return None
    if iso_pat.match(s):
        return None  # already ISO, leave untouched
    if space_pat.match(s):
        # 'YYYY-MM-DD HH:MM:SS' -> 'YYYY-MM-DDTHH:MM:SS.000Z'
        return s.replace(' ', 'T') + '.000Z'
    if epoch_pat.match(s):
        n = int(s)
        if len(s) == 13:
            n = n / 1000.0
        dt = datetime.fromtimestamp(n, tz=timezone.utc)
        return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    return None  # unknown format, do not touch

dry = '--write' not in sys.argv
changes = 0
if dry:
    print('=== DRY RUN (no writes) ===')
for t in tables:
    cols = [c['name'] for c in cur.execute(f'PRAGMA table_info("{t}")')]
    date_cols = [c for c in cols
                 if (re.search(r'(date|time)', c, re.I) or c.lower().endswith('at'))
                 and c not in skip_cols]
    for dc in date_cols:
        rows = cur.execute(f'SELECT rowid, "{dc}" FROM "{t}"').fetchall()
        for r in rows:
            old = r[dc]
            new = to_iso(old) if old is not None else None
            if new is not None:
                changes += 1
                if dry:
                    print(f'{t}.{dc} (rowid={r["rowid"]}): {old!r} -> {new!r}')
                else:
                    cur.execute(f'UPDATE "{t}" SET "{dc}"=? WHERE rowid=?', (new, r['rowid']))

if dry:
    print(f'=== DRY RUN: {changes} values would be converted. Run with --write to apply. ===')
else:
    conn.commit()
    print(f'=== APPLIED: {changes} values converted. ===')
conn.close()
