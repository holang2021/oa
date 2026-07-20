#!/usr/bin/env python3
"""
伙伴云导出数据 → HOLANG CRM 数据转换脚本
输入：huoban_data/export_20260626_122608/00_schema.json + 01_data.json
输出：holang-crm 可用 JSON 数据文件
"""

import json
import os
import sys
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE, 'huoban_data', 'export_20260626_122608', '00_schema.json')
DATA_PATH = os.path.join(BASE, 'huoban_data', 'export_20260626_122608', '01_data.json')
OUTPUT_DIR = os.path.join(BASE, 'huoban_data', 'crm_output')

# ============================================================
# 1. 加载数据
# ============================================================
print("Loading schema...")
with open(SCHEMA_PATH, encoding='utf-8') as f:
    schema_raw = json.load(f)

print("Loading data...")
with open(DATA_PATH, encoding='utf-8') as f:
    data_raw = json.load(f)

# ============================================================
# 2. 构建 field_id → field_name 映射
# ============================================================
field_map = {}  # (table_id, field_id) → field_name
table_id_to_name = {}  # table_id → table_name
table_name_to_id = {}  # table_name → table_id

for table_name, table_info in schema_raw.items():
    tid = table_info.get('table_id', '')
    table_id_to_name[tid] = table_name
    table_name_to_id[table_name] = tid
    for f in table_info.get('fields', []):
        field_map[(tid, f['field_id'])] = f['name']

print(f"Loaded {len(table_id_to_name)} tables, {len(field_map)} field mappings")

# ============================================================
# 3. 构建查找索引（用于解析 relation 字段）
# ============================================================
# item_id → {title: ..., fields: {...}}
item_index = {}
for table_name, records in data_raw.items():
    for r in records:
        key = r['item_id']
        item_index[key] = {
            'table': table_name,
            'title': r.get('title', ''),
            'fields': r.get('fields', {})
        }

print(f"Built item index: {len(item_index)} items")

# ============================================================
# 4. 辅助函数
# ============================================================
def get_fields(record):
    """获取记录的字段 dict"""
    return record.get('fields', {})

def safe_str(val, default=''):
    """安全取字符串"""
    if val is None or val == '':
        return default
    if isinstance(val, (int, float)):
        return str(val)
    return str(val).strip()

def safe_num(val, default=0):
    """安全取数字"""
    if val is None or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_date(val, default=''):
    """安全取日期，统一转 ISO 格式"""
    if val is None or val == '':
        return default
    s = str(val).strip()
    # 伙伴云日期格式可能是 '2024-01-15' 或 '2024/01/15'
    return s.replace('/', '-')

def resolve_relation(val):
    """解析 relation 字段：list of {item_id, title} → 逗号分隔的名称"""
    if val is None or val == '':
        return ''
    if isinstance(val, list):
        names = []
        for v in val:
            if isinstance(v, dict):
                title = v.get('title', '') or v.get('name', '')
                if title:
                    names.append(title)
                else:
                    iid = str(v.get('item_id', ''))
                    names.append(item_index.get(iid, {}).get('title', iid) if isinstance(item_index.get(iid), dict) else str(item_index.get(iid, iid)))
            elif isinstance(v, str):
                names.append(item_index.get(v, {}).get('title', v) if isinstance(item_index.get(v), dict) else str(item_index.get(v, v)))
            else:
                names.append(str(v))
        return ', '.join(names)
    if isinstance(val, dict):
        return val.get('title', '') or val.get('name', '') or str(val.get('item_id', ''))
    return str(val)

def resolve_relation_id(val):
    """解析 relation 字段，返回首个 item_id 字符串"""
    if val is None or val == '':
        return ''
    if isinstance(val, list) and len(val) > 0:
        v = val[0]
        if isinstance(v, dict):
            return str(v.get('item_id', ''))
        return str(v)
    if isinstance(val, dict):
        return str(val.get('item_id', ''))
    return str(val)

def resolve_user(val):
    """解析 user 类型字段 → name"""
    if val is None or val == '':
        return ''
    if isinstance(val, list):
        names = []
        for v in val:
            if isinstance(v, dict):
                names.append(v.get('name', '') or v.get('title', ''))
            else:
                names.append(str(v))
        return ', '.join(names)
    if isinstance(val, dict):
        return val.get('name', '') or val.get('title', '') or ''
    return str(val) if val else ''

def resolve_category(val):
    """解析 category 类型字段：list of {id, name} → name 字符串"""
    if val is None or val == '':
        return ''
    if isinstance(val, list) and len(val) > 0:
        v = val[0]
        if isinstance(v, dict):
            return v.get('name', '') or v.get('title', '') or str(v.get('id', ''))
        return str(v)
    if isinstance(val, dict):
        return val.get('name', '') or val.get('title', '') or ''
    return str(val)

# ============================================================
# 5. 核心表转换
# ============================================================

def convert_employees(records):
    """员工档案 → 姓名/UserID 映射表"""
    employees = {}
    for r in records:
        f = get_fields(r)
        name = safe_str(f.get('2200000588389925', ''))  # 员工姓名
        uid = resolve_user(f.get('2200000588389926', ''))  # 员工账号(user)
        if name and uid:
            employees[uid] = name
        employees[r['item_id']] = name  # 也存 item_id 映射
    return employees

def convert_customers(records):
    """客户信息 → Customer[]"""
    result = []
    for r in records:
        f = get_fields(r)
        biz_line_raw = resolve_category(f.get('2200000588804593', ''))
        sales_type = 'internal'
        if '海外' in biz_line_raw or '外贸' in biz_line_raw or '外销' in biz_line_raw:
            sales_type = 'external'
        
        stage_raw = resolve_category(f.get('2200000588390253', ''))
        
        # 补充联系人信息（从联系人表首个主要联系人）
        # 处理地址：location 类型可能是 dict
        addr_val = f.get('2200000588773433', '')
        addr_str = addr_val.get('address', '') if isinstance(addr_val, dict) else str(addr_val) if addr_val else ''
        
        result.append({
            'id': str(r['item_id']),
            'name': safe_str(f.get('2200000588389895', '')),  # 客户名称
            'code': safe_str(f.get('2200000588390512', '')),  # 编号
            'industry': resolve_category(f.get('2200000588423912', '')),  # 所属行业
            'scale': resolve_category(f.get('2200000588423913', '')),  # 公司规模
            'level': 'B',
            'address': addr_str,
            'website': safe_str(f.get('2200000588391023', '')),
            'contactName': '',
            'contactPhone': '',
            'contactEmail': '',
            'contactWechat': '',
            'contactWhatsapp': '',
            'contactDept': '',
            'contactTitle': '',
            'taxTitle': safe_str(f.get('2200000588390096', '')),
            'taxNumber': safe_str(f.get('2200000588390097', '')),
            'bankName': safe_str(f.get('2200000588390098', '')),
            'bankAccount': safe_str(f.get('2200000588390099', '')),
            'salesPerson': resolve_relation(f.get('2200000588389905', '')),
            'salesDept': resolve_relation(f.get('2200000588391176', '')),
            'source': resolve_relation(f.get('2200000588429367', '')),
            'followStage': stage_raw,
            'createdAt': safe_date(f.get('2200000588389914', '')) or safe_date(r.get('created_on', '')),
            'businessLine': 'industrial' if sales_type == 'internal' else 'retail',
            'salesType': sales_type,
            'creditCode': safe_str(f.get('2200000588390097', '')),
            'dunsNumber': '',
            'companyPhone': safe_str(f.get('2200000588390191', '')),
            'remark': safe_str(f.get('2200000588389907', '')),
            'invoiceType': resolve_category(f.get('2200000588390378', '')),
            'bankCode': safe_str(f.get('2200000588430468', '')),
            'assignedAt': safe_date(f.get('2200000588390433', '')),
            'lastFollowAt': safe_date(f.get('2200000588390394', '')),
            'nextFollowAt': safe_date(f.get('2200000588390431', '')),
            'overdueFollow': resolve_category(f.get('2200000588391244', '')) == '超时未跟进',
            'transactedAt': '',
            'contractFile': '',
            'huobanId': str(r['item_id']),
        })
    return result

def convert_contacts(records):
    """客户联系人 → Contact[]"""
    result = []
    for r in records:
        f = get_fields(r)
        customer_id = resolve_relation_id(f.get('2200000588389968', ''))
        contact_type = resolve_category(f.get('2200000588436249', ''))
        gender_raw = resolve_category(f.get('2200000588389972', ''))
        gender = 'male'
        if '女' in gender_raw:
            gender = 'female'
        
        is_kp = resolve_category(f.get('2200000588389974', '')) == 'KP'
        
        result.append({
            'id': str(r['item_id']),
            'customerId': customer_id,
            'name': safe_str(f.get('2200000588389967', '')),
            'title': safe_str(f.get('2200000588389969', '')),  # 联系人职务
            'dept': safe_str(f.get('2200000588391223', '')),  # 部门
            'phone': safe_str(f.get('2200000588389970', '')),
            'email': safe_str(f.get('2200000588391222', '')),  # 邮箱
            'wechat': safe_str(f.get('2200000588391221', '')),  # 微信号
            'whatsapp': '',
            'isPrimary': '主要联系人' in contact_type,
            'gender': gender,
            'remark': safe_str(f.get('2200000588389975', '')),
            'contactType': contact_type,
            'isKP': is_kp,
            'huobanId': str(r['item_id']),
        })
    return result

def convert_leads(records):
    """销售线索 → Lead[]"""
    result = []
    for r in records:
        f = get_fields(r)
        status_map = {'待分配': '未联系', '已分配': '跟进中', '无效': '无效', '已转化': '转客户'}
        status_raw = resolve_category(f.get('2200000588391216', ''))
        status = status_map.get(status_raw, status_raw) if status_raw else '未联系'
        
        result.append({
            'id': str(r['item_id']),
            'code': safe_str(f.get('2200000589391379', '')),
            'status': status,
            'customerName': safe_str(f.get('2200000588390022', '')),
            'contactName': safe_str(f.get('2200000588390022', '')),
            'phone': safe_str(f.get('2200000588390213', '')),
            'email': safe_str(f.get('2200000589377297', '')),
            'wechat': '',
            'company': safe_str(f.get('2200000588390022', '')),
            'industry': resolve_relation(f.get('2200000588390122', '')),
            'scale': '',
            'source': resolve_relation(f.get('2200000588391084', '')),
            'region': '国内',
            'assignedTo': resolve_relation(f.get('2200000588390251', '')),
            'assignedAt': safe_date(f.get('2200000588390092', '')),
            'lastFollowAt': '',
            'nextFollowAt': '',
            'followOverdue': False,
            'remark': '',
            'invalidReason': '',
            'createdAt': safe_date(r.get('created_on', '')),
            'huobanId': str(r['item_id']),
        })
    return result

def convert_opportunities(records):
    """商机 → Opportunity[]"""
    result = []
    for r in records:
        f = get_fields(r)
        result.append({
            'id': str(r['item_id']),
            'customerId': resolve_relation_id(f.get('2200000588389960', '')),
            'name': safe_str(f.get('2200000588389985', '')),
            'stage': resolve_category(f.get('2200000588389958', '')),
            'amount': safe_num(f.get('2200000588391316', 0)),
            'expectedCloseDate': safe_date(f.get('2200000588389964', '')),
            'salesPerson': resolve_relation(f.get('2200000588390401', '')),
            'probability': safe_num(f.get('2200000588390395', 0)),
            'products': [],
            'createdAt': safe_date(f.get('2200000588389961', '')) or safe_date(r.get('created_on', '')),
            'code': safe_str(f.get('2200000588391316', '')),
            'acquiredAt': '',
            'milestone': '',
            'loseReason': '',
            'collaborators': [],
            'taxRate': 13,
            'discount': 0,
            'costTotal': 0,
            'margin': 0,
            'huobanId': str(r['item_id']),
        })
    return result

def convert_orders(records):
    """订单 → Order[]"""
    result = []
    for r in records:
        f = get_fields(r)
        biz_line_raw = resolve_category(f.get('2200000588466384', ''))  # 销售类别
        business_line = 'industrial'
        if '外贸' in biz_line_raw or '外销' in biz_line_raw or '出口' in biz_line_raw:
            business_line = 'retail'
        
        approval_raw = resolve_category(f.get('2200000588390092', ''))  # 审批状态
        status_map = {'待审批': 'pending', '审批中': 'confirmed', '已通过': 'confirmed', '已驳回': 'cancelled'}
        order_status_raw = resolve_category(f.get('2200000588466383', ''))
        order_status = 'confirmed'
        if '未完成' in order_status_raw:
            order_status = 'in_production'
        elif '已完成' in order_status_raw:
            order_status = 'delivered'
        
        amount = safe_num(f.get('2200000588390090', 0)) or safe_num(f.get('2200000588391249', 0))
        
        result.append({
            'id': str(r['item_id']),
            'customerId': resolve_relation_id(f.get('2200000588389950', '')),
            'quotationId': resolve_relation_id(f.get('2200000588390407', '')),
            'code': safe_str(f.get('2200000588389948', '')),
            'amount': amount,
            'status': order_status,
            'salesPerson': resolve_relation(f.get('2200000588390269', '')),
            'createdAt': safe_date(f.get('2200000588389888', '')) or safe_date(r.get('created_on', '')),
            'deliveryDate': safe_date(f.get('2200000588391268', '')),
            'businessLine': business_line,
            'approvalStatus': approval_raw,
            'flowStatus': resolve_category(f.get('2200000588390054', '')),
            'expectedDeliveryDate': safe_date(f.get('2200000588391268', '')),
            'contractEntity': resolve_relation(f.get('2200000592437464', '')),
            'salesType': resolve_category(f.get('2200000588466381', '')),
            'endUser': resolve_relation(f.get('2200000594607480', '')),
            'productType': resolve_category(f.get('2200000588466382', '')),
            'paymentMethod': safe_str(f.get('2200000588466385', '')),
            'receiver': safe_str(f.get('2200000588391003', '')),
            'receiverPhone': safe_str(f.get('2200000588391004', '')),
            'receiverAddress': safe_str(f.get('2200000588391005', '')),
            'contractFile': '',
            'techAgreement': '',
            'specialReq': safe_str(f.get('2200000588389892', '')),
            'collectedAmount': safe_num(f.get('2200000588390104', 0)),
            'invoicedAmount': safe_num(f.get('2200000588390106', 0)),
            'taxRate': safe_num(f.get('2200000588391245', 13)),
            'discount': safe_num(f.get('2200000588391248', 0)),
            'items': [],
            'huobanId': str(r['item_id']),
        })
    return result

def convert_order_items(records):
    """订单明细 → order items by order_id"""
    result = {}
    for r in records:
        f = get_fields(r)
        order_id = resolve_relation_id(f.get('2200000588390026', ''))
        item = {
            'id': str(r['item_id']),
            'productId': resolve_relation_id(f.get('2200000588622419', '')),
            'productName': resolve_relation(f.get('2200000588390027', '')),
            'productNameEn': '',
            'spec': safe_str(f.get('2200000588622314', '')),
            'quantity': int(safe_num(f.get('2200000588390028', 1))),
            'unit': resolve_category(f.get('2200000588622315', '')) or '台',
            'unitPrice': safe_num(f.get('2200000588390029', 0)),
            'taxRate': safe_num(f.get('2200000588622316', 13)),
            'subtotal': safe_num(f.get('2200000588622318', 0)),
        }
        if order_id not in result:
            result[order_id] = []
        result[order_id].append(item)
    return result

def convert_payments(records):
    """回款单 → Payment[]"""
    result = []
    for r in records:
        f = get_fields(r)
        confirm_status = resolve_category(f.get('2200000588390263', ''))  # 财务确认回款
        status = 'received' if confirm_status == '回款确认' else 'pending'
        
        result.append({
            'id': str(r['item_id']),
            'customerId': resolve_relation_id(f.get('2200000588390002', '')),
            'orderId': resolve_relation_id(f.get('2200000588390355', '')),
            'code': safe_str(f.get('2200000588390103', '')),
            'amount': safe_num(f.get('2200000588390005', 0)),
            'type': 'progress',
            'status': status,
            'plannedDate': safe_date(f.get('2200000588390001', '')),  # 回款日期
            'receivedDate': safe_date(f.get('2200000588391392', '')),  # 财务确认日期
            'paymentMethod': resolve_category(f.get('2200000588390003', '')),  # 回款方式
            'confirmedFinance': 'confirmed' if status == 'received' else 'pending',
            'confirmedFinanceDate': safe_date(f.get('2200000588391392', '')),
            'paymentVoucher': '',
            'paymentRatio': safe_num(f.get('2200000599622553', 0)),
            'customerAccount': safe_str(f.get('2200000588390004', '')),
            'applyDate': safe_date(f.get('2200000588633669', '')),
            'remark': safe_str(f.get('2200000588390261', '')),
            'huobanId': str(r['item_id']),
        })
    return result

def convert_followups(records):
    """客户跟进 → TimelineEvent[]"""
    result = []
    for r in records:
        f = get_fields(r)
        channel_raw = resolve_category(f.get('2200000588389944', ''))  # 沟通方式
        type_map = {'电话': 'call', '拜访': 'visit', '私/群聊': 'social', '邮件': 'email', '线上': 'website'}
        event_type = type_map.get(channel_raw, 'note')
        
        result.append({
            'id': str(r['item_id']),
            'customerId': resolve_relation_id(f.get('2200000588389941', '')),
            'type': event_type,
            'channel': channel_raw,
            'content': safe_str(f.get('2200000588389947', '')),  # 本次跟进内容
            'operator': resolve_relation(f.get('2200000588390262', '')),  # 跟进人
            'createdAt': safe_date(f.get('2200000588389943', '')) or safe_date(r.get('created_on', '')),
            'huobanId': str(r['item_id']),
        })
    return result

def convert_invoices(records):
    """开票申请 → Invoice[]"""
    result = []
    for r in records:
        f = get_fields(r)
        status_raw = resolve_category(f.get('2200000588623778', ''))
        status_map = {'待审批': 'pending', '已审批': 'issued', '已开票': 'issued', '已驳回': 'rejected'}
        status = status_map.get(status_raw, 'pending')
        
        result.append({
            'id': str(r['item_id']),
            'orderId': resolve_relation_id(f.get('2200000588631340', '')),
            'customerId': resolve_relation_id(f.get('2200000588623556', '')),
            'salesPerson': '',
            'amount': safe_num(f.get('2200000588623776', 0)),
            'ratio': safe_num(f.get('2200000588623532', 0)),
            'orderStatus': 'completed',
            'type': resolve_category(f.get('2200000599623414', '')) or '增值税专用发票',
            'contractEntity': resolve_relation(f.get('2200000588623534', '')),
            'title': safe_str(f.get('2200000588623535', '')),
            'taxNumber': safe_str(f.get('2200000588623536', '')),
            'companyAddress': safe_str(f.get('2200000588623537', '')),
            'companyPhone': safe_str(f.get('2200000588623538', '')),
            'bankName': safe_str(f.get('2200000588623539', '')),
            'bankAccount': safe_str(f.get('2200000588623540', '')),
            'recipient': safe_str(f.get('2200000588623541', '')),
            'recipientPhone': safe_str(f.get('2200000588623542', '')),
            'recipientAddress': safe_str(f.get('2200000588623543', '')),
            'invoiceNumber': safe_str(f.get('2200000588623544', '')),
            'invoiceFile': '',
            'invoiceScan': '',
            'approvalStatus': status,
            'notes': safe_str(f.get('2200000588623546', '')),
            'huobanId': str(r['item_id']),
        })
    return result

def convert_deliveries(records):
    """发货申请 → Delivery[]"""
    result = []
    for r in records:
        f = get_fields(r)
        status_raw = resolve_category(f.get('2200000600409565', ''))
        status_map = {'待审批': 'pending', '已审批': 'approved', '已取消': 'cancelled', '已驳回': 'rejected'}
        status = status_map.get(status_raw, 'pending')
        
        result.append({
            'id': str(r['item_id']),
            'orderId': resolve_relation_id(f.get('2200000588637454', '')),
            'customerId': resolve_relation_id(f.get('2200000588637455', '')),
            'customerName': resolve_relation(f.get('2200000588637502', '')),
            'salesType': 'direct',
            'businessLine': 'domestic',
            'productType': 'finished',
            'paidAsContract': 'yes',
            'expectedPaymentDate': safe_date(f.get('2200000588637458', '')),
            'overdueReason': '',
            'deliveryDate': safe_date(f.get('2200000588637456', '')),
            'contactPerson': safe_str(f.get('2200000588637459', '')),
            'contactPhone': safe_str(f.get('2200000594598076', '')),
            'shippingAddress': safe_str(f.get('2200000588637460', '')),
            'shippingMethod': safe_str(f.get('2200000588637461', '')),
            'specialReq': safe_str(f.get('2200000588637462', '')),
            'approvalStatus': status,
            'flowStatus': safe_str(f.get('2200000588637463', '')),
            'notes': '',
            'huobanId': str(r['item_id']),
        })
    return result

# ============================================================
# 6. 执行转换
# ============================================================
print("\n=== Converting ===")

# 员工档案（用于后续关联解析）
employees = convert_employees(data_raw.get('员工档案', []))
print(f"  Employees: {len(employees)} entries")

# 先更新 item_index 让 resolve_relation 能解析员工姓名
for uid, name in employees.items():
    if uid not in item_index:
        item_index[uid] = {'table': '员工档案', 'title': name, 'fields': {}}

customers = convert_customers(data_raw.get('客户信息', []))
print(f"  Customers: {len(customers)}")

contacts = convert_contacts(data_raw.get('客户联系人', []))
print(f"  Contacts: {len(contacts)}")

leads = convert_leads(data_raw.get('销售线索', []))
print(f"  Leads: {len(leads)}")

opportunities = convert_opportunities(data_raw.get('商机', []))
print(f"  Opportunities: {len(opportunities)}")

orders = convert_orders(data_raw.get('订单', []))
print(f"  Orders: {len(orders)}")

order_items_map = convert_order_items(data_raw.get('订单明细', []))
# 关联 order_items 到对应订单
for order in orders:
    oid = order['id']
    order['items'] = order_items_map.get(oid, [])
print(f"  Order items: {sum(len(v) for v in order_items_map.values())} items across {len(order_items_map)} orders")

payments = convert_payments(data_raw.get('回款单', []))
print(f"  Payments: {len(payments)}")

followups = convert_followups(data_raw.get('客户跟进', []))
print(f"  Followups: {len(followups)}")

invoices = convert_invoices(data_raw.get('开票申请', []))
print(f"  Invoices: {len(invoices)}")

deliveries = convert_deliveries(data_raw.get('发货申请', []))
print(f"  Deliveries: {len(deliveries)}")

# 签约主体（辅助数据）
contract_entities_raw = data_raw.get('签约主体', [])
contract_entities = []
for r in contract_entities_raw:
    f = get_fields(r)
    contract_entities.append({
        'id': str(r['item_id']),
        'name': safe_str(f.get('2200000604678195', '')),
        'creditCode': safe_str(f.get('2200000592429229', '')),
    })
print(f"  Contract entities: {len(contract_entities)}")

# ============================================================
# 7. 输出
# ============================================================
os.makedirs(OUTPUT_DIR, exist_ok=True)

outputs = {
    'customers.json': customers,
    'contacts.json': contacts,
    'leads.json': leads,
    'opportunities.json': opportunities,
    'orders.json': orders,
    'payments.json': payments,
    'followups.json': followups,
    'invoices.json': invoices,
    'deliveries.json': deliveries,
    'contract_entities.json': contract_entities,
    'employees.json': [{'id': k, 'name': v} for k, v in employees.items() if not k.startswith('210')],
}

for fname, data in outputs.items():
    path = os.path.join(OUTPUT_DIR, fname)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    size_kb = os.path.getsize(path) / 1024
    print(f"  Output: {fname} ({len(data)} records, {size_kb:.1f} KB)")

# 输出汇总信息
print(f"\n=== DONE ===")
print(f"Output directory: {OUTPUT_DIR}")
print(f"Total records: {sum(len(d) for d in outputs.values())}")
