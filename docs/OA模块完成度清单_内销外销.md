# HOLANG OA 模块完成度清单（内销 / 外销全貌）

> 真源：`holang-oa` 前端 `packages/oa/src/App.tsx` 路由 + `pages/` 组件 + 后端 `backend/src/app.ts` 注册的 28 个 API 路由。
> 分支：`system-build`，最近提交 2026-09-20（一直在迭代）。
> 生成时间：2026-10-01。用途：让刘总一眼看清"我们做了哪些内容、内外销怎么分、还差什么"。

---

## 一、总览：分国内 / 海外双轨的实现方式

| 项目 | 事实（基于真源） |
|---|---|
| 双轨机制 | 前端路由分 `/domestic`（内销）与 `/export`（外销）两套前缀；**页面组件共用同一套**（Customers / CustomerDetail / Quotations …） |
| 数据隔离 | 后端按 `salesType` 字段隔离（内销 = DOMESTIC，外销 = EXTERNAL），见 `CustomerDetail.tsx:326,545` |
| 视觉现状 | 全部页面仍用旧 SaaS 模板风（亮蓝 #2563eb / 12px 圆角 / 阴影卡片），**未对齐 OA UI 规范 V0.1** |
| 部署现状 | 无服务器，仅本机 5173 可跑；本地预览库 = 2026-08-11 时点备份 |

---

## 二、CRM · 内销（/domestic 前缀）

| 模块 | 页面 | 前端组件 | 后端 API | 完成度 |
|---|---|---|---|---|
| 客户 | 列表 / 新建 / 编辑 / 详情 | Customers, CustomerForm, CustomerDetail | `/customers` | ✅ 已建 |
| 联系人 | 详情 | ContactDetail | `/contacts` | ✅ 已建 |
| 线索 | 线索池 / 详情 | LeadPool, LeadDetail | `/leads` | ✅ 已建 |
| 商机 | 商机池 / 新建 / 编辑 | OppPool, OpportunityForm | `/opportunities` | ✅ 已建 |
| 报价 | 列表 / 新建 / 编辑 | Quotations, QuotationForm | `/quotes` | ✅ 已建 |
| 订单 | 列表 / 新建 / 编辑 / 详情 | Orders, OrderForm, OrderDetail | `/orders` | ✅ 已建 |
| 发货 | 列表 / 新建 / 编辑 / 详情 | Deliveries, DeliveryForm, DeliveryDetail | `/deliveries` | ✅ 已建 |
| 发票 | 列表 / 新建 / 编辑 | Invoices, InvoiceForm | `/invoices` | ✅ 已建 |
| 回款 | 列表 / 新建 / 编辑 / 详情 | Payments, PaymentForm, PaymentDetail | `/payments` | ✅ 已建 |

---

## 三、CRM · 外销（/export 前缀）

| 模块 | 页面 | 前端组件 | 后端 API | 完成度 |
|---|---|---|---|---|
| 客户 / 联系人 / 线索 / 商机 / 报价 / 订单 / 发货 / 回款 | 同内销组件（复用） | 共用 | 共用（按 salesType 隔离） | ✅ 已建 |
| 形式发票 PI | 列表 / 新建 / 编辑 | ProformaInvoices, ProformaInvoiceForm | `/pi` | ✅ 外销特有 |
| WhatsApp 集成 | 页面 | WhatsAppPage | 前端页（后端走 wecom 通道） | ⚠️ 需核连通 |

---

## 四、共用支撑模块（不分内外销）

| 域 | 模块 / 路由 | 前端 | 后端 | 说明 |
|---|---|---|---|---|
| 产品 | /products | Products, ProductForm | /products | ✅ |
| 审批引擎 | /tools/approval, /templates, /stats | ApprovalEngine 等 | — | ✅ |
| 组织 / 权限 | /org/roles, /offboarding, /offboarding-todos | RbacSettings, Offboarding | /rbac, /offboarding | ✅ 含离职继承 |
| 系统设置 | /tools/config | SystemSettings | /code-rules, /field-configs, /currencies | ✅ 编码规则/字段配置/币种 |
| 智能物料 | /erp/intelligent-material | IntelligentMaterial | — | ✅ IMA 集成 |
| 营销 / 售后 / SRM / ERP / 分析 / 技术文档 | 大量 /marketing /aftersales /srm /erp /analytics /tech 路由 | 多用 `GenericListPage` + config 配置驱动 | 部分有对应 API | ⚠️ 配置驱动通用页，真实数据支撑需逐模块核 |

---

## 五、关键缺口（必须如实告知）

1. **海外代理报备（Agents）/ 伙伴云（PartnerCloud）在本工作区还没有。**
   这两块只存在于之前那个被你否的 Codex 整理版（`HOLANG-CRM` v2），**未合回本工作区**。本工作区 App.tsx 无 `/agents`、`/partner` 路由。若"分国内海外"要包含海外代理体系，需作为新增量补进本工作区。
2. **视觉未对齐 V0.1**：所有页面仍是旧 SaaS 风，需按三页验证法逐页统一（即本轮 A 要做的）。
3. **未部署**：本机可看，对外/企微回调不可用（无服务器）。
4. **预览库仅 2026-08-11 时点**：真实生产数据需部署后验证连通。

---

## 六、与"我们做了很多内容"的对应

- 内销：客户→线索→商机→报价→订单→发货→发票→回款，全链路闭环 ✅
- 外销：同链路 + 形式发票 PI + WhatsApp ✅
- 支撑：产品 / 审批 / 权限 / 离职继承 / 系统设置 / 智能物料 / 营销 / 售后 / SRM / ERP / 分析 ✅（部分配置驱动，待实数据核）
- 缺：海外代理体系（Agents / PartnerCloud）待补

---

## 七、下一步建议（配合增量节拍）

- 本轮 A：先出"客户详情页"三页验证原型（V0.1 视觉），确认即统一视觉基线。
- 后续按看板逐模块推进；海外代理作为独立增量评估是否合回。
