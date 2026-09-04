# 批次前端接线开工简报 — CodeBuddy（2026-07-23）

> **建设落地负责人（tech-lead）出契**：本批次只做前端接线，消费已有后端 API（批次 1-A/1-B 已验收），**不写任何后端代码、不改 schema、不迁移、不部署、不 git commit**。
> **铁律（刘总 2026-07-23 拍板）**：先做能看到的前端实物 → 刘总预览确认 OK → 再动后端。本批次即"先给效果"，所有后端缺口一律前端派生/占位跑出效果，列为待拍板项。

---

## 0. 目标与原则

把已建好的后端能力（客户/商机 公海 + 认领/退回、MVP 闭环）接到 `packages/oa` 前端，让刘总在预览里**直接看到**：
1. 客户页「公海」tab + 认领/退回按钮
2. 商机页「公海」tab + 认领/退回按钮
3. 客户详情页「销售闭环」状态条（商机→报价→合同/PI→订单→回款）
4. 搜索增强（商机/订单搜索真正打到后端 `search` 参数）

**验收=刘总看预览实物确认无问题**，不是测试通过。本批次后端零改动。

---

## 1. 复用闸门判定

| 项 | 判定 | 理由 |
|----|------|------|
| 全部 D1–D4 | **A 直接复用** | 后端 API（1-A/1-B）已存在且验收通过；前端仅新增 service 方法 + 页面接线，消费既有端点 |
| 合同/PI 数据 | **A 复用** | 后端 `GET /contracts`、`GET /pi` 已存在，仅前端缺 service 方法；补前端 service 即可，无后端改动 |
| 闭环 合同/PI 阶段 | **A 复用 + 前端派生** | 用 `orders` 上的 `contractId`/`piId` 字段（批次1-B 迁移已加）判定阶段达成，无需新接口 |

**结论**：全 A，无新建、无改造后端。

---

## 2. 后端接口契约（已实现，仅消费）

| 用途 | Method + Path | 说明 |
|------|---------------|------|
| 客户列表 | `GET /customers?search&salesType` | 已有 |
| 客户公海 | `GET /customers/pool` | 返回 `inPublicPool=true` 的客户 |
| 认领客户 | `POST /customers/:id/claim` | 出公海 |
| 退回客户 | `POST /customers/:id/return` | 入公海 |
| 商机列表 | `GET /opportunities?search&salesType` | 已有 |
| 商机公海 | `GET /opportunities/pool` | 返回 `inPublicPool=true` |
| 认领商机 | `POST /opportunities/:id/claim` | |
| 退回商机 | `POST /opportunities/:id/return` | |
| 报价列表 | `GET /quotes?search&customerId&salesType` | 已有 |
| 合同列表 | `GET /contracts?customerId&salesType` | 已有（仅 INTERNAL 可见） |
| PI 列表 | `GET /pi?customerId&salesType` | 已有（仅 EXTERNAL 可见） |
| 订单列表 | `GET /orders?search&customerId&salesType` | 已有 |
| 回款列表 | `GET /payments?customerId&salesType` | 已有 |

**响应封装**（前端统一）：`{ code: number, message: string, data: T }`。`api.post` **不抛异常**，调用方必须判 `res.code === 0` 才算成功（见 `packages/oa/src/services/api.ts:80-95`）。

---

## 3. 范围与交付物（D1–D4）

### D1 客户公海 tab + 认领/退回
**改 `packages/oa/src/services/customerService.ts`**：
- `CustomerRaw` 接口（line 7-72）补 `inPublicPool?: boolean` 与 `salesOwnerId?: string | null`（原接口已有 `salesOwnerId` line 25，确认保留）。
- `Customer` 接口（line 75-116）补 `inPublicPool?: boolean` 与 `salesOwnerId?: string | null`。
- `mapCustomer`（line 119-163）补 `inPublicPool: raw.inPublicPool ?? false, salesOwnerId: raw.salesOwnerId ?? null`。
- 新增 3 个导出函数（仿 `getCustomers` line 179-198 写法）：
  ```ts
  export async function getPoolCustomers(params: CustomerQuery = {}) {
    const res = await api.get<PaginatedData<CustomerRaw>>('/customers/pool', { salesType: params.salesType })
    if (res.code === 0 && res.data) return { list: res.data.list.map(mapCustomer), pagination: res.data.pagination }
    return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
  }
  export async function claimCustomer(id: string) {
    return api.post<CustomerRaw>(`/customers/${id}/claim`)
  }
  export async function returnCustomer(id: string) {
    return api.post<CustomerRaw>(`/customers/${id}/return`)
  }
  ```

**改 `packages/oa/src/pages/Customers.tsx`**（当前无公海tab/认领/退回，line 1-250）：
- 顶部加 tab 切换：`我的客户` / `公海客户`（用 `useState` 管 `activeTab: 'mine'|'pool'`，默认 `mine`）。
- `loadCustomers` 按 `activeTab` 调 `getCustomers` 或 `getPoolCustomers`（都带 `salesType`）。
- 表格操作列：
  - `activeTab==='pool'` → 每行显示「认领」按钮（`claimCustomer(c.id)` → 成功后重新 `loadCustomers` + 成功提示）。
  - `activeTab==='mine'` → 当前用户拥有（`customer.salesOwnerId === currentUser.id`）或 `isCurrentUserAdmin()` 时显示「退回」按钮（`returnCustomer(c.id)` → 重新加载）。
- 用 i18n（`t()`）替换硬编码中文（见 D4 key 列表）。
- 用本地 `actionMsg` state 显示认领/退回成功或失败（仿现有 `error` state，项目无 toast 库，**不要引入新依赖**）。
- 删除/编辑按钮逻辑保持不变。

### D2 商机公海 tab + 认领/退回
**改 `packages/oa/src/services/opportunityService.ts`**（当前仅 `getOpportunities`/`getOpportunityById`，line 1-51）：
- `Opportunity` 接口（line 3-20）补 `inPublicPool?: boolean`。
- 新增（仿 `getOpportunities` line 31-44）：
  ```ts
  export async function getPoolOpportunities(params: OpportunityQuery = {}) {
    const res = await api.get<PaginatedData<Opportunity>>('/opportunities/pool', { salesType: params.salesType })
    if (res.code === 0 && res.data) return { list: res.data.list, pagination: res.data.pagination }
    return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
  }
  export async function claimOpportunity(id: string) { return api.post<Opportunity>(`/opportunities/${id}/claim`) }
  export async function returnOpportunity(id: string) { return api.post<Opportunity>(`/opportunities/${id}/return`) }
  ```

**改 `packages/oa/src/pages/OppPool.tsx`**（当前是全量商机列表，line 1-169，命名误导但就是商机管理页）：
- 顶部加 tab：`我的商机` / `公海商机`。
- `loadOpps`（line 37-49）按 tab 调 `getOpportunities` 或 `getPoolOpportunities`。
- 操作列（line 149-154）补：pool 行「认领」、mine 行且属当前用户「退回」。成功重加载 + `actionMsg` 提示。
- 搜索框（line 90-97）：把本地 `search` 过滤改为**传 `search` 到 `getOpportunities`/`getPoolOpportunities` 的 params**（后端按名称/编号模糊搜），前端仅做兜底过滤（保持现有 `filtered` 逻辑即可，但主搜索走 API）。

### D3 客户详情「销售闭环」状态条 + 报价tab接真实数据
**改 `packages/oa/src/pages/CustomerDetail.tsx`**（极丰富页，line 1-849）：
- `fetchRelated`（line 204-225）已有 `getOpportunities/getOrders/getPayments`，**补 `getQuotes`**（来自 `quoteService`，已在 line 4 import 区需加）与按 `salesType` 取合同/PI：
  - 新增 `import { getQuotes, type Quote } from '../services/quoteService'`（line 4 区域加）。
  - 新增 `import { getContracts, type Contract } from '../services/contractService'`（**需新建 `contractService.ts`**）。
  - 新增 `import { getPis, type Pi } from '../services/piService'`（**需新建 `piService.ts`**）。
  - 在 `fetchRelated` 的 `Promise.all` 中加 `getQuotes({customerId:id,pageSize:100})`、`getContracts({customerId:id,pageSize:100})`、`getPis({customerId:id,pageSize:100})`，并 `setCustQuotes/setCustContracts/setCustPis`。
- **新建 `packages/oa/src/services/contractService.ts`**（仿 `orderService.ts` 写法）：`Contract` 接口至少含 `id, contractCode?, customerId?, salesType?, status?, quoteRef?, piRef?`；`getContracts(params)` → `api.get('/contracts', {customerId, salesType, pageSize})`，返回 `{list, pagination}`。
- **新建 `packages/oa/src/services/piService.ts`**（同构）：`Pi` 接口至少含 `id, piNumber?, customerId?, salesType?, status?`；`getPis(params)` → `api.get('/pi', {customerId, salesType, pageSize})`。
- **闭环状态条**（在 `overview` tab 的「跟进阶段」块之后，line 424 之后插入）：横向 5 步 `商机 → 报价 → 合同/PI → 订单 → 回款`，每步显示数量 + 达成态（绿色高亮/灰）：
  - 商机：`custOpps.length>0`；WON 数 = `custOpps.filter(o=>o.stage==='WON').length`
  - 报价：`custQuotes.length>0`
  - 合同/PI：INTERNAL 看 `custContracts.length>0`（且 `status==='CONFIRMED'` 高亮），EXTERNAL 看 `custPis.length>0`（`status==='CONFIRMED'` 高亮）；按 `customer.salesType` 决定显示「合同」或「PI」
  - 订单：`custOrders.length>0`
  - 回款：`totalPaymentReceived>0`
  - 每步可点 → `setActiveTab('opportunities'|'quotations'|'orders'|'payments')`（商机/报价/订单/回款已有对应 tab；合同/PI 点跳「订单」tab 并提示）
- **修复报价 tab 桩**（line 632-637 当前硬编码「暂无报价」）：改为 `custQuotes.length===0 ? 显示空态 : 列表`（仿 `orders` tab line 640-667，显示 `quote.code/status/amount`）。

### D4 搜索增强 + i18n 双语
- **搜索增强**：
  - `OppPool.tsx` 搜索走 API（D2 已含）。
  - `Customers.tsx` 搜索已走 API（`getCustomers({search})` line 36），保持不变，仅确认生效。
  - `Orders.tsx`（若存在搜索框）确认 `search` 传入 `getOrders` params（后端已支持）；若无搜索框，本批次**不加**（避免蔓延）。
- **i18n**：在 `packages/oa/src/i18n/I18nContext.tsx` 的 `translations.zh` 与 `translations.en` 两处**同时**新增以下 key（结构见该文件 line 16-17，key 形如 `'nav.customers': '客户管理'`）：
  ```
  'pool.mine': '我的客户' / 'My Customers'
  'pool.public': '公海客户' / 'Public Pool'
  'pool.claim': '认领' / 'Claim'
  'pool.return': '退回' / 'Return'
  'pool.oppMine': '我的商机' / 'My Opportunities'
  'pool.oppPublic': '公海商机' / 'Public Opportunities'
  'loop.title': '销售闭环' / 'Sales Loop'
  'loop.stage.quote': '报价' / 'Quote'
  'loop.stage.contract': '合同' / 'Contract'
  'loop.stage.pi': 'PI' / 'PI'
  'loop.stage.order': '订单' / 'Order'
  'loop.stage.payment': '回款' / 'Payment'
  'loop.stage.opp': '商机' / 'Opportunity'
  'action.success': '操作成功' / 'Success'
  'action.failed': '操作失败' / 'Failed'
  ```
  - 页面所有新增/改动的可见中文文案用 `t('key')` 调用，**不可裸写中文**（满足双语要求）。已有页面中文（如「客户管理」标题）可不动，只保证本次新增文案走 i18n。

---

## 4. 代码规则（强制）
1. 严格遵循现有 service 写法：`api.get<PaginatedData<T>>('/x', params)`、`api.post<T>('/x', body)`；判 `res.code === 0`。
2. **禁止 `as any`**；TypeScript `strict` 已开（`tsconfig.json`），`npm run build`（= `tsc -b && vite build`）须 0 error。
3. 不加任何新 npm 依赖（无 toast 库、无 UI 库）；提示用本地 state（仿 `error` state）。
4. 沿用现有 Tailwind class（`card`/`btn-primary`/`input-field` 等）与 `lucide-react` 图标，风格与现有页一致。
5. 改动只在 `packages/oa/src/` 内；**不碰 `backend/`、不改 schema、不写迁移、不部署、不 git commit**。

---

## 5. 验收标准（本批次=刘总看预览确认）
- [ ] `packages/oa` `npm run build` 通过（tsc 0 error）。
- [ ] 客户页有「公海客户」tab，列出公海客户，点「认领」后该客户从公海消失（重加载）。
- [ ] 「我的客户」中属当前用户/管理员可见「退回」，点「退回」后入公海。
- [ ] 商机页有「公海商机」tab + 认领/退回，行为同上。
- [ ] 客户详情 overview 显示 5 步闭环状态条，数据来自真实接口（商机/报价/订单/回款 + 合同或PI，按 salesType）。
- [ ] 客户详情「报价」tab 显示真实报价列表（非「暂无报价」桩）。
- [ ] 商机搜索打到后端 `search`。
- [ ] 全部新增文案中英双语（切语言可验证）。
- [ ] 真实生产库 `holang-crm.db` **零触碰**（预览走 `holang-crm-preview.db` 副本）。

---

## 6. 防蔓延清单（红线）
- ❌ 不改 `backend/` 任何文件、不新建/改后端接口。
- ❌ 不改 `prisma/schema.prisma`、不写迁移。
- ❌ 不 `git commit` / `git push`（本批次仅本地改动，待刘总确认后由 tech-lead 统一上云）。
- ❌ 不部署、不起生产服务。
- ❌ 不引入新依赖。
- ❌ 若发现后端字段缺漏：前端派生/占位跑出效果，缺口写入「待拍板项」回报 tech-lead，**不擅自改后端**。

---

## 7. 预览运行（tech-lead 负责，非本批次写码范围）
后端预览服务已在 `.env` 指向副本库 `holang-crm-preview.db`：
- 起后端：`cd backend && npx tsx src/index.ts`（端口 3001，副本库）。
- 起前端：`cd packages/oa && npm run dev`（端口 5173，vite 代理 `/api`→3001）。
- 演示登录：`demo@holang.com` / `demo1234`（ADMIN，仅写副本）。
