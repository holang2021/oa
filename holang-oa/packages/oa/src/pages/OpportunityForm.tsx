import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { customers, products } from '../data/mockData'
import { getCustomers } from '../services/customerService'
import api from '../services/api'

export default function OpportunityForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isEdit = !!id

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
    taxRate: 13,
    discount: 0,
    costTotal: 0,
    margin: 0,
    // 伙伴云补充字段
    customerContactId: '',
    remark: '',
    followUpTimeout: '未超时',
    department: '销售一部',
    relatedSalesTarget: '',
    customerName: '',
  })

  useEffect(() => {
    if (id) {
      // Load from API if editing
      // For now, generate code for new opportunities
    } else {
      const now = new Date()
      const code = `SJ${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}001`
      setForm(f => ({ ...f, code }))
    }
  }, [id])

  const update = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.customerId) { alert('请选择所属客户'); return }
    if (!form.name) { alert('请填写商机名称'); return }
    if (!form.expectedCloseDate) { alert('请填写预计成交日期'); return }
    if (!form.amount || form.amount <= 0) { alert('请填写预计成交金额'); return }

    try {
      // Opportunity API: POST /opportunities
      const payload: any = {
        customerId: form.customerId,
        name: form.name,
        stage: form.stage,
        amount: form.amount,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate) : null,
        salesPerson: form.salesPerson,
        probability: form.probability,
        remark: form.remark,
      }
      if (isEdit && id) {
        await api.put('/opportunities/' + id, payload)
      } else {
        await api.post('/opportunities', payload)
      }
      nav('/domestic/opportunities')
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
        <button onClick={() => nav(-1)} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
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
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <label className="block text-xs font-medium text-gray-500 mb-1">预计成交金额 <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount || ''} onChange={e => update('amount', Number(e.target.value))} className="input text-sm" placeholder="请输入金额" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">成交概率 (%)</label>
            <input type="number" value={form.probability || ''} onChange={e => update('probability', Number(e.target.value))} className="input text-sm" min="0" max="100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">预计收入 (自动计算)</label>
            <input type="text" value={form.amount ? (form.amount * form.probability / 100).toFixed(0) : '0'} disabled className="input text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">增值税税率 (%)</label>
            <input type="number" value={form.taxRate || ''} onChange={e => update('taxRate', Number(e.target.value))} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">优惠金额</label>
            <input type="number" value={form.discount || ''} onChange={e => update('discount', Number(e.target.value))} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">产品成本总额</label>
            <input type="number" value={form.costTotal || ''} onChange={e => update('costTotal', Number(e.target.value))} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单毛利率 (%)</label>
            <input type="number" value={form.margin || ''} onChange={e => update('margin', Number(e.target.value))} className="input text-sm" />
          </div>
        </div>
      </div>

      {/* 产品明细 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">产品明细</h3>
        <div className="space-y-2">
          {products.filter(p => p.status === 'active').map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.products.includes(p.id)}
                onChange={e => {
                  if (e.target.checked) update('products', [...form.products, p.id])
                  else update('products', form.products.filter(pid => pid !== p.id))
                }}
              />
              {p.name} ({p.model}) - ¥{p.salePrice.toLocaleString()}
            </label>
          ))}
        </div>
      </div>

      {/* 备注 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">备注</h3>
        <textarea
          value={form.remark}
          onChange={e => update('remark', e.target.value)}
          className="input text-sm w-full"
          rows={3}
          placeholder="请输入备注信息"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={() => nav(-1)} className="btn-ghost">取消</button>
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {isEdit ? '保存修改' : '创建商机'}
        </button>
      </div>
    </div>
  )
}
