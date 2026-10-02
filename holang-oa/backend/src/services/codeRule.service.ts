// ============================================================
// 编码规则服务（原生 SQL）
// 说明：code_rules 表由部署脚本以原生 SQL 幂等创建（避免重新生成 Prisma 客户端）。
// 编号生成逻辑(serialize)保留在前端 codeRuleStore，后端仅持久化规则配置与流水号当前值。
// ============================================================
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

export interface CodeRuleInput {
  id?: string
  name?: string
  nameEn?: string
  prefix?: string
  dateFormat?: string
  separator?: string
  serialDigits?: number
  serialStart?: number
  currentSerial?: number
  serialReset?: string
  lastResetKey?: string
  isActive?: boolean
}

function mapRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    nameEn: r.name_en,
    prefix: r.prefix,
    dateFormat: r.date_format,
    separator: r.separator,
    serialDigits: Number(r.serial_digits),
    serialStart: Number(r.serial_start),
    currentSerial: Number(r.current_serial),
    serialReset: r.serial_reset,
    lastResetKey: r.last_reset_key,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listCodeRules(): Promise<any[]> {
  const rows = await prisma.$queryRawUnsafe<any>(`SELECT * FROM code_rules ORDER BY id`)
  return (rows || []).map(mapRow)
}

export async function getCodeRuleById(id: string): Promise<any> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM code_rules WHERE id=$1`, id)
  if (!rows || !rows.length) throw new AppError('规则不存在', 404)
  return mapRow(rows[0])
}

export async function createCodeRule(input: CodeRuleInput): Promise<any> {
  const id = String(input.id || '')
  if (!id) throw new AppError('规则ID不能为空', 400)
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM code_rules WHERE id=$1`, id)
  if (existing && existing.length) throw new AppError('规则ID已存在', 409)
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO code_rules (id, name, name_en, prefix, date_format, separator, serial_digits, serial_start, current_serial, serial_reset, last_reset_key, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    id,
    input.name || '',
    input.nameEn || '',
    input.prefix || '',
    input.dateFormat || 'none',
    input.separator || '',
    Number(input.serialDigits) || 3,
    Number(input.serialStart) || 1,
    Number(input.currentSerial ?? input.serialStart) || 1,
    input.serialReset || 'never',
    input.lastResetKey || '',
    input.isActive === false ? 0 : 1,
    now,
    now
  )
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM code_rules WHERE id=$1`, id)
  return mapRow(rows[0])
}

export async function updateCodeRule(id: string, updates: Partial<CodeRuleInput>): Promise<any> {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM code_rules WHERE id=$1`, id)
  if (!existing || !existing.length) throw new AppError('规则不存在', 404)
  const sets: string[] = []
  const params: any[] = []
  let i = 1
  if (updates.name !== undefined) { sets.push(`name=$${i++}`); params.push(updates.name) }
  if (updates.nameEn !== undefined) { sets.push(`name_en=$${i++}`); params.push(updates.nameEn) }
  if (updates.prefix !== undefined) { sets.push(`prefix=$${i++}`); params.push(updates.prefix) }
  if (updates.dateFormat !== undefined) { sets.push(`date_format=$${i++}`); params.push(updates.dateFormat) }
  if (updates.separator !== undefined) { sets.push(`separator=$${i++}`); params.push(updates.separator) }
  if (updates.serialDigits !== undefined) { sets.push(`serial_digits=$${i++}`); params.push(Number(updates.serialDigits)) }
  if (updates.serialStart !== undefined) { sets.push(`serial_start=$${i++}`); params.push(Number(updates.serialStart)) }
  if (updates.currentSerial !== undefined) { sets.push(`current_serial=$${i++}`); params.push(Number(updates.currentSerial)) }
  if (updates.serialReset !== undefined) { sets.push(`serial_reset=$${i++}`); params.push(updates.serialReset) }
  if (updates.lastResetKey !== undefined) { sets.push(`last_reset_key=$${i++}`); params.push(updates.lastResetKey) }
  if (updates.isActive !== undefined) { sets.push(`is_active=$${i++}`); params.push(updates.isActive ? 1 : 0) }
  sets.push(`updated_at=$${i++}`)
  params.push(new Date().toISOString())
  params.push(id)
  await prisma.$executeRawUnsafe(`UPDATE code_rules SET ${sets.join(',')} WHERE id=$${i}`, ...params)
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM code_rules WHERE id=$1`, id)
  return mapRow(rows[0])
}

export async function deleteCodeRule(id: string): Promise<{ id: string }> {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM code_rules WHERE id=$1`, id)
  if (!existing || !existing.length) throw new AppError('规则不存在', 404)
  await prisma.$executeRawUnsafe(`DELETE FROM code_rules WHERE id=$1`, id)
  return { id }
}
