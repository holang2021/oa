// ============================================================
// 人员离职交接（D-离职继承）
// 管理员配置层：办理员工离职 → 统计名下客户/商机/跟进 → 可筛选+批量勾选
// → 指定同域接班人批量转移 / 或退回公海（按销售域隔离）
// → 自动写"系统交接"跟进，接手人看客户时间线即见前情
// 离职 = 仅停用(isActive=0)不删人，历史记录永久保留。
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import {
  UserX, Users, Search, Check, X, ArrowRight, ShieldCheck,
  Building2, UserCog, Inbox, AlertTriangle,
} from 'lucide-react'
import { api } from '../services/api'
import { useI18n } from '../i18n/I18nContext'

// 离职人域推断（与后端 offboarding.service.inferScope 对齐）
function scopeOf(role: string): 'ALL' | 'INTERNAL' | 'EXTERNAL' | 'NONE' {
  if (role === 'ADMIN') return 'ALL'
  if (role === 'EXTERNAL_SALES' || role === 'EXTERNAL_LEAD' || role === 'EXTERNAL_SUPPORT') return 'EXTERNAL'
  if (role === 'INTERNAL_SALES' || role === 'INTERNAL_LEAD' || role === 'INTERNAL_SUPPORT') return 'INTERNAL'
  if (role === 'MARKETING' || role === 'TECHNOLOGY' || role === 'PRODUCTION' || role === 'ADMINISTRATION' || role === 'PROCUREMENT') return 'NONE'
  return 'NONE'
}
const SCOPE_LABEL: Record<string, string> = {
  ALL: '管理员', INTERNAL: '内销', EXTERNAL: '外销', NONE: '职能',
}
const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员', MANAGER: '经理', SALES: '销售', VIEWER: '只读',
  FINANCE: '财务', AFTER_SALES: '售后',
  INTERNAL_SALES: '内销销售', EXTERNAL_SALES: '外销销售',
  INTERNAL_LEAD: '内销线索', EXTERNAL_LEAD: '外销线索',
  READONLY_AUDIT: '审计',
  // 职能部门角色（2026-08-21 新增）
  MARKETING: '市场', TECHNOLOGY: '技术', PRODUCTION: '生产',
  ADMINISTRATION: '行政', PROCUREMENT: '采购',
  INTERNAL_SUPPORT: '内销支持', EXTERNAL_SUPPORT: '外销支持',
}

interface Emp {
  id: string; name: string; role: string; department: string | null
  departments?: string | null; wecomUserId?: string | null; isActive: boolean
}
interface Cust { id: string; companyName: string; salesType: string; inPublicPool: boolean }
interface Cand { id: string; name: string; role: string; department: string | null; scope: string }

export default function Offboarding() {
  const { t } = useI18n()
  const [emps, setEmps] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerUser, setDrawerUser] = useState<Emp | null>(null)
  const [preview, setPreview] = useState<{
    target: any; stats: any; customers: Cust[]; candidates: Cand[]
  } | null>(null)
  const [pvLoading, setPvLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'transfer' | 'pool'>('transfer')
  const [succId, setSuccId] = useState('')
  const [sameDeptOnly, setSameDeptOnly] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => { loadEmps() }, [])
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(null), 3500); return () => clearTimeout(id) } }, [toast])

  async function loadEmps() {
    setLoading(true)
    const r = await api.get('/users')
    if (r.code === 0) setEmps(r.data || [])
    else setToast({ type: 'err', msg: r.message || '加载员工失败' })
    setLoading(false)
  }

  async function openDrawer(e: Emp) {
    setDrawerUser(e); setPreview(null); setSearch(''); setSelected(new Set()); setMode('transfer'); setSuccId(''); setSameDeptOnly(false)
    setPvLoading(true)
    const r = await api.get('/offboarding/preview', { userId: e.id })
    setPvLoading(false)
    if (r.code === 0) setPreview(r.data)
    else setToast({ type: 'err', msg: r.message || '预览失败' })
  }

  // 勾选客户涉及的域集合
  const pickedDomains = useMemo(() => {
    if (!preview) return new Set<string>()
    const s = new Set<string>()
    preview.customers.filter((c) => selected.has(c.id)).forEach((c) => s.add((c.salesType || '').toUpperCase()))
    return s
  }, [preview, selected])

  // 候选人：同域在职（若勾选混合域则仅 ALL 可选）；可限定同部门
  const filteredCands = useMemo(() => {
    if (!preview) return []
    const multiDomain = pickedDomains.size > 1
    return preview.candidates.filter((c) => {
      if (multiDomain && c.scope !== 'ALL') return false
      if (!multiDomain && pickedDomains.size === 1) {
        const only = [...pickedDomains][0]
        if (c.scope !== 'ALL' && c.scope !== only) return false
      }
      if (sameDeptOnly && (c.department || '') !== (drawerUser?.department || '')) return false
      return true
    })
  }, [preview, pickedDomains, sameDeptOnly, drawerUser])

  const visibleCustomers = useMemo(() => {
    if (!preview) return []
    const kw = search.trim().toLowerCase()
    return preview.customers.filter((c) => !kw || c.companyName.toLowerCase().includes(kw))
  }, [preview, search])

  const allVisibleSelected = visibleCustomers.length > 0 && visibleCustomers.every((c) => selected.has(c.id))
  function toggleAllVisible() {
    const next = new Set(selected)
    if (allVisibleSelected) visibleCustomers.forEach((c) => next.delete(c.id))
    else visibleCustomers.forEach((c) => next.add(c.id))
    setSelected(next)
  }
  function toggleOne(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next)
  }

  async function doExecute() {
    if (!drawerUser) return
    if (selected.size === 0) { setToast({ type: 'err', msg: '请先勾选要交接的客户' }); return }
    if (mode === 'transfer' && !succId) { setToast({ type: 'err', msg: '请选择接班人' }); return }
    setSubmitting(true)
    const r = await api.post('/offboarding/execute', {
      userId: drawerUser.id, mode, targetUserId: mode === 'transfer' ? succId : undefined,
      customerIds: [...selected],
    })
    setSubmitting(false)
    if (r.code === 0) {
      const d = r.data
      setToast({ type: 'ok', msg: `交接完成：转移 ${d.transferred} 个客户 / ${d.oppTransferred} 个商机，退回公海 ${d.toPool} 个` })
      setDrawerUser(null); setPreview(null)
      loadEmps()
    } else setToast({ type: 'err', msg: r.message || '执行失败' })
  }

  const activeEmps = emps.filter((e) => e.isActive)
  const offEmps = emps.filter((e) => !e.isActive)

  function EmpRow({ e }: { e: Emp }) {
    const sc = scopeOf(e.role)
    const scopeCls = sc === 'EXTERNAL' ? 'bg-purple-100 text-purple-700'
      : sc === 'INTERNAL' ? 'bg-blue-100 text-blue-700'
      : sc === 'ALL' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3"><span className="font-medium text-gray-800">{e.name}</span></td>
        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${scopeCls}`}>{ROLE_LABEL[e.role] || e.role}</span></td>
        <td className="px-4 py-3 text-gray-500 text-sm">{e.department || <span className="text-gray-400">未分配</span>}</td>
        <td className="px-4 py-3">
          {e.isActive
            ? <span className="text-xs text-green-600 font-medium">在职</span>
            : <span className="text-xs text-gray-400">已停用</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {e.isActive
            ? <button onClick={() => openDrawer(e)} className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium inline-flex items-center gap-1">
                <UserX size={13} /> 办理离职
              </button>
            : <span className="text-xs text-gray-300">—</span>}
        </td>
      </tr>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <UserCog size={22} className="text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-800">人员离职交接</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        员工离职仅<span className="font-medium text-gray-700">停用账号、不删人</span>，其历史跟进与商机永久保留；名下客户可批量转移给同域在职接班人，或退回公海（内销↔内销 / 外销↔外销 绝对隔离）。
      </p>

      {toast && (
        <div className={`mb-4 px-4 py-2.5 rounded text-sm ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* 在职员工 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-500" />
          <span className="font-medium text-gray-700">在职员工（{activeEmps.length}）</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 text-xs">
            <th className="px-4 py-2 font-medium">姓名</th><th className="px-4 py-2 font-medium">角色 / 域</th>
            <th className="px-4 py-2 font-medium">部门</th><th className="px-4 py-2 font-medium">状态</th><th className="px-4 py-2 font-medium text-right">操作</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">加载中…</td></tr>
              : activeEmps.map((e) => <EmpRow key={e.id} e={e} />)}
          </tbody>
        </table>
      </div>

      {/* 已停用 */}
      {offEmps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <UserX size={16} className="text-gray-400" />
            <span className="font-medium text-gray-500">已停用（{offEmps.length}）</span>
          </div>
          <table className="w-full text-sm">
            <tbody>{offEmps.map((e) => <EmpRow key={e.id} e={e} />)}</tbody>
          </table>
        </div>
      )}

      {/* 抽屉 */}
      {drawerUser && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => !submitting && setDrawerUser(null)} />
          <div className="relative w-full max-w-3xl bg-white h-full shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserX size={18} className="text-red-500" />
                  <span className="font-semibold text-gray-800">办理离职 · {drawerUser.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {ROLE_LABEL[drawerUser.role] || drawerUser.role} · 部门 {drawerUser.department || '未分配'} · 当前在职
                </div>
              </div>
              <button onClick={() => !submitting && setDrawerUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {pvLoading ? <div className="text-center text-gray-400 py-10">统计中…</div>
                : preview && (
                <>
                  {/* 统计防遗漏 */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { k: '名下客户', v: preview.stats.customers, ic: <Building2 size={18} className="text-blue-500" /> },
                      { k: '名下商机', v: preview.stats.opportunities, ic: <Inbox size={18} className="text-purple-500" /> },
                      { k: '历史跟进', v: preview.stats.followUps, ic: <Users size={18} className="text-gray-500" /> },
                    ].map((s) => (
                      <div key={s.k} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">{s.ic}{s.k}</div>
                        <div className="text-2xl font-semibold text-gray-800 mt-1">{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {preview.stats.customers === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded p-4 border border-gray-100">
                      该员工名下无客户，可直接停用账号（历史跟进仍保留）。
                    </div>
                  ) : (
                    <>
                      {/* 筛选 + 批量 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
                          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="筛选客户名称…"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <button onClick={toggleAllVisible}
                          className="text-xs px-3 py-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                          {allVisibleSelected ? '取消全选' : '全选可见'}
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded max-h-64 overflow-y-auto">
                        {visibleCustomers.map((c) => {
                          const dom = (c.salesType || '').toUpperCase() === 'EXTERNAL'
                          return (
                            <label key={c.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
                              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="accent-blue-500" />
                              <span className="flex-1 text-sm text-gray-700">{c.companyName}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${dom ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {dom ? '外销' : '内销'}
                              </span>
                            </label>
                          )
                        })}
                        {visibleCustomers.length === 0 && <div className="px-3 py-4 text-center text-gray-400 text-sm">无匹配客户</div>}
                      </div>

                      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                        <Check size={13} className="text-green-500" /> 已选 <span className="font-medium text-gray-700">{selected.size}</span> / 共 {preview.customers.length} 个客户
                      </div>

                      {/* 路径选择 */}
                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <div className="flex gap-2 mb-3">
                          <button onClick={() => setMode('transfer')}
                            className={`flex-1 text-sm py-2 rounded border ${mode === 'transfer' ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                            <ArrowRight size={14} className="inline mr-1" />指定接班人转移
                          </button>
                          <button onClick={() => { setMode('pool'); setSuccId('') }}
                            className={`flex-1 text-sm py-2 rounded border ${mode === 'pool' ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                            <Inbox size={14} className="inline mr-1" />退回公海
                          </button>
                        </div>

                        {mode === 'transfer' ? (
                          <>
                            {pickedDomains.size > 1 && (
                              <div className="mb-2 text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle size={13} /> 勾选客户含多域，仅管理员（全域）可作为接班人
                              </div>
                            )}
                            <select value={succId} onChange={(e) => setSuccId(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200">
                              <option value="">选择同域在职接班人…</option>
                              {filteredCands.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}（{SCOPE_LABEL[c.scope] || c.scope}·{c.department || '未分配部门'}）
                                </option>
                              ))}
                            </select>
                            <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                              <input type="checkbox" checked={sameDeptOnly} onChange={(e) => setSameDeptOnly(e.target.checked)} className="accent-blue-500" />
                              仅显示同部门候选人（默认同域全部）
                            </label>
                            {filteredCands.length === 0 && (
                              <div className="mt-1 text-xs text-gray-400">无符合域条件的在职接班人</div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded p-2.5">
                            退回公海的的客户将按销售域自动落入对应公海：内销 → 内销公海，外销 → 外销公海，由新人在公海认领。
                          </div>
                        )}
                      </div>

                      {/* 接手预览 */}
                      {mode === 'transfer' && succId && selected.size > 0 && (
                        <div className="mt-4 bg-green-50 border border-green-100 rounded p-3">
                          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1"><ShieldCheck size={14} className="text-green-600" />接手预览（{preview.candidates.find((c: Cand) => c.id === succId)?.name} 将看到）</div>
                          {[...selected].slice(0, 4).map((id) => {
                            const c = preview.customers.find((x: Cust) => x.id === id)!
                            return (
                              <div key={id} className="text-sm text-gray-700 mb-1.5 flex items-start gap-1.5">
                                <Building2 size={14} className="text-gray-400 mt-0.5" />
                                <div>
                                  <span className="font-medium">{c.companyName}</span>
                                  <span className="ml-1 text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-600">原负责人：{drawerUser.name}（已离职）</span>
                                  <div className="text-xs text-gray-400 mt-0.5">系统交接：客户于今日由 {drawerUser.name} 移交至 {preview.candidates.find((x: Cand) => x.id === succId)?.name}</div>
                                </div>
                              </div>
                            )
                          })}
                          {selected.size > 4 && <div className="text-xs text-gray-400">…等 {selected.size} 个客户</div>}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* 底部操作 */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-400">操作后账号停用、历史记录保留</div>
              <div className="flex gap-2">
                <button onClick={() => setDrawerUser(null)} disabled={submitting}
                  className="px-4 py-2 text-sm rounded border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                <button onClick={doExecute} disabled={submitting || (preview?.stats.customers ?? 0) > 0 && selected.size === 0}
                  className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 font-medium">
                  {submitting ? '执行中…' : '确认交接并停用'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
