// ============================================================
// 收款账户与回款路径（按币种协同）+ 公司联系资料
// 刘总 2026-11-08：选欧元给欧元账户、选美元给美元账户、选人民币给人民币账户，默认自动协同带出。
// 刘总 2026-11-08 续（资金账户页截图）：外币账户全英文口径（红框指出外币卡混进中文「行号」）、
//   人民币账户（内销回款）全中文即可；账户要能新增、能删除。
// 刘总 2026-11-08 续（第三轮）：外币账户缺少公司地址及电话、邮箱等信息。
//
// 真源与证据（LOCKED 总纲「证据优先级」，绝不编造账号 / 联系方式）：
//  USD ← "PI for Allum Corporation.xls" / "CI for Allum Corporation.xls" 的 Bank details 区 R29-R34
//  CNY ← "126_昊朗（苏州）能源科技有限公司_报价单(1).xlsx" A3/C3/A6/C6/K6/M6（供应商=我方）
//  EUR ← 盖章《开票资料》5129 1230 7435 101 (EUR)
//  公司中英文地址 / 电话 ← 盖章《开票资料》原件逐字抄录：
//    地址：苏州市吴中区金丝港路 51 号 / No. 51 Jinsigang Road, Wuzhong District, Suzhou Jiangsu, China
//    电话：+86 400 0512 711（真实 PI/CI 页头写作 +86 4000512711，同一号码）
//  对外邮箱 ← 真实 Allum PI/CI 单据页头（刘总 2026-11-05 提供、模板按其重建）：
//    marketing@holangchina.com。盖章《开票资料》未列邮箱，故以出口单据页头为准。
//    PI/CI 打印模板页头本来就有公司名 / 地址 / 电话 / 邮箱，因此银行块不重复添加，
//    公司资料只用于「资金账户」页卡片与销售一键复制文本，避免同一张单据出现两遍。
//
// 存储：复用已有后端 /field-configs 的「每模块整存 JSON」机制
//       （module = bank_accounts / company_profile），不新建表 / 不新建 API / 不加 Prisma 字段（走法B）。
// ============================================================

import api from './api'

export interface BankAccount {
  id: string               // 唯一键：允许同币种多套账户、可单独删除（主键不再用 currency）
  currency: string         // 币种代码：USD / EUR / CNY
  accountType: 'FOREIGN' | 'DOMESTIC' // 外币账户（出口收汇）/ 人民币账户（内销回款）
  accountNo: string        // 银行账号
  beneficiaryBank: string  // 开户行（英文，外币打印件用）
  beneficiaryBankCn: string // 开户行（中文，人民币账户用）
  bankAddress: string      // 银行地址（英文，外币打印件用）
  swiftCode: string        // SWIFT（外币账户）
  bankCode: string         // 银行行号（人民币账户）
  beneficiary: string      // 收款人（英文，外币打印件用）
  beneficiaryCn: string    // 收款单位（中文，人民币账户用）
  taxNo: string            // 统一社会信用代码（人民币账户开票资料要素）
  companyAddress: string   // 注册地址（中文）
  paymentRoute: string     // 回款路径补充（中间行 / 汇款附言，自由文本，可空）
  isDefault: boolean       // 该币种默认协同账户（同币种只允许一个）
  updatedAt?: string
}

/** 公司联系资料：一次维护，外币 / 人民币账户共用（外币用英文地址与标签，内销用中文） */
export interface CompanyProfile {
  addressCn: string
  addressEn: string
  tel: string
  email: string
}

export const BANK_ACCOUNT_MODULE = 'bank_accounts'
export const COMPANY_PROFILE_MODULE = 'company_profile'
const STORAGE_KEY = 'holang_bank_accounts_v1'
const PROFILE_STORAGE_KEY = 'holang_company_profile_v1'

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

/** 盖章《开票资料》原件真值 + 真实 PI/CI 单据页头的对外邮箱 */
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  addressCn: '苏州市吴中区金丝港路 51 号',
  addressEn: 'No. 51 Jinsigang Road, Wuzhong District, Suzhou Jiangsu, China',
  tel: '+86 400 0512 711',
  email: 'marketing@holangchina.com',
}

/** 账户性质标签：外币户走出口收汇（英文口径），人民币户走内销回款（中文口径） */
export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  FOREIGN: '外币账户 · 出口收汇',
  DOMESTIC: '人民币账户 · 内销回款',
}

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'bank-usd', ...COMMON_BANK, currency: 'USD', accountNo: '512912307432201', accountType: 'FOREIGN', paymentRoute: '', isDefault: true },
  { id: 'bank-eur', ...COMMON_BANK, currency: 'EUR', accountNo: '512912307435101', accountType: 'FOREIGN', paymentRoute: '', isDefault: true },
  { id: 'bank-cny', ...COMMON_BANK, currency: 'CNY', accountNo: '512912307410901', accountType: 'DOMESTIC', paymentRoute: '', isDefault: true },
]

/** 打印件银行块的动态标签键：PI/CI 模板 field 用 labelKey 指向这里 */
export const BANK_LABEL_KEYS = {
  title: 'bankDetailsTitle',
  lines: ['bankLabel1', 'bankLabel2', 'bankLabel3', 'bankLabel4', 'bankLabel5', 'bankLabel6'],
} as const

const BLANK_ACCOUNT: Omit<BankAccount, 'id' | 'currency'> = {
  accountType: 'FOREIGN', accountNo: '', beneficiaryBank: '', beneficiaryBankCn: '',
  bankAddress: '', swiftCode: '', bankCode: '', beneficiary: '', beneficiaryCn: '',
  taxNo: '', companyAddress: '', paymentRoute: '', isDefault: false,
}

/** 生成新账户 id（避免同币种多套账户主键冲突） */
export function makeBankAccountId(currency: string): string {
  const code = String(currency || 'CUR').toUpperCase()
  return `${code}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** 兼容历史数据：老配置没有 id / 账户性质时补齐，绝不丢已有账号 */
export function normalizeBankAccount(s: any, index = 0): BankAccount {
  const currency = String(s?.currency || 'CNY').toUpperCase()
  const accountType = s?.accountType === 'DOMESTIC' ? 'DOMESTIC' : 'FOREIGN'
  return {
    ...BLANK_ACCOUNT,
    ...(s || {}),
    id: String(s?.id || `${currency.toLowerCase()}-${index + 1}`),
    currency,
    accountType,
    isDefault: Boolean(s?.isDefault),
  }
}

let cache: BankAccount[] | null = null
let profileCache: CompanyProfile | null = null

function readLocal(): BankAccount[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 空数组也是合法状态（管理员把账户全删了），不能退回内置真源把删除「复活」
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(normalizeBankAccount) }
  } catch { /* ignore */ }
  return null
}
function writeLocal(list: BankAccount[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
function writeLocalProfile(p: CompanyProfile) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

/** 同步读取公司联系资料（打印 / 复制都要用，必须是同步函数） */
export function getCompanyProfile(): CompanyProfile {
  if (profileCache) return profileCache
  let p: CompanyProfile = { ...DEFAULT_COMPANY_PROFILE }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (raw) p = { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  profileCache = p
  return p
}

/** 页面编辑时即时更新本地真源（保存前只在当前浏览器生效，点「保存全部」后才写后端） */
export function setCompanyProfile(p: CompanyProfile) {
  profileCache = { ...DEFAULT_COMPANY_PROFILE, ...p }
  writeLocalProfile(profileCache)
}

/** 公司联系资料固定三行（空值不删行，由渲染 / 复制处决定省略，保证标签槽位不错位） */
export function companyContactLines(isDomestic: boolean): { label: string; value: string }[] {
  const p = getCompanyProfile()
  const l = isDomestic
    ? { address: '公司地址', tel: '电话', email: '邮箱' }
    : { address: 'Company Address', tel: 'Tel', email: 'Email' }
  return [
    { label: l.address, value: isDomestic ? p.addressCn : p.addressEn },
    { label: l.tel, value: p.tel },
    { label: l.email, value: p.email },
  ]
}

/**
 * 尊重管理员的增删：后端有配置就以后端为准，不再把内置三套账户强行合并回来，
 * 否则「删除账户」保存后刷新又会冒出来。
 */
function normalizeList(stored: any[]): BankAccount[] {
  return stored.map(normalizeBankAccount)
}

/** 从后端加载账户配置 + 公司联系资料（销售开 PI 也要能读；写仍仅管理员） */
export async function initBankAccounts(): Promise<BankAccount[]> {
  try {
    const res = await api.get<Record<string, any[]>>('/field-configs')
    if (res.code === 0 && res.data) {
      const stored = res.data[BANK_ACCOUNT_MODULE]
      cache = Array.isArray(stored) ? normalizeList(stored) : DEFAULT_BANK_ACCOUNTS.map(a => ({ ...a }))
      writeLocal(cache)
      const storedProfile = res.data[COMPANY_PROFILE_MODULE]
      const profile: CompanyProfile = Array.isArray(storedProfile) && storedProfile[0]
        ? { ...DEFAULT_COMPANY_PROFILE, ...storedProfile[0] }
        : { ...DEFAULT_COMPANY_PROFILE }
      profileCache = profile
      writeLocalProfile(profile)
      return cache
    }
  } catch { /* 后端不可用时用本机缓存或内置真源 */ }
  cache = readLocal() || DEFAULT_BANK_ACCOUNTS.map(a => ({ ...a }))
  getCompanyProfile()
  return cache
}

export function getBankAccounts(): BankAccount[] {
  if (cache) return cache
  cache = readLocal() || DEFAULT_BANK_ACCOUNTS.map(a => ({ ...a }))
  return cache
}

/** 币种 → 默认账户：这就是「默认协同」的真源，无需销售手工挑 */
export function getBankAccountForCurrency(currency: string): BankAccount | undefined {
  const code = String(currency || '').toUpperCase()
  const list = getBankAccounts().filter((a) => a.currency === code)
  if (!list.length) return undefined
  return list.find((a) => a.isDefault) || list[0]
}

/** 同币种设为默认：互斥，返回新数组（页面改完仍需点「保存全部」） */
export function withDefaultAccount(list: BankAccount[], id: string): BankAccount[] {
  const target = list.find(a => a.id === id)
  if (!target) return list
  return list.map(a => a.currency === target.currency ? { ...a, isDefault: a.id === id } : a)
}

/** 管理员维护：账户 + 公司联系资料一次「保存全部」写回后端 field_configs（两个 module） */
export async function saveBankAccounts(list: BankAccount[], profile?: CompanyProfile): Promise<void> {
  const now = new Date().toISOString()
  const payload = list.map((a) => ({
    ...normalizeBankAccount(a),
    currency: String(a.currency || '').toUpperCase(),
    updatedAt: now,
  }))
  const res = await api.put<{ code: number; message?: string }>(`/field-configs/${BANK_ACCOUNT_MODULE}`, { fields: payload })
  if (res.code !== 0) throw new Error(res.message || '保存失败')
  cache = payload
  writeLocal(payload)
  if (profile) {
    profileCache = { ...DEFAULT_COMPANY_PROFILE, ...profile }
    writeLocalProfile(profileCache)
  }
  const pRes = await api.put<{ code: number; message?: string }>(
    `/field-configs/${COMPANY_PROFILE_MODULE}`, { fields: [getCompanyProfile()] },
  )
  if (pRes.code !== 0) throw new Error(pRes.message || '公司联系资料保存失败')
}

/**
 * 缺哪些关键资料：按账户性质分开查。
 * 外币账户按出口单据要英文开户行 / 英文收款人 / SWIFT；
 * 人民币账户按内销开票资料要中文开户行 / 中文收款主体 / 银行行号，不要求 SWIFT。
 * 公司地址 / 电话 / 邮箱属公司级资料，不参与账户完整性判定（邮箱未确认时也不阻断开单）。
 */
export function missingBankFields(a: BankAccount | undefined): string[] {
  if (!a) return ['该币种收款账户']
  const miss: string[] = []
  if (a.accountType === 'DOMESTIC') {
    if (!(a.accountNo || '').trim()) miss.push('银行账号')
    if (!(a.beneficiaryBankCn || '').trim()) miss.push('开户行')
    if (!(a.beneficiaryCn || '').trim()) miss.push('收款单位')
    if (!(a.bankCode || '').trim()) miss.push('银行行号')
  } else {
    if (!(a.accountNo || '').trim()) miss.push('Account No.')
    if (!(a.beneficiaryBank || '').trim()) miss.push('Beneficiary Bank')
    if (!(a.beneficiary || '').trim()) miss.push('Beneficiary')
    if (!(a.swiftCode || '').trim()) miss.push('Swift Code')
  }
  return miss
}

export function isBankAccountComplete(a: BankAccount | undefined): boolean {
  return missingBankFields(a).length === 0
}

/**
 * 生成打印件的银行字段。关键安全兜底：
 * 账户未维护完整时绝不回退到别的币种账号（原来选 EUR 会印美元账号），
 * 而是输出醒目的待维护提示，避免把错误收款信息发给客户。
 *
 * 语言口径（刘总 2026-11-08）：外币账户全英文、人民币账户全中文；
 * 银行块后接 3 行公司联系资料（地址 / 电话 / 邮箱），同样按语言切标签，空值由模板 optional 跳过。
 */
export function buildBankPrintData(currency: string): Record<string, string> {
  const code = String(currency || '').toUpperCase()
  const a = getBankAccountForCurrency(code)
  const isDomestic = a ? a.accountType === 'DOMESTIC' : code === 'CNY'

  const labels = isDomestic
    ? {
      title: '收款账户信息',
      lines: ['开户行', '银行行号', '统一社会信用代码', '收款单位', '银行账号', '回款路径'],
    }
    : {
      title: 'Bank details:',
      lines: ['Beneficiary Bank', 'Bank Address', 'Swift Code', 'Beneficiary', 'Account No.', 'PAYMENT ROUTE'],
    }

  const base: Record<string, string> = {
    [BANK_LABEL_KEYS.title]: labels.title,
  }
  BANK_LABEL_KEYS.lines.forEach((k, i) => { base[k] = labels.lines[i] })

  // 公司联系资料作为打印数据的完整字段一并返回。
  // 内置 PI/CI 模板页头（按真实 Allum 单据重建）本来就有公司名 / 地址 / 电话 / 邮箱，
  // 故银行块不再重复渲染这些行，避免同一张单据出现两遍；字段保留给自定义模板等入口。
  const [cAddr, cTel, cMail] = companyContactLines(isDomestic)
  const contact: Record<string, string> = {
    lblCompanyAddress: cAddr.label, companyAddress: cAddr.value,
    lblCompanyTel: cTel.label, companyTel: cTel.value,
    lblCompanyEmail: cMail.label, companyEmail: cMail.value,
  }

  const miss = missingBankFields(a)
  if (!a || miss.length) {
    const hint = `【${code} 收款账户未维护完整：缺 ${miss.join('、')}；请到「ERP·财务 → 资金账户」补充后再发客户】`
    return {
      ...base, ...contact,
      beneficiaryBank: hint,
      bankAddress: '—',
      swiftCode: '—',
      beneficiary: '—',
      beneficiaryAccount: '—',
      paymentRoute: '—',
    }
  }

  if (isDomestic) {
    return {
      ...base, ...contact,
      beneficiaryBank: a.beneficiaryBankCn || a.beneficiaryBank,
      bankAddress: a.bankCode || '—',
      swiftCode: a.taxNo || '—',
      beneficiary: a.beneficiaryCn || a.beneficiary,
      beneficiaryAccount: a.accountNo,
      paymentRoute: a.paymentRoute || '—',
    }
  }
  return {
    ...base, ...contact,
    beneficiaryBank: a.beneficiaryBank,
    bankAddress: a.bankAddress || '—',
    swiftCode: a.swiftCode || '—',
    beneficiary: a.beneficiary,
    beneficiaryAccount: a.accountNo,
    paymentRoute: a.paymentRoute || '—',
  }
}

/**
 * 一键复制给客户的收款信息（刘总 2026-11-08：销售要能直接复制去发客户）。
 * 与打印件同语言口径：外币账户纯英文、人民币账户纯中文，不含内部提示与人民币参考。
 * 银行信息后空一行接公司联系资料（地址 / 电话 / 邮箱），空值整行省略。
 */
export function buildBankCopyText(a: BankAccount | undefined): string {
  if (!a) return ''
  const isDomestic = a.accountType === 'DOMESTIC'
  // 选填项没填就整行不输出，避免把「回款路径：—」这种占位行原样发给客户
  const routeLine = (label: string) => (a.paymentRoute || '').trim() ? [`${label}${a.paymentRoute.trim()}`] : []
  const contactLines = companyContactLines(isDomestic)
    .filter(x => String(x.value || '').trim())
    .map(x => `${x.label}${isDomestic ? '：' : ': '}${x.value.trim()}`)
  const tail = contactLines.length ? ['', ...contactLines] : []

  if (isDomestic) {
    return [
      '收款账户信息',
      `开户行：${a.beneficiaryBankCn || a.beneficiaryBank}`,
      `银行行号：${a.bankCode || '—'}`,
      `统一社会信用代码：${a.taxNo || '—'}`,
      `收款单位：${a.beneficiaryCn || a.beneficiary}`,
      `注册地址：${a.companyAddress || '—'}`,
      `银行账号：${a.accountNo}`,
      ...routeLine('回款路径：'),
      ...tail,
    ].join('\n')
  }
  return [
    'Bank details:',
    `Beneficiary Bank: ${a.beneficiaryBank}`,
    `Bank Address: ${a.bankAddress || '—'}`,
    `Swift Code: ${a.swiftCode || '—'}`,
    `Beneficiary: ${a.beneficiary}`,
    `Account No.: ${a.accountNo}`,
    ...routeLine('PAYMENT ROUTE: '),
    ...tail,
  ].join('\n')
}

/**
 * 按币种取默认协同账户的可复制文本。
 * 资料未维护完整时返回空串 —— 页面据此禁用复制，绝不把半截账号发给客户。
 */
export function buildBankCopyTextForCurrency(currency: string): string {
  const a = getBankAccountForCurrency(currency)
  if (!a || missingBankFields(a).length) return ''
  return buildBankCopyText(a)
}
