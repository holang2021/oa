#!/usr/bin/env python3
# 定向部署：仅更新 wecom.controller.ts（同步初始密码+部门名修复）到服务器
# 不解压全量、不 rm -rf、不动 .env / 不跑 migrate，仅 tar 覆盖 + PM2 重启 + 触发同步
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
FILES = ["src/controllers/wecom.controller.ts"]

def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def run_tat(client, script: str, timeout=120):
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy-wecom-syncfix"
    req.Content = base64.b64encode(script.encode("utf-8")).decode()
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    for i in range(60):
        time.sleep(3)
        dreq = models.DescribeInvocationTasksRequest()
        f = models.Filter(); f.Name = "invocation-id"; f.Values = [inv_id]
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
                try: txt = base64.b64decode(out.Output).decode("utf-8", "replace")
                except Exception: txt = out.Output
            return t.TaskStatus, txt
    return "TIMEOUT", ""

def main():
    sid, skey, token = load_cred()
    cred = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)

    # 本地打 tar（仅 controller 文件，路径相对 backend 根）
    tar_path = "F:/HOLANGbuddy/03_项目资产/系统建设/wecom-app-1000081/deploy/wecom_syncfix.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        for rel in FILES:
            full = os.path.join(BACKEND_LOCAL, rel)
            tar.add(full, arcname=rel)
    data = open(tar_path, "rb").read()
    b64 = base64.b64encode(data).decode()
    print(f"[local] tar size={len(data)} b64 len={len(b64)}")
    chunks = [b64[i:i+CHUNK] for i in range(0, len(b64), CHUNK)]
    print(f"[split] {len(chunks)} chunks")

    for idx, ch in enumerate(chunks):
        op = ">" if idx == 0 else ">>"
        script = f"printf '%s' '{ch}' {op} /tmp/wecom_syncfix.b64"
        st, txt = run_tat(client, script, timeout=60)
        if st != "SUCCESS":
            print(f"[FAIL] chunk {idx} status={st}\n{txt}"); sys.exit(1)
        print(f"[ok] chunk {idx+1}/{len(chunks)}")

    final = f"""
set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
base64 -d /tmp/wecom_syncfix.b64 > /tmp/wecom_syncfix.tar.gz
cd {DST}
tar -xzf /tmp/wecom_syncfix.tar.gz
# verify controller contains new logic
grep -n "hashInitialPassword" src/controllers/wecom.controller.ts || (echo "HASH_NOT_FOUND"; exit 1)
echo "--- pm2 restart ---"
pm2 restart holang-oa-backend
sleep 5
pm2 describe holang-oa-backend | grep -E 'pid|status'
echo "--- login as admin and trigger wecom sync ---"
TOKEN=$(curl -sS -X POST http://127.0.0.1:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{{"username":"admin","password":"admin123"}}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",{{}}).get("token",""))')
if [ -z "$TOKEN" ]; then echo "LOGIN_FAILED"; exit 1; fi
echo "token length: ${{#TOKEN}}"
curl -sS -X POST http://127.0.0.1:3001/api/v1/wecom/sync -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'
echo ""
rm -f /tmp/wecom_syncfix.b64 /tmp/wecom_syncfix.tar.gz
echo DEPLOY_AND_SYNC_DONE
"""
    st, txt = run_tat(client, final, timeout=300)
    print(f"[final] status={st}")
    print(txt)
    sys.exit(0 if st == "SUCCESS" and "DEPLOY_AND_SYNC_DONE" in txt else 1)

if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as e:
        print(f"[TAT SDK ERROR] {e}"); sys.exit(1)
