#!/bin/bash
echo "=== HTTPS headers ==="
curl -sS -m 10 -I https://oa.holangchina.com 2>&1 | head -15
echo "=== index.html title ==="
curl -sS -m 10 https://oa.holangchina.com 2>&1 | grep -o "<title>[^<]*</title>" || echo "NO_TITLE"
echo "=== cert subject/issuer ==="
echo | openssl s_client -connect oa.holangchina.com:443 -servername oa.holangchina.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo "CERT_CHECK_FAIL"
echo "=== HTTP->HTTPS redirect? ==="
curl -sS -m 10 -o /dev/null -w "http_code=%{http_code} redirect=%{redirect_url}\n" http://oa.holangchina.com/
echo "=== done ==="
