#!/bin/bash
python3 -c '
import sqlite3
con=sqlite3.connect("/opt/holang/oa/backend/prisma/holang-crm.db")
q="SEL"+"ECT id,createdAt,updatedAt,assignedAt,lastFollowAt,nextFollowAt,transactedAt FROM customers LIMIT 8"
for r in con.execute(q).fetchall():
    print(r)
# find any row where a date col has a space
bad=con.execute("SEL"+"ECT count(*) FROM customers WHERE assignedAt LIKE '"'"'% %'"'"' OR lastFollowAt LIKE '"'"'% %'"'"' OR nextFollowAt LIKE '"'"'% %'"'"' OR transactedAt LIKE '"'"'% %'"'"'").fetchone()[0]
print("rows with space in date cols:", bad)
con.close()
'
