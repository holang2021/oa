import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { quotations, customers, opportunities } from '../data/mockData'
import { type Quotation } from '../data/mockData'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  sent: '已发送',
  approved: '已通过',
  rejected: '已驳回',
  expired: '已过期',
}

const approvalColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approving: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function Quotations() {
  const nav = useNavigate()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')

  const filtered = quotations.filter(q => {
    if (status && q.status !== status) return false
    if (kw) {
      const c = customers.find(c => c.id === q.customerId)
      const s = [q.code, c?.name, q.salesPerson].join(' ')
      if (!s.toLowerCase().includes(kw.toLowerCase())) return false
    }
    return true
  })

  const stats = [
    { label: '报价单', value: quotations.length, color: 'text-blue-600' },
    { label: '草稿', value: quotations.filter(q => q.status === 'draft').length, color: 'text-gray-600' },
    { label: '已发送', value: quotations.filter(q => q.status === 'sent').length, color: 'text-blue-600' },
    { label: '已通过', value: quotations.filter(q => q.status === 'approved').length, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card flex flex-col items-center py-3">
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="card flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="搜索报价单号/客户/销售..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="sent">已发送</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="expired">已过期</option>
        </select>
        <button onClick={() => nav('/domestic/quotations/new')} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建报价
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">报价单号</th>
              <th>客户</th>
              <th>关联商机</th>
              <th>金额</th>
              <th>审批状态</th>
              <th>报价状态</th>
              <th>有效期至</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => {
              const c = customers.find(c => c.id === q.customerId)
              const opp = opportunities.find(o => o.id === q.opportunityId)
              return (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{q.code}</td>
                  <td>{c?.name || '-'}</td>
                  <td className="text-xs text-gray-600">{opp?.name || '-'}</td>
                  <td className="font-medium">¥{q.amount.toLocaleString()}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${approvalColors[q.approvalStatus] || 'bg-gray-100'}`}>
                      {q.approvalStatus === 'pending' ? '待审批' : q.approvalStatus === 'approved' ? '已通过' : q.approvalStatus === 'rejected' ? '已驳回' : q.approvalStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[q.status] || 'bg-gray-100'}`}>
                      {statusLabels[q.status] || q.status}
                    </span>
                  </td>
                  <td className="text-xs">{q.validUntil}</td>
                  <td className="space-x-2">
                    <button onClick={() => nav(`/domestic/quotations/${q.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                    {!q.convertedToOrder && q.status === 'approved' && (
                      <button onClick={() => alert('转为订单：' + q.code)} className="text-green-600 hover:underline text-xs">
                        转订单
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">暂无报价单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
