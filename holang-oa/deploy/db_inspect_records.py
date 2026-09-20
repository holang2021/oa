#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
只读探查 OA 生产库最近产生的"对话/跟进/同步"类记录，证明 tech-lead 能查到 OA 后端记录。
- 只读模式打开 SQLite，不影响生产数据
- 列出相关表 + 最近记录（截断长字段）
"""
import base64
import json
import sys
import time
from pathlib import Path

from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"
DB = "/opt/holang/oa/backend/prisma/holang-crm.db"
CREDENTIAL_PATH = Path("C:/Users/liush/.tccli/default.credential")

INSPECT_PY = r"""import sqlite3, json
DB='__DB__'
try:
    conn=sqlite3.connect('file:%s?mode=ro'%DB, uri=True)
except Exception as e:
    conn=sqlite3.connect(DB)
cur=conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables=[r[0] for r in cur.fetchall()]
print('TABLES='+json.dumps(tables, ensure_ascii=False))
for t in tables:
    tl=t.lower()
    if any(k in tl for k in ['follow','activit','convers','chat','message','sync','wiki','contact','note','ai_']):
        try:
            cur.execute("SELECT COUNT(*) FROM '%s'"%t)
            cnt=cur.fetchone()[0]
            print('TABLE %s count=%d'%(t,cnt))
            if cnt>0:
                cur.execute("SELECT * FROM '%s' ORDER BY rowid DESC LIMIT 2"%t)
                cols=[d[0] for d in cur.description]
                for row in cur.fetchall():
                    rec=dict(zip(cols,row))
                    for k,v in rec.items():
                        s=str(v)
                        if len(s)>100: rec[k]=s[:100]+'...'
                    print('  REC '+json.dumps(rec, ensure_ascii=False))
        except Exception as e:
            print('ERR %s %s'%(t,e))
conn.close()
print('INSPECT_DONE')
""".replace("__DB__", DB)

SHELL = "echo '%s' | base64 -d > /tmp/db_inspect.py; python3 -u /tmp/db_inspect.py" % base64.b64encode(INSPECT_PY.encode("utf-8")).decode()


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

    print("[2/3] 下发 OA 后端只读查库命令 ...")
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-oa-db-inspect"
    req.Description = "只读探查 OA 最近对话/跟进记录"
    req.WorkingDirectory = "/tmp"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("      InvocationId=%s" % inv_id)

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
        print("[ERROR] 状态=%s" % inv.InvocationStatus)
        sys.exit(1)
    print("[DONE] 查库完毕")


if __name__ == "__main__":
    main()
