import json, base64, time, os, tarfile, re
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

d = json.load(open('C:/Users/liush/.tccli/default.credential', encoding='utf-8'))
cred = credential.Credential(d['secretId'], d['secretKey'])
hp = HttpProfile(); hp.endpoint = 'tat.tencentcloudapi.com'
client = tat_client.TatClient(cred, 'ap-shanghai', ClientProfile(httpProfile=hp))
INSTANCE_ID = 'ins-4xm95czz'

# local destination
DEST = r'F:\HOLANGbuddy\03_项目资产\系统建设\server_backup\2026-08-16'
os.makedirs(DEST, exist_ok=True)

def run_cmd(content, timeout=120):
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    req.InstanceIds = [INSTANCE_ID]
    req.CommandType = 'SHELL'
    req.Timeout = timeout
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    r2 = models.DescribeInvocationsRequest(); r2.InvocationIds = [inv_id]
    r2s = client.DescribeInvocations(r2)
    task_id = r2s.InvocationSet[0].InvocationTaskBasicInfoSet[0].InvocationTaskId
    for _ in range(120):
        rt = models.DescribeInvocationTasksRequest(); rt.InvocationTaskIds = [task_id]
        rts = client.DescribeInvocationTasks(rt)
        t = rts.InvocationTaskSet[0]
        if t.TaskStatus in ('SUCCESS', 'FAILED', 'TIMEOUT', 'STOPPED'):
            out = ''
            try:
                out = base64.b64decode(t.TaskResult.Output).decode('utf-8', 'ignore') if t.TaskResult else ''
            except Exception:
                pass
            return t.TaskStatus, out
        time.sleep(1)
    return 'TIMEOUT', ''

# STEP 1: build archive + split into base64 chunks on server
BUILD = r'''
set -e
cd /opt/holang/oa
tar -czf /tmp/holang_backup.tar.gz backend/prisma/holang-crm.db backend/.env backend/config/api-configs.json verify 2>/dev/null
echo "ARCHIVE_BYTES=$(wc -c < /tmp/holang_backup.tar.gz)"
base64 -w0 /tmp/holang_backup.tar.gz > /tmp/holang_backup.b64
echo "B64_BYTES=$(wc -c < /tmp/holang_backup.b64)"
rm -f /tmp/part_*
split -b 24000 -d /tmp/holang_backup.b64 /tmp/part_
echo "PARTS:"
ls /tmp/part_* | sort
echo "===END==="
'''
print('[1/3] 线上打包 + 分块...')
st, out = run_cmd(BUILD)
print('STATUS:', st)
print(out)
parts = re.findall(r'/tmp/part_\S+', out)
parts = sorted(set(parts))
m = re.search(r'B64_BYTES=(\d+)', out)
expect_b64 = int(m.group(1)) if m else None
print('解析到分块数:', len(parts), ' 预期 base64 总长:', expect_b64)

# STEP 2: fetch each part
print('[2/3] 逐块拉回本机...')
raw_b64 = bytearray()
for p in parts:
    st, o = run_cmd('cat %s' % p, timeout=60)
    if st != 'SUCCESS':
        raise SystemExit('拉取 %s 失败: %s' % (p, st))
    raw_b64 += o.encode('utf-8', 'ignore')
print('base64 合计字节:', len(raw_b64))
if expect_b64 and len(raw_b64) != expect_b64:
    raise SystemExit('长度不符！预期 %d 实拉 %d，分块可能被截断，需缩小分块重试' % (expect_b64, len(raw_b64)))

# STEP 3: decode + extract
print('[3/3] 解码解包 + 校验...')
gz = base64.b64decode(raw_b64.decode('ascii'))
tar_path = os.path.join(DEST, 'holang_backup.tar.gz')
with open(tar_path, 'wb') as f:
    f.write(gz)
with tarfile.open(tar_path, 'r:gz') as tf:
    names = tf.getnames()
    tf.extractall(DEST)
print('解包文件:', names)

# integrity check: DB size
db_local = os.path.join(DEST, 'backend', 'prisma', 'holang-crm.db')
expect = 2211840
if os.path.exists(db_local):
    sz = os.path.getsize(db_local)
    print('DB 本地大小: %d  线上预期: %d  %s' % (sz, expect, 'OK' if sz == expect else 'MISMATCH'))
else:
    print('警告: 未找到解包后的 DB')

# cleanup server temp
run_cmd('rm -f /tmp/holang_backup.tar.gz /tmp/holang_backup.b64 /tmp/part_*', timeout=30)
print('线上临时文件已清理。')
print('备份落盘:', DEST)
