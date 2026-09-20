#!/bin/bash
set -e
echo "=== write verify file ==="
cat > /opt/holang/oa/app/WW_verify_5cBUxcUoPIJbgu1k.txt <<'EOF'
5cBUxcUoPIJbgu1k
EOF
echo "FILE_WRITTEN"
ls -la /opt/holang/oa/app/WW_verify_5cBUxcUoPIJbgu1k.txt
echo "=== content ==="
cat /opt/holang/oa/app/WW_verify_5cBUxcUoPIJbgu1k.txt
echo "=== HTTP check via nginx 443 ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://oa.holangchina.com/WW_verify_5cBUxcUoPIJbgu1k.txt"
echo "=== body ==="
curl -sS "https://oa.holangchina.com/WW_verify_5cBUxcUoPIJbgu1k.txt"
echo
