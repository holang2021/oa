echo "=== find oa nginx conf ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null
ls -la /etc/nginx/conf.d/ 2>/dev/null
echo "=== oa.holangchina.com.conf ==="
cat /etc/nginx/sites-enabled/oa.holangchina.com.conf 2>/dev/null || cat /etc/nginx/conf.d/oa.holangchina.com.conf 2>/dev/null || echo "NOT_FOUND"
