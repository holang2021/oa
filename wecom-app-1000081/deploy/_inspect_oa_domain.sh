#!/bin/bash
echo "=== nginx configs mentioning oa.holangchina.com ==="
grep -R "oa.holangchina.com" /etc/nginx/ 2>/dev/null || echo "NO_NGINX_OA"
echo "=== DNS resolution from server ==="
getent hosts oa.holangchina.com 2>/dev/null || echo "DNS_NO_RESOLVE"
echo "=== curl https oa.holangchina.com ==="
curl -s -o /dev/null -w "status=%{http_code} resolve=%{time_namelookup}s total=%{time_total}s\n" --max-time 5 https://oa.holangchina.com/ || echo "CURL_FAIL"
echo "=== /opt/holang directories ==="
ls -la /opt/holang/ 2>/dev/null || echo "NO_OPT_HOLANG"
