// ============================================================
// 驳回原因输入弹窗 — 供审批面板 / 待办页复用
// rejectReason 必填，空提交会被后端 400，这里也做前端必填校验。
// ============================================================
import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface RejectReasonModalProps {
  open: boolean
  /** 单据标题/编号，用于弹窗提示文案 */
  entityLabel?: string
  submitting?: boolean
  onConfirm: (reason: string, comment?: string) => void
  onCancel: () => void
}

export default function RejectReasonModal({
  open,
  entityLabel,
  submitting = false,
  onConfirm,
  onCancel,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('驳回原因必填')
      return
    }
    onConfirm(trimmed, comment.trim() || undefined)
  }

  const handleCancel = () => {
    setReason('')
    setComment('')
    setError('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={handleCancel}>
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            驳回审批{entityLabel ? ` · ${entityLabel}` : ''}
          </h3>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-medium text-gray-500 mb-1">
          驳回原因 <span className="text-red-500">*</span>
        </label>
        <textarea
          className="input-field h-24 resize-none"
          placeholder="请填写驳回原因（必填，将记录到审批轨迹）"
          value={reason}
          onChange={(e) => { setReason(e.target.value); if (error) setError('') }}
          disabled={submitting}
          autoFocus
        />

        <label className="block text-xs font-medium text-gray-500 mb-1 mt-3">
          备注（选填）
        </label>
        <input
          className="input-field"
          placeholder="补充说明（选填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
        />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <div className="flex gap-2 justify-end mt-4">
          <button onClick={handleCancel} className="btn-secondary text-xs" disabled={submitting}>取消</button>
          <button
            onClick={handleConfirm}
            className="btn-danger text-xs inline-flex items-center gap-1.5"
            disabled={submitting}
          >
            {submitting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            确认驳回
          </button>
        </div>
      </div>
    </div>
  )
}
