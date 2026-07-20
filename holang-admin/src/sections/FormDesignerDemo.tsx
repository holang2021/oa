// ============================================================
// 表单设计器演示页（验证 Step 1~3）
// 加载报价单 schema → DynamicForm 填报 → 实时算值 → API 存/取
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DynamicForm, recompute } from "@/form-engine/DynamicForm";
import { quotationDef } from "@/form-engine/samples/quotation-def";
import { MASTERS } from "@/form-engine/samples/masterData";
import { createSubmittedApproval } from "@/approval-engine";
import type { FormData } from "@/form-engine/types";

const API = "http://localhost:3002";

const initialData: FormData = {
  quoteDate: "2026-04-21",
  customerId: "c_nai",
  subject: "模块式氮气发生器 报价",
  items: [
    { productId: "p_npl02b", qty: 1, model: "", flow: "", purity: "", unitPrice: 0, subtotal: 0 },
    { productId: "p_npl09b", qty: 1, model: "", flow: "", purity: "", unitPrice: 0, subtotal: 0 },
    { productId: "p_freight", qty: 1, model: "", flow: "", purity: "", unitPrice: 0, subtotal: 0 },
  ],
  remarks: "1）本次价格为人民币未税价格，总价已含运费；2）交货期：订单确认后20天；3）付款方式：30预付款，65%发货款，5%调试验收完1个月付清。",
};

export function FormDesignerDemo() {
  const navigate = useNavigate();
  const [data, setData] = useState<FormData>(() =>
    recompute(quotationDef, initialData, MASTERS)
  );
  const [msg, setMsg] = useState<string>("");
  const [savedId, setSavedId] = useState<string>("");

  const save = async () => {
    try {
      const res = await fetch(`${API}/api/forms/${quotationDef.formId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const rec = await res.json();
      setSavedId(rec.id);
      setMsg("✅ 已保存到本地 JSON（id=" + rec.id + "）");
    } catch (e) {
      setMsg("❌ 保存失败：请先启动 npm run forms:api（" + String(e) + "）");
    }
  };

  const load = async () => {
    if (!savedId) return setMsg("⚠️ 还没有保存记录，先点保存");
    try {
      const res = await fetch(`${API}/api/forms/${quotationDef.formId}/data/${savedId}`);
      const rec = await res.json();
      setData(recompute(quotationDef, rec.data, MASTERS));
      setMsg("✅ 已从本地 JSON 读回（id=" + rec.id + "）");
    } catch (e) {
      setMsg("❌ 读取失败：" + String(e));
    }
  };

  // Step 5：表单提交即创建审批实例并跳转到审批中心
  const submitForApproval = async () => {
    try {
      const res = await fetch(`${API}/api/forms/${quotationDef.formId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const rec = await res.json();
      setSavedId(rec.id);
      await createSubmittedApproval("quotation", rec.id, "当前用户");
      setMsg("✅ 已提交送审（表单 id=" + rec.id + "），正在跳转到审批中心…");
      setTimeout(() => navigate(`/approval-demo?biz=quotation&id=${rec.id}`), 600);
    } catch (e) {
      setMsg("❌ 提交送审失败：请先启动 npm run forms:api 与 npm run approval:api（" + String(e) + "）");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">表单设计器演示 · {quotationDef.name}</h1>
          <p className="text-sm text-gray-500">
            Schema 驱动：改 schema 即改表单，无需改代码。自动值（编号/小计/合计/大写）由引擎实时计算。
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
            保存到 API
          </button>
          <button onClick={load} className="rounded bg-gray-200 px-4 py-2 text-sm">
            从 API 读回
          </button>
          <button onClick={submitForApproval} className="rounded bg-brand-600 px-4 py-2 text-sm text-white">
            提交送审
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-4 rounded bg-gray-50 p-3 text-sm">
        <span>报价编号：<b>{String(data.quoteNo || "—")}</b></span>
        <span>合计：<b>¥{Number(data.total || 0).toLocaleString()}</b></span>
        <span>大写：<b>{String(data.totalCn || "—")}</b></span>
      </div>

      {msg && <div className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-700">{msg}</div>}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <DynamicForm formDef={quotationDef} value={data} onChange={setData} masters={MASTERS} />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-500">查看当前表单数据 (JSON)</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
