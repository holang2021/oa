# -*- coding: utf-8 -*-
"""快赢闭环 端到端验证（服务器端，真实认证）：
登录 admin -> GET 三张配置表列表 -> POST 一个测试币种 -> GET 列表见之 -> DELETE 清理。
证明 currencies/code_rules/field_configs 三个后端模块真实读写全绿。
不触碰任何真实业务数据；测试币种插后即删。
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

  const cur = await (await fetch(BASE + '/currencies', { headers: auth })).json();
  console.log('CURRENCIES_OK', Array.isArray(cur.data), 'COUNT', cur.data && cur.data.length);

  const cr = await (await fetch(BASE + '/code-rules', { headers: auth })).json();
  console.log('CODE_RULES_OK', Array.isArray(cr.data), 'COUNT', cr.data && cr.data.length);

  const fc = await (await fetch(BASE + '/field-configs', { headers: auth })).json();
  console.log('FIELD_CONFIGS_OK', !!fc.data, 'MODULES', fc.data && Object.keys(fc.data).length);

  // 写测试币种，验证真实落库
  const testId = 'ZZZ' + Date.now().toString().slice(-4);
  const post = await (await fetch(BASE + '/currencies', { method:'POST', headers:{'Content-Type':'application/json', ...auth}, body: JSON.stringify({ id: testId, name:'测试币', nameEn:'Test', symbol:'$', rate: 1.23, isDefault:false, isActive:true }) })).json();
  console.log('CURRENCY_POST_CODE', post.code, 'ID', post.data && post.data.id);

  const after = await (await fetch(BASE + '/currencies', { headers: auth })).json();
  console.log('HAS_TEST_CURRENCY', after.data && after.data.some(c => c.id === testId));

  const del = await (await fetch(BASE + '/currencies/' + testId, { method:'DELETE', headers: auth })).json();
  console.log('CURRENCY_DELETE_CODE', del.code);

  const final = await (await fetch(BASE + '/currencies', { headers: auth })).json();
  console.log('CLEANED_OK', !(final.data && final.data.some(c => c.id === testId)));

  await p.$disconnect();
})().catch(e => { console.error('E2E_ERR', e.message); process.exit(1); });
'''

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))

node_b64 = base64.b64encode(NODE.encode()).decode()
CMD = (
    'echo %s | base64 -d > /opt/holang/oa/backend/_config_e2e.js\n'
    'cd /opt/holang/oa/backend && node _config_e2e.js\n'
    'rm -f /opt/holang/oa/backend/_config_e2e.js\n'
) % node_b64

req = models.RunCommandRequest(); req.Content = base64.b64encode(CMD.encode()).decode()
req.InstanceIds = ['ins-4xm95czz']; req.CommandType = 'SHELL'; req.Timeout = 120
resp = client.RunCommand(req); inv = resp.InvocationId
r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv]; r2s = client.DescribeInvocations(r2)
tid = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
for _ in range(90):
    rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [tid]; rts = client.DescribeInvocationTasks(rt)
    t = rts.InvocationTaskSet[0]
    if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
        print('STATUS:', t.TaskStatus)
        print(base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else '')
        break
    time.sleep(1)
