import feishu_sync_followups as base
import os
user = os.environ.get('OA_ADMIN_USER', 'admin')
password = os.environ.get('OA_ADMIN_PASS', 'admin123')
tok = base.oa_login(user, password)
all_fu = []
page = 1
while True:
    r = base.oa_get(tok, '/follow-ups', {'page': page, 'pageSize': 100})
    if r.get('code') != 0:
        print('PULL_FAIL', r); break
    lst = r['data']['list']
    if not lst: break
    all_fu += lst
    pg = r['data']['pagination']
    if page >= pg.get('totalPages', 1): break
    page += 1
print('OA follow-ups total =', len(all_fu))
titles = [base.fu_title(fu) for fu in all_fu]
uniq = set(titles)
print('unique titles       =', len(uniq))
print('duplicate records   =', len(all_fu) - len(uniq))
# show duplicate title groups
from collections import Counter
c = Counter(titles)
dups = {t: n for t, n in c.items() if n > 1}
print('distinct dup titles =', len(dups))
for t, n in list(dups.items())[:15]:
    print('  x%d  %s' % (n, t))
