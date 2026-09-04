/**
 * 页面配置中心 — 所有占位页面的配置定义
 * 每个配置描述一个列表页：标题、搜索栏、表格列、筛选条件、模拟数据
 */
import { type PageConfig } from '../components/GenericListPage'


// ====== 外销 (Export CRM) ======
export const exportLeadConfig: PageConfig = {
  title: '线索管理', subtitle: '外销客户线索采集与跟进',
  searchPlaceholder: '搜索线索名称/联系人/公司',
  searchFields: ['name', 'contact', 'desc', 'city'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '新线索', value: '正常' }, { label: '已跟进', value: '进行中' }, { label: '已转化', value: '已完成' }, { label: '已关闭', value: '已关闭' }] }],
  columns: [
    { label: '线索编号', key: 'code' },
    { label: '公司名称', key: 'name' },
    { label: '联系人', key: 'contact', hideMobile: true },
    { label: '邮箱', key: 'email' },
    { label: '来源', key: 'channel' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '创建时间', key: 'date' },
  ],
  emptyMessage: '暂无外销线索数据',
  comingSoon: true,
  pageSize: 10,
}

export const exportOppConfig: PageConfig = {
  title: '商机管理', subtitle: '外销商机跟踪与转化',
  searchPlaceholder: '搜索商机名称/客户/编号',
  searchFields: ['name', 'contact', 'code', 'industry'],
  filters: [{ key: 'status', label: '阶段', options: [{ label: '初步接触', value: '正常' }, { label: '需求确认', value: '进行中' }, { label: '报价中', value: '待审核' }, { label: '谈判', value: '暂停' }, { label: '已成交', value: '已完成' }, { label: '已丢失', value: '已关闭' }] }],
  columns: [
    { label: '商机编号', key: 'code' },
    { label: '商机名称', key: 'name' },
    { label: '客户', key: 'contact' },
    { label: '金额(USD)', key: 'amount', render: (v) => `$${Number(v || 0).toLocaleString()}` },
    { label: '阶段', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '待审核': 'bg-purple-50 text-purple-700', '暂停': 'bg-orange-50 text-orange-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '预计成交', key: 'date' },
  ],
  emptyMessage: '暂无外销商机数据',
  comingSoon: true,
}

export const exportQuotationConfig: PageConfig = {
  title: '报价管理', subtitle: '外销报价单管理与跟踪',
  searchPlaceholder: '搜索报价单号/客户/产品',
  searchFields: ['code', 'name', 'contact', 'desc'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '草稿', value: '正常' }, { label: '已发出', value: '进行中' }, { label: '客户确认', value: '待审核' }, { label: '已成交', value: '已完成' }, { label: '已过期', value: '已关闭' }] }],
  columns: [
    { label: '报价单号', key: 'code' },
    { label: '客户名称', key: 'name' },
    { label: '产品描述', key: 'desc' },
    { label: '金额(USD)', key: 'amount', render: (v) => `$${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '待审核': 'bg-purple-50 text-purple-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '报价日期', key: 'date' },
  ],
  emptyMessage: '暂无外销报价数据',
  comingSoon: true,
}

export const exportOrderConfig: PageConfig = {
  title: '订单管理', subtitle: '外销订单执行与跟踪',
  searchPlaceholder: '搜索订单号/客户/产品',
  searchFields: ['orderNo', 'name', 'desc', 'contact'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待确认', value: '待审核' }, { label: '生产中', value: '进行中' }, { label: '已发货', value: '已完成' }, { label: '已完成', value: '暂停' }, { label: '已取消', value: '已关闭' }] }],
  columns: [
    { label: '订单号', key: 'orderNo' },
    { label: '客户', key: 'name' },
    { label: '产品', key: 'desc' },
    { label: '金额(USD)', key: 'amount', render: (v) => `$${Number(v || 0).toLocaleString()}` },
    { label: '数量', key: 'qty' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '暂停': 'bg-gray-50 text-gray-500', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '下单日期', key: 'date' },
  ],
  emptyMessage: '暂无外销订单数据',
  comingSoon: true,
}

export const exportCollectionConfig: PageConfig = {
  title: '回款管理', subtitle: '外销回款跟踪与统计',
  searchPlaceholder: '搜索回款编号/客户/订单号',
  searchFields: ['code', 'name', 'orderNo'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待收款', value: '正常' }, { label: '部分收款', value: '进行中' }, { label: '已结清', value: '已完成' }, { label: '逾期', value: '已关闭' }] }],
  columns: [
    { label: '回款编号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '关联订单', key: 'orderNo' },
    { label: '应收金额(USD)', key: 'amount', render: (v) => `$${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '预计到账', key: 'date' },
  ],
  emptyMessage: '暂无外销回款数据',
  comingSoon: true,
}

export const exportDeliveryConfig: PageConfig = {
  title: '发货管理', subtitle: '外销发货物流跟踪',
  searchPlaceholder: '搜索发货单号/订单号/客户',
  searchFields: ['code', 'orderNo', 'name'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待发货', value: '待审核' }, { label: '已发货', value: '进行中' }, { label: '运输中', value: '暂停' }, { label: '已签收', value: '已完成' }] }],
  columns: [
    { label: '发货单号', key: 'code' },
    { label: '关联订单', key: 'orderNo' },
    { label: '客户', key: 'name' },
    { label: '目的地', key: 'city' },
    { label: '数量', key: 'qty' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '暂停': 'bg-purple-50 text-purple-700', '已完成': 'bg-green-50 text-green-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '发货日期', key: 'date' },
  ],
  emptyMessage: '暂无外销发货数据',
  comingSoon: true,
}

// ====== Marketing ======
export const marketingCampaignConfig: PageConfig = {
  title: '市场活动', subtitle: '营销活动策划与执行跟踪',
  searchPlaceholder: '搜索活动名称/渠道/负责人',
  searchFields: ['campaign', 'channel', 'name', 'desc'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '计划中', value: '正常' }, { label: '进行中', value: '进行中' }, { label: '已完成', value: '已完成' }, { label: '已取消', value: '已关闭' }] }],
  columns: [
    { label: '活动编号', key: 'code' },
    { label: '活动名称', key: 'campaign' },
    { label: '渠道', key: 'channel' },
    { label: '负责人', key: 'name' },
    { label: '预算', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-green-50 text-green-700', '已完成': 'bg-gray-50 text-gray-500', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '开始时间', key: 'date' },
  ],
  emptyMessage: '暂无市场活动数据',
  comingSoon: true,
}

export const marketingLeadConfig: PageConfig = {
  title: '线索采集', subtitle: '多渠道线索自动采集与分配',
  searchPlaceholder: '搜索线索来源/关键词/联系人',
  searchFields: ['channel', 'keyword', 'name', 'contact'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '新线索', value: '正常' }, { label: '已分配', value: '进行中' }, { label: '已转化', value: '已完成' }, { label: '无效', value: '已关闭' }] }],
  columns: [
    { label: '线索编号', key: 'code' },
    { label: '来源', key: 'channel' },
    { label: '关键词', key: 'keyword' },
    { label: '联系人', key: 'contact' },
    { label: '公司', key: 'name' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || 'bg-gray-50 text-gray-500'}`}>{s}</span>
    }},
    { label: '采集时间', key: 'date' },
  ],
  emptyMessage: '暂无采集线索数据',
  comingSoon: true,
}

export const marketingChannelConfig: PageConfig = {
  title: '渠道管理', subtitle: '营销渠道效果分析与对比',
  searchPlaceholder: '搜索渠道名称/类别/负责人',
  searchFields: ['channel', 'category', 'name'],
  filters: [{ key: 'category', label: '类别', options: [{ label: '线上', value: '官网' }, { label: '线下', value: '线下展会' }, { label: '代理', value: '代理商' }, { label: '电商', value: '电商平台' }] }],
  columns: [
    { label: '渠道编号', key: 'code' },
    { label: '渠道名称', key: 'channel' },
    { label: '类别', key: 'category' },
    { label: '负责人', key: 'name' },
    { label: '线索量', key: 'qty' },
    { label: '转化率', key: 'conversion' },
    { label: '创建时间', key: 'date' },
  ],
  emptyMessage: '暂无渠道数据',
  comingSoon: true,
}

export const marketingSEOConfig: PageConfig = {
  title: 'SEO 优化', subtitle: '网站搜索引擎优化效果追踪',
  searchPlaceholder: '搜索关键词/页面/目标URL',
  searchFields: ['keyword', 'desc', 'channel'],
  columns: [
    { label: '关键词', key: 'keyword' },
    { label: '目标页面', key: 'desc' },
    { label: '当前排名', key: 'qty', render: (v) => `#${v}` },
    { label: '搜索量', key: 'amount', render: (v) => Number(v || 0).toLocaleString() },
    { label: '点击率', key: 'metric' },
    { label: '趋势', key: 'trend', render: (v) => {
      const t = String(v || '')
      return <span className={t === '↑' ? 'text-green-600 font-bold' : t === '↓' ? 'text-red-500 font-bold' : 'text-gray-400'}>{t}</span>
    }},
    { label: '更新时间', key: 'date' },
  ],
  emptyMessage: '暂无SEO数据',
  comingSoon: true,
}

// ====== 售后 (After-sales) ======
export const aftersaleVisitConfig: PageConfig = {
  title: '客户回访', subtitle: '客户回访记录与满意度跟踪',
  searchPlaceholder: '搜索客户名/回访人/编号',
  searchFields: ['name', 'contact', 'code'],
  filters: [{ key: 'status', label: '回访结果', options: [{ label: '满意', value: '已完成' }, { label: '一般', value: '正常' }, { label: '不满意', value: '进行中' }, { label: '待回访', value: '待审核' }] }],
  columns: [
    { label: '回访编号', key: 'code' },
    { label: '客户名称', key: 'name' },
    { label: '回访人', key: 'contact' },
    { label: '产品/服务', key: 'desc' },
    { label: '满意度', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '已完成': 'bg-green-50 text-green-700', '正常': 'bg-yellow-50 text-yellow-700', '进行中': 'bg-red-50 text-red-700', '待审核': 'bg-blue-50 text-blue-700' }
      const l: Record<string, string> = { '已完成': '满意', '正常': '一般', '进行中': '不满意', '待审核': '待回访' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s] || s}</span>
    }},
    { label: '回访日期', key: 'date' },
  ],
  emptyMessage: '暂无回访记录',
  comingSoon: true,
}

export const aftersaleTicketConfig: PageConfig = {
  title: '售后工单', subtitle: '售后工单处理与闭环跟踪（来源：伙伴云售后宝 134 条）',
  searchPlaceholder: '搜索工单号/客户/问题描述/产品型号',
  searchFields: ['code', 'name', 'desc', 'productName', 'model', 'serialNo'],
  dataUrl: '/aftersale-tickets-mock.json',
  filters: [{ key: 'status', label: '状态', options: [{ label: '待处理', value: '待处理' }, { label: '处理中', value: '进行中' }, { label: '已完成', value: '已完成' }, { label: '已关闭', value: '已关闭' }] }],
  columns: [
    { label: '工单号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '产品', key: 'productName' },
    { label: '型号', key: 'model' },
    { label: '序列号', key: 'serialNo' },
    { label: '服务类型', key: 'serviceType' },
    { label: '问题描述', key: 'desc', className: 'max-w-xs truncate' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待处理': 'bg-red-50 text-red-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500', '待审核': 'bg-blue-50 text-blue-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '申请时间', key: 'date' },
  ],
  emptyMessage: '暂无工单数据',
}

// ====== SRM (Supplier Relationship Management) ======
export const srmSupplierConfig: PageConfig = {
  title: '供应商管理', subtitle: '供应商信息维护与绩效评估',
  searchPlaceholder: '搜索供应商名称/编码/联系人',
  searchFields: ['supplier', 'code', 'contact', 'industry'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '合作中', value: '正常' }, { label: '待评估', value: '待审核' }, { label: '暂停合作', value: '暂停' }, { label: '黑名单', value: '已关闭' }] }],
  columns: [
    { label: '供应商编码', key: 'code' },
    { label: '供应商名称', key: 'supplier' },
    { label: '联系人', key: 'contact' },
    { label: '所属行业', key: 'industry' },
    { label: '所在城市', key: 'city' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-green-50 text-green-700', '待审核': 'bg-yellow-50 text-yellow-700', '暂停': 'bg-orange-50 text-orange-700', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '合作开始', key: 'date' },
  ],
  emptyMessage: '暂无供应商数据',
  comingSoon: true,
}

export const srmInquiryConfig: PageConfig = {
  title: '询价管理', subtitle: '采购询价发起与比价',
  searchPlaceholder: '搜索询价单号/物料/供应商',
  searchFields: ['code', 'desc', 'supplier'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '询价中', value: '正常' }, { label: '已报价', value: '进行中' }, { label: '比价中', value: '待审核' }, { label: '已定标', value: '已完成' }] }],
  columns: [
    { label: '询价单号', key: 'code' },
    { label: '物料名称', key: 'desc' },
    { label: '数量', key: 'qty' },
    { label: '供应商', key: 'supplier' },
    { label: '截止日期', key: 'date' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '待审核': 'bg-purple-50 text-purple-700', '已完成': 'bg-green-50 text-green-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
  ],
  emptyMessage: '暂无询价单数据',
  comingSoon: true,
}

export const srmPurchaseOrderConfig: PageConfig = {
  title: '采购订单', subtitle: '采购订单管理与执行跟踪',
  searchPlaceholder: '搜索采购单号/供应商/物料',
  searchFields: ['orderNo', 'supplier', 'desc'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待确认', value: '待审核' }, { label: '已确认', value: '正常' }, { label: '部分到货', value: '进行中' }, { label: '已完成', value: '已完成' }, { label: '已取消', value: '已关闭' }] }],
  columns: [
    { label: '采购单号', key: 'orderNo' },
    { label: '供应商', key: 'supplier' },
    { label: '物料描述', key: 'desc' },
    { label: '数量', key: 'qty' },
    { label: '金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '正常': 'bg-yellow-50 text-yellow-700', '进行中': 'bg-purple-50 text-purple-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-gray-50 text-gray-500' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '下单日期', key: 'date' },
  ],
  emptyMessage: '暂无采购订单数据',
  comingSoon: true,
}

export const srmReceiveConfig: PageConfig = {
  title: '到货验收', subtitle: '采购到货验收与质检',
  searchPlaceholder: '搜索验收单号/采购单号/供应商',
  searchFields: ['code', 'orderNo', 'supplier'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待验收', value: '待审核' }, { label: '验收中', value: '进行中' }, { label: '合格', value: '已完成' }, { label: '不合格', value: '已关闭' }] }],
  columns: [
    { label: '验收单号', key: 'code' },
    { label: '采购单号', key: 'orderNo' },
    { label: '供应商', key: 'supplier' },
    { label: '验收数量', key: 'qty' },
    { label: '合格率', key: 'metric' },
    { label: '结果', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700' }
      const l: Record<string, string> = { '待审核': '待验收', '进行中': '验收中', '已完成': '合格', '已关闭': '不合格' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s] || s}</span>
    }},
    { label: '验收日期', key: 'date' },
  ],
  emptyMessage: '暂无验收数据',
  comingSoon: true,
}

export const srmPayableConfig: PageConfig = {
  title: '应付管理', subtitle: '供应商应付账款管理',
  searchPlaceholder: '搜索应付编号/供应商/采购单号',
  searchFields: ['code', 'supplier', 'orderNo'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待付款', value: '正常' }, { label: '部分付款', value: '进行中' }, { label: '已付清', value: '已完成' }, { label: '已逾期', value: '已关闭' }] }],
  columns: [
    { label: '应付编号', key: 'code' },
    { label: '供应商', key: 'supplier' },
    { label: '关联采购单', key: 'orderNo' },
    { label: '应付金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '到期日', key: 'date' },
  ],
  emptyMessage: '暂无应付数据',
  comingSoon: true,
}

// ====== ERP 生产 ======
export const erpBomConfig: PageConfig = {
  title: 'BOM 管理', subtitle: '物料清单维护与版本管理',
  searchPlaceholder: '搜索BOM编号/产品/物料',
  searchFields: ['bom', 'desc', 'code'],
  columns: [
    { label: 'BOM编号', key: 'bom' },
    { label: '产品名称', key: 'desc' },
    { label: '产品编码', key: 'code' },
    { label: '版本', key: 'metric' },
    { label: '物料数量', key: 'qty', render: (v) => `${v} 项` },
    { label: '创建人', key: 'name' },
    { label: '更新时间', key: 'date' },
  ],
  emptyMessage: '暂无BOM数据',
  comingSoon: true,
}

export const erpWorkOrderConfig: PageConfig = {
  title: '工单管理', subtitle: '生产工单创建与执行跟踪',
  searchPlaceholder: '搜索工单号/产品/产线',
  searchFields: ['taskNo', 'desc', 'code'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待排产', value: '待审核' }, { label: '生产中', value: '进行中' }, { label: '已完成', value: '已完成' }, { label: '已暂停', value: '暂停' }] }],
  columns: [
    { label: '工单号', key: 'taskNo' },
    { label: '产品', key: 'desc' },
    { label: '计划数量', key: 'qty' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '暂停': 'bg-orange-50 text-orange-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '负责人', key: 'name' },
    { label: '计划日期', key: 'date' },
  ],
  emptyMessage: '暂无工单数据',
  comingSoon: true,
}

export const erpScheduleConfig: PageConfig = {
  title: '生产排程', subtitle: '产线排程与产能规划',
  searchPlaceholder: '搜索排程编号/产线/工单号',
  searchFields: ['planNo', 'code', 'taskNo'],
  columns: [
    { label: '排程编号', key: 'planNo' },
    { label: '产线', key: 'code' },
    { label: '关联工单', key: 'taskNo' },
    { label: '产品', key: 'desc' },
    { label: '计划数量', key: 'qty' },
    { label: '开始时间', key: 'date' },
  ],
  emptyMessage: '暂无排程数据',
  comingSoon: true,
}

export const erpReportingConfig: PageConfig = {
  title: '报工管理', subtitle: '生产报工与工时统计',
  searchPlaceholder: '搜索报工单号/工单号/操作工',
  searchFields: ['code', 'taskNo', 'name'],
  columns: [
    { label: '报工单号', key: 'code' },
    { label: '工单号', key: 'taskNo' },
    { label: '产品', key: 'desc' },
    { label: '良品数', key: 'qty' },
    { label: '不良品', key: 'amount', render: (v) => Number(v) % 10 },
    { label: '操作工', key: 'name' },
    { label: '报工时间', key: 'date' },
  ],
  emptyMessage: '暂无报工数据',
  comingSoon: true,
}

export const erpQualityConfig: PageConfig = {
  title: '质量检验', subtitle: 'IQC/IPQC/OQC 质量检验记录',
  searchPlaceholder: '搜索检验单号/产品/检验员',
  searchFields: ['code', 'desc', 'name'],
  filters: [{ key: 'status', label: '结果', options: [{ label: '合格', value: '已完成' }, { label: '待复检', value: '待审核' }, { label: '不合格', value: '已关闭' }] }],
  columns: [
    { label: '检验单号', key: 'code' },
    { label: '产品/物料', key: 'desc' },
    { label: '批量', key: 'qty' },
    { label: '检验员', key: 'name' },
    { label: '合格率', key: 'metric' },
    { label: '结果', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '已完成': 'bg-green-50 text-green-700', '待审核': 'bg-yellow-50 text-yellow-700', '已关闭': 'bg-red-50 text-red-700' }
      const l: Record<string, string> = { '已完成': '合格', '待审核': '待复检', '已关闭': '不合格' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s] || s}</span>
    }},
    { label: '检验日期', key: 'date' },
  ],
  emptyMessage: '暂无质检数据',
  comingSoon: true,
}

// ====== ERP 仓储 ======
export const erpInventoryConfig: PageConfig = {
  title: '库存总览', subtitle: '实时库存查询与预警',
  searchPlaceholder: '搜索物料名称/编码/仓库',
  searchFields: ['desc', 'code', 'warehouse'],
  filters: [{ key: 'warehouse', label: '仓库', options: [{ label: '主仓库', value: '主仓库' }, { label: '成品仓', value: '成品仓' }, { label: '原料仓', value: '原料仓' }, { label: '备件仓', value: '备件仓' }] }],
  columns: [
    { label: '物料编码', key: 'code' },
    { label: '物料名称', key: 'desc' },
    { label: '类别', key: 'category' },
    { label: '仓库', key: 'warehouse' },
    { label: '库存数量', key: 'qty' },
    { label: '安全库存', key: 'amount', render: (v) => Math.floor(Number(v) / 5) },
    { label: '最近入库', key: 'date' },
  ],
  emptyMessage: '暂无库存数据',
  comingSoon: true,
}

export const erpInboundConfig: PageConfig = {
  title: '入库管理', subtitle: '采购入库/生产入库/退货入库',
  searchPlaceholder: '搜索入库单号/物料/供应商',
  searchFields: ['code', 'desc', 'supplier'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待入库', value: '待审核' }, { label: '已入库', value: '已完成' }, { label: '部分入库', value: '进行中' }] }],
  columns: [
    { label: '入库单号', key: 'code' },
    { label: '物料', key: 'desc' },
    { label: '来源', key: 'supplier' },
    { label: '数量', key: 'qty' },
    { label: '仓库', key: 'warehouse' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '已完成': 'bg-green-50 text-green-700', '进行中': 'bg-yellow-50 text-yellow-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '入库日期', key: 'date' },
  ],
  emptyMessage: '暂无入库数据',
  comingSoon: true,
}

export const erpOutboundConfig: PageConfig = {
  title: '出库管理', subtitle: '销售出库/领料出库/调拨出库',
  searchPlaceholder: '搜索出库单号/物料/客户',
  searchFields: ['code', 'desc', 'name'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待出库', value: '待审核' }, { label: '已出库', value: '已完成' }, { label: '部分出库', value: '进行中' }] }],
  columns: [
    { label: '出库单号', key: 'code' },
    { label: '物料', key: 'desc' },
    { label: '客户/去向', key: 'name' },
    { label: '数量', key: 'qty' },
    { label: '仓库', key: 'warehouse' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '已完成': 'bg-green-50 text-green-700', '进行中': 'bg-yellow-50 text-yellow-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '出库日期', key: 'date' },
  ],
  emptyMessage: '暂无出库数据',
  comingSoon: true,
}

export const erpTransferConfig: PageConfig = {
  title: '调拨管理', subtitle: '仓库间物料调拨',
  searchPlaceholder: '搜索调拨单号/物料/仓库',
  searchFields: ['code', 'desc', 'warehouse'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待调拨', value: '待审核' }, { label: '调拨中', value: '进行中' }, { label: '已完成', value: '已完成' }] }],
  columns: [
    { label: '调拨单号', key: 'code' },
    { label: '物料', key: 'desc' },
    { label: '数量', key: 'qty' },
    { label: '调出仓库', key: 'warehouse' },
    { label: '调入仓库', key: 'category', render: () => 'B-区库房' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '调拨日期', key: 'date' },
  ],
  emptyMessage: '暂无调拨数据',
  comingSoon: true,
}

export const erpStockCheckConfig: PageConfig = {
  title: '盘点管理', subtitle: '库存盘点计划与差异处理',
  searchPlaceholder: '搜索盘点单号/仓库/盘点人',
  searchFields: ['code', 'warehouse', 'name'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待盘点', value: '待审核' }, { label: '盘点中', value: '进行中' }, { label: '已完成', value: '已完成' }] }],
  columns: [
    { label: '盘点单号', key: 'code' },
    { label: '仓库', key: 'warehouse' },
    { label: '盘点人', key: 'name' },
    { label: '盘点项数', key: 'qty' },
    { label: '差异数', key: 'amount', render: (v) => Number(v) % 5 },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '盘点日期', key: 'date' },
  ],
  emptyMessage: '暂无盘点数据',
  comingSoon: true,
}

// ====== ERP 财务 ======
export const erpRepayPlanConfig: PageConfig = {
  title: '回款计划', subtitle: '销售回款计划与跟踪',
  searchPlaceholder: '搜索回款编号/客户/订单',
  searchFields: ['code', 'name', 'orderNo'],
  columns: [
    { label: '回款编号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '关联订单', key: 'orderNo' },
    { label: '计划金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '计划回款日', key: 'date' },
  ],
  emptyMessage: '暂无回款计划数据',
  comingSoon: true,
}

export const erpARConfig: PageConfig = {
  title: '应收账款', subtitle: '客户应收账款管理',
  searchPlaceholder: '搜索应收编号/客户/发票',
  searchFields: ['code', 'name', 'invoiceNo'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '未收', value: '正常' }, { label: '部分收款', value: '进行中' }, { label: '已结清', value: '已完成' }, { label: '逾期', value: '已关闭' }] }],
  columns: [
    { label: '应收编号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '应收金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '发票号', key: 'invoiceNo' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '到期日', key: 'date' },
  ],
  emptyMessage: '暂无应收数据',
  comingSoon: true,
}

export const erpAPConfig: PageConfig = {
  title: '应付账款', subtitle: '供应商应付账款管理',
  searchPlaceholder: '搜索应付编号/供应商/采购单',
  searchFields: ['code', 'supplier', 'orderNo'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '未付', value: '正常' }, { label: '部分付款', value: '进行中' }, { label: '已付清', value: '已完成' }, { label: '逾期', value: '已关闭' }] }],
  columns: [
    { label: '应付编号', key: 'code' },
    { label: '供应商', key: 'supplier' },
    { label: '应付金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '关联采购单', key: 'orderNo' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '正常': 'bg-blue-50 text-blue-700', '进行中': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{s}</span>
    }},
    { label: '到期日', key: 'date' },
  ],
  emptyMessage: '暂无应付数据',
  comingSoon: true,
}

export const erpInvoiceConfig: PageConfig = {
  title: '发票管理', subtitle: '销项/进项发票管理',
  searchPlaceholder: '搜索发票号/客户/订单',
  searchFields: ['invoiceNo', 'name', 'orderNo'],
  filters: [{ key: 'status', label: '类型', options: [{ label: '销项发票', value: '正常' }, { label: '进项发票', value: '进行中' }, { label: '已作废', value: '已关闭' }] }],
  columns: [
    { label: '发票号', key: 'invoiceNo' },
    { label: '对方名称', key: 'name' },
    { label: '关联单号', key: 'orderNo' },
    { label: '金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '开票日期', key: 'date' },
  ],
  emptyMessage: '暂无发票数据',
  comingSoon: true,
}

export const erpReconciliationConfig: PageConfig = {
  title: '销售对账', subtitle: '客户销售对账单管理',
  searchPlaceholder: '搜索对账编号/客户/期间',
  searchFields: ['code', 'name', 'date'],
  columns: [
    { label: '对账编号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '对账期间', key: 'date' },
    { label: '发货金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '已回款', key: 'qty', render: (v) => `¥${(Number(v) * 100).toLocaleString()}` },
  ],
  emptyMessage: '暂无对账数据',
  comingSoon: true,
}

export const erpExpenseConfig: PageConfig = {
  title: '费用报销', subtitle: '员工费用报销审批',
  searchPlaceholder: '搜索报销编号/申请人/费用类型',
  searchFields: ['code', 'name', 'category'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待审批', value: '待审核' }, { label: '已通过', value: '已完成' }, { label: '已驳回', value: '已关闭' }, { label: '已付款', value: '进行中' }] }],
  columns: [
    { label: '报销编号', key: 'code' },
    { label: '申请人', key: 'name' },
    { label: '费用类型', key: 'category' },
    { label: '报销金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700', '进行中': 'bg-blue-50 text-blue-700' }
      const l: Record<string, string> = { '待审核': '待审批', '已完成': '已通过', '已关闭': '已驳回', '进行中': '已付款' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s] || s}</span>
    }},
    { label: '申请日期', key: 'date' },
  ],
  emptyMessage: '暂无报销数据',
  comingSoon: true,
}

export const erpAccountsConfig: PageConfig = {
  title: '资金账户', subtitle: '银行账户/现金账户管理',
  searchPlaceholder: '搜索账户名称/账号/银行',
  searchFields: ['accountName', 'accountNo', 'code'],
  columns: [
    { label: '账户编号', key: 'code' },
    { label: '账户名称', key: 'accountName' },
    { label: '账号', key: 'accountNo' },
    { label: '期初余额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '当前余额', key: 'qty', render: (v) => `¥${(Number(v) * 2000).toLocaleString()}` },
    { label: '更新时间', key: 'date' },
  ],
  emptyMessage: '暂无账户数据',
  comingSoon: true,
}

// ====== 数据分析 ======
export const analyticsProductConfig: PageConfig = {
  title: '产品分析', subtitle: '产品销量/毛利/库存周转分析',
  searchPlaceholder: '搜索产品名称/编码',
  searchFields: ['desc', 'code'],
  columns: [
    { label: '产品编码', key: 'code' },
    { label: '产品名称', key: 'desc' },
    { label: '销量', key: 'qty' },
    { label: '销售额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '毛利率', key: 'metric' },
    { label: '趋势', key: 'trend', render: (v) => {
      const t = String(v || '')
      return <span className={t === '↑' ? 'text-green-600 font-bold' : t === '↓' ? 'text-red-500 font-bold' : 'text-gray-400'}>{t}</span>
    }},
    { label: '统计周期', key: 'date' },
  ],
  emptyMessage: '暂无产品分析数据',
  comingSoon: true,
}

export const analyticsLeadConfig: PageConfig = {
  title: '线索分析', subtitle: '线索来源/转化/质量分析',
  searchPlaceholder: '搜索渠道/来源',
  searchFields: ['channel', 'code'],
  columns: [
    { label: '渠道', key: 'channel' },
    { label: '线索量', key: 'qty' },
    { label: '转化率', key: 'conversion' },
    { label: '转化数', key: 'amount', render: (v) => Math.floor(Number(v) / 200) },
    { label: '趋势', key: 'trend', render: (v) => {
      const t = String(v || '')
      return <span className={t === '↑' ? 'text-green-600 font-bold' : t === '↓' ? 'text-red-500 font-bold' : 'text-gray-400'}>{t}</span>
    }},
    { label: '统计日期', key: 'date' },
  ],
  emptyMessage: '暂无线索分析数据',
  comingSoon: true,
}

export const analyticsROIConfig: PageConfig = {
  title: 'ROI 分析', subtitle: '投资回报率分析',
  searchPlaceholder: '搜索项目/渠道/活动',
  searchFields: ['campaign', 'channel', 'desc'],
  columns: [
    { label: '项目/活动', key: 'campaign' },
    { label: '渠道', key: 'channel' },
    { label: '投入成本', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '产出收入', key: 'qty', render: (v) => `¥${(Number(v) * 3000).toLocaleString()}` },
    { label: 'ROI', key: 'roi' },
    { label: '年度', key: 'date' },
  ],
  emptyMessage: '暂无ROI分析数据',
  comingSoon: true,
}

export const analyticsCustomerConfig: PageConfig = {
  title: '客户分析', subtitle: '客户分布/分级/活跃度分析',
  searchPlaceholder: '搜索客户/行业/地区',
  searchFields: ['name', 'industry', 'city'],
  columns: [
    { label: '客户名称', key: 'name' },
    { label: '行业', key: 'industry' },
    { label: '地区', key: 'city' },
    { label: '累计采购额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '订单数', key: 'qty' },
    { label: '最近交易', key: 'date' },
  ],
  emptyMessage: '暂无客户分析数据',
  comingSoon: true,
}

export const analyticsOppConfig: PageConfig = {
  title: '商机分析', subtitle: '商机漏斗/转化/预测分析',
  searchPlaceholder: '搜索商机/客户/销售员',
  searchFields: ['name', 'contact', 'code'],
  columns: [
    { label: '商机编号', key: 'code' },
    { label: '商机名称', key: 'name' },
    { label: '客户', key: 'contact' },
    { label: '预计金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '成交概率', key: 'metric' },
    { label: '预计成交', key: 'date' },
  ],
  emptyMessage: '暂无商机分析数据',
  comingSoon: true,
}

export const analyticsQuotationConfig: PageConfig = {
  title: '报价统计', subtitle: '报价转化率/赢单率分析',
  searchPlaceholder: '搜索报价单/客户/销售员',
  searchFields: ['code', 'name', 'contact'],
  columns: [
    { label: '报价单号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '报价金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '结果', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '已完成': 'bg-green-50 text-green-700', '已关闭': 'bg-red-50 text-red-700', '进行中': 'bg-yellow-50 text-yellow-700' }
      const l = {'已完成': '赢单', '已关闭': '输单', '进行中': '待定'}
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s as keyof typeof l] || s}</span>
    }},
    { label: '报价日期', key: 'date' },
  ],
  emptyMessage: '暂无报价统计数据',
  comingSoon: true,
}

export const analyticsContractConfig: PageConfig = {
  title: '合同统计', subtitle: '合同签订/执行/到期分析',
  searchPlaceholder: '搜索合同号/客户/项目',
  searchFields: ['code', 'name', 'desc'],
  columns: [
    { label: '合同编号', key: 'code' },
    { label: '客户', key: 'name' },
    { label: '项目名称', key: 'desc' },
    { label: '合同金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '执行进度', key: 'metric' },
    { label: '签订日期', key: 'date' },
  ],
  emptyMessage: '暂无合同统计数据',
  comingSoon: true,
}

export const analyticsCollectionConfig: PageConfig = {
  title: '回款统计', subtitle: '回款率/逾期率/账龄分析',
  searchPlaceholder: '搜索客户/订单/期间',
  searchFields: ['name', 'orderNo', 'date'],
  columns: [
    { label: '客户', key: 'name' },
    { label: '关联订单', key: 'orderNo' },
    { label: '应收金额', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '已回款', key: 'qty', render: (v) => `¥${(Number(v) * 50).toLocaleString()}` },
    { label: '回款率', key: 'metric' },
    { label: '最后回款日', key: 'date' },
  ],
  emptyMessage: '暂无回款统计数据',
  comingSoon: true,
}

export const analyticsFinanceConfig: PageConfig = {
  title: '财务统计', subtitle: '收入/成本/利润分析',
  searchPlaceholder: '搜索期间/部门/科目',
  searchFields: ['date', 'code', 'category'],
  columns: [
    { label: '期间', key: 'date' },
    { label: '收入', key: 'amount', render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { label: '成本', key: 'qty', render: (v) => `¥${(Number(v) * 30).toLocaleString()}` },
    { label: '利润', key: 'metric' },
  ],
  emptyMessage: '暂无财务统计数据',
  comingSoon: true,
}

// ====== 技术研发 ======
export const techDocsConfig: PageConfig = {
  title: '技术文件库', subtitle: '产品技术文档/规格书/图纸管理',
  searchPlaceholder: '搜索文件名称/编号/产品',
  searchFields: ['desc', 'docNo', 'code'],
  columns: [
    { label: '文件编号', key: 'docNo' },
    { label: '文件名称', key: 'desc' },
    { label: '关联产品', key: 'code' },
    { label: '版本', key: 'metric' },
    { label: '上传人', key: 'name' },
    { label: '上传日期', key: 'date' },
  ],
  emptyMessage: '暂无技术文件数据',
  comingSoon: true,
}

export const techECNConfig: PageConfig = {
  title: '工程变更', subtitle: 'ECN 工程变更通知管理',
  searchPlaceholder: '搜索变更单号/产品/变更类型',
  searchFields: ['changeNo', 'code', 'category'],
  filters: [{ key: 'status', label: '状态', options: [{ label: '待审批', value: '待审核' }, { label: '已批准', value: '已完成' }, { label: '已实施', value: '进行中' }, { label: '已驳回', value: '已关闭' }] }],
  columns: [
    { label: '变更单号', key: 'changeNo' },
    { label: '关联产品', key: 'code' },
    { label: '变更描述', key: 'desc' },
    { label: '变更类型', key: 'category' },
    { label: '申请人', key: 'name' },
    { label: '状态', key: 'status', render: (v) => {
      const s = String(v || '')
      const c: Record<string, string> = { '待审核': 'bg-yellow-50 text-yellow-700', '已完成': 'bg-green-50 text-green-700', '进行中': 'bg-blue-50 text-blue-700', '已关闭': 'bg-red-50 text-red-700' }
      const l: Record<string, string> = { '待审核': '待审批', '已完成': '已批准', '进行中': '已实施', '已关闭': '已驳回' }
      return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c[s] || ''}`}>{l[s] || s}</span>
    }},
    { label: '申请日期', key: 'date' },
  ],
  emptyMessage: '暂无工程变更数据',
  comingSoon: true,
}

// ====== 其他 ======
export const operationLogConfig: PageConfig = {
  title: '操作日志', subtitle: '系统操作审计日志',
  searchPlaceholder: '搜索操作人/模块/操作类型',
  searchFields: ['name', 'desc', 'code'],
  columns: [
    { label: '日志编号', key: 'code' },
    { label: '操作人', key: 'name' },
    { label: '操作模块', key: 'desc' },
    { label: '操作类型', key: 'category' },
    { label: 'IP 地址', key: 'qty', render: () => '192.168.1.' + Math.floor(Math.random() * 254) },
    { label: '操作时间', key: 'date' },
  ],
  emptyMessage: '暂无操作日志',
  comingSoon: true,
  pageSize: 15,
}

export const notificationConfig: PageConfig = {
  title: '消息通知', subtitle: '系统通知与提醒',
  searchPlaceholder: '搜索通知内容/类型',
  searchFields: ['desc', 'category'],
  columns: [
    { label: '编号', key: 'code' },
    { label: '通知内容', key: 'desc' },
    { label: '类型', key: 'category' },
    { label: '发送人', key: 'name' },
    { label: '时间', key: 'date' },
  ],
  emptyMessage: '暂无通知消息',
  comingSoon: true,
}
