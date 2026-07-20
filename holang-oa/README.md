# HOLANG销售内部管理系统

工业制氮/制氧/制氢设备制造商的销售CRM系统。

## 功能模块

- 客户/线索管理
- 销售机会/漏斗管理
- 报价/合同管理
- 库存/产品管理
- 通讯录管理（企微同步）
- 销售目标/业绩看板
- 报表管理
- 代理商报备系统
- 伙伴云数据迁移

## 技术栈

- 前端：Vite + React 18 + TypeScript + MUI v5 + Tailwind CSS
- 后端：Node.js + Express + TypeScript + Prisma ORM
- 数据库：PostgreSQL
- 部署：Docker Compose

## 快速启动

### 方式一：Docker部署（推荐）

```bash
# 1. 克隆项目
cd holang-sales-crm

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要配置

# 3. 启动服务
docker compose up -d

# 4. 访问系统
# 前端：http://localhost
# 后端API：http://localhost:3000
```

默认管理员账号：
- 用户名：admin
- 密码：admin123

### 方式二：本地开发

```bash
# 后端
cd backend
npm install
cp ../.env.example .env
npx prisma migrate dev
npm run seed
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run dev
```

## 项目结构

```
holang-sales-crm/
├── backend/          # 后端Express + Prisma
├── frontend/         # 前端React + MUI
├── docker-compose.yml
└── README.md
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | PostgreSQL连接串 | - |
| JWT_SECRET | JWT签名密钥 | - |
| JWT_EXPIRES_IN | JWT过期时间 | 7d |
| PORT | 后端端口 | 3000 |
| WECOM_CORPID | 企微CorpID | - |
| WECOM_CORPSECRET | 企微CorpSecret | - |

## 数据迁移

系统支持从伙伴云导出的Excel/CSV批量导入客户和联系人数据。

访问：系统设置 → 数据迁移

## 许可

内部使用
