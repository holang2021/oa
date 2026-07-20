# HOLANG CRM 数据库设计说明

**SQL 文件**：`holang-crm/holang_crm_schema.sql`

---

## 表结构总览（17 张表）

| # | 表名 | 用途 | 伙伴云来源 |
|---|--------|------|------------|
| 1 | `industries` | 所属行业枚举 | 所属行业 |
| 2 | `departments` | 部门枚举 | 部门 |
| 3 | `roles` | 岗位/角色枚举 | 岗位 |
| 4 | `channels` | 渠道来源枚举 | 渠道来源 |
| 5 | `sources` | 客户来源枚举 | 客户来源 |
| 6 | `contract_entities` | 签约主体 | 签约主体 |
| 7 | `exchange_rates` | 汇率配置 | 当前汇率 |
| 8 | `users` | 员工/用户 | 员工档案 |
| 9 | `customers` | 客户信息 | 客户信息（394条） |
| 10 | `leads` | 销售线索 | 销售线索（2条） |
| 11 | `opportunities` | 商机 | 商机（1条） |
| 12 | `quotations` | 报价单 | 报价单 |
| 13 | `quotation_items` | 报价单明细 | 报价单明细（307条） |
| 14 | `orders` | 订单 | 订单（283条） |
| 15 | `order_items` | 订单明细 | 订单明细（382条） |
| 16 | `payments` | 回款单 | 回款单（458条） |
| 17 | `contacts` | 客户联系人 | 客户联系人（538条） |
| 18 | `followups` | 跟进记录 | 客户跟进（364条） |
| 19 | `approvals` | 审批流（统一） | 各表审批状态字段 |
| 20 | `invoices` | 开票申请 | 开票申请（271条） |
| 21 | `deliveries` | 发货申请 | 发货申请（239条） |
| 22 | `after_sales` | 售后记录 | 售后宝（131条） |
| 23 | `products` | 产品管理（新） | — |
| 24 | `devices` | 设备档案（P0） | — |
| 25 | `product_configs` | 产品配置规则（CPQ） | — |

---

## 伙伴云 → 新系统字段映射要点

### 客户信息
- `商机阶段`（category）→ `follow_stage` ENUM：leads/opportunity/quotation/deal/lost
- `所属行业`（relation）→ `industry` VARCHAR（暂存文本，后续关联 industries 表）
- `销售负责人`（relation）→ `sales_person_id` INT → JOIN users 表
- `统一信用代码` → `credit_code`（新增字段，伙伴云已有）

### 订单
- `审批状态` + `流程状态` → 统一写入 `approvals` 表，orders 表保留 `approval_status` 冗余字段
- `销售订单金额（含税）` → `amount_with_tax` DECIMAL(15,2)
- `待回款金额` / `已回款金额` → 统计字段，由 payments 表汇总计算

### 回款单
- `财务确认回款`（category）→ `finance_confirm` ENUM：pending/confirmed/revoked
- `回款凭证`（image）→ `voucher_url` VARCHAR(500) 存图片 URL

---

## 与伙伴云的关键差异

| 差异点 | 伙伴云 | 新系统 | 说明 |
|--------|----------|--------|------|
| 审批流 | 分散在各表字段 | 统一 `approvals` 表 | 新系统用统一审批流，便于扩展 |
| 产品管理 | 产品表（0条） | `products` 表（新建） | 伙伴云产品表为空，需重新录入 |
| 设备档案 | 无 | `devices` 表（新增） | P0 需求，伙伴云无此表 |
| 产品配置 | 无 | `product_configs` 表（新增） | CPQ 雏形，伙伴云无此表 |
| 客户阶段 | `商机阶段`（category） | `follow_stage` + 独立时间轴 | 新系统用独立 followups 表管理跟进 |

---

## 下一步

1. **在 MySQL 中执行 `holang_crm_schema.sql`** 建表
2. **创建数据迁移脚本** `huoban_migration.py`（从伙伴云 API 读 → 写入 MySQL）
3. **修改 holang-crm 前端**，对接新后端 API（替换 mockData）

需要我继续执行哪一步？
