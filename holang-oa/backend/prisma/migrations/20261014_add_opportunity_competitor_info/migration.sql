-- 竞品信息独立存储，供后续知识库检索和销售策略分析使用。
ALTER TABLE "opportunities" ADD COLUMN "competitor_info" TEXT;
