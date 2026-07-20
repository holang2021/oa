"""
Query Tencent Cloud Lighthouse instances using OAuth temporary credentials.
"""
import json
import os
import sys
import io

# Fix Windows GBK encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.lighthouse.v20200324 import lighthouse_client, models

# Load credentials
CRED_PATH = os.path.expanduser("~/.tccli/default.credential")
with open(CRED_PATH, "r", encoding="utf-8") as f:
    cred_data = json.load(f)

secret_id = cred_data["secretId"]
secret_key = cred_data["secretKey"]
token = cred_data["token"]

print(f"凭证类型: {cred_data['type']}")
print(f"SecretId: {secret_id[:8]}...{secret_id[-4:]}")
print(f"Token 长度: {len(token)}")
print()

# Regions to check
REGIONS = [
    "ap-guangzhou",
    "ap-shanghai",
    "ap-beijing",
    "ap-nanjing",
    "ap-chengdu",
    "ap-hongkong",
    "ap-singapore",
    "ap-tokyo",
    "na-siliconvalley",
]

all_instances = []

for region in REGIONS:
    try:
        cred = credential.Credential(secret_id, secret_key, token)
        httpProfile = HttpProfile()
        httpProfile.endpoint = "lighthouse.tencentcloudapi.com"
        clientProfile = ClientProfile()
        clientProfile.httpProfile = httpProfile

        client = lighthouse_client.LighthouseClient(cred, region, clientProfile)
        req = models.DescribeInstancesRequest()
        req.from_json_string(json.dumps({"Limit": 100}))

        resp = client.DescribeInstances(req)
        data = json.loads(resp.to_json_string())

        instances = data.get("InstanceSet", [])
        total = data.get("TotalCount", 0)

        if total > 0:
            print(f"[{region}] 共 {total} 台实例:")
            for inst in instances:
                all_instances.append({**inst, "_region": region})
                print(f"  - {inst['InstanceId']} | {inst['InstanceName']} | "
                      f"{inst['InstanceState']} | {inst.get('PublicAddresses', ['N/A'])[0] if inst.get('PublicAddresses') else 'N/A'} | "
                      f"{inst['CPU']}核{inst['Memory']}GB | {inst['OsName']}")
        else:
            print(f"[{region}] 无实例")

    except TencentCloudSDKException as e:
        # Skip regions that don't have Lighthouse service
        if "UnsupportedRegion" in str(e) or "InvalidRegion" in str(e):
            pass
        else:
            print(f"[{region}] 查询失败: {e}")

print()
print(f"=== 总计: {len(all_instances)} 台实例 ===")
print()

if all_instances:
    print(json.dumps(all_instances, ensure_ascii=False, indent=2))
else:
    print("未找到任何 Lighthouse 实例。需要新建一台服务器。")
