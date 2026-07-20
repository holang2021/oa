// ============================================================
// Sidebar Layout - Responsive navigation
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, FileText, Users, Cloud, BarChart3,
  Menu, LogOut, ChevronDown, Factory, User, Inbox
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "数据看板", icon: LayoutDashboard },
  {
    label: "报价管理",
    icon: FileText,
    children: [
      { path: "/quotations", label: "报价列表" },
      { path: "/quotations/new", label: "新建报价" },
    ]
  },
  { path: "/approval-inbox", label: "待我审批", icon: Inbox, badge: "pending" },
  { path: "/agents", label: "代理商管理", icon: Users },
  { path: "/partner-cloud", label: "伙伴云", icon: Cloud },
  { path: "/reports", label: "报表中心", icon: BarChart3 },
  {
    label: "引擎中心",
    icon: Factory,
    children: [
      { path: "/form-designer", label: "表单设计器" },
      { path: "/approval-demo", label: "审批引擎" },
    ]
  },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string>("报价管理");
  const [pendingCount, setPendingCount] = useState(0);

  // 待我审批角标：拉取 pending 数量（approval-api 未启动则静默为 0）
  useEffect(() => {
    let cancelled = false;
    fetch("http://localhost:3003/api/approvals?status=pending")
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: unknown[]) => {
        if (!cancelled) setPendingCount(Array.isArray(arr) ? arr.length : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: typeof NAV_ITEMS[0]) => {
    if ("children" in item && item.children) {
      return item.children.some(c => location.pathname === c.path);
    }
    return false;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">HOLANG</h1>
            <p className="text-[10px] text-slate-500">统一办公平台</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{user?.displayName}</p>
              <p className="text-xs text-slate-400">{user?.role === "admin" ? "管理员" : user?.role === "sales" ? "销售" : "经理"}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if ("children" in item && item.children) {
              const isOpen = expandedMenu === item.label;
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setExpandedMenu(isOpen ? "" : item.label)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                      transition-colors
                      ${isParentActive(item)
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100"}
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="ml-9 mt-1 space-y-0.5">
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          onClick={() => { navigate(child.path); setSidebarOpen(false); }}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                            ${isActive(child.path)
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}
                          `}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-colors mb-0.5
                  ${isActive(item.path)
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"}
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {(item as { badge?: string }).badge === "pending" && pendingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-14 flex items-center gap-3 px-4 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <Factory className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm text-slate-800">HOLANG OA</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
