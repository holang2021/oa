-- ============================================================
-- 本地预览库补齐 schema 声明但库中缺失的列（幂等执行器：deploy/_apply_missing_columns.py）
-- 背景：schema.prisma 的 User.mustChangePassword 有声明，但预览库 users 表没有这一列，
--       Prisma 查询抛 P2022 → 登录接口统一返回「数据库操作失败」，任何密码都登不进去。
-- 只补默认值列，不改已有数据、不整库同步、不动生产库（生产服务器当前离线）。
-- ============================================================

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
