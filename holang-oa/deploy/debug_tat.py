import base64, json, time
from pathlib import Path
from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

data = json.loads(Path("C:/Users/liush/.tccli/default.credential").read_text(encoding="utf-8"))
cred = Credential(data["secretId"], data["secretKey"], data.get("token", ""))
client = tat_client.TatClient(cred, "ap-shanghai",
                              ClientProfile(httpProfile=HttpProfile(endpoint="tat.tencentcloudapi.com")))

inv_id = "inv-m726seg4kh"

# 轮询拿 task 输出（最多 90s）
raw = ""
for _ in range(45):
    treq = models.DescribeInvocationTasksRequest()
    treq.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
    tasks = client.DescribeInvocationTasks(treq).InvocationTaskSet
    if tasks:
        out = getattr(tasks[0], "Output", "") or ""
        if out.strip():
            try:
                raw = base64.b64decode(out).decode("utf-8", errors="replace")
            except Exception:
                raw = out
            break
    time.sleep(2)

print("=== TASK OUTPUT ===")
print(repr(raw[:2000]) if raw else "(empty after 90s poll)")

# dump 原始字段
treq = models.DescribeInvocationTasksRequest()
treq.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
tasks = client.DescribeInvocationTasks(treq).InvocationTaskSet
print("=== TASK FIELDS ===")
for t in tasks:
    print("TaskStatus=", t.TaskStatus)
    print("OutputLen=", len(getattr(t, "Output", "") or ""))
    print("HasOutputAttr=", hasattr(t, "Output"))
    # 列出所有属性
    for k in dir(t):
        if not k.startswith("_"):
            try:
                v = getattr(t, k)
                if not callable(v):
                    print(f"  {k}={str(v)[:120]}")
            except Exception:
                pass
