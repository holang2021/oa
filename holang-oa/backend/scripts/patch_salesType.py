import re, sqlite3

SCHEMA = r'F:/HOLANGBUDDY/HOLANG项目/销售管理系统/holang-oa/backend/prisma/schema.prisma'
DB = r'C:/Users/liush/.workbuddy/skills/系统建设/holang-oa.db'

s = open(SCHEMA, encoding='utf-8').read()

def add_field(s, anchor, field):
    # insert field right after anchor line
    return s.replace(anchor, anchor + '\n' + field, 1)

def add_index(s, anchor, idx):
    return s.replace(anchor, idx + '\n' + anchor, 1)

# --- Opportunity ---
s = add_field(s,
    '  id              String           @id @default(cuid())\n  name            String\n  customerId      String',
    '  salesType       String?')
s = add_index(s, '  @@index([customerId])\n  @@map("opportunities")', '  @@index([salesType])')

# --- Quote ---
s = add_field(s,
    '  id          String     @id @default(cuid())\n  quoteNumber String     @unique\n  customerId  String',
    '  salesType   String?')
s = add_index(s, '  @@index([customerId])\n  @@map("quotes")', '  @@index([salesType])')

# --- Payment ---
s = add_field(s,
    '  id            String      @id @default(cuid())\n  paymentCode   String?\n  customerId    String',
    '  salesType     String?')
s = add_index(s, '  @@index([huobanId])\n  @@map("payments")', '  @@index([salesType])')

# --- Delivery ---
s = add_field(s,
    '  id            String    @id @default(cuid())\n  code          String?   // 编号\n  orderId       String?\n  customerId    String?',
    '  salesType     String?')
s = add_index(s, '  @@index([huobanId])\n  @@map("deliveries")', '  @@index([salesType])')

# --- Invoice ---
s = add_field(s,
    '  id            String    @id @default(cuid())\n  orderId       String?\n  customerId    String?',
    '  salesType     String?')
s = add_index(s, '  @@index([huobanId])\n  @@map("invoices")', '  @@index([salesType])')

# --- Lead ---
s = add_field(s,
    '  id            String    @id @default(cuid())\n  code          String?\n  customerName  String?',
    '  salesType     String?')
s = add_index(s, '  @@index([huobanId])\n  @@map("leads")', '  @@index([salesType])')

# --- Order: rename salesType(直销/间销) -> salesMode, add salesType(INTERNAL/EXTERNAL) ---
s = s.replace(
    '  salesType     String?       // 直销/间销',
    '  salesMode      String?       // 直销/间销\n  salesType      String?       // INTERNAL/EXTERNAL 内外销', 1)
s = add_index(s, '  @@index([businessLine])\n  @@index([status])', '  @@index([salesType])')

open(SCHEMA, 'w', encoding='utf-8').write(s)
print('schema patched')

# --- SQL: rename + add columns + backfill ---
conn = sqlite3.connect(DB)
cur = conn.cursor()

# 1) rename orders.salesType -> salesMode (only if column still named salesType)
cols = [c[1] for c in cur.execute('PRAGMA table_info(orders)')]
if 'salesType' in cols and 'salesMode' not in cols:
    cur.execute('ALTER TABLE orders RENAME COLUMN salesType TO salesMode')
    print('renamed orders.salesType -> salesMode')
else:
    print('orders rename skipped (cols:', cols, ')')

# 2) add new salesType columns where missing
for t in ['opportunities','quotes','payments','deliveries','invoices','leads','orders']:
    c = [x[1] for x in cur.execute(f'PRAGMA table_info({t})')]
    if 'salesType' not in c:
        cur.execute(f'ALTER TABLE {t} ADD COLUMN salesType TEXT')
        print(f'added salesType to {t}')

# 3) backfill from customer (by customerId)
for t in ['opportunities','quotes','payments','deliveries','invoices','orders']:
    cur.execute(f'''UPDATE {t} SET salesType = (
        SELECT c.salesType FROM customers c WHERE c.id = {t}.customerId
    ) WHERE customerId IS NOT NULL AND salesType IS NULL''')
    cur.execute(f"UPDATE {t} SET salesType = 'INTERNAL' WHERE salesType IS NULL")
    n = cur.execute(f'SELECT COUNT(*) FROM {t} WHERE salesType IS NOT NULL').fetchone()[0]
    print(f'{t}.salesType filled: {n}')

# 4) leads: match by customerName
cur.execute('''UPDATE leads SET salesType = (
    SELECT c.salesType FROM customers c WHERE c.companyName = leads.customerName LIMIT 1
) WHERE customerName IS NOT NULL AND salesType IS NULL''')
cur.execute("UPDATE leads SET salesType = 'INTERNAL' WHERE salesType IS NULL")
nl = cur.execute('SELECT COUNT(*) FROM leads WHERE salesType IS NOT NULL').fetchone()[0]
print(f'leads.salesType filled: {nl}')

conn.commit()
conn.close()
print('DONE')
