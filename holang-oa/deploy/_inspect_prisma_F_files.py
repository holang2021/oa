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
echo "===== F: 下全部文件(带大小/类型) ====="
find "/opt/holang/oa/backend/prisma/F:" -type f -printf '%s  %p\n' 2>/dev/null
echo "===== 是否有 db/env/json 敏感文件 ====="
find "/opt/holang/oa/backend/prisma/F:" \( -name '*.db' -o -name '.env' -o -name '*.json' -o -name '*secret*' \) 2>/dev/null || echo "无敏感文件"
echo "===== 文件总数 / 总大小 ====="
echo "files=$(find /opt/holang/oa/backend/prisma/F: -type f | wc -l)"
du -sh "/opt/holang/oa/backend/prisma/F:"
echo "===== END ====="
'''

def run_cmd(content, timeout=60):
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    req.InstanceIds = [INSTANCE_ID]; req.CommandType = 'SHELL'; req.Timeout = timeout
    resp = client.RunCommand(req); inv_id = resp.InvocationId
    r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv_id]
    r2s = client.DescribeInvocations(r2)
    task_id = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
    for _ in range(60):
        rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [task_id]
        rts = client.DescribeInvocationTasks(rt); t = rts.InvocationTaskSet[0]
        if t.TaskStatus in ('SUCCESS','FAILED','TIMEOUT','STOPPED'):
            try: return t.TaskStatus, base64.b64decode(t.TaskResult.Output).decode('utf-8','ignore') if t.TaskResult else ''
            except Exception: return t.TaskStatus, ''
        time.sleep(1)
    return 'TIMEOUT',''

st, out = run_cmd(CMD)
print('STATUS:', st)
print(out)
