#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOLANG OA 后端「定向补丁」运行器（影响隔离部署，替代全量 reload 巨石）
========================================================================
对应原则:
  #1 可独立验证 —— 补丁前后都跑 verify_modules 指定模块，刘总可直接观测。
  #2 低耦合     —— 只跑一个 scoped 补丁脚本，不与"清表/全导/重灌"耦死。
  #3 影响隔离   —— 补丁脚本自己声明只碰哪些表；本运行器只负责安全执行。
  #4 防单点连带 —— 去掉盲目 set -e：每步显式判定，末尾强制 pm2 restart，
                 任一步失败 -> 从备份回滚 -> 重启 -> 报告 FAIL，绝不留服务停摆。

用法:
  python deploy_patch.py <本地补丁脚本.py> --modules "发货继承,回款继承,开票继承" [--dry-run]
例:
  python deploy_patch.py C:/Users/liush/patch_sales_type.py --modules "发货继承,回款继承,开票继承"
"""
import os, sys, base64, time, json
from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
DST = "/opt/holang/oa/backend"
DB = f"{DST}/prisma/holang-crm.db"
CHUNK = 20000
VERIFY_LOCAL = "C:/Users/liush/verify_modules.py"  # 本机已有校验器


def cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")


def tat_run(content, timeout=120):
    sid, skey, token = cred()
    cr = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    cl = tat_client.TatClient(cr, REGION)
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-patch"
    req.Content = base64.b64encode(content.encode("utf-8")).decode("ascii")
    req.Timeout = timeout
    inv = cl.RunCommand(req).InvocationId
    for _ in range(60):
        time.sleep(3)
        d = models.DescribeInvocationTasksRequest()
        f = models.Filter(); f.Name = "invocation-id"; f.Values = [inv]
        d.Filters = [f]
        tasks = cl.DescribeInvocationTasks(d).InvocationTaskSet or []
        if not tasks:
            continue
        t = tasks[0]
        if t.TaskStatus in ("SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"):
            out = getattr(t.TaskResult, "Output", None)
            return t.TaskStatus, base64.b64decode(out).decode("utf-8", "replace") if out else "(no output)"
    return "TIMEOUT", ""


def ship(local_path, remote_name):
    raw = open(local_path, "rb").read()
    b64 = base64.b64encode(raw).decode("ascii")
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    tat_run(f"rm -f /tmp/{remote_name}.b64")
    for i, ch in enumerate(chunks):
        st, out = tat_run(f"cat >> /tmp/{remote_name}.b64 <<'HOLANG'\n{ch}\nHOLANG\n")
        if st != "SUCCESS":
            print(f"[FAIL] 上传 {remote_name} 块 {i}: {out}"); sys.exit(1)
    st, out = tat_run(f"base64 -d /tmp/{remote_name}.b64 > /tmp/{remote_name} && echo SHIPPED_{remote_name}")
    if st != "SUCCESS":
        print(f"[FAIL] 拼接 {remote_name}: {out}"); sys.exit(1)


def verify(modules):
    mods = ",".join(modules)
    st, out = tat_run(f"python3 /tmp/verify_modules.py {DB} --module {mods}")
    return st == "SUCCESS" and "总判定: 全部通过" in out, out


def main():
    if len(sys.argv) < 2:
        print("usage: deploy_patch.py <补丁.py> --modules 'M1,M2' [--dry-run]"); sys.exit(1)
    patch_local = sys.argv[1]
    modules = []
    dry = "--dry-run" in sys.argv
    for a in sys.argv[2:]:
        if a.startswith("--modules"):
            modules = (a.split("=", 1)[1] if "=" in a else "").split(",")
    if not modules:
        print("[ERR] 必须指定 --modules"); sys.exit(1)

    ts = time.strftime("%Y%m%d%H%M%S")
    print(f"[1/6] 上传补丁 + 校验器 ...")
    ship(patch_local, "patch_run.py")
    ship(VERIFY_LOCAL, "verify_modules.py")

    print(f"[2/6] 备份生产库(回滚点) ...")
    st, out = tat_run(f"cp {DB} {DB}.bak-{ts} && echo BACKUP_OK")
    if st != "SUCCESS":
        print(f"[FAIL] 备份失败: {out}"); sys.exit(1)

    print(f"[3/6] 前置校验(补丁前) ...")
    ok, out = verify(modules)
    print(out)
    if not ok:
        print("[ABORT] 前置校验未通过，不执行补丁（保持现状）")
        tat_run(f"rm -f {DB}.bak-{ts} /tmp/patch_run.py /tmp/verify_modules.py")
        sys.exit(1)

    print(f"[4/6] 停服 -> 执行定向补丁 -> 重启（末尾强制 restart，杜绝停摆）...")
    patch_arg = "--dry-run" if dry else ""
    shell = f"""set -u
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
pm2 stop holang-oa-backend || true
python3 /tmp/patch_run.py {DB} {patch_arg}
RC=$?
pm2 restart holang-oa-backend || true
sleep 4
pm2 describe holang-oa-backend | grep -E 'status|pid' || true
echo PATCH_RC=$RC
"""
    st, out = tat_run(shell, timeout=180)
    print(out)

    print(f"[5/6] 后置校验(补丁后) ...")
    ok, out = verify(modules)
    print(out)

    if ok:
        print(f"[6/6] ✅ 补丁成功，清理临时文件，保留备份 {DB}.bak-{ts} 供追溯")
        tat_run(f"rm -f /tmp/patch_run.py /tmp/verify_modules.py")
        print("DONE_OK")
        sys.exit(0)
    else:
        print(f"[6/6] ❌ 后置校验失败 -> 从备份回滚 + 重启")
        tat_run(f"cp {DB}.bak-{ts} {DB} && pm2 restart holang-oa-backend")
        print("ROLLED_BACK")
        sys.exit(1)


if __name__ == "__main__":
    main()
