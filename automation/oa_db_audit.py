#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
HOLANG OA 数据库只读审计工具
=====================================
用途：对 holang-crm.db 做安全盘点（表清单 / 行数 / 真实最后写入时间 / 关键业务字段分布）。

⚠️ 设计前提（血泪教训，勿删）
--------------------------------------------------------------
本项目的 SQLite 库存在**同一列混存 TEXT 与 INTEGER** 的情况：
  - TEXT    = ISO 时间串，如 "2026-07-08T03:26:24.000Z"
  - INTEGER = 毫秒时间戳，如 1786431351126
SQLite 动态类型下 `MAX(col)` 按**类型**排序（INTEGER < TEXT），
字符串永远排在后面 → 整数时间戳会被完全忽略，MAX 返回的只是 ISO 串的最大值。

2026-09-04 曾因此踩坑：对 users 表直接 MAX(updatedAt) 得到 2026-07-03，
实际该表最后写入是 2026-08-11 14:55:51（毫秒戳）——被漏掉后，
导致误判备份库"数据停在 7 月上旬"，把损失从 16 天夸大成两个月。

因此本工具**一律按 typeof() 分组分别取 MAX，再统一转时间戳比较**。

用法
--------------------------------------------------------------
  python oa_db_audit.py [数据库路径]

  默认路径：F:\\HOLANGbuddy\\03_项目资产\\系统建设\\server_backup\\
            2026-08-16\\backend\\prisma\\holang-crm.db

安全：全程以 `file:...?mode=ro` 只读打开，不产生任何写入。
      若目标库正被后端占用，请先停止对应 PM2 进程。
"""

import sqlite3
import sys
import datetime
from collections import Counter

DEFAULT_DB = (
    r"F:\HOLANGbuddy\03_项目资产\系统建设"
    r"\server_backup\2026-08-16\backend\prisma\holang-crm.db"
)

# 业务关注的重点表（用于时间范围专项输出）
FOCUS_TABLES = [
    "customers", "contacts", "follow_ups", "orders", "order_items",
    "deliveries", "invoices", "payments", "contract_entities",
    "opportunities", "quotes", "quote_items", "contracts", "products",
    "pis", "leads", "sales_targets", "users", "wecom_departments",
    "audit_logs", "customer_ai_messages",
]


def to_timestamp(v):
    """把毫秒时间戳(int/str)或 ISO 串统一转成 epoch 秒；无法解析返回 None"""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v) / 1000.0
    s = str(v).strip()
    if s.isdigit() and len(s) >= 12:          # 以字符串形式存的毫秒戳
        return int(s) / 1000.0
    try:
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def human(ts):
    if ts is None:
        return "无数据"
    try:
        return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(ts)


def open_ro(path):
    uri = "file:" + path.replace("\\", "/") + "?mode=ro"
    return sqlite3.connect(uri, uri=True)


def section(title):
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


def audit(path):
    con = open_ro(path)
    c = con.cursor()

    section("【1】表/视图清单与行数")
    c.execute(
        "SELECT name, type FROM sqlite_master "
        "WHERE type IN ('table','view') ORDER BY name"
    )
    objs = c.fetchall()
    print("%-34s %-6s %s" % ("NAME", "TYPE", "ROWS"))
    for name, typ in objs:
        try:
            c.execute('SELECT COUNT(*) FROM "%s"' % name)
            cnt = c.fetchone()[0]
        except Exception as e:
            cnt = "ERR: %s" % e
        print("%-34s %-6s %s" % (name, typ, cnt))

    section("【2】各表真实最后写入时间（按 typeof 分组取 MAX，规避类型混存失真）")
    print("%-24s %-12s %s" % ("TABLE", "COLUMN", "LAST_WRITE"))
    for t in FOCUS_TABLES:
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (t,))
        if not c.fetchone():
            print("%-24s %-12s %s" % (t, "-", "[表不存在]"))
            continue
        c.execute('PRAGMA table_info("%s")' % t)
        cols = [r[1] for r in c.fetchall()]
        col = "updatedAt" if "updatedAt" in cols else (
            "createdAt" if "createdAt" in cols else None)
        if not col:
            print("%-24s %-12s %s" % (t, "-", "[无时间列]"))
            continue
        # 关键：分类型取最大，再比较
        best = None
        for ttype in ("integer", "real", "text"):
            c.execute(
                'SELECT MAX("%s") FROM "%s" WHERE typeof("%s")=? ' % (col, t, col),
                (ttype,),
            )
            ts = to_timestamp(c.fetchone()[0])
            if ts is not None and (best is None or ts > best):
                best = ts
        print("%-24s %-12s %s" % (t, col, human(best)))

    section("【3】类型混存检测（有输出=该列混存，直接 MAX 会失真）")
    found = False
    c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    for (t,) in c.fetchall():
        c.execute('PRAGMA table_info("%s")' % t)
        cols = [r[1] for r in c.fetchall()]
        for col in ("updatedAt", "createdAt"):
            if col not in cols:
                continue
            c.execute(
                'SELECT typeof("%s"), COUNT(*) FROM "%s" GROUP BY typeof("%s")'
                % (col, t, col)
            )
            kinds = c.fetchall()
            if len(kinds) > 1:
                found = True
                desc = ", ".join("%s=%d" % (k, n) for k, n in kinds if k is not None)
                print("  ⚠️ %-24s %-10s 混存 -> %s" % (t, col, desc))
    if not found:
        print("  未发现混存列")

    section("【4】客户归属与公海分布")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
    if c.fetchone():
        c.execute("PRAGMA table_info(customers)")
        cols = [r[1] for r in c.fetchall()]
        for f in ("salesOwnerId", "owner_id"):
            if f in cols:
                c.execute(
                    "SELECT COUNT(*) FROM customers WHERE \"%s\" IS NOT NULL AND \"%s\" != ''"
                    % (f, f)
                )
                print("  %-16s 有值: %s" % (f, c.fetchone()[0]))
        c.execute("SELECT COUNT(*) FROM customers")
        print("  %-16s %s" % ("客户总数", c.fetchone()[0]))
        for f in ("in_public_pool", "inPublicPool", "salesType"):
            if f in cols:
                c.execute('SELECT "%s", COUNT(*) FROM customers GROUP BY "%s"' % (f, f))
                print("  %-16s %s" % (f, c.fetchall()))

    section("【5】用户表明细")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if c.fetchone():
        c.execute("SELECT name, wecomUserId, role, department, isActive, updatedAt FROM users")
        for name, wuid, role, dept, act, upd in c.fetchall():
            print("  %-16s wecom=%-14s role=%-18s dept=%-10s active=%s"
                  % (name, str(wuid)[:14], role, dept, act))
            print("       lastWrite=%s" % human(to_timestamp(upd)))

    section("【6】审计日志末条（交叉验证备份真实时间点）")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'")
    if c.fetchone():
        c.execute("PRAGMA table_info(audit_logs)")
        cols = [r[1] for r in c.fetchall()]
        idx = {n: i for i, n in enumerate(cols)}
        tcol = "createdAt" if "createdAt" in idx else None
        if tcol:
            c.execute("SELECT createdAt FROM audit_logs")
            allts = [to_timestamp(r[0]) for r in c.fetchall()]
            allts = [x for x in allts if x is not None]
            if allts:
                print("  末条时间: %s  <-- 与备份文件 mtime 比对可验证备份新鲜度"
                      % human(max(allts)))
                print("  首条时间: %s" % human(min(allts)))
                monthly = Counter(human(x)[:7] for x in allts)
                print("  按月分布: %s" % dict(sorted(monthly.items())))
        c.execute("SELECT * FROM audit_logs ORDER BY rowid DESC LIMIT 5")
        for r in c.fetchall():
            ts = human(to_timestamp(r[idx[tcol]])) if tcol else "?"
            act = r[idx["action"]] if "action" in idx else "?"
            ent = r[idx["entity"]] if "entity" in idx else "?"
            print("    %s | %-10s | %s" % (ts, act, ent))

    con.close()


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    print("只读审计目标: %s" % path)
    try:
        audit(path)
    except Exception as e:
        print("审计失败: %s" % e)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
