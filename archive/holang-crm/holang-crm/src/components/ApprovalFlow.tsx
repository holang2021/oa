import { Clock, User, ChevronRight, AlertCircle, ArrowLeftRight, X, Check } from 'lucide-react'
import { useState } from 'react'
import { ApprovalFlowProps, ApprovalStatus, ApprovalAction, ProcessStatus, PROCESS_STATUS_LABELS, APPROVAL_STATUS_LABELS } from '../types/approval'
import { BIZ_TYPE_LABELS } from '../data/approvalConfig'
import { useApproval } from '../hooks/useApproval'
import ApprovalBadge from './ApprovalBadge'
import ApprovalTimeline from './ApprovalTimeline'
import ApprovalActions from './ApprovalActions'

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ApprovalFlow(props: ApprovalFlowProps) {
  const {
    data,
    config,
    loading,
    actionComment,
    setActionComment,
    showActionPanel,
    setShowActionPanel,
    availableActions,
    canAct,
    executeAction,
    isReadOnly,
    // V4 转审/加签面板状态
    showTransferPanel,
    setShowTransferPanel,
    transferToName,
    setTransferToName,
  } = useApproval(props)

  const { bizType } = props
  // 转审弹窗状态（来自 hook）
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTarget, setTransferTarget] = useState<{ userId: string; name: string } | null>(null)

  const handleAction = (action: ApprovalAction['action']) => {
    if (action === 'transfer') {
      setShowTransferModal(true)
      return
    }
    executeAction({ action, comment: actionComment || undefined })
  }

  const confirmTransfer = () => {
    if (!transferTarget) return
    executeAction({ action: 'transfer', transferTo: transferTarget, comment: actionComment || undefined })
    setShowTransferModal(false)
    setTransferTarget(null)
  }

  return (
    <div className={props.className}>
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900">
            {BIZ_TYPE_LABELS[bizType]}审批流程
          </h3>
          <ApprovalBadge status={data.status} />
        </div>

        {canAct && !showActionPanel && (
          <button
            onClick={() => setShowActionPanel(true)}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            去处理 <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* 基本信息卡片 */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <InfoItem icon={<User size={14} />} label="发起人" value={data.initiator.name} />
          <InfoItem icon={<Clock size={14} />} label="启动时间" value={formatDateTime(data.startedAt)} />
          <InfoItem
            icon={<Clock size={14} />}
            label="结束时间"
            value={formatDateTime(data.completedAt)}
          />
          <InfoItem
            label="流程状态"
            value={
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                {PROCESS_STATUS_LABELS[data.processStatus]}
              </span>
            }
          />
          <InfoItem
            label="审批状态"
            value={<ApprovalBadge status={data.status} size="sm" />}
          />
        </div>

        {data.currentProgress && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2 text-sm text-gray-500">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
            <span>{data.currentProgress}</span>
          </div>
        )}
      </div>

      {/* 审批层级进度 */}
      <div className="card mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">审批进度</h4>
        <div className="flex flex-wrap items-center gap-2">
          {data.levels.map((level, idx) => (
            <div key={level.level} className="flex items-center gap-2">
              {/* 层级节点 */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  level.status === 'approved'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : level.status === 'rejected'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : level.status === 'acting'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    level.status === 'approved'
                      ? 'bg-green-500 text-white'
                      : level.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : level.status === 'acting'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {level.level}
                </div>
                <div>
                  <div className="font-medium">{level.name}</div>
                  {level.approver && (
                    <div className="text-xs opacity-80">{level.approver.name}</div>
                  )}
                  {level.status === 'approved' && (
                    <div className="text-xs text-green-600">已通过</div>
                  )}
                  {level.status === 'rejected' && (
                    <div className="text-xs text-red-600">已驳回</div>
                  )}
                  {level.status === 'acting' && (
                    <div className="text-xs text-blue-600">处理中</div>
                  )}
                  {level.status === 'waiting' && (
                    <div className="text-xs">等待中</div>
                  )}
                </div>
              </div>

              {/* 连接箭头 */}
              {idx < data.levels.length - 1 && (
                <ChevronRight
                  size={16}
                  className={`shrink-0 ${
                    data.levels[idx].status === 'approved' ? 'text-green-400' : 'text-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 审批操作面板 */}
      {showActionPanel && !isReadOnly && (
        <div className="mb-4">
          <ApprovalActions
            availableActions={availableActions}
            loading={loading}
            comment={actionComment}
            onCommentChange={setActionComment}
            onAction={handleAction}
            onClose={() => setShowActionPanel(false)}
          />
        </div>
      )}

      {/* 审批历史时间轴 */}
      <div className="card">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">审批记录</h4>
        <ApprovalTimeline history={data.history} />
      </div>

      {/* 转审弹窗 */}
      {showTransferModal && (
        <TransferModal
          show={showTransferModal}
          transferTarget={transferTarget}
          setTransferTarget={setTransferTarget}
          comment={actionComment}
          onCommentChange={setActionComment}
          onConfirm={confirmTransfer}
          onCancel={() => {
            setShowTransferModal(false)
            setTransferTarget(null)
            setActionComment('')
          }}
        />
      )}
    </div>
  )
}

/** 转审弹窗 */
function TransferModal({
  show,
  transferTarget,
  setTransferTarget,
  comment,
  onCommentChange,
  onConfirm,
  onCancel,
}: {
  show: boolean
  transferTarget: { userId: string; name: string } | null
  setTransferTarget: (v: { userId: string; name: string } | null) => void
  comment: string
  onCommentChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  // 可选审批人列表（实际项目从 API 加载，这里用 mock）
  const candidates = [
    { userId: 'manager_zhang', name: '张经理（部门主管）' },
    { userId: 'manager_li', name: '李经理（销售主管）' },
    { userId: 'finance_wang', name: '王财务（财务主管）' },
    { userId: 'warehouse_zhao', name: '赵仓库（仓库主管）' },
    { userId: 'gm_liu', name: '刘总（总经理）' },
  ]

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        {/* 标题 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-indigo-600" />
            转审 — 选择审批人
          </h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 审批人选择 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">选择转审对象</label>
            <div className="space-y-1.5">
              {candidates.map(c => (
                <label key={c.userId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
                  <input
                    type="radio"
                    name="transferTarget"
                    checked={transferTarget?.userId === c.userId}
                    onChange={() => setTransferTarget(c)}
                    className="text-indigo-600"
                  />
                  <span className="text-sm text-gray-800">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 转审意见 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">转审意见（选填）</label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              placeholder="说明转审原因…"
              value={comment}
              onChange={e => onCommentChange(e.target.value)}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button onClick={onCancel} className="btn-ghost text-sm">取消</button>
          <button
            onClick={onConfirm}
            disabled={!transferTarget}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            确认转审
          </button>
        </div>
      </div>
    </div>
  )
}

/** 信息条目子组件 */
function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-400 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-gray-800 font-medium">{value}</div>
    </div>
  )
}
