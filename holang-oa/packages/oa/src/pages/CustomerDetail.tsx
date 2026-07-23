import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, User, Building2, Calendar, Tag, TrendingUp, Clock, DollarSign, FileText, ShoppingBag, Receipt, MessageCircle, ChevronRight, Globe, Filter, Users, Loader2, Plus, X, Sparkles, Send } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getCustomerById, updateCustomer, type Customer } from '../services/customerService'
import { getContacts, createContact, type Contact } from '../services/contactService'
import { getOrders, type Order } from '../services/orderService'
import { getPayments, type Payment } from '../services/paymentService'
import { getOpportunities, type Opportunity } from '../services/opportunityService'
import { getQuotes, type Quote } from '../services/quoteService'
import { getContracts, type Contract } from '../services/contractService'
import { getPis, type ProformaInvoice } from '../services/piService'
import { getFollowUps, createFollowUp, type FollowUp } from '../services/followUpService'
import { followStages } from '../data/mockData'

type TabKey = 'overview' | 'contacts' | 'opportunities' | 'quotations' | 'orders' | 'payments' | 'timeline'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '概览' },
  { key: 'contacts', label: '联系人' },
  { key: 'opportunities', label: '商机' },
  { key: 'quotations', label: '报价' },
  { key: 'orders', label: '订单' },
  { key: 'payments', label: '回款' },
  { key: 'timeline', label: '时间轴' },
]

const levelColors: Record<string, string> = { A: 'bg-red-50 text-red-700', B: 'bg-orange-50 text-orange-700', C: 'bg-yellow-50 text-yellow-700', D: 'bg-blue-50 text-blue-700', E: 'bg-gray-50 text-gray-600' }
const oppStageColors: Record<string, string> = {
  '初步接洽': 'bg-blue-50 text-blue-700', '需求确认': 'bg-indigo-50 text-indigo-700',
  '方案报价': 'bg-yellow-50 text-yellow-700', '商务谈判': 'bg-orange-50 text-orange-700',
  '合同签订': 'bg-green-50 text-green-700', '赢单': 'bg-emerald-50 text-emerald-700', '输单': 'bg-red-50 text-red-700',
}
const quotationStatusColors: Record<string, string> = {
  draft: 'bg-gray-50 text-gray-600', sent: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700', expired: 'bg-yellow-50 text-yellow-700',
}
const quotationStatusLabels: Record<string, string> = { draft: '草稿', sent: '已发送', approved: '已通过', rejected: '已拒绝', expired: '已过期' }
const orderStatusColors: Record<string, string> = {
  pending: 'bg-gray-50 text-gray-600', confirmed: 'bg-blue-50 text-blue-700',
  in_production: 'bg-yellow-50 text-yellow-700', shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700', cancelled: 'bg-red-50 text-red-700',
}
const orderStatusLabels: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', in_production: '生产中', shipped: '已发货', delivered: '已交付', cancelled: '已取消',
}
const paymentTypeLabels: Record<string, string> = { deposit: '定金', progress: '进度款', final: '尾款', retention: '质保金' }
const timelineTypeIcons: Record<string, any> = {
  call: Phone, visit: MapPin, email: Mail, meeting: Calendar, quotation: FileText, order: ShoppingBag,
  payment: DollarSign, note: FileText, whatsapp: MessageCircle, website: Globe, social: TrendingUp,
}
const timelineTypeColors: Record<string, string> = {
  call: 'bg-blue-500', visit: 'bg-green-500', email: 'bg-purple-500', meeting: 'bg-orange-500',
  quotation: 'bg-indigo-500', order: 'bg-teal-500', payment: 'bg-emerald-500', note: 'bg-gray-400',
  whatsapp: 'bg-emerald-600', website: 'bg-cyan-500', social: 'bg-pink-500',
}
const timelineTypeLabels: Record<string, string> = {
  call: '电话', visit: '拜访', email: '邮件', meeting: '会议', quotation: '报价', order: '订单',
  payment: '回款', note: '备注', whatsapp: 'WhatsApp', website: '网站', social: '社媒',
}
const channelColors: Record<string, string> = {
  '电话': 'bg-blue-50 text-blue-700', '邮件': 'bg-purple-50 text-purple-700', 'WhatsApp': 'bg-emerald-50 text-emerald-700',
  '官网': 'bg-cyan-50 text-cyan-700', '社媒': 'bg-pink-50 text-pink-700', '线上': 'bg-indigo-50 text-indigo-700',
  '线下': 'bg-green-50 text-green-700', '系统': 'bg-gray-50 text-gray-600',
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [timelineChannelFilter, setTimelineChannelFilter] = useState<string>('全部')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCountry, setEditingCountry] = useState(false)
  const [countryDraft, setCountryDraft] = useState('')
  const [savingCountry, setSavingCountry] = useState(false)

  // Related data states
  const [custContacts, setCustContacts] = useState<Contact[]>([])
  const [custOrders, setCustOrders] = useState<Order[]>([])
  const [custPayments, setCustPayments] = useState<Payment[]>([])
  const [custOpps, setCustOpps] = useState<Opportunity[]>([])
  const [custQuotes, setCustQuotes] = useState<Quote[]>([])
  const [custContracts, setCustContracts] = useState<Contract[]>([])
  const [custPis, setCustPis] = useState<ProformaInvoice[]>([])
  const [custFollowUps, setCustFollowUps] = useState<FollowUp[]>([])
  const [relLoading, setRelLoading] = useState(false)

  // Contact add form state
  const [showAddContact, setShowAddContact] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', position: '', isKeyPerson: false })

  // Follow-up add form state
  const [showAddFollowUp, setShowAddFollowUp] = useState(false)
  const [addingFollowUp, setAddingFollowUp] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({ method: 'note', content: '', contactId: '' })

  const saveCountry = async () => {
    if (!customer) return
    setEditingCountry(false)
    const next = countryDraft.trim()
    if (next === customer.country) return
    setSavingCountry(true)
    try {
      const res = await updateCustomer(customer.id, { country: next })
      if (res.code === 0 && res.data) {
        setCustomer({ ...customer, country: next })
      } else {
        setError('保存国家失败')
      }
    } catch {
      setError('保存国家失败')
    } finally {
      setSavingCountry(false)
    }
  }

  const handleAddContact = async () => {
    if (!customer || !newContact.name.trim()) return
    setAddingContact(true)
    try {
      const ct = await createContact(customer.id, {
        name: newContact.name.trim(),
        phone: newContact.phone.trim() || undefined,
        email: newContact.email.trim() || undefined,
        position: newContact.position.trim() || undefined,
        isKeyPerson: newContact.isKeyPerson,
      })
      if (ct) {
        setCustContacts(prev => [ct, ...prev])
        setNewContact({ name: '', phone: '', email: '', position: '', isKeyPerson: false })
        setShowAddContact(false)
      }
    } catch {
      // silent
    } finally {
      setAddingContact(false)
    }
  }

  const handleAddFollowUp = async () => {
    if (!customer || !newFollowUp.content.trim()) return
    setAddingFollowUp(true)
    try {
      const fu = await createFollowUp({
        customerId: customer.id,
        method: newFollowUp.method,
        content: newFollowUp.content.trim(),
        contactId: newFollowUp.contactId || undefined,
      })
      if (fu) {
        setCustFollowUps(prev => [fu, ...prev])
        setNewFollowUp({ method: 'note', content: '', contactId: '' })
        setShowAddFollowUp(false)
      }
    } catch {
      // silent
    } finally {
      setAddingFollowUp(false)
    }
  }

  /** AI 辅助生成跟进内容 */
  const handleAiSuggest = async () => {
    if (!customer) return
    setAiGenerating(true)
    try {
      // 基于客户信息和最近跟进记录生成建议内容
      const recent = custFollowUps.slice(0, 3).map(f => `${f.method}:${f.content}`).join('\n')
      const prompt = `你是HOLANG销售助手。客户：${customer.name}（${customer.country || ''}${customer.industry ? ',' + customer.industry : ''}）。最近3条跟进：${recent || '无'}。请用中文写一条简短的跟进建议（1-2句话，不超过50字），适合${newFollowUp.method === 'note' ? '备注' : newFollowUp.method === 'call' ? '电话' : newFollowUp.method === 'email' ? '邮件' : newFollowUp.method}场景。只输出建议内容，不要解释。`
      // 调用后端 AI 接口（暂用模板生成，后续接真实 AI）
      const suggestions: Record<string, string> = {
        note: `跟进 ${customer.name}，确认项目进度和下一步计划。`,
        call: `致电 ${customer.contactName || customer.name}，沟通近期需求和合作意向。`,
        email: `发送产品资料给 ${customer.name}，附上最新报价和案例。`,
        visit: `预约拜访 ${customer.name}，现场了解设备使用情况。`,
        meeting: `安排与 ${customer.name} 的线上会议，讨论技术方案细节。`,
        whatsapp: `通过 WhatsApp 发送问候，分享行业动态和公司近况。`,
      }
      const suggested = suggestions[newFollowUp.method] || suggestions.note
      setNewFollowUp(prev => ({ ...prev, content: prev.content ? prev.content + '\n' + suggested : suggested }))
    } catch {
      // silent
    } finally {
      setAiGenerating(false)
    }
  }

  const basePath = location.pathname.startsWith('/export') ? '/export' : '/domestic'

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    getCustomerById(id)
      .then((data) => {
        if (data) setCustomer(data)
        else setError('客户不存在')
      })
      .catch(() => setError('加载客户数据失败'))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch related data
  const fetchRelated = useCallback(async () => {
    if (!id) return
    setRelLoading(true)
    try {
      const [contactsRes, ordersRes, paymentsRes, oppsRes, followUpsRes, quotesRes, contractsRes, pisRes] = await Promise.all([
        getContacts({ customerId: id, pageSize: 100 }),
        getOrders({ customerId: id, pageSize: 100 }),
        getPayments({ customerId: id, pageSize: 100 }),
        getOpportunities({ customerId: id, pageSize: 100 }),
        getFollowUps({ customerId: id, pageSize: 100 }),
        getQuotes({ customerId: id, pageSize: 100 }),
        getContracts({ customerId: id, pageSize: 100 }),
        getPis({ customerId: id, pageSize: 100 }),
      ])
      setCustContacts(contactsRes.list)
      setCustOrders(ordersRes.list)
      setCustPayments(paymentsRes.list)
      setCustOpps(oppsRes.list)
      setCustQuotes(quotesRes.list)
      // 后端已按 customerId 过滤；这里二次兜底，确保只统计当前客户
      setCustContracts(contractsRes.list.filter(c => !c.customerId || c.customerId === id))
      setCustPis(pisRes.list.filter(p => !p.customerId || p.customerId === id))
      setCustFollowUps(followUpsRes.list)
    } catch {
      // silent fail - sub-tabs just show empty
    } finally {
      setRelLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRelated()
  }, [fetchRelated])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> 加载中...
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium text-gray-500">{error || '客户不存在'}</p>
        <button onClick={() => navigate(`${basePath}/customers`)} className="btn-secondary mt-4">返回</button>
      </div>
    )
  }

  // Timeline = follow-ups mapped to timeline format
  const custTimeline: Array<{ id: string; type: string; channel: string; createdAt: string; content: string; operator: string }> = custFollowUps.map(f => ({
    id: f.id,
    type: f.method || 'note',
    channel: f.channel || '系统',
    createdAt: f.createdAt || '',
    content: f.content || '',
    operator: f.operator || f.user?.name || '',
  }))
  const filteredTimeline = timelineChannelFilter === '全部' ? custTimeline : custTimeline.filter(e => e.channel === timelineChannelFilter)

  // Channel interaction stats
  const channelStats = custTimeline.reduce((acc, e) => { acc[e.channel] = (acc[e.channel] || 0) + 1; return acc }, {} as Record<string, number>)
  const allChannels = ['全部', ...Array.from(new Set(custTimeline.map(e => e.channel)))]

  const totalOrderAmount = custOrders.reduce((sum, o) => sum + o.amount, 0)
  const totalPaymentReceived = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalOppAmount = custOpps.reduce((sum, o) => sum + (o.expectedAmount || 0), 0)

  const stageIndex = followStages.indexOf(customer.followStage)

  const fmtMoney = (v: number) => '¥' + v.toLocaleString()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`${basePath}/customers`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">客户详情</h1>
      </div>

      {/* Customer Info Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[customer.level]}`}>{customer.level}级</span>
                <span className="text-xs text-gray-400 font-mono">{customer.code}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                {/* 国家标签（可编辑） */}
                {editingCountry ? (
                  <span className="inline-flex items-center gap-1">
                    <Globe size={12} className="text-brand-500" />
                    <input
                      autoFocus
                      value={countryDraft}
                      onChange={(e) => setCountryDraft(e.target.value)}
                      onBlur={saveCountry}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingCountry(false) }}
                      placeholder="输入国家"
                      className="w-24 px-1 py-0.5 border border-brand-300 rounded text-xs text-gray-800 outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    {savingCountry && <Loader2 size={12} className="animate-spin text-brand-400" />}
                  </span>
                ) : (
                  <span
                    onClick={() => { setCountryDraft(customer.country); setEditingCountry(true) }}
                    title="点击编辑国家"
                    className={`inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-full font-medium ${
                      customer.country
                        ? customer.country === '中国'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-blue-50 text-blue-600'
                        : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                    }`}
                  >
                    <Globe size={12} />
                    {customer.country || '未设置国家'}
                    <span className="text-[10px] opacity-60">✎</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1"><Tag size={12} /> {customer.industry}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>
                <span className="inline-flex items-center gap-1"><User size={12} /> {customer.salesPerson}</span>
                <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> 来源：{customer.source}</span>
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> 创建：{customer.createdAt}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate(`${basePath}/customers/${customer.id}/edit`)} className="btn-secondary text-xs">编辑</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">商机总数</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{custOpps.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">商机金额</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{fmtMoney(totalOppAmount)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">订单金额</div>
            <div className="text-lg font-bold text-brand-600 mt-0.5">{fmtMoney(totalOrderAmount)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">已回款</div>
            <div className="text-lg font-bold text-green-600 mt-0.5">{fmtMoney(totalPaymentReceived)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex px-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 lg:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 销售闭环 stepper */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('loop.title')}</h3>
                <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
                  {(() => {
                    const isExternal = customer.salesType === 'EXTERNAL'
                    const loopStages: { key: string; label: string; count: number; done: boolean; tab: TabKey }[] = [
                      { key: 'opp', label: t('loop.opp'), count: custOpps.length, done: custOpps.some(o => o.stage === 'WON'), tab: 'opportunities' },
                      { key: 'quote', label: t('loop.quote'), count: custQuotes.length, done: custQuotes.length > 0, tab: 'quotations' },
                      { key: 'contract', label: t('loop.contract'), count: isExternal ? custPis.length : custContracts.length, done: isExternal ? (custPis.length > 0 || custOrders.some(o => o.piId)) : (custContracts.length > 0 || custOrders.some(o => o.contractId)), tab: 'orders' },
                      { key: 'order', label: t('loop.order'), count: custOrders.length, done: custOrders.length > 0, tab: 'orders' },
                      { key: 'payment', label: t('loop.payment'), count: custPayments.length, done: totalPaymentReceived > 0, tab: 'payments' },
                    ]
                    return loopStages.map((s, i) => (
                      <Fragment key={s.key}>
                        <button
                          onClick={() => setActiveTab(s.tab)}
                          className={`flex-1 min-w-[120px] rounded-lg border p-3 text-left transition-colors ${s.done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-medium ${s.done ? 'text-green-700' : 'text-gray-500'}`}>{s.label}</span>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${s.done ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>{s.count}</span>
                          </div>
                          <div className={`mt-1.5 text-[10px] ${s.done ? 'text-green-600' : 'text-gray-400'}`}>{s.done ? '已完成' : '未完成'}</div>
                        </button>
                        {i < loopStages.length - 1 && <ChevronRight size={16} className="self-center text-gray-300 shrink-0" />}
                      </Fragment>
                    ))
                  })()}
                </div>
              </div>

              {/* Follow Stage Progress — 色框线式 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">跟进阶段</h3>
                <div className="border border-blue-200 rounded-lg bg-white overflow-hidden">
                  <div className="flex">
                    {followStages.map((stage, idx) => {
                      const active = idx <= stageIndex
                      const current = idx === stageIndex
                      const isLast = idx === followStages.length - 1

                      // 阶段颜色映射：当前阶段绿色高亮，已完成浅色，未到达灰色
                      let bgColor = 'bg-gray-50'
                      let textColor = 'text-gray-400'
                      let borderColor = 'border-r border-gray-200'
                      if (current) {
                        bgColor = 'bg-green-500'
                        textColor = 'text-white font-bold'
                        borderColor = idx < followStages.length - 1 ? '' : ''
                      } else if (active && !current) {
                        bgColor = 'bg-green-50'
                        textColor = 'text-green-700'
                      }

                      return (
                        <div
                          key={stage}
                          className={`
                            flex-1 py-2.5 text-center text-xs cursor-pointer transition-all duration-200
                            ${bgColor} ${textColor} ${isLast ? '' : borderColor}
                            ${current ? 'shadow-sm' : 'hover:bg-gray-100'}
                          `}
                          title={stage}
                        >
                          {stage}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Interaction Summary */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">全渠道互动概览</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(channelStats).map(([channel, count]) => (
                  <div key={channel} className={`rounded-lg p-3 text-center ${channel === 'WhatsApp' ? 'bg-emerald-50' : channel === '电话' ? 'bg-blue-50' : channel === '邮件' ? 'bg-purple-50' : channel === '官网' ? 'bg-cyan-50' : channel === '社媒' ? 'bg-pink-50' : 'bg-gray-50'}`}>
                    <div className={`text-xs font-medium ${channel === 'WhatsApp' ? 'text-emerald-600' : channel === '电话' ? 'text-blue-600' : channel === '邮件' ? 'text-purple-600' : channel === '官网' ? 'text-cyan-600' : channel === '社媒' ? 'text-pink-600' : 'text-gray-500'}`}>{channel}</div>
                    <div className="text-xl font-bold text-gray-800 mt-0.5">{count}</div>
                    <div className="text-[10px] text-gray-400">次互动</div>
                  </div>
                ))}
                {Object.keys(channelStats).length === 0 && (
                  <div className="col-span-full text-center py-6 text-gray-400 text-sm">暂无互动记录</div>
                )}
              </div>
            </div>

            {/* Social Media Binding (Phase 2 Placeholder) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">社媒账号关联</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {['WhatsApp', 'LinkedIn', '企业微信', 'Facebook'].map(platform => {
                  const bound = platform === 'WhatsApp' && (customer.contactWhatsapp ? true : false)
                  return (
                    <div key={platform} className={`rounded-lg border p-3 flex items-center gap-3 ${bound ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bound ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        {platform === 'WhatsApp' && <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={bound ? 'text-emerald-600' : 'text-gray-300'}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>}
                        {platform === 'LinkedIn' && <Globe size={16} className={bound ? 'text-blue-600' : 'text-gray-300'} />}
                        {platform === '企业微信' && <MessageCircle size={16} className={bound ? 'text-green-600' : 'text-gray-300'} />}
                        {platform === 'Facebook' && <Users size={16} className={bound ? 'text-blue-600' : 'text-gray-300'} />}
                      </div>
                      <div>
                        <div className={`text-xs font-medium ${bound ? 'text-gray-700' : 'text-gray-400'}`}>{platform}</div>
                        <div className={`text-[10px] ${bound ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {bound ? '已关联' : '待绑定'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">第二阶段将支持员工绑定个人社媒账号，自动同步客户互动记录</p>
            </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoItem label="客户规模" value={customer.scale} />
                  <InfoItem label="销售部门" value={customer.salesDept} />
                  <InfoItem label="负责人" value={customer.salesPerson} />
                  <InfoItem label="公司网站" value={customer.website || '-'} />
                  <InfoItem label="主要联系人" value={`${customer.contactName} · ${customer.contactTitle}`} />
                  <InfoItem label="联系电话" value={customer.contactPhone} />
                  <InfoItem label="联系邮箱" value={customer.contactEmail} />
                  <InfoItem label="微信" value={customer.contactWechat || '-'} />
                  <InfoItem label="WhatsApp" value={customer.contactWhatsapp || '-'} />
                  <InfoItem label="开票抬头" value={customer.taxTitle} />
                  <InfoItem label="税号" value={customer.taxNumber} />
                  <InfoItem label="开户行" value={customer.bankName} />
                  <InfoItem label="银行账号" value={customer.bankAccount} />
                </div>
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="btn-primary text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> 新增联系人
                </button>
              </div>
              {showAddContact && (
                <div className="card border-brand-200 bg-brand-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">新增联系人</span>
                    <button onClick={() => { setShowAddContact(false); setNewContact({ name: '', phone: '', email: '', position: '', isKeyPerson: false }) }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={newContact.name}
                      onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="姓名 *"
                      className="input text-sm"
                      autoFocus
                    />
                    <input
                      value={newContact.phone}
                      onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="手机"
                      className="input text-sm"
                    />
                    <input
                      value={newContact.email}
                      onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="邮箱"
                      className="input text-sm"
                    />
                    <input
                      value={newContact.position}
                      onChange={e => setNewContact(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="职位"
                      className="input text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newContact.isKeyPerson}
                        onChange={e => setNewContact(prev => ({ ...prev, isKeyPerson: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      关键决策人
                    </label>
                    <button
                      onClick={handleAddContact}
                      disabled={!newContact.name.trim() || addingContact}
                      className="btn-primary text-xs ml-auto flex items-center gap-1"
                    >
                      {addingContact ? <><Loader2 size={14} className="animate-spin" /> 保存中</> : '保存'}
                    </button>
                  </div>
                </div>
              )}
              {relLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> 加载中...</div>
              ) : custContacts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无联系人</div>
              ) : (
                custContacts.map((ct) => (
                  <div key={ct.id} onClick={() => navigate(`${basePath}/contacts/${ct.id}`)} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${ct.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}>
                        {ct.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{ct.name}</span>
                          {ct.isKeyPerson && <span className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-[10px] rounded font-medium">关键决策人</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{ct.position || ct.title || ''} {ct.dept ? `· ${ct.dept}` : ''}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                          {ct.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {ct.phone}</span>}
                          {ct.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {ct.email}</span>}
                        </div>
                        {ct.remark && <div className="text-xs text-gray-400 mt-1">备注：{ct.remark}</div>}
                        {/* Social media links */}
                        <div className="flex items-center gap-2 mt-2">
                          {ct.wechat && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[11px] font-medium" title={`微信: ${ct.wechat}`}>
                              <MessageCircle size={12} /> 微信: {ct.wechat}
                            </span>
                          )}
                          {ct.whatsapp && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-medium" title={`WhatsApp: ${ct.whatsapp}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <div className="space-y-3">
              {relLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> 加载中...</div>
              ) : custOpps.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无商机</div>
              ) : (
                custOpps.map((opp) => (
                  <div key={opp.id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{opp.name}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <Calendar size={12} /> 预计成交：{opp.expectedCloseDate || '-'}
                          <span className="mx-1">·</span>
                          <User size={12} /> {opp.salesOwner?.name || '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${oppStageColors[opp.stage || ''] || 'bg-gray-50 text-gray-600'}`}>{opp.stage || '-'}</span>
                        <span className="text-lg font-bold text-brand-600">{fmtMoney(opp.expectedAmount || 0)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                      <span>成交概率：<span className="font-medium text-gray-700">{opp.winProbability || 0}%</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <div className="space-y-3">
              {relLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> 加载中...</div>
              ) : custQuotes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无报价</div>
              ) : (
                custQuotes.map((q) => (
                  <div key={q.id} onClick={() => navigate(`${basePath}/quotations/${q.id}`)} className="card cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{q.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${quotationStatusColors[q.status] || 'bg-gray-50 text-gray-600'}`}>{quotationStatusLabels[q.status] || q.status}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mt-1">{q.customerName}</div>
                      </div>
                      <span className="text-lg font-bold text-brand-600">{fmtMoney(q.amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {relLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> 加载中...</div>
              ) : custOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无订单</div>
              ) : (
                custOrders.map((o) => (
                  <div key={o.id} onClick={() => navigate(`${basePath}/orders/${o.id}`)} className="card cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{o.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[o.status] || 'bg-gray-50 text-gray-600'}`}>{orderStatusLabels[o.status] || o.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>下单：{o.createdAt}</span>
                          {o.deliveryDate && <span>交付：{o.deliveryDate}</span>}
                          {o.salesPerson && <span>{o.salesPerson}</span>}
                        </div>
                      </div>
                      <span className="text-lg font-bold text-brand-600">{fmtMoney(o.amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {custPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无回款记录</div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-sm text-gray-500">回款总额：<span className="font-bold text-green-600">{fmtMoney(totalPaymentReceived)}</span></div>
                    <div className="text-sm text-gray-500">待回款：<span className="font-bold text-orange-600">{fmtMoney(custPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}</span></div>
                  </div>
                  {custPayments.map((p) => (
                    <div key={p.id} className="card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-500">{p.paymentCode}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600">{p.type ? (paymentTypeLabels[p.type] || p.type) : '其他'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === 'received' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                              {p.status === 'received' ? '已到账' : '待回款'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>计划回款：{p.plannedDate}</span>
                            {p.receivedDate && <span>到账：{p.receivedDate}</span>}
                          </div>
                        </div>
                        <span className={`text-lg font-bold ${p.status === 'received' ? 'text-green-600' : 'text-orange-500'}`}>{fmtMoney(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Add Follow-Up Quick Entry */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                  className="btn-primary text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> 添加跟进
                </button>
              </div>
              {showAddFollowUp && (
                <div className="card border-brand-200 bg-brand-50/30 p-4 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">添加跟进记录</span>
                    <button onClick={() => { setShowAddFollowUp(false); setNewFollowUp({ method: 'note', content: '', contactId: '' }) }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  {/* 第一行：方式 + 联系人 */}
                  <div className="flex gap-3">
                    <select
                      value={newFollowUp.method}
                      onChange={e => setNewFollowUp(prev => ({ ...prev, method: e.target.value }))}
                      className="input text-sm w-32"
                    >
                      <option value="note">备注</option>
                      <option value="call">电话</option>
                      <option value="email">邮件</option>
                      <option value="visit">拜访</option>
                      <option value="meeting">会议</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                    <select
                      value={newFollowUp.contactId}
                      onChange={e => setNewFollowUp(prev => ({ ...prev, contactId: e.target.value }))}
                      className="input text-sm flex-1 min-w-0"
                    >
                      <option value="">选择联系人（可选）</option>
                      {custContacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.position ? ` · ${c.position}` : ''}{c.phone ? ` (${c.phone})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  {/* 第二行：多行内容 + AI按钮 */}
                  <div className="relative">
                    <textarea
                      value={newFollowUp.content}
                      onChange={e => setNewFollowUp(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="跟进内容 *（支持多行输入，Enter换行，Ctrl+Enter提交）"
                      className="input text-sm w-full resize-y min-h-[80px] pr-10"
                      autoFocus
                      rows={3}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleAddFollowUp()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={aiGenerating || !customer}
                      title="AI 辅助生成跟进内容"
                      className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-colors ${
                        aiGenerating
                          ? 'bg-purple-100 text-purple-400 animate-pulse cursor-wait'
                          : 'bg-purple-50 text-purple-500 hover:bg-purple-100 hover:text-purple-600'
                      }`}
                    >
                      <Sparkles size={16} />
                    </button>
                  </div>
                  {/* 提示 */}
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Sparkles size={12} /> AI 可根据客户信息和历史跟进自动生成建议，点击右上角 ✨ 按钮使用
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddFollowUp}
                      disabled={!newFollowUp.content.trim() || addingFollowUp}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      {addingFollowUp ? <><Loader2 size={14} className="animate-spin" /> 提交中</> : <><Send size={14} /> 提交</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Channel Filter */}
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                <Filter size={12} className="text-gray-400 shrink-0" />
                {allChannels.map(ch => (
                  <button key={ch} onClick={() => setTimelineChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${timelineChannelFilter === ch ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{ch}</button>
                ))}
              </div>
              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无该渠道记录</div>
              ) : (
                <div className="relative">
                <div className="space-y-0">
                  {filteredTimeline.map((evt, idx) => {
                    const IconComp = timelineTypeIcons[evt.type] || FileText
                    const isLast = idx === filteredTimeline.length - 1
                    return (
                      <div key={evt.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${timelineTypeColors[evt.type]} text-white`}>
                            <IconComp size={14} />
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                        </div>
                        <div className={`pb-5 ${isLast ? '' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${timelineTypeColors[evt.type]} text-white`}>{timelineTypeLabels[evt.type]}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${channelColors[evt.channel] || 'bg-gray-50 text-gray-500'}`}>{evt.channel}</span>
                            <span className="text-xs text-gray-400">{evt.createdAt}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{evt.content}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{evt.operator}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-gray-400 uppercase mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 truncate">{value}</div>
    </div>
  )
}
