import { Check, X, Send, Undo2, Loader2, UserPlus, Clock, ArrowLeftRight } from 'lucide-react'
import type { ApprovalAction } from '../types'

interface ApprovalActionsProps {
  availableActions: ApprovalAction['action'][]
  loading: boolean
  comment: string
  onCommentChange: (value: string) => void
  onAction: (action: ApprovalAction['action']) => void
  onClose: () => void
}

const actionConfig: Record<ApprovalAction['action'], { label: string; icon: typeof Check; style: string }> = {
  submit: { label: '提交审批', icon: Send, style: 'bg-brand-600 hover:bg-brand-700 text-white' },
  approve: { label: '同意', icon: Check, style: 'bg-green-600 hover:bg-green-700 text-white' },
  reject: { label: '驳回', icon: X, style: 'bg-red-600 hover:bg-red-700 text-white' },
  withdraw: { label: '撤回', icon: Undo2, style: 'bg-gray-600 hover:bg-gray-700 text-white' },
  counter_sign: { label: '加签', icon: UserPlus, style: 'bg-purple-600 hover:bg-purple-700 text-white' },
  urge: { label: '催办', icon: Clock, style: 'bg-amber-600 hover:bg-amber-700 text-white' },
  transfer: { label: '转审', icon: ArrowLeftRight, style: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
}

export default function ApprovalActions({
  availableActions,
  loading,
  comment,
  onCommentChange,
  onAction,
  onClose,
}: ApprovalActionsProps) {
  if (availableActions.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">审批操作</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs"
          disabled={loading}
        >
          收起
        </button>
      </div>

      {/* 审批意见输入 */}
      <div className="mb-3">
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="审批意见（选填）"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => {
          const cfg = actionConfig[action]
          const Icon = cfg.icon
          return (
            <button
              key={action}
              onClick={() => onAction(action)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cfg.style}`}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Icon size={15} />
              )}
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
