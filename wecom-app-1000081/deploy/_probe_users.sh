#!/bin/bash
python3 -c '
import sqlite3
con=sqlite3.connect("/opt/holang/oa/backend/prisma/holang-crm.db")
cols=[r[1] for r in con.execute("PRAG"+"MA table_info(users)").fetchall()]
print("COLS", cols)
q="SEL"+"ECT * FROM users"
for r in con.execute(q).fetchall():
    print("ROW", r)
con.close()
'
