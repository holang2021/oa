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
  contactId: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  followedAt: z.string().datetime().optional(),
  nextPlan: z.string().optional(),
  parentId: z.string().optional(),
});

/**
 * Get all follow-ups with pagination
 */
export const getFollowUps = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', customerId = '', method = '', userId = '', from = '', to = '' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }
    if (method) {
      where.method = method;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // 普通销售只能看自己；主管/管理员可看全部，也可按 userId 指定负责人筛选
    if (req.user?.role === 'SALES') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
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

    // parentId 回复挂接：若指定，需确保父记录存在（主管/管理员对他人跟进的回复/补充）
    if (validated.parentId) {
      const parent = await prisma.followUp.findUnique({ where: { id: validated.parentId } });
      if (!parent) {
        return res.status(400).json({ code: 400, message: '回复的跟进记录不存在', data: null });
      }
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId: validated.customerId,
        userId: req.user!.id,
        method: validated.method,
        content: validated.content,
        contactId: validated.contactId,
        nextFollowUpAt: validated.nextFollowUpAt ? new Date(validated.nextFollowUpAt) : undefined,
        followedAt: validated.followedAt ? new Date(validated.followedAt) : undefined,
        nextPlan: validated.nextPlan,
        parentId: validated.parentId,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ code: 0, message: '创建成功', data: followUp });

    // 自动同步到飞书知识库（fire-and-forget，失败仅记日志不影响主线）
    import('../services/feishuWiki.service')
      .then((m) => m.pushFollowUp(followUp))
      .catch((e) => console.error('[feishuWiki] 跟进自动同步失败:', e));
  } catch (error) {
    next(error);
  }
};

/**
 * Update follow-up —— owner-only：仅创建人可修改，主管/管理员亦不可改他人记录
 */
export const updateFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, method, nextFollowUpAt, followedAt, nextPlan } = req.body;

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ code: 404, message: '跟进记录不存在', data: null });
    }
    // 权限闸门：仅创建人可修改（哪怕管理员也不放行，符合「不允许修改他人记录」）
    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ code: 403, message: '仅创建人可修改该跟进记录', data: null });
    }

    const data: any = {};
    if (content !== undefined) data.content = content;
    if (method !== undefined) data.method = method;
    if (nextFollowUpAt !== undefined) data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
    if (followedAt !== undefined) data.followedAt = followedAt ? new Date(followedAt) : null;
    if (nextPlan !== undefined) data.nextPlan = nextPlan;

    const followUp = await prisma.followUp.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    res.json({ code: 0, message: '更新成功', data: followUp });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete follow-up —— owner-only：仅创建人可删除
 */
export const deleteFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ code: 404, message: '跟进记录不存在', data: null });
    }
    // 权限闸门：仅创建人可删除（哪怕管理员也不放行）
    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ code: 403, message: '仅创建人可删除该跟进记录', data: null });
    }

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
