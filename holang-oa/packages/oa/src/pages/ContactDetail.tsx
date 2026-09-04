import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MessageCircle, MessageSquare, Building2, User, Briefcase, Users, Tag, Pencil, X, Save, Loader2 } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getContactById, updateContact, type Contact } from '../services/contactService'
import { getCurrentUser } from '../services/authService'

const genderOptions = [
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
  { value: 'UNKNOWN', label: '未知' },
]

const typeOptions = [
  { value: 'PRIMARY', label: '主要联系人' },
  { value: 'SECONDARY', label: '次要联系人' },
  { value: 'DECISION', label: '决策人' },
  { value: 'TECHNICAL', label: '技术对接人' },
]

function InfoRow({ icon: Icon, label, value, empty = '未填写' }: { icon: any; label: string; value?: string | null; empty?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className={`text-sm ${value ? 'text-gray-800' : 'text-gray-300'}`}>{value || empty}</div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-brand-600" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const currentUser = getCurrentUser()

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<Contact>>({})

  const canEdit = contact && (!contact.createdById || contact.createdById === currentUser?.id)

  useEffect(() => {
    if (!id) return
    loadContact()
  }, [id])

  const loadContact = async () => {
    setLoading(true)
    try {
      const data = await getContactById(id!)
      if (data) {
        setContact(data)
        setDraft({ ...data })
      } else {
        setError('联系人不存在或已被移除')
      }
    } catch (e: any) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contact || !draft.name?.trim()) return
    setSaving(true)
    try {
      const updated = await updateContact(contact.id, {
        ...draft,
        name: draft.name.trim(),
        phone: draft.phone?.trim() || undefined,
        email: draft.email?.trim() || undefined,
        wechat: draft.wechat?.trim() || undefined,
        whatsapp: draft.whatsapp?.trim() || undefined,
        dept: draft.dept?.trim() || undefined,
        position: draft.position?.trim() || undefined,
        title: draft.title?.trim() || undefined,
        remark: draft.remark?.trim() || undefined,
      })
      if (updated) {
        setContact(updated)
        setShowEdit(false)
      }
    } catch (e: any) {
      alert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const initials = (contact?.name || '').slice(0, 1)
  const genderLabel = genderOptions.find(g => g.value === contact?.gender)?.label || contact?.gender || '未知'
  const typeLabel = typeOptions.find(o => o.value === contact?.type)?.label || contact?.type || '联系人'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="mb-2">{error || '联系人不存在'}</div>
        <button onClick={() => navigate(-1)} className="text-brand-600 text-sm hover:underline">返回</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-gray-800">联系人详情</h1>
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              <Pencil size={14} /> 编辑
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-3xl font-semibold flex items-center justify-center mx-auto mb-4">
            {initials}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{contact.name}</h2>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
              {typeLabel}
            </span>
            {contact.isKeyPerson && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">关键决策人</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {contact.customer?.companyName || '未关联客户'}
            {contact.createdBy && (
              <span className="ml-2">· 创建者：{contact.createdBy.name}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="联系方式" icon={Phone}>
            <InfoRow icon={Phone} label="手机" value={contact.phone} />
            <InfoRow icon={Mail} label="邮箱" value={contact.email} />
            <InfoRow icon={MessageCircle} label="微信" value={contact.wechat} />
            <InfoRow icon={MessageSquare} label="WhatsApp" value={contact.whatsapp} />
          </Section>

          <Section title="组织信息" icon={Building2}>
            <InfoRow icon={Briefcase} label="职位" value={contact.position} />
            <InfoRow icon={Users} label="部门" value={contact.dept} />
            <InfoRow icon={User} label="性别" value={genderLabel} />
            <InfoRow icon={Tag} label="称谓" value={contact.title} />
          </Section>
        </div>

        <Section title="备注" icon={MessageSquare}>
          <div className="text-sm text-gray-600 whitespace-pre-line min-h-[3rem]">
            {contact.remark || '暂无备注'}
          </div>
        </Section>

        {/* Edit modal */}
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">编辑联系人</h3>
                <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">姓名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={draft.name || ''}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">职位</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.position || ''}
                      onChange={e => setDraft({ ...draft, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">部门</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.dept || ''}
                      onChange={e => setDraft({ ...draft, dept: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">称谓</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.title || ''}
                      onChange={e => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">性别</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.gender || ''}
                      onChange={e => setDraft({ ...draft, gender: e.target.value || undefined })}
                    >
                      <option value="">未知</option>
                      {genderOptions.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">类型</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={draft.type || 'PRIMARY'}
                    onChange={e => setDraft({ ...draft, type: e.target.value })}
                  >
                    {typeOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">手机</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.phone || ''}
                      onChange={e => setDraft({ ...draft, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.email || ''}
                      onChange={e => setDraft({ ...draft, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">微信</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.wechat || ''}
                      onChange={e => setDraft({ ...draft, wechat: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={draft.whatsapp || ''}
                      onChange={e => setDraft({ ...draft, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">备注</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    value={draft.remark || ''}
                    onChange={e => setDraft({ ...draft, remark: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!draft.isKeyPerson}
                    onChange={e => setDraft({ ...draft, isKeyPerson: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  关键决策人
                </label>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !draft.name?.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
