echo "=== all nginx conf files referencing oa.holangchina.com ==="
grep -rl "oa.holangchina.com" /etc/nginx/ 2>/dev/null
echo "=== re-test chain ==="
echo "--- /health via nginx ---"
curl -sS -m 10 https://oa.holangchina.com/health -w "\nHTTP %{http_code}\n"
echo "--- login POST (bad creds) ---"
curl -sS -m 10 -X POST https://oa.holangchina.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"__probe__","password":"__probe__"}' \
  -w "\nHTTP %{http_code}\n"
echo "CHAIN_RETEST_DONE"
