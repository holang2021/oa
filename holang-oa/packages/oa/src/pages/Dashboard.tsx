import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import {
  Inbox, Clock, CheckCircle2, Bell, TrendingUp, Users, DollarSign, Package,
  ArrowRight, AlertCircle, Target, ClipboardCheck, ShoppingCart, Truck,
  Plus, X, GripVertical, Settings, BarChart3, FileText, Search,
  ChevronUp, ChevronDown, LayoutTemplate, AlertTriangle, Zap,
  CircleCheck, Hourglass, Maximize2
} from 'lucide-react'
import { getMyTodoTasks, getMyDoneTasks } from '../data/mockApprovalTasks'

// Widget types
type WidgetType = 'my_todos' | 'my_flows' | 'my_customers' | 'my_leads' | 'my_opps' | 'my_quotations' |
  'my_orders' | 'my_collections' | 'stats' | 'pipeline' | 'recent_activity' | 'notifications' |
  'calendar' | 'quick_stats'

interface WidgetDef {
  id: WidgetType
  titleKey: string
  icon: any
  defaultW: number  // 1-4 columns
  availableRoles: string[]
}

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'my_todos', titleKey: 'widget.todos', icon: Clock, defaultW: 1, availableRoles: ['*'] },
  { id: 'my_flows', titleKey: 'widget.flows', icon: Inbox, defaultW: 1, availableRoles: ['*'] },
  { id: 'my_customers', titleKey: 'widget.customers', icon: Users, defaultW: 2, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_leads', titleKey: 'widget.leads', icon: TrendingUp, defaultW: 2, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_opps', titleKey: 'widget.opps', icon: Target, defaultW: 2, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_quotations', titleKey: 'widget.quotations', icon: FileText, defaultW: 2, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'my_orders', titleKey: 'widget.orders', icon: Package, defaultW: 2, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm', 'warehouse'] },
  { id: 'my_collections', titleKey: 'widget.collections', icon: DollarSign, defaultW: 1, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm', 'finance'] },
  { id: 'stats', titleKey: 'widget.stats', icon: BarChart3, defaultW: 4, availableRoles: ['*'] },
  { id: 'pipeline', titleKey: 'widget.pipeline', icon: TrendingUp, defaultW: 4, availableRoles: ['sales', 'sales_manager', 'sales_director', 'gm'] },
  { id: 'recent_activity', titleKey: 'widget.activity', icon: Clock, defaultW: 1, availableRoles: ['*'] },
  { id: 'notifications', titleKey: 'widget.messages', icon: Bell, defaultW: 1, availableRoles: ['*'] },
]

const DEFAULT_LAYOUTS: Record<string, WidgetType[]> = {
  gm: ['stats', 'my_todos', 'my_flows', 'recent_activity', 'notifications', 'pipeline', 'my_customers', 'my_leads'],
  sales: ['my_todos', 'my_customers', 'my_leads', 'my_opps', 'my_quotations', 'my_orders', 'stats'],
  sales_manager: ['my_todos', 'stats', 'my_customers', 'my_leads', 'my_opps', 'recent_activity'],
  sales_director: ['stats', 'pipeline', 'my_todos', 'my_customers', 'my_leads', 'recent_activity'],
  buyer: ['my_todos', 'my_orders', 'stats', 'recent_activity'],
  warehouse: ['my_todos', 'my_orders', 'stats'],
  finance: ['my_todos', 'my_flows', 'my_collections', 'stats'],
}

function getUserRole(): string {
  try { const u = JSON.parse(localStorage.getItem('holang_user') || '{}'); return u.role || 'gm' } catch { return 'gm' }
}

function loadLayout(role: string): WidgetType[] {
  const key = 'holang_widgets_' + role
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.gm
}

function saveLayout(role: string, layout: WidgetType[]) {
  localStorage.setItem('holang_widgets_' + role, JSON.stringify(layout))
}

type WidgetSize = 1 | 2 | 3 | 4

function loadWidgetSizes(): Record<string, WidgetSize> {
  try {
    const saved = localStorage.getItem('holang_widget_sizes')
    if (saved) return JSON.parse(saved)
  } catch {}
  return {}
}

function saveWidgetSizes(sizes: Record<string, WidgetSize>) {
  localStorage.setItem('holang_widget_sizes', JSON.stringify(sizes))
}

const SIZE_LABELS: Record<WidgetSize, string> = { 1: '小', 2: '中', 3: '大', 4: '全宽' }

export default function Dashboard() {
  const { t } = useI18n()
  const role = getUserRole()
  const [layout, setLayout] = useState<WidgetType[]>(() => loadLayout(role))
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>(() => loadWidgetSizes())
  const [showEditor, setShowEditor] = useState(false)

  const availableWidgets = WIDGET_REGISTRY.filter(w => w.availableRoles.includes('*') || w.availableRoles.includes(role))
  const widgetMap = new Map(WIDGET_REGISTRY.map(w => [w.id, w]))

  const addWidget = (w: WidgetType) => {
    setLayout(prev => { const next = [...prev, w]; saveLayout(role, next); return next })
  }
  const removeWidget = (idx: number) => {
    setLayout(prev => { const next = prev.filter((_, i) => i !== idx); saveLayout(role, next); return next })
  }
  const moveUp = (idx: number) => {
    if (idx === 0) return
    setLayout(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      saveLayout(role, next)
      return next
    })
  }
  const moveDown = (idx: number) => {
    if (idx === layout.length - 1) return
    setLayout(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      saveLayout(role, next)
      return next
    })
  }
  const changeWidgetSize = (id: WidgetType, size: WidgetSize) => {
    setWidgetSizes(prev => {
      const next = { ...prev, [id]: size }
      saveWidgetSizes(next)
      return next
    })
  }
  const resetLayout = () => {
    const d = DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.gm
    setLayout(d)
    saveLayout(role, d)
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
            <button onClick={resetLayout} className="text-xs text-gray-400 hover:text-gray-600">{t('dash.resetDefault') || '恢复默认'}</button>
          </div>
          <p className="text-xs text-gray-400 mb-3">{t('dash.customizeHint') || '点击添加组件，拖动或使用箭头调整顺序'}</p>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.filter(w => !layout.includes(w.id)).map(w => (
              <button key={w.id} onClick={() => addWidget(w.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Plus size={12} /> {t(w.titleKey)}
              </button>
            ))}
          </div>
          {availableWidgets.filter(w => !layout.includes(w.id)).length === 0 && (
            <p className="text-xs text-gray-300">{t('dash.allWidgetsAdded') || '所有可用组件已添加'}</p>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {layout.map((wId, idx) => {
          const widget = widgetMap.get(wId)
          if (!widget) return null
          const Icon = widget.icon
          const size = widgetSizes[wId] || widget.defaultW
          const colClass = size >= 4 ? 'lg:col-span-4' : size >= 3 ? 'lg:col-span-3' : size >= 2 ? 'lg:col-span-2' : 'lg:col-span-1'
          return (
            <div key={idx + '_' + wId} className={`${colClass} bg-white rounded-xl border border-gray-200 overflow-hidden group/widget`}>
              {/* Widget Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Icon size={14} className="text-gray-400" />
                  {t(widget.titleKey)}
                </div>
                {showEditor && (
                  <div className="flex items-center gap-0.5">
                    <select
                      value={size}
                      onChange={(e) => changeWidgetSize(wId, Number(e.target.value) as WidgetSize)}
                      className="h-6 px-1.5 rounded text-[11px] border border-gray-200 bg-white text-gray-500 focus:outline-none focus:border-blue-400 cursor-pointer"
                      title="调整大小"
                    >
                      <option value={1}>{SIZE_LABELS[1]}</option>
                      <option value={2}>{SIZE_LABELS[2]}</option>
                      <option value={3}>{SIZE_LABELS[3]}</option>
                      <option value={4}>{SIZE_LABELS[4]}</option>
                    </select>
                    <button onClick={() => moveUp(idx)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><ChevronUp size={12} /></button>
                    <button onClick={() => moveDown(idx)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><ChevronDown size={12} /></button>
                    <button onClick={() => removeWidget(idx)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                )}
              </div>
              {/* Widget Content */}
              <div className="p-4">
                <WidgetContent widget={wId} t={t} />
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
    </div>
  )
}

// Top Stats Bar — fixed, not customizable
function TopStatsBar({ t }: { t: (k: string) => string }) {
  const navigate = useNavigate()
  
  // Compute real-ish counts from mock data
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

function WidgetContent({ widget, t }: { widget: WidgetType; t: (k: string) => string }) {
  switch (widget) {
    case 'my_todos':
      return <SimpleList items={['审批报价单 HQ2607001', '跟进客户 耐力股份', '提交周报']} color="amber" t={t} />
    case 'my_flows':
      return <SimpleList items={['采购申请 PO-20260601', '客户退款申请']} color="blue" t={t} />
    case 'my_customers':
      return <CustomerWidget t={t} />
    case 'my_leads':
      return <SimpleList items={['耐力股份 - 氮气发生器', '苏州精密 - 氧分析仪', '上海华虹 - 制氮机', '广州能源 - PSA装置']} color="blue" t={t} subtitle="跟进中" />
    case 'my_opps':
      return <SimpleList items={['耐力股份 NPL10B 项目 - ¥280K', '苏州精密 - ¥135K']} color="green" t={t} subtitle="预计成交金额" />
    case 'my_quotations':
      return <SimpleList items={['HQ2607021 - 耐力股份 - ¥128K', 'HQ2607018 - 苏州精密 - ¥65K']} color="purple" t={t} subtitle="待审批" />
    case 'my_orders':
      return <SimpleList items={['HC2601002 - 耐力股份 - 生产中', 'HC2600098 - 上海华虹 - 已完成']} color="green" t={t} subtitle="订单状态" />
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
    default:
      return <div className="text-gray-400 text-sm py-4 text-center">{t('dash.noData') || '暂无数据'}</div>
  }
}

function SimpleList({ items, color, t, subtitle }: { items: string[]; color: string; t: (k: string) => string; subtitle?: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className={`w-1.5 h-1.5 rounded-full bg-${color}-400`} />
          <span className="text-gray-600 flex-1">{item}</span>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      ))}
    </div>
  )
}

function CustomerWidget({ t }: { t: (k: string) => string }) {
  const customers = [
    { name: '耐力股份', code: 'C26001', stage: '合同阶段', contact: '张经理' },
    { name: '苏州精密', code: 'C26008', stage: '报价阶段', contact: '李工' },
    { name: '上海华虹', code: 'C26015', stage: '维护中', contact: '王总' },
    { name: '广州能源', code: 'C26022', stage: '线索阶段', contact: '陈经理' },
  ]
  return (
    <div className="space-y-2">
      {customers.map((c, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
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
  const stages = [
    { label: '线索', count: 45, color: '#9CA3AF' },
    { label: '接触', count: 28, color: '#60A5FA' },
    { label: '报价', count: 15, color: '#FBBF24' },
    { label: '谈判', count: 8, color: '#FB923C' },
    { label: '成交', count: 12, color: '#4ADE80' },
  ]

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
        return (
          <g key={i}>
            <path d={`M ${lx} ${y} L ${rx} ${y} L ${nrx} ${y + H} L ${nlx} ${y + H} Z`} fill={s.color} />
            <text x={W / 2} y={y + H / 2 + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="500">
              {s.label} {s.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ActivityWidget({ t }: { t: (k: string) => string }) {
  const items = ['报价单 HQ2607001 审核通过', '新线索 广州能源 已分配给你', '合同 HC2601002 已签署', '回款 ¥128,000 已到账']
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center shrink-0"><AlertCircle size={12} className="text-blue-500" /></div>
          <div><p className="text-xs text-gray-600">{item}</p><p className="text-[10px] text-gray-400 mt-0.5">{i + 1} {t('dash.hoursAgo')}</p></div>
        </div>
      ))}
    </div>
  )
}
