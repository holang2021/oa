#!/bin/bash
set -e
certbot certonly --manual --preferred-challenges dns \
  --manual-auth-hook /opt/holang/_common/dnspod_auth.py \
  --manual-cleanup-hook /opt/holang/_common/dnspod_cleanup.py \
  -d oa.holangchina.com \
  --register-unsafely-without-email --agree-tos --non-interactive
echo "--- cert files ---"
ls -la /etc/letsencrypt/live/oa.holangchina.com/ 2>/dev/null || echo "NO_CERT_DIR"
echo "CERTBOT_DNS01_DONE"
