import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, User, Building2, Calendar, Tag, TrendingUp, Clock, DollarSign, FileText, ShoppingBag, Receipt, MessageCircle, ChevronRight, Globe, Filter, Users } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import {
  customers, contacts, opportunities, quotations, orders, payments, timelineEvents,
  followStages, oppStages,
  Customer, Contact, Opportunity, Quotation, Order, Payment, TimelineEvent,
} from '../data/mockData'

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
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [timelineChannelFilter, setTimelineChannelFilter] = useState<string>('全部')

  const customer = customers.find((c) => c.id === id)
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium text-gray-500">客户不存在</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">返回</button>
      </div>
    )
  }

  const custContacts = contacts.filter((c) => c.customerId === id)
  const custOpps = opportunities.filter((o) => o.customerId === id)
  const custQuotations = quotations.filter((q) => q.customerId === id)
  const custOrders = orders.filter((o) => o.customerId === id)
  const custPayments = payments.filter((p) => p.customerId === id)
  const custTimeline = timelineEvents.filter((e) => e.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const filteredTimeline = timelineChannelFilter === '全部' ? custTimeline : custTimeline.filter(e => e.channel === timelineChannelFilter)

  // Channel interaction stats
  const channelStats = custTimeline.reduce((acc, e) => { acc[e.channel] = (acc[e.channel] || 0) + 1; return acc }, {} as Record<string, number>)
  const allChannels = ['全部', ...Array.from(new Set(custTimeline.map(e => e.channel)))]

  const totalOrderAmount = custOrders.reduce((sum, o) => sum + o.amount, 0)
  const totalPaymentReceived = custPayments.filter((p) => p.status === 'received').reduce((sum, p) => sum + p.amount, 0)
  const totalOppAmount = custOpps.reduce((sum, o) => sum + o.amount, 0)

  const stageIndex = followStages.indexOf(customer.followStage)

  const fmtMoney = (v: number) => '¥' + v.toLocaleString()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/domestic/customers')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
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
                <span className="inline-flex items-center gap-1"><Tag size={12} /> {customer.industry}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>
                <span className="inline-flex items-center gap-1"><User size={12} /> {customer.salesPerson}</span>
                <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> 来源：{customer.source}</span>
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> 创建：{customer.createdAt}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate(`/domestic/customers/${customer.id}/edit`)} className="btn-secondary text-xs">编辑</button>
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
              {custContacts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无联系人</div>
              ) : (
                custContacts.map((ct) => (
                  <div key={ct.id} onClick={() => navigate(`/domestic/contacts/${ct.id}`)} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${ct.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}>
                        {ct.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{ct.name}</span>
                          {ct.isPrimary && <span className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-[10px] rounded font-medium">主要联系人</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{ct.title} · {ct.dept}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1"><Phone size={11} /> {ct.phone}</span>
                          <span className="inline-flex items-center gap-1"><Mail size={11} /> {ct.email}</span>
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
              {custOpps.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无商机</div>
              ) : (
                custOpps.map((opp) => (
                  <div key={opp.id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{opp.name}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <Calendar size={12} /> 预计成交：{opp.expectedCloseDate}
                          <span className="mx-1">·</span>
                          <User size={12} /> {opp.salesPerson}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${oppStageColors[opp.stage] || 'bg-gray-50 text-gray-600'}`}>{opp.stage}</span>
                        <span className="text-lg font-bold text-brand-600">{fmtMoney(opp.amount)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                      <span>成交概率：<span className="font-medium text-gray-700">{opp.probability}%</span></span>
                      <span>产品：{opp.products.join('、')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <div className="space-y-3">
              {custQuotations.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无报价</div>
              ) : (
                custQuotations.map((q) => (
                  <div key={q.id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{q.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${quotationStatusColors[q.status]}`}>{quotationStatusLabels[q.status]}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          有效期至 {q.validUntil} · {q.salesPerson}
                        </div>
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
              {custOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无订单</div>
              ) : (
                custOrders.map((o) => (
                  <div key={o.id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">{o.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[o.status]}`}>{orderStatusLabels[o.status]}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>下单：{o.createdAt}</span>
                          <span>预计交付：{o.deliveryDate}</span>
                          <span>{o.salesPerson}</span>
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
                            <span className="font-mono text-sm text-gray-500">{p.code}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600">{paymentTypeLabels[p.type]}</span>
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
