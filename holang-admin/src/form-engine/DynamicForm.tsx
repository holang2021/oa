// ============================================================
// 表单引擎 — DynamicForm 动态渲染组件
// 按 formDef.schema 渲染任意表单，变更时自动计算 auto/formula/fromProduct
// ============================================================
import type { FormDef, FieldDef, FormData, MasterRecord } from "./types";
import {
  evalFormula,
  genAutoValue,
  applyFromProduct,
  lookupMaster,
} from "./evaluator.js";
import { useState } from "react";

type Masters = Record<string, MasterRecord[]>;

interface Props {
  formDef: FormDef;
  value: FormData;
  onChange: (data: FormData) => void;
  masters?: Masters;
}

/** 全表单重算：auto(空才生成) / 子表列公式 / 顶层公式(两遍处理依赖) */
export function recompute(formDef: FormDef, data: FormData, _masters: Masters): FormData {
  const out: FormData = { ...data };

  // 默认值（仅在未赋值时填充）
  for (const f of formDef.fields) {
    if (out[f.key] === undefined) {
      if (f.default === "today") out[f.key] = new Date().toISOString().slice(0, 10);
      else if (f.default !== undefined) out[f.key] = f.default as unknown;
    }
  }

  for (const f of formDef.fields) {
    if (f.auto && (out[f.key] === undefined || out[f.key] === "")) {
      out[f.key] = genAutoValue(f.auto, {
        date: (out["quoteDate"] as string) || new Date(),
        seq: 1,
      });
    }
  }

  for (const f of formDef.fields) {
    if (f.type === "table" && Array.isArray(out[f.key])) {
      out[f.key] = (out[f.key] as FormData[]).map((row) =>
        computeRowFormulas(f.columns || [], row)
      );
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const f of formDef.fields) {
      if (f.formula && !f.readonly) {
        try {
          out[f.key] = evalFormula(f.formula, out);
        } catch {
          /* 公式暂不可算时保留原值 */
        }
      }
    }
  }
  return out;
}

function computeRowFormulas(columns: FieldDef[], row: FormData): FormData {
  const r: FormData = { ...row };
  for (const col of columns) {
    if (col.formula && !col.readonly) {
      try {
        r[col.key] = evalFormula(col.formula, r);
      } catch {
        /* ignore */
      }
    }
  }
  return r;
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export function DynamicForm({ formDef, value, onChange, masters = {} }: Props) {
  const setField = (key: string, val: unknown) => {
    onChange(recompute(formDef, { ...value, [key]: val }, masters));
  };

  const renderAtomic = (
    field: FieldDef,
    val: unknown,
    onVal: (v: unknown) => void,
    rowMasters?: Masters
  ) => {
    const m = rowMasters || masters;
    if (field.type === "select") {
      return (
        <select
          className={inputCls}
          value={(val as string) || ""}
          disabled={field.readonly}
          onChange={(e) => onVal(e.target.value)}
        >
          <option value="">请选择</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === "lookup") {
      const list = m[field.source || ""] || [];
      return (
        <select
          className={inputCls}
          value={(val as string) || ""}
          disabled={field.readonly}
          onChange={(e) => onVal(e.target.value)}
        >
          <option value="">请选择</option>
          {list.map((r) => (
            <option key={r.id} value={r.id}>
              {String(r[field.displayField || "name"])}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === "date") {
      return (
        <input
          type="date"
          className={inputCls}
          value={(val as string) || ""}
          disabled={field.readonly}
          onChange={(e) => onVal(e.target.value)}
        />
      );
    }
    if (field.type === "number") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className={inputCls}
            value={val === undefined || val === null ? "" : (val as number)}
            disabled={field.readonly}
            onChange={(e) => onVal(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {field.unit && <span className="text-sm text-gray-500">{field.unit}</span>}
        </div>
      );
    }
    if (field.type === "richtext") {
      return (
        <textarea
          className={inputCls}
          rows={3}
          value={(val as string) || ""}
          disabled={field.readonly}
          onChange={(e) => onVal(e.target.value)}
        />
      );
    }
    // text
    return (
      <input
        type="text"
        className={inputCls}
        placeholder={field.placeholder}
        value={(val as string) || ""}
        disabled={field.readonly}
        onChange={(e) => onVal(e.target.value)}
      />
    );
  };

  const renderTable = (field: FieldDef) => {
    const rows = (Array.isArray(value[field.key]) ? (value[field.key] as FormData[]) : []) as FormData[];
    const cols = field.columns || [];

    const updateRow = (idx: number, newRow: FormData) => {
      const nextRows = rows.map((r, i) => (i === idx ? newRow : r));
      onChange(recompute(formDef, { ...value, [field.key]: nextRows }, masters));
    };

    const onCell = (idx: number, col: FieldDef, rawVal: unknown) => {
      const row = { ...rows[idx], [col.key]: rawVal };
      // 主数据带出：当某列是 lookup 且其它列声明 fromProduct 时
      if (col.source) {
        const master = lookupMaster(masters[col.source] || [], String(rawVal));
        const filled = applyFromProduct(row, master, cols);
        updateRow(idx, computeRowFormulas(cols, filled as FormData));
        return;
      }
      updateRow(idx, computeRowFormulas(cols, row));
    };

    const addRow = () => {
      const blank: FormData = {};
      for (const c of cols) blank[c.key] = c.type === "number" ? 0 : "";
      updateRow(rows.length, blank);
    };
    const delRow = (idx: number) => {
      updateRow(idx, {} as FormData);
      const nextRows = rows.filter((_, i) => i !== idx);
      onChange(recompute(formDef, { ...value, [field.key]: nextRows }, masters));
    };

    return (
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-2 py-1 text-left font-medium text-gray-600">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-gray-100">
                {cols.map((c) => (
                  <td key={c.key} className="p-1">
                    {renderAtomic(c, row[c.key], (v) => onCell(idx, c, v))}
                  </td>
                ))}
                <td className="p-1">
                  <button className="text-xs text-red-500" onClick={() => delRow(idx)}>
                    删
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="m-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600" onClick={addRow}>
          + 增加一行
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {formDef.fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
            {f.unit && f.type !== "number" && (
              <span className="ml-1 text-xs text-gray-400">({f.unit})</span>
            )}
          </label>
          {f.type === "table" ? (
            renderTable(f)
          ) : (
            renderAtomic(f, value[f.key], (v) => setField(f.key, v))
          )}
        </div>
      ))}
    </div>
  );
}

/** 受控外层：自带 value 状态，便于独立使用 */
export function DynamicFormControlled({
  formDef,
  initialValue,
  masters,
}: {
  formDef: FormDef;
  initialValue?: FormData;
  masters?: Masters;
}) {
  const [data, setData] = useState<FormData>(
    () => recompute(formDef, initialValue || {}, masters || {})
  );
  return (
    <DynamicForm
      formDef={formDef}
      value={data}
      onChange={setData}
      masters={masters}
    />
  );
}
