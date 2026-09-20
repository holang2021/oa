#!/bin/bash
echo "=== running node/pm2/nginx procs ==="; ps aux | grep -E "node|pm2|nginx|OneID|wecom" | grep -v grep | head -20
echo "=== find node binary ==="; find / -name "node" -type f 2>/dev/null | head
echo "=== /usr/local/bin ==="; ls -la /usr/local/bin 2>/dev/null | grep -iE "node|npm|pm2|yarn" || echo "none"
echo "=== nvm dirs ==="; ls -d /root/.nvm /home/*/.nvm 2>/dev/null || echo "no nvm dirs"
echo "=== /opt/holang/ai ==="; ls -la /opt/holang/ai 2>/dev/null | head
echo "=== /opt/holang/oa ==="; ls -la /opt/holang/oa 2>/dev/null | head
echo "=== apt? ==="; which apt-get apt 2>/dev/null || echo "no apt"
echo "=== internet test ==="; (curl -sI --max-time 8 https://nodejs.org 2>/dev/null | head -1) || echo "no curl/internet"
echo "=== pm2 global? ==="; ls -la /usr/lib/node_modules 2>/dev/null | head || echo "no global node_modules"
