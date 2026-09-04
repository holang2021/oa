// ============================================================
// 字段配置服务（原生 SQL）
// 说明：field_configs 表由部署脚本以原生 SQL 幂等创建（避免重新生成 Prisma 客户端）。
// 每个模块的全部字段(FieldMeta[])以 JSON 存于 config_json 列；缺省模块由前端 DEFAULT_FIELD_CONFIGS 兜底。
// ============================================================
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

export interface FieldConfigRow {
  module: string
  config_json: string
  updated_at: string
}

/** 返回全部模块配置，组装为 { [module]: FieldMeta[] } */
export async function listAllConfigs(): Promise<Record<string, any[]>> {
  const rows = await prisma.$queryRawUnsafe<FieldConfigRow[]>(`SELECT module, config_json FROM field_configs`)
  const result: Record<string, any[]> = {}
  for (const r of rows || []) {
    try {
      result[r.module] = JSON.parse(r.config_json)
    } catch {
      result[r.module] = []
    }
  }
  return result
}

/** 写入（upsert）某模块配置 */
export async function upsertModuleConfig(module: string, fields: any[]): Promise<any> {
  if (!module) throw new AppError('模块名不能为空', 400)
  const existing = await prisma.$queryRawUnsafe<FieldConfigRow[]>(`SELECT module FROM field_configs WHERE module=$1`, module)
  const json = JSON.stringify(fields)
  const now = new Date().toISOString()
  if (existing && existing.length) {
    await prisma.$executeRawUnsafe(`UPDATE field_configs SET config_json=$1, updated_at=$2 WHERE module=$3`, json, now, module)
  } else {
    await prisma.$executeRawUnsafe(`INSERT INTO field_configs (module, config_json, updated_at) VALUES ($1,$2,$3)`, module, json, now)
  }
  return { module, fields, updatedAt: now }
}

/** 删除某模块配置（前端将回退到默认） */
export async function deleteModuleConfig(module: string): Promise<{ module: string }> {
  await prisma.$executeRawUnsafe(`DELETE FROM field_configs WHERE module=$1`, module)
  return { module }
}
