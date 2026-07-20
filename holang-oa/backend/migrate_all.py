#!/usr/bin/env python3
"""
HOLANG CRM 全量数据迁移脚本
从伙伴云原始数据直接写入 SQLite 数据库

执行顺序（依赖链不断裂）:
  1. system user    — 占位用户
  2. customers      — 394条
  3. contacts       — 538条
  4. contract_entities — 408条
  5. orders + items — 283订单 + 382明细
  6. payments       — 458条
  7. followups      — 364条
  8. invoices       — 271条 (修正字段映射)
  9. deliveries     — 239条 (修正字段映射)
 10. leads          — 2条
 11. opportunities  — 1条

含三层校验: 导入前预检 → 事务写入 → 导入后审计
"""

import json
import os
import sqlite3
import sys
from datetime import datetime

def now_iso():
    return datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%fZ')

# ============================================================
# 路径配置
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_PATH = r'C:\Users\liush\.workbuddy\skills\系统建设\huoban_data\export_20260626_122608\01_data.json'
DB_PATH = os.path.join(r'C:\Users\liush\.workbuddy\skills\系统建设', 'holang-crm.db')

print(f"Raw data: {RAW_DATA_PATH}")
print(f"Database: {DB_PATH}")

# ============================================================
# 加载原始数据
# ============================================================
print("\n[1/8] Loading raw data...")
with open(RAW_DATA_PATH, encoding='utf-8') as f:
    raw = json.load(f)

print(f"  Tables: {list(raw.keys())}")
for k, v in raw.items():
    print(f"    {k}: {len(v)} records")

# ============================================================
# 辅助函数
# ============================================================
def get_f(record):
    return record.get('fields', {}) or {}

def safe_str(val, default=''):
    if val is None or val == '': return default
    if isinstance(val, (int, float)): return str(val)
    return str(val).strip()

def safe_num(val, default=0):
    if val is None or val == '': return default
    try: return float(val)
    except (ValueError, TypeError): return default

def safe_date(val, default=None):
    if val is None or val == '': return default
    s = str(val).strip().replace('/', '-')
    # SQLite DateTime expects ISO 8601; add time if missing
    if ' ' in s:
        s = s.replace(' ', 'T')
    if 'T' not in s:
        s = s + 'T00:00:00.000Z'
    elif not s.endswith('Z') and ('+' not in s and '-' not in s[-6:]):
        s = s + 'Z'
    return s

def resolve_cat(val, default=''):
    if val is None or val == '': return default
    if isinstance(val, list) and len(val) > 0:
        v = val[0]
        if isinstance(v, dict): return v.get('name', '') or v.get('title', '') or default
        return str(v)
    if isinstance(val, dict): return val.get('name', '') or val.get('title', '') or default
    return str(val)

def resolve_rel_id(val, default=''):
    if val is None or val == '': return default
    if isinstance(val, list) and len(val) > 0:
        v = val[0]
        if isinstance(v, dict): return str(v.get('item_id', ''))
        return str(v)
    if isinstance(val, dict): return str(val.get('item_id', ''))
    return str(val)

def resolve_rel_name(val, default=''):
    if val is None or val == '': return default
    if isinstance(val, list):
        names = []
        for v in val:
            if isinstance(v, dict):
                names.append(v.get('title', '') or v.get('name', ''))
            elif isinstance(v, str):
                names.append(v)
        return ', '.join(names) if names else default
    if isinstance(val, dict): return val.get('title', '') or val.get('name', '') or default
    return str(val)

# ============================================================
# [2/8] 预检：验证数据完整性
# ============================================================
print("\n[2/8] Pre-import validation...")

customers_raw = raw.get('客户信息', [])
contacts_raw = raw.get('客户联系人', [])
orders_raw = raw.get('订单', [])
order_items_raw = raw.get('订单明细', [])
payments_raw = raw.get('回款单', [])
followups_raw = raw.get('客户跟进', [])
invoices_raw = raw.get('开票申请', [])
deliveries_raw = raw.get('发货申请', [])
leads_raw = raw.get('销售线索', [])
opportunities_raw = raw.get('商机', [])
contract_entities_raw = raw.get('签约主体', [])

# 构建客户ID集合
customer_ids = {r['item_id'] for r in customers_raw}
# 构建订单ID集合
order_ids = {r['item_id'] for r in orders_raw}

# 检查订单的客户引用
orphan_orders = []
for r in orders_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588389950', ''))
    if cid and cid not in customer_ids:
        orphan_orders.append((r['item_id'], r.get('title', ''), cid))

# 检查回款的订单引用
orphan_payments = []
for r in payments_raw:
    f = get_f(r)
    oid = resolve_rel_id(f.get('2200000588390355', ''))
    if oid and oid not in order_ids:
        orphan_payments.append((r['item_id'], oid))

print(f"  Customers: {len(customers_raw)}")
print(f"  Orders: {len(orders_raw)} (orphan customer refs: {len(orphan_orders)})")
print(f"  Order items: {len(order_items_raw)}")
print(f"  Payments: {len(payments_raw)} (orphan order refs: {len(orphan_payments)})")
print(f"  Contacts: {len(contacts_raw)}")
print(f"  Followups: {len(followups_raw)}")
print(f"  Invoices: {len(invoices_raw)}")
print(f"  Deliveries: {len(deliveries_raw)}")
print(f"  Leads: {len(leads_raw)}")
print(f"  Opportunities: {len(opportunities_raw)}")
print(f"  Contract entities: {len(contract_entities_raw)}")

if orphan_orders:
    print(f"  WARNING: {len(orphan_orders)} orders reference non-existent customers!")
if orphan_payments:
    print(f"  NOTE: {len(orphan_payments)} payments reference non-existent orders (will set orderId=null)")

# ============================================================
# [3/8] 连接数据库并创建表
# ============================================================
print("\n[3/8] Connecting to SQLite database and creating tables...")
conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")
cursor = conn.cursor()

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  wecomUserId TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'SALES',
  department TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  lastLoginAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  customerCode TEXT UNIQUE,
  companyName TEXT NOT NULL,
  industry TEXT,
  industryOther TEXT,
  scale TEXT,
  address TEXT,
  addressDetail TEXT,
  companyPhone TEXT,
  website TEXT,
  creditCode TEXT,
  dunsNumber TEXT,
  status TEXT NOT NULL DEFAULT 'POTENTIAL',
  source TEXT,
  businessLine TEXT NOT NULL DEFAULT 'INDUSTRIAL',
  salesType TEXT NOT NULL DEFAULT 'INTERNAL',
  salesOwnerId TEXT,
  salesPerson TEXT,
  salesDept TEXT,
  followStage TEXT,
  level TEXT,
  taxTitle TEXT,
  taxNumber TEXT,
  invoiceType TEXT,
  bankName TEXT,
  bankAccount TEXT,
  bankCode TEXT,
  dealAmount REAL NOT NULL DEFAULT 0,
  dealCount INTEGER NOT NULL DEFAULT 0,
  paidAmount REAL NOT NULL DEFAULT 0,
  unpaidAmount REAL NOT NULL DEFAULT 0,
  assignedAt TEXT,
  lastFollowAt TEXT,
  nextFollowAt TEXT,
  overdueFollow INTEGER NOT NULL DEFAULT 0,
  transactedAt TEXT,
  remark TEXT,
  attachments TEXT,
  contractFile TEXT,
  huobanId TEXT UNIQUE,
  createdBy TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salesOwnerId) REFERENCES users(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'PRIMARY',
  phone TEXT,
  email TEXT,
  wechat TEXT,
  whatsapp TEXT,
  dept TEXT,
  isKeyPerson INTEGER NOT NULL DEFAULT 0,
  gender TEXT,
  contactType TEXT,
  remark TEXT,
  huobanId TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contract_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creditCode TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  orderCode TEXT UNIQUE,
  customerId TEXT NOT NULL,
  orderDate TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  businessLine TEXT NOT NULL DEFAULT 'INDUSTRIAL',
  salesPerson TEXT,
  salesOwnerId TEXT,
  salesType TEXT,
  contractEntity TEXT,
  productType TEXT,
  endUser TEXT,
  amount REAL NOT NULL DEFAULT 0,
  amountOriginal REAL,
  amountWithoutTax REAL,
  totalCost REAL,
  discount REAL NOT NULL DEFAULT 0,
  discountRate REAL,
  taxRate REAL DEFAULT 13,
  collectedAmount REAL NOT NULL DEFAULT 0,
  invoicedAmount REAL NOT NULL DEFAULT 0,
  grossMargin REAL,
  unpaidAmount REAL NOT NULL DEFAULT 0,
  expectedDeliveryDate TEXT,
  deliveryDate TEXT,
  receiver TEXT,
  receiverPhone TEXT,
  receiverAddress TEXT,
  approvalStatus TEXT,
  flowStatus TEXT,
  paymentMethod TEXT,
  notes TEXT,
  specialReq TEXT,
  techAgreement TEXT,
  contractFile TEXT,
  quotationId TEXT,
  opportunityId TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (salesOwnerId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  productId TEXT,
  productName TEXT,
  productNameEn TEXT,
  spec TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  unitPrice REAL NOT NULL DEFAULT 0,
  taxRate REAL DEFAULT 13,
  costPrice REAL,
  costTotal REAL,
  subtotal REAL NOT NULL DEFAULT 0,
  deviceCode TEXT,
  currency TEXT,
  exchangeRate REAL,
  huobanId TEXT,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  paymentCode TEXT,
  customerId TEXT NOT NULL,
  orderId TEXT,
  amount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'PROGRESS',
  status TEXT NOT NULL DEFAULT 'PENDING',
  plannedDate TEXT,
  receivedDate TEXT,
  paymentMethod TEXT,
  payerAccount TEXT,
  paymentRatio REAL,
  customerAccount TEXT,
  confirmedFinance TEXT,
  confirmedFinanceDate TEXT,
  invoiceConfirm TEXT,
  applicantId TEXT,
  flowStatus TEXT,
  applyDate TEXT,
  voucher TEXT,
  remark TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (applicantId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  userId TEXT,
  method TEXT NOT NULL DEFAULT 'OTHER',
  content TEXT NOT NULL,
  channel TEXT,
  operator TEXT,
  nextFollowUpAt TEXT,
  huobanId TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  orderId TEXT,
  customerId TEXT,
  salesPerson TEXT,
  amount REAL NOT NULL DEFAULT 0,
  ratio REAL,
  orderStatus TEXT,
  productType TEXT,
  invoiceType TEXT,
  contractEntityId TEXT,
  title TEXT,
  creditCode TEXT,
  companyAddress TEXT,
  companyPhone TEXT,
  bankName TEXT,
  bankAccount TEXT,
  bankCode TEXT,
  billingInfo TEXT,
  recipient TEXT,
  recipientPhone TEXT,
  detailAddress TEXT,
  invoiceNumber TEXT,
  invoiceFile TEXT,
  invoiceScan TEXT,
  approvalStatus TEXT,
  flowStatus TEXT,
  applyDate TEXT,
  remark TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  code TEXT,
  orderId TEXT,
  customerId TEXT,
  flowStatus TEXT,
  productType TEXT,
  paidAsContract TEXT,
  expectedPaymentDate TEXT,
  overdueReason TEXT,
  orderType TEXT,
  endCustomerName TEXT,
  deliveryDate TEXT,
  receiver TEXT,
  receiverPhone TEXT,
  shippingAddress TEXT,
  detailAddress TEXT,
  specialReq TEXT,
  applicant TEXT,
  applyDate TEXT,
  remark TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  code TEXT,
  customerName TEXT,
  contactName TEXT,
  phone TEXT,
  email TEXT,
  wechat TEXT,
  company TEXT,
  industry TEXT,
  scale TEXT,
  source TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assignedTo TEXT,
  assignedAt TEXT,
  lastFollowAt TEXT,
  nextFollowAt TEXT,
  followOverdue INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  invalidReason TEXT,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  customerId TEXT NOT NULL,
  productId TEXT,
  expectedAmount REAL NOT NULL DEFAULT 0,
  expectedCloseDate TEXT,
  stage TEXT NOT NULL DEFAULT 'INITIAL_CONTACT',
  winProbability REAL NOT NULL DEFAULT 0,
  description TEXT,
  salesOwnerId TEXT,
  code TEXT,
  collaborators TEXT,
  taxRate REAL DEFAULT 13,
  discount REAL DEFAULT 0,
  costTotal REAL DEFAULT 0,
  margin REAL DEFAULT 0,
  huobanId TEXT UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (salesOwnerId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  spec TEXT,
  category TEXT,
  unitPrice REAL NOT NULL DEFAULT 0,
  description TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quoteNumber TEXT NOT NULL UNIQUE,
  customerId TEXT NOT NULL,
  totalAmount REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  validUntil TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  createdById TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (createdById) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quoteId TEXT NOT NULL,
  productId TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unitPrice REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contractNumber TEXT NOT NULL UNIQUE,
  customerId TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  signedAt TEXT,
  expiresAt TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  filePath TEXT,
  notes TEXT,
  createdById TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (createdById) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sales_targets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'MONTHLY',
  year INTEGER NOT NULL,
  periodValue INTEGER NOT NULL,
  targetAmount REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'DAILY',
  title TEXT,
  periodStart TEXT NOT NULL,
  periodEnd TEXT NOT NULL,
  userId TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  generatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dealer_reports (
  id TEXT PRIMARY KEY,
  companyName TEXT NOT NULL,
  contactName TEXT,
  contactPhone TEXT,
  contactEmail TEXT,
  dealerName TEXT,
  dealerPhone TEXT,
  dealerEmail TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  duplicateOf TEXT,
  reviewedBy TEXT,
  reviewedAt TEXT,
  notes TEXT,
  rejectReason TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewedBy) REFERENCES users(id),
  FOREIGN KEY (duplicateOf) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS wecom_departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parentId TEXT,
  orderNo INTEGER NOT NULL DEFAULT 0,
  leaderId TEXT
);
"""

cursor.executescript(CREATE_TABLES_SQL)
conn.commit()
print("  Tables created/verified")

# ============================================================
# [4/8] 创建系统管理员用户
# ============================================================
print("\n[4/8] Creating system admin user...")
admin_id = 'system-admin-0001'
cursor.execute("""
    INSERT OR IGNORE INTO users (id, name, role, isActive, password, createdAt, updatedAt)
    VALUES (?, ?, 'ADMIN', 1, '', datetime('now'), datetime('now'))
""", (admin_id, '系统迁移管理员'))
conn.commit()
print(f"  Admin user: {admin_id}")

# ============================================================
# [5/8] 导入客户 (394)
# ============================================================
print("\n[5/8] Importing customers...")
success = 0
errors = 0
for r in customers_raw:
    f = get_f(r)
    biz_raw = resolve_cat(f.get('2200000588804593', ''))
    sales_type = 'EXTERNAL' if ('海外' in biz_raw or '外贸' in biz_raw or '外销' in biz_raw) else 'INTERNAL'
    biz_line = 'RETAIL' if sales_type == 'EXTERNAL' else 'INDUSTRIAL'
    
    addr_val = f.get('2200000588773433', '')
    addr_str = addr_val.get('address', '') if isinstance(addr_val, dict) else (str(addr_val) if addr_val else '')
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO customers (
                id, customerCode, companyName, industry, scale, address, website,
                creditCode, status, businessLine, salesType,
                salesPerson, salesDept, source, followStage, level,
                taxTitle, taxNumber, invoiceType, bankName, bankAccount, bankCode,
                companyPhone, remark,
                assignedAt, lastFollowAt, nextFollowAt, overdueFollow,
                huobanId, createdBy, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000588390512', '')) or None,
            safe_str(f.get('2200000588389895', '')) or '未命名',
            resolve_cat(f.get('2200000588423912', '')) or None,
            resolve_cat(f.get('2200000588423913', '')) or None,
            addr_str or None,
            safe_str(f.get('2200000588391023', '')) or None,
            safe_str(f.get('2200000588390097', '')) or None,
            'WON' if resolve_cat(f.get('2200000588390253', '')) == '成交' else 'POTENTIAL',
            biz_line, sales_type,
            resolve_rel_name(f.get('2200000588389905', '')) or None,
            resolve_rel_name(f.get('2200000588391176', '')) or None,
            resolve_rel_name(f.get('2200000588429367', '')) or None,
            resolve_cat(f.get('2200000588390253', '')) or None,
            'B',
            safe_str(f.get('2200000588390096', '')) or None,
            safe_str(f.get('2200000588390097', '')) or None,
            resolve_cat(f.get('2200000588390378', '')) or None,
            safe_str(f.get('2200000588390098', '')) or None,
            safe_str(f.get('2200000588390099', '')) or None,
            safe_str(f.get('2200000588430468', '')) or None,
            safe_str(f.get('2200000588390191', '')) or None,
            safe_str(f.get('2200000588389907', '')) or None,
            safe_date(f.get('2200000588390433', '')),
            safe_date(f.get('2200000588390394', '')),
            safe_date(f.get('2200000588390431', '')),
            1 if resolve_cat(f.get('2200000588391244', '')) == '超时未跟进' else 0,
            r['item_id'],
            admin_id,
            safe_date(f.get('2200000588389914', '')) or safe_date(r.get('created_on', '')) or now_iso(),
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3:
            print(f"  ERROR: {r['item_id']}: {e}")

conn.commit()
print(f"  Customers: {success} success, {errors} errors")

# ============================================================
# [6/8] 导入联系人 (538)
# ============================================================
print("\n[6/8] Importing contacts...")
success = 0
errors = 0
for r in contacts_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588389968', ''))
    if not cid or cid not in customer_ids:
        continue
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO contacts (
                id, customerId, name, title, dept, phone, email, wechat,
                isKeyPerson, gender, contactType, remark, huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        """, (
            r['item_id'], cid,
            safe_str(f.get('2200000588389967', '')) or '未知',
            safe_str(f.get('2200000588389969', '')) or None,
            safe_str(f.get('2200000588391223', '')) or None,
            safe_str(f.get('2200000588389970', '')) or None,
            safe_str(f.get('2200000588391222', '')) or None,
            safe_str(f.get('2200000588391221', '')) or None,
            1 if resolve_cat(f.get('2200000588389974', '')) == 'KP' else 0,
            'female' if '女' in resolve_cat(f.get('2200000588389972', '')) else 'male',
            resolve_cat(f.get('2200000588436249', '')) or None,
            safe_str(f.get('2200000588389975', '')) or None,
            r['item_id'],
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ERROR: {r['item_id']}: {e}")
conn.commit()
print(f"  Contacts: {success} success, {errors} errors")

# ============================================================
# 导入签约主体 (408)
# ============================================================
print("\n  Importing contract entities...")
success = 0
for r in contract_entities_raw:
    f = get_f(r)
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO contract_entities (id, name, creditCode, huobanId, createdAt, updatedAt)
            VALUES (?,?,?,?,datetime('now'),datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000604678195', '')) or resolve_rel_name(f.get('2200000604678195', '')) or '未命名',
            safe_str(f.get('2200000592429229', '')) or None,
            r['item_id'],
        ))
        success += 1
    except: pass
conn.commit()
print(f"  Contract entities: {success} success")

# ============================================================
# 导入订单 + 订单明细 (283 + 382)
# ============================================================
print("\n  Importing orders + items...")

# 先建订单明细索引
order_items_map = {}
for r in order_items_raw:
    f = get_f(r)
    oid = resolve_rel_id(f.get('2200000588390026', ''))
    if oid not in order_items_map:
        order_items_map[oid] = []
    order_items_map[oid].append({
        'id': r['item_id'],
        'productId': resolve_rel_id(f.get('2200000588622419', '')),
        'productName': resolve_rel_name(f.get('2200000588390027', '')),
        'spec': safe_str(f.get('2200000588622314', '')),
        'quantity': int(safe_num(f.get('2200000588390028', 1))),
        'unit': resolve_cat(f.get('2200000588622315', '')) or '台',
        'unitPrice': safe_num(f.get('2200000588390029', 0)),
        'taxRate': safe_num(f.get('2200000588622316', 13)),
        'subtotal': safe_num(f.get('2200000588622318', 0)),
        'huobanId': r['item_id'],
    })

order_success = 0
item_success = 0
errors = 0
for r in orders_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588389950', ''))
    if not cid:
        cid = list(customer_ids)[0]  # fallback
    
    biz_raw = resolve_cat(f.get('2200000588466384', ''))
    biz_line = 'RETAIL' if ('外贸' in biz_raw or '外销' in biz_raw or '出口' in biz_raw) else 'INDUSTRIAL'
    
    # 含税/未税金额
    amount_tax = safe_num(f.get('2200000588391249', 0))      # 销售订单金额（含税）
    amount_original = safe_num(f.get('2200000588390090', 0))  # 销售原价总额（含税）
    amount_no_tax = safe_num(f.get('2200000588391253', 0))    # 销售订单金额（未税）
    total_cost = safe_num(f.get('2200000588391255', 0))       # 产品成本总额
    tax_rate = safe_num(f.get('2200000588391245', 13))        # 增值税税率
    discount_rate = safe_num(f.get('2200000588391307', 0))    # 整单折扣率
    
    # 主金额：优先用含税合同金额，其次用原价含税
    amount = amount_tax if amount_tax > 0 else amount_original
    
    # 如果未税金额缺失，从含税推导
    if amount_no_tax == 0 and amount > 0 and tax_rate > 0:
        amount_no_tax = round(amount / (1 + tax_rate / 100), 2)
    
    order_status_raw = resolve_cat(f.get('2200000588466383', ''))
    if '已完成' in order_status_raw: order_status = 'COMPLETED'
    elif '未完成' in order_status_raw: order_status = 'IN_PRODUCTION'
    elif '已交货' in order_status_raw: order_status = 'DELIVERED'
    else: order_status = 'CONFIRMED'
    
    approval_raw = resolve_cat(f.get('2200000588390092', ''))
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO orders (
                id, orderCode, customerId, orderDate, status, businessLine,
                salesPerson, salesType, contractEntity, productType, endUser,
                amount, amountOriginal, amountWithoutTax, totalCost,
                discount, discountRate, taxRate,
                collectedAmount, invoicedAmount, unpaidAmount,
                expectedDeliveryDate, deliveryDate,
                receiver, receiverPhone, receiverAddress,
                approvalStatus, flowStatus,
                paymentMethod, specialReq,
                huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            r['item_id'],
            safe_str(f.get('2200000588389948', '')) or None,
            cid,
            safe_date(f.get('2200000588389888', '')) or safe_date(r.get('created_on', '')),
            order_status, biz_line,
            resolve_rel_name(f.get('2200000588390269', '')) or None,
            resolve_cat(f.get('2200000588466381', '')) or None,
            resolve_rel_name(f.get('2200000592437464', '')) or None,
            resolve_cat(f.get('2200000588466382', '')) or None,
            resolve_rel_name(f.get('2200000594607480', '')) or None,
            amount, amount_original if amount_original > 0 else None,
            amount_no_tax if amount_no_tax > 0 else None,
            total_cost if total_cost > 0 else None,
            safe_num(f.get('2200000588391248', 0)),
            discount_rate if discount_rate > 0 else None,
            tax_rate,
            safe_num(f.get('2200000588390104', 0)),
            safe_num(f.get('2200000588390106', 0)),
            max(0, amount - safe_num(f.get('2200000588390104', 0))),
            safe_date(f.get('2200000588391268', '')),
            safe_date(f.get('2200000588391268', '')),
            safe_str(f.get('2200000588391003', '')) or None,
            safe_str(f.get('2200000588391004', '')) or None,
            safe_str(f.get('2200000588391005', '')) or None,
            approval_raw or None,
            resolve_cat(f.get('2200000588390054', '')) or None,
            safe_str(f.get('2200000588466385', '')) or None,
            safe_str(f.get('2200000588389892', '')) or None,
            r['item_id'],
            safe_date(f.get('2200000588389888', '')) or safe_date(r.get('created_on', '')) or now_iso(),
            now_iso(),
        ))
        order_success += 1
        
        # 导入订单明细
        items = order_items_map.get(r['item_id'], [])
        for item in items:
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO order_items (
                        id, orderId, productId, productName, spec,
                        quantity, unit, unitPrice, taxRate, subtotal, huobanId
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    item['id'], r['item_id'],
                    item['productId'] or None,
                    item['productName'] or None,
                    item['spec'] or None,
                    item['quantity'], item['unit'],
                    item['unitPrice'], item['taxRate'],
                    item['subtotal'],
                    item['huobanId'],
                ))
                item_success += 1
            except Exception as e:
                if errors <= 3: print(f"  ITEM ERROR: {item['id']}: {e}")
                errors += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ORDER ERROR: {r['item_id']}: {e}")

conn.commit()
print(f"  Orders: {order_success} success, Items: {item_success} success, {errors} errors")

# ============================================================
# 导入回款 (458)
# ============================================================
print("\n  Importing payments...")
success = 0
errors = 0
for r in payments_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588390002', ''))
    oid = resolve_rel_id(f.get('2200000588390355', ''))
    if not cid: continue
    if oid and oid not in order_ids: oid = None  # 孤儿回款，置空订单ID
    
    confirm = resolve_cat(f.get('2200000588390263', ''))
    status = 'RECEIVED' if confirm == '回款确认' else 'PENDING'
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO payments (
                id, paymentCode, customerId, orderId, amount, type, status,
                plannedDate, receivedDate, paymentMethod, paymentRatio,
                confirmedFinance, confirmedFinanceDate, customerAccount,
                applyDate, remark, huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000588390103', '')) or None,
            cid, oid or None,
            safe_num(f.get('2200000588390005', 0)),
            'PROGRESS', status,
            safe_date(f.get('2200000588390001', '')),
            safe_date(f.get('2200000588391392', '')),
            resolve_cat(f.get('2200000588390003', '')) or None,
            safe_num(f.get('2200000599622553', 0)),
            'confirmed' if status == 'RECEIVED' else 'pending',
            safe_date(f.get('2200000588391392', '')),
            safe_str(f.get('2200000588390004', '')) or None,
            safe_date(f.get('2200000588633669', '')),
            safe_str(f.get('2200000588390261', '')) or None,
            r['item_id'],
            safe_date(f.get('2200000588633669', '')) or now_iso(),
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ERROR: {r['item_id']}: {e}")
conn.commit()
print(f"  Payments: {success} success, {errors} errors")

# ============================================================
# 导入客户跟进 (364)
# ============================================================
print("\n  Importing followups...")
success = 0
errors = 0
for r in followups_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588389941', ''))
    if not cid or cid not in customer_ids: continue
    
    channel = resolve_cat(f.get('2200000588389944', ''))
    type_map = {'电话': 'PHONE', '拜访': 'MEETING', '私/群聊': 'WECHAT', '邮件': 'EMAIL'}
    method = type_map.get(channel, 'OTHER')
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO follow_ups (
                id, customerId, userId, method, content, channel, operator,
                huobanId, createdAt
            ) VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            r['item_id'], cid, admin_id, method,
            safe_str(f.get('2200000588389947', '')) or '无内容',
            channel or None,
            resolve_rel_name(f.get('2200000588390262', '')) or None,
            r['item_id'],
            safe_date(f.get('2200000588389943', '')) or safe_date(r.get('created_on', '')) or now_iso(),
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ERROR: {r['item_id']}: {e}")
conn.commit()
print(f"  Followups: {success} success, {errors} errors")

# ============================================================
# 导入开票申请 (271) — 修正字段映射
# ============================================================
print("\n  Importing invoices (corrected field mapping)...")
success = 0
errors = 0
for r in invoices_raw:
    f = get_f(r)
    # 正确字段ID映射
    oid = resolve_rel_id(f.get('2200000588623776', ''))    # 订单信息 → orders
    cid = resolve_rel_id(f.get('2200000599323438', ''))    # 客户 → customers
    if oid and oid not in order_ids: oid = None
    if cid and cid not in customer_ids: cid = None
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO invoices (
                id, orderId, customerId, salesPerson,
                amount, ratio, orderStatus, productType, invoiceType,
                title, creditCode, companyAddress, companyPhone,
                bankName, bankAccount, bankCode, billingInfo,
                recipient, recipientPhone, detailAddress,
                invoiceNumber, invoiceScan,
                approvalStatus, flowStatus, applyDate, remark,
                huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'], oid or None, cid or None,
            resolve_rel_name(f.get('2200000588623778', '')) or None,
            safe_num(f.get('2200000588623532', 0)),         # 本次开票金额
            safe_num(f.get('2200000599623414', 0)) or None,  # 本次开票比例
            resolve_cat(f.get('2200000588623534', '')) or None,  # 订单状态
            resolve_cat(f.get('2200000588623535', '')) or None,  # 产品类型
            resolve_cat(f.get('2200000588623536', '')) or None,  # 发票类型
            safe_str(f.get('2200000588623537', '')) or None,     # 发票抬头
            safe_str(f.get('2200000588623538', '')) or None,     # 统一信用代码
            safe_str(f.get('2200000588623539', '')) or None,     # 公司地址
            safe_str(f.get('2200000588623540', '')) or None,     # 电话
            safe_str(f.get('2200000588623541', '')) or None,     # 开户银行
            safe_str(f.get('2200000588623542', '')) or None,     # 银行账号
            safe_str(f.get('2200000588623543', '')) or None,     # 银行行号
            safe_str(f.get('2200000588623544', '')) or None,     # 客户开票资料
            safe_str(f.get('2200000588623546', '')) or None,     # 收件人
            safe_str(f.get('2200000588623547', '')) or None,     # 联系电话
            safe_str(f.get('2200000588623551', '')) or None,     # 详细地址
            safe_str(f.get('2200000588623553', '')) or None,     # 发票号
            safe_str(f.get('2200000588623554', '')) or None,     # 发票扫描件
            resolve_cat(f.get('2200000588631340', '')) or None,  # 审批状态
            resolve_cat(f.get('2200000594599265', '')) or None,  # 流程状态
            safe_date(f.get('2200000588623556', '')),             # 申请时间
            safe_str(f.get('2200000588623552', '')) or None,     # 备注
            r['item_id'],
            safe_date(f.get('2200000588623556', '')) or now_iso(),
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ERROR: {r['item_id']}: {e}")
conn.commit()
print(f"  Invoices: {success} success, {errors} errors")

# ============================================================
# 导入发货申请 (239) — 修正字段映射
# ============================================================
print("\n  Importing deliveries (corrected field mapping)...")
success = 0
errors = 0
for r in deliveries_raw:
    f = get_f(r)
    oid = resolve_rel_id(f.get('2200000588637502', ''))    # 订单选择 → orders
    cid = resolve_rel_id(f.get('2200000597451757', ''))    # 终端客户 → customers
    if oid and oid not in order_ids: oid = None
    if cid and cid not in customer_ids: cid = None
    
    # 收货地址 (location 类型)
    addr_val = f.get('2200000597449210', '')
    addr_str = addr_val.get('address', '') if isinstance(addr_val, dict) else (str(addr_val) if addr_val else '')
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO deliveries (
                id, code, orderId, customerId,
                flowStatus, productType, paidAsContract,
                expectedPaymentDate, overdueReason, orderType,
                endCustomerName, deliveryDate,
                receiver, receiverPhone, shippingAddress, detailAddress,
                specialReq, applicant, applyDate, remark,
                huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000600409565', '')) or None,     # 编号
            oid or None, cid or None,
            resolve_cat(f.get('2200000588637454', '')) or None,  # 当前流程状态
            resolve_cat(f.get('2200000588637456', '')) or None,  # 产品类型
            resolve_cat(f.get('2200000588637457', '')) or None,  # 是否按照合同约定付款
            safe_date(f.get('2200000588637458', '')),             # 预计回款时间
            safe_str(f.get('2200000594598076', '')) or None,     # 逾期回款原因
            resolve_cat(f.get('2200000588637459', '')) or None,  # 订单类型(直销/间销)
            safe_str(f.get('2200000588637460', '')) or None,     # 终端客户全称1
            safe_date(f.get('2200000588637461', '')),             # 发货时间
            safe_str(f.get('2200000588637462', '')) or None,     # 收货人
            safe_str(f.get('2200000588637463', '')) or None,     # 联系方式
            addr_str or None,                                     # 收货地址
            safe_str(f.get('2200000588637467', '')) or None,     # 详细地址
            safe_str(f.get('2200000588637468', '')) or None,     # 其他特殊要求
            resolve_rel_name(f.get('2200000588637506', '')) or None,  # 申请人
            safe_date(f.get('2200000588637470', '')),             # 申请时间
            None,
            r['item_id'],
            safe_date(f.get('2200000588637470', '')) or now_iso(),
        ))
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 3: print(f"  ERROR: {r['item_id']}: {e}")
conn.commit()
print(f"  Deliveries: {success} success, {errors} errors")

# ============================================================
# 导入销售线索 (2)
# ============================================================
print("\n  Importing leads...")
success = 0
for r in leads_raw:
    f = get_f(r)
    status_raw = resolve_cat(f.get('2200000588391216', ''))
    status_map = {'待分配': 'PENDING', '已分配': 'ASSIGNED', '无效': 'INVALID', '已转化': 'CONVERTED'}
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO leads (
                id, code, customerName, contactName, phone, email,
                company, industry, source, region, status,
                assignedTo, assignedAt, createdAt, huobanId, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000589391379', '')) or None,
            safe_str(f.get('2200000588390022', '')) or None,
            safe_str(f.get('2200000588390022', '')) or None,
            safe_str(f.get('2200000588390213', '')) or None,
            None,
            safe_str(f.get('2200000588390022', '')) or None,
            resolve_rel_name(f.get('2200000588390122', '')) or None,
            resolve_rel_name(f.get('2200000588391084', '')) or None,
            '国内',
            status_map.get(status_raw, 'PENDING'),
            resolve_rel_name(f.get('2200000588390251', '')) or None,
            safe_date(f.get('2200000588390092', '')),
            safe_date(r.get('created_on', '')) or now_iso(),
            r['item_id'],
        ))
        success += 1
    except: pass
conn.commit()
print(f"  Leads: {success} success")

# ============================================================
# 导入商机 (1)
# ============================================================
print("\n  Importing opportunities...")
success = 0
for r in opportunities_raw:
    f = get_f(r)
    cid = resolve_rel_id(f.get('2200000588389960', ''))
    if not cid or cid not in customer_ids: continue
    stage_raw = resolve_cat(f.get('2200000588389958', ''))
    stage_map = {'初步交流': 'INITIAL_CONTACT', '需求确认': 'REQUIREMENT_CONFIRMED',
                 '报价中': 'QUOTING', '合同谈判': 'CONTRACT_NEGOTIATION', '已成交': 'WON'}
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO opportunities (
                id, name, customerId, expectedAmount, expectedCloseDate,
                stage, winProbability, salesOwnerId, code,
                taxRate, discount, costTotal, margin, huobanId, createdAt, updatedAt
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
        """, (
            r['item_id'],
            safe_str(f.get('2200000588389985', '')) or '未命名商机',
            cid,
            safe_num(f.get('2200000588391316', 0)),
            safe_date(f.get('2200000588389964', '')),
            stage_map.get(stage_raw, 'INITIAL_CONTACT'),
            safe_num(f.get('2200000588390395', 0)),
            admin_id,
            safe_str(f.get('2200000588391316', '')) or None,
            13, 0, 0, 0,
            r['item_id'],
            safe_date(f.get('2200000588389961', '')) or safe_date(r.get('created_on', '')) or now_iso(),
        ))
        success += 1
    except: pass
conn.commit()
print(f"  Opportunities: {success} success")

# ============================================================
# [7/8] 导入后审计
# ============================================================
print("\n[7/8] Post-import audit...")
print("-" * 60)

tables = [
    ('users', '用户'),
    ('customers', '客户'),
    ('contacts', '联系人'),
    ('contract_entities', '签约主体'),
    ('orders', '订单'),
    ('order_items', '订单明细'),
    ('payments', '回款'),
    ('follow_ups', '客户跟进'),
    ('invoices', '开票申请'),
    ('deliveries', '发货申请'),
    ('leads', '销售线索'),
    ('opportunities', '商机'),
]

print(f"{'表名':<20} {'记录数':>8}")
print("-" * 30)
total = 0
for table, label in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    total += count
    flag = ' OK' if count > 0 else ' !!'
    print(f"  {label:<18} {count:>8}{flag}")
print("-" * 30)
print(f"  {'合计':<18} {total:>8}")

# 金额校验
print("\n--- 金额校验 ---")
cursor.execute("SELECT COUNT(*) FROM orders WHERE amount > 0")
orders_with_amount = cursor.fetchone()[0]
cursor.execute("SELECT SUM(amount) FROM orders")
total_amount = cursor.fetchone()[0] or 0
cursor.execute("SELECT SUM(amountWithoutTax) FROM orders WHERE amountWithoutTax IS NOT NULL")
total_no_tax = cursor.fetchone()[0] or 0
cursor.execute("SELECT SUM(collectedAmount) FROM orders")
total_collected = cursor.fetchone()[0] or 0
cursor.execute("SELECT SUM(amount) FROM payments")
total_payments = cursor.fetchone()[0] or 0

print(f"  订单含税总额:   Y{total_amount:,.2f}")
print(f"  订单未税总额:   Y{total_no_tax:,.2f}")
print(f"  已回款总额:     Y{total_collected:,.2f}")
print(f"  回款单总额:     Y{total_payments:,.2f}")
print(f"  回款率:         {total_collected/total_amount*100:.1f}%" if total_amount else "")

# 内销/外销校验
print("\n--- 内销/外销校验 ---")
cursor.execute("SELECT businessLine, COUNT(*) FROM customers GROUP BY businessLine")
for bl, cnt in cursor.fetchall():
    label = '内销' if bl == 'INDUSTRIAL' else '外销'
    print(f"  客户 {label}({bl}): {cnt}")
cursor.execute("SELECT businessLine, COUNT(*), SUM(amount) FROM orders GROUP BY businessLine")
for bl, cnt, amt in cursor.fetchall():
    label = '内销' if bl == 'INDUSTRIAL' else '外销'
    print(f"  订单 {label}({bl}): {cnt}笔, Y{amt:,.2f}")

# 外键完整性校验
print("\n--- 外键完整性 ---")
cursor.execute("SELECT COUNT(*) FROM orders WHERE customerId NOT IN (SELECT id FROM customers)")
orphan = cursor.fetchone()[0]
print(f"  孤儿订单(客户不存在): {orphan} {'OK' if orphan == 0 else '!!'}")
cursor.execute("SELECT COUNT(*) FROM payments WHERE orderId IS NOT NULL AND orderId NOT IN (SELECT id FROM orders)")
orphan = cursor.fetchone()[0]
print(f"  孤儿回款(订单不存在): {orphan} {'OK' if orphan == 0 else '!!'}")
cursor.execute("SELECT COUNT(*) FROM contacts WHERE customerId NOT IN (SELECT id FROM customers)")
orphan = cursor.fetchone()[0]
print(f"  孤儿联系人(客户不存在): {orphan} {'OK' if orphan == 0 else '!!'}")

# ============================================================
# [8/8] 完成
# ============================================================
print("\n[8/8] Migration complete!")
print(f"Database: {DB_PATH}")
print(f"Total records imported: {total}")

conn.close()
