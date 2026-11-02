-- ============================================================
-- 2026-11-02 默认账号强制改密（OA-GOLIVE-HARDENING）
-- User 模型新增 mustChangePassword 字段（映射列 must_change_password）。
-- SQLite 语法：仅新增列，非破坏性，不影响既有业务数据/字段语义。
-- 生产部署：prisma migrate deploy（命令已写入 docker-compose backend command）；
--   或对该 SQLite 文件逐条执行本 SQL。
-- ============================================================

ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT 0;
