#!/usr/bin/env python3
# 验证：departments 列已加、prisma 可查询；rbac/roles 路由存活（无 token 应 401）
import json, base64, time
from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"

def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def run_tat(client, script, timeout=120):
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]; req.CommandType = "SHELL"
    req.CommandName = "holang-verify-multidept"
    req.Content = base64.b64encode(script.encode("utf-8")).decode()
    req.Timeout = timeout
    resp = client.RunCommand(req); inv_id = resp.InvocationId
    for i in range(60):
        time.sleep(3)
        dreq = models.DescribeInvocationTasksRequest()
        f = models.Filter(); f.Name = "invocation-id"; f.Values = [inv_id]
        dreq.Filters = [f]
        dresp = client.DescribeInvocationTasks(dreq)
        tasks = dresp.InvocationTaskSet or []
        if not tasks: continue
        t = tasks[0]
        if t.TaskStatus in ("SUCCESS","FAILED","TIMEOUT","CANCELLED"):
            out = t.TaskResult; txt = ""
            if out and getattr(out,"Output",None):
                try: txt = base64.b64decode(out.Output).decode("utf-8","replace")
                except Exception: txt = out.Output
            return t.TaskStatus, txt
    return "TIMEOUT", ""

sid, skey, token = load_cred()
cred = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
client = tat_client.TatClient(cred, REGION)

script = r"""
set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cd /opt/holang/oa/backend
echo "=== query departments column via prisma client ==="
cat > v.js <<'JSEOF'
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{try{const u=await p.user.findFirst({select:{id:true,name:true,departments:true}}); console.log('QUERY_OK', u?JSON.stringify(u):'null');}catch(e){console.log('QUERY_ERR', e.message); process.exit(2);} finally{await p.$disconnect();}})();
JSEOF
node v.js
rm -f v.js
echo "=== rbac/roles route alive (expect 401 without token) ==="
curl -sS -o /dev/null -w "HTTP_%{http_code}\n" http://127.0.0.1:3001/api/v1/rbac/roles || true
echo VERIFY_DONE
"""
st, txt = run_tat(client, script, timeout=120)
print(f"[status] {st}")
print(txt)
