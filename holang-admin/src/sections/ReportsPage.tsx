// ============================================================
// Reports Page - Weekly/Monthly/Daily reports (reserved)
// ============================================================

import { useState } from "react";
import { MOCK_REPORTS } from "@/data/mockData";
import type { Report, ReportType } from "@/types";
import { BarChart3, FileText, Clock, Plus, Calendar, Download } from "lucide-react";

const REPORT_TYPE_LABELS: Record<ReportType, { label: string; icon: React.ElementType }> = {
  daily: { label: "日报", icon: Clock },
  weekly: { label: "周报", icon: Calendar },
  monthly: { label: "月报", icon: BarChart3 },
};

export function ReportsPage() {
  const [reports] = useState<Report[]>(MOCK_REPORTS);
  const [activeTab, setActiveTab] = useState<ReportType>("weekly");

  const filtered = reports.filter(r => r.type === activeTab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报表中心</h1>
          <p className="text-sm text-slate-500 mt-1">销售日报、周报、月报 — 当前为预留模块</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium
            hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          生成报表
        </button>
      </div>

      {/* Pre-release notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">功能预告</h3>
            <p className="text-xs text-amber-600 mt-1">
              报表中心正在建设中。届时将支持自动生成销售日报/周报/月报，
              推送目标可根据需求自定义（企微/邮件/飞书），所有报表数据存储在云端。
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, typeof REPORT_TYPE_LABELS[keyof typeof REPORT_TYPE_LABELS]][]).map(([type, { label, icon: Icon }]) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === type
                ? "bg-white text-blue-600 border border-slate-200 border-b-white -mb-px"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">暂无{REPORT_TYPE_LABELS[activeTab].label}记录</p>
            <p className="text-xs text-slate-300 mt-1">点击"生成报表"创建第一份报告</p>
          </div>
        ) : (
          filtered.map(report => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-700">{report.title}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium
                      ${report.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {report.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{report.period} · {report.createdAt}</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mt-3">{report.content}</p>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-400">报价数</p>
                  <p className="text-lg font-bold text-slate-700">{report.metrics.totalQuotations}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-400">报价总额</p>
                  <p className="text-lg font-bold text-slate-700">¥{(report.metrics.totalAmount / 10000).toFixed(1)}万</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-400">新客户</p>
                  <p className="text-lg font-bold text-slate-700">{report.metrics.newCustomers}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-400">新代理商</p>
                  <p className="text-lg font-bold text-slate-700">{report.metrics.newAgents}</p>
                </div>
              </div>

              {/* Push targets placeholder */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-xs text-slate-400">推送目标：</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">企微</span>
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">邮件</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-medium">飞书</span>
                <span className="text-[10px] text-slate-300 ml-auto">可自定义配置</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
