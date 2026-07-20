# 决策记录：OA 统一前端基线（方案 A）

> 日期：2026-07-16
> 决策人：刘总（刘世光）
> 状态：**已决（待执行）**
> 关联文档：`HOLANG-AllInOne-架构规划.md`、`建设草案-内部表单打印设计器.md`、`对照分析-ruoyi-office互补性.md`

---

## 一、决策背景

在评估 dromara/skyeye（零代码平台）与 yuqing2026/ruoyi-office（BPM 流程引擎）两个开源项目对内部系统的互补性后，系统已分裂为三个前端：

| 目录 | 角色 | 品牌 | 状态 |
|------|------|:---:|------|
| `holang-oa` | 线上生产系统（前端 `packages/oa` + Express+Prisma+SQLite 后端 3001） | HOLANG OA（已部署 oa.holangchina.com） | 运行中 |
| `holang-admin` | React 19 统一前端基线，已搭表单引擎 + 存储 API | 未标注 | 开发中 |
| `holang-crm` | 配置驱动 CRM（React 18），含审批引擎 | 未标注 | 待清 |

用户于 2026-07-16 确认：**"方案 A，以后全部记录在 OA 里"**。

---

## 二、决策内容（方案 A）

1. **`holang-admin` 作为 OA 系统的统一新前端**，最终替代 `holang-oa/packages/oa`。
2. 所有新建能力（表单设计器、审批引擎、后续模块）**统一归到 OA 品牌下**，不再以 `holang-admin`/`holang-crm` 名义分裂发展。
3. `holang-crm` 内的**审批引擎**必须**先迁到 OA 前端（holang-admin）**，验证通过后再清除 `holang-crm` 目录（不得先删，否则丢失审批能力）。
4. 线上 `holang-oa` 生产系统保留运行，直到 OA 新前端（holang-admin）功能对齐后整体替换。

---

## 三、对既有结论的修正

- 上一轮"skyeye 互补分析"的开放问题 #2（栈统一）在此**已决**：以 OA 前端（holang-admin，React 19）为唯一前端基线。
- "ruoyi-office 互补分析"中"先迁 ApprovalEngine 到 admin 基线"的建议，**升级为 OA 前端统一承载**；ruoyi 的 Flowable/BPMN 设计器作为审批引擎升级（可视化设计器、节点补全、定时器）的参考蓝图。
- 表单设计器草案中的"holang-admin 栈"表述，统一改为"OA 前端（holang-admin）"。

---

## 四、执行路线（最小安全动作）

| 阶段 | 动作 | 产出 | 验证 |
|------|------|------|------|
| 1 | 决策记录 + `holang-admin` 标注为 OA 前端 | 本文档 + package.json 改名 | 文档可读、包名正确 |
| 2 | 迁移审批引擎核心（types/config/useApproval）到 `holang-admin/src/approval-engine` | 引擎逻辑在 OA 前端可用 | `tsc` 通过、单测覆盖状态流转 |
| 3 | 迁移审批 UI（ApprovalFlow / ApprovalEngine 组件） | 审批流可展示 | 渲染正常 |
| 4 | 补最小后端 `approval-api`（本地 JSON，与 forms-api 同路线，贴合存储决策） | 审批数据可持久化 | 保存/读取往返一致 |
| 5 | 表单提交挂接审批引擎（DynamicForm → ApprovalEngine） | 端到端：填报→审批 | 报价提交→经理收到 |
| 6 | 验证通过后清除 `holang-crm` | 单一前端基线 | crm 目录移除、OA 前端功能不退化 |

---

## 五、约束（不可越过）

- ❌ 不引入 Java/微服务栈（ruoyi/flowable 仅借设计，不接代码）。
- ❌ 不替换企微 OAuth 原生身份；审批引擎的动态审批人继续走企微通讯录。
- ❌ `holang-oa` 生产数据不可动；迁移期间两前端并行，不相互影响。
- ✅ 存储沿用本地 JSON 路线（与表单存储一致），不引入新数据库。
