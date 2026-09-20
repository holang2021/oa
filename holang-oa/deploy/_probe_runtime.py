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
echo "===== PM2 PROCESS DETAIL ====="
pm2 show holang-oa-backend 2>/dev/null | grep -iE "script path|exec cwd|exec interpreter|status|pid|name|node|tsx|watch" || echo "no pm2 process"
echo "===== PM2 jlist (raw script) ====="
pm2 jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); 
import sys
for p in d:
    if 'holang-oa-backend' in p.get('name',''):
        print('SCRIPT=',p['pm_exec_path']); print('INTERP=',p.get('interpreter')); print('CWD=',p.get('pm_cwd')); print('ARGS=',p.get('pm_exec_args'))" 2>/dev/null || echo "jlist parse failed"
echo "===== package.json main/scripts ====="
grep -E '"main"|"start:prod"|"dev"|"build"' /opt/holang/oa/backend/package.json 2>/dev/null
echo "===== does server dist/index.js exist? ====="
test -f /opt/holang/oa/backend/dist/index.js && echo "SERVER_DIST_INDEX=YES" || echo "SERVER_DIST_INDEX=NO"
echo "===== server dist/routes offboard? ====="
ls /opt/holang/oa/backend/dist/routes/ 2>/dev/null | grep -i offboard || echo "no offboard in dist/routes"
echo "===== server src/routes offboard? ====="
ls /opt/holang/oa/backend/src/routes/ 2>/dev/null | grep -i offboard || echo "no offboard in src/routes"
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
