#!/bin/bash
echo "=== whoami ==="; whoami
echo "=== uname ==="; uname -a
echo "=== node ==="; node -v 2>/dev/null || echo "no node"
echo "=== npm ==="; npm -v 2>/dev/null || echo "no npm"
echo "=== pm2 ==="; pm2 -v 2>/dev/null || echo "no pm2"
echo "=== nginx ==="; nginx -v 2>&1 || echo "no nginx"
echo "=== git ==="; git --version 2>/dev/null || echo "no git"
echo "=== /opt/holang ==="; ls -la /opt/holang 2>/dev/null || echo "no /opt/holang"
echo "=== listeners ==="; (ss -ltnp 2>/dev/null | grep -E ':(3001|3008|80|443)\b') || echo "none of 3001/3008/80/443 listening"
echo "=== nvm? ==="; ls -d ~/.nvm 2>/dev/null || echo "no nvm"
echo "=== node via which ==="; which node || echo "node not in PATH"
