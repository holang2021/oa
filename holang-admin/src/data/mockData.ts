// ============================================================
// HOLANG Internal Management - Mock Data
// ============================================================

import type { Quotation, Agent, PartnerCloudConfig, Report } from "@/types";

export const DEFAULT_USERS = [
  { id: "u1", username: "admin", password: "admin123", displayName: "管理员", role: "admin" as const },
  { id: "u2", username: "sales01", password: "sales123", displayName: "张销售", role: "sales" as const },
  { id: "u3", username: "manager", password: "manager123", displayName: "李经理", role: "manager" as const },
];

export const MOCK_QUOTATIONS: Quotation[] = [
  {
    id: "q1",
    quoteNo: "HQ26041006",
    quoteDate: "2026-04-10",
    validDays: 30,
    customerName: "耐力股份有限公司",
    customerContact: "冯韶楠 先生",
    subject: "模块式氮气发生器 报价",
    ourCompany: "昊朗（苏州）能源科技有限公司",
    ourContact: "刘世光 18662335855",
    ourEmail: "henry.liu@holangchina.com",
    ourPhone: "400-0512-711",
    items: [
      {
        id: "qi1", itemNo: 1, productName: "氮气发生器", model: "NPL02B",
        nitrogenFlow: "4.4m³/h", nitrogenPurity: "99.999%（无氧含量）",
        oxygenContent: "≤10ppm", inletSize: "Ø12mm", outletSize: "Ø8mm",
        power: "100W", dimensions: "741x500x1700mm",
        airRequirement: "0.6m³/min（洁净压缩空气）", inletPressure: "≥0.7MPa",
        quantity: 1, unitPrice: 58500, totalPrice: 58500,
        notes: "双缸选焊使用"
      },
      {
        id: "qi2", itemNo: 2, productName: "氮气发生器", model: "NPL10B",
        nitrogenFlow: "40.3m³/h", nitrogenPurity: "99.99%（无氧含量）",
        oxygenContent: "≤100ppm", inletSize: "G1", outletSize: "G1",
        power: "100W", dimensions: "1000x700x2000mm",
        airRequirement: "4.0m³/min（洁净压缩空气）", inletPressure: "≥0.7MPa",
        quantity: 1, unitPrice: 155000, totalPrice: 155000,
        notes: "回流焊使用"
      }
    ],
    subtotal: 213500,
    status: "sent",
    createdAt: "2026-04-10",
    updatedAt: "2026-04-10",
    createdBy: "u2"
  },
  {
    id: "q2",
    quoteNo: "HQ26042105",
    quoteDate: "2026-04-21",
    validDays: 30,
    customerName: "耐力股份有限公司",
    customerContact: "冯韶楠 先生",
    subject: "模块式氮气发生器 报价",
    ourCompany: "昊朗（苏州）能源科技有限公司",
    ourContact: "刘世光 18662335855",
    ourEmail: "henry.liu@holangchina.com",
    ourPhone: "400-0512-711",
    items: [
      {
        id: "qi3", itemNo: 1, productName: "氮气发生器", model: "NPL02B",
        nitrogenFlow: "4.4m³/h", nitrogenPurity: "99.999%（无氧含量）",
        oxygenContent: "≤10ppm", inletSize: "Ø12mm", outletSize: "Ø8mm",
        power: "100W", dimensions: "741x500x1700mm",
        airRequirement: "0.55m³/min（洁净压缩空气）", inletPressure: "≥0.7MPa",
        quantity: 1, unitPrice: 44800, totalPrice: 44800,
        discountRate: 0.68, adjustedPrice: 47056,
        notes: "双缸选焊使用"
      },
      {
        id: "qi4", itemNo: 2, productName: "氮气发生器", model: "NPL09B",
        nitrogenFlow: "36.3m³/h", nitrogenPurity: "99.99%（无氧含量）",
        oxygenContent: "≤100ppm", inletSize: "G1", outletSize: "G1",
        power: "100W", dimensions: "1000x700x2000mm",
        airRequirement: "3.5m³/min（洁净压缩空气）", inletPressure: "≥0.7MPa",
        quantity: 1, unitPrice: 109800, totalPrice: 109800,
        discountRate: 0.68, adjustedPrice: 115396,
        notes: "回流焊使用"
      }
    ],
    subtotal: 154600,
    discountTotal: 162452,
    status: "sent",
    createdAt: "2026-04-21",
    updatedAt: "2026-04-21",
    createdBy: "u2"
  },
  {
    id: "q3",
    quoteNo: "HQ26061001",
    quoteDate: "2026-06-10",
    validDays: 30,
    customerName: "苏州精密电子有限公司",
    customerContact: "王工 13800000001",
    customerEmail: "wang@suzhou-precision.cn",
    subject: "NPL系列制氮机 报价",
    ourCompany: "昊朗（苏州）能源科技有限公司",
    ourContact: "刘世光 18662335855",
    ourEmail: "henry.liu@holangchina.com",
    ourPhone: "400-0512-711",
    items: [
      {
        id: "qi5", itemNo: 1, productName: "氮气发生器", model: "NPL05B",
        nitrogenFlow: "15m³/h", nitrogenPurity: "99.99%",
        oxygenContent: "≤50ppm", inletSize: "G3/4", outletSize: "G1/2",
        power: "100W", dimensions: "850x600x1800mm",
        airRequirement: "1.5m³/min", inletPressure: "≥0.7MPa",
        quantity: 2, unitPrice: 88000, totalPrice: 176000,
      }
    ],
    subtotal: 176000,
    status: "accepted",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-15",
    createdBy: "u2"
  },
  {
    id: "q4",
    quoteNo: "HQ26061502",
    quoteDate: "2026-06-15",
    validDays: 30,
    customerName: "上海华虹半导体有限公司",
    customerContact: "陈经理 13900000002",
    subject: "NMA系列膜分离制氮机 报价",
    ourCompany: "昊朗（苏州）能源科技有限公司",
    ourContact: "刘世光 18662335855",
    ourEmail: "henry.liu@holangchina.com",
    ourPhone: "400-0512-711",
    items: [
      {
        id: "qi6", itemNo: 1, productName: "膜分离制氮机", model: "NMA-50",
        nitrogenFlow: "50m³/h", nitrogenPurity: "99.9%",
        oxygenContent: "≤0.1%", inletSize: "DN25", outletSize: "DN15",
        power: "500W", dimensions: "1200x800x2200mm",
        airRequirement: "5m³/min", inletPressure: "≥0.8MPa",
        quantity: 1, unitPrice: 320000, totalPrice: 320000,
      }
    ],
    subtotal: 320000,
    status: "draft",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    createdBy: "u2"
  },
];

export const MOCK_AGENTS: Agent[] = [
  {
    id: "a1",
    companyName: "苏州汇科机电设备有限公司",
    contactName: "赵总",
    contactPhone: "13900000003",
    contactEmail: "zhao@huike-sz.cn",
    region: "华东",
    products: ["NPL系列", "NMA系列"],
    status: "approved",
    registerDate: "2026-03-15",
    approvedDate: "2026-03-20",
  },
  {
    id: "a2",
    companyName: "深圳鹏远科技有限公司",
    contactName: "钱经理",
    contactPhone: "13800000004",
    contactEmail: "qian@pengyuan.cn",
    region: "华南",
    products: ["NPL系列"],
    status: "approved",
    registerDate: "2026-04-01",
    approvedDate: "2026-04-05",
  },
  {
    id: "a3",
    companyName: "成都新锐工业设备有限公司",
    contactName: "孙工",
    contactPhone: "13700000005",
    contactEmail: "sun@xinrui-cd.cn",
    region: "西南",
    products: ["NMA系列", "4KW干燥机"],
    status: "pending",
    registerDate: "2026-06-18",
  },
  {
    id: "a4",
    companyName: "武汉华中气体设备有限公司",
    contactName: "周总",
    contactPhone: "13600000006",
    contactEmail: "zhou@huazhonggas.cn",
    region: "华中",
    products: ["NPL系列", "NMA系列", "4KW干燥机"],
    status: "pending",
    registerDate: "2026-06-22",
  },
];

export const MOCK_PARTNER_CLOUD: PartnerCloudConfig[] = [
  {
    id: "pc1",
    name: "伙伴云 CRM",
    apiEndpoint: "https://api.huobanyun.com/v1",
    status: "disconnected",
    description: "伙伴云客户关系管理系统，用于同步客户数据和商机信息"
  },
  {
    id: "pc2",
    name: "企业微信",
    apiEndpoint: "https://qyapi.weixin.qq.com/cgi-bin",
    status: "connected",
    lastSync: "2026-06-26T08:00:00",
    description: "企业微信集成，用于消息推送和客户沟通"
  },
  {
    id: "pc3",
    name: "飞书",
    apiEndpoint: "https://open.feishu.cn/open-apis",
    status: "connected",
    lastSync: "2026-06-26T08:00:00",
    description: "飞书多维表格和知识库同步"
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: "r1",
    type: "weekly",
    title: "2026年第26周销售周报",
    period: "2026-W26",
    content: "本周新增报价2份，总金额¥496,000。新增代理商1家。",
    metrics: {
      totalQuotations: 2,
      totalAmount: 496000,
      newCustomers: 1,
      newAgents: 1,
      topProducts: [{ name: "NMA-50", count: 2 }]
    },
    status: "published",
    createdAt: "2026-06-25",
  }
];

// Helper: Generate next quotation number
export function generateQuoteNo(existingQuotes: Quotation[]): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const prefix = `HQ${y}${m}${d}`;
  const sameDay = existingQuotes.filter(q => q.quoteNo.startsWith(prefix));
  const seq = (sameDay.length + 1).toString().padStart(2, "0");
  return `${prefix}${seq}`;
}

// Status display helpers
export const QUOTATION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
  sent: { label: "已发送", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "已接受", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700" },
  expired: { label: "已过期", color: "bg-yellow-100 text-yellow-700" },
};

export const AGENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "已通过", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700" },
};

// Product models reference
export const PRODUCT_MODELS = [
  "NPL02B", "NPL05B", "NPL09B", "NPL10B", "NPL15B", "NPL20B",
  "NMA-30", "NMA-50", "NMA-100", "NMA-200",
  "4KW-DRY-100", "4KW-DRY-200"
];

export const PRODUCT_CATEGORIES = [
  { value: "NPL", label: "NPL系列（PSA变压吸附）" },
  { value: "NMA", label: "NMA系列（膜分离）" },
  { value: "4KW", label: "4KW干燥机" },
];
