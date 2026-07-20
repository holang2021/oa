// ============================================================
// Quotation List Page — 数据源接 forms-api（带 mock 兜底）
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_QUOTATIONS, QUOTATION_STATUS_MAP } from "@/data/mockData";
import { MASTERS } from "@/form-engine/samples/masterData";
import type { Quotation } from "@/types";
import { Search, Filter, Plus, Eye, Edit } from "lucide-react";

const FORMS = "http://localhost:3002";

interface Row {
  id: string;
  quoteNo: string;
  customerName: string;
  subject: string;
  subtotal: number;
  quoteDate: string;
  status: Quotation["status"];
}

function fromFormsApi(rec: { id: string; data: Record<string, unknown>; createdAt?: string }): Row {
  const d = rec.data;
  const cust = MASTERS.customer.find((c) => c.id === d.customerId);
  return {
    id: rec.id,
    quoteNo: String(d.quoteNo || ""),
    customerName: cust?.name || String(d.customerId || "—"),
    subject: String(d.subject || ""),
    subtotal: Number(d.total || 0),
    quoteDate: String(d.quoteDate || (rec.createdAt || "").slice(0, 10)),
    status: (d.status as Quotation["status"]) || "draft",
  };
}

export function QuotationListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Row>("quoteDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FORMS}/api/forms/quotation/data`);
        if (res.ok) {
          const list = (await res.json()) as { id: string; data: Record<string, unknown>; createdAt?: string }[];
          if (!cancelled) setRows(list.map(fromFormsApi));
          return;
        }
      } catch {
        /* 落 mock */
      }
      if (!cancelled) {
        setRows(
          MOCK_QUOTATIONS.map((q) => ({
            id: q.id,
            quoteNo: q.quoteNo,
            customerName: q.customerName,
            subject: q.subject,
            subtotal: q.subtotal,
            quoteDate: q.quoteDate,
            status: q.status,
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.quoteNo.toLowerCase().includes(s) ||
          q.customerName.toLowerCase().includes(s) ||
          q.subject.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((q) => q.status === statusFilter);
    }
    list.sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, search, statusFilter, sortField, sortDir]);

  const handleSort = (field: keyof Row) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报价管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理所有客户报价单</p>
        </div>
        <button
          onClick={() => navigate("/quotations/new")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建报价
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索报价编号、客户名称..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">全部状态</option>
            {Object.entries(QUOTATION_STATUS_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort("quoteNo")}>
                  报价编号 {sortField === "quoteNo" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort("customerName")}>
                  客户名称 {sortField === "customerName" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">主题</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort("subtotal")}>
                  金额 {sortField === "subtotal" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort("quoteDate")}>
                  日期 {sortField === "quoteDate" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">状态</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                    暂无报价记录
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{q.quoteNo}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{q.customerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{q.subject}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-700">¥{q.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-500">{q.quoteDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${QUOTATION_STATUS_MAP[q.status]?.color}`}>
                        {QUOTATION_STATUS_MAP[q.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/quotations/${q.id}`)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/quotations/${q.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/30 flex items-center justify-between">
          <span className="text-xs text-slate-500">共 {filtered.length} 条记录</span>
        </div>
      </div>
    </div>
  );
}
