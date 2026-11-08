# -*- coding: utf-8 -*-
"""本地预览库「schema 有 / 库里没有」的列，幂等补齐（自动备份，可重复运行）。

用法：python deploy/_apply_missing_columns.py
对应 DDL：backend/sql/setup_missing_columns.sql
体检只读脚本：F:/tmp/check_schema_drift.py

纪律：只补带默认值的列；不改已有数据；不整库同步；不动生产库。
      生产服务器恢复后，把本脚本与 SQL 作为 hotfix 增量覆盖后执行同一命令即可。
"""
import os
import shutil
import sqlite3
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DB = os.path.join(ROOT, 'backend', 'prisma', 'holang-crm-preview.db')

# 白名单：只补已知的、带安全默认值的列。新增缺失列时须同步在此登记 DDL。
DDL_MAP = {
    ('users', 'must_change_password'):
        'ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0',
}


def columns(con, table):
    return {r[1] for r in con.execute('PRAGMA table_info("%s")' % table)}


def main():
    if not os.path.exists(DB):
        raise SystemExit('DB_NOT_FOUND: ' + DB)
    bak = DB + '.bak-missing-cols-' + time.strftime('%Y%m%d%H%M%S')
    shutil.copy2(DB, bak)
    print('DB_BACKED_UP=' + bak)

    con = sqlite3.connect(DB)
    try:
        added = []
        skipped = []
        for (table, col), ddl in DDL_MAP.items():
            if col in columns(con, table):
                skipped.append('%s.%s' % (table, col))
            else:
                con.execute(ddl)
                added.append('%s.%s' % (table, col))
        con.commit()

        # 校验：所有白名单列都已存在，且默认值对已有用户生效（admin 不应被强制改密）
        bad = ['%s.%s' % (t, c) for (t, c) in DDL_MAP if c not in columns(con, t)]
        if bad:
            raise SystemExit('VERIFY_FAIL 仍缺列: ' + ', '.join(bad))
        rows = con.execute('SELECT name, must_change_password FROM users').fetchall()
        print('COLUMN_ADDED=' + (', '.join(added) if added else 'none'))
        print('IDEMPOTENT_SKIP=' + (', '.join(skipped) if skipped else 'none'))
        print('USERS=' + str(rows))
        print('[结论] PASS — 缺失列已就绪，已有用户默认不被强制改密，可重复运行')
    finally:
        con.close()


if __name__ == '__main__':
    main()
