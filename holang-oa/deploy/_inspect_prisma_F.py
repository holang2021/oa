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
echo "===== prisma/ 全量列表 ====="
ls -la /opt/holang/oa/backend/prisma/
echo "===== F: 目录是否存在 ====="
if [ -e "/opt/holang/oa/backend/prisma/F:" ]; then
  echo "EXISTS"
  echo "----- 内容(递归) -----"
  find "/opt/holang/oa/backend/prisma/F:" -maxdepth 4 -printf '%y %s  %p\n' 2>/dev/null
  echo "----- 总大小 -----"
  du -sh "/opt/holang/oa/backend/prisma/F:" 2>/dev/null
else
  echo "NOT FOUND (可能已被清理或路径不同)"
fi
echo "===== 确认真库位置与大小(不得误删) ====="
ls -l /opt/holang/oa/backend/prisma/holang-crm.db
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
