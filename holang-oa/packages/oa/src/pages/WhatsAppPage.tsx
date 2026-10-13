import { useState } from 'react'
import {
  Search, Phone, MoreVertical, Send, Paperclip, Smile, Check, CheckCheck,
  QrCode, Shield, ExternalLink, Copy, ChevronDown, ChevronRight,
  Wifi, WifiOff, Clock, User, Users, Plus, MessageCircle, Globe,
  Eye, Reply, MessageSquare, DollarSign, FileText, Target, Zap,
  Building2, Mail, MapPin, Tag, BarChart3, ArrowLeft, UserCheck
} from 'lucide-react'

// ─── Types ────────────────────────────────────────

interface WhatsAppContact {
  id: string
  customerId?: string
  name: string
  phone: string
  country: string
  avatar: string
  lastMessage: string
  lastTime: string
  unread: number
  status: 'online' | 'offline' | 'typing'
  isBusiness: boolean
  assignedTo: string
  tags: string[]
}

interface WhatsAppMessage {
  id: string
  sender: 'me' | 'them'
  text: string
  time: string
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'image' | 'document' | 'quotation'
  fileName?: string
  senderName?: string // proxy reply shows who actually sent
}

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
}

interface CustomerInfo {
  name: string
  industry: string
  country: string
  level: string
  contactPerson: string
  email: string
  phone: string
  assignedSales: string
  followStage: string
  opportunities: { id: string; name: string; amount: number; stage: string }[]
  quotations: { id: string; code: string; amount: number; date: string }[]
}

// ─── Mock Data ────────────────────────────────────

const EMPLOYEES = [
  { id: 'sales1', name: '刘世光', role: '销售总监' },
  { id: 'sales2', name: '李销售', role: '外贸经理' },
  { id: 'sales3', name: '庞博', role: '销售经理' },
  { id: 'sales4', name: '王外贸', role: '外贸专员' },
]

const MOCK_CONTACTS: WhatsAppContact[] = [
  { id: 'wa1', customerId: '1', name: 'Ahmed Hassan', phone: '+20 100 123 4567', country: '埃及', avatar: 'AH', lastMessage: 'Please send the quotation for NPL10B', lastTime: '10:32', unread: 2, status: 'online', isBusiness: true, assignedTo: '李销售', tags: ['氮气', '报价中'] },
  { id: 'wa2', customerId: '2', name: 'Maria Silva', phone: '+55 11 98765 4321', country: '巴西', avatar: 'MS', lastMessage: 'OK, I will check with my team', lastTime: '09:15', unread: 0, status: 'offline', isBusiness: true, assignedTo: '王外贸', tags: ['氧气', '方案确认'] },
  { id: 'wa3', customerId: '3', name: 'Raj Patel', phone: '+91 98765 43210', country: '印度', avatar: 'RP', lastMessage: 'When can you deliver?', lastTime: '昨天', unread: 1, status: 'offline', isBusiness: false, assignedTo: '李销售', tags: ['氢气', '交期确认'] },
  { id: 'wa4', customerId: '4', name: 'John Smith', phone: '+1 212 555 0199', country: '美国', avatar: 'JS', lastMessage: 'The payment has been processed', lastTime: '昨天', unread: 0, status: 'offline', isBusiness: true, assignedTo: '李销售', tags: ['氮气', '已成交'] },
  { id: 'wa5', customerId: '5', name: 'Kim Min-ji', phone: '+82 10 1234 5678', country: '韩国', avatar: 'KM', lastMessage: '我们需要更多技术参数', lastTime: '周一', unread: 0, status: 'offline', isBusiness: false, assignedTo: '王外贸', tags: ['制氧机', '技术沟通'] },
  { id: 'wa6', customerId: '6', name: 'Carlos Mendoza', phone: '+52 1 55 1234 5678', country: '墨西哥', avatar: 'CM', lastMessage: 'Gracias, voy a revisar la cotizacion', lastTime: '周一', unread: 0, status: 'offline', isBusiness: true, assignedTo: '王外贸', tags: ['氮气', '报价已发'] },
  { id: 'wa7', customerId: '7', name: 'Fatima Al-Rashid', phone: '+971 50 123 4567', country: '阿联酋', avatar: 'FA', lastMessage: 'Can you provide CE certification?', lastTime: '06/20', unread: 0, status: 'offline', isBusiness: true, assignedTo: '李销售', tags: ['氢气', '资质确认'] },
  { id: 'wa8', customerId: '8', name: 'Nguyen Van Minh', phone: '+84 90 123 4567', country: '越南', avatar: 'NV', lastMessage: 'Bao gia nay co the giam duoc khong?', lastTime: '06/19', unread: 0, status: 'offline', isBusiness: false, assignedTo: '王外贸', tags: ['氮气', '价格谈判'] },
]

const MOCK_MESSAGES: Record<string, WhatsAppMessage[]> = {
  'wa1': [
    { id: 'm1', sender: 'them', text: 'Hello, this is Ahmed from Cairo Oxygen Systems. We are interested in your NPL10B nitrogen generator.', time: '09:45', status: 'read', type: 'text' },
    { id: 'm2', sender: 'me', text: 'Hello Ahmed! Thank you for your interest. The NPL10B is our best-selling model with 40.3 m³/h flow rate and 99.99% purity.', time: '09:48', status: 'read', type: 'text' },
    { id: 'm3', sender: 'them', text: 'That sounds good. We need 3 units for our new factory. Can you send me the technical specifications?', time: '09:52', status: 'read', type: 'text' },
    { id: 'm4', sender: 'me', text: 'Of course, I am sending the datasheet now.', time: '09:55', status: 'read', type: 'text' },
    { id: 'm5', sender: 'me', text: 'NPL10B_Datasheet_2026.pdf', time: '09:56', status: 'read', type: 'document', fileName: 'NPL10B_Datasheet_2026.pdf' },
    { id: 'm6', sender: 'them', text: 'Received. The specifications look excellent. What is the delivery time?', time: '10:15', status: 'read', type: 'text' },
    { id: 'm7', sender: 'me', text: 'Standard delivery is 8-10 weeks. For 3 units we can expedite to 6-8 weeks with priority production.', time: '10:20', status: 'read', type: 'text' },
    { id: 'm8', sender: 'them', text: 'Please send the quotation for NPL10B, 3 units, with the 6-8 week delivery option.', time: '10:30', status: 'read', type: 'text' },
    { id: 'm9', sender: 'me', text: 'I will prepare the quotation and send it within today. Let me know if you need any customization options.', time: '10:32', status: 'delivered', type: 'text' },
  ],
  'wa2': [
    { id: 'm1', sender: 'them', text: 'Hi, I am Maria from Sao Paulo Industrial Gases. We need an oxygen generator.', time: '08:30', status: 'read', type: 'text' },
    { id: 'm2', sender: 'me', text: 'Hello Maria! We have the OPL05 oxygen generator, 5 m³/h with 93%±3% purity.', time: '08:35', status: 'read', type: 'text' },
    { id: 'm3', sender: 'them', text: 'Yes, that sounds right. We need 2 units. Can you send a quotation?', time: '08:40', status: 'read', type: 'text' },
    { id: 'm4', sender: 'me', text: 'Sure, I will prepare it. Do you need the 220V or 380V version?', time: '08:45', status: 'read', type: 'text' },
    { id: 'm5', sender: 'them', text: '380V, three-phase. Brazil standard.', time: '08:50', status: 'read', type: 'text' },
    { id: 'm6', sender: 'me', text: 'Got it. Quotation will be ready by this afternoon.', time: '09:00', status: 'read', type: 'text' },
    { id: 'm7', sender: 'them', text: 'OK, I will check with my team', time: '09:15', status: 'read', type: 'text' },
  ],
}

const QUICK_REPLIES: QuickReply[] = [
  { id: 'qr1', title: '产品介绍', content: 'Hello! Thank you for your interest in HOLANG gas generators. We specialize in nitrogen, oxygen, and hydrogen generation systems for industrial applications. Our products feature high purity, low energy consumption, and CE certification.', category: '开场' },
  { id: 'qr2', title: '询价回复', content: 'Thank you for your inquiry. I will prepare a detailed quotation for you. Could you please confirm the following: 1) Required flow rate 2) Purity level 3) Quantity 4) Voltage/frequency requirements?', category: '询价' },
  { id: 'qr3', title: '发货时间', content: 'Our standard delivery time is 8-10 weeks from order confirmation. Express production (6-8 weeks) is available for urgent orders with a small surcharge. Shipping time depends on the destination port.', category: '交付' },
  { id: 'qr4', title: '付款方式', content: 'Our standard payment terms: 30% deposit with order, 60% before shipment, 10% upon installation and acceptance. We accept TT (bank transfer) and L/C (letter of credit).', category: '付款' },
  { id: 'qr5', title: '售后服务', content: 'All HOLANG products come with a 12-month warranty. We provide remote technical support, and on-site installation and commissioning can be arranged (additional cost). Spare parts are available for quick delivery.', category: '售后' },
  { id: 'qr6', title: '认证资质', content: 'Our products are CE certified and comply with ISO 9001:2015 quality management standards. We can provide certification documents upon request. Custom certifications (ASME, etc.) are available for specific markets.', category: '资质' },
  { id: 'qr7', title: '发送报价单', content: 'Please find our quotation attached. The price is valid for 30 days. If you have any questions about the pricing or specifications, please do not hesitate to contact me.', category: '报价' },
  { id: 'qr8', title: '跟进提醒', content: 'Hi, I am following up on our previous conversation regarding the gas generator. Have you had a chance to review the quotation? I am happy to answer any questions you may have.', category: '跟进' },
]

// Customer CRM data mapped by contact ID
const CUSTOMER_DATA: Record<string, CustomerInfo> = {
  'wa1': {
    name: 'Cairo Oxygen Systems', industry: 'Industrial Gas', country: '埃及', level: 'A',
    contactPerson: 'Ahmed Hassan', email: 'ahmed@cairooxygen.com', phone: '+20 100 123 4567',
    assignedSales: '李销售', followStage: '报价',
    opportunities: [
      { id: 'opp101', name: 'NPL10B 氮气发生器 ×3', amount: 465000, stage: '方案报价' },
      { id: 'opp102', name: '压缩机备件采购', amount: 52000, stage: '初步接洽' },
    ],
    quotations: [
      { id: 'q201', code: 'HQ20260615001', amount: 465000, date: '2026-06-15' },
    ],
  },
  'wa2': {
    name: 'Sao Paulo Industrial Gases Ltda', industry: 'Gas Distribution', country: '巴西', level: 'B',
    contactPerson: 'Maria Silva', email: 'maria@spgases.com.br', phone: '+55 11 98765 4321',
    assignedSales: '王外贸', followStage: '方案确认',
    opportunities: [
      { id: 'opp201', name: 'OPL05 制氧机 ×2', amount: 136000, stage: '需求确认' },
    ],
    quotations: [
      { id: 'q301', code: 'HQ20260618001', amount: 136000, date: '2026-06-18' },
    ],
  },
}

const TAG_COLORS: Record<string, string> = {
  '报价中': 'bg-yellow-50 text-yellow-700', '方案确认': 'bg-blue-50 text-blue-700',
  '交期确认': 'bg-orange-50 text-orange-700', '已成交': 'bg-green-50 text-green-700',
  '技术沟通': 'bg-brand-50 text-brand-700', '报价已发': 'bg-blue-50 text-blue-700',
  '资质确认': 'bg-indigo-50 text-indigo-700', '价格谈判': 'bg-red-50 text-red-700',
  '氮气': 'bg-gray-50 text-gray-600', '氧气': 'bg-blue-50 text-blue-600',
  '氢气': 'bg-emerald-50 text-emerald-600', '制氧机': 'bg-emerald-50 text-emerald-600',
}

const STAGE_COLORS: Record<string, string> = {
  '初步接洽': 'bg-blue-50 text-blue-700', '需求确认': 'bg-indigo-50 text-indigo-700',
  '方案报价': 'bg-yellow-50 text-yellow-700', '商务谈判': 'bg-orange-50 text-orange-700',
  '赢单': 'bg-green-50 text-green-700', '输单': 'bg-red-50 text-red-700',
}

// ─── Component ────────────────────────────────────

export default function WhatsAppPage() {
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [connectionStatus] = useState<'connected' | 'disconnected'>('connected')
  const [showDetail, setShowDetail] = useState(true)
  const [proxyMode, setProxyMode] = useState(false) // 代回复模式
  const [selectedEmployee, setSelectedEmployee] = useState<string>('sales1') // 当前视角
  const [showQuickReplies, setShowQuickReplies] = useState(false)

  const isManagerView = selectedEmployee !== 'sales1' && selectedEmployee !== 'sales2' && selectedEmployee !== 'sales3' && selectedEmployee !== 'sales4'
    ? false : selectedEmployee === 'sales1' // 刘总是管理者视角

  const effectiveProxy = proxyMode || (isManagerView && selectedContact !== null && selectedContact !== 'self')

  const filteredContacts = MOCK_CONTACTS.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.phone.includes(searchQuery) && !c.tags.some(t => t.includes(searchQuery))) return false
    return true
  })

  const activeContact = selectedContact ? MOCK_CONTACTS.find(c => c.id === selectedContact) : null
  const messages = selectedContact ? (MOCK_MESSAGES[selectedContact] || []) : []
  const customerInfo = activeContact?.customerId && CUSTOMER_DATA[activeContact.id] ? CUSTOMER_DATA[activeContact.id] : null

  const getViewedEmployee = () => EMPLOYEES.find(e => e.id === selectedEmployee) || EMPLOYEES[0]

  const handleSend = () => {
    if (!newMessage.trim() || !selectedContact) return
    const newMsg: WhatsAppMessage = {
      id: `m${Date.now()}`,
      sender: 'me',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
      senderName: effectiveProxy ? getViewedEmployee().name : undefined,
    }
    if (MOCK_MESSAGES[selectedContact]) MOCK_MESSAGES[selectedContact].push(newMsg)
    else MOCK_MESSAGES[selectedContact] = [newMsg]
    setNewMessage('')
  }

  const handleQuickReply = (reply: QuickReply) => {
    setNewMessage(reply.content)
    setShowQuickReplies(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check size={12} className="text-gray-400" />
      case 'delivered': return <CheckCheck size={12} className="text-gray-400" />
      case 'read': return <CheckCheck size={12} className="text-blue-500" />
      default: return null
    }
  }

  const fmtMoney = (v: number) => '¥' + v.toLocaleString()

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 lg:-m-6">
      {/* ── Top Bar ── */}
      <div className={`px-4 py-2 flex items-center justify-between shrink-0 border-b ${connectionStatus === 'connected' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <>
                <div className="relative">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <div className="text-xs font-medium text-green-800">WhatsApp Business</div>
                  <div className="text-[10px] text-green-600">已连接 · +86 138****6789</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><WifiOff size={16} className="text-amber-600" /></div>
                <div>
                  <div className="text-xs font-medium text-amber-800">WhatsApp Business 未连接</div>
                  <div className="text-[10px] text-amber-600">扫码登录以同步聊天记录</div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Employee View Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">查看视角：</span>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {EMPLOYEES.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role}) {emp.id === 'sales1' ? '· 全部' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Proxy Reply Toggle */}
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer hover:bg-white/50 transition-colors">
            <input type="checkbox" checked={proxyMode} onChange={e => setProxyMode(e.target.checked)} className="w-3.5 h-3.5 rounded" />
            <span className="text-gray-600">代回复模式</span>
          </label>
          <button onClick={() => setShowSetup(!showSetup)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
            <QrCode size={14} /> 设置
          </button>
        </div>
      </div>

      {/* ── Setup Panel ── */}
      {showSetup && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">WhatsApp Business API 连接设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SetupStep num={1} title="注册 Meta Business" desc="前往 Meta Business Suite 创建或关联您的 Facebook 商业账户" link="https://business.facebook.com/" linkText="Meta Business Suite" />
              <SetupStep num={2} title="创建 WABA" desc="在 Meta 开发者平台创建 WhatsApp Business Account，验证电话号码" link="https://developers.facebook.com/docs/whatsapp/cloud-api" linkText="开发者文档" />
              <SetupStep num={3} title="扫码登录" desc="使用 WhatsApp Business App 扫描二维码完成设备授权" qr>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="w-24 h-24 bg-gray-100 rounded mx-auto flex items-center justify-center"><QrCode size={48} className="text-gray-300" /></div>
                </div>
              </SetupStep>
            </div>
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <Shield size={14} /> 所有聊天记录加密存储于云端。连接成功后自动同步历史消息。
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content: Three Columns ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Contact List */}
        <div className={`w-72 border-r border-gray-200 flex flex-col shrink-0 ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input className="w-full pl-9 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="搜索联系人..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {/* Filter Tags */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-gray-50">
            {['全部', '报价中', '技术沟通', '价格谈判', '已成交'].map(tag => (
              <button key={tag} className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${tag === '全部' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{tag}</button>
            ))}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map(contact => (
              <div key={contact.id} onClick={() => setSelectedContact(contact.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 ${selectedContact === contact.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : 'hover:bg-gray-50'}`}>
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${contact.isBusiness ? 'bg-emerald-500' : 'bg-gray-400'}`}>{contact.avatar}</div>
                  {contact.status === 'online' && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
                      {contact.isBusiness && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-500 shrink-0"><title>Business</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{contact.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-500 truncate pr-2">{contact.lastMessage}</span>
                    {contact.unread > 0 && <span className="w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium shrink-0">{contact.unread}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {contact.tags.map(tag => (
                      <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TAG_COLORS[tag] || 'bg-gray-50 text-gray-500'}`}>{tag}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">负责人: {contact.assignedTo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Chat Window */}
        {selectedContact ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button className="lg:hidden p-1" onClick={() => setSelectedContact(null)}>
                  <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${activeContact?.isBusiness ? 'bg-emerald-500' : 'bg-gray-400'}`}>{activeContact?.avatar}</div>
                  {activeContact?.status === 'online' && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900">{activeContact?.name}</span>
                    {activeContact?.isBusiness && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">{activeContact?.status === 'online' ? '在线' : activeContact?.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {effectiveProxy && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-medium">
                    <Eye size={10} /> 代{getViewedEmployee().name}回复
                  </span>
                )}
                <button onClick={() => setShowDetail(!showDetail)} className={`p-2 rounded-lg transition-colors ${showDetail ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-100 text-gray-400'}`} title="客户详情">
                  <User size={16} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><Phone size={16} /></button>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><MoreVertical size={16} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#efeae2]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%]`}>
                    {msg.senderName && (
                      <div className={`text-[9px] text-amber-600 mb-0.5 ${msg.sender === 'me' ? 'text-right' : ''}`}>
                        {msg.senderName} 代回复
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-lg text-sm ${msg.sender === 'me' ? 'bg-[#d9fdd3] text-gray-800 rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'} shadow-sm`}>
                      {msg.type === 'text' && <p className="leading-relaxed">{msg.text}</p>}
                      {msg.type === 'document' && (
                        <div className="flex items-center gap-2">
                          <Paperclip size={14} className="text-gray-400" /> <span className="text-sm text-brand-600 underline">{msg.fileName}</span>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">{msg.time}</span>
                      {msg.sender === 'me' && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Replies Panel */}
            {showQuickReplies && (
              <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">快捷回复</span>
                  <button onClick={() => setShowQuickReplies(false)} className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
                </div>
                <div className="space-y-1.5">
                  {QUICK_REPLIES.map(qr => (
                    <button key={qr.id} onClick={() => handleQuickReply(qr)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{qr.title}</span>
                        <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{qr.category}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{qr.content}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <button onClick={() => setShowQuickReplies(!showQuickReplies)} className={`p-2 rounded-lg shrink-0 transition-colors ${showQuickReplies ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-100 text-gray-400'}`} title="快捷回复">
                <Zap size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><Paperclip size={18} /></button>
              <div className="flex-1 relative">
                <input className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 pr-10" placeholder="输入消息..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"><Smile size={16} /></button>
              </div>
              <button onClick={handleSend} disabled={!newMessage.trim()} className={`p-2.5 rounded-full shrink-0 transition-colors ${newMessage.trim() ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-gray-300'}`}><Send size={16} /></button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="hidden lg:flex flex-1 items-center justify-center bg-[#efeae2]">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <h3 className="text-base font-medium text-gray-500 mb-1">WhatsApp Business</h3>
              <p className="text-sm text-gray-400">选择一个联系人或扫码连接 WhatsApp</p>
            </div>
          </div>
        )}

        {/* Column 3: Customer Detail Panel */}
        {selectedContact && customerInfo && showDetail && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto hidden xl:flex">
            {/* Customer Header */}
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">客户详情</h3>
                <button onClick={() => setShowDetail(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><ChevronRight size={16} /></button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Building2 size={18} className="text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{customerInfo.name}</div>
                  <div className="text-[11px] text-gray-400">{customerInfo.industry} · {customerInfo.country}</div>
                </div>
              </div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${customerInfo.level === 'A' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{customerInfo.level}级客户</span>
            </div>

            {/* Contact Info */}
            <div className="px-4 py-3 border-b border-gray-50">
              <h4 className="text-xs font-medium text-gray-500 mb-2">联系人</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><User size={12} className="text-gray-300" /><span className="text-gray-600">{customerInfo.contactPerson}</span></div>
                <div className="flex items-center gap-2"><Phone size={12} className="text-gray-300" /><span className="text-gray-600">{customerInfo.phone}</span></div>
                <div className="flex items-center gap-2"><Mail size={12} className="text-gray-300" /><span className="text-gray-600">{customerInfo.email}</span></div>
                <div className="flex items-center gap-2"><UserCheck size={12} className="text-gray-300" /><span className="text-gray-600">负责人: {customerInfo.assignedSales}</span></div>
                <div className="flex items-center gap-2"><Tag size={12} className="text-gray-300" /><span className="text-gray-600">阶段: {customerInfo.followStage}</span></div>
              </div>
            </div>

            {/* Opportunities */}
            <div className="px-4 py-3 border-b border-gray-50">
              <h4 className="text-xs font-medium text-gray-500 mb-2">关联商机</h4>
              {customerInfo.opportunities.map(opp => (
                <div key={opp.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{opp.name}</div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${STAGE_COLORS[opp.stage] || 'bg-gray-50 text-gray-500'}`}>{opp.stage}</span>
                  </div>
                  <span className="text-xs font-semibold text-brand-600 ml-2 shrink-0">{fmtMoney(opp.amount)}</span>
                </div>
              ))}
            </div>

            {/* Quotations */}
            {customerInfo.quotations.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-50">
                <h4 className="text-xs font-medium text-gray-500 mb-2">最近报价</h4>
                {customerInfo.quotations.map(q => (
                  <div key={q.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-gray-300" />
                      <div>
                        <div className="text-xs font-medium text-gray-700">{q.code}</div>
                        <div className="text-[10px] text-gray-400">{q.date}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-brand-600">{fmtMoney(q.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-gray-500 mb-2">快捷操作</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors">
                  <FileText size={12} /> 新建报价
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                  <Target size={12} /> 创建商机
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors">
                  <MessageSquare size={12} /> 添加备注
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                  <DollarSign size={12} /> 记录回款
                </button>
              </div>
            </div>

            {/* History */}
            <div className="px-4 py-3 border-t border-gray-50">
              <h4 className="text-xs font-medium text-gray-500 mb-2">最近动态</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <span className="text-gray-600">发送报价单 HQ20260615001</span>
                    <span className="text-gray-400 ml-2">06-15</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <span className="text-gray-600">视频会议讨论技术方案</span>
                    <span className="text-gray-400 ml-2">06-12</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <span className="text-gray-600">WhatsApp 首次联系</span>
                    <span className="text-gray-400 ml-2">06-08</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper Components ────────────────────────────

function SetupStep({ num, title, desc, link, linkText, qr, children }: {
  num: number; title: string; desc: string; link?: string; linkText?: string; qr?: boolean; children?: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center mb-3">
        <span className="text-brand-700 text-xs font-bold">{num}</span>
      </div>
      <h4 className="text-sm font-medium text-gray-800 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 mb-3">{desc}</p>
      {link && linkText && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline">
          {linkText} <ExternalLink size={10} />
        </a>
      )}
      {qr && children}
    </div>
  )
}
