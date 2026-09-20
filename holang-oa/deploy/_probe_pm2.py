import json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))
INSTANCE_ID = 'ins-4xm95czz'

def run_cmd(content):
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(content.encode()).decode()
    req.InstanceIds = [INSTANCE_ID]
    req.CommandType = 'SHELL'
    req.Timeout = 30
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    # resolve real task id
    r2 = models.DescribeInvocationsRequest()
    r2.InvocationIds = [inv_id]
    r2s = client.DescribeInvocations(r2)
    task_id = None
    if getattr(r2s, 'InvocationSet', None):
        task_id = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
    # poll
    for _ in range(30):
        rt = models.DescribeInvocationTasksRequest()
        rt.InvocationTaskIds = [task_id]
        rts = client.DescribeInvocationTasks(rt)
        t = rts.InvocationTaskSet[0]
        if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
            out = ''
            try:
                out = base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else ''
            except Exception:
                pass
            return t.TaskStatus, out
        time.sleep(1)
    return 'TIMEOUT', ''

status, out = run_cmd("which sqlite3 || echo NO_SQLITE; DB=/opt/holang/oa/backend/prisma/holang-crm.db; echo \"DB=$DB\"; if command -v sqlite3 >/dev/null; then sqlite3 \"$DB\" \".tables\"; echo '--- schema ---'; sqlite3 \"$DB\" \".schema customer_ai_messages\"; else echo 'no sqlite3, try node prisma'; cd /opt/holang/oa/backend && node -e \"const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\\$queryRawUnsafe('SELECT name FROM sqlite_master WHERE type=\\\"table\\\" AND name LIKE ?', '%customer_ai%').then(r=>{console.log('TABLES:',JSON.stringify(r));return p.\\$disconnect()}).catch(e=>{console.log('ERR',e.message);process.exit(0)})\"; fi")
print('STATUS:', status)
print('OUT:', out)
