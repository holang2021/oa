-- ============================================================
-- HOLANG CRM — 伙伴云数据迁移 Schema v2
-- Migration: 20260702_add_businessline_and_orders
-- 说明: 增加内销/外销分类、订单/回款模型、扩展字段
-- ============================================================

-- 1. Create new enums (PostgreSQL native enums)
CREATE TYPE "BusinessLine" AS ENUM ('INDUSTRIAL', 'RETAIL');
CREATE TYPE "SalesType" AS ENUM ('INTERNAL', 'EXTERNAL');
CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED', 'IN_PRODUCTION', 'DELIVERED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'RECEIVED');
CREATE TYPE "PaymentType" AS ENUM ('PROGRESS', 'DEPOSIT', 'FINAL');

-- 2. Alter customers table — add business classification and extended fields
ALTER TABLE "customers" ADD COLUMN "businessLine" "BusinessLine" NOT NULL DEFAULT 'INDUSTRIAL';
ALTER TABLE "customers" ADD COLUMN "salesType" "SalesType" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "customers" ADD COLUMN "industryOther" TEXT;
ALTER TABLE "customers" ADD COLUMN "scale" TEXT;
ALTER TABLE "customers" ADD COLUMN "addressDetail" TEXT;
ALTER TABLE "customers" ADD COLUMN "companyPhone" TEXT;
ALTER TABLE "customers" ADD COLUMN "website" TEXT;
ALTER TABLE "customers" ADD COLUMN "creditCode" TEXT;
ALTER TABLE "customers" ADD COLUMN "salesPerson" TEXT;
ALTER TABLE "customers" ADD COLUMN "salesDept" TEXT;
ALTER TABLE "customers" ADD COLUMN "followStage" TEXT;
ALTER TABLE "customers" ADD COLUMN "taxTitle" TEXT;
ALTER TABLE "customers" ADD COLUMN "invoiceType" TEXT;
ALTER TABLE "customers" ADD COLUMN "bankName" TEXT;
ALTER TABLE "customers" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "customers" ADD COLUMN "bankCode" TEXT;
ALTER TABLE "customers" ADD COLUMN "dealAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "dealCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "unpaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "lastFollowAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "nextFollowAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "overdueFollow" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "transactedAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "remark" TEXT;
ALTER TABLE "customers" ADD COLUMN "attachments" TEXT;
ALTER TABLE "customers" ADD COLUMN "contractFile" TEXT;
ALTER TABLE "customers" ADD COLUMN "huobanId" TEXT;
ALTER TABLE "customers" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "customers_huobanId_key" ON "customers"("huobanId");
CREATE INDEX "customers_businessLine_idx" ON "customers"("businessLine");
CREATE INDEX "customers_salesType_idx" ON "customers"("salesType");

-- 3. Create orders table
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "businessLine" "BusinessLine" NOT NULL DEFAULT 'INDUSTRIAL',
    "salesPerson" TEXT,
    "salesOwnerId" TEXT,
    "salesType" TEXT,
    "contractEntity" TEXT,
    "productType" TEXT,
    "endUser" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountWithoutTax" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION,
    "taxRate" DOUBLE PRECISION DEFAULT 13,
    "collectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoicedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION,
    "grossMargin" DOUBLE PRECISION,
    "unpaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "receiver" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "province" TEXT,
    "invoiceTitle" TEXT,
    "invoiceType" TEXT,
    "creditCode" TEXT,
    "companyAddress" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "phone" TEXT,
    "approvalStatus" TEXT,
    "flowStatus" TEXT,
    "bonusRate" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "specialReq" TEXT,
    "techAgreement" TEXT,
    "contractFile" TEXT,
    "quotationId" TEXT,
    "opportunityId" TEXT,
    "huobanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_orderCode_key" ON "orders"("orderCode");
CREATE UNIQUE INDEX "orders_huobanId_key" ON "orders"("huobanId");
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");
CREATE INDEX "orders_businessLine_idx" ON "orders"("businessLine");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create order_items table
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "productNameEn" TEXT,
    "spec" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION DEFAULT 13,
    "costPrice" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deviceCode" TEXT,
    "currency" TEXT,
    "exchangeRate" DOUBLE PRECISION,
    "huobanId" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Create payments table
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentCode" TEXT,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "PaymentType" NOT NULL DEFAULT 'PROGRESS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "plannedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "payerAccount" TEXT,
    "paymentRatio" DOUBLE PRECISION,
    "confirmedFinance" TEXT,
    "confirmedFinanceDate" TIMESTAMP(3),
    "invoiceConfirm" TEXT,
    "applicantId" TEXT,
    "flowStatus" TEXT,
    "applyDate" TIMESTAMP(3),
    "voucher" TEXT,
    "remark" TEXT,
    "huobanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_huobanId_key" ON "payments"("huobanId");
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Alter contacts table — add extended fields
ALTER TABLE "contacts" ADD COLUMN "wechat" TEXT;
ALTER TABLE "contacts" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "contacts" ADD COLUMN "dept" TEXT;
ALTER TABLE "contacts" ADD COLUMN "gender" TEXT;
ALTER TABLE "contacts" ADD COLUMN "contactType" TEXT;
ALTER TABLE "contacts" ADD COLUMN "remark" TEXT;
ALTER TABLE "contacts" ADD COLUMN "huobanId" TEXT;

-- 7. Alter opportunities table — add extended fields  
ALTER TABLE "opportunities" ADD COLUMN "code" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "collaborators" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "taxRate" DOUBLE PRECISION DEFAULT 13;
ALTER TABLE "opportunities" ADD COLUMN "discount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "opportunities" ADD COLUMN "costTotal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "opportunities" ADD COLUMN "margin" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "opportunities" ADD COLUMN "huobanId" TEXT;
CREATE UNIQUE INDEX "opportunities_huobanId_key" ON "opportunities"("huobanId");

-- 8. Alter follow_ups table — add extended fields
ALTER TABLE "follow_ups" ADD COLUMN "channel" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN "operator" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN "huobanId" TEXT;
