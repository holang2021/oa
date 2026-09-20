# -*- coding: utf-8 -*-
"""离职交接待办 端到端验证（服务器端，真实认证）：
登录 admin -> 列表 -> 插测试 todo -> 列表见之 -> 关闭 -> 核验 DONE -> 清理。
不触碰任何真实业务数据；测试行插后即删。
"""
import json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

NODE = r'''
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const BASE = 'http://127.0.0.1:3001/api/v1';
(async () => {
  const login = await fetch(BASE + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:'admin', password:'admin123' }) });
  const lj = await login.json();
  const token = lj.token || (lj.data && lj.data.token);
  console.log('LOGIN_STATUS', login.status, 'HAS_TOKEN', !!token);
  if (!token) { console.log('LOGIN_BODY', JSON.stringify(lj)); await p.$disconnect(); return; }
  const auth = { Authorization: 'Bearer ' + token };
  const before = await (await fetch(BASE + '/todos', { headers: auth })).json();
  console.log('LIST_BEFORE_TOTAL', before.total, 'OK', Array.isArray(before.data));
  const id = 'test_' + Date.now();
  await p.$executeRawUnsafe(`INSERT INTO todos (id, type, title, content, status, "assigneeRole", "createdAt", "updatedAt") VALUES ($1,'OFFBOARDING_HANDOVER','测试员工 离职交接待办','测试员工（测试部）已离职，待交接：2 客户 / 1 商机 / 3 跟进。已退回公海。','PENDING','ADMIN',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, id);
  console.log('INSERTED', id);
  const after = await (await fetch(BASE + '/todos', { headers: auth })).json();
  console.log('LIST_AFTER_TOTAL', after.total, 'HAS_TEST', after.data.some(t=>t.id===id));
  const close = await (await fetch(BASE + '/todos/' + id + '/close', { method:'POST', headers: auth })).json();
  console.log('CLOSE_STATUS', close.data && close.data.status);
  const verify = await (await fetch(BASE + '/todos', { headers: auth })).json();
  const row = verify.data.find(t=>t.id===id);
  console.log('VERIFY_CLOSED', row && row.status);
  await p.$executeRawUnsafe('DELETE FROM todos WHERE id=$1', id);
  console.log('CLEANED_UP');
  await p.$disconnect();
})().catch(e=>{ console.error('E2E_ERR', e.message); process.exit(1); });
'''

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))

node_b64 = base64.b64encode(NODE.encode()).decode()
CMD = (
    'echo %s | base64 -d > /opt/holang/oa/backend/_todo_e2e.js\n'
    'cd /opt/holang/oa/backend && node _todo_e2e.js\n'
    'rm -f /opt/holang/oa/backend/_todo_e2e.js\n'
) % node_b64

req = models.RunCommandRequest(); req.Content = base64.b64encode(CMD.encode()).decode()
req.InstanceIds = ['ins-4xm95czz']; req.CommandType = 'SHELL'; req.Timeout = 120
resp = client.RunCommand(req); inv = resp.InvocationId
r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv]; r2s = client.DescribeInvocations(r2)
tid = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
for _ in range(80):
    rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [tid]; rts = client.DescribeInvocationTasks(rt)
    t = rts.InvocationTaskSet[0]
    if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
        print('STATUS:', t.TaskStatus)
        print(base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else '')
        break
    time.sleep(1)
