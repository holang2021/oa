import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoices, customers } from '../data/mockData'

export default function Invoices() {
  const nav = useNavigate()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')

  const filtered = invoices.filter(inv => {
    if (status && inv.approvalStatus !== status) return false
    if (kw) {
      const c = customers.find(c => c.id === inv.customerId)
      const s = [inv.id, inv.orderId, c?.name, inv.title, inv.invoiceNumber].join(' ')
      if (!s.includes(kw)) return false
    }
    return true
  })

  const stats = [
    { label: '开票申请', value: invoices.length, color: 'text-blue-600' },
    { label: '审批中', value: invoices.filter(i => i.approvalStatus === 'pending').length, color: 'text-yellow-600' },
    { label: '已开具', value: invoices.filter(i => i.approvalStatus === 'issued').length, color: 'text-green-600' },
    { label: '开票金额', value: `¥${invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}`, color: 'text-brand-600', isText: true },
  ]

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    issued: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
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
          placeholder="搜索编号/客户/发票号..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="pending">审批中</option>
          <option value="issued">已开具</option>
          <option value="rejected">驳回</option>
          <option value="cancelled">撤消</option>
        </select>
        <button onClick={() => nav('/domestic/invoices/new')} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建开票申请
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
              <th>开票金额</th>
              <th>发票号</th>
              <th>审批状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const c = customers.find(c => c.id === inv.customerId)
              return (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{inv.id}</td>
                  <td className="font-mono text-xs">{inv.orderId}</td>
                  <td>{c?.name || inv.title}</td>
                  <td className="font-medium">¥{inv.amount.toLocaleString()}</td>
                  <td className="font-mono text-xs">{inv.invoiceNumber || '-'}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[inv.approvalStatus] || 'bg-gray-100'}`}>
                      {inv.approvalStatus === 'pending' ? '审批中' : inv.approvalStatus === 'issued' ? '已开具' : inv.approvalStatus === 'cancelled' ? '撤消' : '驳回'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => nav(`/domestic/invoices/${inv.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">暂无开票申请</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
