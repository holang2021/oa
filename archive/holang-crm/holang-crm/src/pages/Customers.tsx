import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react'
import { customers as initialCustomers, Customer, customerLevels } from '../data/mockData'
import { isCurrentUserAdmin } from '../services/rbacStore'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const navigate = useNavigate()
  const pageSize = 5

  const filtered = customers.filter((c) => {
    if (search && !c.name.includes(search) && !c.contactName.includes(search) && !c.code.includes(search)) return false
    if (level && c.level !== level) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleDelete = (id: string) => {
    setCustomers(customers.filter((c) => c.id !== id))
    setDeleteId(null)
  }

  const levelBadge = (lv: string) => {
    const colors: Record<string, string> = { A: 'bg-red-50 text-red-700', B: 'bg-orange-50 text-orange-700', C: 'bg-yellow-50 text-yellow-700', D: 'bg-blue-50 text-blue-700', E: 'bg-gray-50 text-gray-600' }
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[lv] || 'bg-gray-50 text-gray-600'}`}>{lv}级</span>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">客户管理</h1>
        <button onClick={() => navigate('/domestic/customers/new')} className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> 新增客户
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索客户名称/联系人/编号"
            className="input-field pl-9"
          />
        </div>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1) }} className="input-field w-auto">
          <option value="">全部分级</option>
          {customerLevels.map((l) => <option key={l} value={l}>{l}级</option>)}
        </select>
      </div>

      {/* Cards on mobile, table on desktop */}
      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">客户编号</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">客户名称</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">行业</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">联系人</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">等级</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">销售负责人</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">创建时间</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">暂无客户数据</td></tr>
              ) : (
                paged.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/domestic/customers/${c.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.industry}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 text-sm">{c.contactName}</div>
                      <div className="text-xs text-gray-400">{c.contactPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{levelBadge(c.level)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.salesPerson}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {isCurrentUserAdmin() && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/domestic/customers/${c.id}/edit`) }} className="p-1.5 rounded hover:bg-brand-50 text-brand-600"><Edit size={15} /></button>
                        )}
                        {isCurrentUserAdmin() && (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">共 {filtered.length} 条，第 {page}/{totalPages} 页</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl">暂无客户数据</div>
        ) : (
          paged.map((c) => (
            <div key={c.id} className="card space-y-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/domestic/customers/${c.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{c.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  {levelBadge(c.level)}
                  <span className="text-xs text-gray-500">{c.industry}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {c.contactName} {c.contactPhone}</span>
                <span className="inline-flex items-center gap-1"><Mail size={12} /> {c.contactEmail}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-400">{c.salesPerson} · {c.createdAt}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/domestic/customers/${c.id}/edit`) }} className="p-1.5 rounded hover:bg-brand-50 text-brand-600"><Edit size={15} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-xs"><ChevronLeft size={14} /> 上一页</button>
            <span className="text-xs text-gray-500">{page}/{totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary text-xs">下一页 <ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDeleteId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-5">确定要删除该客户吗？关联的联系人信息也将被删除。此操作不可恢复。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">取消</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger">确认删除</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
