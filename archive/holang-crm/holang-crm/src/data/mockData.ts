export interface Product {
  id: string; name: string; nameEn: string; code: string; brand: string; model: string
  category: string; unit: string; costPrice: number; salePrice: number
  taxRate: number; status: 'active' | 'inactive'; description: string; descriptionEn: string
  createdAt: string
  // 伙伴云补充
  length: number; width: number; image: string; sellStatus: 'selling' | 'discontinued'
  standardPrice: number // 标准价
}

export interface Customer {
  id: string; name: string; code: string; industry: string; scale: string
  level: 'A' | 'B' | 'C' | 'D' | 'E'; address: string; website: string
  contactName: string; contactPhone: string; contactEmail: string
  contactWechat: string; contactWhatsapp: string; contactDept: string; contactTitle: string
  taxTitle: string; taxNumber: string; bankName: string; bankAccount: string
  salesPerson: string; salesDept: string; source: string; followStage: string; createdAt: string
  // P0 新增
  businessLine: 'industrial' | 'retail' | 'oem' | ''
  salesType: 'internal' | 'external' | ''
  creditCode: string  // 统一社会信用代码（内销）
  dunsNumber: string // 邓白氏码（外销）
  // 伙伴云补充
  companyPhone: string // 公司电话
  remark: string // 备注
  invoiceType: string // 发票类型: 增值税专用/普通
  bankCode: string // 银行行号
  assignedAt: string // 分配时间
  lastFollowAt: string // 上次跟进日期
  nextFollowAt: string // 下次跟进日期
  overdueFollow: boolean // 跟进超时
  transactedAt: string // 成交日期
  contractFile: string // 合同附件
}

export interface Contact {
  id: string; customerId: string; name: string; title: string; dept: string
  phone: string; email: string; wechat: string; whatsapp: string
  isPrimary: boolean; gender: 'male' | 'female'; remark: string
  // 伙伴云补充
  contactType: string // 联系人类型: 主要联系人/财务/技术/物流
  isKP: boolean // 是否为关键决策人(KP)
}

export interface Opportunity {
  id: string; customerId: string; name: string; stage: string
  amount: number; expectedCloseDate: string; salesPerson: string
  probability: number; products: string[]; createdAt: string
  // 伙伴云补充
  code: string // 商机编号
  acquiredAt: string // 获取日期
  milestone: string // 里程碑
  loseReason: string // 输单原因
  collaborators: string[] // 协作人
  taxRate: number // 增值税税率
  discount: number // 优惠金额
  costTotal: number // 成本总额
  margin: number // 毛利率(%)
}

export interface Quotation {
  id: string; customerId: string; opportunityId: string; code: string
  amount: number; status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  salesPerson: string; createdAt: string; validUntil: string
  // P0 新增
  businessLine: 'industrial' | 'retail' | 'oem' | ''
  // 伙伴云补充
  approvalStatus: string // 审批状态
  flowStatus: string // 流程状态
  taxRate: number // 增值税税率
  discount: number // 优惠金额
  discountReason: string // 优惠原因
  convertedToOrder: boolean // 是否转订单
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productNameEn: string
  spec: string       // 规格型号
  quantity: number
  unit: string
  unitPrice: number // 单价（不含税）
  taxRate: number
  subtotal: number  // 小计（含税）
}

export interface Order {
  id: string; customerId: string; quotationId: string; code: string
  amount: number; status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
  salesPerson: string; createdAt: string; deliveryDate: string
  // P0 新增
  businessLine: 'industrial' | 'retail' | 'oem' | ''
  // 伙伴云补充
  approvalStatus: string // 审批状态: pending/approving/rejected/approved/revoked
  flowStatus: string // 流程状态
  expectedDeliveryDate: string // 期望发货日期
  contractEntity: string // 签约主体
  salesType: string // 销售类型: 直销/渠道/代理
  endUser: string // 终端用户
  productType: string // 产品类型: 标准品/定制
  paymentMethod: string // 付款方式
  receiver: string; receiverPhone: string; receiverAddress: string // 收货信息
  contractFile: string // 合同附件
  techAgreement: string // 技术协议
  specialReq: string // 特殊要求
  collectedAmount: number // 已回款金额
  invoicedAmount: number // 已开票金额
  taxRate: number; discount: number // 税率/优惠
  items: OrderItem[] // 产品明细
}

export interface ProductConfig {
  id: string
  productLine: string        // 产品线：NPL/NPS/NPA/NMA/HPL
  model: string             // 型号
  configKey: string         // 配置项：purity/flow_rate/pressure/material
  configValue: string      // 可选值：99.9/99.999/99.9999
  priceModifier: number    // 价格调整系数（乘以基数）
  isActive: boolean
}

export interface Payment {
  id: string; customerId: string; orderId: string; code: string; amount: number
  type: 'deposit' | 'progress' | 'final' | 'retention'
  status: 'pending' | 'received'; plannedDate: string; receivedDate: string
  // 伙伴云补充
  paymentMethod: string // 回款方式: 银行转账/承兑/现金
  confirmedFinance: string // 财务确认: pending/confirmed
  confirmedFinanceDate: string // 财务确认日期
  paymentVoucher: string // 回款凭证
  paymentRatio: number // 回款比例(%)
  customerAccount: string // 客户付款账户
  applyDate: string // 申请时间
  remark: string // 备注
}

// ============================================================
// 销售线索（对齐伙伴云销售线索表 2100000074090389）
// ============================================================
export interface Lead {
  id: string
  code: string               // 线索编号
  status: '未联系' | '跟进中' | '转客户' | '无效'  // 线索状态
  customerName: string        // 客户名称（必填）
  contactName: string        // 联系人姓名（必填）
  phone: string              // 手机号
  email: string              // 邮箱
  wechat: string             // 微信号
  company: string            // 公司名称
  industry: string           // 所属行业
  scale: string              // 公司规模
  source: string             // 线索渠道
  region: '国内' | '国外'   // 地区（必填）
  assignedTo: string         // 销售负责人（为空 = 公海池）
  assignedAt: string         // 分配/领取日期
  lastFollowAt: string      // 最新跟进日期
  nextFollowAt: string      // 下次跟进日期
  followOverdue: boolean    // 跟进是否超时
  remark: string            // 备注
  invalidReason: string     // 无效原因
  createdAt: string         // 录入日期
}

export let leads: Lead[] = [
  { id: 'L001', code: 'CL20260601001', status: '未联系', customerName: '东莞鸿达电子', contactName: '陈总', phone: '139****1122', email: 'chen@hongda.com', wechat: 'chen_ceo', company: '东莞鸿达电子有限公司', industry: '电子加工', scale: '101-300人', source: '线上推广', region: '国内', assignedTo: '', assignedAt: '', lastFollowAt: '', nextFollowAt: '', followOverdue: false, remark: '官网询盘，需求氮气发生器', invalidReason: '', createdAt: '2026-06-01' },
  { id: 'L002', code: 'CL20260603002', status: '未联系', customerName: '武汉光谷生物', contactName: '周博士', phone: '138****3344', email: 'zhou@ggbio.com', wechat: '', company: '武汉光谷生物医药', industry: '生物制药', scale: '50-100人', source: '展会', region: '国内', assignedTo: '', assignedAt: '', lastFollowAt: '', nextFollowAt: '', followOverdue: false, remark: '展会留资，需制氧机方案', invalidReason: '', createdAt: '2026-06-03' },
  { id: 'L003', code: 'CL20260605003', status: '跟进中', customerName: 'Global Tech Solutions', contactName: 'John Smith', phone: '+1 415****889', email: 'john@globaltech.com', wechat: '', company: 'Global Tech Solutions Inc.', industry: '3D Printing', scale: '50-100人', source: 'WhatsApp', region: '国外', assignedTo: '', assignedAt: '', lastFollowAt: '2026-06-20', nextFollowAt: '2026-06-28', followOverdue: false, remark: 'WhatsApp 咨询氢气发生器', invalidReason: '', createdAt: '2026-06-05' },
  { id: 'L004', code: 'CL20260608004', status: '未联系', customerName: '无锡食品包装', contactName: '李经理', phone: '137****5566', email: '', wechat: 'li_food', company: '无锡食品包装有限公司', industry: '食品包装', scale: '1000人以上', source: '转介绍', region: '国内', assignedTo: '', assignedAt: '', lastFollowAt: '', nextFollowAt: '', followOverdue: false, remark: '朋友介绍，食品包装用氮气', invalidReason: '', createdAt: '2026-06-08' },
  { id: 'L005', code: 'CL20260610005', status: '无效', customerName: '', contactName: '匿名', phone: '0', email: '', wechat: '', company: '', industry: '', scale: '', source: '线上推广', region: '国内', assignedTo: '', assignedAt: '', lastFollowAt: '', nextFollowAt: '', followOverdue: false, remark: '无效号码', invalidReason: '无法取得联系', createdAt: '2026-06-10' },
  { id: 'L006', code: 'CL20260612006', status: '未联系', customerName: '成都文物修缮中心', contactName: '赵主任', phone: '136****7788', email: 'zhao@cdwenwu.com', wechat: '', company: '成都文物修缮中心', industry: '文物储藏', scale: '0-100人', source: '线上推广', region: '国内', assignedTo: '', assignedAt: '', lastFollowAt: '', nextFollowAt: '', followOverdue: false, remark: '文物储藏环境，需氮气保护方案', invalidReason: '', createdAt: '2026-06-12' },
]

export interface Device {
  id: string; customerId: string; serialNumber: string; model: string
  businessLine: 'industrial' | 'retail' | 'oem'
  installDate: string; warrantyExpiry: string
  status: 'active' | 'maintenance' | 'retired'
  notes: string
}

export interface TimelineEvent {
  id: string
  customerId: string
  type: 'call' | 'visit' | 'email' | 'meeting' | 'quotation' | 'order' | 'payment' | 'note' | 'whatsapp' | 'website' | 'social'
  channel: string // 渠道: 电话/邮件/WhatsApp/网站/社媒/线下
  content: string
  operator: string
  createdAt: string
  relatedId?: string
}

export let products: Product[] = [
  { id: '1', name: '模块式氮气发生器', nameEn: 'Modular Nitrogen Generator', code: 'P001', brand: 'HOLANG', model: 'NPL02B', category: '氮气N', unit: '台', costPrice: 38000, salePrice: 58500, taxRate: 13, status: 'active', description: '氮气流量4.4m³/h，纯度99.999%，适用于双缸选焊', descriptionEn: 'Nitrogen flow 4.4m³/h, purity 99.999%, suitable for dual-cylinder soldering', createdAt: '2026-01-15', length: 1200, width: 800, image: '', sellStatus: 'selling', standardPrice: 58500 },
  { id: '2', name: '模块式氮气发生器', nameEn: 'Modular Nitrogen Generator', code: 'P002', brand: 'HOLANG', model: 'NPL10B', category: '氮气N', unit: '台', costPrice: 98000, salePrice: 155000, taxRate: 13, status: 'active', description: '氮气流量40.3m³/h，纯度99.99%，适用于回流焊', descriptionEn: 'Nitrogen flow 40.3m³/h, purity 99.99%, suitable for reflow soldering', createdAt: '2026-01-15', length: 1800, width: 1200, image: '', sellStatus: 'selling', standardPrice: 155000 },
  { id: '3', name: '模块式氮气发生器', nameEn: 'Modular Nitrogen Generator', code: 'P003', brand: 'HOLANG', model: 'NPL09B', category: '氮气N', unit: '台', costPrice: 72000, salePrice: 109800, taxRate: 13, status: 'active', description: '氮气流量36.3m³/h，纯度99.99%', descriptionEn: 'Nitrogen flow 36.3m³/h, purity 99.99%', createdAt: '2026-03-20', length: 1600, width: 1100, image: '', sellStatus: 'selling', standardPrice: 109800 },
  { id: '4', name: '制氧机', nameEn: 'Oxygen Generator', code: 'P004', brand: 'HOLANG', model: 'OPL05', category: '氧气O', unit: '台', costPrice: 45000, salePrice: 68000, taxRate: 13, status: 'active', description: '氧气流量5m³/h，纯度93%±3%', descriptionEn: 'Oxygen flow 5m³/h, purity 93%±3%', createdAt: '2026-02-10', length: 1400, width: 900, image: '', sellStatus: 'selling', standardPrice: 68000 },
  { id: '5', name: '制氢机', nameEn: 'Hydrogen Generator', code: 'P005', brand: 'HOLANG', model: 'HPL03', category: '氢气H', unit: '台', costPrice: 85000, salePrice: 128000, taxRate: 13, status: 'active', description: '氢气流量3m³/h，纯度99.999%', descriptionEn: 'Hydrogen flow 3m³/h, purity 99.999%', createdAt: '2026-04-01', length: 1500, width: 1000, image: '', sellStatus: 'selling', standardPrice: 128000 },
  { id: '6', name: '压缩空气过滤器', nameEn: 'Compressed Air Filter', code: 'P006', brand: 'HOLANG', model: 'AF-200', category: '配件', unit: '个', costPrice: 1200, salePrice: 2200, taxRate: 13, status: 'active', description: '精密过滤，含尘量0.01ppm', descriptionEn: 'Precision filtration, dust content 0.01ppm', createdAt: '2026-01-20', length: 300, width: 200, image: '', sellStatus: 'selling', standardPrice: 2200 },
]

export let customers: Customer[] = [
  { id: '1', name: '耐力股份有限公司', code: 'NL20260410001', industry: '生产制造', scale: '100~500人', level: 'A', address: '河北省石家庄市', website: 'www.naili.com', contactName: '冯韶楠', contactPhone: '138****6789', contactEmail: 'feng@naili.com', contactWechat: 'feng_sn', contactWhatsapp: '+86 138****6789', contactDept: '采购部', contactTitle: '采购经理', taxTitle: '耐力股份有限公司', taxNumber: '91130100******', bankName: '中国工商银行', bankAccount: '6222***********', salesPerson: '刘世光', salesDept: '销售一部', source: '展会', followStage: '报价', createdAt: '2026-04-10', businessLine: 'industrial', salesType: 'internal', creditCode: '', dunsNumber: '', companyPhone: '0311-8****89', remark: '北京展会获取，重点客户', invoiceType: '增值税专用', bankCode: '102112000123', assignedAt: '2026-04-10', lastFollowAt: '2026-06-25', nextFollowAt: '2026-06-28', overdueFollow: false, transactedAt: '', contractFile: '' },
  { id: '2', name: '苏州精电科技有限公司', code: 'SZ20260315002', industry: '新能源', scale: '50~100人', level: 'B', address: '江苏省苏州市', website: 'www.jd-tech.com', contactName: '张工', contactPhone: '139****8901', contactEmail: 'zhang@jd-tech.com', contactWechat: 'zhang_tech', contactWhatsapp: '', contactDept: '技术部', contactTitle: '技术总监', taxTitle: '苏州精电科技有限公司', taxNumber: '91320500******', bankName: '中国建设银行', bankAccount: '6217***********', salesPerson: '刘世光', salesDept: '销售一部', source: '转介绍', followStage: '报价', createdAt: '2026-03-15', businessLine: 'industrial', salesType: 'internal', creditCode: '', dunsNumber: '', companyPhone: '0512-6****78', remark: '张工推荐，技术型客户', invoiceType: '增值税专用', bankCode: '', assignedAt: '2026-03-15', lastFollowAt: '2026-06-20', nextFollowAt: '2026-06-27', overdueFollow: false, transactedAt: '', contractFile: '' },
  { id: '3', name: '上海华测检测技术有限公司', code: 'SH20260520003', industry: '生物医药', scale: '500~1000人', level: 'C', address: '上海市浦东新区', website: 'www.huace.com', contactName: '李明', contactPhone: '137****2345', contactEmail: 'liming@huace.com', contactWechat: 'lm_lab', contactWhatsapp: '', contactDept: '实验室', contactTitle: '实验室主任', taxTitle: '上海华测检测技术有限公司', taxNumber: '91310115******', bankName: '中国银行', bankAccount: '6216***********', salesPerson: '刘世光', salesDept: '销售一部', source: '线上推广', followStage: '商机', createdAt: '2026-05-20', businessLine: 'industrial', salesType: 'internal', creditCode: '', dunsNumber: '', companyPhone: '021-5****01', remark: '线上推广转化，需持续跟进', invoiceType: '增值税普通', bankCode: '', assignedAt: '2026-05-20', lastFollowAt: '2026-06-18', nextFollowAt: '2026-06-30', overdueFollow: false, transactedAt: '', contractFile: '' },
  { id: '4', name: '深圳鹏程电子有限公司', code: 'SZ20260601004', industry: '电子制造', scale: '200~500人', level: 'B', address: '广东省深圳市', website: 'www.pc-elec.com', contactName: '王芳', contactPhone: '136****3456', contactEmail: 'wangf@pc-elec.com', contactWechat: 'wf_pc', contactWhatsapp: '+86 136****3456', contactDept: '采购部', contactTitle: '采购主管', taxTitle: '深圳鹏程电子有限公司', taxNumber: '91440300******', bankName: '招商银行', bankAccount: '6214***********', salesPerson: '刘世光', salesDept: '销售一部', source: '电话营销', followStage: '成交', createdAt: '2026-06-01', businessLine: 'industrial', salesType: 'internal', creditCode: '', dunsNumber: '', companyPhone: '0755-2****55', remark: '已成交，制氢机项目', invoiceType: '增值税专用', bankCode: '', assignedAt: '2026-06-01', lastFollowAt: '2026-06-20', nextFollowAt: '', overdueFollow: false, transactedAt: '2026-06-15', contractFile: '' },
]

export const followStages = ['线索', '商机', '报价', '成交', '丢单']
export const oppStages = ['初步接洽', '需求确认', '方案报价', '商务谈判', '合同签订', '赢单', '输单']

export const contacts: Contact[] = [
  { id: 'ct1', customerId: '1', name: '冯韶楠', title: '采购经理', dept: '采购部', phone: '138****6789', email: 'feng@naili.com', wechat: 'feng_sn', whatsapp: '+86 138****6789', isPrimary: true, gender: 'male', remark: '主要决策人', contactType: '主要联系人', isKP: true },
  { id: 'ct2', customerId: '1', name: '王建平', title: '技术主管', dept: '技术部', phone: '139****7890', email: 'wangjp@naili.com', wechat: 'wjp_tech', whatsapp: '', isPrimary: false, gender: 'male', remark: '技术评估', contactType: '技术', isKP: false },
  { id: 'ct3', customerId: '1', name: '赵晓丽', title: '财务主管', dept: '财务部', phone: '136****8901', email: 'zhaoxl@naili.com', wechat: 'zxl_fin', whatsapp: '', isPrimary: false, gender: 'female', remark: '付款对接', contactType: '财务', isKP: false },
  { id: 'ct4', customerId: '2', name: '张工', title: '技术总监', dept: '技术部', phone: '139****8901', email: 'zhang@jd-tech.com', wechat: 'zhang_tech', whatsapp: '+86 139****8901', isPrimary: true, gender: 'male', remark: '技术方案审核', contactType: '主要联系人', isKP: true },
  { id: 'ct5', customerId: '2', name: '陈美玲', title: '采购专员', dept: '采购部', phone: '137****9012', email: 'chenml@jd-tech.com', wechat: 'cml_buyer', whatsapp: '', isPrimary: false, gender: 'female', remark: '采购执行', contactType: '采购', isKP: false },
  { id: 'ct6', customerId: '3', name: '李明', title: '实验室主任', dept: '实验室', phone: '137****2345', email: 'liming@huace.com', wechat: 'lm_lab', whatsapp: '', isPrimary: true, gender: 'male', remark: '', contactType: '主要联系人', isKP: true },
  { id: 'ct7', customerId: '4', name: '王芳', title: '采购主管', dept: '采购部', phone: '136****3456', email: 'wangf@pc-elec.com', wechat: 'wf_pc', whatsapp: '+86 136****3456', isPrimary: true, gender: 'female', remark: '', contactType: '主要联系人', isKP: true },
  { id: 'ct8', customerId: '4', name: '周强', title: '生产经理', dept: '生产部', phone: '135****4567', email: 'zhouq@pc-elec.com', wechat: 'zq_prod', whatsapp: '', isPrimary: false, gender: 'male', remark: '设备使用部门', contactType: '技术', isKP: false },
]

export const opportunities: Opportunity[] = [
  { id: 'opp1', customerId: '1', name: '耐力氮气发生器采购项目', stage: '商务谈判', amount: 585000, expectedCloseDate: '2026-07-30', salesPerson: '刘世光', probability: 70, products: ['P002', 'P006'], createdAt: '2026-04-15', code: 'SJ20260415001', acquiredAt: '2026-04-15', milestone: '技术方案已确认', loseReason: '', collaborators: ['庞博'], taxRate: 13, discount: 0, costTotal: 420000, margin: 28 },
  { id: 'opp2', customerId: '1', name: '耐力制氧机配套项目', stage: '方案报价', amount: 136000, expectedCloseDate: '2026-08-15', salesPerson: '刘世光', probability: 40, products: ['P004'], createdAt: '2026-05-20', code: 'SJ20260520002', acquiredAt: '2026-05-20', milestone: '报价已发送', loseReason: '', collaborators: [], taxRate: 13, discount: 0, costTotal: 90000, margin: 33 },
  { id: 'opp3', customerId: '2', name: '精电氮气系统升级', stage: '方案报价', amount: 310000, expectedCloseDate: '2026-07-15', salesPerson: '刘世光', probability: 50, products: ['P003', 'P006'], createdAt: '2026-03-20', code: 'SJ20260320003', acquiredAt: '2026-03-20', milestone: '客户评估中', loseReason: '', collaborators: [], taxRate: 13, discount: 5000, costTotal: 210000, margin: 32 },
  { id: 'opp4', customerId: '4', name: '鹏程制氢机采购', stage: '赢单', amount: 256000, expectedCloseDate: '2026-06-15', salesPerson: '刘世光', probability: 100, products: ['P005'], createdAt: '2026-06-05', code: 'SJ20260605004', acquiredAt: '2026-06-05', milestone: '已成交', loseReason: '', collaborators: ['李销售'], taxRate: 13, discount: 0, costTotal: 170000, margin: 33 },
]

export const quotations: Quotation[] = [
  { id: 'q1', customerId: '1', opportunityId: 'opp1', code: 'HQ20260420001', amount: 585000, status: 'sent', salesPerson: '刘世光', createdAt: '2026-04-20', validUntil: '2026-05-20', businessLine: 'industrial', approvalStatus: '已审批', flowStatus: '完成', taxRate: 13, discount: 0, discountReason: '', convertedToOrder: true },
  { id: 'q2', customerId: '1', opportunityId: 'opp2', code: 'HQ20260525001', amount: 136000, status: 'draft', salesPerson: '刘世光', createdAt: '2026-05-25', validUntil: '2026-06-25', businessLine: 'industrial', approvalStatus: '待审批', flowStatus: '草稿', taxRate: 13, discount: 0, discountReason: '', convertedToOrder: false },
  { id: 'q3', customerId: '2', opportunityId: 'opp3', code: 'HQ20260322001', amount: 310000, status: 'sent', salesPerson: '刘世光', createdAt: '2026-03-22', validUntil: '2026-04-22', businessLine: 'industrial', approvalStatus: '已审批', flowStatus: '完成', taxRate: 13, discount: 5000, discountReason: '老客户优惠', convertedToOrder: false },
  { id: 'q4', customerId: '4', opportunityId: 'opp4', code: 'HQ20260608001', amount: 256000, status: 'approved', salesPerson: '刘世光', createdAt: '2026-06-08', validUntil: '2026-07-08', businessLine: 'industrial', approvalStatus: '已审批', flowStatus: '完成', taxRate: 13, discount: 0, discountReason: '', convertedToOrder: true },
]

export const orders: Order[] = [
  { id: 'ord1', customerId: '4', quotationId: 'q4', code: 'DD20260615001', amount: 256000, status: 'in_production', salesPerson: '刘世光', createdAt: '2026-06-15', deliveryDate: '2026-07-05', businessLine: 'industrial', approvalStatus: '已通过', flowStatus: '执行中', expectedDeliveryDate: '2026-07-01', contractEntity: '深圳鹏程电子有限公司', salesType: '直销', endUser: '深圳鹏程电子有限公司', productType: '标准品', paymentMethod: '30%预付+60%发货+10%验收', receiver: '周强', receiverPhone: '135****4567', receiverAddress: '广东省深圳市宝安区福永街道', contractFile: '', techAgreement: '', specialReq: '需CE认证', collectedAmount: 76800, invoicedAmount: 0, taxRate: 13, discount: 0,
    items: [
      { id: 'oi1', productId: '5', productName: '制氢机', productNameEn: 'Hydrogen Generator', spec: 'HPL03 / 氢气流量3m³/h，纯度99.999%', quantity: 1, unit: '台', unitPrice: 113274, taxRate: 13, subtotal: 128000 },
      { id: 'oi2', productId: '6', productName: '压缩空气过滤器', productNameEn: 'Compressed Air Filter', spec: 'AF-200', quantity: 2, unit: '个', unitPrice: 1947, taxRate: 13, subtotal: 4400 },
      { id: 'oi3', productId: '', productName: '安装调试服务费', productNameEn: 'Installation & Debugging Service', spec: '现场安装调试+操作培训', quantity: 1, unit: '项', unitPrice: 123000, taxRate: 6, subtotal: 130380 },
    ],
  },
  { id: 'ord2', customerId: '1', quotationId: 'q1', code: 'DD20260620001', amount: 585000, status: 'confirmed', salesPerson: '刘世光', createdAt: '2026-06-20', deliveryDate: '2026-08-01', businessLine: 'industrial', approvalStatus: '已通过', flowStatus: '执行中', expectedDeliveryDate: '2026-08-01', contractEntity: '耐力股份有限公司', salesType: '直销', endUser: '耐力股份有限公司', productType: '标准品', paymentMethod: '30%预付+60%发货+10%验收', receiver: '冯韶楠', receiverPhone: '138****6789', receiverAddress: '河北省石家庄市栾城区装备制造产业园', contractFile: '', techAgreement: '', specialReq: '', collectedAmount: 175500, invoicedAmount: 0, taxRate: 13, discount: 0,
    items: [
      { id: 'oi4', productId: '2', productName: '模块式氮气发生器', productNameEn: 'Modular Nitrogen Generator', spec: 'NPL10B / 氮气流量40.3m³/h，纯度99.99%', quantity: 1, unit: '台', unitPrice: 137168, taxRate: 13, subtotal: 155000 },
      { id: 'oi5', productId: '6', productName: '压缩空气过滤器', productNameEn: 'Compressed Air Filter', spec: 'AF-200', quantity: 5, unit: '个', unitPrice: 1947, taxRate: 13, subtotal: 11000 },
      { id: 'oi6', productId: '', productName: '技术培训服务费', productNameEn: 'Technical Training Service', spec: '现场培训2天，含教材', quantity: 1, unit: '项', unitPrice: 283000, taxRate: 6, subtotal: 300000 },
      { id: 'oi7', productId: '', productName: '运费', productNameEn: 'Freight', spec: '专线物流至石家庄', quantity: 1, unit: '项', unitPrice: 100000, taxRate: 9, subtotal: 109000 },
    ],
  },
]

export const payments: Payment[] = [
  { id: 'pay1', customerId: '4', orderId: 'ord1', code: 'HK20260618001', amount: 76800, type: 'deposit', status: 'received', plannedDate: '2026-06-18', receivedDate: '2026-06-18', paymentMethod: '银行转账', confirmedFinance: 'confirmed', confirmedFinanceDate: '2026-06-18', paymentVoucher: 'HK20260618001.pdf', paymentRatio: 30, customerAccount: '招商银行深圳福永支行 6***14', applyDate: '2026-06-17', remark: '' },
  { id: 'pay2', customerId: '4', orderId: 'ord1', code: 'HK20260710001', amount: 128000, type: 'progress', status: 'pending', plannedDate: '2026-07-10', receivedDate: '', paymentMethod: '银行转账', confirmedFinance: 'pending', confirmedFinanceDate: '', paymentVoucher: '', paymentRatio: 50, customerAccount: '', applyDate: '2026-07-05', remark: '' },
  { id: 'pay3', customerId: '4', orderId: 'ord1', code: 'HK20260720001', amount: 51200, type: 'retention', status: 'pending', plannedDate: '2026-07-20', receivedDate: '', paymentMethod: '银行转账', confirmedFinance: 'pending', confirmedFinanceDate: '', paymentVoucher: '', paymentRatio: 20, customerAccount: '', applyDate: '2026-07-15', remark: '' },
  { id: 'pay4', customerId: '1', orderId: 'ord2', code: 'HK20260622001', amount: 175500, type: 'deposit', status: 'received', plannedDate: '2026-06-22', receivedDate: '2026-06-22', paymentMethod: '银行转账', confirmedFinance: 'confirmed', confirmedFinanceDate: '2026-06-22', paymentVoucher: 'HK20260622001.pdf', paymentRatio: 30, customerAccount: '工商银行石家庄栾城支行 2***22', applyDate: '2026-06-20', remark: '' },
]

export const timelineEvents: TimelineEvent[] = [
  { id: 'tl1', customerId: '1', type: 'note', channel: '系统', content: '创建客户档案，来源于北京展会', operator: '刘世光', createdAt: '2026-04-10 09:30' },
  { id: 'tl2', customerId: '1', type: 'call', channel: '电话', content: '首次电话联系冯韶楠经理，了解氮气发生器需求', operator: '刘世光', createdAt: '2026-04-11 14:20' },
  { id: 'tl3', customerId: '1', type: 'visit', channel: '线下', content: '拜访耐力石家庄工厂，现场勘察用气需求', operator: '刘世光', createdAt: '2026-04-15 10:00', relatedId: 'opp1' },
  { id: 'tl4', customerId: '1', type: 'quotation', channel: '邮件', content: '发送报价单 HQ20260420001，总金额 ¥585,000', operator: '刘世光', createdAt: '2026-04-20 16:00', relatedId: 'q1' },
  { id: 'tl5', customerId: '1', type: 'meeting', channel: '线上', content: '技术方案线上会议，王建平参与技术细节讨论', operator: '刘世光', createdAt: '2026-04-25 10:30', relatedId: 'opp1' },
  { id: 'tl6', customerId: '1', type: 'email', channel: '邮件', content: '发送制氧机技术规格书和安装方案', operator: '刘世光', createdAt: '2026-05-10 09:00' },
  { id: 'tl7', customerId: '1', type: 'whatsapp', channel: 'WhatsApp', content: 'WhatsApp 确认制氧机电源要求为 380V/50Hz', operator: '刘世光', createdAt: '2026-05-15 11:30' },
  { id: 'tl8', customerId: '1', type: 'note', channel: '系统', content: '客户要求增加制氧机配置方案，新建商机', operator: '刘世光', createdAt: '2026-05-20 11:00', relatedId: 'opp2' },
  { id: 'tl9', customerId: '1', type: 'quotation', channel: '邮件', content: '发送报价单 HQ20260525001（制氧机），总金额 ¥136,000', operator: '刘世光', createdAt: '2026-05-25 15:00', relatedId: 'q2' },
  { id: 'tl10', customerId: '1', type: 'website', channel: '官网', content: '客户通过官网查看 NPL10B 产品页面，停留 4 分 32 秒', operator: '系统', createdAt: '2026-06-01 08:15' },
  { id: 'tl11', customerId: '1', type: 'social', channel: '社媒', content: '客户在 LinkedIn 分享 HOLANG 氮气方案文章', operator: '系统', createdAt: '2026-06-05 14:20' },
  { id: 'tl12', customerId: '1', type: 'order', channel: '系统', content: '确认订单 DD20260620001，氮气发生器项目，金额 ¥585,000', operator: '刘世光', createdAt: '2026-06-20 09:00', relatedId: 'ord2' },
  { id: 'tl13', customerId: '1', type: 'payment', channel: '系统', content: '收到定金 ¥175,500（HK20260622001）', operator: '财务部', createdAt: '2026-06-22 14:00', relatedId: 'pay4' },
  { id: 'tl14', customerId: '1', type: 'whatsapp', channel: 'WhatsApp', content: '客户 WhatsApp 确认定金到账，询问发货排期', operator: '刘世光', createdAt: '2026-06-23 10:00' },
  { id: 'tl15', customerId: '1', type: 'note', channel: '系统', content: '更新跟进阶段：报价→谈判', operator: '刘世光', createdAt: '2026-06-25 08:30' },
  { id: 'tl16', customerId: '2', type: 'note', channel: '系统', content: '创建客户档案，张工推荐转介绍', operator: '刘世光', createdAt: '2026-03-15 10:00' },
  { id: 'tl17', customerId: '2', type: 'call', channel: '电话', content: '电话联系张工，了解氮气系统升级需求', operator: '刘世光', createdAt: '2026-03-16 15:30' },
  { id: 'tl18', customerId: '2', type: 'quotation', channel: '邮件', content: '发送报价单 HQ20260322001，总金额 ¥310,000', operator: '刘世光', createdAt: '2026-03-22 11:00', relatedId: 'q3' },
  { id: 'tl19', customerId: '2', type: 'email', channel: '邮件', content: '邮件发送技术规格书和安装方案', operator: '刘世光', createdAt: '2026-04-01 09:00' },
  { id: 'tl20', customerId: '2', type: 'website', channel: '官网', content: '客户通过搜索引擎点击 HOLANG 官网，浏览氮气产品系列', operator: '系统', createdAt: '2026-04-05 16:20' },
  { id: 'tl21', customerId: '3', type: 'note', channel: '系统', content: '创建客户档案，来源线上推广', operator: '刘世光', createdAt: '2026-05-20 13:00' },
  { id: 'tl22', customerId: '3', type: 'call', channel: '电话', content: '首次联系李明主任，介绍氢气发生器产品', operator: '刘世光', createdAt: '2026-05-21 10:00' },
  { id: 'tl23', customerId: '3', type: 'email', channel: '邮件', content: '发送产品手册和成功案例', operator: '刘世光', createdAt: '2026-05-22 16:00' },
  { id: 'tl24', customerId: '4', type: 'note', channel: '系统', content: '创建客户档案，来源电话营销', operator: '刘世光', createdAt: '2026-06-01 09:00' },
  { id: 'tl25', customerId: '4', type: 'call', channel: '电话', content: '与王芳主管初步沟通制氢机需求', operator: '刘世光', createdAt: '2026-06-02 14:00' },
  { id: 'tl26', customerId: '4', type: 'visit', channel: '线下', content: '拜访深圳鹏程工厂，确认氢气用量和场地条件', operator: '刘世光', createdAt: '2026-06-05 09:30', relatedId: 'opp4' },
  { id: 'tl27', customerId: '4', type: 'quotation', channel: '邮件', content: '发送报价单 HQ20260608001，总金额 ¥256,000，报价已通过审批', operator: '刘世光', createdAt: '2026-06-08 15:00', relatedId: 'q4' },
  { id: 'tl28', customerId: '4', type: 'whatsapp', channel: 'WhatsApp', content: 'WhatsApp 跟进报价进度，客户确认技术参数无误', operator: '刘世光', createdAt: '2026-06-10 09:30' },
  { id: 'tl29', customerId: '4', type: 'order', channel: '系统', content: '客户确认订单，正式合同签订 DD20260615001', operator: '刘世光', createdAt: '2026-06-15 10:00', relatedId: 'ord1' },
  { id: 'tl30', customerId: '4', type: 'payment', channel: '系统', content: '收到定金 ¥76,800（HK20260618001），30%定金已到账', operator: '财务部', createdAt: '2026-06-18 16:00', relatedId: 'pay1' },
  { id: 'tl31', customerId: '4', type: 'note', channel: '系统', content: '商机 opp4 标记为赢单，客户关系升级为B级', operator: '刘世光', createdAt: '2026-06-20 08:30' },
]

export const devices: Device[] = [
  { id: 'dv1', customerId: '1', serialNumber: 'NPL02B-2026-001', model: 'NPL-02B', businessLine: 'industrial', installDate: '2026-03-15', warrantyExpiry: '2029-03-15', status: 'active', notes: '耐力股份，双缸选焊用' },
  { id: 'dv2', customerId: '4', serialNumber: 'HPL03-2026-002', model: 'HPL-03', businessLine: 'industrial', installDate: '2026-06-20', warrantyExpiry: '2029-06-20', status: 'active', notes: '鹏程电子，氢气发生装置' },
]

export const productConfigs: ProductConfig[] = [
  { id: 'pc1', productLine: 'NPL', model: 'NPL-02B', configKey: 'purity', configValue: '99.9', priceModifier: 1.0, isActive: true },
  { id: 'pc2', productLine: 'NPL', model: 'NPL-02B', configKey: 'purity', configValue: '99.999', priceModifier: 1.15, isActive: true },
  { id: 'pc3', productLine: 'NPL', model: 'NPL-02B', configKey: 'purity', configValue: '99.9999', priceModifier: 1.3, isActive: true },
  { id: 'pc4', productLine: 'NPL', model: 'NPL-10B', configKey: 'purity', configValue: '99.99', priceModifier: 1.0, isActive: true },
  { id: 'pc5', productLine: 'NPL', model: 'NPL-10B', configKey: 'purity', configValue: '99.999', priceModifier: 1.12, isActive: true },
  { id: 'pc6', productLine: 'OPL', model: 'OPL-05', configKey: 'purity', configValue: '93', priceModifier: 1.0, isActive: true },
  { id: 'pc7', productLine: 'OPL', model: 'OPL-05', configKey: 'purity', configValue: '95', priceModifier: 1.08, isActive: true },
  { id: 'pc8', productLine: 'HPL', model: 'HPL-03', configKey: 'purity', configValue: '99.999', priceModifier: 1.0, isActive: true },
  { id: 'pc9', productLine: 'HPL', model: 'HPL-03', configKey: 'purity', configValue: '99.9999', priceModifier: 1.2, isActive: true },
  { id: 'pc10', productLine: 'NMA', model: 'NMA-01', configKey: 'type', configValue: '门店版', priceModifier: 1.0, isActive: true },
  { id: 'pc11', productLine: 'NMA', model: 'NMA-01', configKey: 'type', configValue: '冷萃内置版', priceModifier: 1.15, isActive: true },
]

// ============================================================
// 发货申请（对齐伙伴云 发货申请 表）
// ============================================================
export interface Delivery {
  id: string
  orderId: string
  customerId: string
  customerName: string
  salesType: 'direct' | 'indirect'        // 销售类型：直销/间销
  businessLine: 'domestic' | 'export'     // 销售类别：内销/外贸
  productType: 'finished' | 'spare'       // 产品类型：成品/备件
  paidAsContract: 'yes' | 'no'            // 是否按合同付款
  expectedPaymentDate: string              // 预计回款时间
  overdueReason: string                    // 逾期回款原因
  deliveryDate: string                     // 发货时间
  contactPerson: string                    // 收货人
  contactPhone: string                     // 联系方式
  shippingAddress: string                  // 收货地址
  shippingMethod: string                   // 运输方式
  specialReq: string                       // 其他特殊要求
  approvalStatus: 'pending' | 'approved' | 'cancelled' | 'rejected'  // 审批状态
  flowStatus: string                       // 流程状态
  notes: string
}

export const deliveries: Delivery[] = [
  { id: 'del1', orderId: 'ord1', customerId: '4', customerName: '深圳鹏程电子有限公司', salesType: 'direct', businessLine: 'domestic', productType: 'finished', paidAsContract: 'yes', expectedPaymentDate: '2026-07-15', overdueReason: '', deliveryDate: '2026-07-01', contactPerson: '周强', contactPhone: '135****4567', shippingAddress: '广东省深圳市宝安区福永街道', shippingMethod: 'road', specialReq: '需木箱包装', approvalStatus: 'approved', flowStatus: '已完成（同意）', notes: '' },
  { id: 'del2', orderId: 'ord2', customerId: '1', customerName: '耐力股份有限公司', salesType: 'direct', businessLine: 'domestic', productType: 'finished', paidAsContract: 'yes', expectedPaymentDate: '2026-08-10', overdueReason: '', deliveryDate: '2026-08-01', contactPerson: '冯韶楠', contactPhone: '138****6789', shippingAddress: '河北省石家庄市栾城区装备制造产业园', shippingMethod: 'road', specialReq: '', approvalStatus: 'pending', flowStatus: '执行中', notes: '' },
]

// ============================================================
// 开票申请（对齐伙伴云 开票申请 表）
// ============================================================
export interface Invoice {
  id: string
  orderId: string
  customerId: string
  salesPerson: string
  amount: number                          // 本次开票金额
  ratio: number                           // 本次开票比例(%)
  orderStatus: 'completed' | 'pending' | 'delivered'
  type: string                            // 发票类型
  contractEntity: string                  // 开票主体
  title: string                           // 发票抬头
  taxNumber: string                       // 统一信用代码
  companyAddress: string                  // 公司地址
  companyPhone: string                    // 电话
  bankName: string                        // 开户银行
  bankAccount: string                     // 银行账号
  recipient: string                       // 收件人
  recipientPhone: string                  // 联系电话
  recipientAddress: string                // 收件地址
  invoiceNumber: string                   // 发票号
  invoiceFile: string                     // 发票附件
  invoiceScan: string                     // 发票扫描件
  approvalStatus: 'pending' | 'issued' | 'rejected' | 'cancelled'
  notes: string
}

export const invoices: Invoice[] = [
  { id: 'inv1', orderId: 'ord1', customerId: '4', salesPerson: '刘世光', amount: 76800, ratio: 30, orderStatus: 'completed', type: 'vat_13_special', contractEntity: '深圳鹏程电子有限公司', title: '深圳鹏程电子有限公司', taxNumber: '91440300******', companyAddress: '广东省深圳市', companyPhone: '0755-2****55', bankName: '招商银行', bankAccount: '6214***********', recipient: '周强', recipientPhone: '135****4567', recipientAddress: '广东省深圳市宝安区福永街道', invoiceNumber: '04400138****', invoiceFile: '', invoiceScan: '', approvalStatus: 'issued', notes: '' },
  { id: 'inv2', orderId: 'ord2', customerId: '1', salesPerson: '刘世光', amount: 175500, ratio: 30, orderStatus: 'pending', type: 'vat_13_special', contractEntity: '耐力股份有限公司', title: '耐力股份有限公司', taxNumber: '91130100******', companyAddress: '河北省石家庄市', companyPhone: '0311-8****89', bankName: '中国工商银行', bankAccount: '6222***********', recipient: '冯韶楠', recipientPhone: '138****6789', recipientAddress: '河北省石家庄市栾城区', invoiceNumber: '', invoiceFile: '', invoiceScan: '', approvalStatus: 'pending', notes: '' },
]

export const sourceChannels = ['展会', '转介绍', '线上推广', '电话营销', '官网表单', '社媒', 'WhatsApp', '邮件', '代理商', '其他']

export const productCategories = ['氮气N', '氧气O', '氢气H', '配件', '半成品', '原料']
export const industries = ['生产制造', '新能源', '生物医药', '实验室', '食品包装', '电子制造', '互联网', '金融', '教育培训', '零售', '房地产', '其他']
export const customerLevels = ['A', 'B', 'C', 'D', 'E']

// Dashboard stats
export const dashboardStats = {
  leadsCount: 48,
  opportunitiesCount: 23,
  dealsCount: 12,
  dealAmount: 2145000,
  collectionAmount: 1268000,
  conversionRate: 25.0,
  winRate: 52.2,
  avgDealAmount: 178750,
}

export const monthlySales = [
  { month: '1月', amount: 180000, orders: 3 },
  { month: '2月', amount: 250000, orders: 4 },
  { month: '3月', amount: 320000, orders: 5 },
  { month: '4月', amount: 450000, orders: 6 },
  { month: '5月', amount: 380000, orders: 5 },
  { month: '6月', amount: 565000, orders: 8 },
]

export const funnelData = [
  { name: '线索', value: 48 },
  { name: '商机', value: 23 },
  { name: '报价', value: 18 },
  { name: '合同', value: 12 },
  { name: '回款', value: 8 },
]

// ============================================================
// 外贸单证（PI / CI / PL）
// ============================================================

// PI = Proforma Invoice（形式发票）
// 可在订单确认前独立生成，编号格式：PI-2026-001
export interface ProformaInvoice {
  id: string
  piCode: string            // PI 编号，如 PI-2026-001
  customerId: string
  customerName: string
  orderId: string           // 关联订单（可空，PI 可先于订单）
  quotationId: string       // 关联报价单（可空）
  piDate: string           // PI 日期
  salesPerson: string
  currency: string          // 币种：USD / EUR / CNY
  totalAmount: number      // 总金额（外币）
  totalAmountCNY: number  // 人民币等价金额
  paymentTerms: string     // 付款条款：TT 30% 预付 / LC 即期 / 等等
  deliveryTerms: string    // 交货条款：FOB / CIF / EXW
  deliveryDate: string     // 预计交货期
  validityDays: number     // 有效期（天）
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'cancelled'
  signedAt: string         // 客户回签日期
  pdfFile: string          // 导出 PDF 路径
  createdAt: string
}

// CI = Commercial Invoice（商业发票）
// 发货时生成，编号格式：CI-2026-001
export interface CommercialInvoice {
  id: string
  ciCode: string            // CI 编号，如 CI-2026-001
  customerId: string
  orderId: string           // 关联订单（必填）
  deliveryId: string        // 关联发货单
  ciDate: string           // CI 日期
  salesPerson: string
  currency: string
  totalAmount: number
  paymentTerms: string
  incoterms: string        // 国际贸易术语：FOB / CIF / CFR / EXW
  shipmentDate: string     // 发货日期
  status: 'draft' | 'issued' | 'cancelled'
  pdfFile: string
  createdAt: string
}

// PL = Packing List（装箱单）
// 发货时与 CI 一同生成
export interface PackingList {
  id: string
  plCode: string            // PL 编号，如 PL-2026-001
  customerId: string
  orderId: string
  deliveryId: string
  ciId: string              // 关联 CI
  plDate: string
  salesPerson: string
  totalPackages: number    // 总件数
  totalGrossWeight: number // 总毛重（kg）
  totalNetWeight: number   // 总净重（kg）
  totalVolume: number      // 总体积（m³）
  status: 'draft' | 'issued' | 'cancelled'
  pdfFile: string
  createdAt: string
}

// ============================================================
// Mock 数据：外贸单证
// ============================================================

export const proformaInvoices: ProformaInvoice[] = [
  {
    id: 'pi1', piCode: 'PI-2026-001', customerId: '4', customerName: 'Shenzhen Pengcheng Electronics Co., Ltd.',
    orderId: '', quotationId: 'q4', piDate: '2026-06-05', salesPerson: '刘世光',
    currency: 'USD', totalAmount: 35200, totalAmountCNY: 256000,
    paymentTerms: 'TT 30% in advance, 70% before shipment',
    deliveryTerms: 'FOB Shenzhen', deliveryDate: '2026-07-15', validityDays: 30,
    status: 'signed', signedAt: '2026-06-10', pdfFile: 'PI-2026-001.pdf', createdAt: '2026-06-05',
  },
  {
    id: 'pi2', piCode: 'PI-2026-002', customerId: '2', customerName: 'Suzhou Jingdian Technology Co., Ltd.',
    orderId: '', quotationId: 'q3', piDate: '2026-03-20', salesPerson: '刘世光',
    currency: 'USD', totalAmount: 42500, totalAmountCNY: 310000,
    paymentTerms: 'LC at sight', deliveryTerms: 'CIF Shanghai', deliveryDate: '2026-05-01',
    validityDays: 30, status: 'sent', signedAt: '', pdfFile: 'PI-2026-002.pdf', createdAt: '2026-03-20',
  },
]

export const commercialInvoices: CommercialInvoice[] = [
  {
    id: 'ci1', ciCode: 'CI-2026-001', customerId: '4', orderId: 'ord1',
    deliveryId: 'del1', ciDate: '2026-07-01', salesPerson: '刘世光',
    currency: 'USD', totalAmount: 35200, paymentTerms: 'TT 30%+70%',
    incoterms: 'FOB Shenzhen', shipmentDate: '2026-07-05', status: 'draft',
    pdfFile: '', createdAt: '2026-07-01',
  },
]

export const packingLists: PackingList[] = [
  {
    id: 'pl1', plCode: 'PL-2026-001', customerId: '4', orderId: 'ord1',
    deliveryId: 'del1', ciId: 'ci1', plDate: '2026-07-01', salesPerson: '刘世光',
    totalPackages: 2, totalGrossWeight: 380, totalNetWeight: 320, totalVolume: 1.8,
    status: 'draft', pdfFile: '', createdAt: '2026-07-01',
  },
]
