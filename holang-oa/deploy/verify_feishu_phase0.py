#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 0 飞书知识库连通性验证（方案 A：复用现有飞书应用身份 tenant_access_token）
- 服务器侧读取 /opt/holang/oa/backend/config/api-configs.json 的 feishu 凭证
- 取 tenant_access_token
- 在 space_id=7598114727864159200 下建一个测试 docx 节点验证写权限
- 立即删除测试节点（清理，不留垃圾）
- 全程不打印 secret / token 明文（仅脱敏诊断）
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
CREDENTIAL_PATH = Path("C:/Users/liush/.tccli/default.credential")

VERIFY_PY = r"""import json, urllib.request, urllib.error
CONFIG='/opt/holang/oa/backend/config/api-configs.json'
SPACE='__SPACE__'
def post_json(url, data, headers=None, method='POST'):
    req=urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers or {}, method=method)
    try:
        r=urllib.request.urlopen(req, timeout=15); return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode())
        except Exception: return {'code': e.code, 'msg': str(e)}
d=json.load(open(CONFIG))
fs=[p for p in d if p.get('provider')=='feishu']
if not fs:
    print('FEISHU_CONFIG=MISSING'); print('VERIFY_RESULT=FAIL'); raise SystemExit(0)
cid=fs[0]['credentials'].get('appId',''); csec=fs[0]['credentials'].get('appSecret','')
print('APPID='+cid)
print('SECRET_INFO=len=%d head=%s tail=%s'%(len(csec), csec[:4], csec[-4:]))
tok=post_json('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {'app_id':cid,'app_secret':csec})
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

SHELL = "echo '%s' | base64 -d > /tmp/verify_feishu.py; python3 -u /tmp/verify_feishu.py" % base64.b64encode(VERIFY_PY.encode("utf-8")).decode()


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
    """TAT 输出在部分 SDK 版本位于 TaskResult.Output 嵌套对象中"""
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
    print("[1/3] 连接腾讯云 TAT ...")
    cred = load_credential()
    http_profile = HttpProfile(endpoint="tat.tencentcloudapi.com")
    client_profile = ClientProfile(httpProfile=http_profile)
    client = tat_client.TatClient(cred, REGION, client_profile)

    print("[2/3] 下发 Phase0 飞书验证命令 ...")
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-feishu-verify-phase0"
    req.Description = "飞书知识库连通性验证（方案A应用身份）"
    req.WorkingDirectory = "/tmp"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print(f"      InvocationId={inv_id}")

    print("[3/3] 等待执行结果 ...")
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
        print("[WARN] 未取到任务输出，命令状态=%s" % inv.InvocationStatus)

    if inv.InvocationStatus != "SUCCESS":
        print(f"[ERROR] 状态={inv.InvocationStatus}")
        sys.exit(1)
    print("[DONE] Phase0 验证脚本执行完毕")


if __name__ == "__main__":
    main()
