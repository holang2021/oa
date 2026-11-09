import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrintPreview } from '../../components/PrintPreview'
import { initCurrencies, getActiveCurrencies, getCurrencyById, type Currency } from '../../services/currencyStore'
import { initBankAccounts, buildBankPrintData } from '../../services/bankAccountStore'
import {
  type ExportDocKind, getExportDocs, deleteExportDoc,
  buildCiPrintData, buildPlPrintData, EXPORT_DOC_STATUS,
} from '../../services/exportDocStore'

/**
 * 外销单证列表：CI（商业发票）/ PL（装箱单）共用一页，Tab 切换。
 * 真实业务里出货时 CI 与 PL 一起出，放一起比拆两个菜单更贴合销售动线。
 * 本轮草稿存本机浏览器（不建表/不建 API），单据之间只通过「从 PI 带出」共享初始化数据。
 */

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function ExportDocs() {
  const nav = useNavigate()
  const { openPreview, PrintPreviewComponent } = usePrintPreview()
  const [kind, setKind] = useState<ExportDocKind>('CI')
  const [kw, setKw] = useState('')
  const [tick, setTick] = useState(0)          // 删除/保存后触发重读本地草稿
  const [, setCurrencyList] = useState<Currency[]>(getActiveCurrencies())

  useEffect(() => {
    let alive = true
    ;(async () => {
      await initCurrencies()
      initBankAccounts()
      if (alive) setCurrencyList(getActiveCurrencies())
    })()
    return () => { alive = false }
  }, [])

  const all = useMemo(() => getExportDocs(), [tick])
  const docs = useMemo(() => all.filter(d => d.kind === kind), [all, kind])

  const handlePreview = (doc: typeof all[number]) => {
    if (doc.kind === 'CI') {
      const symbol = getCurrencyById(doc.currency)?.symbol || ''
      openPreview('tpl-ci-print', buildCiPrintData(doc, symbol, buildBankPrintData(doc.currency)))
    } else {
      openPreview('tpl-pl-print', buildPlPrintData(doc))
    }
  }

  const handleDelete = (id: string, code: string) => {
    if (!window.confirm(`确定删除 ${code}？此操作不可撤销。`)) return
    deleteExportDoc(id)
    setTick(t => t + 1)
  }

  const filtered = docs.filter(d => {
    if (!kw) return true
    return [d.code, d.customerName, d.buyerName, d.sourcePiNo].join(' ').toLowerCase().includes(kw.toLowerCase())
  })

  const stats = [
    { label: `${kind} 单数`, value: docs.length, color: 'text-blue-600' },
    { label: '草稿', value: docs.filter(d => d.status === 'DRAFT').length, color: 'text-gray-600' },
    { label: '已签发', value: docs.filter(d => d.status === 'ISSUED').length, color: 'text-green-600' },
    { label: '来自 PI', value: docs.filter(d => d.sourcePiId).length, color: 'text-brand-600' },
  ]

  return (
    <div className="space-y-4">
      {PrintPreviewComponent}

      {/* CI / PL Tab：同一出货批次的两张单据放一起 */}
      <div className="flex items-center gap-[8px] border-b border-gray-200">
        {(['CI', 'PL'] as ExportDocKind[]).map(k => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-[16px] py-[8px] text-[14px] border-b-2 -mb-px ${kind === k ? 'border-brand-600 text-brand-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {k === 'CI' ? '商业发票 CI' : '装箱单 PL'}
          </button>
        ))}
        <div className="ml-auto text-[13px] text-gray-400">出货时 CI 与 PL 通常一起开，数据可从 PI 一键带出</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card flex flex-col items-center py-3">
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input value={kw} onChange={e => setKw(e.target.value)}
          placeholder={`搜索 ${kind} 编号 / 客户 / 来源 PI...`} className="input text-sm flex-1" />
        <button onClick={() => nav(`/export/export-docs/${kind}/new`)} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建 {kind}
        </button>
      </div>

      <div className="card bg-blue-50 border-blue-200 text-sm text-blue-800">
        💡 同一客户的 PI / CI / PL 共用买方抬头与商品明细：进入编辑页选一张 PI 点「带出」即可，
        带出后三张单据各自独立保存、互不覆盖，改动不会回写 PI。
        <div className="text-xs mt-1 text-blue-700">
          当前单据草稿保存在本机浏览器，销售可先开单、预览、打印 PDF，<span className="font-medium">不用回 Excel</span>；
          多人共用 / 上服务器属于下一步，需先确认持久化方案。
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">{kind} 编号</th>
              <th>客户</th>
              <th>日期</th>
              {kind === 'CI' ? <th>金额</th> : <th>总件数 / 毛重</th>}
              <th>来源 PI</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono text-xs">{d.code || '（未保存）'}</td>
                <td>{d.customerName || d.buyerName || '—'}</td>
                <td className="text-xs">{d.docDate}</td>
                {kind === 'CI'
                  ? <td className="font-medium">{d.currency} {Number(d.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  : <td className="text-xs">{d.totalPackages || '—'} / {Number(d.totalGW || 0)} KGS</td>}
                <td className="font-mono text-xs text-gray-500">{d.sourcePiNo || '—'}</td>
                <td><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[d.status] || 'bg-gray-100'}`}>
                  {EXPORT_DOC_STATUS[d.status] || d.status}
                </span></td>
                <td className="space-x-2 whitespace-nowrap">
                  <button onClick={() => nav(`/export/export-docs/${kind}/${d.id}/edit`)} className="text-brand-600 hover:underline text-xs">编辑</button>
                  <button onClick={() => handlePreview(d)} className="text-green-600 hover:underline text-xs">PDF</button>
                  <button onClick={() => handleDelete(d.id, d.code)} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">
                暂无 {kind} 单据，点「+ 新建 {kind}」开始，可在编辑页从 PI 一键带出数据
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
