// ============================================================
// 审批待办页 — ApprovalInbox
// GET /api/v1/approvals/inbox 列出待审（服务端按当前用户角色/销售域过滤）
// 每条可「同意 / 驳回」；切换「已办」只读展示 GET /api/v1/approvals/done。
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { Inbox, CheckCircle2, Check, X, Loader2, AlertCircle, User, Clock, Tag } from 'lucide-react'
import {
  getInbox,
  getDone,
  approveApproval,
  rejectApproval,
  type ApprovalListItem,
  type EntityType,
  type SalesType,
} from '../services/approvalService'
import RejectReasonModal from '../components/RejectReasonModal'

const ENTITY_LABELS: Record<EntityType, string> = {
  CONTRACT: '合同',
  PI: 'PI',
  ORDER: '订单',
  INVOICE: '发票',
  DELIVERY: '发货',
  DEALER_REPORT: '经销商报备',
}

const SALES_LABELS: Record<SalesType, string> = {
  INTERNAL: '内销',
  EXTERNAL: '外销',
}

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Tab = 'inbox' | 'done'

export default function ApprovalInbox() {
  const [tab, setTab] = useState<Tab>('inbox')
  const [list, setList] = useState<ApprovalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [rejectTarget, setRejectTarget] = useState<ApprovalListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = tab === 'inbox' ? await getInbox() : await getDone()
      setList(data || [])
    } catch (e: any) {
      setError(e?.message || '加载失败')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async (item: ApprovalListItem) => {
    setBusyId(item.id)
    setError('')
    try {
      await approveApproval(item.id)
      await load()
    } catch (e: any) {
      setError(e?.message || '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectConfirm = async (reason: string, comment?: string) => {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    setError('')
    try {
      await rejectApproval(rejectTarget.id, reason, comment)
      setRejectTarget(null)
      await load()
    } catch (e: any) {
      setError(e?.message || '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">审批待办</h1>
        </div>
        <div className="ml-4 inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setTab('inbox')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'inbox' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            待审
          </button>
          <button
            onClick={() => setTab('done')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'done' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            已办
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
          <Loader2 size={18} className="animate-spin" /> 加载中...
        </div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox size={40} className="text-gray-300 mb-3" />
          <p className="text-sm">{tab === 'inbox' ? '暂无待审审批' : '暂无已办审批'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => {
            const isInbox = tab === 'inbox'
            const busy = busyId === item.id
            return (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-xs font-medium">
                        <Tag size={11} />{ENTITY_LABELS[item.entityType] || item.entityType}
                      </span>
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {item.entityCode || item.title || item.entityId}
                      </span>
                      {item.title && item.entityCode && (
                        <span className="text-xs text-gray-400 truncate">{item.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1"><User size={12} />提交人：{item.submitterName}</span>
                      {item.salesType ? (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{SALES_LABELS[item.salesType]}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">销售域不限</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Clock size={12} />{formatTime(item.createdAt)}</span>
                    </div>

                    {/* 已办附加信息 */}
                    {!isInbox && (
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        {item.approverName && <span>审批人：{item.approverName}</span>}
                        <span>决定时间：{formatTime(item.decidedAt)}</span>
                        {item.status === 'REJECTED' && item.rejectReason && (
                          <span className="text-red-600">驳回原因：{item.rejectReason}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作区（仅待审） */}
                  {isInbox && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={busy}
                        className="btn-primary text-xs inline-flex items-center gap-1.5"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        同意
                      </button>
                      <button
                        onClick={() => setRejectTarget(item)}
                        disabled={busy}
                        className="btn-danger text-xs inline-flex items-center gap-1.5"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        驳回
                      </button>
                    </div>
                  )}

                  {!isInbox && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'APPROVED'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <CheckCircle2 size={12} />
                      {item.status === 'APPROVED' ? '已通过' : '已驳回'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RejectReasonModal
        open={!!rejectTarget}
        entityLabel={rejectTarget?.entityCode || rejectTarget?.title}
        submitting={!!busyId}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
