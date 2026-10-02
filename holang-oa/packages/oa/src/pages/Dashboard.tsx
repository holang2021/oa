import { useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import {
  Inbox, Clock, CheckCircle2, Bell, TrendingUp, Users, DollarSign, Package,
  ArrowRight, AlertCircle, Target, ClipboardCheck, ShoppingCart, Truck,
  Plus, X, GripVertical, Settings, BarChart3, FileText, Search,
  ChevronUp, ChevronDown, LayoutTemplate, AlertTriangle, Zap,
  CircleCheck, Hourglass, Maximize2, Move, ExternalLink, RefreshCcw
} from 'lucide-react'
import { getMyTodoTasks, getMyDoneTasks } from '../data/mockApprovalTasks'

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
      <TopStatsBar t={t} />

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
                <WidgetContent widget={item} t={t} />
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
function TopStatsBar({ t }: { t: (k: string) => string }) {
  const navigate = useNavigate()

  const todos = useMemo(() => getMyTodoTasks(), [])
  const done = useMemo(() => getMyDoneTasks(), [])
  const overdueCount = todos.filter(t => t.isOverdue).length
  const urgedCount = todos.filter(t => t.urgeCount > 0).length

  const stats = [
    { key: 'pending', label: t('dash.pending'), desc: t('dash.pendingDesc'), value: todos.length, icon: Hourglass, color: 'blue', path: '/dashboard/todos' },
    { key: 'approved', label: t('dash.approved'), desc: t('dash.approvedDesc'), value: done.length, icon: CircleCheck, color: 'green', path: '/dashboard/done' },
    { key: 'overdue', label: t('dash.overdue'), desc: t('dash.overdueDesc'), value: overdueCount, icon: AlertTriangle, color: 'red', path: '/dashboard/todos' },
    { key: 'urged', label: t('dash.urged'), desc: t('dash.urgedDesc'), value: urgedCount, icon: Zap, color: 'amber', path: '/dashboard/todos' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <button
          key={s.key}
          onClick={() => navigate(s.path)}
          className={`text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>
              <s.icon size={18} className={`text-${s.color}-500`} />
            </div>
            <span className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-700">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${s.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
        </button>
      ))}
    </div>
  )
}

type ListItem = { label: string; path?: string }

function WidgetContent({ widget, t }: { widget: LayoutItem; t: (k: string) => string }) {
  const id = widget.id
  switch (id) {
    case 'my_todos':
      return <SimpleList items={[
        { label: '审批报价单 HQ2607001', path: '/domestic/quotations' },
        { label: '跟进客户 耐力股份', path: '/domestic/customers' },
        { label: '提交周报', path: '#' },
      ]} color="amber" t={t} />
    case 'my_flows':
      return <SimpleList items={[
        { label: '采购申请 PO-20260601', path: '#' },
        { label: '客户退款申请', path: '#' },
      ]} color="blue" t={t} />
    case 'my_customers':
      return <CustomerWidget t={t} />
    case 'my_leads':
      return <SimpleList items={[
        { label: '耐力股份 - 氮气发生器', path: '/domestic/leads' },
        { label: '苏州精密 - 氧分析仪', path: '/domestic/leads' },
        { label: '上海华虹 - 制氮机', path: '/domestic/leads' },
        { label: '广州能源 - PSA装置', path: '/domestic/leads' },
      ]} color="blue" t={t} subtitle="跟进中" />
    case 'my_opps':
      return <SimpleList items={[
        { label: '耐力股份 NPL10B 项目 - ¥280K', path: '/domestic/opportunities' },
        { label: '苏州精密 - ¥135K', path: '/domestic/opportunities' },
      ]} color="green" t={t} subtitle="预计成交金额" />
    case 'my_quotations':
      return <SimpleList items={[
        { label: 'HQ2607021 - 耐力股份 - ¥128K', path: '/domestic/quotations' },
        { label: 'HQ2607018 - 苏州精密 - ¥65K', path: '/domestic/quotations' },
      ]} color="purple" t={t} subtitle="待审批" />
    case 'my_orders':
      return <SimpleList items={[
        { label: 'HC2601002 - 耐力股份 - 生产中', path: '/domestic/orders' },
        { label: 'HC2600098 - 上海华虹 - 已完成', path: '/domestic/orders' },
      ]} color="green" t={t} subtitle="订单状态" />
    case 'my_collections':
      return <div className="text-center py-4"><div className="text-3xl font-bold text-gray-700">¥285K</div><div className="text-xs text-gray-400 mt-1">本月已回款</div></div>
    case 'stats':
      return <StatsWidget t={t} />
    case 'pipeline':
      return <PipelineWidget t={t} />
    case 'recent_activity':
      return <ActivityWidget t={t} />
    case 'notifications':
      return <ActivityWidget t={t} />
    case 'custom_page':
      return <CustomPageWidget title={widget.customTitle || ''} url={widget.customUrl || ''} />
    default:
      return <div className="text-gray-400 text-sm py-4 text-center">{t('dash.noData') || '暂无数据'}</div>
  }
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

function SimpleList({ items, color, t, subtitle }: { items: ListItem[]; color: string; t: (k: string) => string; subtitle?: string }) {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => {
            if (item.path && item.path !== '#') navigate(item.path)
            else alert(t('dash.moduleInDev') || '该模块详情页正在开发中')
          }}
          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-${color}-400`} />
          <span className="text-gray-600 flex-1">{item.label}</span>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      ))}
    </div>
  )
}

function CustomerWidget({ t }: { t: (k: string) => string }) {
  const navigate = useNavigate()
  const customers = [
    { name: '耐力股份', code: 'C26001', stage: '合同阶段', contact: '张经理' },
    { name: '苏州精密', code: 'C26008', stage: '报价阶段', contact: '李工' },
    { name: '上海华虹', code: 'C26015', stage: '维护中', contact: '王总' },
    { name: '广州能源', code: 'C26022', stage: '线索阶段', contact: '陈经理' },
  ]
  return (
    <div className="space-y-2">
      {customers.map((c, i) => (
        <div
          key={i}
          onClick={() => navigate('/domestic/customers')}
          className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">{c.name[0]}</div>
            <div>
              <span className="text-gray-700">{c.name}</span>
              <span className="text-xs text-gray-400 ml-1">{c.code}</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">{c.stage}</span>
        </div>
      ))}
    </div>
  )
}

function StatsWidget({ t }: { t: (k: string) => string }) {
  const items = [
    { label: '本月订单', value: '156', icon: Package, change: '+8%' },
    { label: '本月营收', value: '¥1.2M', icon: DollarSign, change: '+12%' },
    { label: '本月新客', value: '24', icon: Users, change: '+5%' },
    { label: '转化率', value: '22.5%', icon: Target, change: '+2%' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s, i) => (
        <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
          <s.icon size={14} className="text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-700">{s.value}</div>
          <div className="text-[10px] text-gray-400">{s.label}</div>
          <div className="text-[10px] text-green-500 mt-0.5">{s.change}</div>
        </div>
      ))}
    </div>
  )
}

function PipelineWidget({ t }: { t: (k: string) => string }) {
  // 漏斗形态保留。颜色只用品牌主色 --color-primary（= 网站 CSS），以透明度分级表达阶段递进，
  // 不新增任何颜色 token（见 docs/oa-design-tokens.css）。
  const stages = [
    { label: '线索', count: 45, opacity: 1.0 },
    { label: '接触', count: 28, opacity: 0.82 },
    { label: '报价', count: 15, opacity: 0.64 },
    { label: '谈判', count: 8, opacity: 0.5 },
    { label: '成交', count: 5, opacity: 0.4 },
  ]
  const fill = 'var(--color-primary)'
  const W = 500
  const H = 36
  const G = 2
  const totalH = stages.length * (H + G) - G
  const widths = [W, W * 0.82, W * 0.66, W * 0.52, W * 0.40]

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {stages.map((s, i) => {
        const w = widths[i]
        const nextW = widths[i + 1] || w
        const y = i * (H + G)
        const lx = (W - w) / 2
        const rx = lx + w
        const nlx = (W - nextW) / 2
        const nrx = nlx + nextW
        // 填充越深（opacity 高）用白字，越浅用主色字，保证可读
        const textColor = s.opacity >= 0.64 ? '#FFFFFF' : 'var(--color-primary)'
        return (
          <g key={i}>
            <path d={`M ${lx} ${y} L ${rx} ${y} L ${nrx} ${y + H} L ${nlx} ${y + H} Z`} fill={fill} fillOpacity={s.opacity} />
            <text x={W / 2} y={y + H / 2 + 5} textAnchor="middle" fill={textColor} fontSize="14" fontWeight="500">
              {s.label} {s.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ActivityWidget({ t }: { t: (k: string) => string }) {
  const navigate = useNavigate()
  const items: ListItem[] = [
    { label: '报价单 HQ2607001 审核通过', path: '/domestic/quotations' },
    { label: '新线索 广州能源 已分配给你', path: '/domestic/leads' },
    { label: '合同 HC2601002 已签署', path: '/domestic/orders' },
    { label: '回款 ¥128,000 已到账', path: '/domestic/collections' },
  ]
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => {
            if (item.path && item.path !== '#') navigate(item.path)
            else alert(t('dash.moduleInDev') || '该模块详情页正在开发中')
          }}
          className="flex gap-2.5 cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 transition-colors"
        >
          <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center shrink-0"><AlertCircle size={12} className="text-brand-500" /></div>
          <div><p className="text-xs text-gray-600">{item.label}</p><p className="text-[10px] text-gray-400 mt-0.5">{i + 1} {t('dash.hoursAgo')}</p></div>
        </div>
      ))}
    </div>
  )
}
