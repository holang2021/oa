// ============================================================
// 币种与汇率存储层（后端化）
// 数据来源改为后端 /currencies（原生 SQL 表），前端保留内存缓存以兼容同步读取调用方。
// 写操作（增删改/汇率更新）均为 async 并落库；读操作（getAllCurrencies 等）保持同步。
// ============================================================

import api from './api'

export interface Currency {
  id: string          // 币种代码，如 'CNY'
  name: string        // 名称
  nameEn: string      // 英文名称
  symbol: string      // 符号，如 '¥'
  rate: number        // 汇率（1 单位 = 多少 CNY）
  isDefault: boolean  // 是否默认币种
  isActive: boolean   // 是否启用
  lastUpdated?: string | null // 汇率最后更新时间（ISO 日期）
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'holang_currencies_v1'

const DEFAULT_CURRENCIES: Currency[] = [
  { id: 'CNY', name: '人民币', nameEn: 'Chinese Yuan', symbol: '¥', rate: 1, isDefault: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'USD', name: '美元', nameEn: 'US Dollar', symbol: '$', rate: 7.25, isDefault: false, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'EUR', name: '欧元', nameEn: 'Euro', symbol: '€', rate: 7.85, isDefault: false, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'GBP', name: '英镑', nameEn: 'British Pound', symbol: '£', rate: 9.18, isDefault: false, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'JPY', name: '日元', nameEn: 'Japanese Yen', symbol: '¥', rate: 0.048, isDefault: false, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'HKD', name: '港币', nameEn: 'Hong Kong Dollar', symbol: '$', rate: 0.93, isDefault: false, isActive: true, createdAt: '', updatedAt: '' },
]

// 内存缓存（initCurrencies 预热；未预热时回退 localStorage / 默认）
let cache: Currency[] | null = null

function readLocal(): Currency[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { const p = JSON.parse(raw); if (p && p.length) return p }
  } catch { /* ignore */ }
  return null
}
function writeLocal(list: Currency[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
function fallback(): Currency[] {
  if (cache) return cache
  const local = readLocal()
  if (local) return local
  return [...DEFAULT_CURRENCIES]
}

/** 从后端加载币种到缓存（应用/页面进入时调用） */
export async function initCurrencies(): Promise<Currency[]> {
  try {
    const res = await api.get<Currency[]>('/currencies')
    if (res.code === 0 && res.data && res.data.length) {
      cache = res.data
      writeLocal(cache)
      return cache
    }
  } catch { /* ignore，回退默认 */ }
  cache = readLocal() || [...DEFAULT_CURRENCIES]
  return cache
}

async function refresh() { cache = await initCurrencies() }

export function getAllCurrencies(): Currency[] { return fallback() }
export function getActiveCurrencies(): Currency[] { return fallback().filter((c) => c.isActive) }
export function getCurrencyById(id: string): Currency | undefined { return fallback().find((c) => c.id === id) }
export function getDefaultCurrency(): Currency | undefined { return fallback().find((c) => c.isDefault) }

export async function addCurrency(currency: Currency): Promise<Currency> {
  const res = await api.post<Currency>('/currencies', currency)
  if (res.code === 0 && res.data) { await refresh(); return res.data }
  throw new Error(res.message || '创建失败')
}

export async function updateCurrency(id: string, updates: Partial<Currency>): Promise<Currency> {
  const res = await api.put<Currency>(`/currencies/${id}`, updates)
  if (res.code === 0 && res.data) { await refresh(); return res.data }
  throw new Error(res.message || '更新失败')
}

export async function deleteCurrency(id: string): Promise<boolean> {
  const res = await api.delete<{ code: number; message?: string }>(`/currencies/${id}`)
  if (res.code === 0) { await refresh(); return true }
  throw new Error(res.message || '删除失败')
}

// 汇率换算（同步，基于缓存）
export function convertToCNY(amount: number, currencyId: string): number {
  const currency = getCurrencyById(currencyId)
  if (!currency) return amount
  return amount * currency.rate
}

export function convertFromCNY(amount: number, currencyId: string): number {
  const currency = getCurrencyById(currencyId)
  if (!currency || currency.rate === 0) return amount
  return amount / currency.rate
}

/** 重置为默认（清空后端所有币种记录 + 本地缓存） */
export async function resetCurrencies(): Promise<void> {
  const list = fallback()
  await Promise.all(list.map((c) => api.delete(`/currencies/${c.id}`).catch(() => { /* ignore */ })))
  cache = null
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ============================================================
// 汇率自动更新（外部免费 API）
// ============================================================
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/CNY'

export interface RateFetchResult {
  success: boolean
  updated: string[]
  failed: string[]
  message: string
}

export async function fetchLatestRates(): Promise<RateFetchResult> {
  try {
    const response = await fetch(EXCHANGE_API_URL, { method: 'GET', headers: { 'Accept': 'application/json' } })
    if (!response.ok) return { success: false, updated: [], failed: [], message: `API 请求失败: ${response.status}` }
    const data = await response.json()
    if (data.result !== 'success' || !data.rates) return { success: false, updated: [], failed: [], message: 'API 返回数据异常' }
    const cnyRates = data.rates as Record<string, number>
    const currencies = getActiveCurrencies()
    const updated: string[] = []
    const failed: string[] = []
    const today = new Date().toISOString().split('T')[0]
    for (const c of currencies) {
      if (c.id === 'CNY') {
        try { await updateCurrency('CNY', { rate: 1, lastUpdated: today }); updated.push('CNY') } catch { /* ignore */ }
        continue
      }
      const cnyToForeign = cnyRates[c.id]
      if (cnyToForeign && cnyToForeign > 0) {
        try {
          await updateCurrency(c.id, { rate: Number((1 / cnyToForeign).toFixed(4)), lastUpdated: today })
          updated.push(c.id)
        } catch { failed.push(c.id) }
      } else {
        failed.push(c.id)
      }
    }
    return {
      success: updated.length > 0,
      updated,
      failed,
      message: updated.length > 0
        ? `成功更新 ${updated.length} 种币种汇率${failed.length > 0 ? `，${failed.length} 种失败` : ''}`
        : '未能获取任何汇率数据',
    }
  } catch (error) {
    return { success: false, updated: [], failed: [], message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

export function shouldAutoUpdate(): boolean {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (now.getDate() !== 1) return false
  const currencies = fallback()
  return !currencies.some((c) => c.lastUpdated === today && c.id !== 'CNY')
}

export async function autoUpdateRatesIfNeeded(): Promise<RateFetchResult | null> {
  if (!shouldAutoUpdate()) return null
  return fetchLatestRates()
}
