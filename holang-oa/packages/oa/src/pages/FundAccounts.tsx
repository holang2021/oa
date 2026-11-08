// ============================================================
// ERP·财务 → 资金账户
// 刘总 2026-11-08 指定：收款账户资料建在这里，不放「系统设置 → 币种与汇率」。
// 原页面是 GenericListPage + comingSoon 占位（"功能开发中"），本页替换为真实可维护页面。
// 数据真源：盖章《开票资料》；存储复用后端 /field-configs 的 bank_accounts 模块。
// ============================================================

import { useState, useEffect } from 'react'
import { Pencil, X, Save, RotateCw, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isCurrentUserAdmin } from '../services/rbacStore'
import { getViewMode, subscribeViewMode } from '../services/viewModeStore'
import {
  initBankAccounts, getBankAccounts, saveBankAccounts, missingBankFields,
  DEFAULT_BANK_ACCOUNTS, ACCOUNT_TYPE_LABEL, type BankAccount,
} from '../services/bankAccountStore'

const GROUPS = [
  {
    key: 'FOREIGN', title: '外汇账户（出口收汇）',
    desc: 'USD / EUR · 出口单据 Bank details 用英文口径',
    match: (a: BankAccount) => a.accountType !== 'DOMESTIC',
  },
  {
    key: 'DOMESTIC', title: '国内交易账户（内销回款）',
    desc: 'CNY / RMB · 国内交易与开票资料口径（中文主体 / 行号 / 信用代码）',
    match: (a: BankAccount) => a.accountType === 'DOMESTIC',
  },
]

const CURRENCY_LABEL: Record<string, string> = { USD: '美元', EUR: '欧元', CNY: '人民币' }
const CURRENCY_ORDER = ['USD', 'EUR', 'CNY']

const FIELDS: { key: keyof BankAccount; label: string }[] = [
  { key: 'accountNo', label: '银行账号' },
  { key: 'beneficiaryBank', label: '开户行（英文，打印用）' },
  { key: 'beneficiaryBankCn', label: '开户行（中文）' },
  { key: 'beneficiary', label: '收款人（英文，打印用）' },
  { key: 'beneficiaryCn', label: '收款人（中文）' },
  { key: 'swiftCode', label: 'SWIFT Code' },
  { key: 'bankCode', label: '银行行号' },
  { key: 'bankAddress', label: '银行地址' },
  { key: 'taxNo', label: '统一社会信用代码（国内交易账户）' },
  { key: 'companyAddress', label: '注册地址（中文）' },
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
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await initBankAccounts()
      if (alive) setAccounts(getBankAccounts())
    })()
    return () => { alive = false }
  }, [])

  const ordered = [...accounts].sort((a, b) => {
    const ia = CURRENCY_ORDER.indexOf(a.currency), ib = CURRENCY_ORDER.indexOf(b.currency)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  const patch = (code: string, key: keyof BankAccount, value: string) =>
    setAccounts(prev => prev.map(a => (a.currency === code ? { ...a, [key]: value } : a)))

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await saveBankAccounts(accounts)
      setEditing(null)
      setMsg({ ok: true, text: '已保存。开 PI 时会按币种自动带出这些账户，并打印到 Bank details。' })
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || '保存失败（账户资料仅管理员可修改）' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setAccounts(DEFAULT_BANK_ACCOUNTS.map(a => ({ ...a })))
    setMsg({ ok: true, text: '已恢复内置《开票资料》，点「保存全部」后生效。' })
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
        <strong>按币种默认协同</strong>：开 PI 选择 USD / EUR / CNY 时，系统自动带出对应收款账户及回款路径，
        并打印到单据的 Bank details；销售不用手工挑，也不会再出现「选欧元却印美元账号」。
        资料来源为盖章《开票资料》，此处修改后对全系统开单生效。
      </div>

      {msg && (
        <div className={`relative px-4 py-2.5 rounded-lg text-sm border ${
          msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="absolute top-2 right-2 opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* 账户按性质分组：人民币「国内交易账户」单独成组体现，不与外汇户混在一起 */}
      {GROUPS.map((group) => {
        const rows = ordered.filter(group.match)
        if (!rows.length) return null
        return (
          <div key={group.key} className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-gray-700">{group.title}</h3>
              <span className="text-xs text-gray-400">{group.desc}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {rows.map((a) => {
                const isDomestic = a.accountType === 'DOMESTIC'
                const miss = missingBankFields(a)
                const isEditing = editing === a.currency
                return (
                  <div key={a.currency} className={`bg-white border rounded-xl p-4 ${isDomestic ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-800">{a.currency}</span>
                          <span className="text-sm text-gray-500">{CURRENCY_LABEL[a.currency] || a.currency}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${isDomestic ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-700'}`}>
                            {ACCOUNT_TYPE_LABEL[a.accountType] || '收款账户'}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">默认协同</span>
                        </div>
                        <div className="mt-2 font-mono text-base font-medium text-brand-700 break-all">{a.accountNo || '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isDomestic ? a.beneficiaryBankCn || a.beneficiaryBank : a.beneficiaryBank}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => setEditing(isEditing ? null : a.currency)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded"
                        >
                          {isEditing ? <X size={13} /> : <Pencil size={13} />}
                          {isEditing ? '收起' : '编辑'}
                        </button>
                      )}
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          {isDomestic ? (
                            <>
                              <div>银行行号：{a.bankCode || '—'}</div>
                              <div>信用代码：{a.taxNo || '—'}</div>
                              <div className="col-span-2">收款主体：{a.beneficiaryCn || a.beneficiary}</div>
                              <div className="col-span-2">注册地址：{a.companyAddress || '—'}</div>
                            </>
                          ) : (
                            <>
                              <div>SWIFT：{a.swiftCode || '—'}</div>
                              <div>行号：{a.bankCode || '—'}</div>
                              <div className="col-span-2">收款人：{a.beneficiary || '—'}</div>
                              <div className="col-span-2">银行地址：{a.bankAddress || '—'}</div>
                            </>
                          )}
                          <div className="col-span-2">回款路径：{a.paymentRoute || '（未填写，选填）'}</div>
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
                            onChange={(e) => patch(a.currency, 'accountType', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                          >
                            <option value="FOREIGN">外汇账户 · 出口收汇</option>
                            <option value="DOMESTIC">国内交易账户 · 内销回款</option>
                          </select>
                        </div>
                        {FIELDS.map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs text-gray-500 mb-0.5">{f.label}</label>
                            <input
                              value={String(a[f.key] ?? '')}
                              onChange={(e) => patch(a.currency, f.key, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">
                            回款路径（选填：中间行 / 汇款附言要求，会印到 PI 的 PAYMENT ROUTE）
                          </label>
                          <textarea
                            rows={2}
                            value={a.paymentRoute || ''}
                            onChange={(e) => patch(a.currency, 'paymentRoute', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                        </div>
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
          每个币种一套默认账户；如需同一币种多套账户，请先提出业务场景再扩展。
        </span>
      </div>
    </div>
  )
}
