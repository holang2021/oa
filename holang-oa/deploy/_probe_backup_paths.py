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
echo "===== PROD DB ====="
ls -l /opt/holang/oa/backend/prisma/holang-crm.db 2>/dev/null && du -h /opt/holang/oa/backend/prisma/holang-crm.db 2>/dev/null
echo "===== .env ====="
ls -l /opt/holang/oa/backend/.env 2>/dev/null && echo "(.env exists)"
echo "===== config dir ====="
ls -l /opt/holang/oa/backend/config/ 2>/dev/null
echo "===== wecom app config (1000081) ====="
ls -l /opt/holang/oa/wecom-app-1000081/ 2>/dev/null | head
echo "===== verify dir ====="
ls -l /opt/holang/oa/verify/ 2>/dev/null
echo "===== frontend dist ====="
du -sh /opt/holang/oa/app 2>/dev/null
echo "===== total /opt/holang size ====="
du -sh /opt/holang 2>/dev/null
echo "===== gzip test size of db ====="
gzip -c /opt/holang/oa/backend/prisma/holang-crm.db 2>/dev/null | wc -c
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
