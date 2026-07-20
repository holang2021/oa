import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { FollowMethod } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createFollowUpSchema = z.object({
  customerId: z.string().min(1, '客户ID不能为空'),
  method: z.string(),
  content: z.string().min(1, '跟进内容不能为空'),
  nextFollowUpAt: z.string().datetime().optional(),
});

/**
 * Get all follow-ups with pagination
 */
export const getFollowUps = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', customerId = '' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (req.user?.role === 'SALES') {
      where.userId = req.user.id;
    }

    const total = await prisma.followUp.count({ where });

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: followUps,
        pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get follow-up by ID
 */
export const getFollowUpById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!followUp) {
      return res.status(404).json({ code: 404, message: '跟进记录不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * Create follow-up record
 */
export const createFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createFollowUpSchema.parse(req.body);

    const followUp = await prisma.followUp.create({
      data: {
        customerId: validated.customerId,
        userId: req.user!.id,
        method: validated.method,
        content: validated.content,
        nextFollowUpAt: validated.nextFollowUpAt ? new Date(validated.nextFollowUpAt) : undefined,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ code: 0, message: '创建成功', data: followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * Update follow-up
 */
export const updateFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, nextFollowUpAt } = req.body;

    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(nextFollowUpAt !== undefined && { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }),
      },
    });

    res.json({ code: 0, message: '更新成功', data: followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete follow-up
 */
export const deleteFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.followUp.delete({ where: { id } });

    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my today's follow-ups
 */
export const getMyTodayFollowUps = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未认证', data: null });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const followUps = await prisma.followUp.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { nextFollowUpAt: { gte: today, lt: tomorrow } },
          { createdAt: { gte: today, lt: tomorrow } },
        ],
      },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { nextFollowUpAt: 'asc' },
    });

    res.json({ code: 0, message: '获取成功', data: followUps });
  } catch (error) {
    next(error);
  }
};
