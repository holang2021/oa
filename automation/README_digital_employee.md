# HOLANG 数字员工落位与会前准备编排器

## 文件清单

| 文件 | 说明 |
|---|---|
| `digital_employee_orchestrator.py` | 主编排脚本 |
| `holang_employee_config.json` | 默认配置（HOLANG-中枢-001） |
| `digital_employee_report.json` | 默认 dry-run 报告 |
| `README_digital_employee.md` | 本说明 |

## 运行方式

```bash
# 只读演示（默认，不会发送真实提醒）
python digital_employee_orchestrator.py --config holang_employee_config.json --dry-run

# 真实运行（会调用 wecom_msg 发送提醒）
python digital_employee_orchestrator.py --config holang_employee_config.json --no-dry-run
```

## 状态机

```
UNINIT -> ONBOARDING -> READY -> MEETING_PREP -> STANDBY
```

- **ONBOARDING** 含 4 步：环境检查、身份/账号注册、基础资源分配、能力注册与绑定。
- **MEETING_PREP** 含 4 步：日程检索、会议材料整理、待办事项汇总、参会提醒设置。

## 兜底机制

| 异常场景 | 兜底动作 | 是否阻塞流程 |
|---|---|---|
| 环境检查缺失运行时 | 标记缺失，继续注册能力 | 否 |
| 连接器不可用 | 使用本地/空数据降级 | 否 |
| 身份无法解析 | 转 `HUMAN_ESCALATION` | 是（会前准备跳过） |
| 会议材料缺失 | 标记缺失，提醒会中补充 | 否 |
| 待办查询失败 | 空待办，不阻塞提醒 | 否 |
| 任意步骤抛异常 | 捕获、记录、继续 | 否 |

## HOLANG 专家团映射

脚本把 HOLANG 专家团（holang-digital-product-owner、holang-tech-lead 等）注册为数字员工的可用能力，实际调用时由 `expert_registry` 连接器完成注册，知识检索由 `lark_wiki` / `holang-knowledge-query` 完成。

## 集成升级路径

当前实现为可运行的骨架，连接器为 stub，真实环境需替换为：
- `lark_calendar` → `lark-calendar` skill / lark-cli
- `lark_wiki` → `lark-wiki` / `holang-knowledge-query`
- `lark_task` → `lark-task`
- `wecom_msg` → `wecomcli-msg`（AgentID 1000083）
- `identity_resolver` → `holang-identity-resolver`
- `expert_registry` → `holang-expert-registry`
