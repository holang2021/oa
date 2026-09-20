# OA 报价/产品/PI 模块 — 本地真 API 闭环验证报告

> 验证日期：2026-08-27｜执行人：数字化执行中枢（holang-digital-product-owner）
> 环境：本地预览 `:3001`（tsx watch）+ `holang-crm-preview.db` 样例 fork（**未触碰生产库**）
> 背景：刘总拍板"服务器先不管，能往下做" → 选 A 方向：把已存在但只停在代码层的模块用真 API 跑通闭环

## 一、验证结论（先给结论）

**quotes（报价）、products（产品）、PI（外贸形式发票）三个模块在本地真实可用，不是"只停在代码层"。**
全部通过真实 HTTP API 端到端验证，金额计算、内外销计税、状态机、打印预览、报价→PI 衔接均正确。

## 二、验证矩阵（操作 × 真实结果）

| 模块 | 操作 | 请求 | 真实结果 | 关键核对 |
|---|---|---|---|---|
| products | 创建产品 | POST /products | 201 | 返回 id，name+unitPrice 落库 |
| quotes | 创建内销报价(草稿) | POST /quotes | 201 | `QT2026000001`，`total=90000`，`未税=79646.02`，`taxRate=13` |
| quotes | 报价详情 | GET /quotes/:id | 200 | 金额/状态/ salesType=INTERNAL 正确 |
| quotes | 打印预览 | GET /quotes/:id/preview | 200 HTML | 生成完整报价单 HTML（含 HOLANG 抬头、明细、税额） |
| quotes | 删除草稿 | DELETE /quotes/:id | 200 | 草稿可删，符合"仅草稿可删"业务规则 |
| quotes | 接受报价 | PUT /quotes/:id/accept | 200 | DRAFT→ACCEPTED 状态机生效 |
| quotes | 创建外销报价 | POST /quotes | 201 | salesType=EXTERNAL，taxRate 强制 0（外销未税） |
| PI | 生成 PI（补齐上次缺口） | POST /pi | 201 | `PI2026000001`，quoteRef 指向已 ACCEPTED 外销报价，报价→PI 全链路打通 |

## 三、关键证据（金额计算正确性）

内销报价用例：`unitPrice=50000 × quantity=2 × (1-折扣10%) = 90000`（含税）
- `totalAmount = 90000` ✓
- `amountWithoutTax = 90000 / 1.13 = 79646.02` ✓（增值税 13% 还原）
- 外销报价：`taxRate` 强制为 0，按未税计价 ✓（符合内外销双运营计税规则）

## 四、过程中发现并解决的真实问题

1. **preview DB `products` 表为空** → `createQuote` 强校验 `productId` 存在，无法凭空建报价。
   处理：用 `POST /products` 真实创建测试产品（顺带验证了 products 模块写路径），再跑 quotes 闭环。
2. **PI happy-path 上次卡在"缺 ACCEPTED 外销报价种子数据"** → 本次先建外销报价并 accept，PI 即生成成功，缺口闭合。

## 五、数据清理（单一版本铁律遵守）

验证插入的探针数据已全部清除，preview DB 恢复干净：
- products：`1 → 0`
- quotes：`2 → 0`
- quote_items：`2 → 0`
- pis：`1 → 0`
- 生产库：未触碰。

## 六、风险与边界（诚实声明）

- 本次为**验证**而插入的数据已清理，无残留；结论基于本地 preview fork，不等同生产环境已验证。
- 后端以 `tsx` 运行（仅转译），`tsc --noEmit` 存在**既有类型债**（auth/contract/customer 等 controller，非本次引入），属独立技术债，不在本次范围。
- 前端 `:5173` 本次未启动（纯 API 验证不需要）；若需"看实物"可随时启动前端核对 UI 接线。

## 七、下一步建议（不依赖服务器）

- 继续 A 方向：验证**真正缺失**模块（CI/PL 发货单据、审批引擎、SystemSettings 前3 Tab）——先做前先 grep 确认真实缺口，禁止重复造原型。
- 或转 B 方向：对确认缺失的模块出高保真原型供刘总确认。
- 服务器恢复（ins-4xm95czz 新实例/新 IP）→ 按 `harden-tat-cos.md` SOP 一键推送已验证模块 + 顺带硬化。
