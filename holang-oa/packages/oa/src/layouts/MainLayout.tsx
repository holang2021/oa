import { useState, useEffect, ReactNode, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShieldCheck, FileText,
  Menu, X, LogOut, ChevronDown, ChevronRight, ClipboardCheck, Database,
  ShoppingBag, Receipt, Truck, TrendingUp, Globe, Flag,
  Building2, BookUser, Factory, ShoppingCart, Wrench,
  Palette, CreditCard, HardDrive, Boxes, Settings, History,
  Bell, Target, BarChart3, Clock, Cpu, Shield, RefreshCw,
  Megaphone, PieChart, Languages, MessageCircle, Trash2,
  ArrowLeft, Printer, UserCog, User, ShieldAlert, BookOpen, UserX, Inbox
} from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getCurrentRole, canAccessPage } from '../services/rbacStore'
import { getCurrentUser, UserInfo } from '../services/authService'
import { api } from '../services/api'
import { getViewMode, setViewMode, subscribeViewMode, ADMIN_ONLY_PATHS, type ViewMode } from '../services/viewModeStore'
import type { Role } from '../types/rbac'

interface NavGroup {
  id: string; labelKey: string; domainKey: string; icon: any
  items: { to: string; labelKey: string; icon: any }[]
}

function buildNavGroups(t: (k: string) => string, currentRole: Role | null, viewMode: ViewMode): NavGroup[] {
  const domestic = t('nav.domestic')

  // 权限过滤函数：只返回当前角色有权限的菜单项
  // 直接复用 canAccessPage（与路由守卫同一判定源），保证「导航可见」与「实际可访问」严格一致，
  // 杜绝角色缺失时降级为「显示全部」的安全反模式。
  const filterItems = (items: { to: string; labelKey: string; icon: any }[]) => {
    return items.filter(item => canAccessPage(item.to))
  }

  const allGroups: NavGroup[] = [
    {
      id: 'dashboard', labelKey: 'domain.dashboard', domainKey: '', icon: LayoutDashboard,
      items: filterItems([
        { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      ])
    },
    {
      id: 'product', labelKey: 'domain.product', domainKey: '', icon: Package,
      items: filterItems([
        { to: '/products', labelKey: 'nav.products', icon: Package }
      ])
    },
    {
      id: 'crm-domestic', labelKey: 'nav.crm_domestic', domainKey: '', icon: Flag,
      items: filterItems([
        { to: '/domestic/customers', labelKey: 'nav.customers', icon: Users },
        { to: '/domestic/leads', labelKey: 'nav.leads', icon: TrendingUp },
        { to: '/dealer-reports', labelKey: 'nav.dealerReports', icon: ClipboardCheck },
        { to: '/partners', labelKey: 'nav.partners', icon: Building2 },
        { to: '/domestic/opportunities', labelKey: 'nav.opportunities', icon: Target },
        { to: '/domestic/quotations', labelKey: 'nav.quotations', icon: FileText },
        { to: '/domestic/orders', labelKey: 'nav.orders', icon: ShoppingBag },
        { to: '/domestic/collections', labelKey: 'nav.collections', icon: Receipt },
        { to: '/domestic/deliveries', labelKey: 'nav.deliveries', icon: Truck },
      ])
    },
    {
      id: 'crm-export', labelKey: 'nav.crm_export', domainKey: '', icon: Globe,
      items: filterItems([
        { to: '/export/customers', labelKey: 'nav.customers', icon: Users },
        { to: '/export/leads', labelKey: 'nav.leads', icon: TrendingUp },
        { to: '/partners', labelKey: 'nav.partners', icon: Building2 },
        { to: '/export/opportunities', labelKey: 'nav.opportunities', icon: Target },
        { to: '/export/quotations', labelKey: 'nav.quotations', icon: FileText },
        { to: '/export/orders', labelKey: 'nav.orders', icon: ShoppingBag },
        { to: '/export/collections', labelKey: 'nav.collections', icon: Receipt },
        { to: '/export/deliveries', labelKey: 'nav.deliveries', icon: Truck },
        { to: '/export/whatsapp', labelKey: 'nav.whatsapp', icon: MessageCircle },
      ])
    },
    {
      id: 'aftersales', labelKey: 'domain.aftersales', domainKey: 'domain.aftersales_tag', icon: Wrench,
      items: filterItems([
        { to: '/aftersales/visits', labelKey: 'nav.visits', icon: Users },
        { to: '/aftersales/tickets', labelKey: 'nav.tickets', icon: ClipboardCheck },
        { to: '/aftersales/returns', labelKey: 'nav.returns', icon: RefreshCw },
      ])
    },
    {
      id: 'srm', labelKey: 'domain.srm', domainKey: 'domain.srm_tag', icon: ShoppingCart,
      items: filterItems([
        { to: '/srm/suppliers', labelKey: 'nav.suppliers', icon: Users },
        { to: '/srm/inquiries', labelKey: 'nav.inquiries', icon: FileText },
        { to: '/srm/orders', labelKey: 'nav.purchaseOrders', icon: ShoppingBag },
        { to: '/srm/receive', labelKey: 'nav.receive', icon: Truck },
        { to: '/srm/payables', labelKey: 'nav.payables', icon: CreditCard },
      ])
    },
    {
      id: 'erp-production', labelKey: 'nav.erp_production', domainKey: '', icon: Factory,
      items: filterItems([
        { to: '/erp/bom', labelKey: 'nav.bom', icon: HardDrive },
        { to: '/erp/work-orders', labelKey: 'nav.workOrders', icon: ClipboardCheck },
        { to: '/erp/schedule', labelKey: 'nav.schedule', icon: LayoutDashboard },
        { to: '/erp/reporting', labelKey: 'nav.reporting', icon: FileText },
        { to: '/erp/quality', labelKey: 'nav.quality', icon: ShieldCheck },
        { to: '/erp/intelligent-material', labelKey: 'nav.intelligentMaterial', icon: Cpu },
      ])
    },
    {
      id: 'erp-warehouse', labelKey: 'nav.erp_warehouse', domainKey: '', icon: HardDrive,
      items: filterItems([
        { to: '/erp/inventory', labelKey: 'nav.inventory', icon: Boxes },
        { to: '/erp/inbound', labelKey: 'nav.inbound', icon: ShoppingBag },
        { to: '/erp/outbound', labelKey: 'nav.outbound', icon: Truck },
        { to: '/erp/transfer', labelKey: 'nav.transfer', icon: Truck },
        { to: '/erp/stock-check', labelKey: 'nav.stockCheck', icon: ClipboardCheck },
      ])
    },
    {
      id: 'erp-finance', labelKey: 'nav.erp_finance', domainKey: '', icon: CreditCard,
      items: filterItems([
        { to: '/erp/ar', labelKey: 'nav.ar', icon: Receipt },
        { to: '/erp/ap', labelKey: 'nav.ap', icon: CreditCard },
        { to: '/erp/invoices', labelKey: 'nav.invoices', icon: FileText },
        { to: '/erp/accounts', labelKey: 'nav.accounts', icon: CreditCard },
      ])
    },
    {
      id: 'analytics', labelKey: 'domain.analytics', domainKey: 'domain.analytics_tag', icon: BarChart3,
      items: filterItems([
        { to: '/analytics/customers', labelKey: 'nav.analyticsCustomers', icon: PieChart },
        { to: '/analytics/opportunities', labelKey: 'nav.analyticsOpps', icon: PieChart },
        { to: '/analytics/collections', labelKey: 'nav.analyticsCollections', icon: PieChart },
      ])
    },
    {
      id: 'org', labelKey: 'domain.org', domainKey: 'domain.org_tag', icon: Building2,
      items: filterItems([
        { to: '/org/contacts', labelKey: 'nav.contacts', icon: BookUser },
        { to: '/org/roles', labelKey: 'nav.roles', icon: ShieldCheck },
        { to: '/org/offboarding', labelKey: 'nav.offboarding', icon: UserX },
        { to: '/org/offboarding-todos', labelKey: 'nav.offboardingTodos', icon: Inbox },
      ])
    },
    {
      id: 'tools', labelKey: 'domain.tools', domainKey: 'domain.tools_tag', icon: Database,
      items: filterItems([
        { to: '/tools/approval', labelKey: 'nav.approval', icon: ClipboardCheck },
        { to: '/tools/templates', labelKey: 'nav.templates', icon: FileText },
        { to: '/tools/stats', labelKey: 'nav.stats', icon: BarChart3 },
        { to: '/tools/print-templates', labelKey: 'nav.printTemplates', icon: Printer },
        { to: '/tools/trash', labelKey: 'nav.trash', icon: Trash2 },
        { to: '/tools/config', labelKey: 'nav.config', icon: Settings },
        { to: '/tools/feishu-wiki', labelKey: 'nav.feishuWiki', icon: BookOpen },
      ])
    },
  ]

  // 过滤掉没有菜单项的空分组
  return allGroups.filter(group => group.items.length > 0)
}

export default function MainLayout({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  const { t, lang, toggleLang } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
  })
  const location = useLocation()
  const navigate = useNavigate()
  const isRoot = location.pathname === '/dashboard'

  const currentRole = useMemo(() => getCurrentRole(), [])
  // currentUser 用 state：登录/刷新后 oa_user 会更新，需响应变化
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => getCurrentUser())
  // 以 JWT/后端真实角色为准（前端 mock employee 表可能未同步）
  const isAdmin = currentUser?.role === 'ADMIN'
  const [confirmAdminOpen, setConfirmAdminOpen] = useState(false)

  // 监听 localStorage 变化，刷新当前用户
  useEffect(() => {
    const refreshUser = () => setCurrentUser(getCurrentUser())
    refreshUser()
    window.addEventListener('storage', refreshUser)
    return () => window.removeEventListener('storage', refreshUser)
  }, [])

  const [viewMode, setViewModeState] = useState<ViewMode>(() => getViewMode())
  useEffect(() => subscribeViewMode(() => setViewModeState(getViewMode())), [])

  // 安全兜底：非管理员身份时，强制切回用户身份，防止 localStorage 残留 admin 视图
  useEffect(() => {
    if (!isAdmin && viewMode === 'admin') {
      setViewMode('user')
      setViewModeState('user')
      navigate('/dashboard')
    }
  }, [isAdmin, viewMode, navigate])

  // 身份切换写审计（后端 /rbac/view-mode，仅 ADMIN 可记录）
  const recordSwitchAudit = (mode: ViewMode, from: ViewMode) => {
    api.post('/rbac/view-mode', { mode, from }).catch(() => {})
  }

  const applyViewMode = (mode: ViewMode) => {
    if (mode === viewMode) return
    const from = viewMode
    setViewMode(mode)
    setViewModeState(mode)
    recordSwitchAudit(mode, from)
    // 切到用户身份时若停留在配置层页面，跳回工作台避免迷路
    if (mode === 'user' && ADMIN_ONLY_PATHS.has(location.pathname)) {
      navigate('/dashboard')
    }
  }

  // 进入管理员身份需二次确认（防误触）
  const requestAdminMode = () => {
    if (viewMode === 'admin') return
    setConfirmAdminOpen(true)
  }

  const confirmSwitchToAdmin = () => {
    setConfirmAdminOpen(false)
    applyViewMode('admin')
  }

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
  }

  const navGroups = buildNavGroups(t, currentRole, viewMode)
  const toggleGroup = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  const isGroupActive = (group: NavGroup) =>
    group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))

  const getCurrentLabel = (): string => {
    for (const g of navGroups) {
      for (const item of g.items) {
        if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) {
          return `${t(g.labelKey)} · ${t(item.labelKey)}`
        }
      }
    }
    return t('app.name')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-brand-900 text-white flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'} ${sidebarCollapsed && !sidebarOpen ? 'lg:w-16' : 'lg:w-64'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-brand-800 shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden transition-all ${sidebarCollapsed && !sidebarOpen ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <img src="/HOLANG.png" alt="HOLANG" className="w-9 h-9 rounded-lg bg-white object-contain shrink-0" />
            <div className="whitespace-nowrap">
              <div className="text-sm font-semibold">{t('app.name')}</div>
              <div className="text-[10px] text-brand-300">{t('app.subtitle')}</div>
            </div>
          </div>
          <div className="flex items-center">
            <button
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-brand-800 text-brand-300 hover:text-white transition-colors"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} className="-rotate-90" />}
            </button>
            <button className="lg:hidden text-white ml-2" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
          {navGroups.map(group => {
            const active = isGroupActive(group)
            const isCollapsed = collapsed[group.id]
            return (
              <div key={group.id}>
                <button onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'text-white' : 'text-brand-300 hover:text-white'} ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-2' : ''}`}>
                  <group.icon size={16} />
                  <span className={`flex-1 text-left transition-all overflow-hidden ${sidebarCollapsed && !sidebarOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    {t(group.labelKey)}
                    {group.domainKey && <span className="ml-1 text-[9px] opacity-40">[{t(group.domainKey)}]</span>}
                  </span>
                  <ChevronDown size={12} className={`transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''} ${sidebarCollapsed && !sidebarOpen ? 'hidden' : ''}`} />
                </button>
                {!isCollapsed && !(sidebarCollapsed && !sidebarOpen) && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {group.items.map(item => (
                      <NavLink key={item.to} to={item.to} end onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${isActive ? 'bg-brand-700 text-white font-medium' : 'text-brand-200 hover:bg-brand-800 hover:text-white'}`}>
                        <item.icon size={14} />{t(item.labelKey)}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className={`px-3 py-3 border-t border-brand-800 text-[10px] text-brand-400 transition-all overflow-hidden ${sidebarCollapsed && !sidebarOpen ? 'opacity-0 h-0 py-0 px-0' : 'opacity-100'}`}>
          {t('app.version')}
          {currentRole && (
            <div className="mt-1 text-brand-300">角色：{currentRole.name}</div>
          )}
          <div className="mt-0.5 text-brand-300">
            身份：{viewMode === 'admin' ? '管理员身份' : '用户身份'}
            {viewMode === 'user' && <span className="ml-1 opacity-60">（使用层·防误改）</span>}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            {!isRoot && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200"
                title="返回上一页"
              >
                <ArrowLeft size={14} />
                返回
              </button>
            )}
            <div className="text-sm text-gray-500">{getCurrentLabel()}</div>
          </div>
          <div className="relative flex items-center gap-2">
            <button onClick={toggleLang} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors" title={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
              <Languages size={14} className="text-gray-400" />
              <span className="text-gray-500">{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center"><span className="text-brand-700 text-xs font-semibold">{lang === 'zh' ? '刘' : 'L'}</span></div>
              <span className="text-sm text-gray-700 hidden sm:inline">{lang === 'zh' ? '刘世光' : 'Admin'}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-3 py-2 text-xs text-gray-400 border-b">{currentUser?.name || t('header.admin')} · {currentUser?.role || currentRole?.name || '未知角色'}</div>
                  {/* 身份切换：仅管理员可见，独立分区 + 二次确认防误触 */}
                  {isAdmin && (
                    <div className="px-3 py-2.5 border-b border-gray-100">
                      <div className="text-[11px] text-gray-400 mb-1.5">身份切换（防误操作）</div>
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 border border-gray-200">
                        <button
                          onClick={() => { setUserMenuOpen(false); applyViewMode('user') }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'user' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <User size={13} />用户身份
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); requestAdminMode() }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'admin' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <UserCog size={13} />管理员身份
                        </button>
                      </div>
                      <div className="mt-1.5 text-[10px] text-gray-400 leading-tight">
                        {viewMode === 'admin'
                          ? '当前：配置层（可改设置/角色/权限）'
                          : '当前：使用层（按本人业务角色操作）'}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setUserMenuOpen(false); onLogout() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><LogOut size={14} />{t('header.logout')}</button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {isAdmin && viewMode === 'admin' && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800">
              <ShieldAlert size={16} className="shrink-0" />
              <span className="text-xs font-medium flex-1">
                管理员身份 · 配置层：您正在后台，可修改系统设置 / 角色权限 / 组织结构。误操作可能影响系统，完成后请及时切回「用户身份」。
              </span>
              <button onClick={() => applyViewMode('user')} className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 shrink-0">切回用户身份</button>
            </div>
          )}
          {children}
        </main>
      </div>
      {confirmAdminOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmAdminOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <ShieldAlert size={18} />
              <span className="text-sm font-semibold">进入管理员身份（配置层）</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              管理员身份下您可修改系统设置、角色与权限、组织结构和数据。误操作可能影响系统运行。
              如仅日常使用，请停留在「用户身份」。确认进入？
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAdminOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 border border-gray-200">取消</button>
              <button onClick={confirmSwitchToAdmin} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-500 hover:bg-amber-600">确认进入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
