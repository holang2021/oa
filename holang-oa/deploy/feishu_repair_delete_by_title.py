# -*- coding: utf-8 -*-
"""修复工具：按 OA 记录 ID 找到飞书侧同名节点并删除(用于清理崩溃产生的空壳节点)，随后由 --reconcile 重新推送正确内容。"""
import sys, json
sys.path.insert(0, r'F:\HOLANGbuddy\03_项目资产\系统建设\holang-oa\deploy')
import feishu_sync_followups as f

KEEPER = 'QADqwQVJtitMp9kCXifcpvkcnAf'


def main():
    rid = sys.argv[1] if len(sys.argv) > 1 else '2300018718526986'
    token = f.oa_login('admin', 'admin123')
    all_fu = []
    page = 1
    while True:
        r = f.oa_get(token, '/follow-ups', {'page': page, 'pageSize': 100})
        lst = r['data']['list']
        if not lst:
            break
        all_fu += lst
        if page >= r['data']['pagination'].get('totalPages', 1):
            break
        page += 1
    fu = next((x for x in all_fu if x.get('id') == rid), None)
    if not fu:
        print('RECORD_NOT_FOUND %s' % rid)
        sys.exit(1)
    title = f.fu_title(fu)
    out, err, rc = f.lark(['wiki', '+node-list', '--space-id', f.SPACE,
                           '--parent-node-token', KEEPER, '--page-all', '--page-limit', '0', '--as', 'user'])
    j = json.loads(out)
    matches = [n for n in j.get('data', {}).get('nodes', []) if n.get('title') == title]
    if not matches:
        print('NODE_NOT_FOUND title=%s (already absent, reconcile will push)' % title)
        sys.exit(0)
    if len(matches) > 1:
        print('WARN multiple nodes share title=%s count=%d, refusing auto-delete' % (title, len(matches)))
        for m in matches:
            print('  ', m.get('node_token'))
        sys.exit(2)
    nt = matches[0]['node_token']
    print('DELETING node %s title=%s' % (nt, title))
    out2, err2, rc2 = f.lark(['wiki', '+node-delete', '--node-token', nt, '--obj-type', 'wiki',
                              '--space-id', f.SPACE, '--yes', '--as', 'user'])
    print('delete rc=%s out=%s' % (rc2, out2[:300]))


if __name__ == '__main__':
    main()
