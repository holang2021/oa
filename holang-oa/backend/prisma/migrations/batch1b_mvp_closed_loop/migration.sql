-- ============================================================
-- 批次1-B (D1 闭环 / D2 外销 PI / D3 内销商务合同)
-- 仅追加列 + 新建表，不修改/不删除任何既有表与列，非破坏性。
-- 保护真实数据：customers(394) / orders(283) / payments(458) / contracts 原样不动。
-- 执行方式（人类技术方部署时）：对生产库 holang-crm.db 逐条执行本文件；
--   或 prisma migrate deploy（需先在本目录注册 migration 历史，见批次0/批次1-A 约定）。
-- 本批次测试由 vitest.setup.ts 自动将本 SQL 应用到 DB 副本（绝不触碰真实库）。
-- ============================================================

-- ── D1：contracts 扩展销售域 / 引用字段（均为可空新列，不破坏既有行）──
ALTER TABLE "contracts" ADD COLUMN "salesType" TEXT;
ALTER TABLE "contracts" ADD COLUMN "quoteRef" TEXT;
ALTER TABLE "contracts" ADD COLUMN "opportunityRef" TEXT;
ALTER TABLE "contracts" ADD COLUMN "orderRef" TEXT;
ALTER TABLE "contracts" ADD COLUMN "piRef" TEXT;
ALTER TABLE "contracts" ADD COLUMN "contractType" TEXT;

-- ── D1：quotes 增加商机关联字段（闭环校验：商机 WIN 才可建报价）──
ALTER TABLE "quotes" ADD COLUMN "opportunityId" TEXT;

-- ── D1：orders 增加合同/PI 关联字段（闭环校验：合同/PI CONFIRMED 才可建订单）──
ALTER TABLE "orders" ADD COLUMN "contractId" TEXT;
ALTER TABLE "orders" ADD COLUMN "piId" TEXT;

-- ── D2：新建外销 PI 表（内销不生成 PI）──
CREATE TABLE IF NOT EXISTS "pis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "piNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesType" TEXT,
    "quoteRef" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" DATETIME,
    "confirmedAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pis_piNo_key" ON "pis"("piNo");
CREATE INDEX IF NOT EXISTS "pis_customerId_idx" ON "pis"("customerId");
CREATE INDEX IF NOT EXISTS "pis_salesType_idx" ON "pis"("salesType");
CREATE INDEX IF NOT EXISTS "pis_quoteRef_idx" ON "pis"("quoteRef");

-- ── 索引：支撑按销售域 / 引用过滤（非破坏性）──
CREATE INDEX IF NOT EXISTS "contracts_salesType_idx" ON "contracts"("salesType");
CREATE INDEX IF NOT EXISTS "contracts_quoteRef_idx" ON "contracts"("quoteRef");
CREATE INDEX IF NOT EXISTS "quotes_opportunityId_idx" ON "quotes"("opportunityId");
CREATE INDEX IF NOT EXISTS "orders_contractId_idx" ON "orders"("contractId");
CREATE INDEX IF NOT EXISTS "orders_piId_idx" ON "orders"("piId");
