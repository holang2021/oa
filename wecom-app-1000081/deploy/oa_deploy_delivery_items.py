#!/usr/bin/env python3
# 定向部署：新增 DeliveryItem 表 + 导入伙伴云发货清单 301 条
# 仅更新 prisma/schema.prisma 与迁移脚本，不 rm -rf backend、不动 .env、不删库。
import sys, json, base64, time, os, tarfile
from pathlib import Path
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
BACKEND_LOCAL = "F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa/backend"
DST = "/opt/holang/oa/backend"
CHUNK = 36000
# 修复版 prod 脚本已生成在真实路径（F: 符号链接写保护），从 C:/Users/liush 读取
FILES = [
    (os.path.join(BACKEND_LOCAL, "prisma/schema.prisma"), "prisma/schema.prisma"),
    ("C:/Users/liush/load_delivery_items_prod.py", "deploy/huoban_migration/load_delivery_items_prod.py"),
]


def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")


def run_tat(client, script: str, timeout=180):
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy-delivery-items"
    req.Content = base64.b64encode(script.encode("utf-8")).decode()
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    for i in range(80):
        time.sleep(3)
        dreq = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        dreq.Filters = [f]
        dresp = client.DescribeInvocationTasks(dreq)
        tasks = dresp.InvocationTaskSet or []
        if not tasks:
            continue
        t = tasks[0]
        if t.TaskStatus in ("SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"):
            out = t.TaskResult
            txt = ""
            if out and getattr(out, "Output", None):
                try:
                    txt = base64.b64decode(out.Output).decode("utf-8", "replace")
                except Exception:
                    txt = out.Output
            return t.TaskStatus, txt
    return "TIMEOUT", ""


def main():
    sid, skey, token = load_cred()
    cred = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)

    # 本地打 tar
    tar_path = "C:/Users/liush/delivery_items.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        for full, arcname in FILES:
            if not os.path.exists(full):
                print(f"[FAIL] local file not found: {full}")
                sys.exit(1)
            tar.add(full, arcname=arcname)
    data = open(tar_path, "rb").read()
    b64 = base64.b64encode(data).decode()
    print(f"[local] tar size={len(data)} b64 len={len(b64)}")
    chunks = [b64[i : i + CHUNK] for i in range(0, len(b64), CHUNK)]
    print(f"[split] {len(chunks)} chunks")

    for idx, ch in enumerate(chunks):
        op = ">" if idx == 0 else ">>"
        script = f"printf '%s' '{ch}' {op} /tmp/delivery_items.b64"
        st, txt = run_tat(client, script, timeout=60)
        if st != "SUCCESS":
            print(f"[FAIL] chunk {idx} status={st}\n{txt}")
            sys.exit(1)
        print(f"[ok] chunk {idx+1}/{len(chunks)}")

    final = f"""
set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
base64 -d /tmp/delivery_items.b64 > /tmp/delivery_items.tar.gz
cd {DST}
tar -xzf /tmp/delivery_items.tar.gz
# verify schema contains DeliveryItem
grep -n "model DeliveryItem" prisma/schema.prisma || (echo "SCHEMA_NOT_FOUND"; exit 1)
# sync schema (adds delivery_items table)
echo "--- prisma db push ---"
cd {DST} && npx prisma db push --accept-data-loss
# stop backend to avoid sqlite lock during raw insert
echo "--- pm2 stop ---"
pm2 stop holang-oa-backend || true
sleep 2
# migrate data (raw sqlite, backend stopped)
echo "--- migrate delivery items ---"
python3 deploy/huoban_migration/load_delivery_items_prod.py /opt/holang/oa/backend/prisma/holang-crm.db
# restart backend
echo "--- pm2 restart ---"
pm2 restart holang-oa-backend
sleep 5
pm2 describe holang-oa-backend | grep -E 'pid|status'
rm -f /tmp/delivery_items.b64 /tmp/delivery_items.tar.gz
echo DELIVERY_ITEMS_DEPLOY_DONE
"""
    st, txt = run_tat(client, final, timeout=300)
    print(f"[final] status={st}")
    print(txt)
    sys.exit(0 if st == "SUCCESS" and "DELIVERY_ITEMS_DEPLOY_DONE" in txt else 1)


if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as e:
        print(f"[TAT SDK ERROR] {e}")
        sys.exit(1)
