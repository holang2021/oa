# -*- coding: utf-8 -*-
import json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

NODE = r'''
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const del = await p.$executeRawUnsafe("DELETE FROM todos WHERE id LIKE 'test_%'");
  console.log('DELETED_TEST_ROWS', del);
  const cnt = await p.$queryRawUnsafe("SELECT count(*) AS c FROM todos");
  console.log('TODOS_NOW', JSON.stringify(cnt));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))

node_b64 = base64.b64encode(NODE.encode()).decode()
CMD = (
    'echo %s | base64 -d > /opt/holang/oa/backend/_clean_todos.js\n'
    'cd /opt/holang/oa/backend && node _clean_todos.js\n'
    'rm -f /opt/holang/oa/backend/_clean_todos.js\n'
) % node_b64

req = models.RunCommandRequest(); req.Content = base64.b64encode(CMD.encode()).decode()
req.InstanceIds = ['ins-4xm95czz']; req.CommandType = 'SHELL'; req.Timeout = 90
resp = client.RunCommand(req); inv = resp.InvocationId
r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv]; r2s = client.DescribeInvocations(r2)
tid = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
for _ in range(60):
    rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [tid]; rts = client.DescribeInvocationTasks(rt)
    t = rts.InvocationTaskSet[0]
    if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
        print('STATUS:', t.TaskStatus)
        print(base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else '')
        break
    time.sleep(1)
