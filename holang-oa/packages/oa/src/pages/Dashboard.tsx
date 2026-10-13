import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import {
  Inbox, Clock, CheckCircle2, Bell, TrendingUp, Users, DollarSign, Package,
  ArrowRight, AlertCircle, Target, ClipboardCheck, ShoppingCart, Truck,
  Plus, X, GripVertical, Settings, BarChart3, FileText, Search,
  ChevronUp, ChevronDown, LayoutTemplate,
  Maximize2, Move, ExternalLink, RefreshCcw
} from 'lucide-react'
import { dashboardService, DashStats, PipelineItem, ActivityItem, SalesRankItem } from '../services/dashboardService'

// 解码数据库存储的 HTML 实体（客户名/跟进内容里的 &amp; 等）
function decodeHtml(s?: string | null): string {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

const TOP_STAT_STYLES: Record<string, { bg: string; text: string; line: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', line: 'bg-blue-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', line: 'bg-green-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', line: 'bg-amber-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', line: 'bg-red-500' },
}

// Widget types
type WidgetType = 'my_todos' | 'my_flows' | 'my_customers' | 'my_leads' | 'my_opps' | 'my_quotations' |
  'my_orders' | 'my_collections' | 'stats' | 'pipeline' | 'recent_activity' | 'notifications' |
  'calendar' | 'quick_stats' | 'custom_page'

type WidgetHeight = 'sm' | 'md' | 'lg' | 'auto'
type WidgetWidth = 1 | 2 | 3 | 4

interface WidgetDef {
  id: WidgetType
  titleKey: string
  icon: any
  defaultW: WidgetWidth
  defaultH: WidgetHeight
  availableRoles: string[]
  allowCustom?: boolean
}

interface LayoutItem {
  id: WidgetType
  w: WidgetWidth
  h: WidgetHeight
  customTitle?: string
  customUrl?: string
}

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'my_todos', titleKey: 'widget.todos', icon: Clock, defaultW: 1, defaultH: 'auto', availableRoles: ['*'] },
  { id: 'my_flows', titleKey: 'widget.flows', icon: Inbox, defaultW: 1, defaultH: 'auto', availableRoles: ['*'] },
  { id: 'my_customers', titleKey: 'widget.customers', icon: Users, defaultW: 2, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_leads', titleKey: 'widget.leads', icon: TrendingUp, defaultW: 2, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_opps', titleKey: 'widget.opps', icon: Target, defaultW: 2, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_quotations', titleKey: 'widget.quotations', icon: FileText, defaultW: 2, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_orders', titleKey: 'widget.orders', icon: Package, defaultW: 2, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm', 'warehouse'] },
  { id: 'my_collections', titleKey: 'widget.collections', icon: DollarSign, defaultW: 1, defaultH: 'auto', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm', 'finance'] },
  { id: 'stats', titleKey: 'widget.stats', icon: BarChart3, defaultW: 4, defaultH: 'auto', availableRoles: ['*'] },
  { id: 'pipeline', titleKey: 'widget.pipeline', icon: TrendingUp, defaultW: 4, defaultH: 'md', availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'recent_activity', titleKey: 'widget.activity', icon: Clock, defaultW: 1, defaultH: 'auto', availableRoles: ['*'] },
  { id: 'notifications', titleKey: 'widget.messages', icon: Bell, defaultW: 1, defaultH: 'auto', availableRoles: ['*'] },
  { id: 'custom_page', titleKey: 'widget.customPage', icon: ExternalLink, defaultW: 2, defaultH: 'lg', availableRoles: ['*'], allowCustom: true },
]

const DEFAULT_LAYOUTS: Record<string, LayoutItem[]> = {
  gm: [
    { id: 'stats', w: 4, h: 'auto' },
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_flows', w: 1, h: 'auto' },
    { id: 'recent_activity', w: 1, h: 'auto' },
    { id: 'notifications', w: 1, h: 'auto' },
    { id: 'pipeline', w: 4, h: 'md' },
    { id: 'my_customers', w: 2, h: 'auto' },
    { id: 'my_leads', w: 2, h: 'auto' },
  ],
  sales: [
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_customers', w: 2, h: 'auto' },
    { id: 'my_leads', w: 2, h: 'auto' },
    { id: 'my_opps', w: 2, h: 'auto' },
    { id: 'my_quotations', w: 2, h: 'auto' },
    { id: 'my_orders', w: 2, h: 'auto' },
    { id: 'stats', w: 4, h: 'auto' },
  ],
  sales_manager: [
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'stats', w: 4, h: 'auto' },
    { id: 'my_customers', w: 2, h: 'auto' },
    { id: 'my_leads', w: 2, h: 'auto' },
    { id: 'my_opps', w: 2, h: 'auto' },
    { id: 'recent_activity', w: 1, h: 'auto' },
  ],
  sales_director: [
    { id: 'stats', w: 4, h: 'auto' },
    { id: 'pipeline', w: 4, h: 'md' },
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_customers', w: 2, h: 'auto' },
    { id: 'my_leads', w: 2, h: 'auto' },
    { id: 'recent_activity', w: 1, h: 'auto' },
  ],
  buyer: [
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_orders', w: 2, h: 'auto' },
    { id: 'stats', w: 4, h: 'auto' },
    { id: 'recent_activity', w: 1, h: 'auto' },
  ],
  warehouse: [
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_orders', w: 2, h: 'auto' },
    { id: 'stats', w: 4, h: 'auto' },
  ],
  finance: [
    { id: 'my_todos', w: 1, h: 'auto' },
    { id: 'my_flows', w: 1, h: 'auto' },
    { id: 'my_collections', w: 1, h: 'auto' },
    { id: 'stats', w: 4, h: 'auto' },
  ],
}

function getUserRole(): string {
  try { const u = JSON.parse(localStorage.getItem('holang_user') || '{}'); return u.role || 'gm' } catch { return 'gm' }
}

function isAdmin(): boolean {
  const r = getUserRole()
  return r === 'gm' || r === 'admin' || r === 'system_admin'
}

function migrateLayout(raw: any): LayoutItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) => {
    if (typeof item === 'string') return { id: item as WidgetType, w: 2, h: 'auto' }
    return {
      id: item.id as WidgetType,
      w: (item.w || item.size || 2) as WidgetWidth,
      h: (item.h || 'auto') as WidgetHeight,
      customTitle: item.customTitle,
      customUrl: item.customUrl,
    }
  })
}

function loadLayout(role: string): LayoutItem[] {
  const key = 'holang_widgets_v2_' + role
  try {
    const saved = localStorage.getItem(key)
    if (saved) return migrateLayout(JSON.parse(saved))
  } catch {}
  return DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.gm
}

function saveLayout(role: string, layout: LayoutItem[]) {
  localStorage.setItem('holang_widgets_v2_' + role, JSON.stringify(layout))
}

function loadDefaultAdminLayout(role: string): LayoutItem[] | null {
  const key = 'holang_widgets_admin_default_' + role
  try {
    const saved = localStorage.getItem(key)
    if (saved) return migrateLayout(JSON.parse(saved))
  } catch {}
  return null
}

function saveAdminDefaultLayout(role: string, layout: LayoutItem[]) {
  localStorage.setItem('holang_widgets_admin_default_' + role, JSON.stringify(layout))
}

const WIDTH_LABELS: Record<WidgetWidth, string> = { 1: '1列', 2: '2列', 3: '3列', 4: '4列' }
const HEIGHT_LABELS: Record<WidgetHeight, string> = { sm: '小高', md: '中', lg: '大', auto: '自适应' }
const HEIGHT_CLASS: Record<WidgetHeight, string> = { sm: 'max-h-40', md: 'max-h-80', lg: 'max-h-[36rem]', auto: '' }

export default function Dashboard() {
  const { t } = useI18n()
  const role = getUserRole()
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    const adminDefault = loadDefaultAdminLayout(role)
    return adminDefault || loadLayout(role)
  })
  const [showEditor, setShowEditor] = useState(false)
  const [customForm, setCustomForm] = useState<{ open: boolean; title: string; url: string }>({ open: false, title: '', url: '' })
  const [dash, setDash] = useState<{ stats?: DashStats; pipeline?: PipelineItem[]; activities?: ActivityItem[]; ranking?: SalesRankItem[] }>({})
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState('')
  const loadDashboard = useCallback(() => {
    let alive = true
    setDashLoading(true)
    setDashError('')
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getPipelineSummary(),
      dashboardService.getRecentActivities(),
      dashboardService.getSalesRanking(),
    ]).then(([s, p, a, r]) => {
      if (!alive) return
      const failed = [s, p, a, r].find((resp) => resp.code !== 0)
      setDash({
        stats: s.code === 0 ? s.data : undefined,
        pipeline: p.code === 0 ? p.data : undefined,
        activities: a.code === 0 ? a.data : undefined,
        ranking: r.code === 0 ? r.data : undefined,
      })
      setDashError(failed ? failed.message || '工作台数据加载失败' : '')
      setDashLoading(false)
    }).catch((e: any) => {
      if (alive) { setDashError(String(e?.message || e)); setDashLoading(false) }
    })
    return () => { alive = false }
  }, [])
  useEffect(() => loadDashboard(), [loadDashboard])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const availableWidgets = WIDGET_REGISTRY.filter(w => w.availableRoles.includes('*') || w.availableRoles.includes(role))
  const widgetMap = new Map(WIDGET_REGISTRY.map(w => [w.id, w]))

  const persist = useCallback((next: LayoutItem[]) => {
    setLayout(next)
    saveLayout(role, next)
  }, [role])

  const addWidget = (wId: WidgetType) => {
    const def = widgetMap.get(wId)
    if (!def) return
    const next = [...layout, { id: wId, w: def.defaultW, h: def.defaultH }]
    persist(next)
  }

  const addCustomPage = () => {
    if (!customForm.title.trim() || !customForm.url.trim()) return
    const url = customForm.url.trim()
    const next = [...layout, {
      id: 'custom_page' as WidgetType,
      w: 2,
      h: 'lg',
      customTitle: customForm.title.trim(),
      customUrl: url.startsWith('http') ? url : 'https://' + url,
    } as LayoutItem]
    persist(next)
    setCustomForm({ open: false, title: '', url: '' })
  }

  const removeWidget = (idx: number) => {
    const next = layout.filter((_, i) => i !== idx)
    persist(next)
  }

  const moveItem = (from: number, to: number) => {
    if (from === to) return
    const next = [...layout]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    persist(next)
  }

  const changeWidth = (idx: number, w: WidgetWidth) => {
    const next = layout.map((item, i) => i === idx ? { ...item, w } : item)
    persist(next)
  }

  const changeHeight = (idx: number, h: WidgetHeight) => {
    const next = layout.map((item, i) => i === idx ? { ...item, h } : item)
    persist(next)
  }

  const resetLayout = () => {
    const d = DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.gm
    persist([...d])
  }

  const saveAsAdminDefault = () => {
    if (!isAdmin()) return
    saveAdminDefaultLayout(role, layout)
    alert(t('dash.adminDefaultSaved') || '已保存为当前角色的默认工作台布局')
  }

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOverIdx.current = idx
  }
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null) return
    moveItem(dragIdx, idx)
    setDragIdx(null)
    dragOverIdx.current = null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{t('dash.workbench')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('dash.workbenchDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{t('dash.role_' + role)}</span>
          <button onClick={() => setShowEditor(!showEditor)} className={`p-2 rounded-lg text-xs font-medium transition-colors ${showEditor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Fixed Top Stats Bar — always visible, not customizable */}
      <TopStatsBar t={t} stats={dash.stats} loading={dashLoading} />

      {dashError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span>{dashError}</span>
          <button onClick={loadDashboard} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
            <RefreshCcw size={12} /> 重试
          </button>
        </div>
      )}

      {/* Widget Editor Panel */}
      {showEditor && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <LayoutTemplate size={14} /> {t('dash.customizeWorkbench') || '自定义工作台'}
            </h3>
            <div className="flex items-center gap-2">
              {isAdmin() && (
                <button onClick={saveAsAdminDefault} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">
                  {t('dash.saveAsAdminDefault') || '设为默认布局'}
                </button>
              )}
              <button onClick={resetLayout} className="text-xs text-gray-400 hover:text-gray-600">{t('dash.resetDefault') || '恢复默认'}</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">{t('dash.customizeHint') || '点击添加组件；拖动卡片标题排序；使用宽高按钮自由调节'}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {availableWidgets.filter(w => w.id !== 'custom_page' && !layout.some(l => l.id === w.id)).map(w => (
              <button key={w.id} onClick={() => addWidget(w.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Plus size={12} /> {t(w.titleKey)}
              </button>
            ))}
            <button onClick={() => setCustomForm({ open: true, title: '', url: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <ExternalLink size={12} /> {t('dash.addCustomPage') || '添加自定义页面'}
            </button>
          </div>
          {availableWidgets.filter(w => w.id !== 'custom_page' && !layout.some(l => l.id === w.id)).length === 0 && (
            <p className="text-xs text-gray-300">{t('dash.allWidgetsAdded') || '所有可用组件已添加'}</p>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {layout.map((item, idx) => {
          const widget = widgetMap.get(item.id)
          if (!widget) return null
          const Icon = widget.icon
          const size = item.w
          const colClass = size >= 4 ? 'lg:col-span-4' : size >= 3 ? 'lg:col-span-3' : size >= 2 ? 'lg:col-span-2' : 'lg:col-span-1'
          const heightClass = HEIGHT_CLASS[item.h] || ''
          const isDragging = dragIdx === idx
          const title = item.id === 'custom_page' && item.customTitle ? item.customTitle : t(widget.titleKey)
          return (
            <div
              key={idx + '_' + item.id + '_' + (item.customTitle || '')}
              draggable={showEditor}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`${colClass} bg-white rounded-xl border border-gray-200 overflow-hidden group/widget transition-opacity ${isDragging ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Widget Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 ${showEditor ? 'cursor-move' : ''}`}>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
                  {showEditor && <GripVertical size={14} className="text-gray-300" />}
                  <Icon size={14} className="text-gray-400" />
                  <span className="truncate max-w-[16rem]" title={title}>{title}</span>
                </div>
                {showEditor && (
                  <div className="flex items-center gap-0.5">
                    <select
                      value={size}
                      onChange={(e) => changeWidth(idx, Number(e.target.value) as WidgetWidth)}
                      className="h-6 px-1 rounded text-[11px] border border-gray-200 bg-white text-gray-500 focus:outline-none focus:border-blue-400 cursor-pointer"
                      title={t('dash.width') || '宽度'}
                    >
                      {[1, 2, 3, 4].map(v => <option key={v} value={v}>{WIDTH_LABELS[v as WidgetWidth]}</option>)}
                    </select>
                    <select
                      value={item.h}
                      onChange={(e) => changeHeight(idx, e.target.value as WidgetHeight)}
                      className="h-6 px-1 rounded text-[11px] border border-gray-200 bg-white text-gray-500 focus:outline-none focus:border-blue-400 cursor-pointer"
                      title={t('dash.height') || '高度'}
                    >
                      {(['sm', 'md', 'lg', 'auto'] as WidgetHeight[]).map(v => <option key={v} value={v}>{HEIGHT_LABELS[v]}</option>)}
                    </select>
                    <button onClick={() => removeWidget(idx)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                )}
              </div>
              {/* Widget Content */}
              <div className={`p-4 overflow-y-auto ${heightClass}`}>
                <WidgetContent widget={item} t={t} dash={dash} loading={dashLoading} />
              </div>
            </div>
          )
        })}
        {layout.length === 0 && (
          <div className="lg:col-span-4 py-20 text-center text-gray-400">
            <p className="text-lg mb-2">{t('dash.customizeTitle') || '自定义你的工作台'}</p>
            <p className="text-sm">{t('dash.customizeSub') || '点击右上角设置按钮，添加你需要的组件'}</p>
          </div>
        )}
      </div>

      {/* Custom page modal */}
      {customForm.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{t('dash.addCustomPage') || '添加自定义页面'}</h3>
              <button onClick={() => setCustomForm({ open: false, title: '', url: '' })} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('dash.customTitle') || '卡片标题'}</label>
                <input
                  value={customForm.title}
                  onChange={(e) => setCustomForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder={t('dash.customTitlePlaceholder') || '例如：生产看板'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('dash.customUrl') || '页面链接'}</label>
                <input
                  value={customForm.url}
                  onChange={(e) => setCustomForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder={t('dash.customUrlPlaceholder') || 'https://... 或 /domestic/orders'}
                />
                <p className="text-[10px] text-gray-400 mt-1">{t('dash.customUrlHint') || '外部页面建议用 https:// 开头；内部页面可用相对路径'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCustomForm({ open: false, title: '', url: '' })} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">{t('common.cancel') || '取消'}</button>
              <button onClick={addCustomPage} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.confirm') || '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Top Stats Bar — fixed, not customizable
function TopStatsBar({ t, stats, loading }: { t: (k: string) => string; stats?: DashStats; loading?: boolean }) {
  const navigate = useNavigate()
  const c = stats?.counts
  const items = [
    { key: 'customers', label: t('dash.customers') || '客户总数', desc: t('dash.customersDesc') || '全部客户', value: c?.customers, icon: Users, color: 'blue', path: '/domestic/customers' },
    { key: 'opps', label: t('dash.opps') || '商机', desc: t('dash.oppsDesc') || '进行中商机', value: c?.opportunities, icon: Target, color: 'green', path: '/domestic/opportunities' },
    { key: 'quotes', label: t('dash.quotes') || '报价单', desc: t('dash.quotesDesc') || '已建报价', value: c?.quotes, icon: FileText, color: 'amber', path: '/domestic/quotations' },
    { key: 'followups', label: t('dash.todayFollowUps') || '今日跟进', desc: t('dash.todayFollowUpsDesc') || '今日待跟进', value: c?.todayFollowUps, icon: Bell, color: 'red', path: '/domestic/followups' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(s => (
        (() => {
          const style = TOP_STAT_STYLES[s.color]
          return (
        <button
          key={s.key}
          onClick={() => navigate(s.path)}
          className={`text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
              <s.icon size={18} className={style.text} />
            </div>
            <span className={`text-2xl font-bold ${style.text}`}>{loading ? '…' : (s.value ?? '—')}</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-700">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${style.line} opacity-0 group-hover:opacity-100 transition-opacity`} />
        </button>
          )
        })()
      ))}
    </div>
  )
}

function WidgetContent({ widget, t, dash, loading }: { widget: LayoutItem; t: (k: string) => string; dash: any; loading?: boolean }) {
  const id = widget.id
  const stats = dash?.stats
  const pipeline = dash?.pipeline
  const activities = dash?.activities
  switch (id) {
    case 'my_todos':
    case 'my_flows':
    case 'my_leads':
    case 'my_opps':
    case 'my_quotations':
    case 'my_orders':
    case 'my_collections':
      return <InDevWidget t={t} titleKey={widgetTitleKey(id)} />
    case 'my_customers':
      return <CustomerWidget t={t} customers={stats?.recentCustomers} loading={loading} />
    case 'stats':
      return <StatsWidget t={t} stats={stats} loading={loading} />
    case 'pipeline':
      return <PipelineWidget t={t} pipeline={pipeline} loading={loading} />
    case 'recent_activity':
    case 'notifications':
      return <ActivityWidget t={t} activities={activities} loading={loading} />
    case 'custom_page':
      return <CustomPageWidget title={widget.customTitle || ''} url={widget.customUrl || ''} />
    default:
      return <div className="text-gray-400 text-sm py-4 text-center">{t('dash.noData') || '暂无数据'}</div>
  }
}

function widgetTitleKey(id: string): string {
  const map: Record<string, string> = {
    my_todos: 'widget.todos', my_flows: 'widget.flows', my_leads: 'widget.leads',
    my_opps: 'widget.opps', my_quotations: 'widget.quotations', my_orders: 'widget.orders',
    my_collections: 'widget.collections',
  }
  return map[id] || 'widget.customPage'
}

function InDevWidget({ t, titleKey }: { t: (k: string) => string; titleKey: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-gray-300 space-y-1">
      <RefreshCcw size={18} />
      <p className="text-xs">{t(titleKey)}：列表数据接入中</p>
    </div>
  )
}

function CustomPageWidget({ title, url }: { title: string; url: string }) {
  const [err, setErr] = useState(false)
  const isExternal = url.startsWith('http://') || url.startsWith('https://')
  const fullUrl = isExternal ? url : url.startsWith('/') ? window.location.origin + url : url

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
        <AlertCircle size={24} />
        <p className="text-xs">页面加载失败或被拒绝嵌入</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <ExternalLink size={10} /> 新窗口打开
        </a>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[12rem]">
      <iframe
        src={fullUrl}
        title={title}
        className="w-full h-full min-h-[12rem] rounded-lg border border-gray-100"
        onError={() => setErr(true)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  )
}

function CustomerWidget({ t, customers, loading }: { t: (k: string) => string; customers?: { id: string; companyName: string; status: string; createdAt: string }[]; loading?: boolean }) {
  const navigate = useNavigate()
  if (loading) return <div className="text-gray-400 text-sm py-4 text-center">加载中…</div>
  if (!customers || customers.length === 0) return <div className="text-gray-400 text-sm py-4 text-center">暂无客户数据</div>
  return (
    <div className="space-y-2">
      {customers.map((c) => (
        <div
          key={c.id}
          onClick={() => navigate('/domestic/customers')}
          className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">{decodeHtml(c.companyName)[0] || '?'}</div>
            <div>
              <span className="text-gray-700">{decodeHtml(c.companyName)}</span>
              <span className="text-xs text-gray-400 ml-1">{c.status}</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  )
}

function StatsWidget({ t, stats, loading }: { t: (k: string) => string; stats?: DashStats; loading?: boolean }) {
  if (loading) return <div className="text-gray-400 text-sm py-4 text-center">加载中…</div>
  const c = stats?.counts
  const items = [
    { label: t('dash.statCustomers') || '客户', value: c?.customers ?? '—', icon: Users },
    { label: t('dash.statOpps') || '商机', value: c?.opportunities ?? '—', icon: Target },
    { label: t('dash.statQuotes') || '报价单', value: c?.quotes ?? '—', icon: FileText },
    { label: t('dash.statContracts') || '合同', value: c?.contracts ?? '—', icon: Package },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s, i) => (
        <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
          <s.icon size={14} className="text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-700">{s.value}</div>
          <div className="text-[10px] text-gray-400">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function PipelineWidget({ t, pipeline, loading }: { t: (k: string) => string; pipeline?: PipelineItem[]; loading?: boolean }) {
  if (loading) return <div className="text-gray-400 text-sm py-4 text-center">加载中…</div>
  if (!pipeline || pipeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-300 space-y-1">
        <BarChart3 size={20} />
        <p className="text-xs">暂无商机数据</p>
        <p className="text-[10px]">录入商机后将显示销售漏斗</p>
      </div>
    )
  }
  const stageLabel: Record<string, string> = {
    INITIAL_CONTACT: '线索', REQUIREMENT_CONFIRMED: '需求确认', QUOTING: '报价中',
    CONTRACT_NEGOTIATION: '合同谈判', WON: '成交', LOST: '丢单',
  }
  const total = pipeline.reduce((s, p) => s + p.count, 0)
  const maxCount = Math.max(...pipeline.map(p => p.count), 1)
  return (
    <div className="space-y-1.5">
      {pipeline.map((p, i) => {
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
        const w = Math.max(Math.round((p.count / maxCount) * 100), 12)
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 shrink-0">{stageLabel[p.stage] || p.stage}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
              <div className="h-full bg-brand-500 rounded-md flex items-center justify-end pr-2" style={{ width: w + '%' }}>
                <span className="text-[10px] text-white font-medium">{p.count}</span>
              </div>
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ActivityWidget({ t, activities, loading }: { t: (k: string) => string; activities?: ActivityItem[]; loading?: boolean }) {
  const navigate = useNavigate()
  if (loading) return <div className="text-gray-400 text-sm py-4 text-center">加载中…</div>
  if (!activities || activities.length === 0) return <div className="text-gray-400 text-sm py-4 text-center">暂无动态</div>
  return (
    <div className="space-y-3">
      {activities.map((item, i) => (
        <div
          key={item.id}
          onClick={() => navigate('/domestic/followups')}
          className="flex gap-2.5 cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 transition-colors"
        >
          <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center shrink-0"><AlertCircle size={12} className="text-brand-500" /></div>
          <div>
            <p className="text-xs text-gray-600">{decodeHtml(item.content)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{decodeHtml(item.customerName)} · {item.userName} · {new Date(item.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
