// ============================================================
// 字段配置存储层
// 初始化时加载默认配置，管理员修改后写入 localStorage
// 所有模块表单读取此配置渲染字段
// ============================================================

import { FieldMeta, ModuleName } from '../types/fieldConfig'

const STORAGE_KEY = 'holang_field_configs'

// ============================================================
// 默认字段配置（按模块）
// ============================================================

const DEFAULT_CUSTOMER_FIELDS: FieldMeta[] = [
  // --- 基本信息 ---
  { id: 'customer.name', module: 'customer', fieldName: 'name', label: '客户名称', labelEn: 'Company Name', fieldType: 'text', required: true, visible: true, order: 1, group: 'basic', placeholder: '请输入客户/公司名称' },
  { id: 'customer.salesType', module: 'customer', fieldName: 'salesType', label: '销售类型', labelEn: 'Sales Type', fieldType: 'select', required: true, visible: true, order: 2, group: 'basic', options: [{ label: '国内', value: 'domestic' }, { label: '海外', value: 'overseas' }] },
  { id: 'customer.businessLine', module: 'customer', fieldName: 'businessLine', label: '业务线', labelEn: 'Business Line', fieldType: 'select', required: false, visible: true, order: 3, group: 'basic', options: [{ label: '工业设备', value: 'industrial' }, { label: '门店版', value: 'retail' }, { label: '冷萃 OEM', value: 'oem' }] },
  { id: 'customer.industry', module: 'customer', fieldName: 'industry', label: '所属行业', labelEn: 'Industry', fieldType: 'text', required: false, visible: true, order: 4, group: 'basic' },
  { id: 'customer.scale', module: 'customer', fieldName: 'scale', label: '公司规模', labelEn: 'Company Size', fieldType: 'select', required: false, visible: true, order: 5, group: 'basic', options: [{ label: '1-10人', value: '1-10' }, { label: '11-50人', value: '11-50' }, { label: '51-100人', value: '51-100' }, { label: '101-500人', value: '101-500' }, { label: '500人以上', value: '500+' }] },
  { id: 'customer.level', module: 'customer', fieldName: 'level', label: '客户等级', labelEn: 'Customer Level', fieldType: 'select', required: false, visible: true, order: 6, defaultValue: 'B', group: 'basic', options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' }] },
  { id: 'customer.source', module: 'customer', fieldName: 'source', label: '来源渠道', labelEn: 'Source', fieldType: 'select', required: false, visible: true, order: 7, group: 'basic', options: [{ label: '展会', value: 'exhibition' }, { label: 'B2B 平台', value: 'b2b' }, { label: '官网', value: 'website' }, { label: '老客户介绍', value: 'referral' }, { label: '社交媒体', value: 'social' }, { label: '其他', value: 'other' }] },
  { id: 'customer.followStage', module: 'customer', fieldName: 'followStage', label: '商机阶段', labelEn: 'Follow Stage', fieldType: 'select', required: false, visible: true, order: 8, group: 'basic', options: [{ label: '线索', value: '线索' }, { label: '商机', value: '商机' }, { label: '报价', value: '报价' }, { label: '成交', value: '成交' }, { label: '丢单', value: '丢单' }] },
  { id: 'customer.owner', module: 'customer', fieldName: 'owner', label: '销售负责人', labelEn: 'Sales Owner', fieldType: 'text', required: false, visible: true, order: 7, group: 'basic' },

  // --- 联系信息 ---
  { id: 'customer.contactName', module: 'customer', fieldName: 'contactName', label: '联系人', labelEn: 'Contact Name', fieldType: 'text', required: true, visible: true, order: 10, group: 'contact', placeholder: '请输入联系人姓名' },
  { id: 'customer.contactPhone', module: 'customer', fieldName: 'contactPhone', label: '手机号', labelEn: 'Phone', fieldType: 'phone', required: true, visible: true, order: 11, group: 'contact', validation: { pattern: '^1[3-9]\\d{9}$', requiredMessage: '请输入手机号', patternMessage: '手机号格式不正确' } },
  { id: 'customer.contactEmail', module: 'customer', fieldName: 'contactEmail', label: '邮箱', labelEn: 'Email', fieldType: 'email', required: false, visible: true, order: 12, group: 'contact', validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternMessage: '邮箱格式不正确' } },
  { id: 'customer.contactWechat', module: 'customer', fieldName: 'contactWechat', label: '微信', labelEn: 'WeChat', fieldType: 'text', required: false, visible: true, order: 13, group: 'contact' },
  { id: 'customer.contactWhatsapp', module: 'customer', fieldName: 'contactWhatsapp', label: 'WhatsApp', labelEn: 'WhatsApp', fieldType: 'phone', required: false, visible: true, order: 14, group: 'contact' },
  { id: 'customer.contactDept', module: 'customer', fieldName: 'contactDept', label: '部门', labelEn: 'Department', fieldType: 'text', required: false, visible: true, order: 15, group: 'contact' },
  { id: 'customer.contactTitle', module: 'customer', fieldName: 'contactTitle', label: '职务', labelEn: 'Title', fieldType: 'text', required: false, visible: true, order: 16, group: 'contact' },
  { id: 'customer.companyPhone', module: 'customer', fieldName: 'companyPhone', label: '公司电话', labelEn: 'Company Phone', fieldType: 'phone', required: false, visible: true, order: 17, group: 'contact' },

  // --- 地址信息 ---
  { id: 'customer.country', module: 'customer', fieldName: 'country', label: '国家', labelEn: 'Country', fieldType: 'text', required: false, visible: true, order: 20, group: 'address' },
  { id: 'customer.province', module: 'customer', fieldName: 'province', label: '省份/州', labelEn: 'Province/State', fieldType: 'text', required: false, visible: true, order: 21, group: 'address' },
  { id: 'customer.city', module: 'customer', fieldName: 'city', label: '城市', labelEn: 'City', fieldType: 'text', required: false, visible: true, order: 22, group: 'address' },
  { id: 'customer.address', module: 'customer', fieldName: 'address', label: '公司地址', labelEn: 'Address', fieldType: 'textarea', required: false, visible: true, order: 23, group: 'address' },
  { id: 'customer.website', module: 'customer', fieldName: 'website', label: '公司网站', labelEn: 'Website', fieldType: 'url', required: false, visible: true, order: 24, group: 'address' },

  // --- 开票信息 ---
  { id: 'customer.taxTitle', module: 'customer', fieldName: 'taxTitle', label: '发票抬头（内销）', labelEn: 'Tax Title', fieldType: 'text', required: false, visible: true, order: 30, group: 'invoice' },
  { id: 'customer.taxNumber', module: 'customer', fieldName: 'taxNumber', label: '纳税人识别号', labelEn: 'Tax Number', fieldType: 'text', required: false, visible: true, order: 31, group: 'invoice' },
  { id: 'customer.invoiceType', module: 'customer', fieldName: 'invoiceType', label: '发票类型', labelEn: 'Invoice Type', fieldType: 'select', required: false, visible: true, order: 32, group: 'invoice', options: [{ label: '增值税专用发票', value: 'vat_special' }, { label: '增值税普通发票', value: 'vat_normal' }] },
  { id: 'customer.bankName', module: 'customer', fieldName: 'bankName', label: '开户银行', labelEn: 'Bank Name', fieldType: 'text', required: false, visible: true, order: 33, group: 'invoice' },
  { id: 'customer.bankAccount', module: 'customer', fieldName: 'bankAccount', label: '银行账号', labelEn: 'Bank Account', fieldType: 'text', required: false, visible: true, order: 34, group: 'invoice' },
  { id: 'customer.bankCode', module: 'customer', fieldName: 'bankCode', label: '银行行号', labelEn: 'Bank Code', fieldType: 'text', required: false, visible: true, order: 35, group: 'invoice' },

  // --- 扩展信息 ---
  { id: 'customer.creditCode', module: 'customer', fieldName: 'creditCode', label: '统一社会信用代码', labelEn: 'Credit Code (CN)', fieldType: 'text', required: false, visible: false, order: 40, group: 'extra', validation: { pattern: '^[0-9A-HJ-NPQRTUWXY]{2}\\d{6}[0-9A-HJ-NPQRTUWXY]{10}$' } },
  { id: 'customer.dunsNumber', module: 'customer', fieldName: 'dunsNumber', label: '邓白氏码', labelEn: 'D-U-N-S Number', fieldType: 'text', required: false, visible: false, order: 41, group: 'extra', validation: { pattern: '^\\d{9}$' } },
  { id: 'customer.assignedAt', module: 'customer', fieldName: 'assignedAt', label: '分配时间', labelEn: 'Assigned At', fieldType: 'date', required: false, visible: true, order: 42, group: 'extra' },
  { id: 'customer.lastFollowAt', module: 'customer', fieldName: 'lastFollowAt', label: '上次跟进日期', labelEn: 'Last Follow-up', fieldType: 'date', required: false, visible: true, order: 43, group: 'extra' },
  { id: 'customer.nextFollowAt', module: 'customer', fieldName: 'nextFollowAt', label: '下次跟进日期', labelEn: 'Next Follow-up', fieldType: 'date', required: false, visible: true, order: 44, group: 'extra' },
  { id: 'customer.overdueFollow', module: 'customer', fieldName: 'overdueFollow', label: '跟进超时', labelEn: 'Overdue Follow-up', fieldType: 'boolean', required: false, visible: true, order: 45, group: 'extra' },
  { id: 'customer.notes', module: 'customer', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 50, group: 'extra' },
]

const DEFAULT_PRODUCT_FIELDS: FieldMeta[] = [
  { id: 'product.name', module: 'product', fieldName: 'name', label: '产品名称', labelEn: 'Product Name', fieldType: 'text', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'product.model', module: 'product', fieldName: 'model', label: '型号', labelEn: 'Model', fieldType: 'text', required: true, visible: true, order: 2, group: 'basic' },
  { id: 'product.brand', module: 'product', fieldName: 'brand', label: '品牌', labelEn: 'Brand', fieldType: 'text', required: false, visible: true, order: 3, defaultValue: 'HOLANG', group: 'basic' },
  { id: 'product.category', module: 'product', fieldName: 'category', label: '产品线', labelEn: 'Product Line', fieldType: 'select', required: false, visible: true, order: 4, group: 'basic', options: [{ label: 'NPL', value: 'NPL' }, { label: 'NPS', value: 'NPS' }, { label: 'NPA', value: 'NPA' }, { label: '门店版', value: 'NMA' }] },
  { id: 'product.unit', module: 'product', fieldName: 'unit', label: '单位', labelEn: 'Unit', fieldType: 'select', required: false, visible: true, order: 5, defaultValue: '台', group: 'basic', options: [{ label: '台', value: '台' }, { label: '套', value: '套' }, { label: '个', value: '个' }] },
  { id: 'product.costPrice', module: 'product', fieldName: 'costPrice', label: '成本价', labelEn: 'Cost Price', fieldType: 'currency', required: true, visible: true, order: 10, group: 'detail' },
  { id: 'product.salePrice', module: 'product', fieldName: 'salePrice', label: '销售价', labelEn: 'Sale Price', fieldType: 'currency', required: true, visible: true, order: 11, group: 'detail' },
  { id: 'product.taxRate', module: 'product', fieldName: 'taxRate', label: '税率(%)', labelEn: 'Tax Rate(%)', fieldType: 'number', required: false, visible: true, order: 12, defaultValue: 13, group: 'detail', validation: { min: 0, max: 100 } },
  { id: 'product.description', module: 'product', fieldName: 'description', label: '描述', labelEn: 'Description', fieldType: 'textarea', required: false, visible: true, order: 20, group: 'extra' },
]

const DEFAULT_QUOTATION_FIELDS: FieldMeta[] = [
  { id: 'quotation.customerId', module: 'quotation', fieldName: 'customerId', label: '客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'quotation.businessLine', module: 'quotation', fieldName: 'businessLine', label: '业务线', labelEn: 'Business Line', fieldType: 'select', required: false, visible: true, order: 2, group: 'basic', options: [{ label: '工业设备', value: 'industrial' }, { label: '门店版', value: 'retail' }, { label: '冷萃 OEM', value: 'oem' }] },
  { id: 'quotation.currency', module: 'quotation', fieldName: 'currency', label: '币种', labelEn: 'Currency', fieldType: 'select', required: true, visible: true, order: 3, defaultValue: 'CNY', group: 'basic', options: [{ label: 'CNY (¥)', value: 'CNY' }, { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' }] },
  { id: 'quotation.validDays', module: 'quotation', fieldName: 'validDays', label: '有效期(天)', labelEn: 'Valid Days', fieldType: 'number', required: false, visible: true, order: 5, defaultValue: 30, group: 'basic', validation: { min: 1, max: 365 } },
  { id: 'quotation.notes', module: 'quotation', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 50, group: 'extra' },
]

const DEFAULT_ORDER_FIELDS: FieldMeta[] = [
  // --- 基本信息 ---
  { id: 'order.customerId', module: 'order', fieldName: 'customerId', label: '客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'order.businessLine', module: 'order', fieldName: 'businessLine', label: '业务线', labelEn: 'Business Line', fieldType: 'select', required: false, visible: true, order: 2, group: 'basic', options: [{ label: '工业设备', value: 'industrial' }, { label: '门店版', value: 'retail' }, { label: '冷萃 OEM', value: 'oem' }] },
  { id: 'order.quotationCode', module: 'order', fieldName: 'quotationCode', label: '关联报价', labelEn: 'Related Quotation', fieldType: 'text', required: false, visible: true, order: 3, group: 'basic' },
  { id: 'order.currency', module: 'order', fieldName: 'currency', label: '币种', labelEn: 'Currency', fieldType: 'select', required: true, visible: true, order: 4, defaultValue: 'CNY', group: 'basic', options: [{ label: 'CNY (¥)', value: 'CNY' }, { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' }] },
  { id: 'order.approvalStatus', module: 'order', fieldName: 'approvalStatus', label: '审批状态', labelEn: 'Approval Status', fieldType: 'select', required: false, visible: true, order: 5, group: 'basic', options: [{ label: '待审批', value: 'pending' }, { label: '审批中', value: 'approving' }, { label: '已驳回', value: 'rejected' }, { label: '已通过', value: 'approved' }, { label: '已撤销', value: 'revoked' }] },
  { id: 'order.flowStatus', module: 'order', fieldName: 'flowStatus', label: '流程状态', labelEn: 'Flow Status', fieldType: 'select', required: false, visible: false, order: 6, group: 'basic', options: [{ label: '执行中', value: 'running' }, { label: '已完成（同意）', value: 'approved' }, { label: '已完成（不同意）', value: 'rejected' }, { label: '已撤销', value: 'revoked' }, { label: '已关闭', value: 'closed' }, { label: '异常中', value: 'error' }] },

  // --- 订单详情 ---
  { id: 'order.amount', module: 'order', fieldName: 'amount', label: '订单金额', labelEn: 'Amount', fieldType: 'currency', required: true, visible: true, order: 10, group: 'detail' },
  { id: 'order.status', module: 'order', fieldName: 'status', label: '订单状态', labelEn: 'Order Status', fieldType: 'select', required: true, visible: true, order: 11, group: 'detail', options: [{ label: '待确认', value: 'pending' }, { label: '已确认', value: 'confirmed' }, { label: '生产中', value: 'in_production' }, { label: '已发货', value: 'shipped' }, { label: '已交付', value: 'delivered' }, { label: '已取消', value: 'cancelled' }] },
  { id: 'order.deliveryDate', module: 'order', fieldName: 'deliveryDate', label: '交期', labelEn: 'Delivery Date', fieldType: 'date', required: false, visible: true, order: 12, group: 'detail' },
  { id: 'order.expectedDeliveryDate', module: 'order', fieldName: 'expectedDeliveryDate', label: '期望发货日期', labelEn: 'Expected Delivery', fieldType: 'date', required: false, visible: true, order: 13, group: 'detail' },
  { id: 'order.paymentTerms', module: 'order', fieldName: 'paymentTerms', label: '付款条款', labelEn: 'Payment Terms', fieldType: 'textarea', required: false, visible: true, order: 14, group: 'detail' },
  { id: 'order.contractEntity', module: 'order', fieldName: 'contractEntity', label: '签约主体', labelEn: 'Contract Entity', fieldType: 'text', required: false, visible: true, order: 15, group: 'detail' },
  { id: 'order.salesType', module: 'order', fieldName: 'salesType', label: '销售类型', labelEn: 'Sales Type', fieldType: 'select', required: false, visible: true, order: 16, group: 'detail', options: [{ label: '直销', value: 'direct' }, { label: '渠道', value: 'channel' }, { label: '代理', value: 'agent' }] },
  { id: 'order.endUser', module: 'order', fieldName: 'endUser', label: '终端用户', labelEn: 'End User', fieldType: 'text', required: false, visible: true, order: 17, group: 'detail' },
  { id: 'order.productType', module: 'order', fieldName: 'productType', label: '产品类型', labelEn: 'Product Type', fieldType: 'select', required: false, visible: true, order: 18, group: 'detail', options: [{ label: '标准品', value: 'standard' }, { label: '定制', value: 'custom' }] },
  { id: 'order.paymentMethod', module: 'order', fieldName: 'paymentMethod', label: '付款方式', labelEn: 'Payment Method', fieldType: 'select', required: false, visible: true, order: 19, group: 'detail', options: [{ label: '银行转账', value: 'bank_transfer' }, { label: '承兑', value: 'acceptance' }, { label: '现金', value: 'cash' }] },
  { id: 'order.taxRate', module: 'order', fieldName: 'taxRate', label: '增值税税率(%)', labelEn: 'Tax Rate(%)', fieldType: 'number', required: false, visible: true, order: 20, defaultValue: 13, group: 'detail', validation: { min: 0, max: 100 } },
  { id: 'order.discount', module: 'order', fieldName: 'discount', label: '优惠金额', labelEn: 'Discount', fieldType: 'currency', required: false, visible: true, order: 21, group: 'detail' },

  // --- 收货信息 ---
  { id: 'order.receiver', module: 'order', fieldName: 'receiver', label: '收货人', labelEn: 'Receiver', fieldType: 'text', required: false, visible: true, order: 30, group: 'delivery' },
  { id: 'order.receiverPhone', module: 'order', fieldName: 'receiverPhone', label: '收货人电话', labelEn: 'Receiver Phone', fieldType: 'phone', required: false, visible: true, order: 31, group: 'delivery' },
  { id: 'order.receiverAddress', module: 'order', fieldName: 'receiverAddress', label: '收货地址', labelEn: 'Receiver Address', fieldType: 'textarea', required: false, visible: true, order: 32, group: 'delivery' },

  // --- 财务信息 ---
  { id: 'order.collectedAmount', module: 'order', fieldName: 'collectedAmount', label: '已回款金额', labelEn: 'Collected Amount', fieldType: 'currency', required: false, visible: true, order: 40, group: 'finance', readOnly: true },
  { id: 'order.invoicedAmount', module: 'order', fieldName: 'invoicedAmount', label: '已开票金额', labelEn: 'Invoiced Amount', fieldType: 'currency', required: false, visible: true, order: 41, group: 'finance', readOnly: true },

  // --- 附件 ---
  { id: 'order.contractFile', module: 'order', fieldName: 'contractFile', label: '合同附件', labelEn: 'Contract File', fieldType: 'text', required: false, visible: true, order: 50, group: 'extra' },
  { id: 'order.techAgreement', module: 'order', fieldName: 'techAgreement', label: '技术协议', labelEn: 'Tech Agreement', fieldType: 'text', required: false, visible: true, order: 51, group: 'extra' },
  { id: 'order.specialReq', module: 'order', fieldName: 'specialReq', label: '特殊要求', labelEn: 'Special Requirements', fieldType: 'textarea', required: false, visible: true, order: 52, group: 'extra' },
  { id: 'order.notes', module: 'order', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 60, group: 'extra' },
]

const DEFAULT_LEAD_FIELDS: FieldMeta[] = [
  { id: 'lead.companyName', module: 'lead', fieldName: 'companyName', label: '公司名称', labelEn: 'Company Name', fieldType: 'text', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'lead.contactName', module: 'lead', fieldName: 'contactName', label: '联系人', labelEn: 'Contact Name', fieldType: 'text', required: false, visible: true, order: 2, group: 'basic' },
  { id: 'lead.contactPhone', module: 'lead', fieldName: 'contactPhone', label: '电话', labelEn: 'Phone', fieldType: 'phone', required: false, visible: true, order: 3, group: 'basic' },
  { id: 'lead.source', module: 'lead', fieldName: 'source', label: '线索来源', labelEn: 'Source', fieldType: 'select', required: false, visible: true, order: 4, group: 'basic', options: [{ label: '展会', value: 'exhibition' }, { label: 'B2B 平台', value: 'b2b' }, { label: '官网', value: 'website' }, { label: '社交媒体', value: 'social' }, { label: '其他', value: 'other' }] },
]

const DEFAULT_AGENT_FIELDS: FieldMeta[] = [
  { id: 'agent.companyName', module: 'agent', fieldName: 'companyName', label: '公司名称', labelEn: 'Company Name', fieldType: 'text', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'agent.contactName', module: 'agent', fieldName: 'contactName', label: '联系人', labelEn: 'Contact Name', fieldType: 'text', required: false, visible: true, order: 2, group: 'basic' },
  { id: 'agent.contactPhone', module: 'agent', fieldName: 'contactPhone', label: '电话', labelEn: 'Phone', fieldType: 'phone', required: false, visible: true, order: 3, group: 'basic' },
  { id: 'agent.contactEmail', module: 'agent', fieldName: 'contactEmail', label: '邮箱', labelEn: 'Email', fieldType: 'email', required: false, visible: true, order: 4, group: 'basic' },
  { id: 'agent.region', module: 'agent', fieldName: 'region', label: '代理区域', labelEn: 'Region', fieldType: 'text', required: false, visible: true, order: 5, group: 'basic' },
]

const DEFAULT_INVOICE_FIELDS: FieldMeta[] = [
  // --- 关联信息 ---
  { id: 'invoice.orderId', module: 'invoice', fieldName: 'orderId', label: '关联订单', labelEn: 'Order', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'invoice.customerId', module: 'invoice', fieldName: 'customerId', label: '客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 2, group: 'basic' },
  { id: 'invoice.salesPerson', module: 'invoice', fieldName: 'salesPerson', label: '销售负责人', labelEn: 'Sales Person', fieldType: 'text', required: false, visible: true, order: 3, group: 'basic' },

  // --- 开票金额 ---
  { id: 'invoice.amount', module: 'invoice', fieldName: 'amount', label: '本次开票金额', labelEn: 'Invoice Amount', fieldType: 'currency', required: true, visible: true, order: 10, group: 'amount' },
  { id: 'invoice.ratio', module: 'invoice', fieldName: 'ratio', label: '本次开票比例(%)', labelEn: 'Invoice Ratio(%)', fieldType: 'number', required: false, visible: true, order: 11, group: 'amount', validation: { min: 0, max: 100 } },
  { id: 'invoice.orderStatus', module: 'invoice', fieldName: 'orderStatus', label: '订单状态', labelEn: 'Order Status', fieldType: 'select', required: true, visible: true, order: 12, group: 'amount', options: [{ label: '已完成', value: 'completed' }, { label: '未完成', value: 'pending' }, { label: '已交货', value: 'delivered' }] },

  // --- 发票信息 ---
  { id: 'invoice.type', module: 'invoice', fieldName: 'type', label: '发票类型', labelEn: 'Invoice Type', fieldType: 'select', required: true, visible: true, order: 20, group: 'invoice', options: [{ label: '无须发票', value: 'none' }, { label: '13%增值税专用发票', value: 'vat_13_special' }, { label: '6%增值税专用发票', value: 'vat_6_special' }, { label: '6%普票', value: 'vat_6_normal' }, { label: '13%普票', value: 'vat_13_normal' }, { label: '普通发票', value: 'normal' }] },
  { id: 'invoice.contractEntity', module: 'invoice', fieldName: 'contractEntity', label: '开票主体', labelEn: 'Contract Entity', fieldType: 'select', required: true, visible: true, order: 21, group: 'invoice' },
  { id: 'invoice.title', module: 'invoice', fieldName: 'title', label: '发票抬头', labelEn: 'Invoice Title', fieldType: 'text', required: true, visible: true, order: 22, group: 'invoice' },
  { id: 'invoice.taxNumber', module: 'invoice', fieldName: 'taxNumber', label: '统一信用代码', labelEn: 'Tax Number', fieldType: 'text', required: true, visible: true, order: 23, group: 'invoice' },
  { id: 'invoice.companyAddress', module: 'invoice', fieldName: 'companyAddress', label: '公司地址', labelEn: 'Company Address', fieldType: 'text', required: false, visible: true, order: 24, group: 'invoice' },
  { id: 'invoice.companyPhone', module: 'invoice', fieldName: 'companyPhone', label: '电话', labelEn: 'Phone', fieldType: 'phone', required: false, visible: true, order: 25, group: 'invoice' },
  { id: 'invoice.bankName', module: 'invoice', fieldName: 'bankName', label: '开户银行', labelEn: 'Bank Name', fieldType: 'text', required: false, visible: true, order: 26, group: 'invoice' },
  { id: 'invoice.bankAccount', module: 'invoice', fieldName: 'bankAccount', label: '银行账号', labelEn: 'Bank Account', fieldType: 'text', required: false, visible: true, order: 27, group: 'invoice' },

  // --- 收件信息 ---
  { id: 'invoice.recipient', module: 'invoice', fieldName: 'recipient', label: '收件人', labelEn: 'Recipient', fieldType: 'text', required: false, visible: true, order: 30, group: 'recipient' },
  { id: 'invoice.recipientPhone', module: 'invoice', fieldName: 'recipientPhone', label: '联系电话', labelEn: 'Phone', fieldType: 'phone', required: false, visible: true, order: 31, group: 'recipient' },
  { id: 'invoice.recipientAddress', module: 'invoice', fieldName: 'recipientAddress', label: '收件地址', labelEn: 'Address', fieldType: 'textarea', required: false, visible: true, order: 32, group: 'recipient' },

  // --- 发票结果 ---
  { id: 'invoice.invoiceNumber', module: 'invoice', fieldName: 'invoiceNumber', label: '发票号', labelEn: 'Invoice Number', fieldType: 'text', required: false, visible: true, order: 40, group: 'result' },
  { id: 'invoice.invoiceFile', module: 'invoice', fieldName: 'invoiceFile', label: '发票附件', labelEn: 'Invoice File', fieldType: 'text', required: false, visible: true, order: 41, group: 'result' },
  { id: 'invoice.invoiceScan', module: 'invoice', fieldName: 'invoiceScan', label: '发票扫描件', labelEn: 'Invoice Scan', fieldType: 'text', required: false, visible: true, order: 42, group: 'result' },

  // --- 审批流 ---
  { id: 'invoice.approvalStatus', module: 'invoice', fieldName: 'approvalStatus', label: '审批状态', labelEn: 'Approval Status', fieldType: 'select', required: false, visible: true, order: 50, group: 'approval', options: [{ label: '审批中', value: 'pending' }, { label: '已开具', value: 'issued' }, { label: '驳回', value: 'rejected' }, { label: '撤消', value: 'cancelled' }] },

  // --- 扩展信息 ---
  { id: 'invoice.notes', module: 'invoice', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 60, group: 'extra' },
]

const DEFAULT_DELIVERY_FIELDS: FieldMeta[] = [
  // --- 关联信息 ---
  { id: 'delivery.orderId', module: 'delivery', fieldName: 'orderId', label: '关联订单', labelEn: 'Order', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'delivery.customerId', module: 'delivery', fieldName: 'customerId', label: '客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 2, group: 'basic' },
  { id: 'delivery.customerName', module: 'delivery', fieldName: 'customerName', label: '客户名称', labelEn: 'Customer Name', fieldType: 'text', required: true, visible: true, order: 3, group: 'basic' },
  { id: 'delivery.salesType', module: 'delivery', fieldName: 'salesType', label: '销售类型', labelEn: 'Sales Type', fieldType: 'select', required: true, visible: true, order: 4, group: 'basic', options: [{ label: '直销', value: 'direct' }, { label: '间销', value: 'indirect' }] },
  { id: 'delivery.businessLine', module: 'delivery', fieldName: 'businessLine', label: '销售类别', labelEn: 'Business Line', fieldType: 'select', required: true, visible: true, order: 5, group: 'basic', options: [{ label: '内销', value: 'domestic' }, { label: '外贸', value: 'export' }] },

  // --- 产品信息 ---
  { id: 'delivery.productType', module: 'delivery', fieldName: 'productType', label: '产品类型', labelEn: 'Product Type', fieldType: 'select', required: false, visible: true, order: 10, group: 'product', options: [{ label: '成品', value: 'finished' }, { label: '备件', value: 'spare' }] },
  { id: 'delivery.paidAsContract', module: 'delivery', fieldName: 'paidAsContract', label: '按合同付款', labelEn: 'Paid As Contract', fieldType: 'select', required: true, visible: true, order: 11, group: 'product', options: [{ label: '是', value: 'yes' }, { label: '否', value: 'no' }] },
  { id: 'delivery.expectedPaymentDate', module: 'delivery', fieldName: 'expectedPaymentDate', label: '预计回款时间', labelEn: 'Expected Payment', fieldType: 'date', required: true, visible: true, order: 12, group: 'product' },
  { id: 'delivery.overdueReason', module: 'delivery', fieldName: 'overdueReason', label: '逾期回款原因', labelEn: 'Overdue Reason', fieldType: 'text', required: false, visible: true, order: 13, group: 'product' },

  // --- 收货信息 ---
  { id: 'delivery.deliveryDate', module: 'delivery', fieldName: 'deliveryDate', label: '发货时间', labelEn: 'Delivery Date', fieldType: 'date', required: true, visible: true, order: 20, group: 'receive' },
  { id: 'delivery.contactPerson', module: 'delivery', fieldName: 'contactPerson', label: '收货人', labelEn: 'Contact Person', fieldType: 'text', required: true, visible: true, order: 21, group: 'receive' },
  { id: 'delivery.contactPhone', module: 'delivery', fieldName: 'contactPhone', label: '联系方式', labelEn: 'Phone', fieldType: 'phone', required: true, visible: true, order: 22, group: 'receive' },
  { id: 'delivery.shippingAddress', module: 'delivery', fieldName: 'shippingAddress', label: '收货地址', labelEn: 'Shipping Address', fieldType: 'textarea', required: true, visible: true, order: 23, group: 'receive' },
  { id: 'delivery.shippingMethod', module: 'delivery', fieldName: 'shippingMethod', label: '运输方式', labelEn: 'Shipping Method', fieldType: 'select', required: false, visible: true, order: 24, group: 'receive', options: [{ label: '公路', value: 'road' }, { label: '海运', value: 'sea' }, { label: '空运', value: 'air' }, { label: '铁路', value: 'rail' }] },
  { id: 'delivery.specialReq', module: 'delivery', fieldName: 'specialReq', label: '其他特殊要求', labelEn: 'Special Req', fieldType: 'text', required: false, visible: true, order: 25, group: 'receive' },

  // --- 审批流 ---
  { id: 'delivery.approvalStatus', module: 'delivery', fieldName: 'approvalStatus', label: '审批状态', labelEn: 'Approval Status', fieldType: 'select', required: false, visible: true, order: 30, group: 'approval', options: [{ label: '审批中', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已撤消', value: 'cancelled' }, { label: '驳回', value: 'rejected' }] },
  { id: 'delivery.flowStatus', module: 'delivery', fieldName: 'flowStatus', label: '流程状态', labelEn: 'Flow Status', fieldType: 'select', required: false, visible: false, order: 31, group: 'approval', options: [{ label: '执行中', value: 'running' }, { label: '已完成（同意）', value: 'approved' }, { label: '已完成（不同意）', value: 'rejected' }, { label: '已撤销', value: 'cancelled' }, { label: '已关闭', value: 'closed' }, { label: '异常中', value: 'error' }] },

  // --- 扩展信息 ---
  { id: 'delivery.notes', module: 'delivery', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 50, group: 'extra' },
]

const DEFAULT_AFTERSALES_FIELDS: FieldMeta[] = [
  { id: 'aftersales.orderId', module: 'aftersales', fieldName: 'orderId', label: '关联订单', labelEn: 'Order', fieldType: 'text', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'aftersales.type', module: 'aftersales', fieldName: 'type', label: '售后类型', labelEn: 'Type', fieldType: 'select', required: false, visible: true, order: 2, group: 'basic', options: [{ label: '维修', value: 'repair' }, { label: '退换货', value: 'return' }, { label: '投诉', value: 'complaint' }, { label: '咨询', value: 'inquiry' }] },
  { id: 'aftersales.description', module: 'aftersales', fieldName: 'description', label: '问题描述', labelEn: 'Description', fieldType: 'textarea', required: false, visible: true, order: 3, group: 'basic' },
]

const DEFAULT_DEVICE_FIELDS: FieldMeta[] = [
  { id: 'device.customerId', module: 'device', fieldName: 'customerId', label: '所属客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'device.serialNumber', module: 'device', fieldName: 'serialNumber', label: '设备序列号', labelEn: 'Serial Number', fieldType: 'text', required: true, visible: true, order: 2, group: 'basic' },
  { id: 'device.model', module: 'device', fieldName: 'model', label: '产品型号', labelEn: 'Model', fieldType: 'text', required: true, visible: true, order: 3, group: 'basic' },
  { id: 'device.businessLine', module: 'device', fieldName: 'businessLine', label: '业务线', labelEn: 'Business Line', fieldType: 'select', required: false, visible: true, order: 4, group: 'basic', options: [{ label: '工业设备', value: 'industrial' }, { label: '门店版', value: 'retail' }, { label: '冷萃 OEM', value: 'oem' }] },
  { id: 'device.installDate', module: 'device', fieldName: 'installDate', label: '安装日期', labelEn: 'Install Date', fieldType: 'date', required: false, visible: true, order: 5, group: 'basic' },
  { id: 'device.warrantyExpiry', module: 'device', fieldName: 'warrantyExpiry', label: '质保到期日', labelEn: 'Warranty Expiry', fieldType: 'date', required: false, visible: true, order: 6, group: 'basic' },
  { id: 'device.status', module: 'device', fieldName: 'status', label: '设备状态', labelEn: 'Status', fieldType: 'select', required: false, visible: true, order: 7, defaultValue: 'active', group: 'basic', options: [{ label: '运行中', value: 'active' }, { label: '维修中', value: 'maintenance' }, { label: '已停用', value: 'retired' }] },
  { id: 'device.notes', module: 'device', fieldName: 'notes', label: '备注', labelEn: 'Notes', fieldType: 'textarea', required: false, visible: true, order: 50, group: 'extra' },
]

const DEFAULT_PAYMENT_FIELDS: FieldMeta[] = [
  // --- 关联信息 ---
  { id: 'payment.orderId', module: 'payment', fieldName: 'orderId', label: '关联订单', labelEn: 'Order', fieldType: 'select', required: true, visible: true, order: 1, group: 'basic' },
  { id: 'payment.customerId', module: 'payment', fieldName: 'customerId', label: '关联客户', labelEn: 'Customer', fieldType: 'select', required: true, visible: true, order: 2, group: 'basic' },

  // --- 回款信息 ---
  { id: 'payment.amount', module: 'payment', fieldName: 'amount', label: '回款金额', labelEn: 'Amount', fieldType: 'currency', required: true, visible: true, order: 10, group: 'detail' },
  { id: 'payment.type', module: 'payment', fieldName: 'type', label: '回款类型', labelEn: 'Payment Type', fieldType: 'select', required: true, visible: true, order: 11, group: 'detail', options: [{ label: '定金', value: 'deposit' }, { label: '进度款', value: 'progress' }, { label: '尾款', value: 'final' }, { label: '质保金', value: 'retention' }] },
  { id: 'payment.status', module: 'payment', fieldName: 'status', label: '回款状态', labelEn: 'Payment Status', fieldType: 'select', required: true, visible: true, order: 12, group: 'detail', options: [{ label: '待回款', value: 'pending' }, { label: '已到账', value: 'received' }] },
  { id: 'payment.plannedDate', module: 'payment', fieldName: 'plannedDate', label: '计划回款日期', labelEn: 'Planned Date', fieldType: 'date', required: true, visible: true, order: 13, group: 'detail' },
  { id: 'payment.receivedDate', module: 'payment', fieldName: 'receivedDate', label: '实际到账日期', labelEn: 'Received Date', fieldType: 'date', required: false, visible: true, order: 14, group: 'detail' },
  { id: 'payment.paymentMethod', module: 'payment', fieldName: 'paymentMethod', label: '回款方式', labelEn: 'Payment Method', fieldType: 'select', required: false, visible: true, order: 15, group: 'detail', options: [{ label: '银行转账', value: 'bank_transfer' }, { label: '承兑', value: 'acceptance' }, { label: '现金', value: 'cash' }] },
  { id: 'payment.paymentRatio', module: 'payment', fieldName: 'paymentRatio', label: '回款比例(%)', labelEn: 'Payment Ratio(%)', fieldType: 'number', required: false, visible: true, order: 16, group: 'detail', validation: { min: 0, max: 100 } },
  { id: 'payment.applyDate', module: 'payment', fieldName: 'applyDate', label: '申请时间', labelEn: 'Apply Date', fieldType: 'date', required: false, visible: true, order: 17, group: 'detail' },

  // --- 财务确认 ---
  { id: 'payment.confirmedFinance', module: 'payment', fieldName: 'confirmedFinance', label: '财务确认', labelEn: 'Finance Confirmed', fieldType: 'select', required: false, visible: true, order: 30, group: 'finance', options: [{ label: '待确认', value: 'pending' }, { label: '已确认', value: 'confirmed' }] },
  { id: 'payment.confirmedFinanceDate', module: 'payment', fieldName: 'confirmedFinanceDate', label: '财务确认日期', labelEn: 'Confirmed Date', fieldType: 'date', required: false, visible: true, order: 31, group: 'finance' },
  { id: 'payment.paymentVoucher', module: 'payment', fieldName: 'paymentVoucher', label: '回款凭证', labelEn: 'Payment Voucher', fieldType: 'text', required: false, visible: true, order: 32, group: 'finance' },
  { id: 'payment.customerAccount', module: 'payment', fieldName: 'customerAccount', label: '客户付款账户', labelEn: 'Customer Account', fieldType: 'text', required: false, visible: true, order: 33, group: 'finance' },

  // --- 扩展信息 ---
  { id: 'payment.remark', module: 'payment', fieldName: 'remark', label: '备注', labelEn: 'Remark', fieldType: 'textarea', required: false, visible: true, order: 50, group: 'extra' },
]

export const DEFAULT_FIELD_CONFIGS: Record<string, FieldMeta[]> = {
  customer: DEFAULT_CUSTOMER_FIELDS,
  product: DEFAULT_PRODUCT_FIELDS,
  quotation: DEFAULT_QUOTATION_FIELDS,
  order: DEFAULT_ORDER_FIELDS,
  payment: DEFAULT_PAYMENT_FIELDS,
  lead: DEFAULT_LEAD_FIELDS,
  agent: DEFAULT_AGENT_FIELDS,
  invoice: DEFAULT_INVOICE_FIELDS,
  delivery: DEFAULT_DELIVERY_FIELDS,
  aftersales: DEFAULT_AFTERSALES_FIELDS,
  device: DEFAULT_DEVICE_FIELDS,
}

// ============================================================
// 存储操作
// ============================================================

function loadConfigs(): Record<string, FieldMeta[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FIELD_CONFIGS }
    return JSON.parse(raw)
  } catch {
    return { ...DEFAULT_FIELD_CONFIGS }
  }
}

function saveConfigs(configs: Record<string, FieldMeta[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

// ============================================================
// 公开 API
// ============================================================

export function getFieldConfig(module: ModuleName): FieldMeta[] {
  const configs = loadConfigs()
  return configs[module] || DEFAULT_FIELD_CONFIGS[module] || []
}

export function getVisibleFields(module: ModuleName): FieldMeta[] {
  return getFieldConfig(module)
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order)
}

export function getRequiredFieldNames(module: ModuleName): string[] {
  return getFieldConfig(module)
    .filter((f) => f.required && f.visible)
    .map((f) => f.fieldName)
}

export function getAllConfigs(): Record<string, FieldMeta[]> {
  return loadConfigs()
}

export function updateField(
  module: ModuleName,
  fieldId: string,
  patch: Partial<FieldMeta>
) {
  const configs = loadConfigs()
  const fields = configs[module]
  if (!fields) return
  const idx = fields.findIndex((f) => f.id === fieldId)
  if (idx === -1) return
  configs[module] = [
    ...fields.slice(0, idx),
    { ...fields[idx], ...patch },
    ...fields.slice(idx + 1),
  ]
  saveConfigs(configs)
}

export function resetToDefault(module: ModuleName) {
  const configs = loadConfigs()
  configs[module] = [...DEFAULT_FIELD_CONFIGS[module]]
  saveConfigs(configs)
}
