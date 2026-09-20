#!/bin/bash
cd /opt/holang/oa/backend
ls -la prisma/
echo "=== .env DATABASE_URL ==="
grep DATABASE_URL .env || echo "NO DATABASE_URL"
echo "=== db files ==="
ls -lh prisma/*.db 2>/dev/null || echo "no db files"
echo "=== server port 3001 ==="
ss -tlnp | grep 3001 || echo "3001 not listening"
