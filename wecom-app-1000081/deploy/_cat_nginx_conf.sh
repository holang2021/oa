#!/bin/bash
echo "===== ai.holangchina.com.conf ====="
cat /etc/nginx/conf.d/ai.holangchina.com.conf
echo "===== holang_ai.conf ====="
cat /etc/nginx/conf.d/holang_ai.conf
echo "===== existing certs ====="
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "NO_LETSENCRYPT_LIVE"
echo "===== done ===="
