#!/bin/bash
echo "=== /opt/holang/oa structure ==="
find /opt/holang/oa -maxdepth 2 -type f -o -maxdepth 2 -type d 2>/dev/null | head -40
echo "=== listening ports (node/python) ==="
ss -ltnp 2>/dev/null | grep -E '(:300[0-9]|:80|:443)' || echo "NO_RELEVANT_PORTS"
echo "=== ai/oa process check ==="
ps aux 2>/dev/null | grep -E 'node|python|nginx' | grep -v grep | head -20
