#!/usr/bin/env python3
"""
后端热修复增量部署脚本（单文件/小范围改动）
- 仅覆盖 backend/src，不动 .env / prisma/*.db
- 自动 PM2 重启 holang-oa-backend
"""
import base64
import io
import json
import os
import sys
import tarfile
import time
from pathlib import Path

from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"
BACKEND_ROOT = "/opt/holang/oa/backend"
CREDENTIAL_PATH = Path("C:/Users/liush/.tccli/default.credential")


def load_credential():
    data = json.loads(CREDENTIAL_PATH.read_text(encoding="utf-8"))
    return Credential(data["secretId"], data["secretKey"], data.get("token", ""))


def make_tarball(src_dir: Path) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, _dirs, files in os.walk(src_dir):
            for f in files:
                full = Path(root) / f
                arc = full.relative_to(src_dir.parent).as_posix()
                tar.add(full, arcname=arc)
    return buf.getvalue()


def make_tarball_files(pairs: list[tuple[Path, str]]) -> bytes:
    """pairs: [(本地绝对路径, tar 内 arcname)]"""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for full, arc in pairs:
            tar.add(full, arcname=arc)
    return buf.getvalue()


def wait_invocation(client, invocation_id: str, timeout: int = 300):
    start = time.time()
    while time.time() - start < timeout:
        req = models.DescribeInvocationsRequest()
        req.Filters = [{"Name": "invocation-id", "Values": [invocation_id]}]
        resp = client.DescribeInvocations(req)
        invs = resp.InvocationSet
        if not invs:
            time.sleep(2)
            continue
        inv = invs[0]
        if inv.InvocationStatus in ("SUCCESS", "FAILED", "TIMEOUT", "TERMINATED"):
            return inv
        time.sleep(2)
    raise TimeoutError(f"部署轮询超时（>{timeout}s）")


def main():
    project_root = Path(__file__).resolve().parent.parent
    backend_root = project_root / "backend"

    # 支持单文件/多文件热修：python oa_deploy_backend_hotfix.py --path src/a.ts --path src/b.ts
    if "--path" in sys.argv:
        pairs = []
        i = 0
        while i < len(sys.argv):
            if sys.argv[i] == "--path" and i + 1 < len(sys.argv):
                rel_path = sys.argv[i + 1]
                full_path = backend_root / rel_path
                if not full_path.exists():
                    print(f"[ERROR] 文件不存在: {full_path}")
                    sys.exit(1)
                arc_name = rel_path.replace("\\", "/")
                pairs.append((full_path, arc_name))
            i += 1
        if not pairs:
            print("[ERROR] 未提供有效的 --path 参数")
            sys.exit(1)
        print(f"[1/4] 打包 {len(pairs)} 个文件 ...")
        for _, a in pairs:
            print(f"      - {a}")
        payload = make_tarball_files(pairs)
    else:
        src_dir = backend_root / "src"
        if not src_dir.exists():
            print(f"[ERROR] 源码目录不存在: {src_dir}")
            sys.exit(1)
        print("[1/4] 打包 backend/src ...")
        payload = make_tarball(src_dir)

    b64 = base64.b64encode(payload).decode()
    print(f"      tarball {len(payload)} bytes -> base64 {len(b64)} chars")

    print("[2/4] 连接腾讯云 TAT ...")
    cred = load_credential()
    http_profile = HttpProfile(endpoint="tat.tencentcloudapi.com")
    client_profile = ClientProfile(httpProfile=http_profile)
    client = tat_client.TatClient(cred, REGION, client_profile)

    shell_script = r"""#!/bin/bash
set -e
PAYLOAD='__PAYLOAD__'
TMP_TGZ=/tmp/holang_oa_backend_hotfix_$(date +%%s).tgz
echo "[TAT] 接收 payload ${#PAYLOAD} chars"
echo "$PAYLOAD" | base64 -d > "$TMP_TGZ"
echo "[TAT] 解压到 __BACKEND_ROOT__"
cd __BACKEND_ROOT__
tar -xzf "$TMP_TGZ"
rm -f "$TMP_TGZ"
echo "[TAT] PM2 重启 holang-oa-backend"
pm2 restart holang-oa-backend --update-env
pm2 save
sleep 2
pm2 show holang-oa-backend | grep -E "status|pid|name" || true
echo "[TAT] 完成"
""".replace("__PAYLOAD__", b64).replace("__BACKEND_ROOT__", BACKEND_ROOT)

    req = models.RunCommandRequest()
    # TAT Content 要求 Base64 编码后的脚本内容
    req.Content = base64.b64encode(shell_script.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-oa-backend-hotfix"
    req.Description = "增量覆盖 backend/src 并重启服务"
    req.WorkingDirectory = "/tmp"

    print("[3/4] 下发 TAT 命令 ...")
    resp = client.RunCommand(req)
    invocation_id = resp.InvocationId
    print(f"      InvocationId={invocation_id}")

    print("[4/4] 等待执行结果 ...")
    inv = wait_invocation(client, invocation_id)
    print(f"      状态={inv.InvocationStatus}")

    # 打印任务输出
    task_req = models.DescribeInvocationTasksRequest()
    task_req.Filters = [{"Name": "invocation-id", "Values": [invocation_id]}]
    task_resp = client.DescribeInvocationTasks(task_req)
    for task in task_resp.InvocationTaskSet:
        print(f"\n--- 实例 {task.InstanceId} 输出 ---")
        out = getattr(task, "Output", "") or ""
        try:
            out = base64.b64decode(out).decode("utf-8", errors="replace")
        except Exception:
            pass
        print(out[-4000:] if len(out) > 4000 else out)
        if task.TaskStatus == "FAILED":
            print(f"[ERROR] 任务失败: {getattr(task, 'ErrorInfo', '')}")
            sys.exit(1)

    if inv.InvocationStatus != "SUCCESS":
        print(f"[ERROR] 部署未成功: {inv.InvocationStatus}")
        sys.exit(1)
    print("[OK] 后端热修复部署完成")


if __name__ == "__main__":
    main()
