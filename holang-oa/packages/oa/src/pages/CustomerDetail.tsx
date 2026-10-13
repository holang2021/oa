import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, User, UserX, Building2, Calendar, Tag, TrendingUp, Clock, DollarSign, FileText, ShoppingBag, Receipt, MessageCircle, ChevronRight, Globe, Filter, Users, Loader2, Plus, X, Sparkles, Send, Pencil, Trash2, Reply, CornerDownRight, AlertTriangle, Save, CheckCircle2 } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getCustomerById, updateCustomer, getCustomers, type Customer } from '../services/customerService'
import { getContacts, createContact, updateContact, leaveContact, migrateContact, type Contact } from '../services/contactService'
import { getFieldConfig } from '../services/fieldConfigStore'
import { getOrders, type Order } from '../services/orderService'
import { getPayments, type Payment } from '../services/paymentService'
import { getOpportunities, type Opportunity } from '../services/opportunityService'
import { getQuotes, type Quote } from '../services/quoteService'
import { getContracts, type Contract } from '../services/contractService'
import { getPis, type ProformaInvoice } from '../services/piService'
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp, type FollowUp } from '../services/followUpService'
import { getCurrentUser } from '../services/authService'
import QuickAddContactSelect from '../components/QuickAddContactSelect'
import CustomerAiChat from '../components/CustomerAiChat'
import { followStages } from '../data/mockData'

type TabKey = 'overview' | 'contacts' | 'opportunities' | 'quotations' | 'orders' | 'payments' | 'timeline' | 'ai'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '概览' },
  { key: 'contacts', label: '联系人' },
  { key: 'opportunities', label: '商机' },
  { key: 'quotations', label: '报价' },
  { key: 'orders', label: '订单' },
  { key: 'payments', label: '回款' },
  { key: 'timeline', label: '时间轴' },
  { key: 'ai', label: 'AI 助手' },
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
  in_production: 'bg-yellow-50 text-yellow-700', shipped: 'bg-brand-50 text-brand-700',
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
  call: 'bg-blue-500', visit: 'bg-green-500', email: 'bg-brand-500', meeting: 'bg-orange-500',
  quotation: 'bg-indigo-500', order: 'bg-emerald-500', payment: 'bg-emerald-500', note: 'bg-gray-400',
  whatsapp: 'bg-emerald-600', website: 'bg-blue-500', social: 'bg-brand-500',
}
const timelineTypeLabels: Record<string, string> = {
  call: '电话', visit: '拜访', email: '邮件', meeting: '会议', quotation: '报价', order: '订单',
  payment: '回款', note: '备注', whatsapp: 'WhatsApp', website: '网站', social: '社媒',
}
const channelColors: Record<string, string> = {
  '电话': 'bg-blue-50 text-blue-700', '邮件': 'bg-brand-50 text-brand-700', 'WhatsApp': 'bg-emerald-50 text-emerald-700',
  '官网': 'bg-blue-50 text-blue-700', '社媒': 'bg-brand-50 text-brand-700', '线上': 'bg-indigo-50 text-indigo-700',
  '线下': 'bg-green-50 text-green-700', '系统': 'bg-gray-50 text-gray-600',
}

// 联系人软信息(extension) 解析/序列化辅助
function parseExtension(ext?: string | null): Record<string, any> {
  if (!ext) return {}
  try {
    const obj = JSON.parse(ext)
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
function stringifyExtension(obj: Record<string, any>): string | null {
  if (!obj || Object.keys(obj).length === 0) return null
  return JSON.stringify(obj)
}
function isLeft(ct: Contact): boolean {
  return ct.status === 'LEFT'
}
function salesTypeLabel(v?: string | null): string {
  if (v === 'EXTERNAL' || v === 'export') return '外销/海外'
  if (v === 'INTERNAL' || v === 'domestic') return '内销/国内'
  return '未分域'
}
function contactMoveHint(ct: Contact): string {
  if (ct.migratedFromId) return '由其它客户历史联系人迁入；原任职记录已保留'
  if (isLeft(ct) && ct.leftNote?.includes('迁移至客户')) return ct.leftNote
  return ''
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const currentUser = getCurrentUser()
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN'
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
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', position: '', wechat: '', whatsapp: '', dept: '', gender: '', remark: '', isKeyPerson: false })

  // Contact edit state
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editContactDraft, setEditContactDraft] = useState<Partial<Contact>>({})
  const [savingContactEdit, setSavingContactEdit] = useState(false)
  // 编辑联系人时软信息(extension)工作对象
  const [editContactExtension, setEditContactExtension] = useState<Record<string, any>>({})
  // 标记离职弹窗
  const [leavingContact, setLeavingContact] = useState<Contact | null>(null)
  const [leaveNote, setLeaveNote] = useState('')
  const [leaving, setLeaving] = useState(false)
  // 迁移弹窗
  const [migratingContact, setMigratingContact] = useState<Contact | null>(null)
  const [migrateTargetId, setMigrateTargetId] = useState('')
  const [migrateNote, setMigrateNote] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [migrateOptions, setMigrateOptions] = useState<Customer[]>([])
  const [contactNotice, setContactNotice] = useState<{ ok: boolean; text: string } | null>(null)

  // Follow-up add form state
  const [showAddFollowUp, setShowAddFollowUp] = useState(false)
  const [addingFollowUp, setAddingFollowUp] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({ method: 'note', content: '', contactId: '' })

  // Follow-up edit / reply / filter state
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null)
  const [editDraft, setEditDraft] = useState({ method: 'note', content: '', followedAt: '', nextFollowUpAt: '', nextPlan: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [replyParent, setReplyParent] = useState<FollowUp | null>(null)
  const [replyDraft, setReplyDraft] = useState({ content: '' })
  const [savingReply, setSavingReply] = useState(false)
  const [timelineRange, setTimelineRange] = useState<'all' | '30' | '90'>('all')

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
        wechat: newContact.wechat.trim() || undefined,
        whatsapp: newContact.whatsapp.trim() || undefined,
        dept: newContact.dept.trim() || undefined,
        gender: newContact.gender || undefined,
        remark: newContact.remark.trim() || undefined,
        isKeyPerson: newContact.isKeyPerson,
      })
      if (ct) {
        setCustContacts(prev => [ct, ...prev])
        setNewContact({ name: '', phone: '', email: '', position: '', wechat: '', whatsapp: '', dept: '', gender: '', remark: '', isKeyPerson: false })
        setShowAddContact(false)
      }
    } catch (e: any) {
      alert(e?.message || '添加联系人失败')
    } finally {
      setAddingContact(false)
    }
  }

  const startEditContact = (ct: Contact) => {
    setEditingContact(ct)
    setEditContactDraft({ ...ct })
    setEditContactExtension(parseExtension(ct.extension))
  }

  const handleUpdateContact = async () => {
    if (!editingContact || !editContactDraft.name?.trim()) return
    setSavingContactEdit(true)
    try {
      const updated = await updateContact(editingContact.id, {
        ...editContactDraft,
        customerId: editingContact.customerId,
        name: editContactDraft.name.trim(),
        phone: editContactDraft.phone?.trim() || undefined,
        email: editContactDraft.email?.trim() || undefined,
        wechat: editContactDraft.wechat?.trim() || undefined,
        whatsapp: editContactDraft.whatsapp?.trim() || undefined,
        dept: editContactDraft.dept?.trim() || undefined,
        position: editContactDraft.position?.trim() || undefined,
        title: editContactDraft.title?.trim() || undefined,
        remark: editContactDraft.remark?.trim() || undefined,
        extension: stringifyExtension(editContactExtension),
      })
      if (updated) {
        setCustContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
        setEditingContact(null)
      }
    } catch (e: any) {
      alert(e?.message || '保存失败，仅创建者可修改')
    } finally {
      setSavingContactEdit(false)
    }
  }

  // 标记离职（治理铁律：原记录保留 + status=LEFT + 审计留痕，禁止删除）
  const startLeaveContact = (ct: Contact) => {
    setLeavingContact(ct)
    setLeaveNote('')
  }
  const handleLeave = async () => {
    if (!leavingContact) return
    setLeaving(true)
    try {
      const updated = await leaveContact(leavingContact.id, leaveNote.trim() || undefined)
      if (updated) {
        setCustContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
        setLeavingContact(null)
      } else {
        alert('操作失败')
      }
    } catch (e: any) {
      alert(e?.message || '标记离职失败')
    } finally {
      setLeaving(false)
    }
  }
  // 迁移联系人到目标客户（原记录标 LEFT 保留，新建记录挂目标客户 + 血缘）
  const startMigrateContact = async (ct: Contact) => {
    setMigratingContact(ct)
    setMigrateTargetId('')
    setMigrateNote('')
    try {
      // 人换工作可能跨内销/外销客户，目标列表不按当前客户域二次收窄；后端仍按登录权限返回可见客户。
      const res = await getCustomers({ pageSize: 300 })
      setMigrateOptions(res.list.filter(c => c.id !== customer?.id))
    } catch {
      setMigrateOptions([])
    }
  }
  const handleMigrate = async () => {
    if (!migratingContact || !migrateTargetId) return
    setMigrating(true)
    setContactNotice(null)
    try {
      const target = migrateOptions.find(c => c.id === migrateTargetId)
      const created = await migrateContact(migratingContact.id, migrateTargetId, migrateNote.trim() || undefined)
      if (created) {
        // 原记录已标 LEFT；刷新本客户联系人列表以反映状态
        const res = await getContacts({ customerId: customer?.id, pageSize: 100 })
        setCustContacts(res.list)
        setMigratingContact(null)
        setContactNotice({
          ok: true,
          text: `已迁移到 ${target?.name || '目标客户'}。原公司记录已保留为「已离职」，新公司已创建联系人。`,
        })
      } else {
        setContactNotice({ ok: false, text: '迁移失败，请稍后重试' })
      }
    } catch (e: any) {
      setContactNotice({ ok: false, text: e?.message || '迁移失败，请稍后重试' })
    } finally {
      setMigrating(false)
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

  // 打开编辑（仅本人可见入口）
  const handleOpenEdit = (f: FollowUp) => {
    setEditingFollowUp(f)
    setEditDraft({
      method: f.method || 'note',
      content: f.content || '',
      followedAt: f.followedAt ? f.followedAt.slice(0, 16) : (f.createdAt ? f.createdAt.slice(0, 16) : ''),
      nextFollowUpAt: f.nextFollowUpAt ? f.nextFollowUpAt.slice(0, 10) : '',
      nextPlan: f.nextPlan || '',
    })
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingFollowUp || !editDraft.content.trim()) return
    setSavingEdit(true)
    try {
      const updated = await updateFollowUp(editingFollowUp.id, {
        method: editDraft.method,
        content: editDraft.content.trim(),
        followedAt: editDraft.followedAt ? new Date(editDraft.followedAt).toISOString() : undefined,
        nextFollowUpAt: editDraft.nextFollowUpAt ? new Date(editDraft.nextFollowUpAt).toISOString() : undefined,
        nextPlan: editDraft.nextPlan.trim() || undefined,
      })
      if (updated) {
        setCustFollowUps(prev => prev.map(f => f.id === updated.id ? updated : f))
        setEditingFollowUp(null)
      }
    } catch {
      // silent
    } finally {
      setSavingEdit(false)
    }
  }

  // 删除（仅本人，二次确认）
  const handleDeleteFollowUp = async (f: FollowUp) => {
    if (!window.confirm('确定删除这条跟进记录吗？此操作不可恢复。')) return
    try {
      const ok = await deleteFollowUp(f.id)
      if (ok) setCustFollowUps(prev => prev.filter(x => x.id !== f.id))
    } catch {
      // silent
    }
  }

  // 打开回复/补充（主管/管理员对他人记录）
  const handleOpenReply = (f: FollowUp) => {
    setReplyParent(f)
    setReplyDraft({ content: '' })
  }

  // 保存回复/补充
  const handleSaveReply = async () => {
    if (!replyParent || !replyParent.customerId || !replyDraft.content.trim()) return
    setSavingReply(true)
    try {
      const fu = await createFollowUp({
        customerId: replyParent.customerId,
        method: 'note',
        content: replyDraft.content.trim(),
        parentId: replyParent.id,
      })
      if (fu) {
        setCustFollowUps(prev => [fu, ...prev])
        setReplyParent(null)
      }
    } catch {
      // silent
    } finally {
      setSavingReply(false)
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

  // Timeline = follow-ups（保留完整字段，用于编辑/回复/权限判断）
  const custTimeline: FollowUp[] = custFollowUps
  // 时间范围过滤（近30/90天，按跟进时间或创建时间）
  const rangeFiltered = timelineRange === 'all'
    ? custTimeline
    : custTimeline.filter(f => {
        const ts = new Date(f.followedAt || f.createdAt || 0).getTime()
        const cutoff = Date.now() - (timelineRange === '30' ? 30 : 90) * 86400000
        return ts >= cutoff
      })
  const filteredTimeline = timelineChannelFilter === '全部'
    ? rangeFiltered
    : rangeFiltered.filter(e => (e.channel || '系统') === timelineChannelFilter)
  // 构建父子树：父跟进（无 parentId）+ 其回复（parentId 指向父）
  const parentItems = filteredTimeline.filter(f => !f.parentId)
  const repliesOf = (pid: string) => filteredTimeline.filter(f => f.parentId === pid)
  const fmtFollowTime = (f: FollowUp) => {
    const raw = f.followedAt || f.createdAt || ''
    return raw ? raw.slice(0, 16).replace('T', ' ') : ''
  }

  // Channel interaction stats
  const channelStats = custTimeline.reduce((acc, e) => { acc[e.channel || '系统'] = (acc[e.channel || '系统'] || 0) + 1; return acc }, {} as Record<string, number>)
  const allChannels = ['全部', ...Array.from(new Set(custTimeline.map(e => e.channel || '系统')))]

  const totalOrderAmount = custOrders.reduce((sum, o) => sum + o.amount, 0)
  const totalPaymentReceived = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalOppAmount = custOpps.reduce((sum, o) => sum + (o.expectedAmount || 0), 0)

  const stageIndex = followStages.indexOf(customer.followStage)

  const fmtMoney = (v: number) => '¥' + v.toLocaleString()

  const buildCreateLink = (resource: 'opportunities' | 'orders' | 'collections') => {
    const params = new URLSearchParams({
      customerId: customer.id,
      returnTo: `${basePath}/customers/${customer.id}`,
    })
    return `${basePath}/${resource}/new?${params.toString()}`
  }

  const openFollowUp = () => {
    setActiveTab('timeline')
    setShowAddFollowUp(true)
    window.setTimeout(() => {
      document.getElementById('customer-followup-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

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

        {/* 业务内链：保留当前客户上下文，直接进入下一步工作 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-700">快捷操作</div>
            <div className="text-xs text-gray-400 mt-0.5">已自动关联当前客户，完成后返回本页</div>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <button onClick={openFollowUp} className="btn-primary text-xs inline-flex items-center justify-center gap-1.5">
              <MessageCircle size={14} /> 新增跟进
            </button>
            <button onClick={() => navigate(buildCreateLink('opportunities'))} className="btn-secondary text-xs inline-flex items-center justify-center gap-1.5">
              <TrendingUp size={14} /> 新建商机
            </button>
            <button onClick={() => navigate(buildCreateLink('orders'))} className="btn-secondary text-xs inline-flex items-center justify-center gap-1.5">
              <ShoppingBag size={14} /> 新建订单
            </button>
            <button onClick={() => navigate(buildCreateLink('collections'))} className="btn-secondary text-xs inline-flex items-center justify-center gap-1.5">
              <DollarSign size={14} /> 新建回款
            </button>
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
                  <div key={channel} className={`rounded-lg p-3 text-center ${channel === 'WhatsApp' ? 'bg-emerald-50' : channel === '电话' ? 'bg-blue-50' : channel === '邮件' ? 'bg-brand-50' : channel === '官网' ? 'bg-blue-50' : channel === '社媒' ? 'bg-brand-50' : 'bg-gray-50'}`}>
                    <div className={`text-xs font-medium ${channel === 'WhatsApp' ? 'text-emerald-600' : channel === '电话' ? 'text-blue-600' : channel === '邮件' ? 'text-brand-600' : channel === '官网' ? 'text-blue-600' : channel === '社媒' ? 'text-brand-600' : 'text-gray-500'}`}>{channel}</div>
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
              {contactNotice && (
                <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                  contactNotice.ok
                    ? 'border-green-100 bg-green-50 text-green-700'
                    : 'border-red-100 bg-red-50 text-red-600'
                }`}>
                  <div className="flex items-start gap-2">
                    {contactNotice.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                    <span>{contactNotice.text}</span>
                  </div>
                  <button onClick={() => setContactNotice(null)} className="text-current opacity-60 hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              )}
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
                    <button onClick={() => { setShowAddContact(false); setNewContact({ name: '', phone: '', email: '', position: '', wechat: '', whatsapp: '', dept: '', gender: '', remark: '', isKeyPerson: false }) }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
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
                      value={newContact.position}
                      onChange={e => setNewContact(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="职位"
                      className="input text-sm"
                    />
                    <input
                      value={newContact.dept}
                      onChange={e => setNewContact(prev => ({ ...prev, dept: e.target.value }))}
                      placeholder="部门"
                      className="input text-sm"
                    />
                    <select
                      value={newContact.gender}
                      onChange={e => setNewContact(prev => ({ ...prev, gender: e.target.value }))}
                      className="input text-sm"
                    >
                      <option value="">性别</option>
                      <option value="MALE">男</option>
                      <option value="FEMALE">女</option>
                      <option value="UNKNOWN">未知</option>
                    </select>
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
                      value={newContact.wechat}
                      onChange={e => setNewContact(prev => ({ ...prev, wechat: e.target.value }))}
                      placeholder="微信"
                      className="input text-sm"
                    />
                    <input
                      value={newContact.whatsapp}
                      onChange={e => setNewContact(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="WhatsApp"
                      className="input text-sm"
                    />
                  </div>
                  <textarea
                    value={newContact.remark}
                    onChange={e => setNewContact(prev => ({ ...prev, remark: e.target.value }))}
                    placeholder="备注"
                    rows={2}
                    className="input text-sm resize-none"
                  />
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
                custContacts.map((ct) => {
                  const isCreator = !ct.createdById || ct.createdById === currentUser?.id
                  const moveHint = contactMoveHint(ct)
                  return (
                    <div key={ct.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md hover:border-gray-300 transition-all">
                      <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => navigate(`${basePath}/contacts/${ct.id}`)}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${ct.gender === 'MALE' ? 'bg-blue-400' : ct.gender === 'FEMALE' ? 'bg-brand-400' : 'bg-gray-400'}`}>
                          {ct.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{ct.name}</span>
                            {ct.isKeyPerson && <span className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-[10px] rounded font-medium">关键决策人</span>}
                            {isLeft(ct) && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-medium">已离职</span>}
                            {ct.migratedFromId && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded font-medium">迁入</span>}
                            {!isCreator && ct.createdBy && (
                              <span className="text-[10px] text-gray-400">创建者：{ct.createdBy.name}</span>
                            )}
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
                          {isLeft(ct) && ct.leftNote && (
                            <div className="text-xs text-gray-400 mt-1">离职备注：{ct.leftNote}</div>
                          )}
                          {moveHint && !isLeft(ct) && (
                            <div className="text-xs text-blue-500 mt-1">任职历史：{moveHint}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isCreator && !isLeft(ct) && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); startMigrateContact(ct) }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="迁移到其它客户"
                            >
                              <CornerDownRight size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startLeaveContact(ct) }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="标记离职"
                            >
                              <UserX size={14} />
                            </button>
                          </>
                        )}
                        {isCreator && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditContact(ct) }}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                            title="编辑"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-gray-300 shrink-0 cursor-pointer" onClick={() => navigate(`${basePath}/contacts/${ct.id}`)} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Edit Contact Modal */}
          {editingContact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-white">
                  <h3 className="font-semibold text-gray-800">编辑联系人</h3>
                  <button onClick={() => setEditingContact(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto min-h-0">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">姓名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={editContactDraft.name || ''}
                      onChange={e => setEditContactDraft(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">职位</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.position || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">部门</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.dept || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, dept: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">称谓</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.title || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">性别</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.gender || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, gender: e.target.value || undefined }))}
                      >
                        <option value="">未知</option>
                        <option value="MALE">男</option>
                        <option value="FEMALE">女</option>
                        <option value="UNKNOWN">未知</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">类型</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={editContactDraft.type || 'PRIMARY'}
                      onChange={e => setEditContactDraft(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="PRIMARY">主要联系人</option>
                      <option value="SECONDARY">次要联系人</option>
                      <option value="DECISION">决策人</option>
                      <option value="TECHNICAL">技术对接人</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">手机</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.phone || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.email || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">微信</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.wechat || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, wechat: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={editContactDraft.whatsapp || ''}
                        onChange={e => setEditContactDraft(prev => ({ ...prev, whatsapp: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">备注</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      value={editContactDraft.remark || ''}
                      onChange={e => setEditContactDraft(prev => ({ ...prev, remark: e.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editContactDraft.isKeyPerson}
                      onChange={e => setEditContactDraft(prev => ({ ...prev, isKeyPerson: e.target.checked }))}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    关键决策人
                  </label>
                  {/* 软信息（治理铁律：JSONB/extension 机制动态渲染，不写死加列） */}
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-3">软信息（销售跟进决策参考）</div>
                    <div className="space-y-4">
                      {getFieldConfig('contact').map((f) => (
                        <div key={f.id}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {f.label}
                            {f.helpText && <span className="text-gray-400 ml-1">· {f.helpText}</span>}
                          </label>
                          {f.fieldType === 'textarea' ? (
                            <textarea
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                              value={editContactExtension[f.fieldName] ?? ''}
                              onChange={e => setEditContactExtension(prev => ({ ...prev, [f.fieldName]: e.target.value }))}
                            />
                          ) : f.fieldType === 'date' ? (
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              value={editContactExtension[f.fieldName] ?? ''}
                              onChange={e => setEditContactExtension(prev => ({ ...prev, [f.fieldName]: e.target.value }))}
                            />
                          ) : f.fieldType === 'select' ? (
                            <select
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              value={editContactExtension[f.fieldName] ?? ''}
                              onChange={e => setEditContactExtension(prev => ({ ...prev, [f.fieldName]: e.target.value }))}
                            >
                              <option value="">未填写</option>
                              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              value={editContactExtension[f.fieldName] ?? ''}
                              onChange={e => setEditContactExtension(prev => ({ ...prev, [f.fieldName]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                  <button
                    onClick={() => setEditingContact(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdateContact}
                    disabled={savingContactEdit || !editContactDraft.name?.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                  >
                    {savingContactEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 标记离职弹窗 */}
          {leavingContact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">标记离职</h3>
                  <button onClick={() => setLeavingContact(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-sm text-gray-600">联系人 <span className="font-medium text-gray-900">{leavingContact.name}</span> 将保留在档案中并标记为「已离职」，不可删除。可后续迁移到其它客户。</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">离职备注（选填）</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      value={leaveNote}
                      onChange={e => setLeaveNote(e.target.value)}
                      placeholder="如离职原因、接替人等"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => setLeavingContact(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {leaving ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                    确认离职
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 迁移弹窗 */}
          {migratingContact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">迁移联系人</h3>
                  <button onClick={() => setMigratingContact(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-sm text-gray-600">将 <span className="font-medium text-gray-900">{migratingContact.name}</span> 迁移到目标客户：原记录保留并标记「已离职」，新记录在目标客户下创建（带血缘）。</p>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                    成熟 CRM 规则：人换公司不直接改挂客户；原公司历史跟进保留，新公司创建新的任职记录，避免报价、沟通和责任归属错乱。
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">目标客户 <span className="text-red-500">*</span></label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={migrateTargetId}
                      onChange={e => setMigrateTargetId(e.target.value)}
                    >
                      <option value="">请选择目标客户</option>
                      {migrateOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}（{salesTypeLabel(c.salesType)}{c.country ? ` · ${c.country}` : ''}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">迁移备注（选填）</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      value={migrateNote}
                      onChange={e => setMigrateNote(e.target.value)}
                      placeholder="如从 A 公司离职加入 B 公司"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => setMigratingContact(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                  <button
                    onClick={handleMigrate}
                    disabled={migrating || !migrateTargetId}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {migrating ? <Loader2 size={14} className="animate-spin" /> : <CornerDownRight size={14} />}
                    确认迁移
                  </button>
                </div>
              </div>
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
                <div id="customer-followup-form" className="card border-brand-200 bg-brand-50/30 p-4 space-y-3 mb-4 scroll-mt-24">
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
                    <QuickAddContactSelect
                      customerId={customer.id}
                      value={newFollowUp.contactId}
                      onChange={(v) => setNewFollowUp(prev => ({ ...prev, contactId: v }))}
                      contacts={custContacts}
                      onContactCreated={(c) => {
                        setCustContacts(prev => [c, ...prev])
                        setNewFollowUp(prev => ({ ...prev, contactId: c.id }))
                      }}
                      placeholder="选择联系人（可选）"
                      className="input text-sm flex-1 min-w-0"
                    />
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
                          ? 'bg-brand-100 text-brand-400 animate-pulse cursor-wait'
                          : 'bg-brand-50 text-brand-500 hover:bg-brand-100 hover:text-brand-600'
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

              {/* 时间范围筛选 */}
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                <Clock size={12} className="text-gray-400 shrink-0" />
                {([['all', '全部'], ['30', '近30天'], ['90', '近90天']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setTimelineRange(val)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${timelineRange === val ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{label}</button>
                ))}
              </div>

              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无该渠道记录</div>
              ) : (
                <div className="relative">
                <div className="space-y-0">
                  {parentItems.map((evt, idx) => {
                    const IconComp = timelineTypeIcons[evt.method || 'note'] || FileText
                    const isLast = idx === parentItems.length - 1
                    const isOwner = evt.userId === currentUser?.id
                    const canEditDelete = isOwner
                    const canReply = isManager && !isOwner
                    const replies = repliesOf(evt.id)
                    return (
                      <div key={evt.id}>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${timelineTypeColors[evt.method || 'note']} text-white`}>
                              <IconComp size={14} />
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                          </div>
                          <div className={`pb-5 ${isLast ? '' : ''} flex-1`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${timelineTypeColors[evt.method || 'note']} text-white`}>{timelineTypeLabels[evt.method || 'note']}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${channelColors[evt.channel || '系统'] || 'bg-gray-50 text-gray-500'}`}>{evt.channel || '系统'}</span>
                              <span className="text-xs text-gray-400">跟进：{fmtFollowTime(evt)}</span>
                              {evt.nextFollowUpAt && <span className="text-xs text-orange-500">下次跟进：{evt.nextFollowUpAt.slice(0, 10)}</span>}
                            </div>
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{evt.content}</p>
                            {evt.nextPlan && (
                              <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                                <span className="font-medium text-gray-600">下一步计划：</span>{evt.nextPlan}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-gray-400">{evt.operator || evt.user?.name || ''}</span>
                              <div className="flex items-center gap-2 ml-auto">
                                {canEditDelete && (
                                  <>
                                    <button onClick={() => handleOpenEdit(evt)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600"><Pencil size={12} /> 编辑</button>
                                    <button onClick={() => handleDeleteFollowUp(evt)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"><Trash2 size={12} /> 删除</button>
                                  </>
                                )}
                                {canReply && (
                                  <button onClick={() => handleOpenReply(evt)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600"><Reply size={12} /> 回复/补充</button>
                                )}
                              </div>
                            </div>
                            {replies.length > 0 && (
                              <div className="mt-2 space-y-2 pl-3 border-l-2 border-brand-100">
                                {replies.map(r => {
                                  const rOwner = r.userId === currentUser?.id
                                  return (
                                    <div key={r.id} className="bg-brand-50/40 rounded-lg p-2.5">
                                      <div className="flex items-center gap-2">
                                        <CornerDownRight size={12} className="text-brand-400 shrink-0" />
                                        <span className="text-[10px] font-medium text-brand-600">{r.user?.name || r.operator || '补充'}</span>
                                        <span className="text-[10px] text-gray-400">的补充 · {fmtFollowTime(r)}</span>
                                        {rOwner && (
                                          <button onClick={() => handleDeleteFollowUp(r)} className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-red-500 ml-auto"><Trash2 size={10} /> 删除</button>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{r.content}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )}

              {/* 编辑跟进弹窗（仅本人） */}
              {editingFollowUp && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-3 border-b">
                      <span className="text-sm font-semibold text-gray-700">编辑跟进记录</span>
                      <button onClick={() => setEditingFollowUp(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex gap-3">
                        <select value={editDraft.method} onChange={e => setEditDraft(prev => ({ ...prev, method: e.target.value }))} className="input text-sm w-32">
                          <option value="note">备注</option>
                          <option value="call">电话</option>
                          <option value="email">邮件</option>
                          <option value="visit">拜访</option>
                          <option value="meeting">会议</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                        <input type="datetime-local" value={editDraft.followedAt} onChange={e => setEditDraft(prev => ({ ...prev, followedAt: e.target.value }))} className="input text-sm flex-1" title="跟进时间（业务发生时间）" />
                      </div>
                      <textarea value={editDraft.content} onChange={e => setEditDraft(prev => ({ ...prev, content: e.target.value }))} placeholder="跟进内容 *" className="input text-sm w-full resize-y min-h-[80px]" rows={3} />
                      <input type="date" value={editDraft.nextFollowUpAt} onChange={e => setEditDraft(prev => ({ ...prev, nextFollowUpAt: e.target.value }))} className="input text-sm w-full" title="下次跟进日期" />
                      <textarea value={editDraft.nextPlan} onChange={e => setEditDraft(prev => ({ ...prev, nextPlan: e.target.value }))} placeholder="下一步计划" className="input text-sm w-full resize-y min-h-[60px]" rows={2} />
                    </div>
                    <div className="flex justify-end gap-3 px-5 py-3 border-t bg-gray-50">
                      <button onClick={() => setEditingFollowUp(null)} className="btn-ghost">取消</button>
                      <button onClick={handleSaveEdit} disabled={!editDraft.content.trim() || savingEdit} className="btn-primary text-xs flex items-center gap-1">
                        {savingEdit ? <><Loader2 size={14} className="animate-spin" /> 保存中</> : '保存'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 回复/补充弹窗（主管/管理员对他人记录） */}
              {replyParent && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                    <div className="flex items-center justify-between px-5 py-3 border-b">
                      <span className="text-sm font-semibold text-gray-700">回复/补充跟进</span>
                      <button onClick={() => setReplyParent(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                        原记录：{replyParent.content?.slice(0, 60)}{replyParent.content && replyParent.content.length > 60 ? '…' : ''}
                      </div>
                      <textarea value={replyDraft.content} onChange={e => setReplyDraft(prev => ({ ...prev, content: e.target.value }))} placeholder="补充内容 *（您的补充将以新记录挂接在原记录下，原记录不会被修改）" className="input text-sm w-full resize-y min-h-[80px]" rows={3} autoFocus />
                    </div>
                    <div className="flex justify-end gap-3 px-5 py-3 border-t bg-gray-50">
                      <button onClick={() => setReplyParent(null)} className="btn-ghost">取消</button>
                      <button onClick={handleSaveReply} disabled={!replyDraft.content.trim() || savingReply} className="btn-primary text-xs flex items-center gap-1">
                        {savingReply ? <><Loader2 size={14} className="animate-spin" /> 提交中</> : <><Send size={14} /> 提交补充</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* AI 助手 Tab */}
          {activeTab === 'ai' && (
            <CustomerAiChat customerId={id || ''} />
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
