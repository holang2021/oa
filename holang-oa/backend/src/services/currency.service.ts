// ============================================================
// 币种与汇率服务（原生 SQL）
// 说明：currencies 表由部署脚本以原生 SQL 幂等创建（避免重新生成 Prisma 客户端），
// 此处同样用原生 SQL 读写（prisma.$queryRawUnsafe / $executeRawUnsafe），与线上客户端解耦。
// ============================================================
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

export interface CurrencyInput {
  id: string
  name?: string
  nameEn?: string
  symbol?: string
  rate?: number
  isDefault?: boolean
  isActive?: boolean
  lastUpdated?: string | null
}

function mapRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    nameEn: r.name_en,
    symbol: r.symbol,
    rate: Number(r.rate),
    isDefault: !!r.is_default,
    isActive: !!r.is_active,
    lastUpdated: r.last_updated,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listCurrencies(): Promise<any[]> {
  const rows = await prisma.$queryRawUnsafe<any>(`SELECT * FROM currencies ORDER BY id`)
  return (rows || []).map(mapRow)
}

export async function getCurrencyById(id: string): Promise<any> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM currencies WHERE id=$1`, id)
  if (!rows || !rows.length) throw new AppError('币种不存在', 404)
  return mapRow(rows[0])
}

export async function createCurrency(input: CurrencyInput): Promise<any> {
  const id = String(input.id || '').toUpperCase()
  if (!id) throw new AppError('币种代码不能为空', 400)
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM currencies WHERE id=$1`, id)
  if (existing && existing.length) throw new AppError('币种代码已存在', 409)
  const now = new Date().toISOString()
  const isDefault = input.isDefault ? 1 : 0
  const isActive = input.isActive === false ? 0 : 1
  await prisma.$executeRawUnsafe(
    `INSERT INTO currencies (id, name, name_en, symbol, rate, is_default, is_active, last_updated, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    id,
    input.name || '',
    input.nameEn || '',
    input.symbol || '',
    Number(input.rate) || 1,
    isDefault,
    isActive,
    input.lastUpdated || null,
    now,
    now
  )
  if (isDefault) {
    await prisma.$executeRawUnsafe(`UPDATE currencies SET is_default=0 WHERE id<>$1`, id)
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM currencies WHERE id=$1`, id)
  return mapRow(rows[0])
}

export async function updateCurrency(id: string, updates: Partial<CurrencyInput>): Promise<any> {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM currencies WHERE id=$1`, id)
  if (!existing || !existing.length) throw new AppError('币种不存在', 404)
  const sets: string[] = []
  const params: any[] = []
  let i = 1
  if (updates.name !== undefined) { sets.push(`name=$${i++}`); params.push(updates.name) }
  if (updates.nameEn !== undefined) { sets.push(`name_en=$${i++}`); params.push(updates.nameEn) }
  if (updates.symbol !== undefined) { sets.push(`symbol=$${i++}`); params.push(updates.symbol) }
  if (updates.rate !== undefined) { sets.push(`rate=$${i++}`); params.push(Number(updates.rate)) }
  if (updates.isDefault !== undefined) { sets.push(`is_default=$${i++}`); params.push(updates.isDefault ? 1 : 0) }
  if (updates.isActive !== undefined) { sets.push(`is_active=$${i++}`); params.push(updates.isActive ? 1 : 0) }
  if (updates.lastUpdated !== undefined) { sets.push(`last_updated=$${i++}`); params.push(updates.lastUpdated) }
  sets.push(`updated_at=$${i++}`)
  params.push(new Date().toISOString())
  params.push(id)
  await prisma.$executeRawUnsafe(`UPDATE currencies SET ${sets.join(',')} WHERE id=$${i}`, ...params)
  if (updates.isDefault) {
    await prisma.$executeRawUnsafe(`UPDATE currencies SET is_default=0 WHERE id<>$1`, id)
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM currencies WHERE id=$1`, id)
  return mapRow(rows[0])
}

export async function deleteCurrency(id: string): Promise<{ id: string }> {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM currencies WHERE id=$1`, id)
  if (!existing || !existing.length) throw new AppError('币种不存在', 404)
  await prisma.$executeRawUnsafe(`DELETE FROM currencies WHERE id=$1`, id)
  return { id }
}
