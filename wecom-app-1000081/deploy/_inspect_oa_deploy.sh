#!/bin/bash
echo "=== git ==="
which git && git --version || echo "NO_GIT"
echo "=== node/npm ==="
which node && node -v
which npm && npm -v
echo "=== /opt/holang/oa ==="
ls -la /opt/holang/oa 2>/dev/null || echo "NO_OA_DIR"
echo "=== curl ==="
which curl && curl --version | head -1
echo "=== github reachability (timeout 8s) ==="
curl -sS -m 8 -o /dev/null -w "github_http=%{http_code}\n" https://github.com 2>&1 || echo "GITHUB_UNREACHABLE"
echo "=== existing nginx sites ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "NO_SITES_ENABLED"
echo "=== port 3001 listener? ==="
(ss -ltnp 2>/dev/null | grep ':3001') || echo "NO_3001_LISTENER"
echo "=== done ==="
