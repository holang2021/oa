#!/bin/bash
set -e
echo "=== install Node 22 + PM2 ==="
cd /tmp
curl -fsSL https://nodejs.org/dist/v22.22.2/node-v22.22.2-linux-x64.tar.gz -o node.tgz
echo "downloaded: $(ls -l node.tgz | awk '{print $5}') bytes"
tar -xzf node.tgz
rm -rf /usr/local/node22
mv node-v22.22.2-linux-x64 /usr/local/node22
ln -sf /usr/local/node22/bin/node /usr/local/bin/node
ln -sf /usr/local/node22/bin/npm /usr/local/bin/npm
ln -sf /usr/local/node22/bin/npx /usr/local/bin/npx
echo "node: $(node -v)  npm: $(npm -v)"
echo "=== install pm2 ==="
npm i -g pm2 >/tmp/pm2_install.log 2>&1 || { echo "npm pm2 failed:"; tail -20 /tmp/pm2_install.log; exit 1; }
ln -sf /usr/local/node22/bin/pm2 /usr/local/bin/pm2
echo "pm2: $(pm2 -v)"
echo "=== DONE ==="
