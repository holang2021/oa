#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
oa_deploy_dist.py — HOLANG OA 前端增量部署（经腾讯云 TAT 通道）
- 将 packages/oa/dist 打成 tar.gz，base64 分块（≤40KB/块，满足 TAT Content ≤64KB）经 TAT 下发到服务器
- 服务器端：备份当前 app → 解码 → 覆盖 /opt/holang/oa/app → 清理临时文件
- 前端 SPA 不含数据库；WW_verify 在独立目录 /opt/holang/oa/verify，不受影响
- 回滚：部署前已 cp 备份到 /tmp/oa_app_bak_<TS>，失败时 `cp -r /tmp/oa_app_bak_<TS>/. /opt/holang/oa/app/`
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
DIST_DIR = r'F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa\packages\oa\dist'
REMOTE_APP = '/opt/holang/oa/app'
CHUNK = 40000  # raw base64 chars per TAT command (< 64KB base64 content limit)

EXPECTED_ASSET = 'index-DOv_CInK.js'  # 本次构建产物，用于上线校验（2026-08-21 快赢闭环）


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
    # RunCommandResponse 不带 task id；需经 DescribeInvocations 取真实 invt- 任务 id
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


def main():
    if not os.path.isdir(DIST_DIR):
        print('[ERR] dist 目录不存在：%s' % DIST_DIR)
        return 1

    # 1) 打 tar.gz（arcname='.' 使内容直接落到 app 根）
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        tar.add(DIST_DIR, arcname='.')
    raw = buf.getvalue()
    b64 = base64.b64encode(raw).decode('ascii')
    chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    print('[INFO] tar.gz=%d bytes, base64=%d chars, chunks=%d' % (len(raw), len(b64), len(chunks)))

    client = get_client()

    # 2) 初始化远端临时文件
    st, out = wait_task(client, run_cmd(client, 'rm -f /tmp/oa_dist.b64; : > /tmp/oa_dist.b64')[1])
    if st != 'SUCCESS':
        print('[ERR] 初始化远端文件失败: %s / %s' % (st, out))
        return 1

    # 3) 分块追加
    for i, c in enumerate(chunks):
        shell = "printf '%%s' '%s' >> /tmp/oa_dist.b64" % c
        tid = run_cmd(client, shell, timeout=60)[1]
        st, out = wait_task(client, tid, timeout=60)
        if st != 'SUCCESS':
            print('[ERR] 第 %d 块下发失败: %s / %s' % (i + 1, st, out))
            return 1
        print('[INFO] 块 %d/%d 下发成功' % (i + 1, len(chunks)))

    # 4) 解码 + 备份 + 覆盖 + 清理
    final_shell = (
        "TS=$(date +%%s); "
        "cp -r %s /tmp/oa_app_bak_$TS 2>/dev/null; "
        "base64 -d /tmp/oa_dist.b64 > /tmp/oa_dist.tar.gz && "
        "rm -rf %s && mkdir -p %s && "
        "tar -xzf /tmp/oa_dist.tar.gz -C %s && "
        "rm -f /tmp/oa_dist.b64 /tmp/oa_dist.tar.gz && "
        "echo OA_DEPLOY_DONE_BAK_$TS"
    ) % (REMOTE_APP, REMOTE_APP, REMOTE_APP, REMOTE_APP)
    tid = run_cmd(client, final_shell, timeout=120)[1]
    st, out = wait_task(client, tid, timeout=120)
    if st != 'SUCCESS' or 'OA_DEPLOY_DONE' not in out:
        print('[ERR] 部署执行失败: %s / %s' % (st, out))
        return 1
    print('[INFO] 部署完成，备份标记: %s' % out.strip())

    # 5) 校验：index.html 引用新资产
    verify_shell = (
        "test -f %s/index.html && grep -q '%s' %s/index.html && echo OA_VERIFY_OK || echo OA_VERIFY_FAIL"
    ) % (REMOTE_APP, EXPECTED_ASSET, REMOTE_APP)
    tid = run_cmd(client, verify_shell, timeout=60)[1]
    st, out = wait_task(client, tid, timeout=60)
    if st == 'SUCCESS' and 'OA_VERIFY_OK' in out:
        print('[OK] 校验通过：%s 已上线（index.html 引用 %s）' % (REMOTE_APP, EXPECTED_ASSET))
        print('[回滚] 如遇问题：cp -r /tmp/oa_app_bak_<TS>/. %s/' % REMOTE_APP)
        return 0
    print('[WARN] 校验未通过: %s / %s' % (st, out))
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
