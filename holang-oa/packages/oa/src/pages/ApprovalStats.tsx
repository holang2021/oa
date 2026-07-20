import React, { useState, useMemo } from 'react'
import {
  BarChart3, TrendingUp, CheckCircle, XCircle, Clock,
  Users, FileText, Truck, FileCheck, ArrowUpRight,
  Calendar, Filter, Download, RefreshCw,
} from 'lucide-react'
import { computeApprovalStats, computeBizTypeStats, computeApproverStats, computeStepDurationStats, computeTrendData, generateMockHistoricalInstances, type ApprovalStats, type BizTypeStats, type ApproverStats, type StepDurationStats, type TrendDataPoint, type ApprovalInstance } from '../services/approvalStatsService'

// ───────────────────── 颜色常量 ─────────────────────
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  gray: '#6B7280',
}

// ───────────────────── 审批明细表格 ─────────────────────
const BIZ_LABELS: Record<string, string> = { order: '订单', invoice: '开票', delivery: '发货', collection: '回款' }
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending:   { text: '审批中',   color: 'text-yellow-600 bg-yellow-50' },
  approved:  { text: '已通过',   color: 'text-green-600 bg-green-50' },
  rejected:  { text: '已驳回',   color: 'text-red-600 bg-red-50' },
  draft:     { text: '草稿',     color: 'text-gray-600 bg-gray-50' },
  withdrawn: { text: '已撤回',   color: 'text-gray-600 bg-gray-50' },
}

function ApprovalTable({ instances }: { instances: ApprovalInstance[] }) {
  if (instances.length === 0) return <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-xs text-gray-500 font-medium">业务单号</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">业务类型</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">发起人</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">状态</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">当前节点</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">创建时间</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((inst, idx) => {
            const st = STATUS_LABELS[inst.status] || STATUS_LABELS.pending
            return (
              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2.5 text-gray-700 font-mono text-xs">{inst.bizId}</td>
                <td className="py-2.5 text-gray-600">{BIZ_LABELS[inst.bizType] || inst.bizType}</td>
                <td className="py-2.5 text-gray-600">{inst.creatorName}</td>
                <td className="py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.text}</span>
                </td>
                <td className="py-2.5 text-gray-500 text-xs">
                  {inst.status === 'pending' ? (inst.levels || [])[inst.currentLevel]?.name || '-' : '-'}
                </td>
                <td className="py-2.5 text-gray-400 text-xs">{new Date(inst.createdAt).toLocaleDateString('zh-CN')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ───────────────────── 迷你柱状图 ─────────────────────
function MiniBarChart({ data, height = 60 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all hover:opacity-80"
          style={{
            height: `${Math.max((v / max) * 100, 4)}%`,
            backgroundColor: COLORS.primary,
            minWidth: 4,
          }}
          title={`${v}`}
        />
      ))}
    </div>
  )
}

// ───────────────────── 统计卡片 ─────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = COLORS.primary,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}10` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-xs">
          <ArrowUpRight size={12} className={trend.value >= 0 ? 'text-green-500' : 'text-red-500'} />
          <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ───────────────────── 趋势折线图（纯 SVG） ─────────────────────
function TrendChart({ data, height = 180 }: { data: TrendDataPoint[]; height?: number }) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const W = 700
  const H = height
  const maxVal = Math.max(...data.flatMap(d => [d.submitted, d.approved, d.rejected]), 1)

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * (W - padding.left - padding.right)
  const getY = (v: number) => H - padding.bottom - (v / maxVal) * (H - padding.top - padding.bottom)

  const line = (vals: number[], color: string, fill = false) => {
    const points = vals.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ')
    if (fill) {
      const area = `${getX(0).toFixed(1)},${H - padding.bottom} ${points} ${getX(vals.length - 1).toFixed(1)},${H - padding.bottom}`
      return <polygon key={color} points={area} fill={`${color}15`} stroke="none" />
    }
    return <polyline key={color} points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  }

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(W, data.length * 24)} height={H} className="text-xs">
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map(r => {
          const y = getY(maxVal * r)
          return (
            <g key={r}>
              <line x1={padding.left} y1={y} x2={W - padding.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize={10}>
                {Math.round(maxVal * (1 - r))}
              </text>
            </g>
          )
        })}
        {/* X 轴标签 */}
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, idx) => {
          const i = data.indexOf(d)
          return (
            <text key={idx} x={getX(i)} y={H - padding.bottom + 16} textAnchor="middle" fill="#9ca3af" fontSize={10}>
              {d.label}
            </text>
          )
        })}
        {/* 面积 */}
        {line(data.map(d => d.submitted), COLORS.primary, true)}
        {/* 折线 */}
        {line(data.map(d => d.submitted), COLORS.primary)}
        {line(data.map(d => d.approved), COLORS.success)}
        {line(data.map(d => d.rejected), COLORS.danger)}
        {/* 图例 */}
        <rect x={padding.left} y={6} width={10} height={10} fill={COLORS.primary} rx={2} />
        <text x={padding.left + 16} y={15} fill="#6b7280" fontSize={11}>提交</text>
        <rect x={padding.left + 70} y={6} width={10} height={10} fill={COLORS.success} rx={2} />
        <text x={padding.left + 86} y={15} fill="#6b7280" fontSize={11}>通过</text>
        <rect x={padding.left + 140} y={6} width={10} height={10} fill={COLORS.danger} rx={2} />
        <text x={padding.left + 156} y={15} fill="#6b7280" fontSize={11}>驳回</text>
      </svg>
    </div>
  )
}

// ───────────────────── 横向条形图 ─────────────────────
function HorizontalBarChart({ items, valueKey, color }: {
  items: { label: string; value: number; max?: number }[]
  valueKey?: string
  color: string
}) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600 truncate">{item.label}</span>
            <span className="font-medium text-gray-800 ml-2">{item.value}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────────────────── 主页面 ─────────────────────
export default function ApprovalStats() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [refreshKey, setRefreshKey] = useState(0)

  // 加载数据
  const instances = useMemo(() => {
    // TODO: 实际项目中从后端 API 获取
    // 当前使用模拟数据展示统计效果
    return generateMockHistoricalInstances()
  }, [refreshKey])

  // 按时间范围过滤
  const filteredInstances = useMemo(() => {
    if (dateRange === 'all') return instances
    const now = new Date()
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return instances.filter(i => new Date(i.createdAt) >= cutoff)
  }, [instances, dateRange])

  const stats = useMemo(() => computeApprovalStats(filteredInstances), [filteredInstances])
  const bizTypeStats = useMemo(() => computeBizTypeStats(filteredInstances), [filteredInstances])
  const approverStats = useMemo(() => computeApproverStats(filteredInstances), [filteredInstances])
  const stepStats = useMemo(() => computeStepDurationStats(filteredInstances), [filteredInstances])
  const trendData = useMemo(() => computeTrendData(filteredInstances, dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90), [filteredInstances, dateRange])

  const dateRangeLabels: Record<string, string> = {
    '7d': '近7天',
    '30d': '近30天',
    '90d': '近90天',
    'all': '全部',
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">审批统计看板</h1>
          <p className="text-sm text-gray-500 mt-1">
            审批效率分析 · 共 {stats.total} 条审批记录
            {instances.length > 0 && instances[0].id.startsWith('inst_mock') && (
              <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">示例数据</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {dateRangeLabels[range]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="刷新数据"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="总审批数" value={stats.total} color={COLORS.primary} />
        <StatCard icon={CheckCircle} label="已通过" value={stats.approved} sub={`通过率 ${stats.approveRate}%`} color={COLORS.success} />
        <StatCard icon={XCircle} label="已驳回" value={stats.rejected} sub={`驳回率 ${stats.rejectRate}%`} color={COLORS.danger} />
        <StatCard icon={Clock} label="平均耗时" value={stats.avgDurationText} sub={`${stats.pending} 条待审批`} color={COLORS.warning} />
      </div>

      {/* 趋势图 + 业务类型分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">审批趋势</h3>
            <span className="text-xs text-gray-400">{dateRangeLabels[dateRange]}</span>
          </div>
          <TrendChart data={trendData} />
        </div>

        {/* 业务类型分布 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">业务类型分布</h3>
          {bizTypeStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
          ) : (
            <div className="space-y-4">
              {bizTypeStats.map((b, idx) => {
                const icons: Record<string, React.ElementType> = { order: FileText, invoice: FileCheck, delivery: Truck, collection: Users }
                const Icon = icons[b.bizType] || FileText
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 rounded-lg bg-white">
                      <Icon size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{b.label}</span>
                        <span className="text-sm text-gray-500">{b.count} 条</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${b.approveRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{b.approveRate}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">平均 {b.avgHours < 1 ? `${Math.round(b.avgHours * 60)}分钟` : `${b.avgHours}小时`}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 审批人效率 + 节点耗时 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 审批人效率排名 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">审批人效率排名</h3>
          {approverStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {approverStats.slice(0, 8).map((a, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700'
                    : idx === 1 ? 'bg-gray-100 text-gray-600'
                    : idx === 2 ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-50 text-gray-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">{a.approverName}</span>
                      <span className="text-xs text-gray-400 ml-2">处理 {a.totalHandled} 条</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-green-600">通过 {a.approveCount}</span>
                      <span className="text-xs text-red-500">驳回 {a.rejectCount}</span>
                      <span className="text-xs text-gray-400 ml-auto">均 {a.avgHours < 1 ? `${Math.round(a.avgHours * 60)}分钟` : `${a.avgHours}小时`}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 各节点耗时分析 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">各节点耗时分析</h3>
          {stepStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
          ) : (
            <div className="space-y-4">
              {stepStats.map((s, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{s.stepName}</span>
                    <span className="text-gray-400">平均 {s.avgHours < 1 ? `${Math.round(s.avgHours * 60)}分钟` : `${s.avgHours}小时`} · 中位数 {s.medianHours < 1 ? `${Math.round(s.medianHours * 60)}分钟` : `${s.medianHours}小时`}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                      style={{ width: `${Math.min((s.avgHours / Math.max(...stepStats.map(x => x.avgHours), 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[10px] text-gray-400">
                    <span>最长 {s.maxHours < 1 ? `${Math.round(s.maxHours * 60)}分钟` : `${s.maxHours}小时`}</span>
                    <span>{s.count} 次审批</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 详细数据表格 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">审批明细（最近 20 条）</h3>
        <ApprovalTable instances={filteredInstances.slice(0, 20)} />
      </div>
    </div>
  )
}
