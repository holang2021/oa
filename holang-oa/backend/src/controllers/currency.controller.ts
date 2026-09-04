// ============================================================
// 币种与汇率 Controller
// ============================================================
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import { success } from '../utils/response'
import * as currencyService from '../services/currency.service'

const createSchema = z.object({
  id: z.string().min(1, '币种代码不能为空'),
  name: z.string().optional(),
  nameEn: z.string().optional(),
  symbol: z.string().optional(),
  rate: z.number().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  lastUpdated: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().optional(),
  nameEn: z.string().optional(),
  symbol: z.string().optional(),
  rate: z.number().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  lastUpdated: z.string().optional(),
}).partial()

export const getCurrencies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await currencyService.listCurrencies()
    res.json(success(list, '获取成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const getCurrencyById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const c = await currencyService.getCurrencyById(req.params.id)
    res.json(success(c, '获取成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const createCurrency = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createSchema.parse(req.body)
    const c = await currencyService.createCurrency(validated)
    res.status(201).json(success(c, '创建成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const updateCurrency = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateSchema.parse(req.body)
    const c = await currencyService.updateCurrency(req.params.id, validated)
    res.json(success(c, '更新成功', req.traceId ?? null))
  } catch (err) { next(err) }
}

export const deleteCurrency = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await currencyService.deleteCurrency(req.params.id)
    res.json(success(r, '删除成功', req.traceId ?? null))
  } catch (err) { next(err) }
}
