// ============================================================
// 联系人管理组件（Phase 1: 客户-联系人一对多）
// 一个公司可挂多个联系人：新增 / 编辑 / 设为主联系人 / 标记关键人。
// 联系人独立落库（/contacts），与「客户组织信息」解耦。
// ============================================================
import { useState, useEffect } from 'react'
import { Plus, Pencil, Star, KeyRound, Loader2 } from 'lucide-react'
import { getContacts, createContact, updateContact, Contact } from '../services/contactService'

interface Props {
  customerId: string | null
}

export default function ContactManager({ customerId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Partial<Contact> | null>(null) // null=关闭；{} = 新增
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!customerId) {
      setContacts([])
      return
    }
    setLoading(true)
    try {
      const { list } = await getContacts({ customerId, pageSize: 200 })
      setContacts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const save = async () => {
    if (!customerId || !editing) return
    if (!editing.name || !editing.name.trim()) {
      alert('联系人姓名必填')
      return
    }
    setSaving(true)
    try {
      const payload: Partial<Contact> = {
        name: editing.name,
        position: editing.position || undefined,
        dept: editing.dept || undefined,
        phone: editing.phone || undefined,
        email: editing.email || undefined,
        wechat: editing.wechat || undefined,
        whatsapp: editing.whatsapp || undefined,
        type: editing.type || 'SECONDARY',
        isKeyPerson: editing.isKeyPerson || false,
        remark: editing.remark || undefined,
      }
      const saved = editing.id
        ? await updateContact(editing.id, payload)
        : await createContact(customerId, payload)
      if (!saved) {
        alert('保存失败，请重试')
        return
      }
      setEditing(null)
      await load()
    } catch (e: any) {
      alert('保存失败: ' + (e?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const setPrimary = async (id: string) => {
    const saved = await updateContact(id, { type: 'PRIMARY' })
    if (saved) await load()
  }

  const toggleKey = async (c: Contact) => {
    const saved = await updateContact(c.id, { isKeyPerson: !c.isKeyPerson })
    if (saved) await load()
  }

  // 新建客户尚未保存时，无法关联联系人
  if (!customerId) {
    return (
      <div className="card !p-4 text-sm text-gray-500">
        联系人管理：请先保存客户（创建公司）后，再在此添加多个联系人。
      </div>
    )
  }

  return (
    <div className="card !p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">联系人管理（{contacts.length}）</h3>
        <button
          type="button"
          onClick={() => setEditing({})}
          className="btn-secondary inline-flex items-center gap-1 text-sm"
        >
          <Plus size={14} /> 新增联系人
        </button>
      </div>

      {loading && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> 加载中…
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="text-xs text-gray-400">暂无联系人，点击右上角「新增联系人」。</div>
      )}

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start gap-2 border rounded-lg p-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{c.name}</span>
                {c.type === 'PRIMARY' && (
                  <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">主联系人</span>
                )}
                {c.isKeyPerson && (
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">关键人</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                {c.position && <span>{c.position}</span>}
                {c.dept && <span>· {c.dept}</span>}
                {c.phone && <span>· {c.phone}</span>}
                {c.email && <span>· {c.email}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.type !== 'PRIMARY' && (
                <button
                  type="button"
                  title="设为主联系人"
                  onClick={() => setPrimary(c.id)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                title="关键人"
                onClick={() => toggleKey(c)}
                className={`p-1.5 rounded hover:bg-gray-100 ${c.isKeyPerson ? 'text-amber-500' : 'text-gray-300'}`}
              >
                <KeyRound size={14} />
              </button>
              <button
                type="button"
                title="编辑"
                onClick={() => setEditing({ ...c })}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input text-sm"
              placeholder="姓名 *"
              value={editing.name || ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="职务"
              value={editing.position || ''}
              onChange={(e) => setEditing({ ...editing, position: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="部门"
              value={editing.dept || ''}
              onChange={(e) => setEditing({ ...editing, dept: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="手机"
              value={editing.phone || ''}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="邮箱"
              value={editing.email || ''}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="微信"
              value={editing.wechat || ''}
              onChange={(e) => setEditing({ ...editing, wechat: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={editing.isKeyPerson || false}
              onChange={(e) => setEditing({ ...editing, isKeyPerson: e.target.checked })}
            />
            关键人
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary text-sm" onClick={() => setEditing(null)}>
              取消
            </button>
            <button
              type="button"
              className="btn-primary text-sm inline-flex items-center gap-1"
              disabled={saving}
              onClick={save}
            >
              {saving && <Loader2 size={14} className="animate-spin" />} 保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
