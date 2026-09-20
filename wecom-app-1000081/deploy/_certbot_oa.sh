#!/bin/bash
set -e
certbot certonly --webroot -w /opt/holang/oa/app -d oa.holangchina.com \
  --register-unsafely-without-email --agree-tos --no-eff-email --non-interactive
echo "--- cert files ---"
ls -la /etc/letsencrypt/live/oa.holangchina.com/ 2>/dev/null || echo "NO_CERT_DIR"
echo "CERTBOT_DONE"
