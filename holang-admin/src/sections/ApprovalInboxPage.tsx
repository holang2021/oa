// ============================================================
// 待我审批 — 审批收件箱（接 approval-api 列表）
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, RefreshCw, ChevronRight, Clock } from "lucide-react";
import { BIZ_TYPE_LABELS } from "@/approval-engine/config";

const API = "http://localhost:3003";

interface ApprovalListItem {
  bizType: string;
  bizRecordId: string;
  status: string;
  currentLevel: number;
  currentProgress: string;
  startedAt: string;
  levels: { level: number; name: string; status: string }[];
}

export function ApprovalInboxPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/approvals?status=pending`);
      if (res.ok) {
        const data = (await res.json()) as ApprovalListItem[];
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // approval-api 未启动：静默留空，不阻断页面
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">待我审批</h1>
          <p className="text-sm text-slate-500 mt-1">共 {items.length} 条待处理</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-slate-400 py-20">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          暂无待审批事项
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const levelName =
              it.levels?.find((l) => l.level === it.currentLevel)?.name || "审批中";
            const label = (BIZ_TYPE_LABELS as Record<string, string>)[it.bizType] || it.bizType;
            return (
              <button
                key={`${it.bizType}/${it.bizRecordId}`}
                onClick={() => navigate(`/approval-demo?biz=${it.bizType}&id=${it.bizRecordId}`)}
                className="card w-full flex items-center gap-4 p-4 text-left hover:border-brand-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{label}</span>
                    <span className="font-mono text-xs text-slate-400">{it.bizRecordId}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {levelName} · {it.currentProgress}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {(it.startedAt || "").slice(0, 10)}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        数据来自 approval-api（本地 JSON，端口 3003）。如列表为空，请确认已启动 <code>npm run approval:api</code>。
      </p>
    </div>
  );
}
