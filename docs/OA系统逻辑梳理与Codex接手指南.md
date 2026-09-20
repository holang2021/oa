# HOLANG OA 系统 · 逻辑梳理与 Codex 接手指南

> 生成日期：2026-09-20。
> 用途：在可能用 Codex 重新实现前，把当前 OA 系统的**架构、模块、业务铁律、数据模型、进度、风险、运行方式**一次性理清，作为接手 / 重做的唯一事实源。
> 配套离线备份：`OA系统建设_完整备份_2026-09-20.bundle`（位于仓库父目录，含全分支，可 `git clone` 恢复）。

---

## 0. 一句话定位

HOLANG 内部 **All-In-One 业务系统**（CRM + ERP + 审批 + 企微），支撑销售从 **线索 → 商机 → 报价 → 合同/PI → 订单 → 履约收款** 的全链路，外加离职继承、RBAC、打印模板、飞书知识库同步、智能物料等内部能力。

当前状态：**Phase 1 基础框架进行中**；代码已本地真 API 验证；生产部署因服务器回收暂时中断。

---

## 1. 仓库与分支

- 单一 git 仓库，根目录 = 本"系统建设工作空间"。
- 分支：
  - `main` —— 初始化提交（仅占位）。
  - `system-build` —— **活跃工作分支，所有开发都在此**；本次备份提交即在此分支。
- 三个子目录：
  - `holang-oa/` —— **主应用**。
    - `backend/`：Node.js + tsx（**仅转译不编译**）+ Express + Prisma + SQLite。
    - `packages/oa/`：React + TypeScript + Vite 前端。**治理铁律：OA 前端永远用此目录，禁用 `holang-admin`。**
  - `wecom-app-1000081/` —— 企微回调服务（Node），处理 AgentID 1000081（OA AllInOne）的消息/事件回调。
  - `holang-admin/`（历史）—— 旧前端，**禁用**，不要在此基础上改。
- 文档与资产：`docs/`（架构/方案/报告）、`prototypes/`（HTML 原型）、`automation/`（数字员工编排）、`05_运行记录/`（运行日志）。

---

## 2. 技术栈

| 层 | 技术 | 备注 |
|---|---|---|
| 前端 | React 18 + TypeScript + Vite + Ant Design（以 `packages/oa/package.json` 为准） | 各业务域用独立 `*Store.ts` 管理状态；路由集中在 `main.tsx` |
| 后端 | Node.js + **tsx（仅转译，不 tsc 编译）** + Express + Prisma + SQLite | 因 tsx 只转译，历史 tsc 类型债不影响运行时 |
| 鉴权 | JWT（Bearer）+ RBAC 两层（ADMIN / 普通用户，前端 localStorage 隔离）+ 企微 OAuth | 密钥经 `api-configs` 运行时注入，不入库代码 |
| 企微 | 1000083（AI/朗工主通道）、1000081（OA AllInOne） | 凭据走 env / `credentials.json`，已由 `.gitignore` 排除 |
| 外部集成 | 飞书 Wiki（知识库同步）、IMA 智能物料、WhatsApp（实验性） | — |

---

## 3. 模块地图（前端页面 ↔ 后端控制器）

> 后端已落地 **30+ 控制器**，前端 **50+ 页面**。下表为关键对应（控制/路由文件在 `backend/src/{controllers,routes}`，页面在 `packages/oa/src/pages`）。

| 业务域 | 前端页面（节选） | 后端控制器 | 状态 |
|---|---|---|---|
| 客户 | Customers / CustomerForm / CustomerDetail | customer.controller | 已在产 |
| 联系人 | Contacts / ContactDetail | contact.controller | 已在产（含离职迁移/软字段治理） |
| 线索 | LeadPool / LeadDetail | lead.controller | 已在产 |
| 商机 | OppPool / OpportunityForm | opportunity.controller | 已在产（备份时点表为空，待录入） |
| 报价 | Quotations / QuotationForm / QuoteFieldConfig | quote.controller | ✅ 已完工（前端+后端+预览/pdf） |
| 合同 | （集成在报价/订单流，无独立 Customers 式页面） | contract.controller | 后端在，前端待补 |
| 外销 PI | （集成在 QuotationForm 外销分支） | pi.controller | ✅ 后端闭环（GOV-2026-026） |
| 订单 | Orders / OrderForm / OrderDetail | order.controller | 已在产 |
| 回款 | Payments / PaymentForm / PaymentDetail | payment.controller | 已在产 |
| 发票 | Invoices / InvoiceForm | invoice.controller | 已在产 |
| 发货 | Deliveries / DeliveryForm / DeliveryDetail | delivery.controller | 已在产 |
| 产品 | Products / ProductForm | product.controller | 后端在（表待录入） |
| 审批引擎 | ApprovalEngine / ApprovalTemplates / MyFlows / DoneTasks / TodoTasks | 审批后端待确认（前端在，后端可能并入 todos/独立） | 前端在，后端待补 |
| 离职继承 | Offboarding / OffboardingTodos | offboarding.controller | ✅ 已在产（2026-08-21 生产） |
| RBAC | RbacSettings | rbac.controller | 已在产 |
| 系统设置 | SystemSettings、PrintTemplates | api-config / fieldConfig | 前 3 Tab 待实做 |
| 仪表盘 | Dashboard | dashboard.controller | 已在产 |
| 飞书知识库 | FeishuWiki | feishuWiki.controller | 已在产 |
| 智能物料 | IntelligentMaterial | — | 已在产（IMA） |
| 编码规则 | （系统设置内） | codeRule.controller | ✅ 闭环（GOV-2026-026） |
| 币种 | （系统设置内） | currency.controller | ✅ 闭环（GOV-2026-026） |
| 字段配置 | （动态渲染） | fieldConfig.controller | ✅ 闭环（GOV-2026-026） |
| 企微回调 | — | wecom.controller | 已在产 |
| 用户/待办/目标/报表/经销商 | Login / TodoTasks / （target/report/dealer） | user / todos / target / report / dealer | 已在产 |

---

## 4. 🔴 核心业务铁律（Codex 重做必须遵守，不可违背）

这些是从刘总处锁定的最高业务原则，**重做时必须尊重，不要"按标准 CRM 重新设计"**：

1. **证据优先级（低不推翻高）**：① 真实业务流程 ② 真实单据 ③ 刘总确认规则 ④ 生产数据 ⑤ 当前代码 ⑥ 通用最佳实践。禁止"DB 空→业务不存在""当前代码如此→业务应如此"。
2. **模板 ≠ 业务模型**：HOLANG/客户/合同模板内容都可改；禁止按模板一比一反推库字段。
3. **三层区分**：A 结构化事实（客户/行项/数量/单价/金额/币种/税/付款/交货）优先结构化；B 可协商内容（技术描述/特殊要求/安装/包装/运输）允许灵活改，不为每种建字段；C 文档呈现（模板/排版）不得反向绑架数据模型。
4. **Commercial Item 第一性原理**：一张单据可同时含自产设备/外购/储气罐/配件/运杂费/安装/服务；不为每种建 Model，也不要求先入 Product Master；行项至少能表达 是什么/描述/数量/单位/单价/金额。
5. **单据非不可改流水线**：Quote →(沟通/谈判)→ Contract/PI →(再协商)→ Order。Quote 可作初始化来源，但初始化≠永久引用≠强制同步≠后续不可改。
6. **确认前可改、确认后冻结**：正式确认前单据可改；确认后历史交易事实不得因 Product/Customer/Template 后续变化而漂移。
7. **联系人治理铁律**：客户=组织法人；联系人=自然人，挂在客户下（一对多）。① 离职可迁移到目标客户；② 每次标记离职/迁移写一条审计记录（复用 `AuditLog`）；③ 原 Contact 保留、`status=LEFT`+`leftAt`+`leftNote`，**绝不删除**；④ 界面无删除按钮、API 无 DELETE。
8. **字段扩展架构铁律**：给模块加"软信息"字段，必须走 **JSONB + 字段配置机制**（模块表加 `extension: Json` + 复用 `fieldConfigStore` 的 `DEFAULT_FIELD_CONFIGS`），**禁止写死加列、禁止复制模型**。
9. **第一性原理 + 压迫式审核**：每次新增 Model/Field/Relation/Status/Workflow/API 必须自答"真实销售为何需要/谁填/何时填/谁用/用于何决策/不做哪受影响/现有为何不能/是否模板假需求/有无更小方案"；理由仅为"以后可能/更规范/更灵活"→默认 NOT NOW。
10. **销售体验硬约束**：若设计让销售为适配系统回到 Word/Excel/微信重做真工作 → 失败。应减重复录入/复制粘贴/改规格/改价/找历史文件/报价合同不一致。

---

## 5. 关键数据模型要点

- Schema：`holang-oa/backend/prisma/schema.prisma`（Prisma + SQLite）。
- 核心表（节选）：
  - `customers`（组织法人） / `contacts`（自然人，挂在 customer 下；`status` ACTIVE/LEFT、`leftAt`、`leftNote`、`migratedFromId`）
  - `quotes` / `contracts` / `pis` / `orders`(+`order_items`) / `payments` / `invoices` / `deliveries`
  - `opportunities` / `leads` / `products` / `follow_ups` / `todos` / `users` / `audit_logs`
  - `field_configs`（JSONB 字段配置） / `code_rules` / `currencies` / `api_configs`（密钥，运行时注入） / `sales_targets` / `wecom_departments`
- ⚠️ **空表说明**：备份时点（2026-08-11）`opportunities / quotes / contracts / products / pis / sales_targets / wecom_departments` 为**空表**——是尚未录入，不是丢失；重建后按原计划录入。
- 字段扩展统一走 JSONB：`Contact.extension` 等 + `field_configs` 机制，前端动态渲染。

---

## 6. 当前进度（截至 2026-08-28 报告，仍有效）

- ✅ **已完工并验证**：离职继承系统（生产 2026-08-21）、GOV-2026-026 四功能（币种 / 编码规则 / 字段配置 / 外销 PI，后端+路由+前端接线本地闭环）、报价→PI 全链路（金额计税、状态机、报价转 PI）、**报价管理模块已完工**。
- ✅ **已存在代码**：后端 30+ 控制器、前端 50+ 页面，覆盖客户/联系人/商机/线索/报价/合同/PI/订单/回款/发票/发货/审批/ RBAC/系统设置/打印模板/飞书/智能物料。
- ⛔ **生产部署唯一阻塞**：承载 1000083 的 CVM 已于 2026-08-27 被回收，`oa.holangchina.com` 对外服务中断；需新实例恢复后再走 hotfix 增量部署。
- 🟡 **既有 tsc 类型债**：`auth/contract/customer` 等 controller 有历史类型错误（jsonwebtoken 与 Prisma 严格性），**运行时无错**，属独立技术债，不在业务重做范围。

---

## 7. 已知风险与阻塞

1. **生产服务器回收**：部署通道双断；唯一有效备份在 `server_backup/`（已被 `.gitignore` 排除，含明文 `.env` 与生产库副本，**须线下安全保管，禁止入库**）。
2. **GitHub 凭据失效（本次发现）**：`credentials.json` 中 `github.token`（经典 `ghp_`）对 `holang2021/oa` 的 Git 操作鉴权失败（GitHub 报错 "Password authentication is not supported"），疑似**过期/吊销**。需刘总在 GitHub 重新生成具 `repo` 权限的 PAT，回填 `credentials.json` 的 `github.token`，再执行 `git push origin system-build`。
3. **本地预览库为样例 fork**：禁止本地造业务数据（单一版本铁律：生产库唯一真源）。

---

## 8. 如何本地运行

```bash
# 后端（默认 :3001，tsx watch 热重载）
cd holang-oa/backend
npm install
npm run prisma:generate
npm run dev

# 前端（默认 :5173，Vite）
cd holang-oa/packages/oa
npm install
npm run dev
```

- 数据库：SQLite，由 Prisma schema 管理；本地用 preview fork 验证，生产库为唯一真源。
- 更完整说明见 `holang-oa/README.md` 与 `docs/` 下各方案/蓝图文档。

---

## 9. 若用 Codex 重做：交接要点与禁区

- **事实源**：本指南 + `docs/` 架构文档 + 实际代码；不要凭空设计一套"标准 CRM"。
- **必须尊重 §4 全部铁律**，尤其：不写死加列（走 JSONB+字段配置）、联系人不删除（离职迁移+留痕）、单据可改流水线、确认后冻结。
- **不要重建已完工模块**：报价管理已完工、离职继承已上线；优先补齐**缺失/半成品**（审批引擎后端、CI/PL 发货单据、SystemSettings 前 3 Tab、合同前端）。
- **部署纪律**：走 hotfix 增量 + PM2 重启，**禁止 `rm -rf backend`**；单一版本铁律（只落生产库+线上，本地预览连 preview fork，禁整库同步）。
- **备份纪律**：任何重做前，先确保本 bundle + `server_backup/` 已安全留存；代码改动通过 git 提交，敏感文件（`.db`/`.env`/`credentials.json`/`server_backup/`）永不在库。

---

*本指南由执行 Buddy 在 2026-09-20 基于仓库实际结构（`git ls-files`、前后端 `package.json`、`OA_进度状态报告_2026-08-28.md`、治理铁律记忆）整理，未凭空推断。*
