// ============================================================
// 待办任务 — 待当前用户审批的任务集中视图
// 支持：快速通过/驳回/转审/批量操作/催办提醒
// ============================================================

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, AlertCircle, CheckCircle2, XCircle, RotateCcw,
  Search, Filter, ChevronRight, Bell, UserPlus, ChevronDown,
  MessageSquare, Send, X, Check, Zap,
} from 'lucide-react'
import { ApprovalStatus, APPROVAL_STATUS_LABELS } from '../types/approval'
import { BIZ_TYPE_LABELS } from '../data/approvalConfig'
import { getMyTodoTasks, type ApprovalTask, CURRENT_USER } from '../data/mockApprovalTasks'

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

/** 流转审批人选项 */
const TRANSFER_OPTIONS = [
  { userId: 'user_002', name: '刘总' },
  { userId: 'user_003', name: '张工' },
  { userId: 'user_006', name: '赵工' },
]

export default function TodoTasks() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [bizFilter, setBizFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeAction, setActiveAction] = useState<{ taskId: string; action: 'approve' | 'reject' | 'transfer' } | null>(null)
  const [actionComment, setActionComment] = useState('')
  const [transferTarget, setTransferTarget] = useState(TRANSFER_OPTIONS[0].userId)
  const [urgeTargetId, setUrgeTargetId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const allTasks = useMemo(() => getMyTodoTasks(), [])
  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (bizFilter !== 'all' && t.bizType !== bizFilter) return false
      if (search && !t.title.includes(search) && !t.bizRecordId.includes(search)) return false
      return true
    })
  }, [allTasks, search, bizFilter])

  const bizTypes = useMemo(() => [...new Set(allTasks.map(t => t.bizType))], [allTasks])
  const overdueCount = useMemo(() => allTasks.filter(t => t.isOverdue).length, [allTasks])
  const urgeCount = useMemo(() => allTasks.reduce((s, t) => s + t.urgeCount, 0), [allTasks])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)))
    }
  }, [tasks, selectedIds])

  const handleAction = (action: 'approve' | 'reject') => {
    if (!activeAction) return
    const label = action === 'approve' ? '已通过' : '已驳回'
    const task = tasks.find(t => t.id === activeAction.taskId)
    showToast(`${task?.title || '审批'} ${label}${actionComment ? '（已附意见）' : ''}`)
    setActiveAction(null)
    setActionComment('')
  }

  const handleTransfer = () => {
    if (!activeAction) return
    const target = TRANSFER_OPTIONS.find(o => o.userId === transferTarget)
    showToast(`已转审给 ${target?.name || ''}`)
    setActiveAction(null)
    setActionComment('')
    setTransferTarget(TRANSFER_OPTIONS[0].userId)
  }

  const handleBatchApprove = () => {
    showToast(`已批量通过 ${selectedIds.size} 条审批`)
    setSelectedIds(new Set())
  }

  const handleUrge = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    showToast(`已催办 "${task?.title}"，发起人将收到提醒`)
    setUrgeTargetId(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页头 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">待办任务</h1>
            <p className="text-sm text-gray-500 mt-1">
              {allTasks.length} 条待审批
              {overdueCount > 0 && (
                <span className="text-red-500 ml-2">({overdueCount} 条已超时)</span>
              )}
              {urgeCount > 0 && (
                <span className="text-orange-500 ml-2">({urgeCount} 次催办)</span>
              )}
            </p>
          </div>

          {/* 批量操作 */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">已选 {selectedIds.size} 项</span>
              <button
                onClick={handleBatchApprove}
                className="btn-primary inline-flex items-center gap-1.5 text-sm"
              >
                <Zap size={15} />
                批量通过
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索单据号或客户..."
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

        {tasks.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-500 hover:bg-gray-50"
          >
            {selectedIds.size === tasks.length ? '取消全选' : '全选'}
          </button>
        )}
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-green-300" />
          <p className="text-lg font-medium text-gray-500">全部搞定！</p>
          <p className="text-sm mt-1">当前没有待审批的任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id}>
              <TodoCard
                task={task}
                selected={selectedIds.has(task.id)}
                onSelect={() => toggleSelect(task.id)}
                activeAction={activeAction}
                setActiveAction={setActiveAction}
                actionComment={actionComment}
                setActionComment={setActionComment}
                onAction={handleAction}
                transferTarget={transferTarget}
                setTransferTarget={setTransferTarget}
                onTransfer={handleTransfer}
                urgeTargetId={urgeTargetId}
                setUrgeTargetId={setUrgeTargetId}
                onUrge={handleUrge}
                navigate={navigate}
              />
            </div>
          ))}
        </div>
      )}

      {/* Toast 提示 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-fade-in z-50">
          <CheckCircle2 size={16} className="inline mr-2" />
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ==============================
// 待办卡片组件
// ==============================
function TodoCard({
  task, selected, onSelect,
  activeAction, setActiveAction,
  actionComment, setActionComment,
  onAction, transferTarget, setTransferTarget, onTransfer,
  urgeTargetId, setUrgeTargetId, onUrge,
  navigate,
}: {
  task: ApprovalTask
  selected: boolean
  onSelect: () => void
  activeAction: { taskId: string; action: 'approve' | 'reject' | 'transfer' } | null
  setActiveAction: (a: { taskId: string; action: 'approve' | 'reject' | 'transfer' } | null) => void
  actionComment: string
  setActionComment: (s: string) => void
  onAction: (action: 'approve' | 'reject') => void
  transferTarget: string
  setTransferTarget: (s: string) => void
  onTransfer: () => void
  urgeTargetId: string | null
  setUrgeTargetId: (id: string | null) => void
  onUrge: (id: string) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const isActionOpen = activeAction?.taskId === task.id
  const currentProgress = `第${task.currentLevel}/${task.totalLevels}级`

  return (
    <div className={`bg-white rounded-lg border transition-all ${
      selected ? 'border-brand-400 bg-brand-50/30 ring-1 ring-brand-400' :
      task.isOverdue ? 'border-red-200 bg-red-50/20' :
      'border-gray-200 hover:border-brand-200 hover:shadow-sm'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 选择框 */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
          />

          {/* 主要内容 */}
          <div className="flex-1 min-w-0">
            {/* 标签行 */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                {task.bizRecordId}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                待审批
              </span>
              {task.isOverdue && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  <AlertCircle size={12} />
                  超时
                </span>
              )}
              {task.urgeCount > 0 && (
                <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  <Bell size={10} />
                  催办×{task.urgeCount}
                </span>
              )}
            </div>

            {/* 标题 */}
            <h3 className="text-sm font-medium text-gray-900 mb-1.5">
              {task.title}
            </h3>

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>{BIZ_TYPE_LABELS[task.bizType]}</span>
              <span>发起人: {task.initiator.name}</span>
              {task.customerName && <span>{task.customerName}</span>}
              {task.amount && <span className="font-mono">{formatCurrency(task.amount)}</span>}
              <span>{formatRelative(task.submittedAt)}</span>
              <span>{currentProgress}</span>
              {task.deadlineAt && (
                <span className={task.isOverdue ? 'text-red-500' : ''}>
                  截止: {new Date(task.deadlineAt).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
          </div>

          {/* 快速操作按钮 */}
          {!isActionOpen && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setActiveAction({ taskId: task.id, action: 'approve' })}
                className="btn-primary inline-flex items-center gap-1 text-xs px-3 py-1.5"
              >
                <Check size={14} />
                通过
              </button>
              <button
                onClick={() => setActiveAction({ taskId: task.id, action: 'reject' })}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium"
              >
                <X size={14} />
                驳回
              </button>
              <button
                onClick={() => setUrgeTargetId(task.id)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50"
                title="催办"
              >
                <Bell size={14} />
              </button>
              <button
                onClick={() => setActiveAction({ taskId: task.id, action: 'transfer' })}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                title="转审"
              >
                <UserPlus size={14} />
              </button>
              <ChevronRight
                size={16}
                className="text-gray-300 cursor-pointer hover:text-brand-500"
                onClick={() => navigate('/tools/approval')}
              />
            </div>
          )}
        </div>

        {/* 展开操作面板 */}
        {isActionOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {activeAction.action === 'transfer' ? (
              // 转审面板
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">转审给</h4>
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {TRANSFER_OPTIONS.map((opt) => (
                    <option key={opt.userId} value={opt.userId}>{opt.name}</option>
                  ))}
                </select>
                <textarea
                  placeholder="转审理由（选填）..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={2}
                  className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={onTransfer}
                    className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2"
                  >
                    <Send size={14} />
                    确认转审
                  </button>
                  <button
                    onClick={() => { setActiveAction(null); setActionComment('') }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              // 审批/驳回面板
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {activeAction.action === 'approve' ? '审批通过' : '审批驳回'}
                </h4>
                <textarea
                  placeholder={`输入${activeAction.action === 'approve' ? '审批' : '驳回'}意见（选填）...`}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={2}
                  className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAction(activeAction.action as 'approve' | 'reject')}
                    className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-white ${
                      activeAction.action === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {activeAction.action === 'approve' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    确认{activeAction.action === 'approve' ? '通过' : '驳回'}
                  </button>
                  <button
                    onClick={() => { setActiveAction(null); setActionComment('') }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 催办确认弹窗 */}
        {urgeTargetId === task.id && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Bell size={14} className="text-orange-500" />
                催办提醒
              </h4>
              <p className="text-sm text-gray-500">
                将向发起人 <span className="font-medium text-gray-700">{task.initiator.name}</span> 发送催办提醒
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUrge(task.id)}
                  className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2"
                >
                  <Send size={14} />
                  发送催办
                </button>
                <button
                  onClick={() => setUrgeTargetId(null)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
