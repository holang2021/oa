#!/usr/bin/env python3
# 分块上传本地 OA 后端源码包到服务器 /opt/holang/oa/backend，并执行安装/启动
# 规避 TAT 单命令 64KB 上限：本地 base64 -> 按 36000 字符分块 -> 每块一条 TAT 命令追加
import sys, json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
TAR_PATH = "wecom-app-1000081/deploy/oa_backend.tar.gz"
CHUNK = 36000
DST = "/opt/holang/oa/backend"

def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def run_tat(client, script: str, timeout=120):
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy-backend"
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

    data = open(TAR_PATH, "rb").read()
    b64 = base64.b64encode(data).decode()
    print(f"[local] tar.gz size={len(data)} bytes, b64 len={len(b64)}")
    chunks = [b64[i:i+CHUNK] for i in range(0, len(b64), CHUNK)]
    print(f"[split] {len(chunks)} chunks of {CHUNK} chars")

    # 逐块上传追加到服务器 /tmp/oa_backend.b64
    for idx, ch in enumerate(chunks):
        op = ">" if idx == 0 else ">>"
        script = f"printf '%s' '{ch}' {op} /tmp/oa_backend.b64"
        st, txt = run_tat(client, script, timeout=60)
        if st != "SUCCESS":
            print(f"[FAIL] chunk {idx} status={st}\n{txt}")
            sys.exit(1)
        print(f"[ok] chunk {idx+1}/{len(chunks)} uploaded")

    # 解码 + 解包 + 安装 + 生成 Prisma Client + 迁移 + PM2 启动
    final = f"""
set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
node -v
npm -v
base64 -d /tmp/oa_backend.b64 > /tmp/oa_backend.tar.gz
rm -rf {DST}
mkdir -p {DST}
tar -xzf /tmp/oa_backend.tar.gz -C {DST}
echo "--- extracted ---"
ls -la {DST}
cd {DST}
echo "--- npm install (may take a while) ---"
export PUPPETEER_SKIP_DOWNLOAD=true
npm install --no-audit --no-fund
echo "--- prisma generate ---"
npx prisma generate
echo "--- prisma migrate deploy ---"
npx prisma migrate deploy || true
echo "--- pm2 ecosystem ---"
cat > ecosystem.config.json <<'EOF'
{{
  "apps": [
    {{
      "name": "holang-oa-backend",
      "cwd": "{DST}",
      "script": "./node_modules/.bin/tsx",
      "args": "src/index.ts",
      "instances": 1,
      "exec_mode": "fork",
      "env": {{ "NODE_ENV": "production", "PORT": "3001" }},
      "log_file": "/var/log/holang/oa-backend.log",
      "out_file": "/var/log/holang/oa-backend-out.log",
      "error_file": "/var/log/holang/oa-backend-err.log"
    }}
  ]
}}
EOF
pm2 delete holang-oa-backend 2>/dev/null || true
pm2 start ecosystem.config.json
echo "--- pm2 status ---"
pm2 list
echo "--- health check ---"
sleep 3
curl -sS http://127.0.0.1:3001/api/v1 || echo "HEALTH_PENDING"
echo "--- cleanup ---"
rm -f /tmp/oa_backend.b64 /tmp/oa_backend.tar.gz
echo DEPLOY_DONE
"""
    st, txt = run_tat(client, final, timeout=600)
    print(f"[final] status={st}")
    print(txt)
    sys.exit(0 if st == "SUCCESS" and "DEPLOY_DONE" in txt else 1)

if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as e:
        print(f"[TAT SDK ERROR] {e}")
        sys.exit(1)
