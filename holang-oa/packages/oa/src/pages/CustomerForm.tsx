import { useState, useEffect, FormEvent, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle, CheckCircle2, Sparkles, Loader2, Search } from 'lucide-react'
import { Customer, industries, customerLevels, sourceChannels } from '../data/mockData'
import { getFieldConfig } from '../services/fieldConfigStore'
import { getCustomerById, createCustomer, updateCustomer } from '../services/customerService'
import type { FieldMeta } from '../types/fieldConfig'
import FormField from '../components/FormField'

// Simulated DeepSeek API — 替代真实 API 调用
async function deepseekQuery(companyName: string, mode: 'domestic' | 'export'): Promise<Partial<Customer>> {
  // In production: replace with real DeepSeek API call:
  // const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: { 'Authorization': 'Bearer YOUR_KEY', 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ model: 'deepseek-chat', messages: [{
  //     role: 'system', content: mode === 'domestic'
  //       ? '你是企业工商信息查询助手，返回JSON格式的企业信息'
  //       : '你是邓白氏码查询助手，返回JSON格式的企业信息含DUNS编码'
  //   }, { role: 'user', content: `查询公司: ${companyName}` }]})
  // })

  // Simulated delay
  await new Promise(r => setTimeout(r, 1500))

  if (mode === 'domestic') {
    // 模拟工商数据查询结果
    const mockResults: Record<string, Partial<Customer>> = {
      '耐力': { name: '耐力股份有限公司', industry: '生产制造', scale: '100~500人', address: '河北省石家庄市栾城区装备制造产业园', website: 'www.naili.com', taxTitle: '耐力股份有限公司', taxNumber: '91130100MA08XXXXX', bankName: '中国工商银行石家庄栾城支行', contactTitle: '采购经理', contactDept: '采购部' },
      '精电': { name: '苏州精电科技有限公司', industry: '新能源', scale: '50~100人', address: '江苏省苏州市工业园区金鸡湖大道', website: 'www.jd-tech.com', taxTitle: '苏州精电科技有限公司', taxNumber: '91320500MA1XXXXXX', bankName: '中国建设银行苏州工业园区支行', contactTitle: '技术总监', contactDept: '技术部' },
      '华测': { name: '上海华测检测技术有限公司', industry: '生物医药', scale: '500~1000人', address: '上海市浦东新区张江高科技园区', website: 'www.huace.com', taxTitle: '上海华测检测技术有限公司', taxNumber: '91310115MA2XXXXXX', bankName: '中国银行上海张江支行', contactTitle: '实验室主任', contactDept: '实验室' },
      '鹏程': { name: '深圳鹏程电子有限公司', industry: '电子制造', scale: '200~500人', address: '广东省深圳市宝安区福永街道', website: 'www.pc-elec.com', taxTitle: '深圳鹏程电子有限公司', taxNumber: '91440300MA3XXXXXX', bankName: '招商银行深圳福永支行', contactTitle: '采购主管', contactDept: '采购部' },
    }
    for (const [key, data] of Object.entries(mockResults)) {
      if (companyName.includes(key)) return data
    }
    // Generic fallback
    return { name: companyName, industry: '生产制造', scale: '100~500人', address: '请手动填写详细地址' }
  } else {
    // Export mode: 模拟邓白氏码查询
    const mockExport: Record<string, Partial<Customer>> = {
      'cairo': { name: 'Cairo Oxygen Systems S.A.E.', industry: 'Industrial Gas', address: 'Plot 42, Industrial Zone, 6th of October City, Giza, Egypt', website: 'www.cairooxygen.com', taxTitle: 'Cairo Oxygen Systems S.A.E.', taxNumber: 'DUNS: 65-023-7894' },
      'sao paulo': { name: 'Sao Paulo Industrial Gases Ltda', industry: 'Gas Distribution', address: 'Av. Paulista 2200, Bela Vista, Sao Paulo - SP, Brazil', website: 'www.spgases.com.br', taxTitle: 'Sao Paulo Industrial Gases Ltda', taxNumber: 'DUNS: 90-451-2387' },
      'raj': { name: 'Raj Industrial Gases Pvt Ltd', industry: 'Manufacturing', address: 'Plot 15, MIDC Industrial Area, Pune 411026, India', website: 'www.rajgases.in', taxTitle: 'Raj Industrial Gases Pvt Ltd', taxNumber: 'DUNS: 77-834-5612' },
    }
    for (const [key, data] of Object.entries(mockExport)) {
      if (companyName.toLowerCase().includes(key)) return data
    }
    return { name: companyName, industry: 'Industrial Equipment', address: 'Please enter address manually' }
  }
}

export default function CustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)
  const isExport = location.pathname.includes('/export/') // 外销路径检测

  // AI query state
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiFilled, setAiFilled] = useState(false)

  // Field configuration (driven by admin settings)
  const allCustomerFields = getFieldConfig('customer')
  const visibleFields = allCustomerFields.filter(f => f.visible).sort((a, b) => a.order - b.order)
  const fieldGroups = visibleFields.reduce((acc, f) => {
    const g = f.group || '其他信息'
    if (!acc[g]) acc[g] = []
    acc[g].push(f)
    return acc
  }, {} as Record<string, FieldMeta[]>)

  const [form, setForm] = useState<Omit<Customer, 'id' | 'code' | 'createdAt'>>({
    name: '',
    industry: '生产制造',
    scale: '',
    level: 'B',
    address: '',
    website: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactWechat: '',
    contactWhatsapp: '',
    contactDept: '',
    contactTitle: '',
    taxTitle: '',
    taxNumber: '',
    bankName: '',
    bankAccount: '',
    salesPerson: '刘世光',
    salesDept: '销售一部',
    source: '',
    followStage: '线索',
    companyPhone: '',
    remark: '',
    invoiceType: '增值税普通发票',
    bankCode: '',
    salesType: 'internal',
    businessLine: '',
    creditCode: '',
    dunsNumber: '',
    country: '',
    assignedAt: '',
    lastFollowAt: '',
    nextFollowAt: '',
    overdueFollow: false,
    transactedAt: '',
    contractFile: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Duplicate detection (simplified for API mode)
  type DupItem = { field: string; value: string; match: { name: string; code: string } }
  const duplicates: DupItem[] = useMemo(() => {
    return [] // In API mode, duplicate detection is done server-side
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      getCustomerById(id).then(c => {
        if (c) {
          const { id: _id, code: _code, createdAt: _ca, ...rest } = c as any
          setForm(rest)
        }
      })
    }
  }, [id, isEdit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      // Map frontend Customer form to backend CustomerRaw shape
      const payload: any = {
        companyName: form.name,
        industry: form.industry || null,
        scale: form.scale || null,
        address: form.address || null,
        website: form.website || null,
        level: form.level || null,
        source: form.source || null,
        followStage: form.followStage || null,
        salesPerson: form.salesPerson || null,
        salesDept: form.salesDept || null,
        businessLine: form.businessLine || null,
        salesType: form.salesType || null,
        creditCode: form.creditCode || null,
        dunsNumber: form.dunsNumber || null,
        country: form.country || null,
        companyPhone: form.companyPhone || null,
        taxTitle: form.taxTitle || null,
        taxNumber: form.taxNumber || null,
        bankName: form.bankName || null,
        bankAccount: form.bankAccount || null,
        bankCode: form.bankCode || null,
        invoiceType: form.invoiceType || null,
        remark: form.remark || null,
      }
      if (isEdit && id) {
        await updateCustomer(id, payload)
      } else {
        await createCustomer(payload)
      }
      navigate(isExport ? '/export/customers' : '/domestic/customers')
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  // AI query handler
  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResult(null)
    setAiFilled(false)

    const mode = isExport ? 'export' : 'domestic'
    const data = await deepseekQuery(aiQuery.trim(), mode)

    if (data) {
      // Auto-fill form fields
      const updates: Record<string, string> = {}
      if (data.name) updates.name = data.name
      if (data.industry) updates.industry = data.industry
      if (data.scale) updates.scale = data.scale
      if (data.address) updates.address = data.address
      if (data.website) updates.website = data.website
      if (data.taxTitle) updates.taxTitle = data.taxTitle
      if (data.taxNumber) updates.taxNumber = data.taxNumber
      if (data.bankName) updates.bankName = data.bankName
      if (data.contactTitle) updates.contactTitle = data.contactTitle
      if (data.contactDept) updates.contactDept = data.contactDept
      setForm(prev => ({ ...prev, ...updates }))
      setAiResult(isExport ? `邓白氏码已查询: ${data.taxNumber || '未匹配到DUNS编码'}` : `工商信息已填充: ${Object.keys(updates).length} 个字段`)
      setAiFilled(true)
    } else {
      setAiResult('未查询到匹配的企业信息，请手动填写')
    }

    setAiLoading(false)
  }

  // Validation driven by field config
  const validate = () => {
    const errs: Record<string, string> = {}
    for (const f of allCustomerFields) {
      if (f.required && !form[f.fieldName as keyof typeof form]) {
        errs[f.fieldName] = `${f.label}为必填项`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isExport ? '/export/customers' : '/domestic/customers')} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑客户' : '新增客户'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* AI Query Card — DeepSeek */}
        <div className="card !p-4 bg-gradient-to-r from-brand-50 to-purple-50 border-brand-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800">
                {isExport ? 'AI 智能查询邓白氏码' : 'AI 智能查询工商信息'}
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isExport
                  ? '输入海外公司名称，DeepSeek 自动查询 DUNS 邓白氏编码和企业信息'
                  : '输入企业名称关键词，DeepSeek 自动查询工商注册信息并填充表单'}
              </p>
              {!aiFilled && (
                <div className="flex gap-2 mt-2.5">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      className="w-full pl-9 pr-3 py-2 bg-white border border-brand-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                      placeholder={isExport ? '输入公司名，如 Cairo Oxygen Systems' : '输入企业名，如 耐力股份'}
                      value={aiQuery}
                      onChange={e => setAiQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiQuery() } }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAiQuery}
                    disabled={!aiQuery.trim() || aiLoading}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 shrink-0 flex items-center gap-1.5"
                  >
                    {aiLoading ? <><Loader2 size={14} className="animate-spin" /> 查询中</> : <><Sparkles size={14} /> 查询</>}
                  </button>
                </div>
              )}
              {aiLoading && (
                <div className="flex items-center gap-2 mt-2.5 text-xs text-brand-600">
                  <Loader2 size={12} className="animate-spin" />
                  <span>正在通过 DeepSeek {isExport ? '查询邓白氏码' : '查询工商数据'}...</span>
                </div>
              )}
              {aiResult && (
                <div className={`flex items-center gap-2 mt-2.5 text-xs ${aiFilled ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'} rounded-lg px-3 py-2`}>
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{aiResult}</span>
                  {aiFilled && <span className="text-[10px] text-green-500 ml-auto">已自动填充 · 可手动修改</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">检测到可能存在重复客户</h4>
                <div className="mt-2 space-y-1">
                  {duplicates.map((dup, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                      <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{dup.field}</span>
                      <span>{dup.value}</span>
                      <span className="text-amber-400">已关联至</span>
                      <span className="font-medium">{dup.match.name}</span>
                      <span className="text-amber-400">({dup.match.code})</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">如确认不是同一客户，可忽略此提示继续创建。</p>
              </div>
            </div>
          </div>
        )}

        {/* Config-driven form sections */}
        {Object.entries(fieldGroups).map(([groupName, fields]) => (
          <div key={groupName} className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b">{groupName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(f => {
                // Build options for select-type fields
                let options: { label: string; value: string }[] | undefined
                if (f.fieldName === 'industry') options = industries.map(v => ({ label: v, value: v }))
                if (f.fieldName === 'scale') options = [
                  { label: '请选择', value: '' },
                  { label: '0~50人', value: '0~50人' },
                  { label: '50~100人', value: '50~100人' },
                  { label: '100~500人', value: '100~500人' },
                  { label: '500~1000人', value: '500~1000人' },
                  { label: '1000人以上', value: '1000人以上' },
                ]
                if (f.fieldName === 'level') options = customerLevels.map(v => ({ label: v + '级', value: v }))
                if (f.fieldName === 'source') options = [
                  { label: '请选择', value: '' },
                  ...sourceChannels.map(v => ({ label: v, value: v })),
                ]

                return (
                  <FormField
                    key={f.id}
                    meta={f}
                    value={(form as any)[f.fieldName] ?? ''}
                    onChange={val => set(f.fieldName, String(val))}
                    error={errors[f.fieldName]}
                    disabled={false}
                  />
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> 保存中</> : <><Save size={16} /> {isEdit ? '保存修改' : '创建客户'}</>}
          </button>
          <button type="button" onClick={() => navigate(isExport ? '/export/customers' : '/domestic/customers')} className="btn-secondary">取消</button>
        </div>
      </form>
    </div>
  )
}
