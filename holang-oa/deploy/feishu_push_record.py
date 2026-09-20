import subprocess, json, os, traceback, sys

NODE = r'C:\Users\liush\.workbuddy\binaries\node\versions\22.22.2\node.exe'
RUN = r'C:\Users\liush\.workbuddy\binaries\node\versions\22.22.2\node_modules\@larksuite\cli\scripts\run.js'
SPACE = '7598114727864159200'
ROOT = 'Kv26w6fqpi8nVxkfIFocyH5Vngb'
TMP = '_feishu_push_tmp.json'
RES = r'C:\Users\liush\feishu_push_result.json'

def log(d):
    with open(RES, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

def lark(args, data=None):
    env = dict(os.environ)
    env['LARKSUITE_CLI_NO_UPDATE_NOTIFIER'] = '1'
    env['LARKSUITE_CLI_NO_SKILLS_NOTIFIER'] = '1'
    cmd = [NODE, RUN] + args
    if data is not None:
        with open(TMP, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        cmd += ['--data', '@' + TMP]
    p = subprocess.run(cmd, capture_output=True, env=env)
    out = (p.stdout or b'').decode('utf-8', 'replace')
    err = (p.stderr or b'').decode('utf-8', 'replace')
    return out, err, p.returncode

state = {'steps': []}
def step(name, info):
    state['steps'].append({'step': name, **info})
    log(state)

try:
    # 1. create node
    title = 'OA对话归档 2300020158275737 2026-08-06'
    create_body = {'parent_node_token': ROOT, 'obj_type': 'docx', 'node_type': 'origin', 'title': title}
    out, err, rc = lark(['api', 'POST', '/open-apis/wiki/v2/spaces/%s/nodes' % SPACE, '--as', 'user'], create_body)
    state['create'] = {'rc': rc, 'out': out[:1500], 'err': err[:800]}
    step('create_done', {})
    try:
        j = json.loads(out)
        node = j['data']['node']
        docid = node.get('obj_token') or node.get('node_token')
        node_token = node.get('node_token')
        state['create_parsed'] = {'docid': docid, 'node_token': node_token}
    except Exception as e:
        state['create_parse_error'] = str(e)
        log(state); sys.exit(1)

    # 2. write body
    blocks = [
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '【OA 客户 AI 对话归档】'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '客户号：2300020158275737'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '记录码：cmshpbe2x002re27o9zyvzmqf'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '时间：2026-08-06 23:59:22（北京）'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '—— 对话内容 ——'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '问：这个客户现在了解 HOLANG 多少？'}}], 'style': {}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '答：基于现有资料，无法判断客户对 HOLANG 的了解程度……'}}], 'style': {}}},
    ]
    write_body = {'children': blocks, 'index': 0}
    out2, err2, rc2 = lark(['api', 'POST', '/open-apis/docx/v1/documents/%s/blocks/%s/children' % (docid, docid), '--as', 'user'], write_body)
    state['write'] = {'rc': rc2, 'out': out2[:1500], 'err': err2[:800]}
    step('write_done', {})

    # 3. read back
    out3, err3, rc3 = lark(['api', 'GET', '/open-apis/docx/v1/documents/%s/blocks/%s/children' % (docid, docid), '--as', 'user'])
    state['readback'] = {'rc': rc3, 'out': out3[:1500], 'err': err3[:800]}
    state['ok'] = True
    state['node_token'] = node_token
    state['doc_id'] = docid
    step('readback_done', {})
except Exception:
    state['fatal'] = traceback.format_exc()
    log(state)
    sys.exit(1)
finally:
    try:
        os.remove(TMP)
    except Exception:
        pass
