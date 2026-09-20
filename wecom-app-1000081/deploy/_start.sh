#!/bin/bash
set -e
cd /opt/holang/wecom-app-1000081
pm2 start ecosystem.config.json
pm2 save
echo "=== pm2 list ==="
pm2 list
echo "=== wait for boot ==="
sleep 3
echo "=== health check (127.0.0.1:3008/health) ==="
curl -s --max-time 5 http://127.0.0.1:3008/health || echo "HEALTH FAIL"
echo ""
echo "DONE start"
