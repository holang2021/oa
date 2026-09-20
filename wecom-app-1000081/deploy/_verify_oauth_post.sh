set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
echo "=== wecom OAuth POST (dummy code, expect non-404 e.g. 400/401) ==="
curl -sS -m 10 -X POST https://oa.holangchina.com/api/v1/auth/wecom/login \
  -H 'Content-Type: application/json' \
  -d '{"code":"__dummy__","state":"__dummy__"}' \
  -w "\nHTTP %{http_code}\n"
echo "OAUTH_POST_DONE"
