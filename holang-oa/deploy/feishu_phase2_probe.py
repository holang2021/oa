# -*- coding: utf-8 -*-
"""Phase 2 数据探测（只读 TAT 查 OA 生产库）：统计 AI 对话线程数与含备注的联系人数，供同步方案规划。
- 只读模式，不影响生产数据
- 不拉 PII（phone/email/wechat/whatsapp 不查）
"""
import base64, json, time, sys
from pathlib import Path
from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"
DB = "/opt/holang/oa/backend/prisma/holang-crm.db"
CREDENTIAL_PATH = Path("C:/Users/liush/.tccli/default.credential")

PROBE_PY = r"""import sqlite3, json
DB='__DB__'
conn=sqlite3.connect('file:%s?mode=ro'%DB, uri=True)
cur=conn.cursor()
# AI 对话：按 customerId 分组，统计线程数与消息数
cur.execute("SELECT customerId, COUNT(*), MIN(createdAt), MAX(createdAt) FROM customer_ai_messages GROUP BY customerId ORDER BY MAX(createdAt) DESC")
ai_threads=cur.fetchall()
print('AI_THREADS=%d'%len(ai_threads))
for cid,cnt,mn,mx in ai_threads[:8]:
    print('  CUST %s msgs=%d %s~%s'%(cid,cnt,mn,mx))
cur.execute("SELECT COUNT(*) FROM customer_ai_messages")
print('AI_MSGS_TOTAL=%d'%cur.fetchone()[0])
# 联系人备注：仅统计有非空 remark 的（不含 PII 列）
cur.execute("SELECT COUNT(*) FROM contacts WHERE remark IS NOT NULL AND TRIM(remark)<>'' ")
print('CONTACTS_WITH_REMARK=%d'%cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM contacts")
print('CONTACTS_TOTAL=%d'%cur.fetchone()[0])
# 采样一条有备注的联系人（安全字段）
cur.execute("SELECT customerId,name,position,dept,isKeyPerson,substr(remark,1,60) FROM contacts WHERE remark IS NOT NULL AND TRIM(remark)<>'' ORDER BY updatedAt DESC LIMIT 3")
for r in cur.fetchall():
    print('  NOTE '+' | '.join(str(x) for x in r))
conn.close()
print('PROBE_DONE')
""".replace("__DB__", DB)

SHELL = "echo '%s' | base64 -d > /tmp/phase2_probe.py; python3 -u /tmp/phase2_probe.py" % base64.b64encode(PROBE_PY.encode("utf-8")).decode()


def load_credential():
    data = json.loads(CREDENTIAL_PATH.read_text(encoding="utf-8"))
    return Credential(data["secretId"], data["secretKey"], data.get("token", ""))


def wait_invocation(client, invocation_id, timeout=150):
    start = time.time()
    while time.time() - start < timeout:
        req = models.DescribeInvocationsRequest()
        req.Filters = [{"Name": "invocation-id", "Values": [invocation_id]}]
        invs = client.DescribeInvocations(req).InvocationSet
        if invs and invs[0].InvocationStatus in ("SUCCESS", "FAILED", "TIMEOUT", "TERMINATED"):
            return invs[0]
        time.sleep(2)
    raise TimeoutError("轮询超时")


def extract_output(task):
    out = ""
    tr = getattr(task, "TaskResult", None)
    if tr is not None:
        if isinstance(tr, str):
            try: tr = json.loads(tr)
            except Exception: tr = None
        if isinstance(tr, dict): out = tr.get("Output", "") or ""
        else: out = getattr(tr, "Output", "") or ""
    if not out: out = getattr(task, "Output", "") or ""
    return out


def main():
    cred = load_credential()
    http_profile = HttpProfile(endpoint="tat.tencentcloudapi.com")
    client = tat_client.TatClient(cred, REGION, ClientProfile(httpProfile=http_profile))
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-phase2-probe"
    req.Description = "只读探测 Phase2 同步数据量"
    req.WorkingDirectory = "/tmp"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    inv = wait_invocation(client, inv_id)
    raw_out = ""
    for _ in range(40):
        task_req = models.DescribeInvocationTasksRequest()
        task_req.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
        tasks = client.DescribeInvocationTasks(task_req).InvocationTaskSet
        if tasks:
            out = extract_output(tasks[0])
            if out.strip():
                try: raw_out = base64.b64decode(out).decode("utf-8", errors="replace")
                except Exception: raw_out = out
                break
        time.sleep(2)
    print(raw_out or ("[WARN] 无输出 status=%s" % inv.InvocationStatus))
    if inv.InvocationStatus != "SUCCESS":
        sys.exit(1)


if __name__ == "__main__":
    main()
