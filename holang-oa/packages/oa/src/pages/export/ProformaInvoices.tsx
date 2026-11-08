import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrintPreview } from '../../components/PrintPreview'
import { initCurrencies, getActiveCurrencies, getCurrencyById, convertToCNY, type Currency } from '../../services/currencyStore'
import { buildBankPrintData } from '../../services/bankAccountStore'
import { proformaInvoices, customers } from '../../data/mockData'
import type { ProformaInvoice } from '../../data/mockData'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700',
  expired: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  sent: '已发送',
  signed: '已回签',
  expired: '已过期',
  cancelled: '已撤销',
}

export default function ProformaInvoices() {
  const nav = useNavigate()
  const { openPreview, PrintPreviewComponent } = usePrintPreview()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  // 列表的人民币金额统一按系统汇率实时折算（不再用 mockData 写死的数值）
  const [currencyList, setCurrencyList] = useState<Currency[]>(getActiveCurrencies())
  useEffect(() => {
    let alive = true
    ;(async () => {
      await initCurrencies()
      if (alive) setCurrencyList(getActiveCurrencies())
    })()
    return () => { alive = false }
  }, [])

  // 列表页 PDF：同样先出预览页（预览页内点「打印」即可另存 PDF）
  const handlePreviewPdf = (pi: ProformaInvoice) => {
    const c = customers.find(x => x.id === pi.customerId)
    openPreview('tpl-pi-print', {
      buyerName: c?.name || pi.customerName || '',
      buyerAddress: c?.address || '',
      buyerAttn: c?.contactName || '',
      buyerTel: c?.contactPhone || '',
      buyerEmail: c?.contactEmail || '',
      invoiceNo: pi.piCode,
      invoiceDate: pi.piDate,
      countryOfOrigin: 'CHINA',
      currencyName: getCurrencyById(pi.currency)?.nameEn || pi.currency,
      items: [{ hsCode: '', name: '（明细请进入编辑页关联报价单后带出）', qty: '', price: '', amount: pi.totalAmount.toFixed(2) }],
      totalAmount: `${pi.currency} ${pi.totalAmount.toFixed(2)}`,
      amountInWords: '',
      transactionMethod: pi.deliveryTerms || '',
      paymentTerm: pi.paymentTerms || '',
      deliveryDate: pi.deliveryDate || '',
      remarks: '',
      // 收款账户随该 PI 的币种协同带出，不写死美元账号
      ...buildBankPrintData(pi.currency),
    })
  }

  const filtered = proformaInvoices.filter(pi => {
    if (status && pi.status !== status) return false
    if (kw) {
      const c = customers.find(c => c.id === pi.customerId)
      const s = [pi.piCode, c?.name, pi.salesPerson].join(' ')
      if (!s.toLowerCase().includes(kw.toLowerCase())) return false
    }
    return true
  })

  const stats = [
    { label: 'PI 单数', value: proformaInvoices.length, color: 'text-blue-600' },
    { label: '草稿', value: proformaInvoices.filter(pi => pi.status === 'draft').length, color: 'text-gray-600' },
    { label: '已发送', value: proformaInvoices.filter(pi => pi.status === 'sent').length, color: 'text-blue-600' },
    { label: '已回签', value: proformaInvoices.filter(pi => pi.status === 'signed').length, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-4">
      {PrintPreviewComponent}
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
          placeholder="搜索 PI 编号/客户/销售..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="sent">已发送</option>
          <option value="signed">已回签</option>
          <option value="expired">已过期</option>
          <option value="cancelled">已撤销</option>
        </select>
        <button onClick={() => nav('/export/proforma-invoices/new')} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建 PI
        </button>
      </div>

      {/* 说明卡片 */}
      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-800">
        💡 PI（形式发票）可在订单确认前独立生成，客户回签后转为正式订单。PI 导出 PDF 不受数据导出权限限制。
        <div className="text-xs mt-1 text-blue-700">
          列表「人民币金额」为按系统设置「币种与汇率」（当前启用 {currencyList.length} 种币种）实时折算的内部参考，
          <span className="font-medium">不出现在给客户的 PI / PDF 上</span>。
        </div>
      </div>

      {/* 列表 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">PI 编号</th>
              <th>客户</th>
              <th>币种</th>
              <th>金额</th>
              <th>人民币金额（内部参考）</th>
              <th>付款条款</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(pi => {
              const c = customers.find(c => c.id === pi.customerId)
              return (
                <tr key={pi.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{pi.piCode}</td>
                  <td>{c?.name || pi.customerName}</td>
                  <td className="font-mono text-xs">{pi.currency}</td>
                  <td className="font-medium">{pi.currency} {pi.totalAmount.toLocaleString()}</td>
                  <td>¥{convertToCNY(pi.totalAmount, pi.currency).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</td>
                  <td className="text-xs text-gray-600 max-w-[200px] truncate">{pi.paymentTerms}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[pi.status] || 'bg-gray-100'}`}>
                      {statusLabels[pi.status] || pi.status}
                    </span>
                  </td>
                  <td className="space-x-2">
                    <button onClick={() => nav(`/export/proforma-invoices/${pi.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                    <button onClick={() => handlePreviewPdf(pi)} className="text-green-600 hover:underline text-xs">
                      PDF
                    </button>
                    {pi.status === 'signed' && !pi.orderId && (
                      <button onClick={() => alert('转为订单：' + pi.piCode)} className="text-blue-600 hover:underline text-xs">
                        转订单
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">暂无 PI 单据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
