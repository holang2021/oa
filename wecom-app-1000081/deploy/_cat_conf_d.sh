echo "=== conf.d/oa.holangchina.com.conf (ACTIVE, has bug) ==="
cat /etc/nginx/conf.d/oa.holangchina.com.conf
echo ""
echo "=== is conf.d included in nginx.conf? ==="
grep -n "include" /etc/nginx/nginx.conf
