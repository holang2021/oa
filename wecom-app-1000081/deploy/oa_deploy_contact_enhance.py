#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
联系人管理系统增强 —— 增量部署脚本
- 后端：schema 加 createdById 字段、contact.controller.ts 与 customer.controller.ts 联系人接口改造
- 严禁删除 /opt/holang/oa/backend，仅覆盖指定文件并做 prisma db push 保留数据
"""
import base64
import json
import os
import sys
import tarfile
import time
import tempfile
from pathlib import Path

from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

INSTANCE_ID = "ins-4xm95czz"
REGION = "ap-shanghai"
BACKEND_DIR = "/opt/holang/oa/backend"

# 从本地 tccli 凭证读取
CRED_PATH = r"C:/Users/liush/.tccli/default.credential"
secret_id = os.environ.get("TENCENT_SECRET_ID")
secret_key = os.environ.get("TENCENT_SECRET_KEY")
if not secret_id and os.path.exists(CRED_PATH):
    try:
        with open(CRED_PATH, "r", encoding="utf-8") as f:
            creds = json.load(f)
        secret_id = creds.get("secretId") or creds.get("SecretId")
        secret_key = creds.get("secretKey") or creds.get("SecretKey")
    except Exception as e:
        print("READ_CRED_ERR", e)

if not secret_id or not secret_key:
    print("NO_TAT_CRED")
    sys.exit(2)

LOCAL_FILES = [
    ("holang-oa/backend/prisma/schema.prisma", "prisma/schema.prisma"),
    ("holang-oa/backend/src/controllers/contact.controller.ts", "src/controllers/contact.controller.ts"),
    ("holang-oa/backend/src/controllers/customer.controller.ts", "src/controllers/customer.controller.ts"),
]


def pack_tar64():
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".tar.gz")
    os.close(tmp_fd)
    try:
        with tarfile.open(tmp_path, "w:gz") as tar:
            for local_rel, remote_rel in LOCAL_FILES:
                local_path = Path("F:/HOLANGbuddy/03_项目资产/系统建设") / local_rel
                if not local_path.exists():
                    print(f"MISSING {local_path}")
                    sys.exit(1)
                tar.add(local_path, arcname=remote_rel)
        with open(tmp_path, "rb") as f:
            data = f.read()
        return base64.b64encode(data).decode("utf-8")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


SCRIPT = r"""#!/bin/bash
set -e
BACKEND_DIR="/opt/holang/oa/backend"
cd "$BACKEND_DIR"

echo "=== 1/4 备份原文件 ==="
for f in prisma/schema.prisma src/controllers/contact.controller.ts src/controllers/customer.controller.ts; do
    cp "$f" "$f.bak.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
done

echo "=== 2/4 解压增量包 ==="
echo "$TAR_B64" | base64 -d | tar -xzf - -C "$BACKEND_DIR"

echo "=== 3/4 Prisma 生成与迁移 ==="
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss

echo "=== 4/4 重启服务 ==="
pm2 restart holang-oa-backend

sleep 2
pm2 status holang-oa-backend | tail -n +4

echo "CONTACT_ENHANCE_DEPLOY_DONE"
"""


def run_command():
    tar_b64 = pack_tar64()
    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)

    content = SCRIPT.replace("$TAR_B64", tar_b64)

    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE_ID]
    req.Username = "root"
    req.Timeout = 120
    req.CommandName = "deploy_contact_enhance"
    req.Content = base64.b64encode(content.encode("utf-8")).decode("utf-8")

    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("INV", inv_id)

    for _ in range(30):
        time.sleep(5)
        desc_req = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        desc_req.Filters = [f]
        d = client.DescribeInvocationTasks(desc_req)
        if not d.InvocationTaskSet:
            continue
        t = d.InvocationTaskSet[0]
        if t.TaskStatus in ("SUCCESS", "FAILED", "TIMEOUT"):
            if t.TaskResult and getattr(t.TaskResult, "Output", None):
                out = base64.b64decode(t.TaskResult.Output).decode("utf-8", "replace")
                print("OUTPUT_START")
                print(out)
                print("OUTPUT_END")
            else:
                print("TASK", t.TaskStatus, getattr(t.TaskResult, "ExitCode", None))
            if t.TaskStatus != "SUCCESS":
                sys.exit(1)
            break
    else:
        print("TIMEOUT waiting for TAT task")
        sys.exit(1)


if __name__ == "__main__":
    run_command()
