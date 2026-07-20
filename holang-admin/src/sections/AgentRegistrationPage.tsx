// ============================================================
// Agent Registration Page
// ============================================================

import { useState, useMemo } from "react";
import { MOCK_AGENTS, AGENT_STATUS_MAP, PRODUCT_CATEGORIES } from "@/data/mockData";
import type { Agent } from "@/types";
import { Search, Plus, X, Check, Clock, Ban } from "lucide-react";

export function AgentRegistrationPage() {
  const [agents] = useState<Agent[]>(MOCK_AGENTS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    companyName: "", contactName: "", contactPhone: "",
    contactEmail: "", region: "", products: [] as string[], notes: ""
  });

  const filtered = useMemo(() => {
    let list = [...agents];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.companyName.toLowerCase().includes(s) ||
        a.contactName.toLowerCase().includes(s) ||
        a.region.toLowerCase().includes(s)
      );
    }
    return list;
  }, [agents, search]);

  const handleSubmit = () => {
    // In real app: POST to API
    setShowForm(false);
    setNewAgent({ companyName: "", contactName: "", contactPhone: "", contactEmail: "", region: "", products: [], notes: "" });
  };

  const toggleProduct = (p: string) => {
    setNewAgent(prev => ({
      ...prev,
      products: prev.products.includes(p)
        ? prev.products.filter(x => x !== p)
        : [...prev.products, p]
    }));
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "approved": return <Check className="w-3.5 h-3.5 text-green-600" />;
      case "pending": return <Clock className="w-3.5 h-3.5 text-yellow-600" />;
      case "rejected": return <Ban className="w-3.5 h-3.5 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">代理商管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理代理商注册、审核与报备</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium
            hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增代理商
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "全部", value: agents.length, color: "bg-slate-100" },
          { label: "已通过", value: agents.filter(a => a.status === "approved").length, color: "bg-green-100 text-green-700" },
          { label: "待审核", value: agents.filter(a => a.status === "pending").length, color: "bg-yellow-100 text-yellow-700" },
          { label: "已拒绝", value: agents.filter(a => a.status === "rejected").length, color: "bg-red-100 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Registration form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">代理商注册</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">公司名称 *</label>
                <input type="text" value={newAgent.companyName}
                  onChange={e => setNewAgent(p => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="代理商公司全称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">联系人 *</label>
                  <input type="text" value={newAgent.contactName}
                    onChange={e => setNewAgent(p => ({ ...p, contactName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">联系电话 *</label>
                  <input type="text" value={newAgent.contactPhone}
                    onChange={e => setNewAgent(p => ({ ...p, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">联系邮箱</label>
                <input type="email" value={newAgent.contactEmail}
                  onChange={e => setNewAgent(p => ({ ...p, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">代理区域 *</label>
                <select value={newAgent.region}
                  onChange={e => setNewAgent(p => ({ ...p, region: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">请选择区域</option>
                  <option value="华东">华东</option>
                  <option value="华南">华南</option>
                  <option value="华北">华北</option>
                  <option value="华中">华中</option>
                  <option value="西南">西南</option>
                  <option value="西北">西北</option>
                  <option value="东北">东北</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">代理产品线</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map(p => (
                    <button key={p.value}
                      onClick={() => toggleProduct(p.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                        ${newAgent.products.includes(p.label)
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
                <textarea value={newAgent.notes}
                  onChange={e => setNewAgent(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="其他说明..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  提交注册
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索代理商..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(agent => (
          <div key={agent.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">{agent.companyName}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{agent.region}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${AGENT_STATUS_MAP[agent.status]?.color}`}>
                <StatusIcon status={agent.status} />
                {AGENT_STATUS_MAP[agent.status]?.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">联系人：{agent.contactName}</p>
              <p className="text-xs text-slate-500">电话：{agent.contactPhone}</p>
              <p className="text-xs text-slate-500">邮箱：{agent.contactEmail}</p>
            </div>
            {agent.products.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {agent.products.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500">
                    {p}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              注册日期：{agent.registerDate}
              {agent.approvedDate && ` · 审核：${agent.approvedDate}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
