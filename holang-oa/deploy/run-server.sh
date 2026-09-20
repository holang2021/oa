#!/usr/bin/env bash
# OA 部署执行脚本（服务器侧）— 已批准·待新服务器执行
# 由 TAT 命令框 wget 后调用： bash /tmp/run-server.sh "<VERSION>"
# 前置：服务器已 coscli config（凭证不在此脚本）；已开启 SQLite WAL
set -euo pipefail

VERSION="${1:?用法: run-server.sh <VERSION>}"
COS_BASE="https://holang-oa-<APPID>.cos.ap-shanghai.myqcloud.com/deploy"
OA_ROOT="/opt/holang/oa"
BACKEND="$OA_ROOT/backend"
FRONTEND="$OA_ROOT/app"
TS="$(date +%Y%m%d-%H%M%S)"
BAK="/tmp/oa_app_bak_$TS"

echo "[$(date)] 开始部署版本 $VERSION"

# 1. 拉取版本包（从 COS，规避 TAT 24KB 限制）
TMP="/tmp/oa_deploy_$TS"
mkdir -p "$TMP"
wget -q "$COS_BASE/$VERSION/dist.tar.gz"       -O "$TMP/dist.tar.gz"
wget -q "$COS_BASE/$VERSION/backend-src.tar.gz" -O "$TMP/backend-src.tar.gz"

# 2. 备份（cp 非 rm，安全）
mkdir -p "$BAK"
[ -d "$FRONTEND" ] && cp -r "$FRONTEND" "$BAK/app"
[ -d "$BACKEND/src" ] && cp -r "$BACKEND/src" "$BAK/src"
echo "[$(date)] 备份完成: $BAK"

# 3. 覆盖前端
rm -rf "$FRONTEND"
mkdir -p "$FRONTEND"
tar -xzf "$TMP/dist.tar.gz" -C "$FRONTEND"

# 4. 覆盖后端 src（不动 .env / *.db）
tar -xzf "$TMP/backend-src.tar.gz" -C "$BACKEND"

# 5. 数据库迁移（若 schema 变更；否则无操作）
cd "$BACKEND"
# npx prisma migrate deploy   # 待拍板项2开启后取消注释

# 6. 重启
pm2 restart holang-oa-backend || pm2 start src/index.ts --name holang-oa-backend

# 7. 健康检查
sleep 3
if curl -sf localhost:3001/api/health >/dev/null; then
  echo "[$(date)] 部署成功，健康检查通过"
else
  echo "[$(date)] 健康检查失败，触发回滚"
  rm -rf "$FRONTEND" "$BACKEND/src"
  cp -r "$BAK/app" "$FRONTEND"
  cp -r "$BAK/src" "$BACKEND/src"
  pm2 restart holang-oa-backend
  echo "[$(date)] 已回滚至 $BAK"
  exit 1
fi

# 清理临时包
rm -rf "$TMP"
echo "[$(date)] 完成"
