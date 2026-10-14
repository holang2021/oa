// ============================================================
// 代理商档案 — HOLANG OA
// 刘总 2026-10-09 拍板 A'（奥卡姆剃刀）：代理商=Customer 的一种(customerType='AGENT)，
// 本页只是 customers 的 AGENT 过滤视图+简化表单，不另立 Partner 表（已删）。
// 内销/外销统一；内/外销仅标签不分流流程;审批页呈现疑似重复给审批人裁决;
// 公司名归一化为查重主维度,邮箱/电话仅辅助不做唯一键。
// 后端路由(API_PREFIX=/api/v1):
//   GET    /partners                      列表(模糊查询 q + 筛选)
//   POST   /partners                      新建 → 一律 PENDING 待审批
//   PUT    /partners/:id                  编辑(驳回态保存=重新提交审批)
//   PUT    /partners/:id/review           审批 approve/reject(管理员/主管统一审批池)
//   GET    /partners/:id/review-checks    审批页实时模糊查重
// 铁律:前端不暴露删除(后端 DELETE 仅 ADMIN);提交人不能自审(后端强制)。
// ============================================================

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Plus, Search, X, Save, Check, XCircle, ShieldQuestion, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '正式档案',
  REJECTED: '已驳回',
  SUSPENDED: '暂停',
  TERMINATED: '终止',
}
const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-gray-100 text-gray-400',
}

interface PartnerRow {
  id: string
  companyName: string
  salesType: string
  agentRegion: string
  email: string | null
  contactName: string | null
  contactPhone: string | null
  ownerId: string | null
  responsibleId: string | null
  status: string
  followUp: string | null
  rejectReason: string | null
  owner?: { id: string; name: string | null } | null
  responsible?: { id: string; name: string | null } | null
  reviewer?: { id: string; name: string | null } | null
  submitter?: { id: string; name: string | null } | null
  updatedAt: string
}

interface UserOption { id: string; name: string | null; role?: string }

function fmt(iso: string | null): string {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('zh-CN') } catch { return iso }
}

export default function Partners() {
  const [list, setList] = useState<PartnerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState('')
  const [editing, setEditing] = useState<PartnerRow | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [reviewing, setReviewing] = useState<PartnerRow | null>(null)

  const me = (() => {
    try { return JSON.parse(localStorage.getItem('oa_user') || '{}') } catch { return {} as any }
  })()
  const canReview = ['ADMIN', 'INTERNAL_LEAD', 'EXTERNAL_LEAD', 'MANAGER'].includes(me.role)
  const hasActiveFilter = !!q.trim() || !!statusTab
  const emptyTitle = hasActiveFilter ? '没有找到匹配代理商' : '暂无代理商档案'
  const emptyDesc = hasActiveFilter ? '可换公司名、联系人、邮箱或清空状态筛选后再看。' : '新增代理商后会先进入主管审批，通过后成为正式档案。'

  const clearFilters = () => {
    setQ('')
    setSearchQuery('')
    setStatusTab('')
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params: string[] = []
    if (searchQuery.trim()) params.push(`q=${encodeURIComponent(searchQuery.trim())}`)
    if (statusTab) params.push(`status=${statusTab}`)
    const res = await api.get(`/partners${params.length ? '?' + params.join('&') : ''}`)
    if (res.code === 0) {
      setList(res.data?.list || [])
      setTotal(res.data?.pagination?.total || 0)
    }
    setLoading(false)
  }, [searchQuery, statusTab])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(q), 300)
    return () => window.clearTimeout(timer)
  }, [q])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">代理商管理</h2>
          <p className="text-xs text-gray-400 mt-0.5">内销/外销 · 国内/海外统一档案 · 新建需主管审批 · 查重以公司名为主维度</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> 新增代理商
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="找代理商：公司名、联系人、邮箱、负责人"
              aria-label="搜索代理商档案"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-700 outline-none transition-shadow placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="清空搜索" title="清空搜索" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">共 {total} 条</span>
        </div>
        <div className="mt-3 flex gap-1 text-sm overflow-x-auto pb-1">
          {[
            { k: '', label: '全部' },
            { k: 'PENDING', label: '待审批' },
            { k: 'APPROVED', label: '正式档案' },
            { k: 'REJECTED', label: '已驳回' },
          ].map((tb) => (
            <button
              key={tb.k}
              onClick={() => setStatusTab(tb.k)}
              className={`h-9 px-3 rounded-md whitespace-nowrap transition-colors ${statusTab === tb.k ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >{tb.label}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>用于定位代理商主档；新增前先搜公司名，避免重复提交审批。</span>
          {hasActiveFilter && (
            <button type="button" onClick={clearFilters} className="self-start text-brand-600 hover:text-brand-700 sm:self-auto">
              清空全部筛选
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b bg-gray-50">
              <th className="py-2.5 px-4">公司名称</th>
              <th className="py-2.5">业务/地域</th>
              <th className="py-2.5">邮箱</th>
              <th className="py-2.5">联系人</th>
              <th className="py-2.5">归属人</th>
              <th className="py-2.5">责任人</th>
              <th className="py-2.5">状态</th>
              <th className="py-2.5">最新跟进</th>
              <th className="py-2.5 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="py-8 text-center text-gray-400">加载中…</td></tr>}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400">
                  <div className="space-y-3">
                    <div className="font-medium text-gray-500">{emptyTitle}</div>
                    <div className="text-xs text-gray-400">{emptyDesc}</div>
                    {hasActiveFilter ? (
                      <button type="button" onClick={clearFilters} className="btn-secondary text-xs">清空筛选</button>
                    ) : (
                      <button type="button" onClick={() => setShowNew(true)} className="btn-secondary text-xs">新增代理商</button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {!loading && list.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2.5 px-4">
                  <div className="font-medium text-gray-800">{p.companyName}</div>
                  {p.status === 'REJECTED' && p.rejectReason && (
                    <div className="text-[11px] text-red-400">驳回原因:{p.rejectReason}</div>
                  )}
                </td>
                <td className="py-2.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${p.salesType === 'EXTERNAL' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.salesType === 'EXTERNAL' ? '外销' : '内销'}
                  </span>
                  <span className="inline-block ml-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">
                    {p.agentRegion === 'OVERSEAS' ? '海外' : '国内'}
                  </span>
                </td>
                <td className="py-2.5 text-gray-600">{p.email || <span className="text-gray-300">—</span>}</td>
                <td className="py-2.5 text-gray-600">{p.contactName || <span className="text-gray-300">—</span>}</td>
                <td className="py-2.5 text-gray-600">{p.owner?.name || '-'}</td>
                <td className="py-2.5 text-gray-600">{p.responsible?.name || '-'}</td>
                <td className="py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${STATUS_CLASS[p.status] || ''}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </td>
                <td className="py-2.5 text-gray-500 max-w-[180px] truncate" title={p.followUp || ''}>{p.followUp || '-'}</td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    {canReview && p.status === 'PENDING' && (
                      <button onClick={() => setReviewing(p)} className="text-brand-600 hover:underline text-xs flex items-center gap-1">
                        <ShieldQuestion size={13} /> 审批
                      </button>
                    )}
                    <button onClick={() => setEditing(p)} className="text-gray-500 hover:underline text-xs">编辑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showNew || editing) && (
        <PartnerFormModal
          partner={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onDone={() => { setShowNew(false); setEditing(null); load() }}
        />
      )}
      {reviewing && (
        <ReviewModal
          partner={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load() }}
        />
      )}
    </div>
  )
}

// ── 新建/编辑弹窗 ──
function PartnerFormModal({ partner, onClose, onDone }: { partner: PartnerRow | null; onClose: () => void; onDone: () => void }) {
  const isEdit = !!partner
  const [form, setForm] = useState({
    companyName: partner?.companyName || '',
    salesType: partner?.salesType || 'INTERNAL',
    agentRegion: partner?.agentRegion || 'DOMESTIC',
    email: partner?.email || '',
    contactName: partner?.contactName || '',
    contactPhone: partner?.contactPhone || '',
    ownerId: partner?.ownerId || '',
    responsibleId: partner?.responsibleId || '',
    followUp: partner?.followUp || '',
  })
  const [users, setUsers] = useState<UserOption[]>([])
  const [err, setErr] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/users?pageSize=100').then((r: any) => {
      if (r.code === 0) setUsers(r.data?.list || r.data || [])
    }).catch(() => {})
  }, [])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.companyName.trim()) e.companyName = '请填写公司名称'
    setErr(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    const payload = {
      companyName: form.companyName.trim(),
      salesType: form.salesType,
      agentRegion: form.agentRegion,
      email: form.email.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      ownerId: form.ownerId,
      responsibleId: form.responsibleId,
      followUp: form.followUp.trim(),
    }
    const res = isEdit
      ? await api.put(`/partners/${partner!.id}`, payload)
      : await api.post('/partners', payload)
    setSubmitting(false)
    if (res.code === 0) {
      alert(res.message || (isEdit ? '更新成功' : '已提交审批'))
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
            <h3 className="text-base font-semibold text-gray-800">{isEdit ? '编辑代理商' : '新增代理商'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit && partner?.status === 'REJECTED' ? '保存后将重新提交审批' : '提交后进入主管审批,通过即成为正式档案'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-7 space-y-4 overflow-y-auto max-h-[68vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Labeled label="公司名称" required err={err.companyName}>
                <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={`input text-sm w-full ${err.companyName ? 'border-red-300' : ''}`} placeholder="代理商公司全称" />
              </Labeled>
            </div>
            <Labeled label="业务线">
              <select value={form.salesType} onChange={(e) => setForm({ ...form, salesType: e.target.value })} className="input text-sm w-full">
                <option value="INTERNAL">内销</option>
                <option value="EXTERNAL">外销</option>
              </select>
            </Labeled>
            <Labeled label="代理商地域">
              <select value={form.agentRegion} onChange={(e) => setForm({ ...form, agentRegion: e.target.value })} className="input text-sm w-full">
                <option value="DOMESTIC">国内</option>
                <option value="OVERSEAS">海外</option>
              </select>
            </Labeled>
            <div className="col-span-2">
              <Labeled label="邮箱">
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`input text-sm w-full ${err.email ? 'border-red-300' : ''}`} placeholder="选填(辅助联系,不做唯一标识)" />
              </Labeled>
            </div>
            <Labeled label="联系人">
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="input text-sm w-full" placeholder="选填" />
            </Labeled>
            <Labeled label="联系电话">
              <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="input text-sm w-full" placeholder="选填" />
            </Labeled>
            <Labeled label="当前归属人">
              <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="input text-sm w-full">
                <option value="">默认本人</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.id}</option>)}
              </select>
            </Labeled>
            <Labeled label="责任人">
              <select value={form.responsibleId} onChange={(e) => setForm({ ...form, responsibleId: e.target.value })} className="input text-sm w-full">
                <option value="">未指定</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.id}</option>)}
              </select>
            </Labeled>
            <div className="col-span-2">
              <Labeled label="最新跟进情况">
                <textarea value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} className="input text-sm w-full" rows={2} placeholder="选填,可被模糊检索" />
              </Labeled>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-7 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button onClick={submit} disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? '提交中…' : <><Save size={15} /> {isEdit ? '保存' : '提交审批'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 审批弹窗:含实时模糊查重结果(Salesforce 范式:审批页呈现疑似重复) ──
function ReviewModal({ partner, onClose, onDone }: { partner: PartnerRow; onClose: () => void; onDone: () => void }) {
  const [matches, setMatches] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/partners/${partner.id}/review-checks`).then((r: any) => {
      if (r.code === 0) setMatches(r.data?.matches || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [partner.id])

  const review = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reason.trim()) { alert('驳回必须填写原因'); return }
    setBusy(true)
    const res: any = await api.put(`/partners/${partner.id}/review`, { action, reason: reason.trim() })
    setBusy(false)
    if (res.code === 0) { alert(res.message); onDone() } else { alert(res.message || '操作失败') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">审批:{partner.companyName}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[68vh]">
          <div className="text-sm text-gray-600 space-y-1">
            <div>业务:{partner.salesType === 'EXTERNAL' ? '外销' : '内销'} · 地域:{partner.agentRegion === 'OVERSEAS' ? '海外' : '国内'}</div>
            {partner.email && <div>邮箱:{partner.email}</div>}
            {(partner.contactName || partner.contactPhone) && <div>联系人:{partner.contactName || '—'}{partner.contactPhone ? `(${partner.contactPhone})` : ''}</div>}
            <div>提交人:{partner.submitter?.name || '-'}</div>
            {partner.followUp && <div>跟进:{partner.followUp}</div>}
          </div>

          <div className={`rounded-lg border p-3 ${matches.length ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              {matches.length ? <AlertTriangle size={14} className="text-amber-500" /> : <Check size={14} className="text-green-600" />}
              系统自动查重
            </div>
            {loading ? (
              <div className="text-xs text-gray-400">查重中…</div>
            ) : matches.length === 0 ? (
              <div className="text-xs text-green-700">未发现疑似重复档案</div>
            ) : (
              <div className="text-xs text-amber-800 space-y-1">
                <div>发现 {matches.length} 条疑似重复,请核实:</div>
                {matches.map((m) => (
                  <div key={m.id} className="bg-white rounded px-2 py-1 border border-amber-100">
                    {m.companyName}({STATUS_LABELS[m.status] || m.status}{m.email ? ` · ${m.email}` : ''} · 归属:{m.owner?.name || '-'})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">驳回原因(驳回时必填)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input text-sm w-full" rows={2} placeholder="如:与已有代理商重复,请并入 #xxx" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button onClick={() => review('reject')} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1.5">
            <XCircle size={15} /> 驳回
          </button>
          <button onClick={() => review('approve')} disabled={busy} className="btn-primary flex items-center gap-2">
            <Check size={15} /> 通过
          </button>
        </div>
      </div>
    </div>
  )
}

function Labeled({ label, required, err, children }: { label: string; required?: boolean; err?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-[var(--color-danger,#dc2626)] ml-0.5">*</span>}
      </label>
      {children}
      {err && <p className="text-[11px] text-red-500 mt-0.5">{err}</p>}
    </div>
  )
}
