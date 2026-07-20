import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2 } from 'lucide-react'
import { getCustomers } from '../services/customerService'
import { getProducts, type Product } from '../services/productService'
import { getQuoteById, createQuoteApi, updateQuoteApi } from '../services/quoteService'
import { useI18n } from '../i18n/I18nContext'

interface QuoteItemRow {
  productId: string
  quantity: number
  discount: number
}

const emptyForm = () => ({
  customerId: '',
  code: '',
  validUntil: '',
  status: 'DRAFT',
  taxRate: 13,
  discount: 0,
  notes: '',
})

const statusOptions = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']
const statusLabels: Record<string, string> = {
  DRAFT: '草稿', SENT: '已发送', APPROVED: '已通过', REJECTED: '已驳回', EXPIRED: '已过期',
}

export default function QuotationForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const isEdit = !!id
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'

  const [form, setForm] = useState(emptyForm())
  const [items, setItems] = useState<QuoteItemRow[]>([])
  const [customerList, setCustomerList] = useState<{id:string;name:string;code:string}[]>([])
  const [productList, setProductList] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getCustomers({ pageSize: 500, salesType }).then(res => {
      setCustomerList(res.list.map(c => ({ id: c.id, name: c.name, code: c.code })))
    }).catch(() => {})
    getProducts({ pageSize: 500 }).then(res => {
      setProductList(res.list)
    }).catch(() => {})
  }, [salesType])

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true)
      getQuoteById(id).then(q => {
        if (q) {
          setForm({
            customerId: q.customerId,
            code: q.code,
            validUntil: (q.validUntil || '').slice(0, 10),
            status: q.status || 'DRAFT',
            taxRate: q.taxRate ?? 13,
            discount: q.discount || 0,
            notes: q.notes || '',
          })
          setItems((q.items || []).map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            discount: it.discount || 0,
          })))
        }
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      setForm(prev => ({ ...prev, code: `QT${dateStr}001` }))
    }
  }, [id, isEdit])

  const update = (field: keyof ReturnType<typeof emptyForm>, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateItem = (idx: number, field: keyof QuoteItemRow, value: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  const addItem = () => setItems(prev => [...prev, { productId: '', quantity: 1, discount: 0 }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  // 计价
  const rate = isExportRoute ? 0 : (form.taxRate ?? 0)
  const isTaxFree = rate === 0
  const lineSubtotals = items.map(it => {
    const p = productList.find(pr => pr.id === it.productId)
    const unit = p?.unitPrice || 0
    return unit * (Number(it.quantity) || 0) * (1 - (Number(it.discount) || 0) / 100)
  })
  const preDiscount = lineSubtotals.reduce((a, b) => a + b, 0)
  const totalTaxed = preDiscount * (1 - (Number(form.discount) || 0) / 100) // 含税合计
  const totalUntaxed = isTaxFree ? totalTaxed : Math.round((totalTaxed / (1 + rate / 100)) * 100) / 100

  const selectedCustomer = customerList.find(c => c.id === form.customerId)

  const handleSave = async () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (items.length === 0 || items.some(it => !it.productId)) { alert('请至少添加一条有效产品明细'); return }
    setSaving(true)
    try {
      const payload: any = {
        customerId: form.customerId,
        items: items.map(it => ({
          productId: it.productId,
          quantity: Number(it.quantity) || 1,
          discount: Number(it.discount) || 0,
        })),
        discount: Number(form.discount) || 0,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        notes: form.notes,
        taxRate: rate,
      }
      if (isEdit && id) {
        await updateQuoteApi(id, payload)
      } else {
        await createQuoteApi(payload)
      }
      navigate(`${basePath}/quotations`)
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    if (!id) { alert('请先保存后再预览'); return }
    try {
      const token = localStorage.getItem('oa_token')
      const resp = await fetch(`/api/v1/quotes/${id}/preview`, { headers: { Authorization: `Bearer ${token || ''}` } })
      const html = await resp.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      alert('预览失败')
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">加载中...</div>

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? `编辑报价单 ${form.code}` : '新建报价单'}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handlePreview} className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <FileText size={15} /> 预览/导出
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Save size={15} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 基本信息 */}
        <div className="card lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">报价单号</label>
              <input value={form.code} disabled className="input text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">有效期至 *</label>
              <input type="date" value={form.validUntil} onChange={e => update('validUntil', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="input text-sm">
                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 客户信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">客户信息</h3>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
            <select value={form.customerId} onChange={e => update('customerId', e.target.value)} className="input text-sm">
              <option value="">请选择客户</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}（{c.code}）</option>)}
            </select>
          </div>
          {selectedCustomer && <div className="text-xs text-gray-500">客户编码：{selectedCustomer.code}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input text-sm" rows={3} placeholder="报价说明..." />
          </div>
        </div>
      </div>

      {/* 产品明细 */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">产品明细 *</h3>
          <button onClick={addItem} className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <Plus size={14} /> 添加产品
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2">产品</th>
                <th className="w-28">单价</th>
                <th className="w-24">数量</th>
                <th className="w-24">折扣(%)</th>
                <th className="w-32">小计</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const p = productList.find(pr => pr.id === it.productId)
                const subtotal = (p?.unitPrice || 0) * (Number(it.quantity) || 0) * (1 - (Number(it.discount) || 0) / 100)
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2">
                      <select value={it.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="input text-sm">
                        <option value="">请选择产品</option>
                        {productList.map(pr => (
                          <option key={pr.id} value={pr.id}>{pr.name}{pr.model ? `（${pr.model}）` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-xs text-gray-500">¥{((p?.unitPrice || 0)).toLocaleString()}</td>
                    <td>
                      <input type="number" min={1} value={it.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)} className="input text-sm" />
                    </td>
                    <td>
                      <input type="number" value={it.discount} onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} className="input text-sm" />
                    </td>
                    <td className="font-medium">¥{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>
                      <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">暂无产品明细，请点击「添加产品」</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 计税方式 + 合计 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">计税方式</label>
            {isExportRoute ? (
              <div className="input text-sm bg-gray-50 text-gray-500">未税（外销）</div>
            ) : (
              <select value={String(form.taxRate ?? 13)} onChange={e => update('taxRate', Number(e.target.value))} className="input text-sm">
                <option value="13">增值税 13%</option>
                <option value="6">增值税 6%</option>
                <option value="0">未税（无税）</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">整单优惠(%)</label>
            <input type="number" value={form.discount} onChange={e => update('discount', parseFloat(e.target.value) || 0)} className="input text-sm" />
          </div>
          <div className="space-y-1">
            {isTaxFree ? (
              <div className="text-right">
                <span className="text-xs text-gray-500">未税金额：</span>
                <span className="text-lg font-bold text-brand-600">¥{totalUntaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <>
                <div className="text-right">
                  <span className="text-xs text-gray-500">未税金额：</span>
                  <span className="text-base font-bold text-brand-600">¥{totalUntaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">含税金额（{rate}%）：</span>
                  <span className="text-lg font-bold text-gray-900">¥{totalTaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {isExportRoute && <p className="text-[11px] text-amber-500">外销报价均为未税价格，不计税、无含税选项</p>}
      </div>
    </div>
  )
}
