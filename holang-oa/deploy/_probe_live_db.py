import json, os, re, time
from tencentcloud.common import credential
from tencentcloud.cvm.v20170312 import cvm_client
from tencentcloud.cvm.v20170312 import models as cvm_models

cred = json.load(open(os.path.expanduser('~/.tccli/default.credential')))
c = cvm_client.CvmClient(credential.Credential(cred['secretId'], cred['secretKey']), 'ap-shanghai')

PY = "import sqlite3;c=sqlite3.connect('/opt/holang/oa/backend/prisma/holang-crm.db');cur=c.cursor();\n"
PY += "cur.execute('SELECT COUNT(*) FROM users');print('USERS',cur.fetchone()[0])\n"
PY += "cur.execute('SELECT role,COUNT(*) FROM users GROUP BY role');print('ROLES',cur.fetchall())\n"
PY += "cur.execute('SELECT COUNT(*) FROM wecom_departments');print('WEDEPTS',cur.fetchone()[0])\n"
PY += "cur.execute('SELECT COUNT(*) FROM customers');print('CUST',cur.fetchone()[0])\n"
PY += "cur.execute('SELECT COUNT(*) FROM opportunities');print('OPP',cur.fetchone()[0])\n"
PY += "cur.execute('SELECT COUNT(*) FROM quotes');print('QUOTE',cur.fetchone()[0])\n"
import base64
B64 = base64.b64encode(PY.encode()).decode()
SCRIPT = "echo " + B64 + " | base64 -d | python3"

inv_req = cvm_models.DescribeInstancesRequest()
inv_req.InstanceIds = ['ins-4xm95czz']
inv = c.DescribeInstances(inv_req)
region = inv.InstanceSet[0].Placement.Zone[:-2]
from tencentcloud.tat.v20201028 import tat_client
tc = tat_client.TatClient(credential.Credential(cred['secretId'], cred['secretKey']), region)
from tencentcloud.tat.v20201028 import models as tat_models
req = tat_models.RunCommandRequest()
req.Content = SCRIPT
req.InstanceIds = ['ins-4xm95czz']
req.CommandType = 'SHELL'
req.Username = 'root'
req.Timeout = 60
resp = tc.RunCommand(req)
inv_id = resp.InvocationId
time.sleep(4)
dq = tat_models.DescribeInvocationTasksRequest()
dq.InvocationId = inv_id
dq.Filters = []
for _ in range(6):
    r = tc.DescribeInvocationTasks(dq)
    if r.InvocationTaskSet and r.InvocationTaskSet[0].TaskStatus in ('SUCCESS','FAILED'):
        t = r.InvocationTaskSet[0]
        print("STATUS", t.TaskStatus)
        print(t.TaskResult.Output if t.TaskResult else "")
        break
    time.sleep(3)
