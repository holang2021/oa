// ============================================================
// Dashboard Page - Data overview
// ============================================================

import { useMemo } from "react";
import { MOCK_QUOTATIONS, MOCK_AGENTS, QUOTATION_STATUS_MAP } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  FileText, Users, DollarSign,
  Clock, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import type { Quotation } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function DashboardPage() {
  const stats = useMemo(() => {
    const quotations: Quotation[] = MOCK_QUOTATIONS;
    const agents = MOCK_AGENTS;
    const now = new Date();
    const thisMonth = quotations.filter(q => {
      const d = new Date(q.quoteDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const statusCount: Record<string, number> = {};
    quotations.forEach(q => {
      statusCount[q.status] = (statusCount[q.status] || 0) + 1;
    });

    const customers: Record<string, number> = {};
    quotations.forEach(q => {
      customers[q.customerName] = (customers[q.customerName] || 0) + q.subtotal;
    });
    const topCustomers = Object.entries(customers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return {
      totalQuotations: quotations.length,
      totalAmount: quotations.reduce((s, q) => s + q.subtotal, 0),
      activeAgents: agents.filter(a => a.status === "approved").length,
      pendingAgents: agents.filter(a => a.status === "pending").length,
      monthlyQuotations: thisMonth.length,
      monthlyAmount: thisMonth.reduce((s, q) => s + q.subtotal, 0),
      recentQuotations: [...quotations].sort((a, b) => b.quoteDate.localeCompare(a.quoteDate)).slice(0, 5),
      statusChart: Object.entries(statusCount).map(([name, value]) => ({
        name: QUOTATION_STATUS_MAP[name]?.label || name,
        value
      })),
      topCustomers,
      monthlyData: [
        { month: "1月", amount: 0, count: 0 },
        { month: "2月", amount: 0, count: 0 },
        { month: "3月", amount: 58500, count: 1 },
        { month: "4月", amount: 368100, count: 2 },
        { month: "5月", amount: 0, count: 0 },
        { month: "6月", amount: 496000, count: 2 },
      ],
    };
  }, []);

  const StatCard = ({ icon: Icon, label, value, trend, trendUp }: {
    icon: React.ElementType; label: string; value: string; trend: string; trendUp?: boolean;
  }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">数据看板</h1>
        <p className="text-sm text-slate-500 mt-1">HOLANG 内部管理核心指标概览</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="报价单总数" value={String(stats.totalQuotations)} trend="+2 本月" trendUp />
        <StatCard icon={DollarSign} label="报价总额" value={`¥${(stats.totalAmount / 10000).toFixed(1)}万`} trend="+¥49.6万" trendUp />
        <StatCard icon={Users} label="活跃代理商" value={String(stats.activeAgents)} trend={`${stats.pendingAgents} 待审核`} />
        <StatCard icon={Clock} label="本月报价" value={String(stats.monthlyQuotations)} trend="截至当前" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">月度报价趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(val: number) => [`¥${val.toLocaleString()}`, "报价金额"]}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">报价状态分布</h3>
          {stats.statusChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.statusChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value: string) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* Recent quotations + Top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent quotations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">最近报价</h3>
          <div className="space-y-3">
            {stats.recentQuotations.map(q => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{q.customerName}</p>
                  <p className="text-xs text-slate-400">{q.quoteNo} · {q.quoteDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">¥{q.subtotal.toLocaleString()}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${QUOTATION_STATUS_MAP[q.status]?.color}`}>
                    {QUOTATION_STATUS_MAP[q.status]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">客户报价排名</h3>
          <div className="space-y-3">
            {stats.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-slate-600 truncate">{c.name}</span>
                <span className="text-sm font-semibold text-slate-700">¥{c.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
