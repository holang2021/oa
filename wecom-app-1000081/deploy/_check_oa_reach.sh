#!/bin/bash
echo "=== curl http://oa.holangchina.com (headers) ==="
curl -sS -m 10 -I http://oa.holangchina.com 2>&1 | head -20 || echo "CURL_FAIL"
echo "=== server header only ==="
curl -sS -m 10 -I http://oa.holangchina.com 2>&1 | grep -i "server:" || echo "NO_SERVER_HEADER"
echo "=== resolve locally ==="
getent hosts oa.holangchina.com || echo "NO_LOCAL_RESOLVE"
echo "=== done ==="
