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
echo "===== UPTIME / LOAD ====="
uptime
echo "===== DISK (df -h) ====="
df -h
echo "===== MEM (free -h) ====="
free -h
echo "===== PM2 ====="
pm2 list 2>/dev/null || echo "pm2 not in PATH"
echo "===== DOCKER ====="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "no docker"
echo "===== LISTEN PORTS ====="
ss -tlnp 2>/dev/null | head -40 || netstat -tlnp 2>/dev/null | head -40
echo "===== /opt/holang TREE ====="
ls -la /opt/holang/ 2>/dev/null
echo "===== OA BACKEND PRISMA DIR ====="
ls -la /opt/holang/oa/backend/prisma/ 2>/dev/null
echo "===== DB SIZE ====="
du -sh /opt/holang/oa/backend/prisma/holang-crm.db 2>/dev/null
echo "===== BACKUP SEARCH (any .bak/.db/.sqlite anywhere under /opt/holang and /root and /var/backups) ====="
find /opt/holang /root /var/backups /home -maxdepth 4 \( -name '*.bak' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) 2>/dev/null | head -50
echo "===== COS CLI? ====="
which coscli coscmd 2>/dev/null || echo "no cos cli"
echo "===== NGINX SERVER BLOCKS ====="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null; ls -la /etc/nginx/conf.d/ 2>/dev/null
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
