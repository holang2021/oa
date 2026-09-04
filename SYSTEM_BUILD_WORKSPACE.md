# HOLANG · 系统建设工作空间（System Build Workspace）

> **唯一的代码与配置变更集成点。** 所有 OA / 系统建设相关的代码、配置改动，一律在此空间内完成并提交，禁止在其它副本并行修改。
> 制定：2026-08-31｜修订：2026-09-01（纠正此前误用副本问题）

---

## 一、唯一集成点（Canonical Path）

| 项 | 值 |
|---|---|
| **规范路径** | `F:\HOLANGbuddy\03_项目资产\系统建设` |
| 解析后真实路径 | `F:\CODEX\Projects\06_HOLANGbuddy\03_项目资产\系统建设` |
| Git 仓库根 | 上述目录本身（内含 `.git`） |
| 当前分支 | `system-build` |
| 远端 | `origin → https://github.com/holang2021/oa.git` |
| 主项目子目录 | `holang-oa/`（后端 `backend/` + 前端 `packages/oa/`） |

> ⚠️ `F:\HOLANGBUDDY` 是指向 `F:\CODEX\Projects\06_HOLANGbuddy` 的 junction 别名，**两者是同一份物理文件**。日常用规范路径即可，但 git 操作若遇路径解析异常，改用 CODEX 真实路径。

### 为什么是这里（判据，非拍脑袋）
1. **唯一带 GitHub 远端**的仓库（`holang2021/oa`），具备真正的同步与可追溯能力；
2. **活跃提交历史**：含「批次1-A/B MVP主闭环」「订单管理筛选+工作台拖拽」「生产库 schema 对齐」等正式开发记录；
3. **技术栈最完整**：已具备 `repositories` 数据访问层、`packages/oa` 前端、Prisma schema 对齐生产库；
4. 它**同时承载**了离职继承（offboarding）、客户AI、飞书同步等当前主线的真实代码。

---

## 二、⚠️ 禁止使用的副本（此前踩坑，务必记住）

| 路径 | 状态 | 处置 |
|---|---|---|
| `F:\HOLANGbuddy\03_项目资产\HOLANG项目\销售管理系统\holang-oa` | **陈旧/脏副本**（根目录残留 `gen_world_map.py`、`wecom_users_raw.json`、`world-map.html` 等垃圾；技术栈落后；无远端） | **禁止再改**。待刘总确认后隔离或删除，防止双副本漂移 |
| `F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa`（= 上面这个的 CODEX 路径） | 同上（同一份） | 同上 |
| `C:\Users\liush\.workbuddy\skills\系统建设\holang-oa` | **已不存在** | 引用到即视为死链 |
| `holang-sales-crm` | **已不存在** | 引用到即视为死链 |

> **教训（已沉淀）**：2026-08-31 曾在该陈旧副本上做了密钥清除与类型修复，属**改错对象**——真正的安全隐患（3 个硬编码真实密钥）一直留在正确工作区里未被处理，直到 2026-09-01 才被发现并修复。
> **纪律：动手改代码前，先确认 `git rev-parse --show-toplevel` 指向 `...\03_项目资产\系统建设`。**

---

## 三、目录布局

```
03_项目资产/系统建设/
├── .git/                  ← 版本库根（含全部提交历史）
├── .gitignore             ← 覆盖 .env / *.db / *.db.bak* / node_modules / dist / dist_bak*
├── SYSTEM_BUILD_WORKSPACE.md   ← 本文档（治理锚点）
├── holang-oa/             ← 【主项目】
│   ├── backend/
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── controllers/   路由处理器
│   │   │   ├── services/      业务逻辑
│   │   │   ├── repositories/  数据访问层
│   │   │   ├── routes/        路由注册
│   │   │   ├── middleware/    auth / rbac 权限
│   │   │   ├── constants/     roles 等常量
│   │   │   └── utils/         jwt 等工具
│   │   └── .env               ← 【密钥唯一源】gitignored，绝不入库
│   ├── packages/oa/       ← 【前端】React + Vite
│   ├── deploy/            部署脚本（含 _probe_* 探针，待清理）
│   └── docs/              项目文档
├── holang-admin/          早期管理端（评估是否保留）
├── docs/ / prototypes/ / automation/   设计稿与自动化
└── *_backup_*             安全网备份（仓库外，不进集成点）
```

---

## 四、密钥与配置规则（红线）

1. **密钥唯一源 = `holang-oa/backend/.env`**（已被 `.gitignore` 覆盖，绝不入库）。
   必需变量：`JWT_SECRET` / `WECOM_CORPID` / `WECOM_CORPSECRET` / `WECOM_OAUTH_SECRET` / `OAUTH_REDIRECT_URI` / `DATABASE_URL` / `PORT`。
2. **代码禁止硬编码任何密钥**，一律 `fail-fast`：
   ```ts
   const X = process.env.X
   if (!X) throw new Error('X is not configured')
   ```
   禁止 `process.env.X || '真实值'` 这种「降级到真密钥」写法。
3. **公开标识 ≠ 密钥**（全员红线，已三次误判）：
   - `corpid` / `appid` = 公开配置（等同租户 ID），保留默认值**不算**密钥暴露；
   - `corpsecret` / `token` / **JWT 签名密钥** = 真密钥，必须 fail-fast。
   - **定级按"能造成什么后果"排，不按"像不像密钥"排**——JWT 签名密钥可伪造任意用户身份，危害高于企微 corpsecret，最易被漏判。
4. **定级前必答三问**：① 它在生产真的生效吗？② 它离开本机了吗（有远端/会进镜像吗）？③ 拿到它能干成什么？

---

## 五、提交与同步规范

### 提交前（三步校验，缺一不可）
```bash
git status --porcelain                      # 看改动清单
git add -u                                  # 暂存已跟踪修改（避免 add -A 被 nul 等垃圾阻断）
git add <明确的源码目录>                     # 定向暂存新源码文件
git diff --cached --name-only | grep -iE "node_modules|/\.env$|dist_bak|\.db$"   # 必须无输出
```
> ⚠️ **禁用 `git add -A`**：工作区存在 `nul`（Windows 保留名）及大量探针脚本，会导致 `add -A` 静默失败（暂存 0 文件）。

### 提交信息规范（Conventional Commits）
```
security:  密钥/权限相关
fix:       Bug 修复
feat:      新功能
chore:     收口/整理/搬迁
docs:      文档
```
**安全类变更必须单独提交**，不与功能开发混在一起，便于追溯与审计。

### 同步（推送远端 = 外部分发，不可逆）
> ⚠️ **2026-09-04 校正**：本节此前所载"领先 2 个提交（`0a4cc8b` 安全修复、`4da3abe` 全量落地）"**与事实不符**。
> 经 `git branch -a --contains` 验证，这两个提交不属于任何分支（孤儿提交）；真实状态是改动停留在
> 暂存区未提交，一周成果无任何 commit 保护。现已重新落地为 **4 个正式提交**：
> `5ed90d8`（security 密钥 fail-fast）、`f8a7e36`（chore .gitignore 补强）、
> `eb8f80e`（chore 全量收口）、`f3b435c`（fix 类型错误）。
> 当前本地 `system-build` 分支**领先 origin 4 个提交**。
- 推送前必须：① 刘总明确授权 ② 确认历史无密钥残留 ③ 确认无协作者正在基于旧历史工作。
- **在刘总授权前，不得执行 `git push`。**

---

## 六、已知 Backlog（按优先级）

| # | 事项 | 状态 |
|---|---|---|
| 0 | 🔴 **生产数据缺口**：服务器 `ins-4xm95czz` 于 2026-08-27 被回收（实测 `115.159.101.193:443` 不通、`oa.holangchina.com` 站点与接口全挂）。本地最新生产库备份仅到 **2026-08-11 14:57**（`server_backup/2026-08-16/backend/prisma/holang-crm.db`）。**8-12 至 8-27 约 16 天数据无本地副本**，能否找回取决于腾讯云是否留有快照 | 🔴 待刘总查快照 |
| 1 | **企微密钥轮换**：3 个密钥曾以明文写入代码并可能已进历史（共 3 个，值见 gitignored 的 backend/.env，本文档不记录明文）。建议在企微后台重置并把新值填回 `.env`——轮换后历史泄露自动失效 | 🔴 待刘总执行 |
| 2 | **陈旧副本处置**：`HOLANG项目\销售管理系统\holang-oa` 隔离或删除（不可逆，需刘总确认） | 🔴 待确认 |
| 3 | **推送 GitHub**：本地领先 2 提交，待授权 | 🟡 待授权 |
| 4 | **垃圾清理**：`nul` 保留名文件、`deploy/_probe_*.py` 探针、`packages/oa/dist_bak*` 与 `dist-verify`、`backend/*.cjs` 探针、根目录 `fix_*.py` / `.tmp_*.py` | 🟡 排期 |
| 5 | **后端类型债**：2026-09-04 实测基线 **11 处**（`npx tsc --noEmit`，此前在错误副本统计的 180 对本工作区无效）。**根因已定位**：`tsconfig` 的 `strict:false` 关闭了 `strictNullChecks`，导致 zod 推断的对象字段全部退化为可选，与 Service/Prisma 的必填入参冲突。已实测：开启 `strictNullChecks` 后这 11 处**全部消失**，但会暴露约 17 处真实空值隐患（如 `req.user` 可能为 undefined）。已修 5 处（16→11）。**不影响 tsx 运行** | 🟡 根因已定位，待定方案 |
| 6 | ~~前端缺失页面~~：2026-09-04 核对完毕，`packages/oa/src/pages/` 已含 Orders / Deliveries / Invoices / Payments / Approval* / PrintTemplates 等，**非缺口** | ✅ 已关闭 |
| 8 | **未跟踪资产待定**：工作区另有 114 个未跟踪条目（`docs/` 历史文档、`prototypes/`、`automation/`、`05_运行记录/`、`wecom-app-1000081/`）。是否入库需在推送 GitHub 前决策（推送=外部分发） | 🟡 待刘总定 |
| 7 | 深层分层重构（补 types 层、消除重复）：高风险，需测试护航 | ⚪ 暂缓 |

---

## 七、复核纪律

- **reviewer ≠ setter**：中枢（数字化执行中枢）不得自审自关；重大变更完成后须路由**审计复核专家（holang-audit-review）**独立复核签字。
- 刘总在场并授权「收口」时，其授权即组织最终权威，满足独立复核要求。
- 本次（2026-09-04 复核，证据链已重取）：源码密钥扫描 PASS（命中的 5 行均为 URL 参数名拼接与 fail-fast getter，无硬编码真值）、暂存清单无敏感项（`.env` / `*.db` / `node_modules` 零命中）、提交 `5ed90d8` + `f8a7e36` + `eb8f80e` + `f3b435c`。
- ⛔ 前次（2026-09-01）所载证据提交 `0a4cc8b`、`4da3abe` 经查为**孤儿提交**，证据链作废，不得再引用。
- ⚠️ 教训：`tsc --noEmit` 的输出**不得用 `tail` 截断后计数**——2026-09-04 曾因此把 16 处错误误报为 9 处。统计错误数须完整输出后计数。
