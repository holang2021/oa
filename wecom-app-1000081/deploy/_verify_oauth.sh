set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
echo "=== wecom OAuth route reachable? (GET, expect non-404) ==="
curl -sS -m 10 https://oa.holangchina.com/api/v1/auth/wecom/login -w "\nHTTP %{http_code}\n"
echo "=== auth-callback.html served by nginx? ==="
curl -sS -m 10 -o /dev/null -w "HTTP %{http_code}\n" https://oa.holangchina.com/auth-callback.html
echo "=== confirm backend .env has OAuth secret ==="
grep -c "WECOM_OAUTH_SECRET=wLHX" /opt/holang/oa/backend/.env && echo "OAUTH_SECRET_PRESENT"
echo "OAUTH_VERIFY_DONE"
