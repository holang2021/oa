-- ============================================================
-- HOLANG OA 配置类表（币种 / 编码规则 / 字段配置）
-- 以原生 SQL 幂等创建，避免重新生成 Prisma 客户端（线上客户端未含这些模型）。
-- 部署时执行：cd /opt/holang/oa/backend && npx prisma db execute --schema prisma/schema.prisma --stdin < sql/setup_config_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  name TEXT,
  name_en TEXT,
  symbol TEXT,
  rate REAL DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_updated TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 初始汇率（幂等，只补不覆盖）：管理员在「系统设置 → 币种与汇率」改过的值保持不变。
-- 刘总 2026-11-08「汇率没有写入」：只建表不落初始值时 currencies 为空，
-- 前端 initCurrencies() 会静默回退到前端默认汇率，业务表单就读不到「系统里已设计好的汇率」。
-- 汇率口径与 currencyStore.DEFAULT_CURRENCIES 一致：1 单位外币 = 多少 CNY。
INSERT OR IGNORE INTO currencies (id, name, name_en, symbol, rate, is_default, is_active, last_updated, created_at, updated_at)
VALUES
  ('CNY', '人民币', 'Chinese Yuan', '¥', 1,    1, 1, NULL, datetime('now'), datetime('now')),
  ('USD', '美元',   'US Dollar',    '$', 7.25, 0, 1, NULL, datetime('now'), datetime('now')),
  ('EUR', '欧元',   'Euro',         '€', 7.85, 0, 1, NULL, datetime('now'), datetime('now')),
  ('GBP', '英镑',   'British Pound','£', 9.18, 0, 1, NULL, datetime('now'), datetime('now')),
  ('JPY', '日元',   'Japanese Yen', '¥', 0.048,0, 1, NULL, datetime('now'), datetime('now')),
  ('HKD', '港币',   'Hong Kong Dollar','$',0.93,0, 1, NULL, datetime('now'), datetime('now'));

CREATE TABLE IF NOT EXISTS code_rules (
  id TEXT PRIMARY KEY,
  name TEXT,
  name_en TEXT,
  prefix TEXT,
  date_format TEXT,
  separator TEXT,
  serial_digits INTEGER DEFAULT 3,
  serial_start INTEGER DEFAULT 1,
  current_serial INTEGER DEFAULT 1,
  serial_reset TEXT DEFAULT 'never',
  last_reset_key TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS field_configs (
  module TEXT PRIMARY KEY,
  config_json TEXT,
  updated_at TEXT
);
