#!/usr/bin/env python3
# 业务数据全量重导（修正内外销打标）—— 生产部署
# 机制: 本地打 tar(crm_output JSON + 修正脚本 + 当前 schema.prisma)
#       -> base64 分块 -> TAT 逐块追加到服务器 -> 服务器侧备份/停服/清表/重导/重灌/同步/重启/校验
import os, sys, base64, time, tarfile, json
from tencentcloud.common import credential
from tencentcloud.tat.v20201028 import tat_client, models

CRED_PATH = "C:/Users/liush/.tccli/default.credential"
INSTANCE = "ins-4xm95czz"
REGION = "ap-shanghai"
SRC = "F:/HOLANGbuddy/03_项目资产/系统建设/holang-oa"
BACKEND = os.path.join(SRC, "backend")
HM = os.path.join(SRC, "deploy", "huoban_migration")
DST = "/opt/holang/oa/backend"
DB = f"{DST}/prisma/holang-crm.db"
CHUNK = 20000  # base64 字符/块 (< TAT 64KB 上限)


def cred():
    c = json.load(open(CRED_PATH, encoding="utf-8"))
    return c["secretId"], c["secretKey"], c.get("token")


def tat_run(content: str, timeout=120):
    sid, skey, token = cred()
    cr = credential.Credential(sid, skey, token) if token else credential.Credential(sid, skey)
    cl = tat_client.TatClient(cr, REGION)
    req = models.RunCommandRequest()
    req.InstanceIds = [INSTANCE]
    req.CommandType = "SHELL"
    req.CommandName = "holang-deploy"
    req.Content = base64.b64encode(content.encode("utf-8")).decode("ascii")
    req.Timeout = timeout
    inv = cl.RunCommand(req).InvocationId
    for _ in range(45):
        time.sleep(3)
        d = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv]
        d.Filters = [f]
        tasks = cl.DescribeInvocationTasks(d).InvocationTaskSet or []
        if not tasks:
            continue
        t = tasks[0]
        if t.TaskStatus in ("SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"):
            out = getattr(t.TaskResult, "Output", None)
            dec = base64.b64decode(out).decode("utf-8", "replace") if out else "(no output)"
            return t.TaskStatus, dec
    return "TIMEOUT", ""


def main():
    tar_path = "C:/Users/liush/business_reload.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        for fn in os.listdir(os.path.join(HM, "crm_output")):
            if fn.endswith(".json"):
                tar.add(os.path.join(HM, "crm_output", fn), arcname=f"deploy/huoban_migration/crm_output/{fn}")
        for rel in ["load_huoban_to_oa.py", "clear_oa_business.py", "load_delivery_items_prod.py", "verify_modules.py"]:
            tar.add(os.path.join(HM, rel), arcname=f"deploy/huoban_migration/{rel}")
        tar.add(os.path.join(BACKEND, "prisma", "schema.prisma"), arcname="prisma/schema.prisma")
    raw = open(tar_path, "rb").read()
    b64 = base64.b64encode(raw).decode("ascii")
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    print(f"[local] tar {len(raw)}B -> b64 {len(b64)}B -> {len(chunks)} chunks")

    # 1) 清空服务器残留分块文件
    tat_run("rm -f /tmp/br.b64 /tmp/br.tar.gz")
    # 2) 逐块上传
    for i, ch in enumerate(chunks):
        st, out = tat_run(f"cat >> /tmp/br.b64 <<'HOLANG'\n{ch}\nHOLANG\n")
        if st != "SUCCESS":
            print(f"[FAIL] chunk {i}: {out}")
            sys.exit(1)
        print(f"  chunk {i + 1}/{len(chunks)} ok")

    # 3) 服务器侧: 解包 + 备份 + 停服 + 清表 + 重导 + 重灌 + 同步 + 重启 + 6模块校验
    #    设计: 去掉 set -e(避免中途失败导致后端停服无法恢复); 末尾强制 pm2 restart 保证服务恢复;
    #          prisma/pm2 冗长输出重定向, 仅保留核验关键行, 防超 TAT 回显 24KB 上限;
    #          后置 verify_modules.py 只读 6 模块校验(强制 query_only), 输出即"每模块实际效果"。
    final = f"""export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cd {DST}
base64 -d /tmp/br.b64 > /tmp/br.tar.gz
mkdir -p deploy/huoban_migration
tar -xzf /tmp/br.tar.gz -C {DST}
# 备份生产库(同机回滚点)
cp prisma/holang-crm.db prisma/holang-crm.db.bak-$(date +%Y%m%d%H%M%S)
# 停服避免 SQLite 锁
pm2 stop holang-oa-backend || echo "PM2_STOP_WARN"
# 同步 schema(补齐 delivery_items / salesMode / salesType 等列, 幂等) —— 输出重定向避免超 TAT 回显上限
cd {DST} && npx prisma db push --accept-data-loss --skip-generate > /tmp/prisma.log 2>&1 || echo "PRISMA_PUSH_WARN"
# 清空业务表(保留 users/wecom/配置)
python3 deploy/huoban_migration/clear_oa_business.py prisma/holang-crm.db
# 重导修正后业务数据
python3 deploy/huoban_migration/load_huoban_to_oa.py prisma/holang-crm.db
# 重灌发货明细(301 条, 关联 deliveries.huobanId)
python3 deploy/huoban_migration/load_delivery_items_prod.py prisma/holang-crm.db
echo "=== LOAD_STAGE_DONE ==="
# 末尾强制重启(即使前序步骤异常也保证服务恢复, 回滚点已备)
pm2 restart holang-oa-backend
sleep 6
pm2 describe holang-oa-backend | grep -E 'pid|status'
# 6 模块只读校验(verify_modules, 强制 query_only)
python3 deploy/huoban_migration/verify_modules.py prisma/holang-crm.db
rm -f /tmp/br.b64 /tmp/br.tar.gz
echo BUSINESS_RELOAD_DONE
"""
    st, out = tat_run(final, timeout=240)
    print("===== STDOUT/RESULT =====")
    print(out)
    print("===== END =====")
    print("[final] status=", st)
    sys.exit(0 if st == "SUCCESS" else 1)


if __name__ == "__main__":
    main()
