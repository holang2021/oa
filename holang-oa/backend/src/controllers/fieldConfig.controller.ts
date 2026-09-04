// ============================================================
// 字段配置 Controller
// ============================================================
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { success } from '../utils/response'
import * as fieldConfigService from '../services/fieldConfig.service'

const updateSchema = z.object({
  fields: z.array(z.any()),
})

export const getConfigs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const configs = await fieldConfigService.listAllConfigs()
    res.json(success(configs, '获取成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const updateModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateSchema.parse(req.body)
    const r = await fieldConfigService.upsertModuleConfig(req.params.module, validated.fields)
    res.json(success(r, '更新成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const deleteModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await fieldConfigService.deleteModuleConfig(req.params.module)
    res.json(success(r, '已重置为默认', req.traceId ?? null))
  } catch (err) { next(err) }
}
