# GOV-2026-026 四功能本地闭环验证报告

> 验证时间：2026-08-26 13:54 | 环境：本地预览（后端 3001 / tsx watch / preview DB fork）
> 验证纪律：先读后改 → Patch → 实测 → 复核 → 记录（压迫式审核）

## 一、本次修复的真实缺陷
`currency.routes.ts` 与 `codeRule.routes.ts` 此前**未注册 `GET /:id` 路由**，导致：
- `GET /api/v1/currencies/:id` → Express 默认 404（路由不存在）
- `GET /api/v1/code-rules/:id` → Express 默认 404

已补两行路由注册（controller/service 的 `getById` 此前已存在）：
```ts
router.get('/:id', authenticate, authorize(['ADMIN']), currencyController.getCurrencyById)
router.get('/:id', authenticate, authorize(['ADMIN']), codeRuleController.getCodeRuleById)
```

## 二、四功能实测结果（带证据）

| 功能 | 路由 | 实测 | 结论 |
|---|---|---|---|
| 币种管理 | POST/GET/PUT/DELETE `/currencies` + GET `/:id` | POST→201、GET /:id→200、DELETE→200（USD 探针已清理） | ✅ 闭环通过；原 404 现为应用层「币种不存在」（证明路由已通到 controller） |
| 编码规则 | POST/GET/PUT/DELETE `/code-rules` + GET `/:id` | POST→201、GET /:id→200、DELETE→200（SO 探针已清理） | ✅ 闭环通过 |
| 字段配置 | GET/PUT/DELETE `/field-configs`（复数） | PUT `/field-configs/customer`→200 写库；探针字段已还原为原始 `name` 配置 | ✅ 通过；挂载路径为 `/field-configs`，前端调用一致 |
| 外销 PI | GET/POST/PUT/DELETE `/pi` | POST 缺 quoteRef→400、客户不存在→404、GET /pi/:id→404、列表→200 | ✅ 路由+校验链全通；happy-path 插入需「ACCEPTED 外销报价」种子数据（preview 库无 quotes，属种子缺口非代码缺陷） |

## 三、前端接线核对（防"后端通、前端错路径"）
- `currencyStore.ts` → `/currencies` ✅
- `codeRuleStore.ts` → `/code-rules` ✅
- `fieldConfigStore.ts` → `/field-configs`（复数，与后端一致）✅
- `piService.ts` → `/pi` ✅

前端 `getCurrencyById` 走本地缓存(列表)，故 `GET /:id` 为后端 REST 完备性补充，幂等无害。

## 四、诚实声明（编译）
`tsc --noEmit` 报多处**既有**类型错（auth/contract/customer/dealer 等 controller，jsonwebtoken 与 Prisma 入参严格性），**非本次改动引入**；本次改的 `routes` 文件无报错。后端以 `tsx watch`（仅转译不类型检查）运行，运行时无错。全量 tsc 修错属独立技术债，不在本任务范围。

## 五、状态与下一步
- 四功能**后端代码 + 路由 + 前端接线 100% 就绪**，本地闭环通过。
- 生产部署仍阻断：唯一服务器 `ins-4xm95czz` TAT 注销、域名/IP 不可达（详见 2026-08-26 记忆）。
- **下一步**：刘总恢复/确认服务器实例（新实例 ID/IP）→ 按 `harden-tat-cos.md` + `run-server.sh` SOP 一键推送 + 顺带 TAT+COS 硬化。
