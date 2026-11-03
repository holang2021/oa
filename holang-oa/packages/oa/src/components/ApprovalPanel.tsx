// ============================================================
// 审批面板（服务端权威）— ApprovalPanel
// 挂载 / entityId 变化时拉取 getApprovalByEntity，展示状态药丸 + 轨迹时间轴 + 操作区。
// 数据来自真实后端审批引擎，不依赖前端模拟件（useApproval / ApprovalFlow 等）。
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Check, X, Send, RotateCcw, Info } from 'lucide-react'
import {
  getApprovalByEntity,
  submitApproval,
  approveApproval,
  rejectApproval,
  resubmitApproval,
  type EntityType,
  type Approval,
  type ApprovalStepAction,
} from '../services/approvalService'
import { getCurrentUser } from '../services/authService'
import RejectReasonModal from './RejectReasonModal'

interface ApprovalPanelProps {
  entityType: EntityType
  entityId: string
  entityCode?: string
  title?: string
}

/** 动作中文标签 */
const ACTION_LABELS: Record<ApprovalStepAction, string> = {
  SUBMIT: '提交',
  APPROVE: '通过',
  REJECT: '驳回',
  RESUBMIT: '重新提交',
}

/** 状态药丸样式（与现有 badge 风格一致：蓝=审批中、绿=已通过、红=已驳回、灰=未提交） */
const PILL_STYLE: Record<string, string> = {
  NONE: 'bg-gray-100 text-gray-500 border-gray-200',
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
}
const PILL_LABEL: Record<string, string> = {
  NONE: '未提交',
  PENDING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 从审批数组里选「当前有效」的一条：优先 PENDING → 其次 REJECTED（最新）→ 再次 APPROVED */
function pickActive(list: Approval[]): Approval | null {
  if (!list || list.length === 0) return null
  const pending = list.find((a) => a.status === 'PENDING')
  if (pending) return pending
  const rejected = list
    .filter((a) => a.status === 'REJECTED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (rejected.length > 0) return rejected[0]
  const approved = list
    .filter((a) => a.status === 'APPROVED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return approved.length > 0 ? approved[0] : null
}

export default function ApprovalPanel({ entityType, entityId, entityCode, title }: ApprovalPanelProps) {
  const [approval, setApproval] = useState<Approval | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [noApprovalTip, setNoApprovalTip] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setNoApprovalTip('')
    try {
      const list = await getApprovalByEntity(entityType, entityId)
      setApproval(pickActive(list))
    } catch (e: any) {
      setError(e?.message || '加载审批信息失败')
      setApproval(null)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    if (entityId) load()
  }, [entityId, load])

  const effectiveStatus = approval?.status ?? 'NONE'

  const handleSubmit = async () => {
    setBusy(true)
    setError('')
    setNoApprovalTip('')
    try {
      const result = await submitApproval({ entityType, entityId, entityCode, title })
      if (result.data) {
        await load()
      } else {
        // 该单据未启用审批（后端 code 0, data null）
        setNoApprovalTip(result.message || '该单据未启用审批')
      }
    } catch (e: any) {
      setError(e?.message || '提交失败')
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = async () => {
    if (!approval) return
    setBusy(true)
    setError('')
    try {
      await approveApproval(approval.id)
      await load()
    } catch (e: any) {
      setError(e?.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const handleRejectConfirm = async (reason: string, comment?: string) => {
    if (!approval) return
    setBusy(true)
    setError('')
    try {
      await rejectApproval(approval.id, reason, comment)
      setRejectOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const handleResubmit = async () => {
    if (!approval) return
    setBusy(true)
    setError('')
    try {
      await resubmitApproval(approval.id)
      await load()
    } catch (e: any) {
      setError(e?.message || '重新提交失败')
    } finally {
      setBusy(false)
    }
  }

  const user = getCurrentUser()
  const canResubmit =
    approval && (!user || user.id === approval.submitterId || user.role === 'ADMIN')

  const steps = approval?.steps
    ? [...approval.steps].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : []

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-700">审批</h2>
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${PILL_STYLE[effectiveStatus]}`}>
          {PILL_LABEL[effectiveStatus]}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
          <Loader2 size={16} className="animate-spin" /> 加载审批信息...
        </div>
      ) : (
        <>
          {/* 轨迹时间轴 */}
          {approval && steps.length > 0 ? (
            <div className="space-y-0 mb-4">
              {steps.map((s, idx) => {
                const isLast = idx === steps.length - 1
                const isReject = s.action === 'REJECT'
                return (
                  <div key={s.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        s.action === 'APPROVE' ? 'bg-green-100 text-green-600'
                          : isReject ? 'bg-red-100 text-red-600'
                          : s.action === 'RESUBMIT' ? 'bg-brand-100 text-brand-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {s.action === 'APPROVE' ? '✓' : isReject ? '✕' : s.action === 'RESUBMIT' ? '↻' : '↑'}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${!isLast ? 'pb-4' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{s.actorName}</span>
                        <span className="text-xs text-gray-500">{ACTION_LABELS[s.action] || s.action}</span>
                      </div>
                      {s.comment && <p className="text-sm text-gray-600 mt-0.5">{s.comment}</p>}
                      {isReject && s.rejectReason && (
                        <p className="text-sm text-red-600 mt-0.5">驳回原因：{s.rejectReason}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">{formatTime(s.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : !approval ? (
            <div className="text-sm text-gray-400 py-4 text-center">尚未提交审批</div>
          ) : null}

          {/* 操作区 */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {noApprovalTip && (
              <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
                <Info size={13} />{noApprovalTip}
              </span>
            )}

            {effectiveStatus === 'NONE' && !noApprovalTip && (
              <button onClick={handleSubmit} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                提交审批
              </button>
            )}

            {effectiveStatus === 'PENDING' && (
              <>
                <button onClick={handleApprove} disabled={busy} className="btn-primary text-xs inline-flex items-center gap-1.5">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  同意
                </button>
                <button onClick={() => setRejectOpen(true)} disabled={busy} className="btn-danger text-xs inline-flex items-center gap-1.5">
                  <X size={13} />
                  驳回
                </button>
              </>
            )}

            {effectiveStatus === 'REJECTED' && (
              <button
                onClick={handleResubmit}
                disabled={busy || !canResubmit}
                title={canResubmit ? undefined : '仅提交人或管理员可重新提交'}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                重新提交
              </button>
            )}

            {effectiveStatus === 'APPROVED' && (
              <span className="text-xs text-gray-400">该单据已审批通过</span>
            )}
          </div>
        </>
      )}

      <RejectReasonModal
        open={rejectOpen}
        entityLabel={approval?.entityCode || approval?.title}
        submitting={busy}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectOpen(false)}
      />
    </div>
  )
}
