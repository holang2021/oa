// ============================================================
// 我的流程 — 当前用户发起的所有审批流程
// ============================================================

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, AlertCircle, CheckCircle2, XCircle, RotateCcw,
  Search, Filter, ChevronRight, FileText, ArrowRight, Edit3, Eye,
} from 'lucide-react'
import { ApprovalStatus, ProcessStatus, APPROVAL_STATUS_LABELS } from '../types/approval'
import { BIZ_TYPE_LABELS } from '../data/approvalConfig'
import { getMyFlows, type ApprovalTask, CURRENT_USER } from '../data/mockApprovalTasks'

const STATUS_COLORS: Record<string, string> = {
  [ApprovalStatus.DRAFT]: 'bg-gray-100 text-gray-600',
  [ApprovalStatus.PENDING]: 'bg-blue-100 text-blue-700',
  [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-700',
  [ApprovalStatus.REJECTED]: 'bg-red-100 text-red-700',
  [ApprovalStatus.WITHDRAWN]: 'bg-yellow-100 text-yellow-700',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  [ApprovalStatus.DRAFT]: <Edit3 size={14} />,
  [ApprovalStatus.PENDING]: <Clock size={14} />,
  [ApprovalStatus.APPROVED]: <CheckCircle2 size={14} />,
  [ApprovalStatus.REJECTED]: <XCircle size={14} />,
  [ApprovalStatus.WITHDRAWN]: <RotateCcw size={14} />,
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatCurrency(amount?: number): string {
  if (!amount) return '-'
  return `¥${amount.toLocaleString('zh-CN')}`
}

export default function MyFlows() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bizFilter, setBizFilter] = useState<string>('all')

  const allTasks = useMemo(() => getMyFlows(), [])
  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (bizFilter !== 'all' && t.bizType !== bizFilter) return false
      if (search && !t.title.includes(search) && !t.bizRecordId.includes(search)) return false
      return true
    })
  }, [allTasks, search, statusFilter, bizFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTasks.length }
    allTasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return counts
  }, [allTasks])

  const bizTypes = useMemo(() => [...new Set(allTasks.map(t => t.bizType))], [allTasks])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">我的流程</h1>
        <p className="text-sm text-gray-500 mt-1">
          共发起 {allTasks.length} 条审批，{statusCounts[ApprovalStatus.PENDING] || 0} 条审批中
        </p>
      </div>

      {/* 状态快速筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: '全部', count: statusCounts.all },
          { key: ApprovalStatus.PENDING, label: '审批中', count: statusCounts[ApprovalStatus.PENDING] || 0 },
          { key: ApprovalStatus.APPROVED, label: '已通过', count: statusCounts[ApprovalStatus.APPROVED] || 0 },
          { key: ApprovalStatus.REJECTED, label: '已驳回', count: statusCounts[ApprovalStatus.REJECTED] || 0 },
          { key: ApprovalStatus.DRAFT, label: '草稿', count: statusCounts[ApprovalStatus.DRAFT] || 0 },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === item.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {item.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              statusFilter === item.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* 搜索和业务筛选 */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索单据号或摘要..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={bizFilter}
          onChange={(e) => setBizFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">全部类型</option>
          {bizTypes.map((bt) => (
            <option key={bt} value={bt}>{BIZ_TYPE_LABELS[bt]}</option>
          ))}
        </select>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">暂无审批流程</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <FlowCard key={task.id} task={task} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function FlowCard({ task, navigate }: { task: ApprovalTask; navigate: ReturnType<typeof useNavigate> }) {
  const progressPct = Math.round((task.currentLevel - 1) / task.totalLevels * 100)
  const progressLabel = task.status === ApprovalStatus.APPROVED
    ? '已通过'
    : task.status === ApprovalStatus.REJECTED
    ? `第${task.currentLevel}级驳回`
    : task.status === ApprovalStatus.DRAFT
    ? '草稿'
    : `第${task.currentLevel}级审批中`

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => navigate('/tools/approval')}
    >
      <div className="flex items-start justify-between gap-4">
        {/* 左侧信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
              {task.bizRecordId}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
              {STATUS_ICONS[task.status]}
              {APPROVAL_STATUS_LABELS[task.status]}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1.5 group-hover:text-brand-600 transition-colors">
            {task.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{BIZ_TYPE_LABELS[task.bizType]}</span>
            {task.customerName && <span>{task.customerName}</span>}
            {task.amount && <span className="font-mono">{formatCurrency(task.amount)}</span>}
            <span>{formatRelative(task.submittedAt)}</span>
          </div>
        </div>

        {/* 右侧进度 */}
        <div className="shrink-0 flex flex-col items-end gap-1.5 min-w-[120px]">
          <span className="text-xs text-gray-500">{progressLabel}</span>
          {task.status === ApprovalStatus.PENDING && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.max(progressPct, 10)}%` }}
              />
            </div>
          )}
          {task.currentApprover && (
            <span className="text-xs text-gray-400">
              当前审批人: {task.currentApprover.name}
            </span>
          )}
          {task.status === ApprovalStatus.REJECTED && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/tools/approval') }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              重新提交 →
            </button>
          )}
        </div>

        <ChevronRight size={16} className="shrink-0 text-gray-300 group-hover:text-brand-500 mt-1 transition-colors" />
      </div>
    </div>
  )
}
