#!/bin/bash
set -e
cat > /etc/nginx/conf.d/oa.holangchina.com.conf <<'EOF'
# oa.holangchina.com — 阶段1: 仅 80 端口 (静态托管 + ACME 验证)
server {
    listen 80;
    server_name oa.holangchina.com;

    location ^~ /.well-known/acme-challenge/ {
        root /opt/holang/oa/app;
    }

    location / {
        root /opt/holang/oa/app;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
echo "--- written ---"
nginx -t
echo "--- reload ---"
nginx -s reload
echo "NGINX_V1_DONE"
