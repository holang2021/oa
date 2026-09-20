# -*- coding: utf-8 -*-
"""HOLANG OA -> 飞书知识库 同步器 Phase 2(方案 B: 刘总本人身份)
- 数据源：OA 生产库只读 TAT 查询(不新增后端接口，不写生产库)
- AI 对话线程(customer_ai_messages)：按 customerId 聚合成线程，每个客户一篇飞书文档
- 联系人备注(contacts.remark)：仅同步「有非空备注」的联系人，且仅含安全字段
  (name/position/dept/isKeyPerson/remark)，**显式排除 phone/email/wechat/whatsapp**(H-2 数据合规)
- 两个独立父节点：OA AI对话归档 / OA联系人备注
- 去重：按标题比对父节点下已有子节点(同 feishu_sync_followups 的 reconcile 思路)
依赖：本机 lark-cli + tencentcloud SDK(venv)
"""
import sys, os, json, time, argparse, base64, gzip
sys.path.insert(0, r'F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa\deploy')
import feishu_sync_followups as base
from tencentcloud.common.credential import Credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tat.v20201028 import tat_client, models

SPACE = base.SPACE
ROOT = base.ROOT
REGION = "ap-shanghai"
INSTANCE_ID = "ins-4xm95czz"
DB = "/opt/holang/oa/backend/prisma/holang-crm.db"
CREDENTIAL_PATH = os.path.expanduser("~/.tccli/default.credential")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, 'feishu_sync_phase2_state.json')
LOG_FILE = os.path.join(SCRIPT_DIR, 'feishu_sync_phase2_log.json')
AI_PARENT = 'OA AI对话归档'
NOTE_PARENT = 'OA联系人备注'

PULL_PY = r"""import sqlite3, json, gzip, base64 as _b64
DB='__DB__'
conn=sqlite3.connect('file:%s?mode=ro'%DB, uri=True)
cur=conn.cursor()
cur.execute("SELECT id, companyName FROM customers")
cust={r[0]:(r[1] or r[0]) for r in cur.fetchall()}
cur.execute("SELECT id,customerId,name,position,dept,isKeyPerson,remark FROM contacts WHERE remark IS NOT NULL AND TRIM(remark)<>'' ")
notes=[dict(zip([d[0] for d in cur.description],r)) for r in cur.fetchall()]
cur.execute("SELECT DISTINCT customerId FROM customer_ai_messages")
ai_cids=[r[0] for r in cur.fetchall()]
conn.close()
payload=json.dumps({'cust':cust,'notes':notes,'ai_cids':ai_cids}, ensure_ascii=False)
blob=_b64.b64encode(gzip.compress(payload.encode('utf-8'))).decode()
print('DATA='+blob)
""".replace("__DB__", DB)


def log(d):
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            return json.load(open(STATE_FILE, encoding='utf-8'))
        except Exception:
            pass
    return {'synced': []}


def save_state(st):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(st, f, ensure_ascii=False, indent=2)


def lark(args, data=None):
    return base.lark(args, data)


def load_credential():
    return Credential(*(lambda d: (d["secretId"], d["secretKey"], d.get("token", "")))(
        json.loads(open(CREDENTIAL_PATH, encoding='utf-8').read())))


def pull_data():
    """只读 TAT 拉 OA 的 cust/notes/ai_cids；AI 对话内容改走 OA HTTP(按客户分页，绕开 TAT 32KB 输出上限)。
    返回 {'ai':[...], 'cust':{id:name}, 'notes':[...]}"""
    cred = load_credential()
    client = tat_client.TatClient(cred, REGION, ClientProfile(httpProfile=HttpProfile(endpoint="tat.tencentcloudapi.com")))
    shell = "echo '%s' | base64 -d > /tmp/phase2_pull.py; python3 -u /tmp/phase2_pull.py" % base64.b64encode(PULL_PY.encode("utf-8")).decode()
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode("utf-8")).decode()
    req.CommandType = "SHELL"
    req.InstanceIds = [INSTANCE_ID]
    req.CommandName = "holang-phase2-pull"
    req.Description = "只读拉 Phase2 同步数据(cust/notes/ai_cids)"
    req.WorkingDirectory = "/tmp"
    inv_id = client.RunCommand(req).InvocationId
    raw = ""
    for _ in range(40):
        req_i = models.DescribeInvocationsRequest()
        req_i.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
        invs = client.DescribeInvocations(req_i).InvocationSet
        if invs and invs[0].InvocationStatus in ("SUCCESS", "FAILED", "TERMINATED"):
            break
        time.sleep(2)
    for _ in range(40):
        req_t = models.DescribeInvocationTasksRequest()
        req_t.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
        tasks = client.DescribeInvocationTasks(req_t).InvocationTaskSet
        if tasks:
            tr = getattr(tasks[0], "TaskResult", None)
            out = ""
            if isinstance(tr, dict):
                out = tr.get("Output", "") or ""
            else:
                out = getattr(tr, "Output", "") or ""
            if out.strip():
                # TAT 对 Output 做了一次 base64 包裹：先解一次得到明文 DATA=<blob>
                try:
                    plain = base64.b64decode(out).decode("utf-8", errors="replace")
                except Exception:
                    plain = out
                idx = plain.find("DATA=")
                blob = plain[idx + 5:] if idx >= 0 else plain
                try:
                    raw = gzip.decompress(base64.b64decode(blob)).decode("utf-8", errors="replace")
                except Exception:
                    try:
                        raw = base64.b64decode(blob).decode("utf-8", errors="replace")
                    except Exception:
                        raw = plain
                break
        time.sleep(2)
    d = None
    raw = raw.strip()
    if raw.startswith("DATA="):
        inner = raw[5:]
        try:
            raw = gzip.decompress(base64.b64decode(inner)).decode("utf-8", errors="replace")
        except Exception:
            raw = inner
    try:
        d = json.loads(raw)
    except Exception:
        for line in raw.splitlines():
            if line.startswith("DATA="):
                d = json.loads(line[5:])
                break
    if not d:
        raise RuntimeError("未取到 DATA，原始输出: " + raw[:300])
    # AI 对话内容走 HTTP(按客户)，绕开 TAT 32KB 上限
    ai = []
    user = os.environ.get("OA_ADMIN_USER", "admin")
    password = os.environ.get("OA_ADMIN_PASS", "admin123")
    token = base.oa_login(user, password)
    for cid in (d.get("ai_cids") or []):
        try:
            r = base.oa_get(token, "/customer-ai/%s/history" % cid, {"limit": 200})
        except Exception as e:
            print("WARN ai fetch %s failed: %s" % (cid, e))
            continue
        for m in (r.get("data") or []):
            ai.append({
                "id": m.get("id"),
                "customerId": m.get("customerId") or cid,
                "userId": m.get("userId"),
                "role": m.get("role"),
                "content": m.get("content"),
                "model": m.get("model"),
                "createdAt": m.get("createdAt"),
            })
    d["ai"] = ai
    return d

def ensure_parent_by_title(title):
    out, err, rc = lark(['wiki', '+node-list', '--space-id', SPACE, '--parent-node-token', ROOT, '--as', 'user'])
    if rc == 0:
        for n in json.loads(out).get('data', {}).get('nodes', []):
            if n.get('title') == title:
                return n.get('node_token')
    body = {'parent_node_token': ROOT, 'obj_type': 'docx', 'node_type': 'origin', 'title': title}
    out, err, rc = lark(['api', 'POST', '/open-apis/wiki/v2/spaces/%s/nodes' % SPACE, '--as', 'user'], body)
    if rc != 0:
        raise RuntimeError('建父节点 %s 失败: %s' % (title, err[:200]))
    return json.loads(out)['data']['node']['node_token']


def list_children_titles(parent_token):
    titles = set()
    out, err, rc = lark(['wiki', '+node-list', '--space-id', SPACE, '--parent-node-token', parent_token,
                         '--page-all', '--page-limit', '0', '--as', 'user'])
    if rc != 0:
        raise RuntimeError('list children failed: ' + err[:200])
    for n in json.loads(out).get('data', {}).get('nodes', []):
        if n.get('title'):
            titles.add(n['title'])
    return titles


def push_doc(parent_token, title, blocks):
    create_body = {'parent_node_token': parent_token, 'obj_type': 'docx', 'node_type': 'origin', 'title': title[:100]}
    out, err, rc = lark(['api', 'POST', '/open-apis/wiki/v2/spaces/%s/nodes' % SPACE, '--as', 'user'], create_body)
    if rc != 0:
        return {'ok': False, 'err': err[:300]}
    j = json.loads(out)
    node = j['data']['node']
    docid = node.get('obj_token') or node.get('node_token')
    out2, err2, rc2 = lark(['api', 'POST', '/open-apis/docx/v1/documents/%s/blocks/%s/children' % (docid, docid), '--as', 'user'],
                           {'children': blocks, 'index': 0})
    if rc2 != 0:
        return {'ok': False, 'err': err2[:300], 'out': out2[:300], 'node_token': node.get('node_token')}
    return {'ok': True, 'node_token': node.get('node_token'), 'docid': docid}


def ts(ms):
    try:
        return time.strftime('%Y-%m-%d %H:%M', time.localtime(int(ms) / 1000))
    except Exception:
        return str(ms)


def build_ai_threads(data):
    """分组 customer_ai_messages -> [(title, blocks, key)]"""
    cust = data['cust']
    groups = {}
    for m in data['ai']:
        groups.setdefault(m['customerId'], []).append(m)
    out = []
    for cid, msgs in groups.items():
        cname = cust.get(cid, cid)
        title = 'AI对话 %s' % cname
        head = '【OA 客户 AI 对话】客户：%s(%s)' % (cname, cid)
        blk = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': head}}], 'style': {}}}
        blocks = [blk]
        for m in sorted(msgs, key=lambda x: x.get('createdAt') or 0):
            who = '客户/用户' if m.get('role') == 'user' else 'AI 助手'
            when = ts(m.get('createdAt')) if m.get('createdAt') else '-'
            sep = '- %s(%s) -' % (who, when)
            blk1 = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': sep}}], 'style': {}}}
            blocks.append(blk1)
            body = (m.get('content') or '(empty)')[:4000]
            blk2 = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': body}}], 'style': {}}}
            blocks.append(blk2)
        out.append((title, blocks, 'AI:%s' % cid))
    return out


def build_notes(data):
    out = []
    cust = data['cust']
    for n in data['notes']:
        cname = cust.get(n['customerId'], n['customerId'])
        who = n.get('name') or '(未命名)'
        title = '联系人备注 %s-%s' % (cname, who)
        blocks = []
        b0 = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '【OA 联系人备注】'}}], 'style': {}}}
        blocks.append(b0)
        b1 = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '客户：%s(%s)' % (cname, n['customerId'])}}], 'style': {}}}
        blocks.append(b1)
        b2 = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '联系人：%s' % who}}], 'style': {}}}
        blocks.append(b2)
        if n.get('position'):
            bp = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '职位：%s' % n['position']}}], 'style': {}}}
            blocks.append(bp)
        if n.get('dept'):
            bd = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '部门：%s' % n['dept']}}], 'style': {}}}
            blocks.append(bd)
        if n.get('isKeyPerson'):
            bk = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '关键人：是'}}], 'style': {}}}
            blocks.append(bk)
        bsep = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '—— 备注 ——'}}], 'style': {}}}
        blocks.append(bsep)
        remark = (n.get('remark') or '(空)')[:4000]
        brm = {'block_type': 2, 'text': {'elements': [{'text_run': {'content': remark}}], 'style': {}}}
        blocks.append(brm)
        out.append((title, blocks, 'NOTE:%s' % n['id']))
    return out

def reconcile(parent_title, items, dry_run):
    parent = ensure_parent_by_title(parent_title)
    existing = list_children_titles(parent) if not dry_run else set()
    st = load_state()
    synced = set(st.get('synced', []))
    pushed = skipped = failed = 0
    failed_detail = []
    for title, blocks, key in items:
        if title in existing or key in synced:
            skipped += 1
            continue
        if dry_run:
            skipped += 1
            continue
        try:
            res = push_doc(parent, title, blocks)
        except Exception as e:
            failed += 1
            failed_detail.append({'key': key, 'err': str(e)[:200]})
            time.sleep(0.3)
            continue
        if res.get('ok'):
            pushed += 1
            synced.add(key)
            existing.add(title)
            st['synced'] = list(synced)
            save_state(st)
        else:
            failed += 1
            failed_detail.append({'key': key, 'err': res.get('err'), 'out': res.get('out')})
        time.sleep(0.3)
    return {'parent': parent_title, 'pushed': pushed, 'skipped': skipped, 'failed': failed, 'failed_detail': failed_detail[:5]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='只拉 OA + 规划，不推飞书')
    args = ap.parse_args()
    log({'args': {'dry_run': args.dry_run}, 'stage': 'pull'})
    data = pull_data()
    log({'stage': 'pulled', 'ai_msgs': len(data['ai']), 'customers': len(data['cust']), 'notes': len(data['notes'])})
    ai_items = build_ai_threads(data)
    note_items = build_notes(data)
    print('PULLED ai_msgs=%d -> threads=%d ; contacts_with_remark=%d' % (len(data['ai']), len(ai_items), len(note_items)))
    if args.dry_run:
        print('[DRY-RUN] would push AI threads:')
        for t, _, k in ai_items:
            print('   ', t, k)
        print('[DRY-RUN] would push contact notes:')
        for t, _, k in note_items:
            print('   ', t, k)
        log({'stage': 'dry_run_done', 'ai_items': len(ai_items), 'note_items': len(note_items)})
        return
    r1 = reconcile(AI_PARENT, ai_items, False)
    r2 = reconcile(NOTE_PARENT, note_items, False)
    summary = {'ai': r1, 'note': r2}
    log({'stage': 'done', 'summary': summary})
    print('AI对话归档: pushed=%d skipped=%d failed=%d' % (r1['pushed'], r1['skipped'], r1['failed']))
    print('联系人备注: pushed=%d skipped=%d failed=%d' % (r2['pushed'], r2['skipped'], r2['failed']))
    if r1['failed_detail'] or r2['failed_detail']:
        print('FAILED_DETAIL', json.dumps(r1['failed_detail'] + r2['failed_detail'], ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        st = {}
        try: st = json.load(open(LOG_FILE, encoding='utf-8'))
        except Exception: pass
        st['fatal'] = traceback.format_exc()
        log(st)
        print('FATAL')
        sys.exit(1)
