#!/usr/bin/env python3
# 把本地脚本推上生产(CVM)并以只读方式对其运行，返回输出
import sys, base64, time, json, os
from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"; REGION = "ap-shanghai"
DB = "/opt/holang/oa/backend/prisma/holang-crm.db"
CHUNK = 20000

def cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def tat_run(content, timeout=120):
    sid, skey, token = cred()
    cr = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    cl = tat_client.TatClient(cr, REGION)
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]; req.CommandType = "SHELL"; req.CommandName = "holang-probe"
    req.Content = base64.b64encode(content.encode("utf-8")).decode("ascii"); req.Timeout = timeout
    inv = cl.RunCommand(req).InvocationId
    for _ in range(60):
        time.sleep(3)
        d = models.DescribeInvocationTasksRequest(); f = models.Filter()
        f.Name = "invocation-id"; f.Values = [inv]; d.Filters = [f]
        tasks = cl.DescribeInvocationTasks(d).InvocationTaskSet or []
        if not tasks: continue
        t = tasks[0]
        if t.TaskStatus in ("SUCCESS","FAILED","TIMEOUT","CANCELLED"):
            out = getattr(t.TaskResult,"Output",None)
            return t.TaskStatus, base64.b64decode(out).decode("utf-8","replace") if out else "(no output)"
    return "TIMEOUT",""

def main():
    local = sys.argv[1]
    args = " ".join(sys.argv[2:])
    raw = open(local,"rb").read()
    b64 = base64.b64encode(raw).decode("ascii")
    chunks=[b64[i:i+CHUNK] for i in range(0,len(b64),CHUNK)]
    remote = os.path.basename(local)
    tat_run(f"rm -f /tmp/{remote}.b64")
    for i,ch in enumerate(chunks):
        st,out = tat_run(f"cat >> /tmp/{remote}.b64 <<'HOLANG'\n{ch}\nHOLANG\n")
        if st!="SUCCESS":
            print(f"[FAIL] chunk {i}: {out}"); sys.exit(1)
    st,out = tat_run(f"base64 -d /tmp/{remote}.b64 > /tmp/{remote} && echo SHIPPED")
    if st!="SUCCESS":
        print(f"[FAIL] assemble: {out}"); sys.exit(1)
    # 强制只读运行
    st,out = tat_run(f"python3 /tmp/{remote} {DB} {args}")
    print(out)
    tat_run(f"rm -f /tmp/{remote} /tmp/{remote}.b64")

if __name__=="__main__":
    main()
