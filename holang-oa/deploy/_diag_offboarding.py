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

CMD = r'''
echo "===== FULL pm2 error (head) ====="
pm2 logs holang-oa-backend --lines 120 --nostream 2>/dev/null | grep -iE "Cannot find module|Error:|\.ts'|code: 'MODULE" | head -20
echo "===== tsconfig paths on server ====="
grep -nE "paths|baseUrl|@/" /opt/holang/oa/backend/tsconfig.json 2>/dev/null || echo "no paths in tsconfig"
echo "===== does server have the imported files? ====="
for f in src/repositories/audit-log.repository.ts src/middleware/errorHandler.ts src/middleware/auth.ts src/middleware/rbac.ts src/repositories/audit-log.repository.ts; do
  test -f /opt/holang/oa/backend/$f && echo "OK  $f" || echo "MISSING  $f"
done
echo "===== pm2 status now ====="
pm2 show holang-oa-backend 2>/dev/null | grep -iE "status|restart time" | head -3
echo "===== END ====="
'''

def run_cmd(content):
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(content.encode()).decode()
    req.InstanceIds = [INSTANCE_ID]
    req.CommandType = 'SHELL'
    req.Timeout = 60
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    r2 = models.DescribeInvocationsRequest()
    r2.InvocationIds = [inv_id]
    r2s = client.DescribeInvocations(r2)
    task_id = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
    for _ in range(60):
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

status, out = run_cmd(CMD)
print('STATUS:', status)
print(out)
