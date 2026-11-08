// ============================================================
// ERP·财务 → 资金账户
// 刘总 2026-11-08 指定：收款账户资料建在这里，不放「系统设置 → 币种与汇率」。
// 原页面是 GenericListPage + comingSoon 占位（"功能开发中"），本页替换为真实可维护页面。
//
// 刘总 2026-11-08 第二轮截图意见（本版落地）：
//  1) 外币卡片混进了中文「行号」→ 外币账户一律英文口径，国内专属字段不显示；
//  2) 内销回款只中文即可 → 人民币账户（卡片 / 编辑表单 / 打印银行块）全中文，不出现英文；
//  3) 没有新增账户、删除账户 → 支持新增任意币种账户、删除、同币种多套并指定默认协同。
//
// 数据真源：盖章《开票资料》；存储复用后端 /field-configs 的 bank_accounts 模块（无新表 / 新 API）。
// ============================================================

import { useState, useEffect } from 'react'
import { Pencil, X, Save, RotateCw, Building2, Plus, Trash2, Star, Copy, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isCurrentUserAdmin } from '../services/rbacStore'
import { getViewMode, subscribeViewMode } from '../services/viewModeStore'
import {
  initBankAccounts, getBankAccounts, saveBankAccounts, missingBankFields,
  makeBankAccountId, withDefaultAccount, buildBankCopyText,
  getCompanyProfile, setCompanyProfile, companyContactLines, DEFAULT_COMPANY_PROFILE, type CompanyProfile,
  DEFAULT_BANK_ACCOUNTS, ACCOUNT_TYPE_LABEL, type BankAccount,
} from '../services/bankAccountStore'
import { copyText } from '../services/clipboard'

const GROUPS = [
  {
    key: 'FOREIGN', title: '外币账户（出口收汇）',
    desc: 'USD / EUR · 全英文口径，打印在出口单据的 Bank details',
    match: (a: BankAccount) => a.accountType !== 'DOMESTIC',
  },
  {
    key: 'DOMESTIC', title: '人民币账户（内销回款）',
    desc: 'CNY / RMB · 全中文口径，用于国内交易与开票资料',
    match: (a: BankAccount) => a.accountType === 'DOMESTIC',
  },
]

const CURRENCY_LABEL: Record<string, string> = { USD: '美元', EUR: '欧元', CNY: '人民币', GBP: '英镑', JPY: '日元', HKD: '港币' }
const CURRENCY_ORDER = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD']
const CURRENCY_SUGGESTIONS = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD']

// 编辑表单按账户性质分开：外币只出现英文字段，人民币只出现中文字段，不再混显。
const FOREIGN_FIELDS: { key: keyof BankAccount; label: string }[] = [
  { key: 'accountNo', label: 'Account No.' },
  { key: 'beneficiaryBank', label: 'Beneficiary Bank' },
  { key: 'beneficiary', label: 'Beneficiary' },
  { key: 'swiftCode', label: 'Swift Code' },
  { key: 'bankAddress', label: 'Bank Address' },
]
const DOMESTIC_FIELDS: { key: keyof BankAccount; label: string }[] = [
  { key: 'accountNo', label: '银行账号' },
  { key: 'beneficiaryBankCn', label: '开户行' },
  { key: 'beneficiaryCn', label: '收款单位' },
  { key: 'bankCode', label: '银行行号' },
  { key: 'taxNo', label: '统一社会信用代码' },
  { key: 'companyAddress', label: '注册地址' },
]

export default function FundAccounts() {
  const { user } = useAuth()
  // 管理员判定真源：管理员身份(viewMode) / RBAC 管理员角色 / 后端 role，三者任一命中即可编辑。
  // 原来只看 user.role，管理员身份下会被误判为只读（刘总 2026-11-08「几个账户管理员都不能编辑」）。
  const [viewMode, setViewModeState] = useState(() => getViewMode())
  useEffect(() => subscribeViewMode(() => setViewModeState(getViewMode())), [])
  const canEdit = viewMode === 'admin'
    || isCurrentUserAdmin()
    || String(user?.role || '').toUpperCase() === 'ADMIN'

  const [accounts, setAccounts] = useState<BankAccount[]>(() => getBankAccounts())
  // 公司联系资料：地址 / 电话来自盖章《开票资料》，邮箱待刘总确认；一次维护三套账户共用
  const [profile, setProfile] = useState<CompanyProfile>(() => getCompanyProfile())
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // 一键复制：销售（用户身份、只读）也要能复制账号发给客户，不依赖 canEdit
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 新增账户（币种可自由输入，不写死三个；公共银行资料从同性质账户带入，账号必须自己填）
  const [adding, setAdding] = useState(false)
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newType, setNewType] = useState<'FOREIGN' | 'DOMESTIC'>('FOREIGN')
  const [newAccountNo, setNewAccountNo] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      await initBankAccounts()
      if (alive) { setAccounts(getBankAccounts()); setProfile(getCompanyProfile()) }
    })()
    return () => { alive = false }
  }, [])

  const ordered = [...accounts].sort((a, b) => {
    const ia = CURRENCY_ORDER.indexOf(a.currency), ib = CURRENCY_ORDER.indexOf(b.currency)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  const patch = (id: string, key: keyof BankAccount, value: string) =>
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, [key]: value } : a)))

  // 公司联系资料改动即时反映到卡片 / 复制 / 打印预览；点「保存全部」才写后端
  const patchProfile = (key: keyof CompanyProfile, value: string) => {
    const next = { ...profile, [key]: value }
    setProfile(next)
    setCompanyProfile(next)
  }

  /** 一键复制收款信息：资料不全时拒绝复制，避免把半截账号发给客户 */
  const handleCopy = async (a: BankAccount) => {
    if (missingBankFields(a).length) {
      setMsg({ ok: false, text: '该账户资料未维护完整，为避免把错误信息发给客户，暂不能复制；请先补齐资料并保存。' })
      return
    }
    const text = buildBankCopyText(a)
    const ok = await copyText(text)
    if (!ok) {
      setMsg({ ok: false, text: '浏览器未允许复制，请在卡片里手动选中文字复制。' })
      return
    }
    setCopiedId(a.id)
    setMsg({ ok: true, text: `已复制 ${a.currency} 收款信息（${a.accountType === 'DOMESTIC' ? '中文' : '英文'}），可直接粘贴发给客户。` })
    window.setTimeout(() => setCopiedId(prev => (prev === a.id ? null : prev)), 2500)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      // 账户与公司联系资料一次保存：两个 module 走同一个已有配置接口
      await saveBankAccounts(accounts, profile)
      setEditing(null)
      setMsg({ ok: true, text: '已保存。开 PI 时会按币种自动带出默认协同账户，并把公司地址 / 电话 / 邮箱打印到客户单据、一键复制文本。' })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || '保存失败（账户资料仅管理员可修改）' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setAccounts(DEFAULT_BANK_ACCOUNTS.map(a => ({ ...a })))
    setProfile({ ...DEFAULT_COMPANY_PROFILE })
    setEditing(null)
    setMsg({ ok: true, text: '已恢复内置《开票资料》三套账户与公司联系资料，点「保存全部」后生效。' })
  }

  /** 新增账户：主键用 id，允许同币种多套；该币种原本没有账户时自动设为默认协同 */
  const handleAdd = () => {
    const code = String(newCurrency || '').trim().toUpperCase()
    if (!code) { setMsg({ ok: false, text: '请先填写币种代码，如 USD / EUR / CNY。' }); return }
    if (!String(newAccountNo || '').trim()) { setMsg({ ok: false, text: '请先填写银行账号，避免生成空账户。' }); return }
    const template = accounts.find(a => a.accountType === newType)
      || DEFAULT_BANK_ACCOUNTS.find(a => a.accountType === newType)
      || DEFAULT_BANK_ACCOUNTS[0]
    const hasSameCurrency = accounts.some(a => a.currency === code)
    const created: BankAccount = {
      ...template,
      id: makeBankAccountId(code),
      currency: code,
      accountType: newType,
      accountNo: String(newAccountNo).trim(),
      paymentRoute: '',
      isDefault: !hasSameCurrency,
    }
    setAccounts(prev => [...prev, created])
    setEditing(created.id)
    setAdding(false)
    setNewAccountNo('')
    setMsg({ ok: true, text: `已新增 ${code} 账户，请补齐资料后点「保存全部」；${hasSameCurrency ? '如需改默认协同，点卡片上的「设为默认」。' : '已自动设为该币种默认协同。'}` })
  }

  /** 删除账户：删掉默认账户时把同币种剩余的第一套顶上，避免该币种失去默认协同 */
  const handleDelete = (id: string) => {
    const target = accounts.find(a => a.id === id)
    if (!target) return
    const sameCount = accounts.filter(a => a.currency === target.currency).length
    const warn = sameCount === 1
      ? `删除后「${target.currency}」将没有任何收款账户，开该币种 PI 会提示「账户未维护」。确定删除？`
      : `确定删除 ${target.currency} 账户 ${target.accountNo || '(空账号)'} 吗？`
    if (!window.confirm(warn)) return
    let next = accounts.filter(a => a.id !== id)
    if (target.isDefault) {
      const first = next.find(a => a.currency === target.currency)
      if (first) next = next.map(a => (a.id === first.id ? { ...a, isDefault: true } : a))
    }
    setAccounts(next)
    if (editing === id) setEditing(null)
    setMsg({ ok: true, text: '已从列表移除，点「保存全部」后正式生效。' })
  }

  const handleSetDefault = (id: string) => {
    setAccounts(prev => withDefaultAccount(prev, id))
    setMsg({ ok: true, text: '已设为该币种默认协同账户，点「保存全部」后生效。' })
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Building2 size={20} className="text-brand-600" />
          资金账户
        </h2>
        <p className="text-sm text-gray-500 mt-1">银行账户 / 现金账户管理 · 按币种维护收款账户与回款路径</p>
      </div>

      {/* 默认协同说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900 leading-6">
        <strong>按币种默认协同</strong>：开 PI 选择币种时，系统自动带出该币种的默认账户及回款路径，
        并打印到客户单据；销售不用手工挑，也不会出现「选欧元却印美元账号」。
        <strong>外币账户全英文、人民币账户全中文</strong>（刘总 2026-11-08 口径）；资料来源为盖章《开票资料》，此处修改后对全系统开单生效。
      </div>

      {msg && (
        <div className={`relative px-4 py-2.5 rounded-lg text-sm border ${
          msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="absolute top-2 right-2 opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* 公司联系信息：盖章《开票资料》真值，一次维护，外币 / 人民币账户共用（刘总 2026-11-08 第三轮） */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-medium text-gray-700">公司联系信息</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              外币账户用英文地址与英文标签、人民币账户用中文地址与中文标签；打印件与一键复制都会自动带上。一次维护，全部账户共用。
            </p>
          </div>
          <span className="text-xs text-gray-400">证据：盖章《开票资料》</span>
        </div>
        {canEdit ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            <div className="lg:col-span-2">
              <label className="block text-xs text-gray-500 mb-0.5">英文公司地址（出口单据 / 外币账户）</label>
              <input value={profile.addressEn} onChange={e => patchProfile('addressEn', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">中文公司地址（内销 / 人民币账户）</label>
              <input value={profile.addressCn} onChange={e => patchProfile('addressCn', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">电话</label>
              <input value={profile.tel} onChange={e => patchProfile('tel', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-gray-500 mb-0.5">邮箱（选填）</label>
              <input value={profile.email} onChange={e => patchProfile('email', e.target.value)}
                placeholder="盖章资料未列，待确认；留空则不打印、不复制"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs text-gray-600">
            <div className="lg:col-span-2">英文地址：{profile.addressEn || '—'}</div>
            <div>中文地址：{profile.addressCn || '—'}</div>
            <div>电话：{profile.tel || '—'}</div>
            <div>邮箱：{profile.email || '待确认'}</div>
          </div>
        )}
        <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          公司地址与电话来自盖章《开票资料》，对外邮箱来自真实 PI/CI 单据页头（marketing@holangchina.com）。
          内置 PI/CI 打印模板页头本来就有公司名 / 地址 / 电话 / 邮箱，银行块不重复；此处维护的资料用于「资金账户」卡片与销售一键复制文本。
        </div>
      </div>

      {/* 工具条：新增账户 */}
      <div className="flex items-center gap-3 flex-wrap">
        {canEdit && (
          <button
            onClick={() => setAdding(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700"
          >
            <Plus size={14} />
            {adding ? '收起新增' : '新增账户'}
          </button>
        )}
        <span className="text-xs text-gray-400">可同币种多套账户，指定一套为「默认协同」；点卡片右上角「复制」可一键发给客户（只读销售也能用）；外币账户不显示国内行号 / 信用代码。</span>
      </div>

      {adding && canEdit && (
        <div className="bg-white border border-brand-200 rounded-xl p-4 space-y-3">
          <div className="text-sm font-medium text-gray-700">新增账户</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">账户性质</label>
              <select value={newType} onChange={e => setNewType(e.target.value as 'FOREIGN' | 'DOMESTIC')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                <option value="FOREIGN">外币账户 · 出口收汇（英文）</option>
                <option value="DOMESTIC">人民币账户 · 内销回款（中文）</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">币种代码</label>
              <input list="bank-currency-suggestions" value={newCurrency}
                onChange={e => setNewCurrency(e.target.value.toUpperCase())}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
              <datalist id="bank-currency-suggestions">
                {CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c}>{CURRENCY_LABEL[c]}</option>)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">银行账号</label>
              <input value={newAccountNo} onChange={e => setNewAccountNo(e.target.value)}
                placeholder="必填，新增后可在卡片里补齐其他资料"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
              <Plus size={13} /> 添加
            </button>
            <span className="text-xs text-gray-400">开户行 / 收款人等公共资料会从同性质账户带入，账号留给您自己填，避免误带旧账号。添加后记得点「保存全部」。</span>
          </div>
        </div>
      )}

      {/* 账户按性质分组：外币账户（英文）/ 人民币账户（中文） */}
      {GROUPS.map((group) => {
        const rows = ordered.filter(group.match)
        return (
          <div key={group.key} className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-gray-700">{group.title}</h3>
              <span className="text-xs text-gray-400">{group.desc}</span>
            </div>
            {!rows.length && (
              <div className="text-xs text-gray-400 bg-white border border-dashed border-gray-300 rounded-lg px-4 py-3">
                暂无{group.key === 'FOREIGN' ? '外币' : '人民币'}账户，可点「新增账户」添加；也可点「恢复内置开票资料」。
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {rows.map((a) => {
                const isDomestic = a.accountType === 'DOMESTIC'
                const miss = missingBankFields(a)
                const isEditing = editing === a.id
                const fields = isDomestic ? DOMESTIC_FIELDS : FOREIGN_FIELDS
                return (
                  <div key={a.id} className={`bg-white border rounded-xl p-4 ${isDomestic ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-800">{a.currency}</span>
                          <span className="text-sm text-gray-500">{CURRENCY_LABEL[a.currency] || a.currency}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${isDomestic ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-700'}`}>
                            {ACCOUNT_TYPE_LABEL[a.accountType] || '收款账户'}
                          </span>
                          {a.isDefault ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">默认协同</span>
                          ) : canEdit ? (
                            <button onClick={() => handleSetDefault(a.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full hover:text-brand-600 hover:bg-brand-50">
                              <Star size={11} /> 设为默认
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-2 font-mono text-base font-medium text-brand-700 break-all">{a.accountNo || '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isDomestic ? (a.beneficiaryBankCn || '—') : (a.beneficiaryBank || '—')}
                        </div>
                      </div>
                      {/* 复制按钮对所有人开放：销售是「用户身份」也要能复制账号发给客户；资料不全时禁用 */}
                      <div className="flex items-start gap-1 shrink-0">
                        <button
                          onClick={() => handleCopy(a)}
                          title={miss.length ? '资料未维护完整，暂不能复制给客户' : '一键复制该账户收款信息，可直接粘贴发给客户'}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                            miss.length ? 'text-gray-300 cursor-not-allowed'
                              : copiedId === a.id ? 'text-green-600 bg-green-50'
                                : 'text-gray-500 hover:text-brand-600 hover:bg-gray-100'
                          }`}
                        >
                          {copiedId === a.id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedId === a.id ? '已复制' : '复制'}
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setEditing(isEditing ? null : a.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
                          >
                            {isEditing ? <X size={13} /> : <Pencil size={13} />}
                            {isEditing ? '收起' : '编辑'}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isEditing ? (
                      <>
                        {/* 外币卡片全英文标签、不出现国内「行号」；人民币卡片全中文 */}
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          {isDomestic ? (
                            <>
                              <div>银行行号：{a.bankCode || '—'}</div>
                              <div>统一社会信用代码：{a.taxNo || '—'}</div>
                              <div className="col-span-2">收款单位：{a.beneficiaryCn || '—'}</div>
                              <div className="col-span-2">注册地址：{a.companyAddress || '—'}</div>
                              <div className="col-span-2">回款路径：{a.paymentRoute || '（未填写，选填）'}</div>
                            </>
                          ) : (
                            <>
                              <div>Swift Code: {a.swiftCode || '—'}</div>
                              <div>Beneficiary: {a.beneficiary || '—'}</div>
                              <div className="col-span-2">Bank Address: {a.bankAddress || '—'}</div>
                              <div className="col-span-2">PAYMENT ROUTE: {a.paymentRoute || '—'}</div>
                            </>
                          )}
                          {/* 公司联系资料：按账户性质显示对应语言；邮箱等待确认字段为空时整行不显示 */}
                          {companyContactLines(isDomestic).filter(x => x.value.trim()).length > 0 && (
                            <div className="col-span-2 mt-1 pt-1 border-t border-dashed border-gray-200">
                              {companyContactLines(isDomestic).filter(x => x.value.trim()).map(x => (
                                <div key={x.label}>{x.label}{isDomestic ? '：' : ': '}{x.value}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`mt-3 text-xs ${miss.length ? 'text-amber-600' : 'text-green-600'}`}>
                          {miss.length ? `待补充：${miss.join('、')}` : '资料完整，可直接用于开单'}
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">账户性质</label>
                          <select
                            value={a.accountType}
                            onChange={(e) => patch(a.id, 'accountType', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                          >
                            <option value="FOREIGN">外币账户 · 出口收汇（英文）</option>
                            <option value="DOMESTIC">人民币账户 · 内销回款（中文）</option>
                          </select>
                        </div>
                        {fields.map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs text-gray-500 mb-0.5">{f.label}</label>
                            <input
                              value={String(a[f.key] ?? '')}
                              onChange={(e) => patch(a.id, f.key, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">
                            {isDomestic ? '回款路径（选填：汇款附言 / 到账要求，会印到单据）' : 'PAYMENT ROUTE (intermediary bank / remittance note, printed on PI)'}
                          </label>
                          <textarea
                            rows={2}
                            value={a.paymentRoute || ''}
                            onChange={(e) => patch(a.id, 'paymentRoute', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                        </div>
                        {canEdit && (
                          <button onClick={() => handleDelete(a.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                            <Trash2 size={13} /> 删除账户
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 保存栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        {canEdit ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? '保存中...' : '保存全部'}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              <RotateCw size={14} />
              恢复内置开票资料
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-500">当前为只读；账户资料仅管理员可修改。</span>
        )}
        <span className="text-xs text-gray-400">
          新增 / 删除 / 设为默认，以及上方「公司联系信息」，都要点「保存全部」才正式写入系统；删除某币种最后一套账户后，开该币种 PI 会提示补维护，不会借用其他币种账号。
        </span>
      </div>
    </div>
  )
}
