# 候选规则记录（Candidate Record）

> 依据：`project-mainline-orchestrator/references/improvement-governance.md`
> 状态：**approved / active**（刘总 2026-11-02 批准；已落成 `.workbuddy/skills/oa-mainline-orchestrator/SKILL.md`，本记录留存作审计轨迹）

```text
CandidateID:       CAND-OA-MAINLINE-ORCH-20261102
Status:            approved (active)
Observed in project/task:
  OA 系统建设（holang-oa / 销售 CRM）。邮件归集 Phase1 落地后，主线需协调多支线
  （CodeBuddy 写码、主线验收、GitHub 离线不直推、上下文轮转），此前靠人工默契易丢状态、易重复派工。
Trigger and recurrence count:
  本次会话 compaction 续接 + 多轮"主线/支线怎么配合"讨论；痛点复现 ≥2 次
  （上下文轮转丢状态、重复派工风险）。
Expected behavior:
  主线只验收、支线（CodeBuddy）写码、支线有登记/有回报、上下文轮转不丢状态、GitHub 离线不直推。
Actual behavior:
  以上靠人工默契，无正式登记/回报/交接结构；主线易越界 inline 写码/提交；跨会话状态丢失。
Business, reliability, or compute impact:
  主线越界（写码/提交）、跨会话状态丢失、重复劳动、协调不可追踪。
Evidence paths:
  `.workbuddy/branch-register.md`（已建登记册）；本会话上下文。
Existing rule or related candidate:
  project-mainline-orchestrator（通用，只读采纳）；FDE B/C 类权限分级；
  `.workbuddy/memory/MEMORY.md` LOCKED CRM 总纲（不冲突，本候选只管协调层）。
Scope:
  project（OA 项目协调层）；若验证后可跨项目复用，再升级为 global orchestration skill。
Proposed minimal change:
  新增项目级技能 `oa-mainline-orchestrator`，实例化通用协调层 + 固化 HOLANG 规则
  （CodeBuddy 写码 / 主线验收 / GitHub 离线不直推 / 登记册 / 轮转交接 / 红线）。
  草稿见同目录 `draft-oa-mainline-orchestrator.SKILL.md`。
Authority or approval impact:
  改变审批点（定义禁止动作、主线不写码/不起服务/不 push）与适用范围
  → 按 improvement-governance §升级权限，需明确批准。
Validation plan and result:
  用支线2（企业微信企业级邮件授权改造）实跑一次：派工闸门→支线回报→主线 readback→登记；
  对比改造前后派工/验收/轮转是否可追踪。结果：待批准后实施验证。
Rollback:
  候选阶段不建 active 技能；草稿存 candidates/ 可随时删除；无生产/外部写入。
Owner and date:
  主线（holang-fde）/ 2026-11-02
```

## 审批记录
- 2026-11-02 刘总批准（对话指令"批准"）→ 落成 active 项目级技能 `oa-mainline-orchestrator`。
- 已执行：草稿 `draft-oa-mainline-orchestrator.SKILL.md` 移至 `.workbuddy/skills/oa-mainline-orchestrator/SKILL.md`；状态置 `approved/active`。
- 跨项目复用：如需沉淀供其他 HOLANG 项目复用，经 `holang-capability-deposit` 提交中枢判定（当前范围限 OA 项目，未自动升 global）。
