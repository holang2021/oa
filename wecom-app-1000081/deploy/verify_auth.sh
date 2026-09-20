#!/bin/bash
# 验证配置层接口鉴权链生效（无需 token 应 401）
echo "=== GET /api/v1/rbac/roles (expect 401) ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/v1/rbac/roles
echo "=== GET /api/v1/rbac/me (expect 401) ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/v1/rbac/me
echo "=== GET /api/v1/api-configs (expect 401) ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/v1/api-configs
echo "=== GET /api/v1/dashboard/stats (expect 401) ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/v1/dashboard/stats
echo "VERIFY_DONE"