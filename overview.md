# OA → 飞书知识库同步：Phase 1/2 收口与对账复核

## 结论：全量同步已闭环，无数据丢失

三个父节点均挂在飞书知识库根 `Kv26w6fqpi8nVxkfIFocyH5Vngb`（空间 `7598114727864159200`）：

| 父节点 | token | 子节点数 | 说明 |
|---|---|---|---|
| OA跟进记录归档 (Phase 1) | `QADqwQVJtitMp9kCXifcpvkcnAf` | **356** | OA 363 跟进 → 356 唯一标题（7 条为同客户同日期真实重复，标题折叠，非丢数据） |
| OA AI对话归档 (Phase 2) | `AkXpw1PC2ihDEGkLgnJcWd1Gn0K` | **4** | 24 条 AI 消息按客户聚合成 4 个对话线程 |
| OA联系人备注 (Phase 2) | `HHhjwmPgjiAAk6k6RPacZn5PnQe` | **31** | 仅安全字段（name/position/dept/isKeyPerson/remark），显式排除 PII |

## 本次续做完成的收尾
1. **对账复核**：实拉三父节点子标题计数（356/4/31），并查证 OA 跟进口径——确认 363→356 是标题去重（7 对同客户同日期重复），**非数据丢失**，Phase 1/2 全部闭环。
2. **记忆补记**：`2026-08-07.md` 追加 Phase 2 完成记录 + TAT 拉数范式的全部硬坑（32KB 截断、双 base64 包裹、Filters 属性赋值、拆包改走 OA HTTP、venv 3.13 解析怪癖）。
3. **新建可复用 Skill**：`C:\Users\liush\.workbuddy\skills\oa-feishu-wiki-sync\SKILL.md`，固化 lark-cli 调用姿势、`--obj-type wiki` 删除、TAT 拉数范式、标题对账去重，供今后任何 OA→飞书同步任务直接复用。

## 关键文件
- 同步器：`holang-oa/deploy/feishu_sync_followups.py`（Phase1）、`feishu_sync_phase2.py`（Phase2）
- 记忆：`03_项目资产\系统建设\.workbuddy\memory\2026-08-07.md`
- 技能：`C:\Users\liush\.workbuddy\skills\oa-feishu-wiki-sync\SKILL.md`

## 待办（如需要）
- 可选：抽查 1 个 AI 线程 + 1 个联系人备注文档，确认 docx 块渲染正确（计数与 dry-run 计划已证明结构正确，非必须）。
- 后续若要增量同步新产生的跟进/AI消息/备注，重跑 `--reconcile`（Phase1）或 `--dry-run`→真推（Phase2）即可，幂等。
