// 报价单自定义字段定义存储（前端 localStorage）
// 仅 V1 原型阶段：验证「我就加字段」的自助手感；后端持久化待后续阶段设计。
// 与现有 codeRuleStore 同一套路（localStorage 直存），不触碰 Prisma / 数据库。

export type QuoteFieldType = 'text' | 'number' | 'date' | 'select'

export interface QuoteFieldDef {
  id: string
  label: string
  type: QuoteFieldType
  options?: string[] // type === 'select' 时有效
  required?: boolean
}

const LS_KEY = 'holang_quote_custom_fields'

export function getQuoteFields(): QuoteFieldDef[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveQuoteFields(fields: QuoteFieldDef[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(fields))
}

export function newFieldId(): string {
  return 'qf_' + Math.random().toString(36).slice(2, 9)
}
