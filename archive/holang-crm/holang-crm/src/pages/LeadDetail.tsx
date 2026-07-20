import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Phone, Mail, Edit2 } from 'lucide-react'
import { leads, type Lead } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { t } = useI18n()

  const lead = leads.find(l => l.id === id)

  if (!lead) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>线索不存在</p>
        <button onClick={() => nav('/domestic/leads')} className="btn-ghost mt-4">返回公海池</button>
      </div>
    )
  }

  const handleClaim = () => {
    const idx = leads.findIndex(l => l.id === id)
    if (idx === -1) return
    leads[idx].assignedTo = '刘世光'
    leads[idx].assignedAt = new Date().toISOString().slice(0, 10)
    leads[idx].status = '跟进中'
    leads[idx].lastFollowAt = new Date().toISOString().slice(0, 10)
    nav('/domestic/leads')
  }

  const getStatusColor = (status: string) => {
    if (status === '未联系') return 'bg-gray-100 text-gray-700'
    if (status === '跟进中') return 'bg-blue-100 text-blue-700'
    if (status === '转客户') return 'bg-green-100 text-green-700'
    if (status === '无效') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => nav('/domestic/leads')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{lead.contactName}</h1>
          <p className="text-sm text-gray-500">{lead.customerName || '（未提供公司名称）'}</p>
        </div>
        <div className="flex gap-2">
          {!lead.assignedTo && (
            <button onClick={handleClaim} className="btn-primary flex items-center gap-2">
              <UserPlus size={16} /> 认领线索
            </button>
          )}
          <button className="btn-ghost flex items-center gap-2">
            <Edit2 size={16} /> 编辑
          </button>
        </div>
      </div>

      {/* Status + Region */}
      <div className="card flex gap-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(lead.status)}`}>{lead.status}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${lead.region === '国内' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{lead.region}</span>
        {lead.source && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{lead.source}</span>}
      </div>

      {/* Contact Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">联系信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">联系人</p>
            <p className="font-medium">{lead.contactName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">公司名称</p>
            <p className="font-medium">{lead.customerName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">手机号</p>
            <p className="font-mono">{lead.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">邮箱</p>
            <p className="font-mono text-xs">{lead.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">微信号</p>
            <p className="font-mono text-xs">{lead.wechat || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">所属行业</p>
            <p>{lead.industry || '-'}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn-ghost flex items-center gap-2 text-sm">
              <Phone size={14} /> 拨打电话
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="btn-ghost flex items-center gap-2 text-sm">
              <Mail size={14} /> 发送邮件
            </a>
          )}
        </div>
      </div>

      {/* Follow-up Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">跟进信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">线索编号</p>
            <p className="font-mono text-xs">{lead.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">录入日期</p>
            <p>{lead.createdAt || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">分配/领取日期</p>
            <p>{lead.assignedAt || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">最新跟进日期</p>
            <p>{lead.lastFollowAt || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">下次跟进日期</p>
            <p>{lead.nextFollowAt || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">跟进是否超时</p>
            <p className={lead.followOverdue ? 'text-red-600' : 'text-green-600'}>{lead.followOverdue ? '已超时' : '未超时'}</p>
          </div>
        </div>
      </div>

      {/* Remark */}
      {lead.remark && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">备注</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.remark}</p>
        </div>
      )}

      {/* Invalid Reason */}
      {lead.status === '无效' && lead.invalidReason && (
        <div className="card border-red-200 bg-red-50">
          <h3 className="text-sm font-semibold text-red-700 mb-3">无效原因</h3>
          <p className="text-sm text-red-600">{lead.invalidReason}</p>
        </div>
      )}
    </div>
  )
}
