# -*- coding: utf-8 -*-
"""快赢闭环：在生产库创建 currencies / code_rules / field_configs 三张配置表（幂等，只增不删）。
顺序：pm2 stop -> 备份 DB -> 写 SQL 文件 -> prisma db execute -> 核验三表存在 -> 拉起后端。
不走 prisma generate，避免触碰既有表结构与 TAT 24KB 限制（沿用 _deploy_todo_table.py 范式）。
"""
import json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

SQL_PATH = r'F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa\backend\sql\setup_config_tables.sql'
SQL = open(SQL_PATH, encoding='utf-8').read()

# 核验用 node 脚本（base64 写出，避免 shell 对 $ 的转义问题）
VERIFY_JS = r'''
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('currencies','code_rules','field_configs')");
  const names = rows.map(r => r.name).sort();
  console.log('TABLE_CHECK', JSON.stringify(names));
  await p.$disconnect();
})().catch(e => { console.error('TABLE_CHECK_ERR', e.message); process.exit(1); });
'''

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))

TS = time.strftime('%Y%m%d%H%M%S')
sql_b64 = base64.b64encode(SQL.encode()).decode()
verify_b64 = base64.b64encode(VERIFY_JS.encode()).decode()

CMD = (
    'set -e\n'
    'PM2_EXE=$(command -v pm2 || echo "")\n'
    'if [ -n "$PM2_EXE" ]; then pm2 stop holang-oa-backend || true; fi\n'
    'cp /opt/holang/oa/backend/prisma/holang-crm.db /tmp/holang_crm_config_bak_%s.db\n'
    'echo "DB_BACKED_UP=/tmp/holang_crm_config_bak_%s.db"\n'
    'echo %s | base64 -d > /opt/holang/oa/backend/setup_config_tables.sql\n'
    'cd /opt/holang/oa/backend\n'
    'npx prisma db execute --schema prisma/schema.prisma --file setup_config_tables.sql\n'
    'echo "TABLES_CREATED"\n'
    'echo %s | base64 -d > /opt/holang/oa/backend/_config_tbl_verify.js\n'
    'node /opt/holang/oa/backend/_config_tbl_verify.js\n'
    'rm -f /opt/holang/oa/backend/_config_tbl_verify.js\n'
    'if [ -n "$PM2_EXE" ]; then pm2 start holang-oa-backend || pm2 restart holang-oa-backend || true; fi\n'
    'echo "BACKEND_STARTED"\n'
) % (TS, TS, sql_b64, verify_b64)

req = models.RunCommandRequest()
req.Content = base64.b64encode(CMD.encode()).decode()
req.InstanceIds = ['ins-4xm95czz']; req.CommandType = 'SHELL'; req.Timeout = 240
resp = client.RunCommand(req); inv = resp.InvocationId
r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv]; r2s = client.DescribeInvocations(r2)
tid = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
for _ in range(120):
    rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [tid]; rts = client.DescribeInvocationTasks(rt)
    t = rts.InvocationTaskSet[0]
    if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
        print('STATUS:', t.TaskStatus)
        print(base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else '')
        break
    time.sleep(1)
