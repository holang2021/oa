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
