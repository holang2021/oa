-- 批次0 地基 (D2)：新增审计日志表 audit_logs
-- 仅追加新建表，不修改任何既有表/列，非破坏性，保护 394 客户等真实数据。
-- 关键安全说明：未使用 `prisma migrate dev`/`db push`，因其可能因历史迁移未落库
-- 或 customers.country 列不在 schema 中而触发 reset / 删列。本文件仅 CREATE TABLE。

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "salesType" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "detail" TEXT,
    "traceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_traceId_idx" ON "audit_logs"("traceId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
