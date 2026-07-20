import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TargetPeriod } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createTargetSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  period: z.string(),
  year: z.number().min(2024, '年份无效'),
  periodValue: z.number().min(1).max(12),
  targetAmount: z.number().min(0, '目标金额不能为负数'),
});

/**
 * Get all targets
 */
export const getTargets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, period, year } = req.query as any;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    } else if (req.user?.role === 'SALES') {
      where.userId = req.user.id;
    }

    if (period) where.period = period;
    if (year) where.year = parseInt(year);

    const targets = await prisma.salesTarget.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ year: 'desc' }, { period: 'asc' }],
    });

    res.json({ code: 0, message: '获取成功', data: targets });
  } catch (error) {
    next(error);
  }
};

/**
 * Get target by ID
 */
export const getTargetById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const target = await prisma.salesTarget.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!target) {
      return res.status(404).json({ code: 404, message: '目标不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: target });
  } catch (error) {
    next(error);
  }
};

/**
 * Create target
 */
export const createTarget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createTargetSchema.parse(req.body);

    const target = await prisma.salesTarget.create({
      data: validated,
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ code: 0, message: '创建成功', data: target });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ code: 409, message: '该周期目标已存在', data: null });
    }
    next(error);
  }
};

/**
 * Update target
 */
export const updateTarget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { targetAmount } = req.body;

    const target = await prisma.salesTarget.update({
      where: { id },
      data: { targetAmount },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ code: 0, message: '更新成功', data: target });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete target
 */
export const deleteTarget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.salesTarget.delete({ where: { id } });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my current target
 */
export const getMyCurrentTarget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未认证', data: null });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const target = await prisma.salesTarget.findFirst({
      where: {
        userId: req.user.id,
        period: TargetPeriod.MONTHLY,
        year,
        periodValue: month,
      },
    });

    // Get actual performance
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const wonOpportunities = await prisma.opportunity.findMany({
      where: {
        salesOwnerId: req.user.id,
        stage: 'WON',
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const actualAmount = wonOpportunities.reduce((sum, o) => sum + o.expectedAmount, 0);

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        target,
        actualAmount,
        progress: target ? (actualAmount / target.targetAmount) * 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
