-- ============================================================
-- 批次1-A (D1 客户等级 / D2 客户·商机公海)
-- 仅追加列 + 新建表，不修改/不删除任何既有表与列，非破坏性。
-- 保护真实数据：customers(394) / orders(283) / payments(458) 原样不动。
-- 执行方式（人类技术方部署时）：对生产库 holang-crm.db 逐条执行本文件；
--   或 prisma migrate deploy（需先在 migrations 注册本目录）。
-- 本批次测试由 vitest.setup.ts 自动将本 SQL 应用到 DB 副本（绝不触碰真实库）。
-- ============================================================

-- ── D1：customers 增加客户等级 + 跟进频次 + 复审 字段 ──
ALTER TABLE "customers" ADD COLUMN "customer_grade" TEXT;
ALTER TABLE "customers" ADD COLUMN "next_followup_at" DATETIME;
ALTER TABLE "customers" ADD COLUMN "grade_review_at" DATETIME;

-- ── D2：customers 增加公海状态位（客户·商机共用机制）──
ALTER TABLE "customers" ADD COLUMN "in_public_pool" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "owner_id" TEXT;

-- ── D2：opportunities 增加公海状态位 ──
ALTER TABLE "opportunities" ADD COLUMN "in_public_pool" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "opportunities" ADD COLUMN "owner_id" TEXT;

-- ── D1：新建客户等级配置表 customer_grade_config ──
CREATE TABLE "customer_grade_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grade" TEXT NOT NULL,
    "label" TEXT,
    "followupMinDays" INTEGER NOT NULL,
    "followupMaxDays" INTEGER NOT NULL,
    "reviewDays" INTEGER NOT NULL,
    "maxRatioPct" INTEGER NOT NULL DEFAULT 30,
    "downgradeRule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "customer_grade_config_grade_key" ON "customer_grade_config"("grade");

-- ── D1：种子数据（A/B/C 三档，幂等：已存在则忽略）──
INSERT INTO "customer_grade_config" ("id","grade","label","followupMinDays","followupMaxDays","reviewDays","maxRatioPct","downgradeRule","createdAt","updatedAt")
SELECT 'cfg_a','A','高紧迫·短期可成',5,7,30,30,'连续2次超期未跟进自动降至B；A占比超30%触发总监复审',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "customer_grade_config" WHERE "grade"='A');

INSERT INTO "customer_grade_config" ("id","grade","label","followupMinDays","followupMaxDays","reviewDays","maxRatioPct","downgradeRule","createdAt","updatedAt")
SELECT 'cfg_b','B','周期慢·中期评估',14,21,60,0,'连续2次超期未跟进自动降至C',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "customer_grade_config" WHERE "grade"='B');

INSERT INTO "customer_grade_config" ("id","grade","label","followupMinDays","followupMaxDays","reviewDays","maxRatioPct","downgradeRule","createdAt","updatedAt")
SELECT 'cfg_c','C','需求一般·长期培育',28,42,90,0,'超期未跟进保持C并标记沉睡',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "customer_grade_config" WHERE "grade"='C');
