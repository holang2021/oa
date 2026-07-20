-- ============================================================
-- HOLANG CRM 数据库设计（基于伙伴云数据迁移）
-- 创建日期：2026-06-30
-- 说明：所有表保留 huoban_id 字段用于迁移映射
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 配置表（枚举 / 基础数据）
-- ============================================================

-- 所属行业
CREATE TABLE `industries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `huoban_id` VARCHAR(32) DEFAULT NULL COMMENT '伙伴云原始ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='所属行业';
INSERT INTO `industries` (`name`) VALUES
('电子加工'),('食品包装'),('生物制药'),('3D打印'),('文物储藏'),('实验室'),('其他');

-- 部门
CREATE TABLE `departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门';
INSERT INTO `departments` (`name`) VALUES ('销售一部'),('销售二部'),('技术部'),('售后部'),('管理部');

-- 岗位 / 角色
CREATE TABLE `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位';
INSERT INTO `roles` (`name`) VALUES ('销售经理'),('销售代表'),('技术总监'),('售后工程师'),('管理员');

-- 渠道来源
CREATE TABLE `channels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道来源';
INSERT INTO `channels` (`name`) VALUES
('线上推广'),('展会'),('转介绍'),('电话营销'),('其他');

-- 客户来源
CREATE TABLE `sources` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户来源';

-- 签约主体
CREATE TABLE `contract_entities` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `credit_code` VARCHAR(50) DEFAULT '' COMMENT '统一信用代码',
  `address` VARCHAR(300) DEFAULT '' COMMENT '公司地址',
  `bank_name` VARCHAR(100) DEFAULT '' COMMENT '开户银行',
  `bank_account` VARCHAR(100) DEFAULT '' COMMENT '银行账号',
  `phone` VARCHAR(50) DEFAULT '' COMMENT '电话',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='签约主体';

-- 汇率表
CREATE TABLE `exchange_rates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `currency` VARCHAR(10) NOT NULL COMMENT '币种代码，如 USD/CNY/EUR',
  `rate` DECIMAL(10,4) NOT NULL DEFAULT 1.0000 COMMENT '对人民币汇率',
  `effective_date` DATE NOT NULL COMMENT '生效日期',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_currency_date` (`currency`, `effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='汇率表';

-- ============================================================
-- 2. 用户 / 员工表
-- ============================================================
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '员工姓名',
  `userid` VARCHAR(64) DEFAULT '' COMMENT '企微 UserID，用于登录认证',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  `department_id` INT UNSIGNED DEFAULT NULL COMMENT '所属部门',
  `role_id` INT UNSIGNED DEFAULT NULL COMMENT '岗位/角色',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL,
  KEY `idx_userid` (`userid`),
  KEY `idx_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工/用户表';

-- ============================================================
-- 3. 客户表
-- ============================================================
CREATE TABLE `customers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '客户编号（自动生成）',
  `name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `company_phone` VARCHAR(50) DEFAULT '' COMMENT '公司电话',
  `industry` VARCHAR(50) DEFAULT '' COMMENT '所属行业',
  `industry_other` VARCHAR(100) DEFAULT '' COMMENT '其他行业',
  `scale` VARCHAR(20) DEFAULT '' COMMENT '公司规模：0-100人/101-300人/301-1000人/1000人以上',
  `business_line` VARCHAR(20) DEFAULT 'domestic' COMMENT '销售类别：domestic=国内/overseas=海外',
  `source` VARCHAR(100) DEFAULT '' COMMENT '客户来源',
  `address` VARCHAR(300) DEFAULT '' COMMENT '地址（省市区）',
  `address_detail` VARCHAR(300) DEFAULT '' COMMENT '详细地址',
  `invoice_type` VARCHAR(20) DEFAULT '' COMMENT '发票类型：普通发票/增值税专用发票',
  `tax_title` VARCHAR(200) DEFAULT '' COMMENT '发票抬头',
  `credit_code` VARCHAR(50) DEFAULT '' COMMENT '统一信用代码',
  `bank_name` VARCHAR(100) DEFAULT '' COMMENT '开户银行',
  `bank_account` VARCHAR(100) DEFAULT '' COMMENT '银行账号',
  `bank_code` VARCHAR(50) DEFAULT '' COMMENT '银行行号',
  `company_address` VARCHAR(300) DEFAULT '' COMMENT '开票用公司地址',
  `phone` VARCHAR(50) DEFAULT '' COMMENT '开票用电话',
  `website` VARCHAR(200) DEFAULT '' COMMENT '公司官网',
  `follow_stage` VARCHAR(20) DEFAULT 'leads' COMMENT '商机阶段：leads=线索/opportunity=商机/quotation=报价/deal=成交/lost=丢单',
  `sales_person_id` INT UNSIGNED DEFAULT NULL COMMENT '销售负责人',
  `department_id` INT UNSIGNED DEFAULT NULL COMMENT '所属部门',
  `assigned_at` DATE DEFAULT NULL COMMENT '分配时间',
  `last_follow_at` DATE DEFAULT NULL COMMENT '上次跟进日期',
  `next_follow_at` DATE DEFAULT NULL COMMENT '下次跟进日期',
  `overdue_follow` TINYINT(1) DEFAULT 0 COMMENT '跟进是否超时：0=及时/1=超时',
  `deal_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '成交金额（统计）',
  `deal_count` INT DEFAULT 0 COMMENT '成交次数（统计）',
  `paid_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '回款金额（统计）',
  `unpaid_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '待回款金额（统计）',
  `opportunity_count` INT DEFAULT 0 COMMENT '商机数（统计）',
  `remark` TEXT COMMENT '备注',
  `attachments` JSON COMMENT '相关附件URL数组',
  `huoban_id` VARCHAR(32) DEFAULT NULL COMMENT '伙伴云原始ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sales_person_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  KEY `idx_name` (`name`),
  KEY `idx_sales_person` (`sales_person_id`),
  KEY `idx_follow_stage` (`follow_stage`),
  KEY `idx_business_line` (`business_line`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户信息';

-- ============================================================
-- 4. 销售线索表
-- ============================================================
CREATE TABLE `leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '线索编号',
  `name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `contact_name` VARCHAR(50) DEFAULT '' COMMENT '联系人姓名',
  `phone` VARCHAR(50) DEFAULT '' COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  `industry_id` INT UNSIGNED DEFAULT NULL COMMENT '所属行业',
  `region` VARCHAR(20) DEFAULT '' COMMENT '地区：domestic=国内/overseas=国外',
  `channel_id` INT UNSIGNED DEFAULT NULL COMMENT '线索渠道',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '线索状态：pending=待分配/assigned=已分配/invalid=无效/converted=已转化',
  `invalid_reason` VARCHAR(100) DEFAULT '' COMMENT '无效原因',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '销售负责人',
  `department_id` INT UNSIGNED DEFAULT NULL COMMENT '所属部门',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '录入日期',
  `assigned_at` DATETIME DEFAULT NULL COMMENT '分配/领取日期',
  `last_follow_at` DATE DEFAULT NULL COMMENT '最新跟进日期',
  `next_follow_at` DATE DEFAULT NULL COMMENT '下次跟进日期',
  `overdue_follow` TINYINT(1) DEFAULT 0 COMMENT '跟进是否超时',
  `score` DECIMAL(5,2) DEFAULT 0 COMMENT '线索打分',
  `is_converted` TINYINT(1) DEFAULT 0 COMMENT '是否转化',
  `converted_customer_id` INT UNSIGNED DEFAULT NULL COMMENT '转化后的客户ID',
  `remark` TEXT,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`converted_customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  KEY `idx_status` (`status`),
  KEY `idx_owner` (`owner_id`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售线索';

-- ============================================================
-- 5. 商机表
-- ============================================================
CREATE TABLE `opportunities` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '商机编号',
  `name` VARCHAR(200) NOT NULL COMMENT '商机名称',
  `customer_id` INT UNSIGNED NOT NULL COMMENT '所属客户',
  `contact_id` INT UNSIGNED DEFAULT NULL COMMENT '客户联系人',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '负责人',
  `collaborator_ids` JSON COMMENT '协作人ID数组',
  `stage` VARCHAR(32) DEFAULT 'initial_communication' COMMENT '商机里程碑',
  `lost_reason` VARCHAR(100) DEFAULT '' COMMENT '输单原因',
  `expected_close_date` DATE DEFAULT NULL COMMENT '预计成交日期',
  `expected_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '预计成交金额',
  `win_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '成交概率（%）',
  `original_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '销售原价总额',
  `discount_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '优惠金额',
  `discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '整单折扣率（%）',
  `final_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '销售订单金额（税后）',
  `cost_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '产品成本总额',
  `gross_margin` DECIMAL(5,2) DEFAULT 0 COMMENT '订单毛利率（%）',
  `tax_rate` DECIMAL(5,2) DEFAULT 13.00 COMMENT '增值税税率（%）',
  `overdue_follow` TINYINT(1) DEFAULT 0 COMMENT '跟进是否超时',
  `next_follow_at` DATETIME DEFAULT NULL COMMENT '下次跟进时间',
  `department_id` INT UNSIGNED DEFAULT NULL COMMENT '所属部门',
  `remark` TEXT,
  `attachments` JSON COMMENT '附件URL数组',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '商机获取日期',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_owner` (`owner_id`),
  KEY `idx_stage` (`stage`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商机';

-- 商机阶段枚举（stage 字段值）：
-- initial_communication = 初步交流
-- requirement_communication = 需求沟通
-- quotation = 方案/报价
-- negotiation = 谈判审核
-- won = 赢单
-- lost = 输单/取消

-- ============================================================
-- 6. 报价单表
-- ============================================================
CREATE TABLE `quotations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '报价单编号',
  `customer_id` INT UNSIGNED NOT NULL COMMENT '所属客户',
  `opportunity_id` INT UNSIGNED DEFAULT NULL COMMENT '所属商机',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '负责人',
  `quotation_date` DATE NOT NULL COMMENT '报价日期',
  `original_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '销售原价总额',
  `discount_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '优惠金额',
  `discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '整单折扣率（%）',
  `final_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '销售订单金额（税后）',
  `cost_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '产品成本总额',
  `gross_margin` DECIMAL(5,2) DEFAULT 0 COMMENT '订单毛利率（%）',
  `tax_rate` DECIMAL(5,2) DEFAULT 13.00 COMMENT '增值税税率（%）',
  `approval_status` VARCHAR(32) DEFAULT 'pending' COMMENT '审批状态',
  `flow_status` VARCHAR(32) DEFAULT '' COMMENT '流程状态',
  `flow_remark` VARCHAR(500) DEFAULT '' COMMENT '流程进展说明',
  `is_converted_to_order` TINYINT(1) DEFAULT 0 COMMENT '是否转订单：0=未转/1=已转',
  `stage` VARCHAR(20) DEFAULT '' COMMENT '商机阶段（冗余）',
  `department_id` INT UNSIGNED DEFAULT NULL,
  `remark` TEXT,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_opportunity` (`opportunity_id`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价单';

-- 审批状态枚举（approval_status）：
-- pending = 待审批
-- approving = 审批中
-- rejected = 已驳回
-- approved = 已通过
-- revoked = 已撤销

-- 报价单明细
CREATE TABLE `quotation_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `quotation_id` INT UNSIGNED NOT NULL COMMENT '所属报价单',
  `product_name` VARCHAR(200) DEFAULT '' COMMENT '产品名称',
  `spec_model` VARCHAR(200) DEFAULT '' COMMENT '规格型号',
  `unit` VARCHAR(20) DEFAULT '' COMMENT '计量单位',
  `quantity` INT DEFAULT 1 COMMENT '数量',
  `unit_price` DECIMAL(15,2) DEFAULT 0 COMMENT '单价',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
  `subtotal` DECIMAL(15,2) DEFAULT 0 COMMENT '小计（未税）',
  `sort_order` INT DEFAULT 0,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE,
  KEY `idx_quotation` (`quotation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价单明细';

-- ============================================================
-- 7. 订单表
-- ============================================================
CREATE TABLE `orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '订单编号',
  `customer_id` INT UNSIGNED NOT NULL COMMENT '客户信息',
  `opportunity_id` INT UNSIGNED DEFAULT NULL COMMENT '所属商机',
  `quotation_id` INT UNSIGNED DEFAULT NULL COMMENT '所属报价单',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '销售负责人',
  `department_id` INT UNSIGNED DEFAULT NULL COMMENT '所属部门',
  `contract_entity_id` INT UNSIGNED DEFAULT NULL COMMENT '签约主体',
  `order_date` DATE NOT NULL COMMENT '订单日期',
  `expected_delivery_date` DATE DEFAULT NULL COMMENT '期望发货日期',
  `sales_type` VARCHAR(20) DEFAULT 'direct' COMMENT '销售类型：direct=直销/indirect=间销',
  `business_line` VARCHAR(20) DEFAULT 'domestic' COMMENT '销售类别：domestic=国内/overseas=海外',
  `product_type` VARCHAR(20) DEFAULT '' COMMENT '产品类型：finished=成品/spare=备件',
  `order_status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态：pending=未完成/completed=已完成',
  `payment_method` VARCHAR(100) DEFAULT '' COMMENT '付款方式',
  `tax_rate` DECIMAL(5,2) DEFAULT 13.00 COMMENT '增值税税率（%）',
  `original_amount_with_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '销售原价总额（含税）',
  `discount_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '优惠金额',
  `discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '整单折扣（%）',
  `amount_with_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '销售订单金额（含税）',
  `amount_without_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '销售订单金额（未税）',
  `cost_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '产品成本总额',
  `gross_margin` DECIMAL(5,2) DEFAULT 0 COMMENT '订单毛利率（%）',
  `paid_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '已回款金额',
  `unpaid_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '待回款金额',
  `invoiced_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '已开票金额',
  `receiver` VARCHAR(100) DEFAULT '' COMMENT '收货人',
  `receiver_phone` VARCHAR(50) DEFAULT '' COMMENT '联系方式',
  `province` VARCHAR(50) DEFAULT '' COMMENT '省份',
  `delivery_address` VARCHAR(300) DEFAULT '' COMMENT '收货地址',
  `invoice_type` VARCHAR(20) DEFAULT '' COMMENT '发票类型',
  `invoice_title` VARCHAR(200) DEFAULT '' COMMENT '发票抬头',
  `credit_code` VARCHAR(50) DEFAULT '' COMMENT '统一信用代码（发票用）',
  `company_address` VARCHAR(300) DEFAULT '' COMMENT '公司地址（发票用）',
  `bank_name` VARCHAR(100) DEFAULT '' COMMENT '开户银行（发票用）',
  `bank_account` VARCHAR(100) DEFAULT '' COMMENT '银行账号（发票用）',
  `phone` VARCHAR(50) DEFAULT '' COMMENT '电话（发票用）',
  `bonus_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '奖金比例（%）',
  `commission` DECIMAL(15,2) DEFAULT 0 COMMENT '提成',
  `approval_status` VARCHAR(32) DEFAULT 'pending' COMMENT '审批状态',
  `flow_status` VARCHAR(32) DEFAULT '' COMMENT '流程状态',
  `flow_remark` VARCHAR(500) DEFAULT '' COMMENT '流程进展',
  `attachments` JSON COMMENT '合同附件/技术协议URL数组',
  `special_requirements` TEXT COMMENT '特殊要求',
  `remark` TEXT,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`contract_entity_id`) REFERENCES `contract_entities`(`id`) ON DELETE SET NULL,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_owner` (`owner_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单';

-- 订单明细
CREATE TABLE `order_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL COMMENT '所属订单',
  `product_name` VARCHAR(200) DEFAULT '' COMMENT '产品名称',
  `spec_model` VARCHAR(200) DEFAULT '' COMMENT '规格型号',
  `unit` VARCHAR(20) DEFAULT '' COMMENT '计量单位',
  `quantity` INT DEFAULT 1 COMMENT '数量',
  `unit_price` DECIMAL(15,2) DEFAULT 0 COMMENT '单价',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
  `subtotal` DECIMAL(15,2) DEFAULT 0 COMMENT '小计（未税）',
  `actual_price_with_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '实际售价（含税）',
  `actual_subtotal_with_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '实际售价合计（含税）',
  `cost_unit_price` DECIMAL(15,2) DEFAULT 0 COMMENT '成本单价',
  `cost_total` DECIMAL(15,2) DEFAULT 0 COMMENT '成本总额',
  `device_code` VARCHAR(100) DEFAULT '' COMMENT '设备编号',
  `sort_order` INT DEFAULT 0,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细';

-- ============================================================
-- 8. 回款单表
-- ============================================================
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '回款单编号',
  `customer_id` INT UNSIGNED NOT NULL COMMENT '所属客户',
  `order_id` INT UNSIGNED DEFAULT NULL COMMENT '订单信息',
  `applicant_id` INT UNSIGNED DEFAULT NULL COMMENT '申请人',
  `payment_date` DATE DEFAULT NULL COMMENT '回款日期',
  `payment_method` VARCHAR(32) DEFAULT '' COMMENT '回款方式：bank_transfer=银行转账TT/cash=现金/acceptance=承兑汇票/lc=信用证LC',
  `payer_account` VARCHAR(200) DEFAULT '' COMMENT '客户付款账户',
  `amount` DECIMAL(15,2) NOT NULL COMMENT '本次回款金额（元）',
  `payment_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '本次回款比例（%）',
  `finance_confirm` VARCHAR(32) DEFAULT 'pending' COMMENT '财务确认回款：pending=回款待确认/confirmed=回款确认/revoked=已撤消',
  `invoice_confirm` VARCHAR(32) DEFAULT '' COMMENT '财务确认开票：pending=待确认/invoiced=已开票',
  `finance_confirm_date` DATE DEFAULT NULL COMMENT '财务确认日期',
  `voucher_url` VARCHAR(500) DEFAULT '' COMMENT '回款凭证图片URL',
  `remark` TEXT,
  `flow_status` VARCHAR(32) DEFAULT '' COMMENT '流程状态',
  `flow_remark` VARCHAR(500) DEFAULT '' COMMENT '流程进展',
  `department_id` INT UNSIGNED DEFAULT NULL,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_finance_confirm` (`finance_confirm`),
  KEY `idx_huoban_id` (`huoban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回款单';

-- ============================================================
-- 9. 联系人表
-- ============================================================
CREATE TABLE `contacts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL COMMENT '所属客户',
  `contact_type` VARCHAR(32) DEFAULT '' COMMENT '联系人类型：decision_maker=决策人/user=使用人/influencer=影响人',
  `name` VARCHAR(50) DEFAULT '' COMMENT '联系人姓名',
  `phone` VARCHAR(50) DEFAULT '' COMMENT '联系电话',
  `is_kp` TINYINT(1) DEFAULT 0 COMMENT '是否为关键决策人(KP)',
  `gender` VARCHAR(10) DEFAULT '' COMMENT '性别：male=男/female=女',
  `title` VARCHAR(100) DEFAULT '' COMMENT '联系人职务',
  `department` VARCHAR(100) DEFAULT '' COMMENT '部门',
  `wechat` VARCHAR(100) DEFAULT '' COMMENT '微信号',
  `email` VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  `remark` TEXT,
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户联系人';

-- ============================================================
-- 10. 跟进记录表
-- ============================================================
CREATE TABLE `followups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED DEFAULT NULL COMMENT '所属客户（线索阶段可能为空）',
  `lead_id` INT UNSIGNED DEFAULT NULL COMMENT '所属线索',
  `opportunity_id` INT UNSIGNED DEFAULT NULL COMMENT '所属商机',
  `follow_type` VARCHAR(32) DEFAULT '' COMMENT '跟进类型：call=电话/visit=拜访/wechat=微信/email=邮件',
  `follow_date` DATETIME NOT NULL COMMENT '跟进日期',
  `content` TEXT NOT NULL COMMENT '跟进内容',
  `next_follow_at` DATETIME DEFAULT NULL COMMENT '下次跟进时间',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '跟进人',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='跟进记录';

-- ============================================================
-- 11. 审批流表（统一）
-- ============================================================
CREATE TABLE `approvals` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `entity_type` VARCHAR(32) NOT NULL COMMENT '业务类型：quotation/order/payment/invoice/delivery',
  `entity_id` INT UNSIGNED NOT NULL COMMENT '业务记录ID',
  `approval_status` VARCHAR(32) DEFAULT 'pending' COMMENT '审批状态：pending/approving/rejected/approved/revoked',
  `flow_status` VARCHAR(32) DEFAULT '' COMMENT '流程状态：running/approved/rejected/revoked/closed/error',
  `current_node` VARCHAR(100) DEFAULT '' COMMENT '当前审批节点',
  `initiator_id` INT UNSIGNED DEFAULT NULL COMMENT '流程发起人',
  `start_time` DATETIME DEFAULT NULL COMMENT '流程启动时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '流程结束时间',
  `remark` TEXT COMMENT '流程进展说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_initiator` (`initiator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批流';

-- ============================================================
-- 12. 开票申请表
-- ============================================================
CREATE TABLE `invoices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED DEFAULT NULL COMMENT '所属订单',
  `customer_id` INT UNSIGNED DEFAULT NULL COMMENT '所属客户',
  `invoice_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '开票金额',
  `invoice_type` VARCHAR(20) DEFAULT '' COMMENT '发票类型',
  `approval_status` VARCHAR(32) DEFAULT 'pending',
  `flow_status` VARCHAR(32) DEFAULT '',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开票申请';

-- ============================================================
-- 13. 发货申请表
-- ============================================================
CREATE TABLE `deliveries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED DEFAULT NULL COMMENT '所属订单',
  `delivery_date` DATE DEFAULT NULL COMMENT '发货日期',
  `logistics_company` VARCHAR(100) DEFAULT '' COMMENT '物流公司',
  `tracking_no` VARCHAR(100) DEFAULT '' COMMENT '运单号',
  `approval_status` VARCHAR(32) DEFAULT 'pending',
  `flow_status` VARCHAR(32) DEFAULT '',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发货申请';

-- ============================================================
-- 14. 售后表
-- ============================================================
CREATE TABLE `after_sales` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED DEFAULT NULL COMMENT '所属客户',
  `order_id` INT UNSIGNED DEFAULT NULL COMMENT '关联订单',
  `device_info` VARCHAR(200) DEFAULT '' COMMENT '设备信息',
  `service_type` VARCHAR(32) DEFAULT '' COMMENT '售后类型：repair=维修/maintenance=保养/replace=更换',
  `service_date` DATE DEFAULT NULL COMMENT '售后日期',
  `content` TEXT COMMENT '售后内容',
  `cost` DECIMAL(15,2) DEFAULT 0 COMMENT '费用',
  `owner_id` INT UNSIGNED DEFAULT NULL COMMENT '负责人',
  `huoban_id` VARCHAR(32) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后宝';

-- ============================================================
-- 15. 产品表（新产品管理，替代伙伴云空的「产品表」）
-- ============================================================
CREATE TABLE `products` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) DEFAULT '' COMMENT '产品编号',
  `name` VARCHAR(200) NOT NULL COMMENT '产品名称',
  `category` VARCHAR(100) DEFAULT '' COMMENT '产品分类',
  `spec_model` VARCHAR(200) DEFAULT '' COMMENT '规格型号',
  `unit` VARCHAR(20) DEFAULT '' COMMENT '计量单位',
  `standard_price` DECIMAL(15,2) DEFAULT 0 COMMENT '标准价',
  `cost_price` DECIMAL(15,2) DEFAULT 0 COMMENT '成本价',
  `business_line` VARCHAR(20) DEFAULT 'industrial' COMMENT '业务线：industrial=工业/retail=零售/oem=OEM',
  `product_line` VARCHAR(50) DEFAULT '' COMMENT '产品线：NPL/NPS/NPA/NMA/HPL',
  `is_active` TINYINT(1) DEFAULT 1,
  `image_url` VARCHAR(500) DEFAULT '' COMMENT '产品图片URL',
  `remark` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_name` (`name`),
  KEY `idx_product_line` (`product_line`),
  KEY `idx_business_line` (`business_line`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品表';

-- ============================================================
-- 16. 设备档案表（P0 入库）
-- ============================================================
CREATE TABLE `devices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL COMMENT '所属客户',
  `order_id` INT UNSIGNED DEFAULT NULL COMMENT '关联订单',
  `device_code` VARCHAR(100) DEFAULT '' COMMENT '设备编号/序列号',
  `product_name` VARCHAR(200) DEFAULT '' COMMENT '产品名称',
  `spec_model` VARCHAR(200) DEFAULT '' COMMENT '规格型号',
  `business_line` VARCHAR(20) DEFAULT 'industrial' COMMENT '业务线',
  `install_date` DATE DEFAULT NULL COMMENT '安装日期',
  `warranty_expiry` DATE DEFAULT NULL COMMENT '保修到期日',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active=运行中/maintenance=维护中/retired=已退役',
  `notes` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
  KEY `idx_customer` (`customer_id`),
  KEY `idx_device_code` (`device_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备档案';

-- ============================================================
-- 17. 产品配置规则表（CPQ 雏形）
-- ============================================================
CREATE TABLE `product_configs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_line` VARCHAR(50) NOT NULL COMMENT '产品线：NPL/NPS/NPA/NMA/HPL',
  `model` VARCHAR(100) NOT NULL COMMENT '型号',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置项：purity/flow_rate/pressure/material',
  `config_value` VARCHAR(100) NOT NULL COMMENT '可选值：99.9/99.999/99.9999',
  `price_modifier` DECIMAL(5,2) DEFAULT 1.00 COMMENT '价格调整系数',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_model_config` (`product_line`, `model`, `config_key`, `config_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品配置规则（CPQ）';

-- ============================================================
-- 索引汇总（已内联在每张表中，此处为补充）
-- ============================================================

-- 为高频查询字段补充索引
CREATE INDEX `idx_orders_date_status` ON `orders` (`order_date`, `order_status`);
CREATE INDEX `idx_payments_date` ON `payments` (`payment_date`);
CREATE INDEX `idx_quotations_date` ON `quotations` (`quotation_date`);
CREATE INDEX `idx_followups_date` ON `followups` (`follow_date`);

SET FOREIGN_KEY_CHECKS = 1;
