import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveries, customers, orders } from '../data/mockData'

export default function Deliveries() {
  const nav = useNavigate()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')

  const filtered = deliveries.filter(d => {
    if (status && d.approvalStatus !== status) return false
    if (kw) {
      const c = customers.find(c => c.id === d.customerId)
      const s = [d.id, d.orderId, c?.name, d.contactPerson].join(' ')
      if (!s.includes(kw)) return false
    }
    return true
  })

  const stats = [
    { label: '发货申请', value: deliveries.length, color: 'text-blue-600' },
    { label: '待审批', value: deliveries.filter(d => d.approvalStatus === 'pending').length, color: 'text-yellow-600' },
    { label: '已通过', value: deliveries.filter(d => d.approvalStatus === 'approved').length, color: 'text-green-600' },
    { label: '已驳回', value: deliveries.filter(d => d.approvalStatus === 'rejected').length, color: 'text-red-600' },
  ]

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-700',
  }

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
          placeholder="搜索编号/客户/收货人..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="pending">审批中</option>
          <option value="approved">已通过</option>
          <option value="cancelled">已撤消</option>
          <option value="rejected">驳回</option>
        </select>
        <button onClick={() => nav('/domestic/deliveries/new')} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建发货申请
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">编号</th>
              <th>关联订单</th>
              <th>客户</th>
              <th>发货时间</th>
              <th>收货人</th>
              <th>审批状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const c = customers.find(c => c.id === d.customerId)
              return (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{d.id}</td>
                  <td className="font-mono text-xs">{d.orderId}</td>
                  <td>{c?.name || d.customerName}</td>
                  <td>{d.deliveryDate}</td>
                  <td>{d.contactPerson}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[d.approvalStatus] || 'bg-gray-100'}`}>
                      {d.approvalStatus === 'pending' ? '审批中' : d.approvalStatus === 'approved' ? '已通过' : d.approvalStatus === 'cancelled' ? '已撤消' : '驳回'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => nav(`/domestic/deliveries/${d.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">暂无发货申请</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
