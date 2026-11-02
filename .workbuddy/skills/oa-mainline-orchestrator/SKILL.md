---
name: oa-mainline-orchestrator
description: HOLANG OA（销售 CRM）项目主线/支线协调工作流。基于 project-mainline-orchestrator 协调层，按 HOLANG 既有规则实例化：隔离 Agent（CodeBuddy）写代码、主线只验收；GitHub 离线 bundle（沙箱不直推）；branch-register.md 登记；上下文轮转交接。用于多阶段、跨系统（前端+后端+DB+企微）、需刘总审批、长周期、易超上下文的 OA 开发。
---

# OA 主线/支线协调工作流（实例化版）

本 skill 是 `project-mainline-orchestrator` 的 **HOLANG OA 项目实例化版本**。它只提供「协调层」——规定怎么分主线/支线、怎么派工/验收/轮转——**不改 OA 业务规则**。CRM 业务总纲见 `.workbuddy/memory/MEMORY.md`（LOCKED，本 skill 不重复）。

来源通用 skill：`F:\CODEX\Home\skills\project-mainline-orchestrator\`（只读采纳，本文件不修改它）。

## 模式
- 采用 `mainline + branches`：主线是控制面，支线是独立可验收的执行单元。
- 何时启用：多阶段、跨系统、需刘总审批、长周期、上下文易超限的 OA 任务。单会话能安全关掉的小任务不用。
- 推荐在「项目真相清晰、对象/阶段/依赖明确」后主动启用，别等上下文或重复派工出问题才用。

## 主线契约（控制面）
主线拥有：范围、任务身份、依赖、审批边界、派工、等待、验收、去重、恢复、汇报。
- **主线不 inline 写代码、不起服务、不 push**（既有铁律）。写代码一律派隔离 Agent（CodeBuddy / general-purpose 子代理）。
- 支线回报后，主线**独立 readback 关键证据**再标记完成；未实查不宣称完成。
- 每次回复刘总都要带三段式：理解 / 关键发现 / 建议后续；凡需刘总决策，点明「下一步最有价值 / 我的建议 / 怎么推进」。

## 支线契约
支线执行一个工作项，回报结构化证据：
- 状态 / 改动对象 / 验证 / 证据路径 / 剩余风险 / 是否需用户决策 / 建议下一步。
- 支线**不**扩大范围、不自行发布/删除/改凭据/假设生产权限。

## 派工闸门（每次派 CodeBuddy 前查 7 项）
1. 同 `WorkItemID` 无非终态项在跑
2. `DispatchKey` 未产生过结果
3. 无冲突 `ObjectLock`
4. 基线仍新
5. 依赖已满足
6. 动作在范围内、可逆
7. 有并发槽位
任一不过 → 复用既有结果 / 刷新基线 / 等依赖，**绝不造重复支线模拟进度**。

## 登记册
- 位置：`.workbuddy/branch-register.md`（主线维护，已建）。
- 每条支线含：`WorkItemID` / `DispatchKey` / `ObjectLock` / `AccessMode` / `Baseline` / `ExpectedDelta` / `ComputeClass` / `Owner` / `Status` / `Evidence` / `ApprovalRequired` / `NextAction`。
- 状态机：非终态 `not-created` / `running` / `waiting-user` / `waiting-mainline-review`；终态 `completed` / `blocked` / `isolated` / `archived`。
- `blocked`=确有必需条件缺失；`isolated`=因失败/不确定/上下文超限必须停。终态释放持有锁，历史身份保留。

## 支线命名
用户可见名用中文在前：`支线｜<中文任务名>｜<对象>-<阶段><序号>`。内部 ID/日期进登记册，不进侧栏标题。

## GitHub 离线纪律（沙箱不直推）
- 本地提交后生成离线 bundle：`git bundle create "F:/HOLANGbuddy/03_项目资产/system-build-<date>-<topic>.bundle" --all`。
- 沙箱**绝不 push**；由刘总本机 `push_repo.bat`（带 PAT）推送。绝不打印令牌。
- 唯一仓库：`github.com/holang2021/oa` 的 `system-build` 分支。

## 上下文轮转交接
- 会话将超限时：在项目 workspace 写紧凑交接（项目真相文件、未完结支线、持有锁、已完成不可重复的 DispatchKey、禁止动作、下一步），建立新会话后回填新主线 ID，归档旧会话（不删）。
- 复用 `branch-register.md` 的「轮转交接」节作模板。

## 算力分级
- L1：状态读取/定位/提取/清单/登记更新；
- L2：有界内容审阅、单页 QA、正常可逆编辑、结构化综合；
- L3：跨系统架构、难故障、证据冲突、高风险迁移/发布门。
- OA 多数改动 L2，硬迁移 L3。工具失败/限流不自动升算力或重复派工。

## 禁止动作（红线）
- 主线不 inline 写代码、不起服务、不 push。
- 不可逆操作（发布/付费/删库/改 DNS/生产写）一律停机等真人确认。
- 不修改 LOCKED CRM 总纲、不替代域专家判断、不自派专家（清单外升级中枢裁定）。

## 完成报告
报告：完成 / 改动对象 / 验证 / 风险 / 剩余步骤 / 下一步 / 是否需用户确认。长任务在 workspace 留一份简洁 continuation handoff。
