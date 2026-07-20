// ============================================================
// 币种与汇率存储层
// ============================================================

import { addTrashItem } from './trashStore'

export interface Currency {
  id: string          // 币种代码，如 'CNY'
  name: string        // 名称
  nameEn: string     // 英文名称
  symbol: string      // 符号，如 '¥'
  rate: number        // 汇率（1 单位 = 多少 CNY）
  isDefault: boolean  // 是否默认币种
  isActive: boolean   // 是否启用
  lastUpdated?: string // 汇率最后更新时间（ISO 日期）
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'holang_currencies_v1'

const DEFAULT_CURRENCIES: Currency[] = [
  {
    id: 'CNY',
    name: '人民币',
    nameEn: 'Chinese Yuan',
    symbol: '¥',
    rate: 1,
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'USD',
    name: '美元',
    nameEn: 'US Dollar',
    symbol: '$',
    rate: 7.25,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'EUR',
    name: '欧元',
    nameEn: 'Euro',
    symbol: '€',
    rate: 7.85,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'GBP',
    name: '英镑',
    nameEn: 'British Pound',
    symbol: '£',
    rate: 9.18,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'JPY',
    name: '日元',
    nameEn: 'Japanese Yen',
    symbol: '¥',
    rate: 0.048,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'HKD',
    name: '港币',
    nameEn: 'Hong Kong Dollar',
    symbol: '$',
    rate: 0.93,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function getCurrencies(): Currency[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_CURRENCIES]
    const parsed = JSON.parse(raw) as Currency[]
    return parsed.length > 0 ? parsed : [...DEFAULT_CURRENCIES]
  } catch {
    return [...DEFAULT_CURRENCIES]
  }
}

function saveCurrencies(currencies: Currency[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currencies))
}

export function getAllCurrencies(): Currency[] {
  return getCurrencies()
}

export function getActiveCurrencies(): Currency[] {
  return getCurrencies().filter((c) => c.isActive)
}

export function getCurrencyById(id: string): Currency | undefined {
  return getCurrencies().find((c) => c.id === id)
}

export function getDefaultCurrency(): Currency | undefined {
  return getCurrencies().find((c) => c.isDefault)
}

export function addCurrency(currency: Omit<Currency, 'createdAt' | 'updatedAt'>): Currency {
  const currencies = getCurrencies()
  const newCurrency: Currency = {
    ...currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  currencies.push(newCurrency)
  saveCurrencies(currencies)
  return newCurrency
}

export function updateCurrency(id: string, updates: Partial<Currency>): Currency | null {
  const currencies = getCurrencies()
  const idx = currencies.findIndex((c) => c.id === id)
  if (idx === -1) return null
  currencies[idx] = { ...currencies[idx], ...updates, updatedAt: new Date().toISOString() }
  saveCurrencies(currencies)
  return currencies[idx]
}

export function deleteCurrency(id: string): boolean {
  const currencies = getCurrencies()
  // Before deletion, save to trash
  const target = currencies.find(c => c.id === id)
  if (target) {
    addTrashItem({
      type: 'currency',
      name: target.id,
      data: target,
      storeKey: STORAGE_KEY,
    })
  }
  const filtered = currencies.filter((c) => c.id !== id)
  if (filtered.length === currencies.length) return false
  saveCurrencies(filtered)
  return true
}

// 汇率换算
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

export function resetCurrencies(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ============================================================
// 汇率自动更新
// ============================================================

/** 支持的汇率 API（免费，无需 Key） */
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/CNY'

export interface RateFetchResult {
  success: boolean
  updated: string[]     // 成功更新的币种代码
  failed: string[]      // 失败的币种代码
  message: string
}

/**
 * 从免费 API 获取最新汇率
 * 返回 1 外币 = ? CNY 的汇率
 */
export async function fetchLatestRates(): Promise<RateFetchResult> {
  try {
    const response = await fetch(EXCHANGE_API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return { success: false, updated: [], failed: [], message: `API 请求失败: ${response.status}` }
    }

    const data = await response.json()
    if (data.result !== 'success' || !data.rates) {
      return { success: false, updated: [], failed: [], message: 'API 返回数据异常' }
    }

    const cnyRates = data.rates as Record<string, number>
    const currencies = getAllCurrencies()
    const updated: string[] = []
    const failed: string[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const c of currencies) {
      if (c.id === 'CNY') {
        // CNY 基准币种，始终为 1
        updateCurrency(c.id, { rate: 1, lastUpdated: today })
        updated.push('CNY')
        continue
      }

      const cnyToForeign = cnyRates[c.id]
      if (cnyToForeign && cnyToForeign > 0) {
        // 1 CNY = cnyToForeign 外币
        // 所以 1 外币 = 1 / cnyToForeign CNY
        const foreignToCny = 1 / cnyToForeign
        updateCurrency(c.id, {
          rate: Number(foreignToCny.toFixed(4)),
          lastUpdated: today,
        })
        updated.push(c.id)
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
    return {
      success: false,
      updated: [],
      failed: [],
      message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

/**
 * 检查是否需要在今天自动更新汇率
 * 规则：每月 1 号，且当天未更新过
 */
export function shouldAutoUpdate(): boolean {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const isFirstDay = now.getDate() === 1

  if (!isFirstDay) return false

  const currencies = getAllCurrencies()
  // 检查是否有币种在今天更新过
  const anyUpdatedToday = currencies.some(c =>
    c.lastUpdated === today && c.id !== 'CNY'
  )

  return !anyUpdatedToday
}

/**
 * 自动更新汇率（如果符合条件）
 * 返回更新结果，如果不需要更新则返回 null
 */
export async function autoUpdateRatesIfNeeded(): Promise<RateFetchResult | null> {
  if (!shouldAutoUpdate()) return null
  return fetchLatestRates()
}
