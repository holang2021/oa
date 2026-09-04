// ============================================================
// 编码规则 Controller
// ============================================================
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { success } from '../utils/response'
import * as codeRuleService from '../services/codeRule.service'

const createSchema = z.object({
  id: z.string().min(1, '规则ID不能为空'),
  name: z.string().optional(),
  nameEn: z.string().optional(),
  prefix: z.string().optional(),
  dateFormat: z.string().optional(),
  separator: z.string().optional(),
  serialDigits: z.number().optional(),
  serialStart: z.number().optional(),
  currentSerial: z.number().optional(),
  serialReset: z.string().optional(),
  lastResetKey: z.string().optional(),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().optional(),
  nameEn: z.string().optional(),
  prefix: z.string().optional(),
  dateFormat: z.string().optional(),
  separator: z.string().optional(),
  serialDigits: z.number().optional(),
  serialStart: z.number().optional(),
  currentSerial: z.number().optional(),
  serialReset: z.string().optional(),
  lastResetKey: z.string().optional(),
  isActive: z.boolean().optional(),
}).partial()

export const getCodeRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await codeRuleService.listCodeRules()
    res.json(success(list, '获取成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const getCodeRuleById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await codeRuleService.getCodeRuleById(req.params.id)
    res.json(success(r, '获取成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const createCodeRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createSchema.parse(req.body)
    const r = await codeRuleService.createCodeRule(validated)
    res.status(201).json(success(r, '创建成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const updateCodeRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateSchema.parse(req.body)
    const r = await codeRuleService.updateCodeRule(req.params.id, validated)
    res.json(success(r, '更新成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const deleteCodeRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await codeRuleService.deleteCodeRule(req.params.id)
    res.json(success(r, '删除成功', req.traceId ?? null))
  } catch (err) { next(err) }
}
