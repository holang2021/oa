#!/bin/bash
echo "=== GET without params (expect 4xx, not 500) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 "http://127.0.0.1:3008/wecom/1000081/callback"
echo "=== GET with bogus params ==="
curl -s --max-time 5 "http://127.0.0.1:3008/wecom/1000081/callback?msg_signature=abc&timestamp=123&nonce=x&echostr=def"; echo ""
echo "=== POST bogus xml (expect safe handling, not crash) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 -X POST -H "Content-Type: text/xml" -d "<xml><foo>bar</foo></xml>" "http://127.0.0.1:3008/wecom/1000081/callback"
echo "=== pm2 logs tail ==="
pm2 logs wecom-app-1000081 --lines 15 --nostream 2>/dev/null | tail -20
echo "DONE smoke"
