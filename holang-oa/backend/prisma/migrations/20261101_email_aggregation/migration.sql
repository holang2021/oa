-- ============================================================
-- 2026-11-01 邮件归集（邮件自动归集进时间轴 / Phase 1）
-- 刘总业务诉求：绑定公司腾讯企业邮箱后，自动同步往来邮件，按客户邮箱归集进客户档案与时间轴，
--   销售零录入即可见全量往来；销售离职时邮件历史随客户留在系统（客户资产不随人走）。
-- 仅新建两张表 + 索引，不修改/不删除任何既有表与列，非破坏性。
-- 生产部署：对 holang-crm.db 逐条执行；或 prisma migrate deploy（需先注册 migration 历史）。
-- 本地验证已通过：prisma db push --schema prisma/schema.prisma（DATABASE_URL=file:./holang-crm-preview.db）。
-- 安全：授权码走 AES-256-GCM 加密(authEncrypted)，绝不落明文。
-- ============================================================

-- 企业邮箱绑定（按绑定人/业务员维度，一人可绑一个公司邮箱）
CREATE TABLE "email_bindings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'exmail',
  "imapHost" TEXT NOT NULL,
  "imapPort" INTEGER NOT NULL,
  "imapSecure" BOOLEAN NOT NULL DEFAULT 1,
  "smtpHost" TEXT NOT NULL,
  "smtpPort" INTEGER NOT NULL,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT 1,
  "authUser" TEXT NOT NULL,
  "authEncrypted" TEXT NOT NULL,
  "syncState" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "email_bindings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "email_bindings_userId_idx" ON "email_bindings" ("userId");
CREATE INDEX "email_bindings_email_idx" ON "email_bindings" ("email");
CREATE INDEX "email_bindings_status_idx" ON "email_bindings" ("status");

-- 同步进来的往来邮件（收/发），匹配到客户/联系人后并入客户时间轴
CREATE TABLE "email_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bindingId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "customerId" TEXT,
  "contactId" TEXT,
  "direction" TEXT NOT NULL,
  "fromAddr" TEXT NOT NULL,
  "fromName" TEXT,
  "toAddr" TEXT NOT NULL,
  "toName" TEXT,
  "subject" TEXT,
  "snippet" TEXT,
  "bodyText" TEXT,
  "sentAt" DATETIME NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT 0,
  "hasAttachment" BOOLEAN NOT NULL DEFAULT 0,
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "openIps" TEXT,
  "lastOpenedAt" DATETIME,
  CONSTRAINT "email_messages_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "email_bindings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "email_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "email_messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "email_messages_bindingId_idx" ON "email_messages" ("bindingId");
CREATE INDEX "email_messages_customerId_idx" ON "email_messages" ("customerId");
CREATE INDEX "email_messages_contactId_idx" ON "email_messages" ("contactId");
CREATE INDEX "email_messages_direction_idx" ON "email_messages" ("direction");
CREATE INDEX "email_messages_sentAt_idx" ON "email_messages" ("sentAt");
CREATE INDEX "email_messages_fromAddr_idx" ON "email_messages" ("fromAddr");
CREATE INDEX "email_messages_toAddr_idx" ON "email_messages" ("toAddr");
CREATE UNIQUE INDEX "email_messages_bindingId_messageId_key" ON "email_messages" ("bindingId", "messageId");
