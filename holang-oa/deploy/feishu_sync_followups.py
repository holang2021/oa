# -*- coding: utf-8 -*-
"""
HOLANG OA -> 飞书知识库 跟进记录同步器 (方案 B: 刘总本人身份)
- 从 OA HTTP API 拉全部跟进记录 (admin JWT)
- 经 lark-cli --as user 写入「HOLANG 企业知识库」
- 本地 state 去重，支持 --limit 增量实测 / --dry-run 只拉不推
依赖: 本机 lark-cli (C:\\Users\\liush\\.workbuddy\\binaries\\node)
凭证: 环境变量 OA_ADMIN_USER / OA_ADMIN_PASS (不落文件)
"""
import subprocess, json, os, sys, traceback, argparse, time, urllib.request, urllib.parse

NODE = r'C:\Users\liush\.workbuddy\binaries\node\versions\22.22.2\node.exe'
RUN = r'C:\Users\liush\.workbuddy\binaries\node\versions\22.22.2\node_modules\@larksuite\cli\scripts\run.js'
SPACE = '7598114727864159200'
ROOT = 'Kv26w6fqpi8nVxkfIFocyH5Vngb'
OA_BASE = 'https://oa.holangchina.com/api/v1'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser('~')
# lark-cli 无法解析符号链接路径(F:)，临时文件与工作目录必须用真实用户目录
TMP = os.path.join(HOME, '_sync_tmp.json')
STATE_FILE = os.path.join(SCRIPT_DIR, 'feishu_sync_state.json')
LOG_FILE = os.path.join(SCRIPT_DIR, 'feishu_sync_log.json')
PARENT_TITLE = 'OA跟进记录归档'


def log(d):
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def lark(args, data=None):
    env = dict(os.environ)
    env['LARKSUITE_CLI_NO_UPDATE_NOTIFIER'] = '1'
    env['LARKSUITE_CLI_NO_SKILLS_NOTIFIER'] = '1'
    cmd = [NODE, RUN] + args
    if data is not None:
        with open(TMP, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        cmd += ['--data', '@' + os.path.basename(TMP)]
    p = subprocess.run(cmd, capture_output=True, env=env, cwd=HOME, timeout=60)
    out = (p.stdout or b'').decode('utf-8', 'replace')
    err = (p.stderr or b'').decode('utf-8', 'replace')
    return out, err, p.returncode


def oa_login(user, password):
    url = OA_BASE + '/auth/login'
    data = json.dumps({'username': user, 'password': password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        j = json.loads(resp.read().decode('utf-8'))
    if j.get('code') != 0 or not j.get('data', {}).get('token'):
        raise RuntimeError('OA 登录失败: ' + str(j))
    return j['data']['token']


def oa_get(token, endpoint, params=None):
    url = OA_BASE + endpoint
    if params:
        qs = '&'.join('%s=%s' % (k, urllib.parse.quote(str(v), safe='')) for k, v in params.items() if v is not None)
        if qs:
            url += '?' + qs
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            return json.load(open(STATE_FILE, encoding='utf-8'))
        except Exception:
            pass
    return {'parent_token': None, 'synced': []}


def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def ensure_parent(state):
    """返回可用的父节点 token：优先用 state 中记录并校验存续，否则按标题查找/创建"""
    token = state.get('parent_token')
    if token:
        # 校验仍存续，避免指向已删除节点(曾因脚本 bug 残留失效 token)
        out, err, rc = lark(['wiki', '+node-get', '--node-token', token,
                             '--obj-type', 'wiki', '--space-id', SPACE, '--as', 'user'])
        if rc == 0:
            try:
                j = json.loads(out)
                if j.get('ok') and j.get('data', {}).get('node_token'):
                    return token
            except Exception:
                pass
        token = None  # 失效，重新查找/创建
    if not token:
        out, err, rc = lark(['wiki', '+node-list', '--space-id', SPACE,
                             '--parent-node-token', ROOT, '--as', 'user'])
        if rc == 0:
            try:
                j = json.loads(out)
                for n in j.get('data', {}).get('nodes', []):
                    if n.get('title') == PARENT_TITLE:
                        token = n.get('node_token')
                        break
            except Exception:
                pass
    if token:
        state['parent_token'] = token
        save_state(state)
        return token
    body = {'parent_node_token': ROOT, 'obj_type': 'docx', 'node_type': 'origin', 'title': PARENT_TITLE}
    out, err, rc = lark(['api', 'POST', '/open-apis/wiki/v2/spaces/%s/nodes' % SPACE, '--as', 'user'], body)
    if rc != 0:
        raise RuntimeError('建父节点失败 rc=%s err=%s' % (rc, err[:300]))
    j = json.loads(out)
    node = j['data']['node']
    token = node.get('node_token')
    state['parent_token'] = token
    save_state(state)
    return token


def fu_title(fu):
    """与 push_one 写入飞书的标题完全一致，用于去重比对"""
    cid = fu.get('customerId') or ''
    cust = fu.get('customer') or {}
    cname = cust.get('companyName') or cid or '(未知客户)'
    date = (fu.get('followedAt') or fu.get('createdAt') or '')[:10]
    return ('跟进 %s %s' % (cname, date))[:100]


def push_one(parent_token, fu):
    title = fu_title(fu)
    cid = fu.get('customerId') or ''
    cust = fu.get('customer') or {}
    cname = cust.get('companyName') or cid or '(未知客户)'
    create_body = {'parent_node_token': parent_token, 'obj_type': 'docx', 'node_type': 'origin', 'title': title}
    out, err, rc = lark(['api', 'POST', '/open-apis/wiki/v2/spaces/%s/nodes' % SPACE, '--as', 'user'], create_body)
    if rc != 0:
        return {'ok': False, 'err': err[:300], 'out': out[:300]}
    j = json.loads(out)
    node = j['data']['node']
    docid = node.get('obj_token') or node.get('node_token')
    node_token = node.get('node_token')
    blocks = [
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '【OA 跟进记录】'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '客户：%s（%s）' % (cname, cid)}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '跟进方式：%s' % (fu.get('method') or '-')}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '时间：%s' % (fu.get('followedAt') or '-')}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '操作人：%s' % (fu.get('operator') or fu.get('user', {}).get('name') or '-')}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '—— 内容 ——'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': fu.get('content') or '(空)'}}], 'style': {}}},
    ]
    if fu.get('nextPlan'):
        blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': '下次计划：%s' % fu['nextPlan']}}], 'style': {}}})
    if fu.get('nextFollowUpAt'):
        blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': '下次跟进：%s' % fu['nextFollowUpAt']}}], 'style': {}}})
    write_body = {'children': blocks, 'index': 0}
    out2, err2, rc2 = lark(['api', 'POST', '/open-apis/docx/v1/documents/%s/blocks/%s/children' % (docid, docid), '--as', 'user'], write_body)
    if rc2 != 0:
        return {'ok': False, 'err': err2[:300], 'out': out2[:300], 'node_token': node_token}
    return {'ok': True, 'node_token': node_token, 'docid': docid}


def list_children_titles(parent_token):
    """拉取某父节点下全部子节点标题(自动翻页)，用于 reconcile 去重比对"""
    titles = set()
    out, err, rc = lark(['wiki', '+node-list', '--space-id', SPACE,
                         '--parent-node-token', parent_token, '--page-all', '--page-limit', '0', '--as', 'user'])
    if rc != 0:
        raise RuntimeError('list children failed rc=%s err=%s' % (rc, err[:300]))
    j = json.loads(out)
    for n in j.get('data', {}).get('nodes', []):
        t = n.get('title')
        if t:
            titles.add(t)
    return titles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='仅同步前 N 条(按时间升序)，0=全量')
    ap.add_argument('--dry-run', action='store_true', help='只拉 OA 不推飞书')
    ap.add_argument('--reconcile', action='store_true', help='按标题对账：仅推送 QADqw 中缺失的 OA 记录，修复重复父节点清理后的数据')
    args = ap.parse_args()

    user = os.environ.get('OA_ADMIN_USER', 'admin')
    password = os.environ.get('OA_ADMIN_PASS', 'admin123')

    state = load_state()
    state['args'] = {'limit': args.limit, 'dry_run': args.dry_run}
    log(state)

    # 1. login
    try:
        token = oa_login(user, password)
        state['login'] = 'ok'
    except Exception as e:
        state['login_error'] = str(e)
        log(state)
        print('LOGIN_FAIL')
        sys.exit(1)

    # 2. pull all follow-ups
    all_fu = []
    page = 1
    while True:
        r = oa_get(token, '/follow-ups', {'page': page, 'pageSize': 100})
        if r.get('code') != 0:
            state['pull_error'] = str(r)
            log(state)
            print('PULL_FAIL')
            sys.exit(1)
        lst = r['data']['list']
        if not lst:
            break
        all_fu += lst
        pg = r['data']['pagination']
        if page >= pg.get('totalPages', 1):
            break
        page += 1

    # 排序: 旧的先推
    all_fu.sort(key=lambda x: x.get('createdAt') or x.get('followedAt') or '')

    if args.dry_run:
        sample = all_fu[0] if all_fu else {}
        state['dry_run'] = {
            'total': len(all_fu),
            'sample_keys': list(sample.keys()),
            'sample_has_customer': 'customer' in sample,
            'sample': sample,
        }
        log(state)
        print('DRY_RUN total=%d sample_keys=%s has_customer=%s' % (len(all_fu), list(sample.keys()), 'customer' in sample))
        return

    if args.reconcile:
        try:
            reconcile(state, all_fu)
        except Exception as e:
            state['reconcile_error'] = str(e)
            log(state)
            print('RECONCILE_FAIL')
            sys.exit(1)
        return

    # 3. ensure parent node
    try:
        parent = ensure_parent(state)
        state['parent_token'] = parent
    except Exception as e:
        state['parent_error'] = str(e)
        log(state)
        print('PARENT_FAIL')
        sys.exit(1)

    # 4. push
    st = load_state()
    synced = set(st.get('synced', []))
    todo = all_fu
    if args.limit:
        todo = todo[:args.limit]
    pushed = 0
    skipped = 0
    failed = []
    for fu in todo:
        fid = fu.get('id')
        if fid in synced:
            skipped += 1
            continue
        try:
            res = push_one(parent, fu)
        except Exception as e:
            failed.append({'id': fid, 'err': str(e)})
            time.sleep(0.3)
            continue
        if res.get('ok'):
            synced.add(fid)
            pushed += 1
            st['synced'] = list(synced)
            save_state(st)
        else:
            failed.append({'id': fid, 'err': res.get('err'), 'out': res.get('out')})
        time.sleep(0.3)

    state['result'] = {'pushed': pushed, 'skipped': skipped, 'failed': len(failed), 'total_todo': len(todo)}
    state['failed_detail'] = failed[:10]
    log(state)
    print('DONE pushed=%d skipped=%d failed=%d' % (pushed, skipped, len(failed)))


def reconcile(state, all_fu):
    """按标题对账 QADqw：仅推送飞书侧缺失的 OA 记录，修复清理重复父节点后的数据"""
    parent = ensure_parent(state)
    state['parent_token'] = parent
    existing = list_children_titles(parent)
    pushed_titles = set()
    synced_ids = []
    pushed = 0
    skipped = 0
    failed = []
    for fu in all_fu:
        fid = fu.get('id')
        t = fu_title(fu)
        if t in existing or t in pushed_titles:
            synced_ids.append(fid)
            skipped += 1
            continue
        try:
            res = push_one(parent, fu)
        except Exception as e:
            failed.append({'id': fid, 'err': str(e)})
            time.sleep(0.3)
            continue
        if res.get('ok'):
            pushed_titles.add(t)
            synced_ids.append(fid)
            pushed += 1
        else:
            failed.append({'id': fid, 'err': res.get('err'), 'out': res.get('out')})
        time.sleep(0.3)
    # 同步 state.synced 为 QADqw 真实内容，保证后续增量可用
    st = load_state()
    st['synced'] = synced_ids
    st['parent_token'] = parent
    save_state(st)
    state['result'] = {'reconcile': True, 'pushed': pushed, 'skipped': skipped,
                       'failed': len(failed), 'total': len(all_fu), 'qadqw_existing': len(existing)}
    state['failed_detail'] = failed[:10]
    log(state)
    print('RECONCILE pushed=%d skipped=%d failed=%d (qadqw_existing=%d, oa_total=%d)' %
          (pushed, skipped, len(failed), len(existing), len(all_fu)))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        state = {}
        try:
            state = json.load(open(LOG_FILE, encoding='utf-8'))
        except Exception:
            pass
        state['fatal'] = traceback.format_exc()
        log(state)
        print('FATAL')
        sys.exit(1)
