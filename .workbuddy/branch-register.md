# OA 项目 · 主线/支线登记册（Mainline–Branch Register）

> 协调层（已批准生效）：`.workbuddy/skills/oa-mainline-orchestrator/`（由通用 project-mainline-orchestrator 按 HOLANG 规则实例化）
> 来源通用 skill：`F:\CODEX\Home\skills\project-mainline-orchestrator\`（只读采纳，不改其本体）
> 状态：2026-11-02 刘总批准，已落成 active 项目级技能；候选记录留存于 `.workbuddy/skills-governance/candidates/` 作审计轨迹。
> 采纳方式：本登记册由**主线**维护，与已生效技能配套，不动 OA 业务规则。
> 模式：`mainline + branches`
> 当前主线：本对话（项目 `系统建设` / git 分支 `system-build`）

## 项目真相文件（轮转时不丢）
- 代码仓：`F:\HOLANGbuddy\03_项目资产\系统建设`（git，分支 `system-build`）
- 离线 bundle：`F:\HOLANGbuddy\03_项目资产\system-build-full-20261101-email.bundle`
- 日常日志：`.workbuddy/memory/2026-11-01.md`
- 长期记忆 / LOCKED 总纲：`.workbuddy/memory/MEMORY.md`
- 看板：`docs/OA与网站_单线推进看板.html`；移交包：`docs/OA系统逻辑梳理与Codex接手指南.md`

## 状态机（终态定义）
- 非终态：`not-created` / `running` / `waiting-user` / `waiting-mainline-review`
- 终态：`completed` / `blocked` / `isolated` / `archived`
- `blocked` = 确有必需条件缺失；`isolated` = 因失败/不确定/上下文超限必须停。

## 派工闸门（每次派 CodeBuddy 前查 7 项）
1. 同 `WorkItemID` 无非终态项在跑
2. `DispatchKey` 未产生过结果
3. 无冲突 `ObjectLock`
4. 基线仍新
5. 依赖已满足
6. 动作在范围内、可逆
7. 有并发槽位

---

## 支线登记

### 支线 1 ｜ 邮件自动归集进时间轴（OA-email-01）
```
WorkItemID:        OA-EMAIL-PHASE1
DispatchKey:       OA-EMAIL-PHASE1-20261101-gen1
Branch title:      支线｜邮件自动归集进时间轴｜OA-email-01
Status:            completed（主线已 readback 验收）
Object & access:   holang-oa/backend + holang-oa/packages/oa（WRITE）
ObjectLock:        backend/src/* 邮件相关、packages/oa/src/pages/CustomerDetail.tsx（独占）
Baseline checked:  system-build @ 83db5ed（派工前）
Expected delta:    新增 EmailBinding/EmailMessage 两模型+迁移+加密(AES-256-GCM)+imapflow 同步服务+
                   两控制器+两路由+前端邮件箱 Tab+绑定弹窗+未回复提醒(48h)+打开追踪
Actual delta:      +2195 行 / 16 文件
Validation:        后端 tsc --noEmit EXIT=0；前端 npm run build EXIT=0；prisma db push 预览库通过；smoke 全过；
                   主线在线验收：/email-bindings 401(路由+鉴权生效)、三接口 token 实测 code:0 结构正确、
                   前端 dist 含"邮件箱"
Evidence:         commit f59cd6a；bundle system-build-full-20261101-email.bundle；.workbuddy/memory/2026-11-01.md
Untouched:        既有表/列未改（非破坏性迁移）
Risks/blocker:    真实腾讯企业邮箱 IMAP 同步未实测（缺授权码）；IMAP 同步的历史外发信打开追踪仅以 \Seen 近似
User decision:    是否改走"企业微信企业级邮件授权"（见支线 2）
Next action:      待真实授权码 → 派 CodeBuddy 实测同步；并启动支线 2
```

### 支线 2 ｜ 企业微信企业级邮件授权改造（OA-email-02）【规划中，未派发】
```
WorkItemID:        OA-EMAIL-WECOM-AUTH
DispatchKey:       （未派发）
Branch title:      支线｜企业微信企业级邮件授权｜OA-email-02
Status:            not-created（规划中，待刘总正式点头 + 企业微信 OA 应用开"邮件"权限）
Object & access:   EmailBinding 模型、emailSync 服务、后台"邮箱集成"配置页（WRITE）
ObjectLock:        同支线 1 对象（须串行，不可替代进行中支线）
Baseline checked:  f59cd6a
Expected delta:    EmailBinding 改为"公司级一条授权"(scope=company)，凭证复用现有 wecom.app_*
                   （不新增员工密码）；同步逻辑接企业微信邮件 API；新增后台"邮箱集成"页
                   （管理员配一次）；IMAP 降为可选高级模式
Validation:        （待派发后由支线回报）
Evidence:          （待填）
Risks/blocker:     企业微信邮件 API 权限范围待核实（能否集中读全员邮件）；
                   若仅单邮箱则需"归档/全员 BCC"兜底（员工侧体验不变：仍一次性授权）
User decision:     刘总已倾向统一企业授权，待正式确认 + 企业微信侧开权限
Next action:       刘总确认 → 派 CodeBuddy 核实 API 范围 + 改造为公司级授权模型
```

---

### 支线 3 ｜ 上线就绪安全与部署修复（OA-go-live-01）【派发中】
```
WorkItemID:        OA-GOLIVE-HARDENING
DispatchKey:       OA-GOLIVE-HARDENING-20261102-gen1
Branch title:      支线｜上线就绪安全与部署修复｜OA-go-live-01
Status:            completed（主线已 readback 验收；含强制改密闭环补全）
Object & access:   docker-compose.yml、.env.example、backend/prisma/schema.prisma(+迁移)、
                   backend/prisma/seed.ts、backend/src/utils/encryption.ts、
                   backend/src/services/auth.service.ts、backend/src/controllers/auth.controller.ts、
                   packages/oa/src/pages/Login.tsx、packages/oa/nginx.conf（新建）
ObjectLock:        上述文件独占；与支线 2（未派发）错峰，无冲突
Baseline checked:  system-build @ 6747f0c
Expected delta:
  ① 密钥外置：docker-compose 移除硬编码 POSTGRES_PASSWORD/JWT_SECRET/DATABASE_URL，
     改 ${VAR} 插值（compose 自动读同目录 .env，已 gitignore）；新增 EMAIL_CRED_ENCRYPTION_KEY 注入；
     .env.example 仅留占位（无真实密钥，受权限钩子保护可能无法读写，被拦则回报）。
  ② 默认账号改密：User 模型加 mustChangePassword(Boolean, default false)+迁移；seed 三账号置 true；
     authenticateUser 返回该标志；首次用默认密码登录时强制改密；前端 Login 引导改密。
     闭环缺口修复（必要）：因既有 PUT /api/v1/auth/change-password 路由挂 authenticate 中间件（需 token，
     首次登录无 token 会 401），新增免鉴权但须凭旧密码校验的 POST /api/v1/auth/force-change-password
     专供首次改密（涉及 backend/src/routes/auth.routes.ts，已纳入本支线范围），前端改用之。
  ③ 部署对齐：docker-compose 后端 DATABASE_URL 改 SQLite file:/data/holang-crm.db + 挂载卷；
     移除未用的 postgres 服务；prisma migrate deploy 兼容 SQLite；前端 volume
     ./frontend/dist→./packages/oa/dist，新建 packages/oa/nginx.conf（反代 /api/v1→backend:3000 + 静态）；
     backend/frontend 加 healthcheck（/health）。
  数据库选型决策：本支线采用"部署侧也用 SQLite"（与本地一致、零风险）；若刘总坚持生产用 Postgres，
     需另起 L3 迁移（不在本支线）。
Validation:        后端 tsc --noEmit EXIT=0；前端 npm run build EXIT=0；prisma validate；lint；
                   docker 运行时由刘总本机验证（沙箱不可跑 docker）
Evidence:          commit（见 git log 本支线提交）；bundle system-build-20261102-golive-hardening.bundle；.workbuddy/memory/2026-11-02.md
Risks/blocker:     .env.example 受权限钩子保护，可能需刘总本地手动清历史密钥；
                   git 历史仍含旧密钥，需轮换+可选历史清理；本地 dev 仍用 SQLite（不变）。
                   附：既有迁移文件为 PostgreSQL 写法（含 CREATE TYPE...ENUM/TIMESTAMP(3)），
                   `migrate deploy` 在 SQLite 必败；团队本地本就用 `prisma db push`。
                   故 docker 部署 command 由 `migrate deploy` 改为 `prisma db push`（已改 docker-compose.yml）。
User decision:     数据库选型（SQLite 对齐 vs Postgres 迁移）已暂定 SQLite 对齐，待刘总确认
Next action:       刘总本机补 .env（基于占位）+ `docker compose build && up` 运行时验证；清理 .env.example 历史密钥 + 轮换 JWT/DB 密钥；git 历史含旧密钥，建议 BFG 清理（可选）
```

## 历史已落地（参考 MEMORY.md，不重复登记）
offboarding 离职继承、Contact 治理、GOV-026 四功能、报价单同步（空壳暂不同步）、
RBAC/审批流（待）、huoban_export 硬编码 key 清理（待）。详见 `.workbuddy/memory/MEMORY.md`。

## 轮转交接（下次上下文超限/换会话时填此节）
- Old mainline ID: 本对话
- New mainline ID: （建新会话后填）
- Project truth files: 见上"项目真相文件"
- Active non-terminal: 支线 2（not-created，待派发）
- Waiting approvals: 支线 2 需刘总正式点头 + 企业微信 OA 应用开"邮件"权限
- Held object locks: 无（支线 1 已释放）
- Completed dispatch keys that must not repeat: OA-EMAIL-PHASE1-20261101-gen1
- Forbidden actions: 主线不 inline 写代码 / 不起服务 / 不 push；沙箱不直推 GitHub
- First next-action: 刘总确认企业微信企业级授权 → 派 CodeBuddy 改造
