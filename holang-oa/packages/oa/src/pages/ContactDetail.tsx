import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Building2, Briefcase, User, MessageCircle, MapPin, Calendar } from 'lucide-react'
import { getContactById, type Contact } from '../services/contactService'

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    loadContact()
  }, [contactId])

  const loadContact = async () => {
    setLoading(true)
    try {
      const data = await getContactById(contactId!)
      setContact(data)
    } catch {
      setContact(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-24 text-gray-400">加载中...</div>
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium text-gray-500">联系人不存在</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">返回</button>
      </div>
    )
  }

  const genderLabel = contact.gender === 'male' ? '男' : contact.gender === 'female' ? '女' : '-'
  const isPrimary = contact.type === 'PRIMARY'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">联系人详情</h1>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex flex-col items-center text-center py-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 ${contact.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}>
            {(contact.name || '?').charAt(0)}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{contact.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{contact.title}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{contact.position}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {isPrimary && (
              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded font-medium">主要联系人</span>
            )}
            {contact.gender && (
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${contact.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{genderLabel}</span>
            )}
          </div>
          {contact.customer?.companyName && (
            <div className="mt-2 text-sm text-gray-400">{contact.customer.companyName}</div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User size={16} className="text-brand-500" /> 联系方式
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContactInfoItem icon={Phone} label="手机" value={contact.phone} action="tel" actionValue={contact.phone} />
          <ContactInfoItem icon={Mail} label="邮箱" value={contact.email} action="mailto" actionValue={contact.email} />
          {contact.wechat && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                <MessageCircle size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-green-500 mb-0.5">微信</div>
                <div className="text-sm font-medium text-green-800 break-all">{contact.wechat}</div>
              </div>
            </div>
          )}
          {contact.whatsapp && (
            <a
              href={`https://wa.me/${contact.whatsapp.replace(/[\s+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg no-underline hover:bg-emerald-100 transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-600">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-emerald-500 mb-0.5">WhatsApp</div>
                <div className="text-sm font-medium text-emerald-800 break-all">{contact.whatsapp}</div>
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Organization Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-brand-500" /> 组织信息
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard label="部门" value={contact.dept} />
          <InfoCard label="职位" value={contact.title || contact.position} />
          <InfoCard label="是否主联系人" value={isPrimary ? '是' : '否'} />
          <InfoCard label="性别" value={genderLabel} />
        </div>
      </div>

      {/* Remark */}
      {contact.remark && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">备注</h3>
          <p className="text-sm text-gray-600">{contact.remark}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">快捷操作</h3>
        <div className="flex flex-wrap gap-2">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors no-underline">
              <Phone size={14} /> 拨打电话
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors no-underline">
              <Mail size={14} /> 发送邮件
            </a>
          )}
          {contact.wechat && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              onClick={() => navigator.clipboard?.writeText(contact.wechat ?? '')}
              title="点击复制微信号"
            >
              <MessageCircle size={14} /> 复制微信
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactInfoItem({ icon: Icon, label, value, action, actionValue }: {
  icon: any; label: string; value?: string; action?: string; actionValue?: string
}) {
  const content = (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
        <Icon size={16} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-800 break-all">{value || '-'}</div>
      </div>
    </div>
  )
  if (action && actionValue) {
    return (
      <a href={`${action}:${actionValue}`} className="no-underline hover:opacity-80 transition-opacity">
        {content}
      </a>
    )
  }
  return content
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '-'}</span>
    </div>
  )
}
