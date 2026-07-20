import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown, Eye, UserPlus, Phone, Mail } from 'lucide-react'
import { leads, type Lead } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'

export default function LeadPool() {
  const { t } = useI18n()
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [pool, setPool] = useState<Lead[]>(() => leads.filter(l => !l.assignedTo))

  const statusOptions = ['', '未联系', '跟进中', '转客户', '无效']
  const regionOptions = ['', '国内', '国外']

  const filtered = pool.filter(l => {
    const matchSearch = !search ||
      l.customerName.includes(search) ||
      l.contactName.includes(search) ||
      l.code.includes(search) ||
      l.phone.includes(search)
    const matchStatus = !statusFilter || l.status === statusFilter
    const matchRegion = !regionFilter || l.region === regionFilter
    return matchSearch && matchStatus && matchRegion
  })

  const handleClaim = (id: string) => {
    const idx = leads.findIndex(l => l.id === id)
    if (idx === -1) return
    leads[idx].assignedTo = '刘世光'
    leads[idx].assignedAt = new Date().toISOString().slice(0, 10)
    leads[idx].status = '跟进中'
    leads[idx].lastFollowAt = new Date().toISOString().slice(0, 10)
    setPool(leads.filter(l => !l.assignedTo))
  }

  const getStatusColor = (status: string) => {
    if (status === '未联系') return 'bg-gray-100 text-gray-700'
    if (status === '跟进中') return 'bg-blue-100 text-blue-700'
    if (status === '转客户') return 'bg-green-100 text-green-700'
    if (status === '无效') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const uncontacted = pool.filter(l => l.status === '未联系').length
  const following = pool.filter(l => l.status === '跟进中').length
  const invalid = pool.filter(l => l.status === '无效').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">线索公海池</h1>
          <p className="text-xs text-gray-500 mt-1">所有销售共享的线索资源池，可认领后跟进</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-sm"><p className="text-xs text-gray-500">公海池总数</p><p className="text-lg font-bold">{pool.length}</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">未联系</p><p className="text-lg font-bold text-gray-600">{uncontacted}</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">跟进中</p><p className="text-lg font-bold text-blue-600">{following}</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">无效</p><p className="text-lg font-bold text-red-600">{invalid}</p></div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索客户名称、联系人、编号、手机号..."
            className="input text-sm pl-9"
          />
        </div>
        <button onClick={() => setShowFilter(!showFilter)} className="btn-ghost flex items-center gap-2">
          <Filter size={16} /> 筛选 <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
        </button>
        {showFilter && (
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {s || '全部状态'}
              </button>
            ))}
            {regionOptions.map(r => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1 rounded-full text-xs ${regionFilter === r ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {r || '全部地区'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">线索编号</th>
              <th className="py-2">客户名称</th>
              <th className="py-2">联系人</th>
              <th className="py-2">手机</th>
              <th className="py-2">地区</th>
              <th className="py-2">来源</th>
              <th className="py-2">状态</th>
              <th className="py-2">录入日期</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono text-xs">{l.code}</td>
                <td className="py-2 font-medium">{l.customerName || '-'}</td>
                <td className="py-2">{l.contactName || '-'}</td>
                <td className="py-2 font-mono text-xs">{l.phone || '-'}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${l.region === '国内' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{l.region}</span>
                </td>
                <td className="py-2 text-gray-600">{l.source || '-'}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(l.status)}`}>{l.status}</span>
                </td>
                <td className="py-2 text-gray-500">{l.createdAt}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button onClick={() => nav(`/domestic/leads/${l.id}`)} className="text-brand-600 hover:text-brand-800" title="查看详情"><Eye size={14} /></button>
                    <button onClick={() => handleClaim(l.id)} className="text-green-600 hover:text-green-800" title="认领线索"><UserPlus size={14} /></button>
                    {l.phone && (
                      <a href={`tel:${l.phone}`} className="text-gray-600 hover:text-gray-800" title="拨打电话"><Phone size={14} /></a>
                    )}
                    {l.email && (
                      <a href={`mailto:${l.email}`} className="text-gray-600 hover:text-gray-800" title="发送邮件"><Mail size={14} /></a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg mb-2">📋</p>
            <p>公海池暂无线索数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
