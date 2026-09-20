#!/bin/bash
echo "=== PM2 status ==="
pm2 describe wecom-app-1000081 2>/dev/null | head -20
echo "=== Health endpoint (local) ==="
curl -s -m 5 http://127.0.0.1:3008/health || echo "HEALTH_FAIL"
echo ""
echo "=== Listening port 3008 ==="
ss -ltnp 2>/dev/null | grep 3008 || echo "PORT_NOT_LISTEN"
echo "=== Done ==="
