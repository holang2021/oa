// ============================================================
// 编码规则存储层（后端化）
// 数据来源改为后端 /code-rules（原生 SQL 表），前端保留内存缓存兼容同步读取。
// 规则配置持久化：增删改 async 落库；generateCode 保持同步（生成编号并自增 currentSerial，
// 同步更新缓存 + fire-and-forget 写后端），不破坏表单提交处的同步调用。
// ============================================================

import api from './api'

export type DateFormat = 'none' | 'YYYY' | 'YY' | 'YYYYMM' | 'YYMM' | 'YYYYMMDD' | 'YYYYMM-DD' | 'YYYY-MM' | 'YYYY-MM-DD'
export type Separator = '' | '-' | '_' | '.' | '/'
export type SerialReset = 'never' | 'daily' | 'monthly' | 'quarterly' | 'yearly'

export interface CodeRule {
  id: string
  name: string
  nameEn: string
  prefix: string
  dateFormat: DateFormat
  separator: Separator
  serialDigits: number
  serialStart: number
  currentSerial: number
  serialReset: SerialReset
  lastResetKey: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'holang_code_rules_v1'

const DEFAULT_RULES: CodeRule[] = [
  { id: 'quotation', name: '报价编号', nameEn: 'Quotation No.', prefix: 'QU', dateFormat: 'YYYYMM', separator: '-', serialDigits: 3, serialStart: 1, currentSerial: 1, serialReset: 'monthly', lastResetKey: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'order', name: '订单编号', nameEn: 'Order No.', prefix: 'OR', dateFormat: 'YYYYMMDD', separator: '-', serialDigits: 3, serialStart: 1, currentSerial: 1, serialReset: 'daily', lastResetKey: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'customer', name: '客户编号', nameEn: 'Customer No.', prefix: 'CU', dateFormat: 'none', separator: '', serialDigits: 4, serialStart: 1, currentSerial: 1, serialReset: 'never', lastResetKey: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'proformaInvoice', name: 'PI 编号', nameEn: 'PI No.', prefix: 'PI', dateFormat: 'YYYYMM', separator: '-', serialDigits: 3, serialStart: 1, currentSerial: 1, serialReset: 'monthly', lastResetKey: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'invoice', name: '发票编号', nameEn: 'Invoice No.', prefix: 'IV', dateFormat: 'YYYY', separator: '-', serialDigits: 4, serialStart: 1, currentSerial: 1, serialReset: 'yearly', lastResetKey: '', isActive: true, createdAt: '', updatedAt: '' },
]

let cache: CodeRule[] | null = null

function readLocal(): CodeRule[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { const p = JSON.parse(raw); if (p && p.length) return p }
  } catch { /* ignore */ }
  return null
}
function writeLocal(list: CodeRule[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
function fallback(): CodeRule[] {
  if (cache) return cache
  const local = readLocal()
  if (local) return local
  return [...DEFAULT_RULES]
}

export async function initCodeRules(): Promise<CodeRule[]> {
  try {
    const res = await api.get<CodeRule[]>('/code-rules')
    if (res.code === 0 && res.data && res.data.length) {
      cache = res.data
      writeLocal(cache)
      return cache
    }
  } catch { /* ignore */ }
  cache = readLocal() || [...DEFAULT_RULES]
  return cache
}

async function refresh() { cache = await initCodeRules() }

export function getAllCodeRules(): CodeRule[] { return fallback() }
export function getCodeRuleById(id: string): CodeRule | undefined { return fallback().find((r) => r.id === id) }

export async function addCodeRule(rule: CodeRule): Promise<CodeRule> {
  const res = await api.post<CodeRule>('/code-rules', rule)
  if (res.code === 0 && res.data) { await refresh(); return res.data }
  throw new Error(res.message || '创建失败')
}

export async function updateCodeRule(id: string, updates: Partial<CodeRule>): Promise<CodeRule> {
  const res = await api.put<CodeRule>(`/code-rules/${id}`, updates)
  if (res.code === 0 && res.data) { await refresh(); return res.data }
  throw new Error(res.message || '更新失败')
}

export async function deleteCodeRule(id: string): Promise<boolean> {
  const res = await api.delete<{ code: number; message?: string }>(`/code-rules/${id}`)
  if (res.code === 0) { await refresh(); return true }
  throw new Error(res.message || '删除失败')
}

/** 复制规则（async：构建副本并落库，落库后缓存由 addCodeRule 刷新） */
export async function duplicateCodeRule(id: string): Promise<CodeRule | null> {
  const source = getCodeRuleById(id)
  if (!source) return null
  const now = Date.now()
  const copy: CodeRule = {
    ...source,
    id: `${source.id}_copy_${now}`,
    name: `${source.name}（复制）`,
    nameEn: `${source.nameEn} (Copy)`,
    currentSerial: source.serialStart,
    lastResetKey: '',
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await addCodeRule(copy)
  return copy
}

/** 重置为默认（清空后端所有规则 + 本地缓存） */
export async function resetCodeRules(): Promise<void> {
  const list = fallback()
  await Promise.all(list.map((r) => api.delete(`/code-rules/${r.id}`).catch(() => { /* ignore */ })))
  cache = null
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ============================================================
// 编号生成（同步，前端运行时调用）
// ============================================================
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

function buildCode(rule: CodeRule, serial: number): string {
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
  parts.push(String(serial).padStart(rule.serialDigits, '0'))
  return parts.join(rule.separator)
}

/** 生成编号：基于当前规则，自增 currentSerial，同步更新缓存并后台落库 */
export function generateCode(id: string): string {
  const rule = getCodeRuleById(id)
  if (!rule || !rule.isActive) return ''
  const currentKey = getCurrentResetKey(rule.serialReset)
  let currentSerial = rule.currentSerial
  if (rule.serialReset !== 'never' && rule.lastResetKey !== currentKey) {
    currentSerial = rule.serialStart
  }
  const code = buildCode(rule, currentSerial)
  const nextSerial = currentSerial + 1
  // 同步更新内存缓存
  if (!cache) cache = [...fallback()]
  const idx = cache.findIndex((r) => r.id === id)
  if (idx >= 0) {
    cache[idx] = { ...cache[idx], currentSerial: nextSerial, lastResetKey: currentKey, updatedAt: new Date().toISOString() }
  }
  // 后台落库（不阻塞）
  updateCodeRule(id, { currentSerial: nextSerial, lastResetKey: currentKey }).catch(() => { /* ignore */ })
  return code
}

/** 预览编号格式（纯计算，不改状态） */
export function previewCode(rule: CodeRule): string {
  return buildCode(rule, 1).replace(String(1).padStart(rule.serialDigits, '0'), 'X'.repeat(rule.serialDigits))
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
