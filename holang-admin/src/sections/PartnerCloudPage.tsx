// ============================================================
// Partner Cloud Integration Page
// ============================================================

import { useState } from "react";
import { MOCK_PARTNER_CLOUD } from "@/data/mockData";
import type { PartnerCloudConfig } from "@/types";
import { Cloud, Plug, RefreshCw, ExternalLink, AlertCircle, Settings } from "lucide-react";

export function PartnerCloudPage() {
  const [configs] = useState<PartnerCloudConfig[]>(MOCK_PARTNER_CLOUD);

  const statusBadge = (status: string) => {
    switch (status) {
      case "connected": return { label: "已连接", color: "bg-green-100 text-green-700", icon: Plug };
      case "disconnected": return { label: "未连接", color: "bg-slate-100 text-slate-500", icon: Plug };
      case "error": return { label: "异常", color: "bg-red-100 text-red-700", icon: AlertCircle };
      default: return { label: "未知", color: "bg-gray-100 text-gray-500", icon: AlertCircle };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">伙伴云集成</h1>
        <p className="text-sm text-slate-500 mt-1">管理第三方平台API对接，实现数据同步和业务协作</p>
      </div>

      {/* Info banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800">云端集成中心</h3>
            <p className="text-xs text-blue-600 mt-1">
              所有集成服务均在云端运行，无需本地部署。连接后即可实现数据自动同步。
              官网预留代理商报备入口，公众号通过在线客服对接。
            </p>
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map(c => {
          const badge = statusBadge(c.status);
          const BadgeIcon = badge.icon;
          return (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                  <BadgeIcon className="w-3 h-3" />
                  {badge.label}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-700">{c.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">{c.description}</p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>API Endpoint</span>
                  <code className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">{c.apiEndpoint}</code>
                </div>
                {c.lastSync && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>上次同步</span>
                    <span>{new Date(c.lastSync).toLocaleString("zh-CN")}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                {c.status === "disconnected" ? (
                  <button className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
                    <Plug className="w-3 h-3" />
                    连接
                  </button>
                ) : (
                  <button className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    同步
                  </button>
                )}
                <button className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add integration placeholder */}
      <button className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
        <Cloud className="w-4 h-4" />
        <span className="text-sm">添加新的云集成</span>
      </button>

      {/* Channel info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-500" />
            官网入口
          </h4>
          <p className="text-xs text-slate-500 mt-2">
            在官网预留"代理商报备"入口，访问者可直接提交代理商注册申请，数据自动同步到本系统。
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-green-500" />
            公众号入口
          </h4>
          <p className="text-xs text-slate-500 mt-2">
            微信公众号通过在线客服入口对接，客服人员可在后台直接提交代理商报备信息。
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-purple-500" />
            伙伴云 API
          </h4>
          <p className="text-xs text-slate-500 mt-2">
            通过伙伴云 API 实现数据互通，自动同步客户数据、商机信息和订单状态。
            建议访问伙伴云官网了解最新 API 文档。
          </p>
        </div>
      </div>
    </div>
  );
}
