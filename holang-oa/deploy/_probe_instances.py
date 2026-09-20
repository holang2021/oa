import json
from pathlib import Path
from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.cvm.v20170312 import cvm_client, models

data = json.loads(Path("C:/Users/liush/.tccli/default.credential").read_text(encoding="utf-8"))
cred = Credential(data["secretId"], data["secretKey"], data.get("token", ""))
client = cvm_client.CvmClient(cred, "ap-shanghai",
                              ClientProfile(httpProfile=HttpProfile(endpoint="cvm.tencentcloudapi.com")))

req = models.DescribeInstancesRequest()
req.Limit = 100
resp = client.DescribeInstances(req)
print("=== TOTAL INSTANCES:", len(resp.InstanceSet), "===")
for inst in resp.InstanceSet:
    print("----")
    print("InstanceId   :", inst.InstanceId)
    print("InstanceName :", inst.InstanceName)
    print("InstanceType :", inst.InstanceType)
    print("CPU/Mem      :", inst.CPU, "vCPU /", inst.Memory, "GB")
    print("PublicIp     :", inst.PublicIpAddresses)
    print("PrivateIp    :", inst.PrivateIpAddresses)
    print("Status       :", inst.InstanceState)
    print("ExpiredTime  :", inst.ExpiredTime)
    print("CreatedTime  :", inst.CreatedTime)
    print("RenewFlag    :", getattr(inst, "RenewFlag", "n/a"))
    print("ChargeType   :", inst.InstanceChargeType)
    print("OsName       :", getattr(inst, "OsName", "n/a"))
    print("Placement    :", inst.Placement.Zone if inst.Placement else "n/a")
    # disk
    try:
        print("SystemDisk  :", inst.SystemDisk.DiskType, inst.SystemDisk.DiskSize, "GB")
    except Exception:
        pass
    try:
        for d in inst.DataDisks:
            print("DataDisk    :", d.DiskType, d.DiskSize, "GB")
    except Exception:
        pass
