# -*- coding: utf-8 -*-
"""离职交接待办：在服务器创建 todos 表（幂等，只增不删）。
顺序：pm2 stop → 备份 DB → CREATE TABLE IF NOT EXISTS → 核验表存在。
不走 prisma generate/db push，避免触碰既有表结构与 TAT 24KB 限制。
"""
import json, base64, time, os
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

SQL = """
CREATE TABLE IF NOT EXISTS "todos" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'OFFBOARDING_HANDOVER',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "relatedUserId" TEXT,
  "relatedUserName" TEXT,
  "meta" TEXT,
  "assigneeRole" TEXT NOT NULL DEFAULT 'ADMIN',
  "createdById" TEXT,
  "createdByName" TEXT,
  "doneById" TEXT,
  "doneByName" TEXT,
  "doneAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "todos_status_idx" ON "todos"("status");
CREATE INDEX IF NOT EXISTS "todos_type_idx" ON "todos"("type");
CREATE INDEX IF NOT EXISTS "todos_assigneeRole_idx" ON "todos"("assigneeRole");
CREATE INDEX IF NOT EXISTS "todos_relatedUserId_idx" ON "todos"("relatedUserId");
"""

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))

TS = time.strftime('%Y%m%d%H%M%S')
sql_b64 = base64.b64encode(SQL.encode()).decode()

CMD = r'''
set -e
PM2_EXE=$(command -v pm2 || echo "")
if [ -n "$PM2_EXE" ]; then pm2 stop holang-oa-backend || true; fi
# 备份生产库（防删库）
cp /opt/holang/oa/backend/prisma/holang-crm.db /tmp/holang_crm_todo_bak_%s.db
echo "DB_BACKED_UP=/tmp/holang_crm_todo_bak_%s.db"
# 写出建表 SQL
echo %s | base64 -d > /opt/holang/oa/backend/todos_create.sql
cd /opt/holang/oa/backend
npx prisma db execute --schema prisma/schema.prisma --file todos_create.sql
echo "TABLE_CREATED"
# 核验表存在
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$queryRawUnsafe(\"SELECT name FROM sqlite_master WHERE type='table' AND name='todos'\").then(r=>{console.log('TABLE_CHECK',JSON.stringify(r));process.exit(0)}).catch(e=>{console.error('TABLE_CHECK_ERR',e.message);process.exit(1)})"
''' % (TS, TS, sql_b64)

req = models.RunCommandRequest()
req.Content = base64.b64encode(CMD.encode()).decode()
req.InstanceIds = ['ins-4xm95czz']; req.CommandType = 'SHELL'; req.Timeout = 180
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
