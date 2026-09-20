#!/bin/bash
set -e
echo "=== pm2 startup (generate systemd unit) ==="
pm2 startup systemd -u root --hp /root 2>&1 | tail -8 || true
echo "=== enable & save ==="
systemctl enable pm2-root 2>&1 | tail -3 || true
pm2 save
echo "=== final pm2 list ==="
pm2 list
echo "DONE startup"
