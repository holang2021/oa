# -*- coding: utf-8 -*-
"""通过腾讯云 TAT 检查服务器 OA 后端 api-configs.json 中哪些 provider 已配置凭证。"""
import json
import os
import sys
import base64

VENV = r"C:/Users/liush/.workbuddy/binaries/python/envs/default/Scripts/python.exe"
SDK_DIR = r"C:/Users/liush/.workbuddy/binaries/python/envs/default/Lib/site-packages"
sys.path.insert(0, SDK_DIR)

from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"

# 读取 TAT 凭证（从本地 credentials.json 或环境变量）
CRED_PATH = r"C:/Users/liush/.tccli/default.credential"
if not os.path.exists(CRED_PATH):
    print("NO_TAT_CRED")
    sys.exit(2)
with open(CRED_PATH, "r", encoding="utf-8") as f:
    creds = json.load(f)
secret_id = creds.get("secretId") or creds.get("SecretId")
secret_key = creds.get("secretKey") or creds.get("SecretKey")
token = creds.get("token")

if not secret_id or not secret_key:
    print("NO_TAT_CRED")
    sys.exit(2)

cred = credential.Credential(secret_id, secret_key)
client = tat_client.TatClient(cred, REGION)

shell = r"""
CFG=/opt/holang/oa/backend/config/api-configs.json
if [ ! -f "$CFG" ]; then echo "NO_FILE"; exit 0; fi
python3 - <<'PY'
import json
with open('/opt/holang/oa/backend/config/api-configs.json') as f:
    data = json.load(f)
for c in data:
    creds = c.get('credentials') or {}
    has = any(str(v).strip() for v in creds.values())
    print(c['provider'], '|', c.get('status'), '|', 'HAS_CREDS' if has else 'EMPTY')
PY
"""
b64 = base64.b64encode(shell.encode("utf-8")).decode("ascii")

req = models.RunCommandRequest()
req.InstanceIds = [INSTANCE_ID]
req.CommandType = "SHELL"
req.CommandName = "check_api_configs"
req.Content = b64
req.Timeout = 60

resp = client.RunCommand(req)
inv_id = resp.InvocationId
print("INV", inv_id)

# 轮询结果
import time
for _ in range(40):
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
        print("OUTPUT_START")
        print(txt)
        print("OUTPUT_END")
        break
