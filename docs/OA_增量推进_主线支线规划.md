# OA 增量推进 · 主线与支线规划（2026-10-27 起）

> 原则（刘总 2026-10-27 裁定）：以当前对话为主线，主线把握方向、支线完善细节；增量开发策略推进；GitHub FIRST（每步立即 commit 进 `system-build` + 生成离线 `*.bundle`，push 走 A 路径待刘总授权）。

## 主线（方向 · 把握）

1. **GitHub FIRST 增量节奏**
   - 任何改动/交付物先本地 `commit` 进 `system-build`，再生成离线 `*.bundle`（落 `F:/HOLANGbuddy/03_项目资产/`）供刘总本机 A 路径（双击 `推送system-build.bat`）推送。
   - 本沙箱**不执行 `git push`**（三重网络/权限阻塞 + 需刘总授权）。push 由 A 路径兜底。
   - 已落地：`.gitignore` 加固 `push_repo.bat` / `github_token.txt` / `push_result.txt` / `_push_check.tmp` 不入库存明文 PAT。

2. **PostgreSQL CI 质量门禁（定位）**
   - 新增 `.github/workflows/oa-postgresql-baseline.yml`：用 GitHub Actions 临时起 PostgreSQL 16，验证 Prisma schema 在 PG 上的 `validate` + `db push` + smoke。
   - **定位 = 质量门禁 / 可移植性验证，非数据库迁移决策**。意图待刘总最终确认（默认=质量门禁）；无论意图，CI 须先能跑通。
   - 注意：当前生产库为 SQLite（`server_backup/.../holang-crm.db`）；PG CI 验证的是 schema 可移植性，不直接改变生产数据库类型。

3. **CRM 增量推进 + 验收闭环**
   - 10-14 爆发的 CRM 功能（商机意向产品 → 商机 → 订单交接 → 从订单详情发起收款）已推 `origin`，但**未经代码侧验收签字**。须补验收（参照 10-06 签字单范式），降「仅代码未验证」风险。

## 支线（细节 · 完善）

| 支线 | 内容 | 状态 |
|---|---|---|
| 支线1 | 修 CI 完整性：`postgresql-ci-smoke.ts` 入库 + yml 加 smoke 步骤，使 CI 可触发验证 | ✅ 2026-10-27 完成 |
| 支线2 | 收口工作区脏文件（未跟踪 scratch：`frontend-preview/`、`outputs/`、`_redact_filter.sh`、05运行记录临时 json、`OA_…-2026-10-06.md` 副本）→ 归档或加 gitignore | ⬜ 排期 |
| 支线3 | 补 10-14 CRM 功能代码侧验收签字 | ⬜ 排期 |
| 支线4（硬阻塞·需刘总） | 推进生产服务器恢复（给新实例 ID/公网 IP 或确认重建）→ 恢复后 `_verify_*.py` 补端到端生产验证 + 一键推送 | 🔴 待刘总 |

## 当前状态指针

- 本地 `system-build` 领先 `origin/system-build` 的提交数：每次 commit 后更新（2026-10-27 修 CI 完整性后 +3）。
- 生产服务器 `ins-4xm95czz` 自 2026-08-27 离线，`oa.holangchina.com` 不可达 → 所有「已完工」功能推不上去。
- 已落地待生产验证：offboarding / contact 治理 / GOV-026 四功能（10-06 验收签字单代码侧通过）。
- 详细日志见 `.workbuddy/memory/2026-*.md`；移交包 `docs/OA系统逻辑梳理与Codex接手指南.md`。
