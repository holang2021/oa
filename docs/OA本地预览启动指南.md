# OA 本地预览启动指南（一页纸）

> 用途：没有云服务器时，在本机把 OA 全栈跑起来，看真实业务数据、验功能、纠偏。
> 适用：holang-oa 本地代码 + 2026-08-11 备份库。0 成本，不依赖公网。

## 前置确认（已就绪，无需重做）
- `holang-oa/backend/node_modules` 与 `holang-oa/packages/oa/node_modules` 已安装。
- 预览库已存在：`holang-oa/backend/prisma/holang-crm-preview.db`（由备份库复制而来）。
- 后端 `.env` 的 `DATABASE_URL` 已指向上述预览库（符合"本地预览连预览库"铁律）。

## 三步启动
```bash
# 1. 造预览库（仅首次；之后可跳过）
cp server_backup/2026-08-16/backend/prisma/holang-crm.db \
   holang-oa/backend/prisma/holang-crm-preview.db

# 2. 起后端（端口 3001，后台运行）
cd holang-oa/backend && npm run dev

# 3. 起前端（端口 5173，后台运行）
cd holang-oa/packages/oa && npm run dev -- --host
```

## 访问地址
- 前端界面：http://localhost:5173/
- 后端 API：http://localhost:3001/api/v1
- 局域网（同网段其他设备）：http://192.168.x.x:5173/

## 停止方式
- 在启动后端/前端的终端按 `Ctrl+C`；或任务管理器结束 `node` / `vite` 进程。

## 边界与铁律（务必遵守）
1. **企微回调不可用**：SSO(1000081)/推送(1000083) 需公网，本地预览只能验 OA 自身业务，不能验企微集成。
2. **数据只读自备份**：预览库 = 2026-08-11 时点，仅用于本地验证；任何本地改动不回写生产（生产当前无服务器）。
3. **禁整库同步**：预览库与生产库严格隔离，不得互相同步。
4. **不碰生产配置**：本地改 `.env` / `prisma/*.db` 不影响已失效的生产环境。

## 何时需要真正的服务器
- 对外访问 `oa.holangchina.com`
- 企微正式回调通道
- 服务端定时推送（自动化）
→ 以上三项解冻，需采购/恢复腾讯云 CVM 后部署。
