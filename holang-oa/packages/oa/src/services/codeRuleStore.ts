// ============================================================
// 编码规则存储层
// ============================================================

import { addTrashItem } from './trashStore'

export type DateFormat = 'none' | 'YYYY' | 'YY' | 'YYYYMM' | 'YYMM' | 'YYYYMMDD' | 'YYYYMM-DD' | 'YYYY-MM' | 'YYYY-MM-DD'
export type Separator = '' | '-' | '_' | '.' | '/'

export type SerialReset = 'never' | 'daily' | 'monthly' | 'quarterly' | 'yearly'

export interface CodeRule {
  id: string          // 规则 ID，如 'quotation'
  name: string        // 规则名称
  nameEn: string      // 英文名称
  prefix: string      // 字母前缀，如 'QU'
  dateFormat: DateFormat
  separator: Separator
  serialDigits: number   // 流水号位数，最小 2
  serialStart: number     // 流水号起始值，默认 1
  currentSerial: number   // 当前流水号（下次使用）
  serialReset: SerialReset  // 流水号重置规则：每日/每月/每季度/每年/从不
  lastResetKey: string    // 上次重置的周期标识（如 '20260701' / '202607' / '2026Q3' / '2026'），用于判断是否需要重置
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'holang_code_rules_v1'

const DEFAULT_RULES: CodeRule[] = [
  {
    id: 'quotation',
    name: '报价编号',
    nameEn: 'Quotation No.',
    prefix: 'QU',
    dateFormat: 'YYYYMM',
    separator: '-',
    serialDigits: 3,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'monthly',
    lastResetKey: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'order',
    name: '订单编号',
    nameEn: 'Order No.',
    prefix: 'OR',
    dateFormat: 'YYYYMMDD',
    separator: '-',
    serialDigits: 3,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'daily',
    lastResetKey: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'customer',
    name: '客户编号',
    nameEn: 'Customer No.',
    prefix: 'CU',
    dateFormat: 'none',
    separator: '',
    serialDigits: 4,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'never',
    lastResetKey: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proformaInvoice',
    name: 'PI 编号',
    nameEn: 'PI No.',
    prefix: 'PI',
    dateFormat: 'YYYYMM',
    separator: '-',
    serialDigits: 3,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'monthly',
    lastResetKey: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'invoice',
    name: '发票编号',
    nameEn: 'Invoice No.',
    prefix: 'IV',
    dateFormat: 'YYYY',
    separator: '-',
    serialDigits: 4,
    serialStart: 1,
    currentSerial: 1,
    serialReset: 'yearly',
    lastResetKey: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function getRules(): CodeRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_RULES]
    const parsed = JSON.parse(raw) as CodeRule[]
    return parsed.length > 0 ? parsed : [...DEFAULT_RULES]
  } catch {
    return [...DEFAULT_RULES]
  }
}

function saveRules(rules: CodeRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function getAllCodeRules(): CodeRule[] {
  return getRules()
}

export function getCodeRuleById(id: string): CodeRule | undefined {
  return getRules().find((r) => r.id === id)
}

export function addCodeRule(rule: Omit<CodeRule, 'createdAt' | 'updatedAt'>): CodeRule {
  const rules = getRules()
  const newRule: CodeRule = {
    ...rule,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  rules.push(newRule)
  saveRules(rules)
  return newRule
}

export function updateCodeRule(id: string, updates: Partial<CodeRule>): CodeRule | null {
  const rules = getRules()
  const idx = rules.findIndex((r) => r.id === id)
  if (idx === -1) return null
  rules[idx] = { ...rules[idx], ...updates, updatedAt: new Date().toISOString() }
  saveRules(rules)
  return rules[idx]
}

export function deleteCodeRule(id: string): boolean {
  const rules = getRules()
  // Before deletion, save to trash
  const target = rules.find(r => r.id === id)
  if (target) {
    addTrashItem({
      type: 'codeRule',
      name: target.name,
      data: target,
      storeKey: STORAGE_KEY,
    })
  }
  const filtered = rules.filter((r) => r.id !== id)
  if (filtered.length === rules.length) return false
  saveRules(filtered)
  return true
}

/** 根据 serialReset 规则计算当前周期的标识键 */
function getCurrentResetKey(reset: SerialReset): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const q = Math.ceil(m / 3)

  switch (reset) {
    case 'daily': return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
    case 'monthly': return `${y}${String(m).padStart(2, '0')}`
    case 'quarterly': return `${y}Q${q}`
    case 'yearly': return String(y)
    case 'never': default: return ''
  }
}

export function generateCode(id: string): string {
  const rule = getCodeRuleById(id)
  if (!rule || !rule.isActive) return ''

  const currentKey = getCurrentResetKey(rule.serialReset)

  // 判断是否需要重置流水号
  let currentSerial = rule.currentSerial
  if (rule.serialReset !== 'never' && rule.lastResetKey !== currentKey) {
    currentSerial = rule.serialStart
  }

  const parts: string[] = []
  if (rule.prefix) parts.push(rule.prefix)

  // 日期部分
  if (rule.dateFormat !== 'none') {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')

    let dateStr = ''
    switch (rule.dateFormat) {
      case 'YYYY': dateStr = String(y); break
      case 'YY': dateStr = String(y).slice(2); break
      case 'YYYYMM': dateStr = `${y}${m}`; break
      case 'YYMM': dateStr = `${String(y).slice(2)}${m}`; break
      case 'YYYYMMDD': dateStr = `${y}${m}${d}`; break
      case 'YYYY-MM': dateStr = `${y}-${m}`; break
      case 'YYYY-MM-DD': dateStr = `${y}-${m}-${d}`; break
      case 'YYYYMM-DD': dateStr = `${y}${m}-${d}`; break
    }
    parts.push(dateStr)
  }

  // 流水号
  const serialStr = String(currentSerial).padStart(rule.serialDigits, '0')
  parts.push(serialStr)

  const code = parts.join(rule.separator)

  // 自动递增并更新 lastResetKey
  updateCodeRule(id, {
    currentSerial: currentSerial + 1,
    lastResetKey: currentKey,
  })

  return code
}

// 预览编码规则生成的编号格式
export function previewCode(rule: CodeRule): string {
  const parts: string[] = []
  if (rule.prefix) parts.push(rule.prefix)

  if (rule.dateFormat !== 'none') {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')

    let dateStr = ''
    switch (rule.dateFormat) {
      case 'YYYY': dateStr = String(y); break
      case 'YY': dateStr = String(y).slice(2); break
      case 'YYYYMM': dateStr = `${y}${m}`; break
      case 'YYMM': dateStr = `${String(y).slice(2)}${m}`; break
      case 'YYYYMMDD': dateStr = `${y}${m}${d}`; break
      case 'YYYY-MM': dateStr = `${y}-${m}`; break
      case 'YYYY-MM-DD': dateStr = `${y}-${m}-${d}`; break
      case 'YYYYMM-DD': dateStr = `${y}${m}-${d}`; break
    }
    parts.push(dateStr)
  }

  const serialStr = 'X'.repeat(rule.serialDigits)
  parts.push(serialStr)

  return parts.join(rule.separator)
}

export function resetCodeRules(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'none', label: '无日期', example: 'QU-001' },
  { value: 'YYYY', label: 'YYYY（年）', example: 'QU-2026-001' },
  { value: 'YY', label: 'YY（短年）', example: 'QU-26-001' },
  { value: 'YYYYMM', label: 'YYYYMM（年月）', example: 'QU-202606-001' },
  { value: 'YYMM', label: 'YYMM（短年短月）', example: 'QU-2606-001' },
  { value: 'YYYY-MM', label: 'YYYY-MM（年月带分隔）', example: 'QU-2026-06-001' },
  { value: 'YYYYMMDD', label: 'YYYYMMDD（年月日）', example: 'QU-20260630-001' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD（年月日带分隔）', example: 'QU-2026-06-30-001' },
  { value: 'YYYYMM-DD', label: 'YYYYMM-DD（年月+日）', example: 'QU-202606-30-001' },
]

export const SEPARATOR_OPTIONS: { value: Separator; label: string }[] = [
  { value: '', label: '无分隔符' },
  { value: '-', label: '横线 (-)' },
  { value: '_', label: '下划线 (_)' },
  { value: '.', label: '点号 (.)' },
  { value: '/', label: '斜杠 (/)' },
]
