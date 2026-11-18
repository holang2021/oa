# OA-DB-003：PostgreSQL 原生 SQL 兼容性审计

日期：2026-11-18
状态：审计完成；补充 PostgreSQL 基线与专项集成测试待批准。

## 已验证证据

- GitHub Actions 临时 PostgreSQL 16 基线已成功：当前 Prisma schema 可建空库并生成 baseline SQL。
- 第二轮临时库已成功完成 Prisma Client 生成及 `User` 的写入、读取、删除烟雾验证：`https://github.com/holang2021/oa/actions/runs/40430162642`。
- 以上运行不连接 SQLite 源库、不装载业务数据，任务结束后临时数据库销毁。

## 发现

| 对象 | 当前状态 | PostgreSQL 结论 | 后续动作 |
|---|---|---|---|
| Prisma schema 业务模型 | 临时基线已成功建立 | 基础模型兼容已验证 | 扩展关键流程集成测试 |
| `todos` | 已有 Prisma `Todo` 模型 | 随 Prisma 基线建立 | 在 PostgreSQL 路径验证离职交接待办流程 |
| `currencies`、`code_rules`、`field_configs` | 不在 Prisma schema；由 `backend/sql/setup_config_tables.sql` 建表 | 现有脚本使用 `datetime('now')`、`INSERT OR IGNORE`、SQLite 0/1 语义，不能直接用于 PostgreSQL | 建立独立 PostgreSQL 补充 DDL 与初始化策略 |
| 原生 SQL 服务 | `codeRule`、`currency`、`fieldConfig`、`todos`、`offboarding` 及部分控制器/仓储使用 `$queryRawUnsafe` / `$executeRawUnsafe` | 多数 `$1` 参数和 `CURRENT_TIMESTAMP` 写法需要临时 PostgreSQL 实测，不能只凭静态阅读判定 | 以独立事务和测试数据验证读写、唯一约束、时间字段和清理 |
| 历史 migrations | 同时含 SQLite 与 PostgreSQL 方言 | 不可作为 PostgreSQL 重放链路 | 保持 SQLite 历史不变，继续从当前 schema 构建独立 PostgreSQL 基线 |

## 对象锁与门禁

- `backend/prisma/schema.prisma` 维持只读源，不改为 PostgreSQL provider。
- `backend/sql/setup_config_tables.sql` 只读审计，不复用到 PostgreSQL。
- 下一项 `OA-DB-004` 的候选范围为独立 PostgreSQL 补充 DDL、临时 CI 初始化和专项集成测试；不得修改 SQLite 数据库、历史迁移或生产部署。
- 创建任何可执行 PostgreSQL DDL/迁移文件前，需要明确批准；实际数据迁移、预发布部署和生产写入仍需分别批准。
