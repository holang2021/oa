#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书密钥修正 + Phase0 重验（方案 A）
1) 本地读取 F:\HOLANGBUDDY\02_工具脚本_tools\secrets\credentials.json 的 feishu.app_secret（脱敏）
2) 通过 TAT 在服务器把该真密钥写入 OA 的 /opt/holang/oa/backend/config/api-configs.json
   （provider=feishu -> credentials.appSecret），权限保持 600
3) 立即重跑 Phase0 验证：取 tenant_access_token + 在 space 建测试节点再删除
4) 全程不打印明文 secret / token
"""
import base64
import json
import time
import sys
from pathlib import Path

from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"
CONFIG = "/opt/holang/oa/backend/config/api-configs.json"
SPACE_ID = "7598114727864159200"
LOCAL_SECRET = Path(r"F:\HOLANGBUDDY\02_工具脚本_tools\secrets\credentials.json")
CREDENTIAL_PATH = Path("C:/Users/liush/.tccli/default.credential")

SERVER_PY = r"""import json, os, urllib.request, urllib.error
CONFIG='/opt/holang/oa/backend/config/api-configs.json'
SPACE='__SPACE__'
secret=os.environ.get('FS_SEC','')
if not secret:
    print('NO_SECRET_FROM_ENV'); raise SystemExit(1)
d=json.load(open(CONFIG))
fs=[p for p in d if p.get('provider')=='feishu']
if not fs:
    print('FEISHU_CONFIG=MISSING'); raise SystemExit(1)
prov=fs[0]
old=prov['credentials'].get('appSecret','')
prov['credentials']['appSecret']=secret
json.dump(d, open(CONFIG,'w'), ensure_ascii=False, indent=2)
try: os.chmod(CONFIG, 0o600)
except Exception: pass
print('CONFIG_UPDATED oldHead=%s oldLen=%d newHead=%s newLen=%d'%(old[:4], len(old), secret[:4], len(secret)))
cid=prov['credentials'].get('appId','')
print('APPID='+cid)
def post_json(url, data, headers=None, method='POST'):
    req=urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers or {}, method=method)
    try:
        r=urllib.request.urlopen(req, timeout=15); return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode())
        except Exception: return {'code': e.code, 'msg': str(e)}
tok=post_json('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {'app_id':cid,'app_secret':secret})
print('TOKEN_CODE=%s MSG=%s HAS_TOKEN=%s'%(tok.get('code'),tok.get('msg'),'tenant_access_token' in tok))
token=tok.get('tenant_access_token','')
print('TOKEN_LEN=%d'%len(token))
if not token:
    print('VERIFY_RESULT=FAIL_TOKEN'); raise SystemExit(0)
hdr={'Authorization':'Bearer '+token,'Content-Type':'application/json'}
create=post_json('https://open.feishu.cn/open-apis/wiki/v2/spaces/%s/nodes'%SPACE, {'title':'HOLANG_OA_verify','obj_type':'docx'}, hdr)
node=create.get('data',{}).get('node_token','')
print('CREATE_CODE=%s MSG=%s NODE=%s'%(create.get('code'),create.get('msg'),node))
if node:
    del_req=urllib.request.Request('https://open.feishu.cn/open-apis/wiki/v2/spaces/%s/nodes/%s'%(SPACE,node), headers=hdr, method='DELETE')
    try: dr=json.loads(urllib.request.urlopen(del_req, timeout=15).read().decode())
    except urllib.error.HTTPError as e:
        try: dr=json.loads(e.read().decode())
        except Exception: dr={'code':e.code,'msg':str(e)}
    print('DELETE_CODE=%s MSG=%s'%(dr.get('code'),dr.get('msg')))
    print('VERIFY_RESULT=OK')
else:
    print('VERIFY_RESULT=FAIL_CREATE')
""".replace("__SPACE__", SPACE_ID)


def load_local_secret():
    data = json.loads(LOCAL_SECRET.read_text(encoding="utf-8"))
    fe = data.get("feishu", {})
    sec = fe.get("app_secret") or fe.get("appSecret") or ""
    return sec


def load_credential():
    data = json.loads(CREDENTIAL_PATH.read_text(encoding="utf-8"))
    return Credential(data["secretId"], data["secretKey"], data.get("token", ""))


def wait_invocation(client, invocation_id: str, timeout: int = 150):
    start = time.time()
    while time.time() - start < timeout:
        req = models.DescribeInvocationsRequest()
        req.Filters = [{"Name": "invocation-id", "Values": [invocation_id]}]
        invs = client.DescribeInvocations(req).InvocationSet
        if invs and invs[0].InvocationStatus in ("SUCCESS", "FAILED", "TIMEOUT", "TERMINATED"):
            return invs[0]
        time.sleep(2)
    raise TimeoutError("verify 轮询超时")


def extract_output(task):
    out = ""
    tr = getattr(task, "TaskResult", None)
    if tr is not None:
        if isinstance(tr, str):
            try:
                tr = json.loads(tr)
            except Exception:
                tr = None
        if isinstance(tr, dict):
            out = tr.get("Output", "") or ""
        else:
            out = getattr(tr, "Output", "") or ""
    if not out:
        out = getattr(task, "Output", "") or ""
    return out


def main():
    print("[1/4] 读取本地飞书真密钥（脱敏）...")
    try:
        secret = load_local_secret()
    except Exception as e:
        print(f"[ERROR] 读本地密钥失败: {e}")
        sys.exit(1)
    if not secret:
        print("[ERROR] 本地 credentials.json 无 feishu.app_secret")
        sys.exit(1)
    print(f"      本地密钥 head={secret[:4]} tail={secret[-4:]} len={len(secret)}")
    if secret[:4] == "l7p4" and len(secret) == 32:
        print("[WARN] 本地密钥与占位值特征一致，可能仍是占位！继续下发，由飞书返回判定。")

    sec_b64 = base64.b64encode(secret.encode("utf-8")).decode()
    shell = (
        f"export FS_SEC_B64=\"{sec_b64}\"\n"
        f"echo '{base64.b64encode(SERVER_PY.encode('utf-8')).decode()}' | base64 -d > /tmp/fix_feishu.py\n"
        "FS_SEC=$(echo \"$FS_SEC_B64\" | base64 -d) python3 -u /tmp/fix_feishu.py\n"
    )

    print("[2/4] 连接腾讯云 TAT ...")
    cred = load_credential()
    http_profile = HttpProfile(endpoint="tat.tencentcloudapi.com")
    client_profile = ClientProfile(httpProfile=http_profile)
    client = tat_client.TatClient(cred, REGION, client_profile)

    print("[3/4] 下发：写入真密钥 + Phase0 验证 ...")
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-feishu-fix-secret"
    req.Description = "飞书密钥修正(写入真密钥)+Phase0重验"
    req.WorkingDirectory = "/tmp"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print(f"      InvocationId={inv_id}")

    print("[4/4] 等待执行结果 ...")
    inv = wait_invocation(client, inv_id)
    raw_out = ""
    for _ in range(40):
        task_req = models.DescribeInvocationTasksRequest()
        task_req.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
        tasks = client.DescribeInvocationTasks(task_req).InvocationTaskSet
        if tasks:
            out = extract_output(tasks[0])
            if out.strip():
                try:
                    raw_out = base64.b64decode(out).decode("utf-8", errors="replace")
                except Exception:
                    raw_out = out
                break
        time.sleep(2)

    if raw_out:
        print(raw_out)
    else:
        print(f"[WARN] 未取到任务输出，命令状态={inv.InvocationStatus}")

    if inv.InvocationStatus != "SUCCESS":
        print(f"[ERROR] 状态={inv.InvocationStatus}")
        sys.exit(1)
    print("[DONE] 飞书密钥修正 + Phase0 验证执行完毕")


if __name__ == "__main__":
    main()
