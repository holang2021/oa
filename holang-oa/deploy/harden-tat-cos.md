# OA 部署硬化方案（TAT + COS 托管，已批准·待服务器到位执行）

> 状态：已批准（2026-08-26），待新服务器到位即执行；当前零生产接触。目标：消灭 TAT 24KB 分块限制与手搓删库风险，零新依赖（不引入 GitHub Actions）。

## 一、现状痛点（待消除）
| 痛点 | 根因 | 本方案如何消除 |
|---|---|---|
| TAT 单命令 ≈24KB 上限 | 大脚本/大文件直接塞 TAT 命令框 | 脚本与产物托管 COS，TAT 只跑一行 `wget|bash` |
| `rm -rf /opt/holang/oa/backend` 删库风险 | 旧全量部署脚本整目录清包 | 改为「先备份再覆盖单文件/目录」，不碰 .env / *.db |
| `prisma db push` 漂移 | 每次手搓 push | 改为 `prisma migrate deploy`（需先生成 migrations/，见待拍板项 2） |
| SQLite 手动管理无备份 | 无自动备份 | 服务器定时 `wal_checkpoint` + `coscli` 上传 COS（按日期） |

## 二、目标架构
```
本地(Git Bash)  --构建+打包+上传COS-->  腾讯云 COS
                                             │
TAT 命令框(仅1行) --wget--┐                  │
                         ▼                  │
                    服务器 /tmp/run-server.sh ── 从 COS 拉取版本包 ──► 备份→覆盖→pm2 restart
```

## 三、本地侧（你的机器，Windows/Git Bash）
```bash
# 1. 前端构建
cd packages/oa && npm run build        # 产出 packages/oa/dist/
# 2. 打包待上服务器文件
tar -czf dist.tar.gz      -C packages/oa/dist .
tar -czf backend-src.tar.gz -C backend src prisma package.json
# 3. 上传到 COS（coscli 凭证已在服务器一次性配置，本地用同款）
VERSION=$(date +%Y%m%d-%H%M)
coscli cp dist.tar.gz          cos://holang-oa/deploy/$VERSION/dist.tar.gz
coscli cp backend-src.tar.gz   cos://holang-oa/deploy/$VERSION/backend-src.tar.gz
coscli cp deploy/run-server.sh cos://holang-oa/deploy/run-server.sh
echo "版本已上传: $VERSION"
```

## 四、TAT 命令框（仅此一行，远小于 24KB）
```
wget -q "https://holang-oa-<APPID>.cos.ap-shanghai.myqcloud.com/deploy/run-server.sh" -O /tmp/run-server.sh && bash /tmp/run-server.sh "<VERSION>"
```

## 五、服务器侧 run-server.sh（见同目录样例）
核心动作：
1. 从 COS 拉取 `<VERSION>/dist.tar.gz` 与 `backend-src.tar.gz`；
2. 备份现有 `app/` 与 `backend/src/` 到 `/tmp/oa_app_bak_<ts>`（安全，非删库）；
3. 解包覆盖（不动 `.env` / `prisma/*.db`）；
4. 后端若 schema 变更 → 走 `prisma migrate deploy`；否则仅覆盖；
5. `pm2 restart holang-oa-backend` + 前端 `app/` 替换；
6. 输出健康检查（`curl -s localhost:3001/api/health`）。

## 六、SQLite 防删库备份（服务器 cron，每日）
```bash
sqlite3 /opt/holang/oa/backend/prisma/holang-crm.db "PRAGMA wal_checkpoint(TRUNCATE);"
DAY=$(date +%Y%m%d)
coscli cp /opt/holang/oa/backend/prisma/holang-crm.db        cos://holang-oa/backup/db/$DAY/holang-crm.db
coscli cp /opt/holang/oa/backend/prisma/holang-crm.db-wal    cos://holang-oa/backup/db/$DAY/holang-crm.db-wal
coscli cp /opt/holang/oa/backend/prisma/holang-crm.db-shm    cos://holang-oa/backup/db/$DAY/holang-crm.db-shm
```
> WAL 模式需在服务器一次性开启：`sqlite3 holang-crm.db "PRAGMA journal_mode=WAL;"`（开启后读写不互斥，备份更安全）。

## 七、风险与回滚
- **回滚**：`/tmp/oa_app_bak_<ts>` 保留最近 N 份，异常时 `cp -r` 还原 + `pm2 restart`。
- **COS 凭证**：`coscli config` 在服务器一次性写入 `~/.cos.yaml`，不进脚本、不进仓库。属「凭证托管」范畴（对应治理提案变更 2）。
- **误删防护**：脚本禁止 `rm -rf /opt/holang/oa/backend`；仅 `cp` 备份 + 覆盖。

## 八、已拍板确认（2026-08-26 刘总拍板）

- [x] 采用「TAT+COS 托管」替代手搓热修（零新依赖，灭 24KB 分块）
- [x] `prisma db push` 升级为 `migrate deploy`（新服务器到位后一次性生成 migrations/，先备份后做）
- [x] 开启 SQLite WAL + 每日 COS 备份（灭删库风险）
- [x] 同步拍板治理提案（里程碑批量会签 + 凭证托管，杠杆最大）

> 落地前置（新服务器到位后，由 tech-lead 在授权范围内执行）：①服务器 `coscli config` + 开启 WAL；②本地装 `coscli`；③按 `run-server.sh` 推首版。均不碰生产代码，受审计留痕。
