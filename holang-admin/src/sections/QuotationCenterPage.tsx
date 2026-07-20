// ============================================================
// 报价中心 — 用 DynamicForm 承载，接 forms-api + 审批引擎
// 替换旧的 QuotationFormPage（手写表单）
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DynamicForm, recompute } from "@/form-engine/DynamicForm";
import { quotationDef } from "@/form-engine/samples/quotation-def";
import { MASTERS } from "@/form-engine/samples/masterData";
import { createSubmittedApproval } from "@/approval-engine/useApproval";
import { useAuth } from "@/hooks/useAuth";
import type { FormData } from "@/form-engine/types";
import { ArrowLeft, Save, Send } from "lucide-react";

const FORMS = "http://localhost:3002";

function genQuoteNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rnd = String(Math.floor(Math.random() * 90) + 10);
  return `HQ${ymd}${rnd}`;
}

function emptyData(): FormData {
  const base: FormData = {
    quoteNo: genQuoteNo(),
    quoteDate: new Date().toISOString().slice(0, 10),
    validDays: 30,
    customerId: "",
    subject: "氮气发生器 报价",
    items: [{ productId: "", model: "", flow: "", purity: "", qty: 1, unitPrice: 0, subtotal: 0 }],
  };
  return recompute(quotationDef, base, MASTERS);
}

export function QuotationCenterPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<FormData>(emptyData);
  const [recordId, setRecordId] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!id) {
      setData(emptyData());
      setRecordId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FORMS}/api/forms/quotation/data/${id}`);
        if (res.ok) {
          const rec = await res.json();
          if (cancelled) return;
          setRecordId(rec.id);
          setData(recompute(quotationDef, rec.data, MASTERS));
        } else {
          setMsg("⚠️ 未找到该报价单（请先启动 npm run forms:api）");
        }
      } catch {
        setMsg("⚠️ 表单服务未启动，无法加载");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = async (submit: boolean) => {
    try {
      const method = recordId ? "PUT" : "POST";
      const url = recordId
        ? `${FORMS}/api/forms/quotation/data/${recordId}`
        : `${FORMS}/api/forms/quotation/data`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const rec = await res.json();
      setRecordId(rec.id);
      if (submit) {
        await createSubmittedApproval("quotation", rec.id, user?.displayName || "当前用户");
        setMsg("✅ 已提交送审，可在「待我审批」中处理");
        setTimeout(() => navigate("/approval-inbox"), 900);
      } else {
        setMsg("✅ 已保存草稿");
      }
    } catch (e) {
      setMsg("❌ 操作失败：请先启动 npm run forms:api（" + String(e) + "）");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/quotations")}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{id ? "编辑报价" : "新建报价"}</h1>
          <p className="text-sm text-slate-500 mt-1">报价编号：{data.quoteNo as string}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => save(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            保存草稿
          </button>
          <button
            onClick={() => save(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            提交送审
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          {msg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <DynamicForm
          formDef={quotationDef}
          value={data}
          onChange={setData}
          masters={MASTERS}
        />
      </div>
    </div>
  );
}
