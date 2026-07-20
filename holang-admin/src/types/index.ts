// ============================================================
// HOLANG Internal Management System - Type Definitions
// ============================================================

// ---------- User & Auth ----------
export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "sales" | "manager";
  avatar?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// ---------- Quotation (based on Excel format) ----------
export interface QuotationItem {
  id: string;
  itemNo: number;             // 项目序号
  productName: string;        // 产品名称
  model: string;              // 型号 (e.g. NPL02B)
  nitrogenFlow: string;       // 氮气流量
  nitrogenPurity: string;     // 氮气纯度
  oxygenContent: string;      // 氧含量
  inletSize: string;          // 进气口
  outletSize: string;         // 出气口
  power: string;              // 功率
  dimensions: string;         // 外形尺寸
  airRequirement: string;     // 用气需求
  inletPressure: string;      // 进气压力
  quantity: number;           // 数量
  unitPrice: number;          // 单价
  totalPrice: number;         // 总价
  discountRate?: number;      // 折扣率
  adjustedPrice?: number;     // 折后价
  notes?: string;             // 备注
}

export interface Quotation {
  id: string;
  quoteNo: string;            // 报价编号 (e.g. HQ26041006)
  quoteDate: string;          // 报价日期
  validDays: number;          // 有效期(天)
  customerName: string;       // 客户名称
  customerContact: string;    // 客户联系人
  customerEmail?: string;     // 客户邮箱
  customerPhone?: string;     // 客户电话
  subject: string;            // 主题
  ourCompany: string;         // 我司名称
  ourContact: string;         // 我司联系人
  ourEmail: string;           // 我司邮箱
  ourPhone: string;           // 我司电话
  items: QuotationItem[];     // 报价明细
  subtotal: number;           // 合计
  discountTotal?: number;     // 折扣后合计
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ---------- Agent ----------
export interface Agent {
  id: string;
  companyName: string;        // 代理商公司名称
  contactName: string;        // 联系人
  contactPhone: string;       // 联系电话
  contactEmail: string;       // 联系邮箱
  region: string;             // 代理区域
  products: string[];         // 代理产品线
  status: "pending" | "approved" | "rejected";
  registerDate: string;
  approvedDate?: string;
  notes?: string;
}

// ---------- Partner Cloud ----------
export interface PartnerCloudConfig {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  description: string;
}

// ---------- Report ----------
export type ReportType = "daily" | "weekly" | "monthly";

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  period: string;             // e.g. "2026-W26" or "2026-06"
  content: string;
  metrics: ReportMetrics;
  status: "draft" | "published";
  createdAt: string;
}

export interface ReportMetrics {
  totalQuotations: number;
  totalAmount: number;
  newCustomers: number;
  newAgents: number;
  topProducts: { name: string; count: number }[];
}

// ---------- Dashboard Stats ----------
export interface DashboardStats {
  totalQuotations: number;
  totalAmount: number;
  activeAgents: number;
  pendingAgents: number;
  monthlyQuotations: number;
  monthlyAmount: number;
  recentQuotations: Quotation[];
  topCustomers: { name: string; amount: number }[];
}
