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
echo "===== APP DIR ====="
ls -la /opt/holang/oa/app/ 2>/dev/null | head
echo "===== index.html script refs ====="
grep -oE "(src|href)=\"[^\"]+\.(js|css)\"" /opt/holang/oa/app/index.html 2>/dev/null | head
echo "===== nginx serves 200? ====="
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/)
echo "NGINX_ROOT_CODE=$CODE"
echo "===== OFFBOARDING PAGE TEXT IN BUNDLE? ====="
grep -rl "离职交接" /opt/holang/oa/app/assets/ 2>/dev/null | head || echo "no match in assets/"
echo "--- EN (Offboarding) ---"
grep -rl "Offboarding" /opt/holang/oa/app/assets/ 2>/dev/null | head || echo "no match in assets/"
echo "===== ROUTE PATH PRESENT? ====="
grep -rl "org/offboarding" /opt/holang/oa/app/assets/ 2>/dev/null | head || echo "no org/offboarding in assets/"
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
