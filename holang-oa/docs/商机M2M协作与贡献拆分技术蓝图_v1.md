# HOLANG OA · 商机多对多协作 + 贡献拆分 技术蓝图 V1

> 状态：草稿 / 待刘总会签（2 项决策待拍板）
> 作者：holang-tech-lead ｜ 日期：2026-08-05
> 范围：客户↔商机 1:N 增强、客户↔销售 M2M、商机↔销售协作 M2M（含贡献比例）、贡献拆分业绩建模、未税/含税统一统计口径、级联删除与数据完整性。

---

## 0. 复用闸门结论（A/B/C）

| 能力 | 判定 | 理由 |
|---|---|---|
| 商机 CRUD / 列表 / 漏斗 / 预测 | **A 改造复用** | `Opportunity` 模型、`opportunity.controller/service/repository`、前端 `OpportunityForm/OppPool` 已存在，仅增强 |
| 客户↔销售 M2M、商机↔销售协作 M2M、贡献拆分 | **C 新建** | 现有为单 `salesOwnerId` + `collaborators` JSON 字符串，无结构化协作/比例 |
| 对标：Salesforce `OpportunityTeamMember` | 可借鉴 | 团队成員 + 访问级 + 拆分概念（外部成熟范式） |
| 对标：询盘云（外销 CRM） | 可借鉴 | 外销团队协作 / PI 为主轴 |
| 贡献比率精确拆分 + 未税/含税双口径业绩 | **自研** | 外部系统多为等权或手动，HOLANG 需按比率精确拆分且内外销双口径，无现成可复用 |

---

## 1. 现状与缺口

**已有**
- `Opportunity` 表：`customerId` FK、`@@index([customerId])`、CRUD、`getOpportunities?customerId=` 已支持按客户检索、漏斗/预测。
- `Order.amountWithoutTax`（未税）已存在；`Order.opportunityId`、`Contract.opportunityRef` 关联键已存在。

**缺口**
1. 删除客户时**不级联**商机：当前 `deleteCustomer` 返回 400 拦截（"客户有关联的销售机会或合同，无法删除"），且 `Opportunity.customer` 无 `onDelete: Cascade`。
2. **无 M2M 协作**：客户/商机均只有单一 `salesOwnerId`；`Opportunity.collaborators` 是 `String?` JSON hack，无法做结构化协作与比例。
3. **无贡献拆分业绩模型**：无法按不同比例把同一笔业绩分给多人。
4. **统计口径未统一**：`Contract`/`Pi` 仅有 `amount`（默认含税），缺 `amountWithoutTax`；"奖金按未税、外销仅未税、合同按未税汇总"无统一落地函数。

---

## 2. 数据模型设计（Prisma 增量 Diff）

### 2.1 级联删除（客户→商机）
```prisma
model Opportunity {
  // 改：relations 段
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```
> Prisma + SQLite 的 `onDelete: Cascade` 在 **Client 层**生效（Prisma 自动下发子表删除），等价于库级级联。配合下面 2.2/2.3 的 join 表 `onDelete: Cascade`，删商机同时删其协作记录。

### 2.2 客户 ↔ 销售负责人 M2M（多人协同推进客户）
```prisma
model CustomerSales {
  id         String   @id @default(cuid())
  customerId String
  userId     String
  role       String   @default("COLLABORATOR") // PRIMARY 主负责 / COLLABORATOR 协作
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([customerId, userId])
  @@index([customerId])
  @@index([userId])
  @@map("customer_sales")
}
```

### 2.3 商机 ↔ 销售协作 M2M（含贡献比例）
```prisma
model OpportunitySales {
  id               String   @id @default(cuid())
  opportunityId    String
  userId           String
  contributionRate Int      @default(0)  // 贡献比例 0–100；同一商机各成员之和须 = 100
  isPrimary        Boolean  @default(false)
  createdAt        DateTime @default(now())

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([opportunityId, userId])
  @@index([opportunityId])
  @@index([userId])
  @@map("opportunity_sales")
}
```

### 2.4 合同 / PI 补充未税字段（统一统计口径）
```prisma
model Contract {
  amountWithoutTax Float?   // 新增：合同未税金额（汇总一律用此）
}
model Pi {
  amountWithoutTax Float?   // 新增：PI 未税金额
}
```

### 2.5 保留 `salesOwnerId` 作为主负责（冗余快捷）
- `Customer.salesOwnerId` / `Opportunity.salesOwnerId` **保留**，用于快速过滤与向后兼容。
- **约束**：主负责（`isPrimary=true`）必须同时存在于对应 M2M 表，二者写入需保持一致（service 层保证）。

---

## 3. 数据完整性约束

| 约束 | 落地方式 |
|---|---|
| 非空 | `customerId`/`name`/`userId`(join) 无 `?`；控制器 zod 校验 `min(1)` |
| 外键 | Prisma+SQLite 不落库级 FK → 依赖 Client 层 `onDelete: Cascade` + 应用校验 + 域强制 |
| 唯一 | join 表 `(parentId, userId)` 唯一，杜绝重复协作人 |
| 贡献比例 | 单商机各 `contributionRate` 之和须 = 100（写入校验，容差 ±0.5） |
| 主负责一致 | 设主负责时同步写入 M2M 且 `isPrimary=true` |

---

## 4. 级联与高效检索

- **删客户** → 级联删商机 → 级联删 `OpportunitySales`（Client cascade，DB 可验证）。
- **按客户 ID 检索全部商机**：已有 `GET /api/v1/opportunities?customerId=:id` + `@@index([customerId])`，O(log) 命中；可选新增 `GET /api/v1/customers/:id/opportunities` 直连（复用同一查询）。

---

## 5. 贡献拆分业绩建模与逻辑

**业绩来源链路**
```
Order.amountWithoutTax  ┐
Contract.amountWithoutTax ├─ 关联 Opportunity(opportunityId / opportunityRef)
Pi.amountWithoutTax     ┘        └─ OpportunitySales.contributionRate（按人拆分）
```

**拆分公式**
```
某销售业绩(未税) = Σ ( 商机实现未税额 × 该人 contributionRate / 100 )
```
- 实现未税额优先级：`Order.amountWithoutTax` → `Contract.amountWithoutTax` → `Pi.amountWithoutTax` →（仍开放）`Opportunity.expectedAmount`（预测，加权用）。
- **外销**（`salesType=EXTERNAL`）：`taxRate=0` → 含税=未税，仅统计未税。
- **奖金业绩** = 同未税口径（一律未税）。

**落库策略**：`salesPerformance.service` **聚合计算，不落库**（避免与订单/合同金额漂移）；可选 phase2 周期快照表 `SalesPerformanceSnapshot`（奖金结算用）。

**预测业绩**：开放商机用 `expectedAmount(未税) × winProbability%` 加权，按贡献比例预分摊。

---

## 6. 统计口径统一（落地规则）

| 维度 | 规则 |
|---|---|
| 订单 / 合同 | 同时存 `amount`(含税) 与 `amountWithoutTax`(未税)，前端/报表双列展示 |
| 奖金业绩 | **一律未税** |
| 外销 | **仅未税**（taxRate 强制 0，含税=未税） |
| 合同汇总 | 用 `amountWithoutTax` |
| 统一函数 | `calcUntaxed(amount, taxRate)`：外销 taxRate=0；内销按税率反算 |

> 新增 `utils/price.ts` 集中实现，杜绝各模块各算各的。

---

## 7. API 契约增量

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/customers/:id/opportunities` | 直连按客户取全部商机（复用查询） |
| POST/GET/PUT/DELETE | `/customers/:id/sales-owners` | 客户销售负责人 M2M 增删改查 |
| POST/GET/PUT/DELETE | `/opportunities/:id/sales-team` | 商机协作人 + `contributionRate` 增删改查 |
| GET | `/sales-performance?period=&salesType=` | 贡献拆分业绩汇总（新接口） |

**校验**：`POST/PUT /opportunities/:id/sales-team` 提交后校验该商机 `ΣcontributionRate = 100`（容差 ±0.5），否则 400。

---

## 8. 验收标准（可复核）

1. 删客户 → 其商机及 `OpportunitySales` 记录随之删除（DB 直查验证）。
2. 客户可挂 N 个销售负责人；商机可挂 N 个协作人 + 各自贡献比例。
3. 贡献比例之和 ≠ 100 时接口拦截（400）。
4. 业绩拆分：建 2 人 60/40 协作商机并成交 → 两人业绩按 60/40 未税拆分正确。
5. 外销合同仅未税计入；内销合同汇总用 `amountWithoutTax`。
6. `calcUntaxed` 在税率 13%/6%/0 下结果正确；外销强制 0。

---

## 9. 实施计划（先可见效果后后端）

- **阶段0**：蓝图确认 + 2 项决策拍板（本文件 §10）。
- **阶段1**：高保真原型（客户销售负责人 M2M 管理、商机协作+贡献比例、业绩拆分视图）→ 刘总预览确认。
- **阶段2**：后端 `prisma db push`（保数据）+ service + controller + zod 校验 + 级联。
- **阶段3**：前端接真实 API + 增量部署（严禁全量 `oa_deploy_backend.py`）。
- **阶段4**：按 §8 验收。

---

## 10. 待刘总拍板（2 项）

**Q1 删客户时，合约/订单如何处理？**
- 建议：**拦截**（返回 400，提示先处理合约/订单）。理由：合约/订单是财务与法律凭证，不应随客户静默级联删除。商机可级联（业务过程数据）。

**Q2 业绩来源按"实际订单/合同未税额"还是"商机预计未税额"？**
- 建议：**实际订单/合同未税额**（成交才计业绩，奖金口径更稳）；开放商机仅用于"预测业绩"加权，不计入实发奖金。
