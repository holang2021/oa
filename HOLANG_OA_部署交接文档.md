# HOLANG OA 服务器部署交接文档

> 生成时间：2026-07-08 14:20
> 来源：holang-oa 项目（WorkBuddy 本地开发完成，待部署上线）
> 目标：部署到腾讯云服务器，绑定域名 oa.holangchina.com，接入企微自建应用 AgentID 1000081

---

## 一、项目架构

```
用户浏览器
  │ https://oa.holangchina.com
  ▼
Nginx (80→443, SSL)
  ├── /*              → /var/www/oa/dist/        (前端静态文件)
  ├── /api/*          → http://127.0.0.1:3001     (反向代理到后端)
  └── /auth-callback.html → 前端静态文件           (OAuth回调页)

后端: Express + Prisma + SQLite  →  127.0.0.1:3001
```

---

## 二、需要上传的文件

### 前端（静态文件，Nginx 托管）
- 本地路径：`C:\Users\liush\.workbuddy\skills\系统建设\holang-oa\packages\oa\dist\`
- 服务器目标：`/var/www/oa/dist/`
- 内容：index.html + assets/（CSS + JS，打包产物）

### 后端（Node.js 应用，pm2 托管）
- 本地路径：`F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\backend\`
- 服务器目标：`/opt/holang-oa/`
- 需要上传整个 backend/ 目录（含 src/、prisma/、package.json、.env、node_modules/ 可选）

### 数据库
- 本地路径：`C:\Users\liush\.workbuddy\skills\系统建设\holang-oa.db`
- 服务器目标：`/opt/holang-oa/data/holang-oa.db`
- 类型：SQLite（394 客户，68 外销，完整业务数据）

### Nginx 配置
- 本地路径：`F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\deploy\nginx-oa.conf`
- 服务器目标：`/etc/nginx/sites-available/oa.holangchina.com`
- 已配置好：SSL + API代理 + SPA fallback + gzip

---

## 三、服务器操作步骤

### Step 1: 创建目录 & 上传文件
```bash
# 创建目录
mkdir -p /var/www/oa/dist
mkdir -p /opt/holang-oa/data

# 上传（在本地 Windows 执行）
# 前端
scp -r "C:\Users\liush\.workbuddy\skills\系统建设\holang-oa\packages\oa\dist\*" root@你的服务器IP:/var/www/oa/dist/

# 后端
scp -r "F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\backend" root@你的服务器IP:/opt/holang-oa/

# 数据库
scp "C:\Users\liush\.workbuddy\skills\系统建设\holang-oa.db" root@你的服务器IP:/opt/holang-oa/data/

# Nginx
scp "F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\deploy\nginx-oa.conf" root@你的服务器IP:/etc/nginx/sites-available/oa.holangchina.com
```

### Step 2: 服务器上安装依赖
```bash
cd /opt/holang-oa/backend

# 确保有 Node.js 22+
node -v

# 安装依赖
npm install

# 生成 Prisma 客户端（必须！）
npx prisma generate
```

### Step 3: 修改 .env 配置
编辑 `/opt/holang-oa/backend/.env`：
```bash
DATABASE_URL="file:/opt/holang-oa/data/holang-oa.db"
PORT=3001
NODE_ENV=production
JWT_SECRET=holang-crm-dev-secret-2026

# 企微 OAuth 2.0 (AgentID 1000081)
WECOM_OAUTH_SECRET=wLHXr64De3g...           # ← 真实 Secret，已填入
WECOM_CORPID=wwe74343b7a90d201f
WECOM_CORPSECRET=LTDZ1C1bajHveiKxjesWxJ5wed6YRw9Gm7SmFXZJzNo   # 通讯录用 1000078
OAUTH_REDIRECT_URI=https://oa.holangchina.com/auth-callback.html
```

> ⚠️ JWT_SECRET 建议改为随机字符串（生产安全）

### Step 4: 启动后端
```bash
# 安装 pm2（已有则跳过）
npm i -g pm2

# 启动
cd /opt/holang-oa/backend
pm2 start "npx tsx src/index.ts" --name holang-oa

# 开机自启
pm2 save
pm2 startup

# 查看日志
pm2 logs holang-oa
```

### Step 5: 配置 Nginx
```bash
# 启用站点
ln -s /etc/nginx/sites-available/oa.holangchina.com /etc/nginx/sites-enabled/

# SSL 证书（Let's Encrypt 免费）
certbot --nginx -d oa.holangchina.com

# 检查配置
nginx -t

# 重载
nginx -s reload
```

### Step 6: 验证
```bash
# 后端健康检查
curl http://127.0.0.1:3001/health

# OAuth 接口
curl http://127.0.0.1:3001/api/v1/auth/wecom/url

# 前端
curl https://oa.holangchina.com/
```

---

## 四、企微后台配置（在企微管理后台手动操作）

1. **应用管理 → 找到 AgentID 1000081 的应用（名称：HOLANG Buddy 或自行命名的 OA 应用）**

2. **网页授权及JS-SDK**
   - 「网页授权回调域名」→ 填入 `oa.holangchina.com`（不带 https://）

3. **工作台应用**
   - 「应用主页」→ 填入 `https://oa.holangchina.com`
   - 勾选「在工作台展示」

4. **企业可信 IP**
   - 添加服务器的公网 IP

---

## 五、OAuth 登录流程（部署后验证）

```
用户从企微工作台点开 OA 应用
  → 跳转企微授权页（如果首次）
  → 同意授权
  → 回调 https://oa.holangchina.com/auth-callback.html?code=xxx&state=xxx
  → auth-callback.html 自动向后端 POST /api/v1/auth/wecom/login
  → 后端用 code 换取 UserID → 匹配/创建本地用户 → 签发 JWT
  → 前端自动跳转到主页，登录完成
```

首次登录的用户会**自动创建账号**（默认角色 SALES），管理员后续可在系统内调整。

---

## 六、现有用户

| 用户名 | 角色 | 说明 |
|--------|------|------|
| admin / admin@holang.com | ADMIN | 管理员账号 |
| 系统迁移管理员 | ADMIN | 系统迁移时创建 |

⚠️ 两个账号都只有 bcrypt 哈希密码，登录只能用企微 OAuth。如果需要用户名密码登录，需在服务器上重新设置密码。

---

## 七、备用：本地开发环境

| 服务 | 地址 | 启动命令 |
|------|------|----------|
| 前端 | http://localhost:8080 | `cd holang-oa/packages/oa && npx vite preview --port 8080 --host 0.0.0.0` |
| 后端 | http://localhost:3001 | `cd holang-oa/backend && npx tsx src/index.ts` |

---

## 八、项目路径清单

| 用途 | 本地路径 | 服务器路径 |
|------|----------|-----------|
| 前端 dist | `C:\Users\liush\.workbuddy\skills\系统建设\holang-oa\packages\oa\dist\` | `/var/www/oa/dist/` |
| 后端代码 | `F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\backend\` | `/opt/holang-oa/backend/` |
| 数据库 | `C:\Users\liush\.workbuddy\skills\系统建设\holang-oa.db` | `/opt/holang-oa/data/holang-oa.db` |
| Nginx 配置 | `F:\HOLANGbuddy\HOLANG项目\销售管理系统\holang-oa\deploy\nginx-oa.conf` | `/etc/nginx/sites-available/oa.holangchina.com` |
| Nginx 模板 | `C:\Users\liush\.workbuddy\skills\系统建设\holang-oa\packages\oa\public\auth-callback.html` | `/var/www/oa/dist/auth-callback.html` |

---

## 九、一句话总结

> 把 4 样东西传到服务器（前端 dist、后端 backend、数据库 holang-oa.db、Nginx 配置），改一下 .env 里的数据库路径，npm install + prisma generate，pm2 启动，Nginx 配好 SSL，企微后台填上回调域名和主页 URL，就上线了。
