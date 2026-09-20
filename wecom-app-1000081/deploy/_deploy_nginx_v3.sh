set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cat > /etc/nginx/sites-enabled/oa.holangchina.com.conf <<'EOF'
# oa.holangchina.com — 443 HTTPS (静态托管 + API 反代)
server {
    listen 80;
    server_name oa.holangchina.com;
    location ^~ /.well-known/acme-challenge/ {
        root /opt/holang/oa/app;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name oa.holangchina.com;
    ssl_certificate     /etc/letsencrypt/live/oa.holangchina.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oa.holangchina.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 后端 API 反代 (保留 /api 前缀, 后端路由为 /api/v1/...)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查 (代理到后端)
    location = /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }

    # OA 前端 (React SPA)
    location / {
        root /opt/holang/oa/app;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
echo "--- nginx -t ---"
nginx -t
echo "--- reload ---"
nginx -s reload
echo "NGINX_V3_DONE"
