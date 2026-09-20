import json, os
from tencentcloud.common import credential
from tencentcloud.cvm.v20170312 import cvm_client, models

d = json.load(open(os.path.expanduser('~/.tccli/default.credential')))
cred = credential.Credential(d['secretId'], d['secretKey'])
c = cvm_client.CvmClient(cred, 'ap-shanghai')
req = models.DescribeInstancesRequest()
req.InstanceIds = ['ins-4xm95czz']
resp = c.DescribeInstances(req)
for i in resp.InstanceSet:
    print('实例:', i.InstanceId, i.InstanceName)
    print('RenewFlag:', i.RenewFlag)
    print('ExpiredTime:', i.ExpiredTime)
    print('InstanceState:', i.InstanceState)
