set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
echo "=== before: count oa confs ==="
ls -la /etc/nginx/conf.d/oa.holangchina.com.conf /etc/nginx/sites-enabled/oa.holangchina.com.conf
echo "=== remove duplicate (old buggy conf.d) ==="
rm -f /etc/nginx/conf.d/oa.holangchina.com.conf
echo "=== remaining oa confs ==="
ls -la /etc/nginx/conf.d/oa.holangchina.com.conf 2>/dev/null || echo "conf.d oa REMOVED"
ls -la /etc/nginx/sites-enabled/oa.holangchina.com.conf
echo "=== nginx -t ==="
nginx -t
echo "=== reload ==="
nginx -s reload
echo "NGINX_DEDUP_DONE"
