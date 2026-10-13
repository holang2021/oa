import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle, Sparkles, Loader2, Search } from 'lucide-react'
import { Customer, industries, customerLevels, sourceChannels } from '../data/mockData'
import { getFieldConfig } from '../services/fieldConfigStore'
import {
  getCustomerById,
  createCustomer,
  updateCustomer,
  checkCustomerDuplicate,
  lookupCustomerByDeepSeek,
  type CustomerDuplicateMatch,
  type CustomerAiLookupResult,
} from '../services/customerService'
import type { FieldMeta } from '../types/fieldConfig'
import FormField from '../components/FormField'
import ContactManager from '../components/ContactManager'

// 表单 salesType 字段值是 domestic/overseas（或遗留 internal），后端枚举为 INTERNAL/EXTERNAL
// 统一映射到后端枚举，避免 Zod 校验 400（创建/编辑客户都走这里）
function toBackendSalesType(v?: string): 'INTERNAL' | 'EXTERNAL' | null {
  if (!v) return null
  const s = String(v).toLowerCase()
  if (s === 'overseas' || s === 'export' || s === 'external') return 'EXTERNAL'
  if (s === 'domestic' || s === 'internal' || s === 'indirect' || s === 'direct') return 'INTERNAL'
  return null
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
  const [aiCandidates, setAiCandidates] = useState<CustomerAiLookupResult[]>([])
  const [duplicateMatches, setDuplicateMatches] = useState<CustomerDuplicateMatch[]>([])
  const [duplicateLoading, setDuplicateLoading] = useState(false)

  // Field configuration (driven by admin settings)
  // 明确区分 Company 与 Contact：contact* 字段不在客户表单渲染，改由「联系人管理」面板维护（一对多）
  const allCustomerFields = getFieldConfig('customer')
  const formFields = allCustomerFields.filter(f => f.fieldName && !f.fieldName.startsWith('contact'))
  const visibleFields = formFields.filter(f => f.visible).sort((a, b) => a.order - b.order)
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
        salesType: toBackendSalesType(form.salesType) ?? (isExport ? 'EXTERNAL' : 'INTERNAL'),
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
      // 后端 zod 的 .optional() 只接收 undefined、不接收 null；空值需剔除而非传 null
      for (const key of Object.keys(payload)) {
        if (payload[key] === null) delete payload[key]
      }
      let newId: string | undefined
      if (isEdit && id) {
        await updateCustomer(id, payload)
      } else {
        const res = await createCustomer(payload)
        newId = res?.data?.id
      }
      if (newId) {
        // 新建公司后跳转编辑页，便于立即添加联系人（联系人需关联已存在的客户）
        navigate(`${isExport ? '/export' : '/domestic'}/customers/${newId}/edit`)
      } else {
        navigate(isExport ? '/export/customers' : '/domestic/customers')
      }
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
    setAiCandidates([])
    setDuplicateMatches([])

    const mode = isExport ? 'export' : 'domestic'
    try {
      const data = await lookupCustomerByDeepSeek(aiQuery.trim(), mode)
      if (data.candidates.length > 0) {
        setAiCandidates(data.candidates)
        setAiResult(`AI 联想到 ${data.candidates.length} 个名称，均未经过工商数据核验`)
      } else {
        setAiResult('未找到名称线索，请补充地区、行业或更多公司名称后重试')
      }
    } catch (e: any) {
      setAiResult(e?.message || 'DeepSeek 查询失败，请稍后重试或手动填写')
    }

    setAiLoading(false)
  }

  const runDuplicateCheck = async (nextForm = form) => {
    if (!nextForm.name?.trim() && !nextForm.creditCode?.trim() && !nextForm.taxNumber?.trim() && !nextForm.dunsNumber?.trim() && !nextForm.website?.trim()) return
    setDuplicateLoading(true)
    try {
      const list = await checkCustomerDuplicate({
        companyName: nextForm.name,
        creditCode: nextForm.creditCode,
        taxNumber: nextForm.taxNumber,
        dunsNumber: nextForm.dunsNumber,
        website: nextForm.website,
        salesType: toBackendSalesType(nextForm.salesType) ?? (isExport ? 'EXTERNAL' : 'INTERNAL'),
        excludeId: isEdit ? id : undefined,
      })
      setDuplicateMatches(list)
    } finally {
      setDuplicateLoading(false)
    }
  }

  // Validation driven by field config
  const validate = () => {
    const errs: Record<string, string> = {}
    for (const f of formFields) {
      if (!f.fieldName) continue
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
        <div className="card !p-4 bg-gradient-to-r from-brand-50 to-brand-50 border-brand-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-500 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800">
                企业名称 AI 联想
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isExport
                  ? '输入海外公司简称或关键词，仅辅助寻找名称线索，不代表企业真实存在'
                  : '输入企业简称或关键词，仅辅助寻找名称线索，不是工商查询结果'}
              </p>
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
                  {aiLoading ? <><Loader2 size={14} className="animate-spin" /> 联想中</> : <><Search size={14} /> 查找名称线索</>}
                </button>
              </div>
              {aiLoading && (
                <div className="flex items-center gap-2 mt-2.5 text-xs text-brand-600">
                  <Loader2 size={12} className="animate-spin" />
                  <span>DeepSeek 正在联想可能的企业名称...</span>
                </div>
              )}
              {aiResult && (
                <div className="flex items-center gap-2 mt-2.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{aiResult}</span>
                </div>
              )}
              {aiCandidates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {aiCandidates.map((candidate, index) => (
                    <div
                      key={`${candidate.companyName}-${index}`}
                      className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800">{candidate.companyName}</div>
                          <div className="mt-1 text-xs text-gray-500">可用于补充搜索关键词，不能作为法律主体信息</div>
                        </div>
                        <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">AI 联想 · 未核验</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => runDuplicateCheck()}
            disabled={duplicateLoading || (!form.name.trim() && !form.creditCode.trim() && !form.taxNumber.trim() && !form.dunsNumber.trim() && !form.website.trim())}
            className="btn-secondary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {duplicateLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            检查重复客户
          </button>
        </div>

        {(duplicateLoading || duplicateMatches.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">客户查重提示</h4>
                {duplicateLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                    <Loader2 size={12} className="animate-spin" /> 正在根据公司名、统一信用代码/税号、DUNS、网站域名查重...
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {duplicateMatches.map((m) => (
                      <div key={m.id} className="rounded-lg bg-white/70 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                        <div className="font-medium">{m.companyName}</div>
                        <div className="mt-1 text-amber-700">
                          {m.customerCode || '无编号'} · {m.salesType === 'EXTERNAL' ? '外销' : '内销'} · 负责人：{m.salesOwner?.name || '-'}
                        </div>
                        <div className="mt-1 text-amber-600">命中：{m.reasons.join('、')}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-amber-600 mt-2">如果确认不是同一法律主体，可以继续创建；否则建议进入已有客户维护。</p>
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
                if (!f.fieldName) return null
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

        {/* 联系人管理（一对多）：新建时先保存客户主体，保存后进入客户页补联系人。 */}
        {isEdit ? (
          <ContactManager customerId={id ?? null} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            联系人将在客户创建后添加。先建立公司主体，再进入客户详情补多个联系人、关键人和任职记录。
          </div>
        )}

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
