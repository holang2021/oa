import { useState, ReactNode, useMemo } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShieldCheck, FileText,
  Menu, X, LogOut, ChevronDown, ChevronRight, ClipboardCheck, Database,
  ShoppingBag, Receipt, Truck, TrendingUp, Globe, Flag,
  Building2, BookUser, Factory, ShoppingCart, Wrench,
  Palette, CreditCard, HardDrive, Boxes, Settings, History,
  Bell, Target, BarChart3, Clock, Cpu, Shield, RefreshCw,
  Megaphone, PieChart, Languages, MessageCircle, Trash2,
  ArrowLeft, Printer
} from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getCurrentRole } from '../services/rbacStore'
import type { Role } from '../types/rbac'

interface NavGroup {
  id: string; labelKey: string; domainKey: string; icon: any
  items: { to: string; labelKey: string; icon: any }[]
}

function buildNavGroups(t: (k: string) => string, currentRole: Role | null): NavGroup[] {
  const domestic = t('nav.domestic')

  // 权限过滤函数：只返回当前角色有权限的菜单项
  const filterItems = (items: { to: string; labelKey: string; icon: any }[]) => {
    if (!currentRole) return items // 未登录或角色未找到，降级显示全部
    return items.filter(item => currentRole.menuPermissions.includes(item.to as any))
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

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
  }

  const navGroups = buildNavGroups(t, currentRole)
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
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-3 py-2 text-xs text-gray-400 border-b">{t('header.admin')}</div>
                  <button onClick={() => { setUserMenuOpen(false); onLogout() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><LogOut size={14} />{t('header.logout')}</button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
