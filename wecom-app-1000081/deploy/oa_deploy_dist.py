#!/usr/bin/env python3
# 分块上传本地 OA 前端 dist 包到服务器 /opt/holang/oa/app
# 规避 TAT 单命令 64KB 上限：本地 base64 -> 按 36000 字符分块 -> 每块一条 TAT 命令追加
import sys, json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
TAR_PATH = "wecom-app-1000081/deploy/oa_dist.tar.gz"
CHUNK = 8000
DST = "/opt/holang/oa/app"

def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def run_tat(client, script: str, timeout=120):
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy"
    req.Content = base64.b64encode(script.encode("utf-8")).decode()
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    for i in range(40):
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

    data = open(TAR_PATH, "rb").read()
    b64 = base64.b64encode(data).decode()
    print(f"[local] tar.gz size={len(data)} bytes, b64 len={len(b64)}")
    chunks = [b64[i:i+CHUNK] for i in range(0, len(b64), CHUNK)]
    print(f"[split] {len(chunks)} chunks of {CHUNK} chars")

    # 逐块上传追加到服务器 /tmp/oa_dist.b64
    for idx, ch in enumerate(chunks):
        op = ">" if idx == 0 else ">>"
        script = f"printf '%s' '{ch}' {op} /tmp/oa_dist.b64"
        st, txt = run_tat(client, script, timeout=60)
        if st != "SUCCESS":
            print(f"[FAIL] chunk {idx} status={st}\n{txt}")
            sys.exit(1)
        print(f"[ok] chunk {idx+1}/{len(chunks)} uploaded")

    # 解码 + 解包 + 校验
    final = f"""
set -e
echo "b64 bytes on server: $(wc -c < /tmp/oa_dist.b64)"
base64 -d /tmp/oa_dist.b64 > /tmp/oa_dist.tar.gz
rm -rf {DST}
mkdir -p {DST}
tar -xzf /tmp/oa_dist.tar.gz -C {DST}
echo "--- extracted ---"
ls -la {DST}
ls -la {DST}/assets
echo "--- cleanup ---"
rm -f /tmp/oa_dist.b64 /tmp/oa_dist.tar.gz
echo DEPLOY_DONE
"""
    st, txt = run_tat(client, final, timeout=120)
    print(f"[final] status={st}")
    print(txt)
    sys.exit(0 if st == "SUCCESS" and "DEPLOY_DONE" in txt else 1)

if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as e:
        print(f"[TAT SDK ERROR] {e}")
        sys.exit(1)
