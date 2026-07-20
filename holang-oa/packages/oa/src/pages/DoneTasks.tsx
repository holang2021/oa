// ============================================================
// 已办任务 — 当前用户已处理的审批历史记录
// ============================================================

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Search, Filter, ChevronRight,
  Clock, FileText, Eye,
} from 'lucide-react'
import { ApprovalStatus, APPROVAL_STATUS_LABELS } from '../types/approval'
import { BIZ_TYPE_LABELS } from '../data/approvalConfig'
import { getMyDoneTasks, type ApprovalTask } from '../data/mockApprovalTasks'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function formatCurrency(amount?: number): string {
  if (!amount) return '-'
  return `¥${amount.toLocaleString('zh-CN')}`
}

export default function DoneTasks() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bizFilter, setBizFilter] = useState<string>('all')

  const allTasks = useMemo(() => getMyDoneTasks(), [])
  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (bizFilter !== 'all' && t.bizType !== bizFilter) return false
      if (search && !t.title.includes(search) && !t.bizRecordId.includes(search)) return false
      return true
    })
  }, [allTasks, search, statusFilter, bizFilter])

  const approveCount = useMemo(
    () => allTasks.filter(t => t.status === ApprovalStatus.APPROVED).length,
    [allTasks]
  )
  const rejectCount = useMemo(
    () => allTasks.filter(t => t.status === ApprovalStatus.REJECTED).length,
    [allTasks]
  )

  const bizTypes = useMemo(() => [...new Set(allTasks.map(t => t.bizType))], [allTasks])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">已办任务</h1>
        <p className="text-sm text-gray-500 mt-1">
          共处理 {allTasks.length} 条：
          <span className="text-green-600 ml-1 font-medium">{approveCount} 通过</span>
          <span className="mx-1">·</span>
          <span className="text-red-600 font-medium">{rejectCount} 驳回</span>
        </p>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: '全部', count: allTasks.length },
          { key: ApprovalStatus.APPROVED, label: '已通过', count: approveCount },
          { key: ApprovalStatus.REJECTED, label: '已驳回', count: rejectCount },
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
          <p className="text-sm">暂无已办记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isApproved = task.status === ApprovalStatus.APPROVED
            return (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate('/tools/approval')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* 状态图标 */}
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isApproved ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isApproved ? (
                        <CheckCircle2 size={18} className="text-green-600" />
                      ) : (
                        <XCircle size={18} className="text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                          {task.bizRecordId}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {APPROVAL_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1.5">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span>{BIZ_TYPE_LABELS[task.bizType]}</span>
                        <span>发起人: {task.initiator.name}</span>
                        {task.customerName && <span>{task.customerName}</span>}
                        {task.amount && <span className="font-mono">{formatCurrency(task.amount)}</span>}
                        <span>
                          <Clock size={12} className="inline mr-1" />
                          {formatDate(task.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="shrink-0 flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/tools/approval') }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 px-2 py-1"
                    >
                      <Eye size={13} />
                      查看详情
                    </button>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
