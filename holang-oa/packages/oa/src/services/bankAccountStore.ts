// ============================================================
// 收款账户与回款路径（按币种协同）
// 刘总 2026-11-08：选欧元给欧元账户、选美元给美元账户、选人民币给人民币账户，默认自动协同带出。
//
// 真源与证据（LOCKED 总纲「证据优先级」，绝不编造账号）：
//  USD ← "PI for Allum Corporation.xls" / "CI for Allum Corporation.xls" 的 Bank details 区 R29-R34
//  CNY ← "126_昊朗（苏州）能源科技有限公司_报价单(1).xlsx" A3/C3/A6/C6/K6/M6（供应商=我方）
//        主体与注册地址和英文单据一致，交叉验证通过
//  EUR ← 盖章《开票资料》5129 1230 7435 101 (EUR)
//  三套账号共用同一开户行 / SWIFT / 行号 / 收款主体；资料维护入口按刘总指定放在
//  「ERP·财务 → 资金账户」，不放系统设置。
//
// 存储：复用已有后端 /field-configs 的「每模块整存 JSON」机制（module = bank_accounts），
//       不新建表 / 不新建 API / 不加 Prisma 字段（走法B）。
// ============================================================

import api from './api'

export interface BankAccount {
  currency: string          // 币种代码：USD / EUR / CNY
  accountType: 'FOREIGN' | 'DOMESTIC' // 外汇账户（出口收汇）/ 国内交易账户（内销回款）
  accountNo: string         // 银行账号
  beneficiaryBank: string   // 开户行（英文，打印件用）
  beneficiaryBankCn: string // 开户行（中文，资金账户页显示）
  bankAddress: string       // 银行地址
  swiftCode: string         // SWIFT
  bankCode: string          // 银行行号
  beneficiary: string       // 收款人（英文，打印件用）
  beneficiaryCn: string     // 收款人（中文，资金账户页显示）
  taxNo: string             // 统一社会信用代码（国内交易账户开票资料要素）
  companyAddress: string    // 注册地址（中文）
  paymentRoute: string      // 回款路径补充（中间行 / 汇款附言，自由文本，可空）
  isDefault: boolean        // 该币种默认账户
  updatedAt?: string
}

export const BANK_ACCOUNT_MODULE = 'bank_accounts'
const STORAGE_KEY = 'holang_bank_accounts_v1'

// 盖章《开票资料》（刘总 2026-11-08 提供）= 最高优先证据，三个币种账号全齐。
// 与 PI/CI for Allum（USD 512912307432201）、供应商报价单（RMB 512912307410901）交叉验证一致。
const COMMON_BANK = {
  beneficiaryBank: 'CHINA MERCHANTS BANK SUZHOU BRANCH SUZHOU CHINA',
  beneficiaryBankCn: '招商银行苏州分行营业部',
  bankAddress: 'NO.36 WAN SHENG ROAD SUZHOU INDUSTRIAL PARK SUZHOU JIANGSU CHINA',
  swiftCode: 'CMBCCNBS275',
  bankCode: '3083 0500 8189',
  beneficiary: 'Holang Tech (Suzhou) Co., Ltd',
  beneficiaryCn: '昊朗（苏州）能源科技有限公司',
  taxNo: '91320594MA1NYLU54L',
  companyAddress: '苏州市吴中区金丝港路51号',
}

/** 账户性质标签：外汇户走出口收汇，人民币户走国内交易 */
export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  FOREIGN: '外汇账户 · 出口收汇',
  DOMESTIC: '国内交易账户 · 内销回款',
}

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { ...COMMON_BANK, currency: 'USD', accountNo: '512912307432201', accountType: 'FOREIGN', paymentRoute: '', isDefault: true },
  { ...COMMON_BANK, currency: 'EUR', accountNo: '512912307435101', accountType: 'FOREIGN', paymentRoute: '', isDefault: true },
  { ...COMMON_BANK, currency: 'CNY', accountNo: '512912307410901', accountType: 'DOMESTIC', paymentRoute: '', isDefault: true },
]

let cache: BankAccount[] | null = null

function readLocal(): BankAccount[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p }
  } catch { /* ignore */ }
  return null
}
function writeLocal(list: BankAccount[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

/** 后端配置优先，同时保证默认币种槽位一个不少 */
function mergeWithDefaults(stored: any[]): BankAccount[] {
  const byCode = new Map<string, BankAccount>()
  for (const d of DEFAULT_BANK_ACCOUNTS) byCode.set(d.currency, { ...d })
  for (const s of stored) {
    const code = String(s?.currency || '').toUpperCase()
    if (!code) continue
    byCode.set(code, { ...(byCode.get(code) || DEFAULT_BANK_ACCOUNTS[0]), ...s, currency: code })
  }
  return [...byCode.values()]
}

/** 从后端加载账户配置（销售开 PI 也要能读；写仍仅管理员） */
export async function initBankAccounts(): Promise<BankAccount[]> {
  try {
    const res = await api.get<Record<string, any[]>>('/field-configs')
    if (res.code === 0 && res.data) {
      const stored = res.data[BANK_ACCOUNT_MODULE]
      cache = Array.isArray(stored) && stored.length ? mergeWithDefaults(stored) : [...DEFAULT_BANK_ACCOUNTS]
      writeLocal(cache)
      return cache
    }
  } catch { /* 后端不可用时用本机缓存或内置真源 */ }
  cache = readLocal() || [...DEFAULT_BANK_ACCOUNTS]
  return cache
}

export function getBankAccounts(): BankAccount[] {
  if (cache) return cache
  cache = readLocal() || [...DEFAULT_BANK_ACCOUNTS]
  return cache
}

/** 币种 → 默认账户：这就是「默认协同」的真源，无需销售手工挑 */
export function getBankAccountForCurrency(currency: string): BankAccount | undefined {
  const code = String(currency || '').toUpperCase()
  const list = getBankAccounts().filter((a) => a.currency === code)
  if (!list.length) return undefined
  return list.find((a) => a.isDefault) || list[0]
}

/** 管理员维护：整模块写回后端 field_configs */
export async function saveBankAccounts(list: BankAccount[]): Promise<void> {
  const now = new Date().toISOString()
  const payload = list.map((a) => ({ ...a, currency: String(a.currency || '').toUpperCase(), updatedAt: now }))
  const res = await api.put<{ code: number; message?: string }>(`/field-configs/${BANK_ACCOUNT_MODULE}`, { fields: payload })
  if (res.code !== 0) throw new Error(res.message || '保存失败')
  cache = payload
  writeLocal(payload)
}

/** 缺哪些关键资料；CNY 境内转账不要求 SWIFT */
export function missingBankFields(a: BankAccount | undefined): string[] {
  if (!a) return ['该币种收款账户']
  const miss: string[] = []
  if (!(a.beneficiaryBank || '').trim()) miss.push('开户银行')
  if (!(a.beneficiary || '').trim()) miss.push('收款人')
  if (!(a.accountNo || '').trim()) miss.push('银行账号')
  if (a.currency !== 'CNY' && !(a.swiftCode || '').trim()) miss.push('SWIFT')
  return miss
}

export function isBankAccountComplete(a: BankAccount | undefined): boolean {
  return missingBankFields(a).length === 0
}

/**
 * 生成打印件的银行字段。关键安全兜底：
 * 账户未维护完整时绝不回退到别的币种账号（原来选 EUR 会印美元账号），
 * 而是输出醒目的待维护提示，避免把错误收款信息发给客户。
 */
export function buildBankPrintData(currency: string): Record<string, string> {
  const code = String(currency || '').toUpperCase()
  const a = getBankAccountForCurrency(code)
  const miss = missingBankFields(a)
  if (!a || miss.length) {
    const hint = `【${code} 收款账户未维护完整：缺 ${miss.join('、')}；请到「ERP·财务 → 资金账户」补充后再发客户】`
    return {
      beneficiaryBank: hint,
      bankAddress: '—',
      swiftCode: '—',
      beneficiary: '—',
      beneficiaryAccount: '—',
      paymentRoute: '—',
    }
  }
  return {
    beneficiaryBank: a.beneficiaryBank,
    bankAddress: a.bankAddress || '—',
    swiftCode: a.swiftCode || '—',
    beneficiary: a.beneficiary,
    beneficiaryAccount: a.accountNo,
    paymentRoute: a.paymentRoute || '—',
  }
}
