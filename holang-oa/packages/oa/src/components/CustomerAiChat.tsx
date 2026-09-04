import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Save, UserPlus, FileEdit } from 'lucide-react'
import {
  getCustomerAiHistory,
  sendCustomerAiMessage,
  getCustomerAiSummary,
  extractCustomerAi,
  type AiMessage,
  type ExtractType,
} from '../services/customerAiService'
import { createContact, getContacts, type Contact } from '../services/contactService'
import { createFollowUp } from '../services/followUpService'

interface Props {
  customerId: string
}

const SECTION_LABELS: Record<string, string> = {
  PROFILE: '客户画像',
  DEMAND: '需求变化',
  FOLLOWUP: '跟进状态',
  SUGGEST: '销售建议',
}

const FOLLOWUP_METHODS = ['电话', '微信', '邮件', '拜访', 'WhatsApp', '会议', '其他']

/** 把 AI 摘要按 PROFILE/DEMAND/FOLLOWUP/SUGGEST 分段渲染 */
function InsightBlock({ text }: { text: string }) {
  const parts = text.split(/\n(?=[A-Z]+（)/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    return <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{text}</div>
  }
  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        const m = p.match(/^([A-Z]+)（(.*?)）\s*[:：]?\s*([\s\S]*)$/)
        if (m) {
          return (
            <div key={i}>
              <div className="text-xs font-semibold text-purple-600 mb-0.5">
                {SECTION_LABELS[m[1]] || m[1]} · {m[2]}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{m[3]}</div>
            </div>
          )
        }
        return (
          <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
            {p}
          </div>
        )
      })}
    </div>
  )
}

interface ContactDraft {
  name: string
  position: string
  dept: string
  phone: string
  email: string
  wechat: string
  whatsapp: string
  isKeyPerson: boolean
  remark: string
}

interface FollowupDraft {
  method: string
  content: string
  nextPlan: string
  contactId: string
}

const EMPTY_CONTACT: ContactDraft = {
  name: '',
  position: '',
  dept: '',
  phone: '',
  email: '',
  wechat: '',
  whatsapp: '',
  isKeyPerson: false,
  remark: '',
}

const EMPTY_FOLLOWUP: FollowupDraft = {
  method: '其他',
  content: '',
  nextPlan: '',
  contactId: '',
}

export default function CustomerAiChat({ customerId }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [toast, setToast] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  // 操作权限相关
  const [contacts, setContacts] = useState<Contact[]>([])
  const [modalType, setModalType] = useState<ExtractType | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT)
  const [followupDraft, setFollowupDraft] = useState<FollowupDraft>(EMPTY_FOLLOWUP)

  useEffect(() => {
    let alive = true
    setMessages([])
    setSummary('')
    getCustomerAiHistory(customerId, 50)
      .then((m) => {
        if (alive) setMessages(m)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [customerId])

  // 加载该客户联系人（供跟进关联下拉 + 新建后刷新）
  useEffect(() => {
    let alive = true
    getContacts({ customerId, pageSize: 100 })
      .then((r) => {
        if (alive) setContacts(r.list)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [customerId])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, loading])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setError('')
    const optimistic: AiMessage = {
      id: 'tmp-' + Date.now(),
      role: 'user',
      content: text,
      model: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    setLoading(true)
    try {
      const result = await sendCustomerAiMessage(customerId, text)
      if (result) setMessages(result.messages)
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(e?.message || 'AI 对话失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleSummary() {
    if (summaryLoading) return
    setSummaryLoading(true)
    setError('')
    try {
      const s = await getCustomerAiSummary(customerId)
      setSummary(s)
    } catch (e: any) {
      setError(e?.message || '生成洞察失败')
    } finally {
      setSummaryLoading(false)
    }
  }

  /** 点击工具栏按钮 → 调 AI 抽取 → 打开预览弹窗（仅抽取，不落库） */
  async function handleExtract(type: ExtractType) {
    if (extracting || saving) return
    setError('')
    setExtracting(true)
    try {
      const res = await extractCustomerAi(customerId, type)
      if (!res) throw new Error('AI 抽取失败')
      if (type === 'contact') {
        setContactDraft({
          name: res.data.name || '',
          position: res.data.position || '',
          dept: res.data.dept || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          wechat: res.data.wechat || '',
          whatsapp: res.data.whatsapp || '',
          isKeyPerson: !!res.data.isKeyPerson,
          remark: res.data.remark || '',
        })
      } else {
        setFollowupDraft({
          method: res.data.method || '其他',
          content: res.data.content || '',
          nextPlan: res.data.nextPlan || '',
          contactId: '',
        })
      }
      setModalType(type)
    } catch (e: any) {
      setError(e?.message || 'AI 抽取失败，请稍后重试')
    } finally {
      setExtracting(false)
    }
  }

  function closeModal() {
    setModalType(null)
    setSaving(false)
    setContactDraft(EMPTY_CONTACT)
    setFollowupDraft(EMPTY_FOLLOWUP)
  }

  /** 确认写入联系人（落库走既有 createContact） */
  async function handleConfirmContact() {
    if (!contactDraft.name.trim() || saving) return
    setSaving(true)
    try {
      const ct = await createContact(customerId, {
        name: contactDraft.name.trim(),
        position: contactDraft.position.trim() || undefined,
        dept: contactDraft.dept.trim() || undefined,
        phone: contactDraft.phone.trim() || undefined,
        email: contactDraft.email.trim() || undefined,
        wechat: contactDraft.wechat.trim() || undefined,
        whatsapp: contactDraft.whatsapp.trim() || undefined,
        isKeyPerson: contactDraft.isKeyPerson,
        remark: contactDraft.remark.trim() || undefined,
      })
      if (ct) {
        setContacts((prev) => [ct, ...prev])
        closeModal()
        showToast('✅ 联系人已创建')
      } else {
        setError('创建联系人失败')
      }
    } catch (e: any) {
      setError(e?.message || '创建联系人失败')
    } finally {
      setSaving(false)
    }
  }

  /** 确认写入跟进（落库走既有 createFollowUp） */
  async function handleConfirmFollowup() {
    if (!followupDraft.content.trim() || saving) return
    setSaving(true)
    try {
      const f = await createFollowUp({
        customerId,
        method: followupDraft.method,
        content: followupDraft.content.trim(),
        nextPlan: followupDraft.nextPlan.trim() || undefined,
        contactId: followupDraft.contactId || undefined,
      })
      if (f) {
        closeModal()
        showToast('✅ 跟进已写入')
      } else {
        setError('写入跟进失败')
      }
    } catch (e: any) {
      setError(e?.message || '写入跟进失败')
    } finally {
      setSaving(false)
    }
  }

  const inputBase =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* 左：客户洞察卡片 */}
      <div className="card p-4 self-start">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <span>🧠</span> 客户洞察
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">AI 自动汇总</span>
          </h3>
        </div>
        {summary ? (
          <InsightBlock text={summary} />
        ) : (
          <div className="text-sm text-gray-400 leading-relaxed">
            点击「生成洞察」让 AI 基于该客户的档案、跟进、联系人与商机，自动汇总画像 / 需求变化 / 跟进状态与销售建议。
          </div>
        )}
        <button className="btn btn-secondary mt-3 text-xs" onClick={handleSummary} disabled={summaryLoading}>
          {summaryLoading ? '生成中…' : summary ? '↻ 重新生成洞察' : '生成洞察'}
        </button>
        <div className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          洞察基于：客户档案 + 近期跟进 + 联系人 + 商机，每次对话实时刷新上下文。
        </div>
      </div>

      {/* 右：对话区 */}
      <div className="card p-0 flex flex-col" style={{ height: '60vh', minHeight: 420 }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium">💬 与 AI 销售顾问对话</span>
          <span className="text-[11px] text-gray-400">多轮 · 历史云端留存</span>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-sm text-gray-400 text-center py-10">
              开始和 AI 顾问对话吧：例如「总结这个客户」「下一步怎么推进」「帮我起草一封回访话术」。
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 ${
                  m.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                }`}
              >
                {m.role === 'user' ? '我' : 'AI'}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-50 text-gray-800 rounded-tr-sm'
                    : 'bg-purple-50 text-gray-800 rounded-tl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs bg-purple-500">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-purple-50 px-3.5 py-2.5 text-sm text-purple-500">
                AI 正在输入…
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="px-4 py-2 text-xs text-emerald-600 bg-emerald-50 border-t border-emerald-100 font-medium">
            {toast}
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-xs text-red-500 bg-red-50 border-t border-red-100">{error}</div>
        )}

        {/* 操作工具栏：从对话生成联系人 / 跟进（AI 仅抽取，写入前需确认） */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 flex-wrap bg-gray-50/40">
          <span className="text-[11px] text-gray-500">从对话生成：</span>
          <button
            onClick={() => handleExtract('contact')}
            disabled={extracting}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
          >
            {extracting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            新建联系人
          </button>
          <button
            onClick={() => handleExtract('followup')}
            disabled={extracting}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
          >
            {extracting ? <Loader2 size={13} className="animate-spin" /> : <FileEdit size={13} />}
            写跟进
          </button>
          <span className="text-[11px] text-gray-400 ml-auto">继承客户查看权限 · 写入前需确认</span>
        </div>

        <div className="border-t border-gray-100 p-3 flex gap-2">
          <textarea
            className="input flex-1 resize-none"
            style={{ height: 44 }}
            placeholder="问 AI：总结客户 / 下一步建议 / 起草话术…（Enter 发送，Shift+Enter 换行）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button className="btn btn-primary px-5" onClick={handleSend} disabled={loading || !input.trim()}>
            发送
          </button>
        </div>
      </div>

      {/* ===== 联系人预览弹窗 ===== */}
      {modalType === 'contact' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <UserPlus size={16} className="text-purple-600" /> 新建联系人（AI 草稿预览）
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-[11px] text-gray-400 -mt-1">
                以下由 AI 从本次对话抽取，请核对后再确认写入。
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={contactDraft.name}
                  onChange={(e) => setContactDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="姓名 *"
                  className={inputBase}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">职位</label>
                  <input
                    value={contactDraft.position}
                    onChange={(e) => setContactDraft((p) => ({ ...p, position: e.target.value }))}
                    placeholder="职位"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">部门</label>
                  <input
                    value={contactDraft.dept}
                    onChange={(e) => setContactDraft((p) => ({ ...p, dept: e.target.value }))}
                    placeholder="部门"
                    className={inputBase}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">手机</label>
                  <input
                    value={contactDraft.phone}
                    onChange={(e) => setContactDraft((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="手机"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                  <input
                    value={contactDraft.email}
                    onChange={(e) => setContactDraft((p) => ({ ...p, email: e.target.value }))}
                    placeholder="邮箱"
                    className={inputBase}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">微信</label>
                  <input
                    value={contactDraft.wechat}
                    onChange={(e) => setContactDraft((p) => ({ ...p, wechat: e.target.value }))}
                    placeholder="微信"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                  <input
                    value={contactDraft.whatsapp}
                    onChange={(e) => setContactDraft((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="WhatsApp"
                    className={inputBase}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <textarea
                  rows={2}
                  value={contactDraft.remark}
                  onChange={(e) => setContactDraft((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="备注"
                  className={`${inputBase} resize-none`}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactDraft.isKeyPerson}
                  onChange={(e) => setContactDraft((p) => ({ ...p, isKeyPerson: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                关键决策人
              </label>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button
                onClick={handleConfirmContact}
                disabled={saving || !contactDraft.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                确认写入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 跟进预览弹窗 ===== */}
      {modalType === 'followup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileEdit size={16} className="text-purple-600" /> 写跟进（AI 草稿预览）
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-[11px] text-gray-400 -mt-1">
                以下由 AI 从本次对话抽取，请核对后再确认写入。
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">跟进方式</label>
                  <select
                    value={followupDraft.method}
                    onChange={(e) => setFollowupDraft((p) => ({ ...p, method: e.target.value }))}
                    className={inputBase}
                  >
                    {FOLLOWUP_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">关联联系人</label>
                  <select
                    value={followupDraft.contactId}
                    onChange={(e) => setFollowupDraft((p) => ({ ...p, contactId: e.target.value }))}
                    className={inputBase}
                  >
                    <option value="">不关联</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.position ? ` · ${c.position}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  跟进内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  value={followupDraft.content}
                  onChange={(e) => setFollowupDraft((p) => ({ ...p, content: e.target.value }))}
                  placeholder="跟进内容 *"
                  className={`${inputBase} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">下一步计划</label>
                <textarea
                  rows={2}
                  value={followupDraft.nextPlan}
                  onChange={(e) => setFollowupDraft((p) => ({ ...p, nextPlan: e.target.value }))}
                  placeholder="下一步计划"
                  className={`${inputBase} resize-none`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button
                onClick={handleConfirmFollowup}
                disabled={saving || !followupDraft.content.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                确认写入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
