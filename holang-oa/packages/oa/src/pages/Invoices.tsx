import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices, type Invoice } from '../services/invoiceService'

function getApprovalLabel(status?: string): string {
  if (!status) return '待审批'
  if (status.includes('开票')) return '开票中'
  if (status.includes('已开')) return '已开具'
  if (status.includes('驳回') || status.includes('拒绝')) return '驳回'
  if (status.includes('撤')) return '已撤销'
  return status
}

function getApprovalColor(status?: string): string {
  const label = getApprovalLabel(status)
  if (label === '开票中') return 'bg-yellow-100 text-yellow-700'
  if (label === '已开具') return 'bg-green-100 text-green-700'
  if (label === '驳回') return 'bg-red-100 text-red-700'
  if (label === '已撤销') return 'bg-gray-100 text-gray-600'
  return 'bg-gray-100 text-gray-600'
}

export default function Invoices() {
  const nav = useNavigate()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getInvoices({ pageSize: 500 })
      setInvoices(result.list)
    } catch {
      setError('加载开票数据失败')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = invoices.filter(inv => {
    if (status && getApprovalLabel(inv.approvalStatus) !== status) return false
    if (kw) {
      const s = [inv.id, inv.order?.orderCode, inv.customer?.companyName, inv.title, inv.invoiceNumber].join(' ')
      if (!s.includes(kw)) return false
    }
    return true
  })

  const stats = [
    { label: '开票申请', value: invoices.length, color: 'text-blue-600' },
    { label: '开票中', value: invoices.filter(i => getApprovalLabel(i.approvalStatus) === '开票中').length, color: 'text-yellow-600' },
    { label: '已开具', value: invoices.filter(i => getApprovalLabel(i.approvalStatus) === '已开具').length, color: 'text-green-600' },
    { label: '开票金额', value: `¥${invoices.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}`, color: 'text-brand-600', isText: true },
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
          placeholder="搜索编号/客户/发票号..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="开票中">开票中</option>
          <option value="已开具">已开具</option>
          <option value="驳回">驳回</option>
          <option value="已撤销">撤销</option>
        </select>
        <button onClick={() => nav('/domestic/invoices/new')} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建开票申请
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-x-auto">
        {loading && <div className="text-center py-8 text-gray-400">加载中...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!loading && !error && (
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
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{inv.id.slice(-8)}</td>
                  <td className="font-mono text-xs">{inv.order?.orderCode || '-'}</td>
                  <td>{inv.customer?.companyName || inv.title || '-'}</td>
                  <td className="font-medium">¥{(inv.amount || 0).toLocaleString()}</td>
                  <td className="font-mono text-xs">{inv.invoiceNumber && inv.invoiceNumber !== '9223372036854775807' ? inv.invoiceNumber : '-'}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getApprovalColor(inv.approvalStatus)}`}>
                      {getApprovalLabel(inv.approvalStatus)}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => nav(`/domestic/invoices/${inv.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">暂无开票申请</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
