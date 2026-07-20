// ============================================================
// 表单引擎示例 — 主数据（用于 lookup / fromProduct 带出）
// 真实字段取自 quotation_260421.json（氮气发生器 NPL02B / NPL09B / 运杂费）
// ============================================================
import type { MasterRecord } from "../types";

export const PRODUCTS: MasterRecord[] = [
  {
    id: "p_npl02b",
    name: "氮气发生器",
    model: "NPL02B",
    flow: "4.4m³/h",
    purity: "99.999%（无氧含量）",
    oxygen: "≤10ppm",
    inlet: "Ø12mm",
    outlet: "Ø8mm",
    power: "100W",
    dimensions: "741x500x1700mm",
    airReq: "0.55m³/min（洁净压缩空气）",
    price: 44800,
  },
  {
    id: "p_npl09b",
    name: "氮气发生器",
    model: "NPL09B",
    flow: "36.3m³/h",
    purity: "99.99%（无氧含量）",
    oxygen: "≤100ppm",
    inlet: "G1",
    outlet: "G3/4",
    power: "100W",
    dimensions: "1875x500x1700mm",
    airReq: "2.9m³/min（洁净压缩空气）",
    price: 109800,
  },
  {
    id: "p_freight",
    name: "运杂费",
    model: "",
    flow: "",
    purity: "",
    oxygen: "",
    inlet: "",
    outlet: "",
    power: "",
    dimensions: "",
    airReq: "",
    price: 1000,
  },
];

export const CUSTOMERS: MasterRecord[] = [
  { id: "c_nai", name: "耐力股份有限公司" },
  { id: "c_sample", name: "示例客户B" },
];

export const MASTERS: Record<string, MasterRecord[]> = {
  product: PRODUCTS,
  customer: CUSTOMERS,
};
