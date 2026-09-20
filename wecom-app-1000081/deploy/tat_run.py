#!/usr/bin/env python3
# 通过腾讯云 TAT SDK 在实例上执行 shell 脚本并取回输出
# 用法: python tat_run.py <脚本文件> [实例ID] [region]
import sys, json, base64, time
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
TIMEOUT = 120

def load_cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")

def main():
    if len(sys.argv) < 2:
        print("usage: python tat_run.py <script.sh> [instanceId] [region]")
        sys.exit(2)
    script_path = sys.argv[1]
    inst = sys.argv[2] if len(sys.argv) > 2 else INSTANCE
    region = sys.argv[3] if len(sys.argv) > 3 else REGION
    timeout = int(sys.argv[4]) if len(sys.argv) > 4 else TIMEOUT
    script = open(script_path, "rb").read()
    sid, skey, token = load_cred()
    cred = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, region)

    req = models.RunCommandRequest()
    req.InstanceIds = [inst]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy"
    req.Content = base64.b64encode(script).decode()
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print(f"[RunCommand] InvocationId={inv_id}")

    # 轮询任务结果（用 Filters: invocation-id）
    for i in range(40):
        time.sleep(3)
        dreq = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        dreq.Filters = [f]
        dresp = client.DescribeInvocationTasks(dreq)
        tasks = dresp.InvocationTaskSet or []
        if not tasks:
            continue
        t = tasks[0]
        status = t.TaskStatus
        print(f"[poll {i}] TaskStatus={status}")
        if status in ("SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"):
            out = t.TaskResult
            if out and getattr(out, "Output", None):
                raw = out.Output
                try:
                    dec = base64.b64decode(raw).decode("utf-8", "replace")
                except Exception:
                    dec = raw
                print("===== STDOUT/RESULT =====")
                print(dec)
                print("===== END =====")
            else:
                print("(no output captured)")
            sys.exit(0 if status == "SUCCESS" else 1)
    print("[timeout waiting for task]")
    sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as e:
        print(f"[TAT SDK ERROR] {e}")
        sys.exit(1)
