// ============================================================
// 表单引擎 — 类型定义（Schema 驱动表单）
// ============================================================

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "lookup"
  | "table"
  | "richtext";

/** 单个字段定义 */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;

  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  unit?: string;
  /** 默认值：支持 "today" 等关键字 */
  default?: unknown;

  /** select 选项 */
  options?: { label: string; value: string }[];

  /** lookup 主数据来源标识，如 "product" / "customer" */
  source?: string;
  /** lookup 显示字段（下拉展示用） */
  displayField?: string;

  /** 自动值规则，如 "rule:HQ+YYMMDD+seq" */
  auto?: string;
  /** 公式，如 "qty*unitPrice" / "SUM(items.subtotal)" / "toCnMoney(total)" */
  formula?: string;

  /** 子表列（仅 type === "table" 使用） */
  columns?: FieldDef[];

  /** 子表列专用：从主数据带出字段（如 fromProduct:"model"） */
  fromProduct?: string;
}

/** 表单定义 */
export interface FormDef {
  formId: string;
  name: string;
  version: number;
  fields: FieldDef[];
}

/** 主数据记录（用于 lookup / fromProduct 带出） */
export interface MasterRecord {
  id: string;
  name: string;
  [k: string]: unknown;
}

/** 表单数据（扁平 + 子表数组） */
export type FormData = Record<string, unknown>;
