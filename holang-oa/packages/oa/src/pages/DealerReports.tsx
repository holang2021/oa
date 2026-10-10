// ============================================================
// 经销商报备管理 — HOLANG OA
// 读取后端真实 dealer-reports 接口，销售提交报备、管理员/主管审核。
// 后端路由（API_PREFIX=/api/v1）：
//   GET    /dealer-reports           列表（status 筛选；SALES 仅看自身）
//   POST   /dealer-reports/submit     提交报备（带客户去重检测）
//   GET    /dealer-reports/:id        详情
//   PUT    /dealer-reports/:id/review 审核 approve/reject（ADMIN/MANAGER）
// 铁律：前端不暴露物理删除（后端 DELETE 仅 ADMIN，按数据治理默认不开放，防误删）。
// ============================================================

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Plus, Search, X, Save, Check, XCircle, Eye, ClipboardList, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'
import { useI18n } from '../i18n/I18nContext'

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}
const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

interface DealerReportRow {
  id: string
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail: string | null
  dealerName: string
  dealerPhone: string
  dealerEmail: string | null
  status: string
  salesType?: string | null
  submittedBy: string | null
  submitter?: { name: string | null } | null
  duplicateOf: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  notes: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

function fmt(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

export default function DealerReports() {
  const { t } = useI18n()
  const [list, setList] = useState<DealerReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [detail, setDetail] = useState<DealerReportRow | null>(null)

  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem('oa_user') || '{}')
    } catch {
      return {}
    }
  })()
  const canReview = ['ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(me.role)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/dealer-reports', { status: statusFilter, page: 1, pageSize: 100 })
    if (res.code === 0 && res.data?.list) setList(res.data.list)
    else if (res.code === 0 && Array.isArray(res.data)) setList(res.data)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (id: string) => {
    const res = await api.get(`/dealer-reports/${id}`)
    if (res.code === 0 && res.data) setDetail(res.data)
    else alert(res.message || '加载失败')
  }

  const review = async (id: string, action: 'approve' | 'reject', notes: string) => {
    const res = await api.put(`/dealer-reports/${id}/review`, { action, notes: notes || undefined })
    if (res.code === 0) {
      setDetail(null)
      load()
    } else {
      alert(res.message || '审核失败')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-700">经销商报备</h3>
          <p className="text-xs text-gray-400 mt-0.5">共 {list.length} 条报备</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已驳回</option>
          </select>
          <button
            onClick={() => setShowSubmit(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> 提交报备
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">公司名称</th>
              <th className="py-2">联系人</th>
              <th className="py-2">代理商</th>
              <th className="py-2">状态</th>
              <th className="py-2">报备时间</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">加载中…</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">暂无报备记录</td></tr>
            )}
            {!loading && list.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">
                  <div className="flex items-center gap-1">
                    {r.companyName}
                    {r.duplicateOf && (
                      <span title="疑似重复客户" className="text-amber-500"><AlertTriangle size={13} /></span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">{r.contactPhone || '—'}</div>
                  {r.salesType === 'EXTERNAL' && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px]">外销</span>
                  )}
                  {r.salesType === 'INTERNAL' && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">内销</span>
                  )}
                  {r.submitter?.name && (
                    <div className="text-[11px] text-gray-400 mt-0.5">报备人：{r.submitter.name}</div>
                  )}
                </td>
                <td className="py-2">
                  {r.contactName || <span className="text-gray-300">未提供</span>}
                  {r.contactEmail ? <div className="text-[11px] text-gray-400">{r.contactEmail}</div> : null}
                </td>
                <td className="py-2">
                  {r.dealerName}
                  <div className="text-[11px] text-gray-400">{r.dealerPhone}</div>
                </td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-400">{fmt(r.createdAt)}</td>
                <td className="py-2">
                  <button onClick={() => openDetail(r.id)} className="text-brand-600 hover:text-brand-800" title="查看/审核">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSubmit && (
        <SubmitModal
          onClose={() => setShowSubmit(false)}
          onDone={() => { setShowSubmit(false); load() }}
        />
      )}
      {detail && (
        <DetailModal
          report={detail}
          canReview={canReview}
          onClose={() => setDetail(null)}
          onReview={review}
        />
      )}
    </div>
  )
}

// 提交报备弹窗
function SubmitModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    companyName: '', contactName: '', contactPhone: '', contactEmail: '',
    dealerName: '', dealerPhone: '', salesType: 'INTERNAL',
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.companyName.trim()) e.companyName = '请填写公司名称'
    if (!form.dealerName.trim()) e.dealerName = '请填写报备来源方'
    if (!form.dealerPhone.trim()) e.dealerPhone = '请填写来源方联系电话'
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) e.contactEmail = '邮箱格式不正确'
    setErr(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    const res = await api.post('/dealer-reports/submit', {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      dealerName: form.dealerName.trim(),
      dealerPhone: form.dealerPhone.trim(),
      salesType: form.salesType,
    })
    setSubmitting(false)
    if (res.code === 0) {
      alert(res.message || '报备提交成功')
      onDone()
    } else {
      alert(res.message || '提交失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-7 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-800">提交经销商报备</h3>
            <p className="text-xs text-gray-400 mt-0.5">系统自动查重防撞单 · 审核通过后转为客户档案</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-7 space-y-6 overflow-y-auto max-h-[68vh]">
          {/* ① 报备客户（终端客户） */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-3.5 rounded bg-[var(--color-primary,#1a56db)]" />
              <h4 className="text-sm font-medium text-gray-700">报备客户</h4>
            </div>
            <div className="space-y-4">
              <Field label="公司名称" required err={err.companyName}>
                <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={`input text-sm w-full ${err.companyName ? 'border-red-300' : ''}`} placeholder="报备的终端客户公司全称" />
              </Field>
              <Field label="销售类型">
                <select value={form.salesType} onChange={(e) => setForm({ ...form, salesType: e.target.value })} className="input text-sm w-full">
                  <option value="INTERNAL">内销（经销商报备）</option>
                  <option value="EXTERNAL">外销（海外代理商报备）</option>
                </select>
              </Field>
            </div>
          </section>

          {/* ② 客户联系人（选填，弱化） */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-3.5 rounded bg-gray-300" />
              <h4 className="text-sm font-medium text-gray-700">客户联系人</h4>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">选填</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="联系人">
                <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="input text-sm w-full" placeholder="如：张经理" />
              </Field>
              <Field label="联系电话">
                <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="input text-sm w-full" placeholder="客户电话" />
              </Field>
              <div className="col-span-2">
                <Field label="邮箱">
                  <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={`input text-sm w-full ${err.contactEmail ? 'border-red-300' : ''}`} placeholder="可选" />
                </Field>
              </div>
            </div>
          </section>

          {/* ③ 报备来源渠道 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-3.5 rounded bg-[var(--color-primary,#1a56db)]" />
              <h4 className="text-sm font-medium text-gray-700">报备来源渠道</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={form.salesType === 'EXTERNAL' ? '代理商名称' : '经销商名称'} required err={err.dealerName}>
                <input value={form.dealerName} onChange={(e) => setForm({ ...form, dealerName: e.target.value })} className={`input text-sm w-full ${err.dealerName ? 'border-red-300' : ''}`} placeholder={form.salesType === 'EXTERNAL' ? '海外代理商名称' : '经销商/渠道商名称'} />
              </Field>
              <Field label={form.salesType === 'EXTERNAL' ? '代理商电话' : '经销商电话'} required err={err.dealerPhone}>
                <input value={form.dealerPhone} onChange={(e) => setForm({ ...form, dealerPhone: e.target.value })} className={`input text-sm w-full ${err.dealerPhone ? 'border-red-300' : ''}`} placeholder="联系电话" />
              </Field>
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-3 px-7 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button onClick={submit} disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? '提交中…' : <><Save size={16} /> 提交报备</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, err, children }: { label: string; required?: boolean; err?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-[var(--color-danger,#dc2626)] ml-0.5">*</span>}
      </label>
      {children}
      {err && <p className="text-[11px] text-red-500 mt-1">{err}</p>}
    </div>
  )
}

// 详情/审核弹窗
function DetailModal({ report, canReview, onClose, onReview }: {
  report: DealerReportRow
  canReview: boolean
  onClose: () => void
  onReview: (id: string, action: 'approve' | 'reject', notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [acting, setActing] = useState(false)
  const decided = report.status !== 'PENDING'

  const act = async (action: 'approve' | 'reject') => {
    setActing(true)
    await onReview(report.id, action, notes)
    setActing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">报备详情</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh] text-sm">
          <Row k="公司名称" v={report.companyName} />
          <Row k="联系人" v={report.contactName ? `${report.contactName}（${report.contactPhone}）` : '—'} />
          <Row k="邮箱" v={report.contactEmail || '-'} />
          <Row k="代理商" v={`${report.dealerName}（${report.dealerPhone}）`} />
          <Row k="销售类型" v={report.salesType === 'EXTERNAL' ? '外销（海外代理）' : '内销（经销商）'} />
          <Row k="提交人" v={report.submitter?.name || report.submittedBy || '-'} />
          {report.dealerEmail && <Row k="代理商邮箱" v={report.dealerEmail} />}
          <Row k="状态" v={<span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[report.status]}`}>{STATUS_LABELS[report.status] || report.status}</span>} />
          {report.duplicateOf && <Row k="重复检测" v={<span className="text-amber-600">⚠ 疑似重复客户（{report.duplicateOf}）</span>} />}
          <Row k="报备时间" v={fmt(report.createdAt)} />
          {report.reviewedAt && <Row k="审核时间" v={fmt(report.reviewedAt)} />}
          {report.notes && <Row k="审核备注" v={report.notes} />}
          {report.rejectReason && <Row k="驳回原因" v={report.rejectReason} />}
          {canReview && !decided && (
            <div className="pt-2 border-t">
              <label className="block text-xs font-medium text-gray-600 mb-1">审核备注</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input text-sm w-full" rows={2} placeholder="可选" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-ghost">关闭</button>
          {canReview && !decided && (
            <>
              <button onClick={() => act('reject')} disabled={acting} className="btn-ghost flex items-center gap-2 text-red-600 border-red-200">
                <XCircle size={16} /> 驳回
              </button>
              <button onClick={() => act('approve')} disabled={acting} className="btn-primary flex items-center gap-2">
                <Check size={16} /> 通过并转客户
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 py-1 border-b border-gray-50">
      <span className="w-20 shrink-0 text-gray-400">{k}</span>
      <span className="flex-1 text-gray-700">{v}</span>
    </div>
  )
}
