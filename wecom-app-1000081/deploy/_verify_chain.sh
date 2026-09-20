set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
echo "=== /health via nginx HTTPS ==="
curl -sS -m 10 https://oa.holangchina.com/health -w "\nHTTP %{http_code}\n"
echo "=== login POST (bad creds, proves route+DB reach) ==="
curl -sS -m 10 -X POST https://oa.holangchina.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"__probe__","password":"__probe__"}' \
  -w "\nHTTP %{http_code}\n"
echo "CHAIN_TEST_DONE"
