import base64
import json
import time
from pathlib import Path

from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = Path("C:/Users/liush/.tccli/default.credential")
REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"


def main():
    data = json.loads(CRED_PATH.read_text(encoding="utf-8"))
    cred = Credential(data["secretId"], data["secretKey"], data.get("token", ""))
    client = tat_client.TatClient(cred, REGION, ClientProfile())

    script = """#!/bin/bash
echo "--- grep fix ---"
grep -n "MAX_HISTORY_TURNS" /opt/holang/oa/backend/src/services/customerAi.service.ts || true
echo "--- pm2 status ---"
pm2 show holang-oa-backend | grep -E "status|pid|name" || true
"""
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(script.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-verify-hotfix"
    req.WorkingDirectory = "/tmp"
    resp = client.RunCommand(req)
    inv = resp.InvocationId
    print(f"InvocationId={inv}")

    for _ in range(30):
        r = models.DescribeInvocationsRequest()
        r.Filters = [{"Name": "invocation-id", "Values": [inv]}]
        inv_resp = client.DescribeInvocations(r)
        if inv_resp.InvocationSet and inv_resp.InvocationSet[0].InvocationStatus in ("SUCCESS", "FAILED", "TIMEOUT"):
            print(f"status={inv_resp.InvocationSet[0].InvocationStatus}")
            break
        time.sleep(2)

    t = models.DescribeInvocationTasksRequest()
    t.Filters = [{"Name": "invocation-id", "Values": [inv]}]
    tr = client.DescribeInvocationTasks(t)
    for task in tr.InvocationTaskSet:
        out = ""
        if task.TaskResult:
            out = task.TaskResult.Output or ""
            try:
                out = base64.b64decode(out).decode("utf-8", errors="replace")
            except Exception:
                pass
        print(out[-4000:] if len(out) > 4000 else out)


if __name__ == "__main__":
    main()
