# -*- coding: utf-8 -*-
"""PI 商品明细列幂等部署器（走法B：加 1 列 JSON，不新增 Model）。

本地：python deploy/_deploy_pi_items.py            → 检查列 → 不存在则 ALTER → 校验 → 打印结果
生产：服务器恢复后，把本脚本 + sql/setup_pi_items.sql 作为 hotfix 增量覆盖，执行同一命令。
     执行前会自动备份 DB 到同目录 *.bak-pi-items-<时间戳>。
绝不做整库同步 / 绝不重建 backend 目录（项目铁律）。
"""
import os
import shutil
import sqlite3
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DB = os.path.join(ROOT, 'backend', 'prisma', 'holang-crm-preview.db')
SQL_FILE = os.path.join(ROOT, 'backend', 'sql', 'setup_pi_items.sql')
COLUMN = 'items_json'


def main():
    if not os.path.exists(DB):
        raise SystemExit('DB_NOT_FOUND: ' + DB)
    bak = DB + '.bak-pi-items-' + time.strftime('%Y%m%d%H%M%S')
    shutil.copy2(DB, bak)
    print('DB_BACKED_UP=' + bak)

    con = sqlite3.connect(DB)
    try:
        cols = [r[1] for r in con.execute('PRAGMA table_info(pis)')]
        if COLUMN in cols:
            print('COLUMN_EXISTS=SKIP  pis.' + COLUMN + ' 已存在，幂等跳过')
        else:
            ddl = open(SQL_FILE, encoding='utf-8').read()
            # 只取 DDL 语句（忽略注释行）
            stmt = [l.strip() for l in ddl.splitlines()
                    if l.strip() and not l.strip().startswith('--')]
            con.execute(' '.join(stmt))
            con.commit()
            print('COLUMN_ADDED=pis.' + COLUMN)

        cols2 = [r[1] for r in con.execute('PRAGMA table_info(pis)')]
        assert COLUMN in cols2, '校验失败：列未生效'
        n = con.execute('SELECT COUNT(*) FROM pis').fetchone()[0]
        print('VERIFY_OK  pis 列数=%d 行数=%d' % (len(cols2), n))
        print('[结论] PASS — PI 明细列就绪，可重复运行')
    finally:
        con.close()


if __name__ == '__main__':
    main()
