import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getCustomerById, getCustomers } from '../services/customerService'
import { getProducts, type Product } from '../services/productService'
import { getOpportunityById } from '../services/opportunityService'
import api from '../services/api'

export default function OpportunityForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const prefilledCustomerId = searchParams.get('customerId') || ''
  const returnTo = searchParams.get('returnTo') || ''
  const safeReturnTo = returnTo.startsWith(`${basePath}/`) ? returnTo : `${basePath}/opportunities`
  const [customerList, setCustomerList] = useState<{ id: string; name: string; code: string }[]>([])
  const [productList, setProductList] = useState<Product[]>([])

  const [form, setForm] = useState({
    id: '',
    customerId: '',
    name: '',
    stage: '初步接洽',
    amount: 0,
    expectedCloseDate: '',
    salesPerson: '刘世光',
    probability: 50,
    products: [] as string[],
    code: '',
    acquiredAt: new Date().toISOString().split('T')[0],
    milestone: '',
    loseReason: '',
    collaborators: [] as string[],
    // 伙伴云补充字段
    customerContactId: '',
    remark: '',
    competitorInfo: '',
    followUpTimeout: '未超时',
    department: '销售一部',
    relatedSalesTarget: '',
    customerName: '',
  })

  useEffect(() => {
    getCustomers({ pageSize: 500 }).then(async res => {
      const customers = res.list.map(c => ({ id: c.id, name: c.name, code: c.code }))
      if (prefilledCustomerId && !customers.some(c => c.id === prefilledCustomerId)) {
        try {
          const customer = await getCustomerById(prefilledCustomerId)
          if (customer) customers.unshift({ id: customer.id, name: customer.name, code: customer.code })
        } catch {
          // 上下文客户已不可访问时，保留正常客户列表供用户重新选择。
        }
      }
      setCustomerList(customers)
    }).catch(() => {})
  }, [prefilledCustomerId])

  useEffect(() => {
    getProducts({ pageSize: 500 }).then(res => setProductList(res.list)).catch(() => setProductList([]))
  }, [])

  useEffect(() => {
    if (id) {
      getOpportunityById(id).then(opp => {
        if (!opp) return
        const stageLabel = ({
          INITIAL_CONTACT: '初步接洽',
          REQUIREMENT_CONFIRMED: '需求确认',
          QUOTING: '方案报价',
          CONTRACT_NEGOTIATION: '商务谈判',
          WON: '赢单',
          LOST: '输单',
        } as Record<string, string>)[opp.stage || ''] || opp.stage || '初步接洽'
        setForm(f => ({
          ...f,
          id: opp.id,
          code: opp.code || f.code,
          customerId: opp.customerId || f.customerId,
          name: opp.name || '',
          stage: stageLabel,
          amount: opp.expectedAmount ? opp.expectedAmount / 10000 : 0,
          expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.slice(0, 10) : '',
          probability: opp.winProbability ?? f.probability,
          products: opp.productIntents?.map(item => item.productId).filter(Boolean) || [],
          remark: opp.description || '',
          competitorInfo: opp.competitorInfo || '',
          customerContactId: '',
        }))
      }).catch(() => {})
    } else {
      const now = new Date()
      const code = `SJ${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}001`
      setForm(f => ({ ...f, code, customerId: prefilledCustomerId || f.customerId }))
    }
  }, [id, prefilledCustomerId])

  const update = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const goBack = () => {
    nav(safeReturnTo)
  }

  const handleSubmit = async () => {
    if (!form.customerId) { alert('请选择所属客户'); return }
    if (!form.name) { alert('请填写商机名称'); return }
    if (!form.remark.trim()) { alert('请填写商机概况'); return }
    if (!form.expectedCloseDate) { alert('请填写预计成交日期'); return }
    if (!form.amount || form.amount <= 0) { alert('请填写预计成交金额'); return }

    try {
      // Opportunity API: POST /opportunities
      const payload: any = {
        customerId: form.customerId,
        name: form.name,
        expectedAmount: Math.round(form.amount * 10000),
        winProbability: form.probability,
        productIntentIds: form.products,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : undefined,
        stage: ({
          '初步接洽': 'INITIAL_CONTACT',
          '需求确认': 'REQUIREMENT_CONFIRMED',
          '方案报价': 'QUOTING',
          '商务谈判': 'CONTRACT_NEGOTIATION',
          '合同签订': 'CONTRACT_NEGOTIATION',
          '赢单': 'WON',
          '输单': 'LOST',
        } as Record<string, string>)[form.stage] || form.stage,
        description: form.remark.trim(),
        competitorInfo: form.competitorInfo.trim() || undefined,
        customerContactId: form.customerContactId || undefined,
      }
      if (isEdit && id) {
        await api.put('/opportunities/' + id, payload)
      } else {
        await api.post('/opportunities', payload)
      }
      nav(safeReturnTo)
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    }
  }

  const stageOptions = ['初步接洽', '需求确认', '方案报价', '商务谈判', '合同签订', '赢单', '输单']
  const milestoneOptions = ['初步交流', '需求沟通', '方案报价', '谈判审核', '赢单', '输单取消']
  const loseReasonOptions = ['客户需求消失', '价格不满足期望', '产品不匹配需求', '竞争对手赢单', '其他']
  const timeoutOptions = ['未超时', '已超时']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑商机' : '新建商机'}</h1>
      </div>

      {/* 基本信息 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机编号</label>
            <input type="text" value={form.code} disabled className="input text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机名称 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input text-sm" placeholder="如：耐力氮气发生器采购项目" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">所属客户 <span className="text-red-500">*</span></label>
            <select value={form.customerId} onChange={e => update('customerId', e.target.value)} className="input text-sm">
              <option value="">请选择客户</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? `（${c.code}）` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户联系人</label>
            <input type="text" value={form.customerContactId} onChange={e => update('customerContactId', e.target.value)} className="input text-sm" placeholder="请输入联系人姓名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机获取日期 <span className="text-red-500">*</span></label>
            <input type="date" value={form.acquiredAt} onChange={e => update('acquiredAt', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">负责人</label>
            <input type="text" value={form.salesPerson} onChange={e => update('salesPerson', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">协作人</label>
            <input type="text" value={form.collaborators.join(', ')} onChange={e => update('collaborators', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="input text-sm" placeholder="多个协作人用逗号分隔" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">所属部门</label>
            <input type="text" value={form.department} onChange={e => update('department', e.target.value)} className="input text-sm" />
          </div>
        </div>
      </div>

      {/* 商机阶段 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">商机阶段</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机里程碑 <span className="text-red-500">*</span></label>
            <select value={form.milestone} onChange={e => update('milestone', e.target.value)} className="input text-sm">
              <option value="">请选择</option>
              {milestoneOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机阶段 <span className="text-red-500">*</span></label>
            <select value={form.stage} onChange={e => update('stage', e.target.value)} className="input text-sm">
              {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {form.stage === '输单' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">输单原因</label>
              <select value={form.loseReason} onChange={e => update('loseReason', e.target.value)} className="input text-sm">
                <option value="">请选择</option>
                {loseReasonOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">下次跟进时间 <span className="text-red-500">*</span></label>
            <input type="date" value={form.expectedCloseDate} onChange={e => update('expectedCloseDate', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">跟进是否超时</label>
            <select value={form.followUpTimeout} onChange={e => update('followUpTimeout', e.target.value)} className="input text-sm">
              {timeoutOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 金额信息 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">金额信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">预计成交金额（万元）<span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.amount || ''}
              onChange={e => update('amount', Math.max(0, Number(e.target.value)))}
              className="input text-sm"
              min="0"
              step="0.1"
              placeholder="如：8 表示 8 万元"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">成交概率 (%)</label>
            <input
              type="number"
              value={form.probability || ''}
              onChange={e => update('probability', Math.min(100, Math.max(0, Number(e.target.value))))}
              className="input text-sm"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">预计收入（万元，自动计算）</label>
            <input type="text" value={form.amount ? (form.amount * form.probability / 100).toFixed(1) : '0'} disabled className="input text-sm bg-gray-50" />
          </div>
        </div>
      </div>

      {/* 意向产品 */}
      <div className="card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">意向产品</h3>
          <p className="text-xs text-gray-400 mt-1">仅用于销售预测和需求判断；转订单时产品、数量、价格和税费可重新确认。</p>
        </div>
        <div className="space-y-2">
          {productList.map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.products.includes(p.id)}
                onChange={e => {
                  if (e.target.checked) update('products', [...form.products, p.id])
                  else update('products', form.products.filter(pid => pid !== p.id))
                }}
              />
              {p.name}{p.model ? ` (${p.model})` : ''} - ¥{(p.unitPrice || 0).toLocaleString()}
            </label>
          ))}
          {productList.length === 0 && <div className="text-sm text-gray-400">暂无可选产品</div>}
        </div>
      </div>

      {/* 商机背景 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">商机背景</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商机概况 <span className="text-red-500">*</span></label>
            <textarea
              value={form.remark}
              onChange={e => update('remark', e.target.value)}
              className="input text-sm w-full"
              rows={5}
              placeholder="简述客户需求、应用场景、当前痛点、采购动机和关键决策信息"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">竞品信息 <span className="font-normal text-gray-400">（选填）</span></label>
            <textarea
              value={form.competitorInfo}
              onChange={e => update('competitorInfo', e.target.value)}
              className="input text-sm w-full"
              rows={5}
              maxLength={4000}
              placeholder="可记录竞品品牌、型号、报价、优势短板及客户倾向；未知可留空"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={goBack} className="btn-ghost">取消</button>
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {isEdit ? '保存修改' : '创建商机'}
        </button>
      </div>
    </div>
  )
}
