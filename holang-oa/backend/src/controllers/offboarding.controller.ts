import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as offboardingService from '../services/offboarding.service'

/**
 * 离职交接预览（只读）：统计 + 名下客户 + 同域候选人
 * GET /api/v1/offboarding/preview?userId=
 */
export const previewOffboarding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string
    if (!userId) {
      return res.status(400).json({ code: 400, message: '缺少 userId', data: null })
    }
    const data = await offboardingService.previewOffboarding(userId)
    res.json({ code: 0, message: '获取成功', data })
  } catch (error) {
    next(error)
  }
}

/**
 * 执行离职交接（写库）：停用 + 批量转移/退公海 + 系统交接跟进
 * POST /api/v1/offboarding/execute
 * body: { userId, mode:'transfer'|'pool', targetUserId?, customerIds:string[] }
 */
export const executeOffboarding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, mode, targetUserId, customerIds } = req.body || {}
    if (!userId || !mode || !Array.isArray(customerIds)) {
      return res.status(400).json({ code: 400, message: '参数缺失（需要 userId/mode/customerIds）', data: null })
    }
    if (mode !== 'transfer' && mode !== 'pool') {
      return res.status(400).json({ code: 400, message: 'mode 仅支持 transfer / pool', data: null })
    }
    const data = await offboardingService.executeOffboarding(
      { userId, mode, targetUserId, customerIds },
      req.user?.id ?? null
    )
    res.json({ code: 0, message: '离职交接完成', data })
  } catch (error) {
    next(error)
  }
}
