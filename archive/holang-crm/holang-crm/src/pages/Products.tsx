import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { products as initialProducts, Product, productCategories } from '../data/mockData'

export default function Products() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const navigate = useNavigate()
  const pageSize = 5

  const filtered = products.filter((p) => {
    if (search && !p.name.includes(search) && !p.model.includes(search) && !p.code.includes(search)) return false
    if (category && p.category !== category) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
    setDeleteId(null)
  }

  const statusBadge = (status: string) =>
    status === 'active' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">上架</span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">下架</span>
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">产品管理</h1>
        <button onClick={() => navigate('/products/new')} className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> 新增产品
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索产品名称/型号/编码"
            className="input-field pl-9"
          />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="input-field w-auto">
          <option value="">全部分类</option>
          {productCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">产品编码</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">产品名称</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">品牌/型号</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">分类</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">成本价</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">售价</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 whitespace-nowrap">状态</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">暂无产品数据</td></tr>
              ) : (
                paged.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.brand} / {p.model}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">¥{p.costPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">¥{p.salePrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded hover:bg-brand-50 text-brand-600" title="编辑">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="删除">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">共 {filtered.length} 条，第 {page}/{totalPages} 页</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDeleteId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-50 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-5">确定要删除该产品吗？此操作不可恢复。</p>
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
