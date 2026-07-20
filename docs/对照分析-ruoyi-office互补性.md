# 对照分析：ruoyi-office 与 HOLANG 内部管理系统的互补性

> 分析日期：2026-07-16
> 触发：用户指出 ruoyi-office（尤其 BPM 流程引擎）对我们有帮助
> 关联文档：`docs/对照分析-skyeye互补性.md`、`docs/建设草案-内部表单打印设计器.md`

## 0. 一句话结论
ruoyi-office 的 **BPM 流程引擎（Flowable 7 + 仿钉钉/飞书可视化设计器）** 是补齐我们审批能力短板的最佳"设计参考"——**但只能借脑，不能接入**（Java 栈与我们 Node/React 不兼容）。更关键的是：它让我们重新审视上一轮"清掉 holang-crm"的决策——**审批引擎目前在 holang-crm 里，清掉前必须先迁移到 admin 基线**。

---

## 1. ruoyi-office 项目概览（来自 GitHub README）
| 维度 | 内容 |
|------|------|
| 定位 | 基于 Spring Cloud Alibaba 的中小企业全业务办公一体化平台（OA/BPM/HRM/CRM/ERP/WMS… 16 模块） |
| 后端 | JDK 17/21 + Spring Boot 3.5 + Spring Cloud Alibaba 2025.0 + Nacos + RocketMQ + Redis |
| **工作流引擎** | **Flowable 7.0.x**（仿钉钉/飞书可视化设计器 + BPMN 设计器，双设计器） |
| 前端 | Vue3 + Vben Admin + TS（Ant Design Vue / Element Plus / Naive UI） |
| 数据库 | MySQL / PostgreSQL / Oracle / 达梦 / 人大金仓 / SQL Server（信创适配） |
| 安全 | Spring Security + OAuth2 + JWT |
| 开源协议 | MIT（仓库全量开源，无会员门槛；定制为企业商业项） |

### BPM 已实现的审批能力（README 列明）
- 会签 ✅、或签 ✅、依次审批（串行）✅
- 抄送 ✅、驳回 ✅、转办 ✅、委派 ✅、加签 ✅、减签 ✅、撤销 ✅、终止 ✅
- 表单权限 ✅、超时审批 ✅、自动提醒 ✅
- 父子流程 ✅、条件分支 ✅、并行分支 ✅、包容分支 ✅、路由分支 ✅
- 触发节点 ✅、延迟节点 ✅
- 双设计器：仿钉钉/飞书轻量拖拽（10 分钟配流程）+ BPMN 复杂编排

---

## 2. 我们现有审批引擎能力盘点（基于真实代码，已读）
> 位置：`holang-crm/src/`（React 18，非基线）。`holang-admin`（React 19 基线）**无审批引擎**，仅误命中 `evaluator.js`。

证据文件：
- `types/approval.ts`：完整类型模型（ApprovalMode 串行/并行、SignMode 或签/会签、ConditionRule 条件分支、CounterSignRecord 加签、DynamicApprover 企微通讯录动态审批人、ApprovalTemplate 模板库）
- `hooks/useApproval.ts`：**真实状态机**，已实现 `submit/approve/reject/counter_sign/transfer/urge/withdraw` 全流转，并行层会签(全通过)/或签(任一通过)逻辑均在
- `components/ApprovalFlow.tsx` + `ApprovalTimeline.tsx` + `ApprovalActions.tsx` + `ApprovalBadge.tsx`：UI 完整
- `data/approvalConfig.ts`：order/collection/invoice/delivery 四类业务审批配置（与伙伴云状态对齐）

### 我们已具备（比上一轮 skyeye 分析判断的更强）
| 能力 | 状态 | 证据 |
|------|------|------|
| 串行/顺序审批 | ✅ 实现 | useApproval switch |
| 并行 + 会签/或签 | ✅ 实现 | isParallelAllApproved / isParallelAnyApproved |
| 加签 | ✅ 实现 | counter_sign 分支 |
| 转审 | ✅ 实现 | transfer 分支（真替换审批人） |
| 撤回/催办 | ✅ 实现 | withdraw / urge |
| 条件分支（类型） | ⚠️ 类型已定义 | ConditionRule；运行时是否全量执行 skip/route/add_step 需确认 |
| 动态审批人（企微通讯录） | ✅ 类型定义 | DynamicApproverSource role/department/superior |
| 审批模板库 | ✅ 类型定义 | ApprovalTemplate |

> **修正上一轮结论**：skyeye 分析里写"用 BPMN 审计自建审批引擎补漏会签/并行"——实际 holang-crm 的 ApprovalEngine **已经实现会签/或签/并行**。真正的缺口见第 3 节。

---

## 3. 能力对照表（我们 vs ruoyi-office BPM）

| 能力 | 我们（holang-crm 引擎） | ruoyi-office（Flowable 7） | 差距 |
|------|:---:|:---:|------|
| 串行/并行/会签/或签 | ✅ | ✅ | 持平 |
| 加签/转审/撤回/催办 | ✅ | ✅ | 持平 |
| 条件分支 | ⚠️ 类型有，运行时待核 | ✅ | 我们需补运行时 |
| **后端持久化/真实 API** | ❌ 纯 React 内存态（mockLoadApprovalData 注释"替换为 API"） | ✅ Flowable 表 + 持久化 | **核心缺口** |
| **可视化流程设计器** | ❌ 仅 JSON 配置 approvalConfig.ts | ✅ 仿钉钉/飞书拖拽 + BPMN | **核心缺口** |
| 超时审批 / 自动提醒 | ❌ | ✅ | 缺口 |
| 抄送 / 委派 / 减签 / 终止 | ❌ | ✅ | 缺口 |
| 父子流程 / 包容分支 | ❌ | ✅ | 缺口 |
| 触发节点 / 延迟节点 | ❌ | ✅ | 缺口 |
| 标准 BPMN 2.0 引擎 | ❌ 自研 level 状态机 | ✅ Flowable | 不可比（栈不同） |

**结论**：我们差的是"引擎底座"（持久化 + 可视化设计器 + 定时器 + 高级节点），不是"审批语义"——会签/或签/并行这些语义我们已经有了。

---

## 4. ruoyi-office 对我们的 4 个可借力点（借脑清单）
1. **可视化流程设计器 UX**——最高优先级。我们只有 `approvalConfig.ts` 手写 JSON。照 ruoyi 的"仿钉钉/飞书拖拽设计器"做一套轻量流程设计器（节点=审批/抄送/条件/定时器），配置写入我们的 JSON schema，后端落 `forms-api` 同款本地 JSON 存储。
2. **节点类型补全**——把 抄送/委派/减签/终止/超时/子流程 作为我们 `ApprovalLevel` 的节点扩展类型加进去（参考 ruoyi 的节点模型）。
3. **定时器节点**——超时自动提醒/自动转下一级。我们引擎目前无任何 timer，可参考 Flowable 的 timer event。
4. **表单-流程一体化**——ruoyi 的"表单权限"（不同节点看不同字段）正好与我们刚建的 `DynamicForm`（Step1~3）互补：DynamicForm 渲染表单 + ApprovalEngine 控节点可见字段。

---

## 5. 不可直接采用的原因（与 skyeye 同理）
- **技术栈不兼容**：Java/SpringCloud/Flowable/MySQL vs 我们 Node/React/Tailwind/本地 JSON。源码级融合不可能。
- **身份模型不同**：ruoyi 用 Spring Security + OAuth2/JWT 通用账号；我们是**企微 OAuth 原生 + 通讯录同步 + 朗工 AI**（差异化长板），它的账号体系我们要替换。
- **重基础设施**：Nacos/RocketMQ/Redis/多 DB 适配，超出小团队轻运维目标。

---

## 6. ⚠️ 对"清掉 holang-crm"决策的修正（关键）
上一轮用户说"非基线（holang-crm）可以清除了"。但本次核实发现：
- **审批引擎整套（类型+状态机+UI+配置）只存在于 holang-crm**；
- `holang-admin` 基线**没有**审批引擎；
- 若直接"清除"，等于把我们的审批能力（含已实现的会签/并行/加签）一起删掉——而那恰恰是 ruoyi-office BPM 本要补的。

**正确路径（修正后）**：
1. **先迁再清（即上一轮选项 A）**：把 `ApprovalEngine` 整套（types/approval.ts、hooks/useApproval.ts、components/ApprovalFlow*、data/approvalConfig.ts、pages/Approval*）迁移到 `holang-admin` 基线，统一为 React 19；
2. **迁移后**用 ruoyi-office BPM 作蓝图做 4 项升级（设计器/节点补全/定时器/表单一体化）；
3. **升级完成、验证通过后**，再清 holang-crm 目录（或归档到 `_archive/`）。

> 即：ruoyi-office 的输入**强化**了"先迁再清"的必要性，而非改变方向。

---

## 7. 建议的可执行动作
| # | 动作 | 对应缺口 | 优先级 |
|---|------|----------|:---:|
| 1 | 把 ApprovalEngine 从 holang-crm 迁到 holang-admin 基线（React 19 统一） | 基线缺失 + 清除冲突 | P0 |
| 2 | 给审批引擎补**后端持久化**（复用 forms-api 的本地 JSON 存储模式，新增 approval-api） | 核心缺口① | P0 |
| 3 | 照 ruoyi 设计器 UX，做轻量**流程设计器**（节点拖拽→写 JSON schema） | 核心缺口② | P1 |
| 4 | 节点类型补全：抄送/委派/减签/终止/超时提醒 | 缺口 | P1 |
| 5 | 表单-流程一体化：DynamicForm 渲染 + ApprovalEngine 控字段权限 | 协同 | P1 |
| 6 | 条件分支运行时全量落地（skip/route/add_step 真正执行） | 待核缺口 | P2 |

---

## 8. 风险点
- **栈不兼容**：绝不为对齐 ruoyi 引入 Java/Flowable，守住 Node 轻栈。
- **迁移风险**：approvalConfig 与伙伴云状态映射（HUOBAN_STATUS_MAP）迁移时不可丢。
- **优先级**：BPM 升级不得挤占 AI 主线（朗工/企微原生身份/Phase 5 RAG）。
- **清除时机**：holang-crm 必须在审批引擎迁移+验证通过后再清，禁止先删。

---

## 9. 待用户拍板
- 是否同意"先迁 ApprovalEngine 到 admin 基线（动作 1），再清 holang-crm"（即确认上一轮选项 A）？
- 是否同意 BPM 升级的优先级排序（先补持久化 P0，再做设计器 P1）？
