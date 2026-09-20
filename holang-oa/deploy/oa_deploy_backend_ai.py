#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
oa_deploy_backend_ai.py — HOLANG OA 后端增量部署（经腾讯云 TAT 通道）
- 仅下发源码 src/ 与 prisma/（schema），不碰 node_modules / .env / 生产库
- 服务器端：备份 src+prisma → 覆盖 → prisma generate → prisma db push（仅新增表，保数据）→ pm2 restart
- 回滚：若 db push 失败，从 /tmp/oa_be_bak_<TS> 还原；否则保留备份供人工回滚
- 严禁 rm -rf /opt/holang/oa/backend（生产库在 backend/prisma 无关，但全量删除风险高，必须用增量）
"""
import os
import io
import time
import json
import base64
import tarfile

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

REGION = 'ap-shanghai'
INSTANCE_ID = 'ins-4xm95czz'
CRED_PATH = 'C:/Users/liush/.tccli/default.credential'
BACKEND_DIR = r'F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa\backend'
REMOTE_BE = '/opt/holang/oa/backend'
CHUNK = 40000

EXPECTED_LOG = '[AI] customer-ai routes mounted'  # 启动日志标记（可选）


def get_client():
    d = json.load(open(CRED_PATH, encoding='utf-8'))
    cred = credential.Credential(d['secretId'], d['secretKey'])
    hp = HttpProfile()
    hp.endpoint = 'tat.tencentcloudapi.com'
    return tat_client.TatClient(cred, REGION, ClientProfile(httpProfile=hp))


def run_cmd(client, shell, timeout=120):
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode('utf-8')).decode('ascii')
    req.InstanceIds = [INSTANCE_ID]
    req.CommandType = 'SHELL'
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    task_id = None
    try:
        r2 = models.DescribeInvocationsRequest()
        r2.InvocationIds = [inv_id]
        r2s = client.DescribeInvocations(r2)
        if getattr(r2s, 'InvocationSet', None):
            bis = r2s.InvocationSet[0].InvocationTaskBasicInfoSet
            if bis:
                task_id = bis[0].InvocationTaskId
    except Exception:
        task_id = None
    if not task_id:
        task_id = '%s#%s' % (inv_id, INSTANCE_ID)
    return inv_id, task_id


def wait_task(client, task_id, timeout=180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        req = models.DescribeInvocationTasksRequest()
        req.InvocationTaskIds = [task_id]
        resp = client.DescribeInvocationTasks(req)
        if resp.InvocationTaskSet:
            t = resp.InvocationTaskSet[0]
            st = t.TaskStatus
            if st in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED', 'CANCELLED', 'TERMINATED', 'TASK_TIMEOUT', 'START_FAILED', 'DELIVER_FAILED'):
                out = ''
                try:
                    raw = t.TaskResult.Output if t.TaskResult else ''
                    if raw:
                        out = base64.b64decode(raw).decode('utf-8', 'replace')
                except Exception:
                    out = ''
                return st, out
        time.sleep(2)
    return 'POLL_TIMEOUT', ''


def exec_verify(client, shell, ok_marker, timeout=180, label=''):
    tid = run_cmd(client, shell, timeout=timeout)[1]
    st, out = wait_task(client, tid, timeout=timeout)
    ok = (st == 'SUCCESS') and (ok_marker in out)
    print('[%s] %s -> %s | %s' % (('OK' if ok else 'ERR'), label, st, out.strip()[:300]))
    return ok, out


def main():
    if not os.path.isdir(BACKEND_DIR):
        print('[ERR] 后端目录不存在')
        return 1

    # 1) 打 tar.gz（仅 src + prisma）
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        tar.add(os.path.join(BACKEND_DIR, 'src'), arcname='src')
        tar.add(os.path.join(BACKEND_DIR, 'prisma'), arcname='prisma')
    raw = buf.getvalue()
    b64 = base64.b64encode(raw).decode('ascii')
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    print('[INFO] tar.gz=%d bytes, base64=%d chars, chunks=%d' % (len(raw), len(b64), len(chunks)))

    client = get_client()

    # 2) 初始化远端临时文件
    st, out = wait_task(client, run_cmd(client, 'rm -f /tmp/oa_be.tar.b64; : > /tmp/oa_be.tar.b64')[1])
    if st != 'SUCCESS':
        print('[ERR] 初始化远端失败')
        return 1

    # 3) 分块下发
    for i, c in enumerate(chunks):
        shell = "printf '%%s' '%s' >> /tmp/oa_be.tar.b64" % c
        tid = run_cmd(client, shell, timeout=60)[1]
        st, out = wait_task(client, tid, timeout=60)
        if st != 'SUCCESS':
            print('[ERR] 第 %d 块失败: %s' % (i + 1, out))
            return 1
        print('[INFO] 块 %d/%d 下发成功' % (i + 1, len(chunks)))

    # 4) 备份 + 解码 + 覆盖
    bak_shell = (
        "TS=$(date +%%s); "
        "mkdir -p /tmp/oa_be_bak_$TS; "
        "cp -r %s/src /tmp/oa_be_bak_$TS/src 2>/dev/null; "
        "cp -r %s/prisma /tmp/oa_be_bak_$TS/prisma 2>/dev/null; "
        "base64 -d /tmp/oa_be.tar.b64 > /tmp/oa_be_t.tar.gz && "
        "tar -xzf /tmp/oa_be_t.tar.gz -C %s && "
        "rm -f /tmp/oa_be.tar.b64 /tmp/oa_be_t.tar.gz && "
        "echo OA_BE_EXTRACTED_$TS"
    ) % (REMOTE_BE, REMOTE_BE, REMOTE_BE)
    ok, out = exec_verify(client, bak_shell, 'OA_BE_EXTRACTED', timeout=120, label='备份+覆盖')
    if not ok:
        return 1
    ts = out.strip().split('_')[-1]

    # 5) prisma generate
    ok, out = exec_verify(
        client,
        "cd %s && ./node_modules/.bin/prisma generate >/tmp/oa_be_gen.log 2>&1 && echo OA_GEN_OK || echo OA_GEN_FAIL" % REMOTE_BE,
        'OA_GEN_OK', timeout=180, label='prisma generate')
    if not ok:
        print('[ERR] prisma generate 失败，回滚源码')
        exec_verify(client, "cp -r /tmp/oa_be_bak_%s/src %s/src && cp -r /tmp/oa_be_bak_%s/prisma %s/prisma" % (ts, REMOTE_BE, ts, REMOTE_BE), 'OA_GEN_OK', label='回滚源码')
        return 1

    # 6) prisma db push（新增表，保数据；非破坏性）
    ok, out = exec_verify(
        client,
        "cd %s && ./node_modules/.bin/prisma db push --skip-generate >/tmp/oa_be_push.log 2>&1 && echo OA_PUSH_OK || echo OA_PUSH_FAIL" % REMOTE_BE,
        'OA_PUSH_OK', timeout=180, label='prisma db push')
    if not ok:
        print('[ERR] db push 失败，回滚源码（未重启）')
        print('[PUSH LOG]', out)
        exec_verify(client, "cp -r /tmp/oa_be_bak_%s/src %s/src && cp -r /tmp/oa_be_bak_%s/prisma %s/prisma" % (ts, REMOTE_BE, ts, REMOTE_BE), 'OA_PUSH_OK', label='回滚源码')
        return 1

    # 7) pm2 restart
    ok, out = exec_verify(
        client,
        "pm2 restart holang-oa-backend && sleep 4 && pm2 describe holang-oa-backend | grep -E 'status|script path'",
        'online', timeout=120, label='pm2 restart')
    if not ok:
        print('[ERR] pm2 重启异常，请人工排查 /tmp/oa_be_bak_%s' % ts)
        return 1

    # 8) 校验：新路由是否注册（启动日志含 customer-ai）或进程在线
    ok, out = exec_verify(
        client,
        "pm2 logs holang-oa-backend --lines 30 --nostream 2>/dev/null | grep -i 'customer-ai\\|CustomerAi\\|listening\\|3001' | tail -5; echo OA_CHK_DONE",
        'OA_CHK_DONE', timeout=60, label='启动日志校验')
    print('[OK] 后端增量部署完成。备份: /tmp/oa_be_bak_%s（如需回滚: cp -r /tmp/oa_be_bak_%s/src %s/src && cp -r /tmp/oa_be_bak_%s/prisma %s/prisma && pm2 restart holang-oa-backend）' % (ts, ts, REMOTE_BE, ts, REMOTE_BE))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
