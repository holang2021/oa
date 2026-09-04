import { useState } from 'react'
import { X, Loader2, Save, Plus } from 'lucide-react'
import { createContact, type Contact } from '../services/contactService'

// 选择框内置"新增联系人"选项的哨兵值
const NEW_SENTINEL = '__NEW_CONTACT__'

interface QuickAddContactSelectProps {
  /** 所属客户 ID，新建联系人时回写 */
  customerId: string
  /** 当前选中的联系人 ID（受控） */
  value: string
  /** 选择变化回调（不含哨兵值） */
  onChange: (id: string) => void
  /** 可选项列表 */
  contacts: Contact[]
  /** 新建成功后回调（父组件负责预置列表 + 自动选中） */
  onContactCreated: (c: Contact) => void
  placeholder?: string
  className?: string
}

/**
 * 带"快速新建联系人"入口的下拉选择器。
 * - 选择「＋ 新增联系人…」不离开当前页面，弹出轻量弹窗快速建联系人。
 * - 保存成功后回调 onContactCreated，由父组件回填列表并自动选中该联系人。
 * - 取消弹窗不影响原选择（哨兵值不会写回 value）。
 */
export default function QuickAddContactSelect({
  customerId,
  value,
  onChange,
  contacts,
  onContactCreated,
  placeholder = '选择联系人（可选）',
  className = '',
}: QuickAddContactSelectProps) {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    position: '',
    dept: '',
    gender: '',
    phone: '',
    email: '',
    wechat: '',
    whatsapp: '',
    remark: '',
    isKeyPerson: false,
  })

  const resetDraft = () =>
    setDraft({
      name: '',
      position: '',
      dept: '',
      gender: '',
      phone: '',
      email: '',
      wechat: '',
      whatsapp: '',
      remark: '',
      isKeyPerson: false,
    })

  const openModal = () => {
    resetDraft()
    setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false)
    setSaving(false)
    resetDraft()
  }

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === NEW_SENTINEL) {
      // 打开弹窗，但不写回 value（保持原选择，避免下拉卡在哨兵项）
      openModal()
      return
    }
    onChange(v)
  }

  const handleSave = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const ct = await createContact(customerId, {
        name: draft.name.trim(),
        position: draft.position.trim() || undefined,
        dept: draft.dept.trim() || undefined,
        gender: draft.gender || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        wechat: draft.wechat.trim() || undefined,
        whatsapp: draft.whatsapp.trim() || undefined,
        remark: draft.remark.trim() || undefined,
        isKeyPerson: draft.isKeyPerson,
      })
      if (ct) {
        onContactCreated(ct)
        closeModal()
      } else {
        alert('创建联系人失败')
      }
    } catch (e: any) {
      alert(e?.message || '创建联系人失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <select
        value={value}
        onChange={handleSelect}
        className={className || 'input text-sm'}
      >
        <option value="">{placeholder}</option>
        <option value={NEW_SENTINEL} className="font-medium text-brand-600">
          ＋ 新增联系人…
        </option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.position ? ` · ${c.position}` : ''}
            {c.phone ? ` (${c.phone})` : ''}
          </option>
        ))}
      </select>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Plus size={16} className="text-brand-600" /> 快速新增联系人
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="姓名 *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">职位</label>
                  <input
                    value={draft.position}
                    onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
                    placeholder="职位"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">部门</label>
                  <input
                    value={draft.dept}
                    onChange={(e) => setDraft((p) => ({ ...p, dept: e.target.value }))}
                    placeholder="部门"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">性别</label>
                <select
                  value={draft.gender}
                  onChange={(e) => setDraft((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">未知</option>
                  <option value="MALE">男</option>
                  <option value="FEMALE">女</option>
                  <option value="UNKNOWN">未知</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">手机</label>
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="手机"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                  <input
                    value={draft.email}
                    onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                    placeholder="邮箱"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">微信</label>
                  <input
                    value={draft.wechat}
                    onChange={(e) => setDraft((p) => ({ ...p, wechat: e.target.value }))}
                    placeholder="微信"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                  <input
                    value={draft.whatsapp}
                    onChange={(e) => setDraft((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="WhatsApp"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <textarea
                  rows={2}
                  value={draft.remark}
                  onChange={(e) => setDraft((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="备注"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isKeyPerson}
                  onChange={(e) => setDraft((p) => ({ ...p, isKeyPerson: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                关键决策人
              </label>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                保存并选择
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
